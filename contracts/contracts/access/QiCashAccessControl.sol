// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {QuaiAddress} from "../libraries/QuaiAddress.sol";

abstract contract QiCashAccessControl {
    using QuaiAddress for address;

    bytes32 public constant ADMIN_ROLE = keccak256("QiCash.ADMIN");
    bytes32 public constant VENDOR_MANAGER_ROLE = keccak256("QiCash.VENDOR_MANAGER");
    bytes32 public constant ARBITER_ROLE = keccak256("QiCash.ARBITER");
    bytes32 public constant PAUSER_ROLE = keccak256("QiCash.PAUSER");

    /// @notice Shard prefix every privileged address must belong to.
    /// @dev `0x00` on Quai mainnet and Orchard, where Cyprus-1 is the only active zone. Constructor-supplied rather than derived from `address(this)` so the value is explicit and auditable.
    uint8 public immutable expectedZone;

    mapping(bytes32 => mapping(address => bool)) private _roles;

    /// @dev Guards against removing the final admin.
    uint256 private _adminCount;

    address private _pendingAdmin;
    bool private _paused;

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event AdminProposed(address indexed pendingAdmin, address indexed proposer);
    event AdminProposalCancelled(address indexed pendingAdmin, address indexed canceller);
    event Paused(address indexed account);
    event Unpaused(address indexed account);

    error Unauthorized(bytes32 role, address account);
    error AlreadyHasRole(bytes32 role, address account);
    error DoesNotHaveRole(bytes32 role, address account);
    error LastAdminCannotBeRemoved();
    error NotPendingAdmin(address caller);
    error NoPendingAdmin();
    error ContractPaused();
    error ContractNotPaused();

    modifier onlyRole(bytes32 role) {
        if (!_roles[role][msg.sender]) revert Unauthorized(role, msg.sender);
        _;
    }

    modifier whenNotPaused() {
        if (_paused) revert ContractPaused();
        _;
    }


    constructor(address initialAdmin, uint8 zone_) {
        expectedZone = zone_;
        initialAdmin.requireQuaiLedgerInZone(zone_);
        _roles[ADMIN_ROLE][initialAdmin] = true;
        _adminCount = 1;
        emit RoleGranted(ADMIN_ROLE, initialAdmin, msg.sender);
    }

    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role][account];
    }

    function paused() public view returns (bool) {
        return _paused;
    }

    function pendingAdmin() public view returns (address) {
        return _pendingAdmin;
    }

    function adminCount() public view returns (uint256) {
        return _adminCount;
    }

    /// @notice Grants `role` to `account`. ADMIN_ROLE is not grantable here it must go through the propose/accept handover.
    function grantRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        if (role == ADMIN_ROLE) revert Unauthorized(ADMIN_ROLE, msg.sender);
        account.requireQuaiLedgerInZone(expectedZone);
        if (_roles[role][account]) revert AlreadyHasRole(role, account);
        _roles[role][account] = true;
        emit RoleGranted(role, account, msg.sender);
    }

    /// @notice Revokes `role` from `account`.
    function revokeRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        _revokeRole(role, account);
    }

    /// @notice Gives up one of the caller's own roles.
    /// @dev Callable while paused on purpose — a compromised key holder must be able to drop its own privileges immediately, whatever the pause state.
    function renounceRole(bytes32 role) external {
        _revokeRole(role, msg.sender);
    }

    function _revokeRole(bytes32 role, address account) private {
        if (!_roles[role][account]) revert DoesNotHaveRole(role, account);
        if (role == ADMIN_ROLE) {
            if (_adminCount == 1) revert LastAdminCannotBeRemoved();
            unchecked {
                --_adminCount;
            }
        }
        _roles[role][account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    /// @notice Step 1 of admin handover. Nominates `newAdmin`.
    function proposeAdmin(address newAdmin) external onlyRole(ADMIN_ROLE) {
        newAdmin.requireQuaiLedgerInZone(expectedZone);
        if (_roles[ADMIN_ROLE][newAdmin]) revert AlreadyHasRole(ADMIN_ROLE, newAdmin);
        _pendingAdmin = newAdmin;
        emit AdminProposed(newAdmin, msg.sender);
    }

    /// @notice Withdraws an outstanding nomination.
    function cancelAdminProposal() external onlyRole(ADMIN_ROLE) {
        address nominee = _pendingAdmin;
        if (nominee == address(0)) revert NoPendingAdmin();
        _pendingAdmin = address(0);
        emit AdminProposalCancelled(nominee, msg.sender);
    }

    /// @notice Step 2 of admin handover. Must be called by the nominee itself,  which proves the key is controlled before privileges land on it.
    function acceptAdmin() external {
        if (msg.sender != _pendingAdmin) revert NotPendingAdmin(msg.sender);
        _pendingAdmin = address(0);
        _roles[ADMIN_ROLE][msg.sender] = true;
        unchecked {
            ++_adminCount;
        }
        emit RoleGranted(ADMIN_ROLE, msg.sender, msg.sender);
    }

    /// @notice Halts new invoice creation. See the pause note on QiCashPaymentHub: settlement and dispute flows stay open by design so a pause can never trap a student who has already paid.
    function pause() external onlyRole(PAUSER_ROLE) {
        if (_paused) revert ContractPaused();
        _paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        if (!_paused) revert ContractNotPaused();
        _paused = false;
        emit Unpaused(msg.sender);
    }
}
