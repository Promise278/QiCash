/**
 * QuaiAddress — the address-validation library every other contract depends on.
 *
 * These tests target the bit boundaries directly. A one-bit error in this
 * library is the worst kind of bug in QiCash: it either locks a role onto an
 * address nobody can sign for, or accepts a QI payout address that silently
 * burns a student's money. Neither surfaces as a failed transaction.
 */

const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");

const { ZONE_CYPRUS1, mkAddress } = require("./helpers/quai");

describe("QuaiAddress", function () {
  async function deployHarness() {
    const Harness = await ethers.getContractFactory("QuaiAddressHarness");
    const harness = await Harness.deploy();
    await harness.waitForDeployment();
    return { harness };
  }

  const ZERO = ethers.ZeroAddress;

  describe("shard decoding", function () {
    it("reads the shard prefix from byte 0", async function () {
      const { harness } = await loadFixture(deployHarness);
      expect(await harness.shardPrefix("0x0000000000000000000000000000000000000001")).to.equal(0x00);
      expect(await harness.shardPrefix("0xab00000000000000000000000000000000000001")).to.equal(0xab);
      expect(await harness.shardPrefix("0xff00000000000000000000000000000000000001")).to.equal(0xff);
    });

    it("splits the prefix into region (high nibble) and zone (low nibble)", async function () {
      const { harness } = await loadFixture(deployHarness);
      // 0x3c -> region 3, zone 12.
      const addr = "0x3c00000000000000000000000000000000000001";
      expect(await harness.region(addr)).to.equal(3);
      expect(await harness.zone(addr)).to.equal(12);
    });

    it("reports region and zone 0 for Cyprus-1", async function () {
      const { harness } = await loadFixture(deployHarness);
      const addr = mkAddress({ ledger: "quai", zone: ZONE_CYPRUS1, tag: 7 });
      expect(await harness.region(addr)).to.equal(0);
      expect(await harness.zone(addr)).to.equal(0);
      expect(await harness.shardPrefix(addr)).to.equal(ZONE_CYPRUS1);
    });

    it("exposes Cyprus-1 as prefix 0x00", async function () {
      const { harness } = await loadFixture(deployHarness);
      expect(await harness.zoneCyprus1()).to.equal(0x00);
    });

    it("keeps region and zone independent across all 16 zone values", async function () {
      const { harness } = await loadFixture(deployHarness);
      for (let z = 0; z < 16; z++) {
        const prefix = (5 << 4) | z; // region fixed at 5
        const addr = mkAddress({ ledger: "quai", zone: prefix, tag: 1 });
        expect(await harness.region(addr), `region for zone ${z}`).to.equal(5);
        expect(await harness.zone(addr), `zone ${z}`).to.equal(z);
      }
    });
  });

  describe("ledger flag (bit 8)", function () {
    // The ledger flag is the high bit of the third hex character, so 0-7 is the
    // Quai/account ledger and 8-f is the Qi/UTXO ledger. This boundary decides
    // whether an address can hold a role or receive native QI, and getting it
    // off by one bit would invert the meaning of every check in the system.
    it("treats third hex char 0-7 as the Quai ledger", async function () {
      const { harness } = await loadFixture(deployHarness);
      for (const nibble of ["0", "1", "2", "3", "4", "5", "6", "7"]) {
        const addr = ethers.getAddress(`0x00${nibble}${"0".repeat(36)}1`);
        expect(await harness.isQuaiLedger(addr), `nibble ${nibble}`).to.equal(true);
        expect(await harness.isQiLedger(addr), `nibble ${nibble}`).to.equal(false);
      }
    });

    it("treats third hex char 8-f as the Qi ledger", async function () {
      const { harness } = await loadFixture(deployHarness);
      for (const nibble of ["8", "9", "a", "b", "c", "d", "e", "f"]) {
        const addr = ethers.getAddress(`0x00${nibble}${"0".repeat(36)}1`);
        expect(await harness.isQiLedger(addr), `nibble ${nibble}`).to.equal(true);
        expect(await harness.isQuaiLedger(addr), `nibble ${nibble}`).to.equal(false);
      }
    });

    it("flips exactly at the 0x7 -> 0x8 boundary", async function () {
      const { harness } = await loadFixture(deployHarness);
      const quai = ethers.getAddress(`0x007${"f".repeat(37)}`);
      const qi = ethers.getAddress(`0x008${"0".repeat(37)}`);
      expect(await harness.isQiLedger(quai)).to.equal(false);
      expect(await harness.isQiLedger(qi)).to.equal(true);
    });

    it("ignores the shard prefix when reading the ledger flag", async function () {
      const { harness } = await loadFixture(deployHarness);
      // A set high bit in byte 0 must not be mistaken for the ledger flag.
      expect(await harness.isQiLedger(`0xff0${"0".repeat(36)}1`)).to.equal(false);
      expect(await harness.isQiLedger(`0x008${"0".repeat(36)}1`)).to.equal(true);
    });

    it("classifies the zero address as Quai-ledger", async function () {
      const { harness } = await loadFixture(deployHarness);
      // Bit-level truth: every bit is clear, so the flag is clear. The zero
      // address is nevertheless rejected by the `require*` guards below, which
      // is where that case has to be caught.
      expect(await harness.isQuaiLedger(ZERO)).to.equal(true);
      expect(await harness.isQiLedger(ZERO)).to.equal(false);
    });
  });

  describe("requireQuaiLedger", function () {
    it("accepts a Quai-ledger address", async function () {
      const { harness } = await loadFixture(deployHarness);
      await expect(harness.requireQuaiLedger(mkAddress({ tag: 42 }))).to.not.be.reverted;
    });

    it("rejects the zero address with ZeroAddress, not NotQuaiLedger", async function () {
      const { harness } = await loadFixture(deployHarness);
      // Ordering matters: the zero-address check runs first, so a caller that
      // passed an uninitialised variable gets the accurate diagnosis.
      await expect(harness.requireQuaiLedger(ZERO)).to.be.revertedWithCustomError(
        harness,
        "ZeroAddress"
      );
    });

    it("rejects a Qi-ledger address", async function () {
      const { harness } = await loadFixture(deployHarness);
      const qi = mkAddress({ ledger: "qi", tag: 42 });
      await expect(harness.requireQuaiLedger(qi))
        .to.be.revertedWithCustomError(harness, "NotQuaiLedger")
        .withArgs(qi);
    });

    it("does not check the zone", async function () {
      const { harness } = await loadFixture(deployHarness);
      // Ledger and zone are separate concerns; requireZone covers the other one.
      await expect(harness.requireQuaiLedger(mkAddress({ zone: 0x9f, tag: 3 }))).to.not.be.reverted;
    });
  });

  describe("requireQiLedger", function () {
    it("accepts a Qi-ledger address", async function () {
      const { harness } = await loadFixture(deployHarness);
      await expect(harness.requireQiLedger(mkAddress({ ledger: "qi", tag: 9 }))).to.not.be.reverted;
    });

    it("rejects the zero address with ZeroAddress", async function () {
      const { harness } = await loadFixture(deployHarness);
      await expect(harness.requireQiLedger(ZERO)).to.be.revertedWithCustomError(
        harness,
        "ZeroAddress"
      );
    });

    it("rejects a Quai-ledger address", async function () {
      const { harness } = await loadFixture(deployHarness);
      const quai = mkAddress({ tag: 9 });
      await expect(harness.requireQiLedger(quai))
        .to.be.revertedWithCustomError(harness, "NotQiLedger")
        .withArgs(quai);
    });
  });

  describe("requireZone", function () {
    it("accepts a matching prefix", async function () {
      const { harness } = await loadFixture(deployHarness);
      await expect(harness.requireZone(mkAddress({ tag: 1 }), ZONE_CYPRUS1)).to.not.be.reverted;
    });

    it("reports both expected and actual zone on mismatch", async function () {
      const { harness } = await loadFixture(deployHarness);
      const addr = mkAddress({ zone: 0x12, tag: 1 });
      await expect(harness.requireZone(addr, ZONE_CYPRUS1))
        .to.be.revertedWithCustomError(harness, "WrongZone")
        .withArgs(addr, ZONE_CYPRUS1, 0x12);
    });

    it("compares the full byte, not just the zone nibble", async function () {
      const { harness } = await loadFixture(deployHarness);
      // Region 1 / zone 0 is prefix 0x10 and must NOT satisfy expectedZone 0x00,
      // or a same-zone address in a different region would route to the wrong shard.
      const otherRegion = mkAddress({ zone: 0x10, tag: 1 });
      await expect(harness.requireZone(otherRegion, ZONE_CYPRUS1))
        .to.be.revertedWithCustomError(harness, "WrongZone")
        .withArgs(otherRegion, ZONE_CYPRUS1, 0x10);
    });

    it("accepts the zero address (zone check alone does not screen it)", async function () {
      const { harness } = await loadFixture(deployHarness);
      await expect(harness.requireZone(ZERO, ZONE_CYPRUS1)).to.not.be.reverted;
    });
  });

  describe("requireQuaiLedgerInZone", function () {
    it("accepts a Cyprus-1 Quai-ledger address", async function () {
      const { harness } = await loadFixture(deployHarness);
      await expect(harness.requireQuaiLedgerInZone(mkAddress({ tag: 77 }), ZONE_CYPRUS1)).to.not.be
        .reverted;
    });

    it("rejects the zero address", async function () {
      const { harness } = await loadFixture(deployHarness);
      await expect(
        harness.requireQuaiLedgerInZone(ZERO, ZONE_CYPRUS1)
      ).to.be.revertedWithCustomError(harness, "ZeroAddress");
    });

    it("rejects a Qi-ledger address even in the right zone", async function () {
      const { harness } = await loadFixture(deployHarness);
      const qi = mkAddress({ ledger: "qi", zone: ZONE_CYPRUS1, tag: 5 });
      await expect(harness.requireQuaiLedgerInZone(qi, ZONE_CYPRUS1))
        .to.be.revertedWithCustomError(harness, "NotQuaiLedger")
        .withArgs(qi);
    });

    it("rejects a Quai-ledger address in the wrong zone", async function () {
      const { harness } = await loadFixture(deployHarness);
      const wrong = mkAddress({ zone: 0x01, tag: 5 });
      await expect(harness.requireQuaiLedgerInZone(wrong, ZONE_CYPRUS1))
        .to.be.revertedWithCustomError(harness, "WrongZone")
        .withArgs(wrong, ZONE_CYPRUS1, 0x01);
    });

    it("checks the ledger flag before the zone", async function () {
      const { harness } = await loadFixture(deployHarness);
      // Wrong on both counts -> the ledger error wins, which tells the caller
      // the more fundamental thing: the key can never sign, whatever the shard.
      const bad = mkAddress({ ledger: "qi", zone: 0x33, tag: 5 });
      await expect(harness.requireQuaiLedgerInZone(bad, ZONE_CYPRUS1))
        .to.be.revertedWithCustomError(harness, "NotQuaiLedger")
        .withArgs(bad);
    });
  });

  describe("agreement with the JavaScript mirror used by the test helpers", function () {
    it("matches on a spread of addresses", async function () {
      const { harness } = await loadFixture(deployHarness);
      const H = require("./helpers/quai");
      const samples = [
        ZERO,
        mkAddress({ tag: 1 }),
        mkAddress({ ledger: "qi", tag: 1 }),
        mkAddress({ zone: 0x10, tag: 1 }),
        mkAddress({ ledger: "qi", zone: 0xff, tag: 1 }),
        ethers.getAddress(`0x007${"f".repeat(37)}`),
        ethers.getAddress(`0x008${"0".repeat(37)}`),
        ...H.minedSigners(3).map((s) => s.address),
      ];
      for (const addr of samples) {
        expect(await harness.isQiLedger(addr), `isQiLedger ${addr}`).to.equal(H.isQiLedger(addr));
        expect(await harness.shardPrefix(addr), `shardPrefix ${addr}`).to.equal(
          H.shardPrefix(addr)
        );
      }
    });
  });
});
