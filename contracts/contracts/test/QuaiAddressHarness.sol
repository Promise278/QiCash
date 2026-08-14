// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {QuaiAddress} from "../libraries/QuaiAddress.sol";

contract QuaiAddressHarness {
    using QuaiAddress for address;

    function shardPrefix(address account) external pure returns (uint8) {
        return account.shardPrefix();
    }

    function region(address account) external pure returns (uint8) {
        return account.region();
    }

    function zone(address account) external pure returns (uint8) {
        return account.zone();
    }

    function isQiLedger(address account) external pure returns (bool) {
        return account.isQiLedger();
    }

    function isQuaiLedger(address account) external pure returns (bool) {
        return account.isQuaiLedger();
    }

    function requireQuaiLedger(address account) external pure {
        account.requireQuaiLedger();
    }

    function requireQiLedger(address account) external pure {
        account.requireQiLedger();
    }

    function requireZone(address account, uint8 expectedZone) external pure {
        account.requireZone(expectedZone);
    }

    function requireQuaiLedgerInZone(address account, uint8 expectedZone) external pure {
        account.requireQuaiLedgerInZone(expectedZone);
    }

    function zoneCyprus1() external pure returns (uint8) {
        return QuaiAddress.ZONE_CYPRUS1;
    }
}
