// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

library QuaiAddress {
    uint256 private constant LEDGER_BIT_OFFSET = 151;

    /// @dev Bit offset of the 8-bit shard prefix (region nibble + zone nibble).
    uint256 private constant SHARD_PREFIX_OFFSET = 152;

    /// @notice Shard prefix of Cyprus-1 (region 0, zone 0) — the only active zone.
    uint8 internal constant ZONE_CYPRUS1 = 0x00;

    error ZeroAddress();
    error NotQuaiLedger(address account);
    error NotQiLedger(address account);
    error WrongZone(address account, uint8 expectedZone, uint8 actualZone);

    /// @notice Returns the 8-bit shard prefix (region nibble << 4 | zone nibble).
    function shardPrefix(address account) internal pure returns (uint8) {
        return uint8(uint160(account) >> SHARD_PREFIX_OFFSET);
    }

    /// @notice Returns the region number encoded in the address (0-15).
    function region(address account) internal pure returns (uint8) {
        return uint8(uint160(account) >> (SHARD_PREFIX_OFFSET + 4));
    }

    /// @notice Returns the zone number encoded in the address (0-15).
    function zone(address account) internal pure returns (uint8) {
        return uint8((uint160(account) >> SHARD_PREFIX_OFFSET) & 0x0f);
    }

    /// @notice True if the address belongs to the Qi (UTXO) ledger.
    function isQiLedger(address account) internal pure returns (bool) {
        return ((uint160(account) >> LEDGER_BIT_OFFSET) & 1) == 1;
    }

    /// @notice True if the address belongs to the Quai (account/EVM) ledger.
    function isQuaiLedger(address account) internal pure returns (bool) {
        return !isQiLedger(account);
    }

    /// @notice Reverts unless `account` is a non-zero Quai-ledger address.
    /// @dev Use for anything the EVM must treat as a caller, signer or contract.
    function requireQuaiLedger(address account) internal pure {
        if (account == address(0)) revert ZeroAddress();
        if (isQiLedger(account)) revert NotQuaiLedger(account);
    }

    /// @notice Reverts unless `account` is a non-zero Qi-ledger address.
    /// @dev Use only for values that will receive native Qi off-chain. QiCash
    function requireQiLedger(address account) internal pure {
        if (account == address(0)) revert ZeroAddress();
        if (!isQiLedger(account)) revert NotQiLedger(account);
    }

    /// @notice Reverts unless `account` sits in the expected shard.
    function requireZone(address account, uint8 expectedZone) internal pure {
        uint8 actual = shardPrefix(account);
        if (actual != expectedZone) revert WrongZone(account, expectedZone, actual);
    }

    /// @notice Reverts unless `account` is a Quai-ledger address in `expectedZone`.
    function requireQuaiLedgerInZone(address account, uint8 expectedZone) internal pure {
        requireQuaiLedger(account);
        requireZone(account, expectedZone);
    }
}
