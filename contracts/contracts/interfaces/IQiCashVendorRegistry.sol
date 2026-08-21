// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IQiCashVendorRegistry {
    /// @notice Lifecycle of a campus vendor.
    /// @dev `Revoked` is terminal — see QiCashVendorRegistry for the rationale.
    enum VendorStatus {
        None,
        Active,
        Suspended,
        Revoked
    }

    struct Vendor {
        /// @notice Quai-ledger address the vendor signs payment requests with.
        address attestor;
        VendorStatus status;
        uint40 registeredAt;
        uint40 statusChangedAt;
        /// @notice keccak256 of the off-chain vendor profile (name, stall, category).
        /// @dev Hash only. Publishing a stall name on-chain would tie every invoice this vendor creates to a physical location.
        bytes32 metadataHash;
    }

    function getVendor(bytes32 vendorId) external view returns (Vendor memory);

    function vendorStatus(bytes32 vendorId) external view returns (VendorStatus);

    function isActiveVendor(bytes32 vendorId) external view returns (bool);

    function vendorIdOf(address attestor) external view returns (bytes32);

    /// @notice Resolves an attestor to its vendor id, reverting unless that vendor is currently Active.
    /// @dev The hub's authorization primitive: one call answers both "who is this caller" and "are they allowed to act right now".
    function resolveActiveVendor(address attestor) external view returns (bytes32 vendorId);
}
