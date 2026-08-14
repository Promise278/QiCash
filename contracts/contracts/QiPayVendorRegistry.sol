// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {QiPayAccessControl} from "./access/QiPayAccessControl.sol";
import {IQiPayVendorRegistry} from "./interfaces/IQiPayVendorRegistry.sol";
import {QuaiAddress} from "./libraries/QuaiAddress.sol";

contract QiPayVendorRegistry is QiPayAccessControl, IQiPayVendorRegistry {
    using QuaiAddress for address;

    mapping(bytes32 => Vendor) private _vendors;

    // Reverse index. Enforces one-attestor-to-one-vendor in both directions: a single key can never speak for two vendors.
    mapping(address => bytes32) private _vendorIdOf;

    uint256 public vendorCount;

    event VendorRegistered(
        bytes32 indexed vendorId,
        address indexed attestor,
        bytes32 metadataHash,
        address indexed registeredBy
    );
    event VendorMetadataUpdated(bytes32 indexed vendorId, bytes32 previousHash, bytes32 newHash);
    event VendorAttestorRotated(
        bytes32 indexed vendorId,
        address indexed previousAttestor,
        address indexed newAttestor
    );
    event VendorStatusChanged(
        bytes32 indexed vendorId,
        VendorStatus previousStatus,
        VendorStatus newStatus,
        address indexed changedBy
    );

    error InvalidVendorId();
    error VendorAlreadyRegistered(bytes32 vendorId);
    error VendorNotRegistered(bytes32 vendorId);
    error VendorNotActive(bytes32 vendorId, VendorStatus status);
    error VendorRevoked(bytes32 vendorId);
    error AttestorAlreadyBound(address attestor, bytes32 vendorId);
    error AttestorUnchanged(address attestor);
    error EmptyMetadataHash();
    error MetadataUnchanged(bytes32 metadataHash);
    error NotVendorOrManager(address caller, bytes32 vendorId);
    error AlreadyInStatus(VendorStatus status);

    constructor(address initialAdmin, uint8 zone_) QiPayAccessControl(initialAdmin, zone_) {}

    // Onboards a vendor. vendorId Caller-supplied identifier. Clients derive it as `keccak256(abi.encode(campusId, vendorSlug))` so it is stable and reproducible off-chain, but the registry only requires uniqueness.
    function registerVendor( bytes32 vendorId, address attestor, bytes32 metadataHash ) external onlyRole(VENDOR_MANAGER_ROLE) whenNotPaused {
        if (vendorId == bytes32(0)) revert InvalidVendorId();
        if (metadataHash == bytes32(0)) revert EmptyMetadataHash();
        if (_vendors[vendorId].status != VendorStatus.None) revert VendorAlreadyRegistered(vendorId);
        attestor.requireQuaiLedgerInZone(expectedZone);

        bytes32 boundTo = _vendorIdOf[attestor];
        if (boundTo != bytes32(0)) revert AttestorAlreadyBound(attestor, boundTo);

        uint40 now_ = uint40(block.timestamp);
        _vendors[vendorId] = Vendor({
            attestor: attestor,
            status: VendorStatus.Active,
            registeredAt: now_,
            statusChangedAt: now_,
            metadataHash: metadataHash
        });
        _vendorIdOf[attestor] = vendorId;

        unchecked {
            ++vendorCount;
        }

        emit VendorRegistered(vendorId, attestor, metadataHash, msg.sender);
        emit VendorStatusChanged(vendorId, VendorStatus.None, VendorStatus.Active, msg.sender);
    }

    //  Replaces a vendor's signing key. Essential in practice: campus vendors lose phones. Without rotation the only recovery would be revoke-and-re-register, which would orphan the vendor's settlement history and reputation.
    function rotateAttestor(
        bytes32 vendorId,
        address newAttestor
    ) external onlyRole(VENDOR_MANAGER_ROLE) {
        Vendor storage vendor = _requireRegistered(vendorId);
        if (vendor.status == VendorStatus.Revoked) revert VendorRevoked(vendorId);
        newAttestor.requireQuaiLedgerInZone(expectedZone);

        address previous = vendor.attestor;
        if (previous == newAttestor) revert AttestorUnchanged(newAttestor);

        bytes32 boundTo = _vendorIdOf[newAttestor];
        if (boundTo != bytes32(0)) revert AttestorAlreadyBound(newAttestor, boundTo);

        delete _vendorIdOf[previous];
        _vendorIdOf[newAttestor] = vendorId;
        vendor.attestor = newAttestor;

        emit VendorAttestorRotated(vendorId, previous, newAttestor);
    }

    // Updates the off-chain profile hash. The vendor may do this itself.
    function updateVendorMetadata(bytes32 vendorId, bytes32 metadataHash) external {
        Vendor storage vendor = _requireRegistered(vendorId);
        if (vendor.status == VendorStatus.Revoked) revert VendorRevoked(vendorId);
        if (metadataHash == bytes32(0)) revert EmptyMetadataHash();

        bool isManager = hasRole(VENDOR_MANAGER_ROLE, msg.sender);
        if (!isManager && msg.sender != vendor.attestor) {
            revert NotVendorOrManager(msg.sender, vendorId);
        }

        bytes32 previous = vendor.metadataHash;
        if (previous == metadataHash) revert MetadataUnchanged(metadataHash);
        vendor.metadataHash = metadataHash;

        emit VendorMetadataUpdated(vendorId, previous, metadataHash);
    }

    // Temporarily stops a vendor from raising new invoices. Reversible.
    function suspendVendor(bytes32 vendorId) external onlyRole(VENDOR_MANAGER_ROLE) {
        _setStatus(vendorId, VendorStatus.Suspended);
    }

    // Returns a suspended vendor to service.
    function reinstateVendor(bytes32 vendorId) external onlyRole(VENDOR_MANAGER_ROLE) {
        _setStatus(vendorId, VendorStatus.Active);
    }

    // @notice Permanently removes a vendor.
    function revokeVendor(bytes32 vendorId) external onlyRole(VENDOR_MANAGER_ROLE) {
        Vendor storage vendor = _requireRegistered(vendorId);
        VendorStatus previous = vendor.status;
        if (previous == VendorStatus.Revoked) revert AlreadyInStatus(VendorStatus.Revoked);

        vendor.status = VendorStatus.Revoked;
        vendor.statusChangedAt = uint40(block.timestamp);
        delete _vendorIdOf[vendor.attestor];

        emit VendorStatusChanged(vendorId, previous, VendorStatus.Revoked, msg.sender);
    }

    function _setStatus(bytes32 vendorId, VendorStatus next) private {
        Vendor storage vendor = _requireRegistered(vendorId);
        VendorStatus previous = vendor.status;
        if (previous == VendorStatus.Revoked) revert VendorRevoked(vendorId);
        if (previous == next) revert AlreadyInStatus(next);

        vendor.status = next;
        vendor.statusChangedAt = uint40(block.timestamp);

        emit VendorStatusChanged(vendorId, previous, next, msg.sender);
    }

    function _requireRegistered(bytes32 vendorId) private view returns (Vendor storage vendor) {
        vendor = _vendors[vendorId];
        if (vendor.status == VendorStatus.None) revert VendorNotRegistered(vendorId);
    }

    function getVendor(bytes32 vendorId) external view returns (Vendor memory) {
        return _vendors[vendorId];
    }

    function vendorStatus(bytes32 vendorId) external view returns (VendorStatus) {
        return _vendors[vendorId].status;
    }

    function isActiveVendor(bytes32 vendorId) external view returns (bool) {
        return _vendors[vendorId].status == VendorStatus.Active;
    }

    function vendorIdOf(address attestor) external view returns (bytes32) {
        return _vendorIdOf[attestor];
    }

    function resolveActiveVendor(address attestor) external view returns (bytes32 vendorId) {
        vendorId = _vendorIdOf[attestor];
        if (vendorId == bytes32(0)) revert VendorNotRegistered(bytes32(0));
        VendorStatus status = _vendors[vendorId].status;
        if (status != VendorStatus.Active) revert VendorNotActive(vendorId, status);
    }
}
