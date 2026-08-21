/**
 * QiCashVendorRegistry — the root of trust for the anti-QR-substitution property.
 *
 * If this contract can be made to hold a wrong entry, everything downstream
 * follows: a student's app will happily pay a request that resolves to an
 * `Active` vendor here. So the tests below concentrate on the invariants that
 * keep the mapping honest —
 *
 *   - one attestor key speaks for exactly one vendor, in both directions;
 *   - a rotated-away key loses its authority immediately;
 *   - revocation is terminal and cannot be quietly undone;
 *   - no Qi payout address and no readable profile ever reach storage.
 */

const { expect } = require("chai");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");

const {
  ROLES,
  ZONE_CYPRUS1,
  VendorStatus,
  mkAddress,
  vendorIdOf,
  deployQiCash,
} = require("./helpers/quai");

describe("QiCashVendorRegistry", function () {
  const PROFILE_A = ethers.id("profile:mama-put");
  const PROFILE_B = ethers.id("profile:print-shop");

  async function registryFixture() {
    const ctx = await deployQiCash();
    return {
      ...ctx,
      vendorA: vendorIdOf("campus:unilag", "vendor:mama-put"),
      vendorB: vendorIdOf("campus:unilag", "vendor:print-shop"),
    };
  }

  /** Registry with vendor A already onboarded and Active. */
  async function withVendorA() {
    const ctx = await registryFixture();
    await ctx.registry
      .connect(ctx.vendorManager)
      .registerVendor(ctx.vendorA, ctx.attestorA.address, PROFILE_A);
    return ctx;
  }

  describe("registerVendor", function () {
    it("onboards a vendor as Active and records the profile hash", async function () {
      const { registry, vendorManager, attestorA, vendorA } = await loadFixture(registryFixture);
      const tx = await registry
        .connect(vendorManager)
        .registerVendor(vendorA, attestorA.address, PROFILE_A);
      const stamp = BigInt(await time.latest());

      const vendor = await registry.getVendor(vendorA);
      expect(vendor.attestor).to.equal(attestorA.address);
      expect(vendor.status).to.equal(VendorStatus.Active);
      expect(vendor.metadataHash).to.equal(PROFILE_A);
      expect(vendor.registeredAt).to.equal(stamp);
      expect(vendor.statusChangedAt).to.equal(stamp);
      expect(tx).to.be.ok;
    });

    it("emits both the registration and the status transition", async function () {
      const { registry, vendorManager, attestorA, vendorA } = await loadFixture(registryFixture);
      const tx = registry.connect(vendorManager).registerVendor(vendorA, attestorA.address, PROFILE_A);
      await expect(tx)
        .to.emit(registry, "VendorRegistered")
        .withArgs(vendorA, attestorA.address, PROFILE_A, vendorManager.address);
      await expect(tx)
        .to.emit(registry, "VendorStatusChanged")
        .withArgs(vendorA, VendorStatus.None, VendorStatus.Active, vendorManager.address);
    });

    it("indexes the attestor in reverse", async function () {
      const { registry, vendorManager, attestorA, vendorA } = await loadFixture(registryFixture);
      await registry.connect(vendorManager).registerVendor(vendorA, attestorA.address, PROFILE_A);
      expect(await registry.vendorIdOf(attestorA.address)).to.equal(vendorA);
      expect(await registry.resolveActiveVendor(attestorA.address)).to.equal(vendorA);
    });

    it("counts vendors", async function () {
      const { registry, vendorManager, attestorA, attestorB, vendorA, vendorB } =
        await loadFixture(registryFixture);
      expect(await registry.vendorCount()).to.equal(0n);
      await registry.connect(vendorManager).registerVendor(vendorA, attestorA.address, PROFILE_A);
      expect(await registry.vendorCount()).to.equal(1n);
      await registry.connect(vendorManager).registerVendor(vendorB, attestorB.address, PROFILE_B);
      expect(await registry.vendorCount()).to.equal(2n);
    });

    it("requires VENDOR_MANAGER_ROLE — an admin alone cannot onboard", async function () {
      const { registry, admin, attestorA, vendorA } = await loadFixture(registryFixture);
      await expect(registry.connect(admin).registerVendor(vendorA, attestorA.address, PROFILE_A))
        .to.be.revertedWithCustomError(registry, "Unauthorized")
        .withArgs(ROLES.VENDOR_MANAGER, admin.address);
    });

    it("rejects an arbitrary caller", async function () {
      const { registry, spare, attestorA, vendorA } = await loadFixture(registryFixture);
      await expect(registry.connect(spare).registerVendor(vendorA, attestorA.address, PROFILE_A))
        .to.be.revertedWithCustomError(registry, "Unauthorized")
        .withArgs(ROLES.VENDOR_MANAGER, spare.address);
    });

    it("rejects a zero vendor id", async function () {
      const { registry, vendorManager, attestorA } = await loadFixture(registryFixture);
      // Zero doubles as "absent" in the reverse index, so it must never be a
      // real id or an unregistered attestor would resolve to a live vendor.
      await expect(
        registry.connect(vendorManager).registerVendor(ethers.ZeroHash, attestorA.address, PROFILE_A)
      ).to.be.revertedWithCustomError(registry, "InvalidVendorId");
    });

    it("rejects an empty metadata hash", async function () {
      const { registry, vendorManager, attestorA, vendorA } = await loadFixture(registryFixture);
      await expect(
        registry.connect(vendorManager).registerVendor(vendorA, attestorA.address, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(registry, "EmptyMetadataHash");
    });

    it("rejects a duplicate vendor id", async function () {
      const { registry, vendorManager, attestorA, attestorB, vendorA } =
        await loadFixture(withVendorA);
      await expect(
        registry.connect(vendorManager).registerVendor(vendorA, attestorB.address, PROFILE_B)
      )
        .to.be.revertedWithCustomError(registry, "VendorAlreadyRegistered")
        .withArgs(vendorA);
    });

    it("rejects a Qi-ledger attestor", async function () {
      const { registry, vendorManager, vendorA } = await loadFixture(registryFixture);
      // A Qi-ledger key cannot send an EVM transaction, so it could never raise
      // an invoice — the vendor would be onboarded and permanently mute.
      const qi = mkAddress({ ledger: "qi", tag: 11 });
      await expect(registry.connect(vendorManager).registerVendor(vendorA, qi, PROFILE_A))
        .to.be.revertedWithCustomError(registry, "NotQuaiLedger")
        .withArgs(qi);
    });

    it("rejects an out-of-zone attestor", async function () {
      const { registry, vendorManager, vendorA } = await loadFixture(registryFixture);
      const wrongZone = mkAddress({ zone: 0x21, tag: 11 });
      await expect(registry.connect(vendorManager).registerVendor(vendorA, wrongZone, PROFILE_A))
        .to.be.revertedWithCustomError(registry, "WrongZone")
        .withArgs(wrongZone, ZONE_CYPRUS1, 0x21);
    });

    it("rejects the zero address as attestor", async function () {
      const { registry, vendorManager, vendorA } = await loadFixture(registryFixture);
      await expect(
        registry.connect(vendorManager).registerVendor(vendorA, ethers.ZeroAddress, PROFILE_A)
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("refuses to bind one attestor to two vendors", async function () {
      // One key must never be able to speak for two vendors, or a single stolen
      // phone would let an attacker invoice under someone else's identity.
      const { registry, vendorManager, attestorA, vendorA, vendorB } =
        await loadFixture(withVendorA);
      await expect(
        registry.connect(vendorManager).registerVendor(vendorB, attestorA.address, PROFILE_B)
      )
        .to.be.revertedWithCustomError(registry, "AttestorAlreadyBound")
        .withArgs(attestorA.address, vendorA);
    });

    it("leaves nothing behind after a reverted registration", async function () {
      const { registry, vendorManager, vendorB, attestorA } = await loadFixture(withVendorA);
      await expect(
        registry.connect(vendorManager).registerVendor(vendorB, attestorA.address, PROFILE_B)
      ).to.be.reverted;
      expect(await registry.vendorCount()).to.equal(1n);
      expect(await registry.vendorStatus(vendorB)).to.equal(VendorStatus.None);
    });

    it("stores no payout address and no readable name", async function () {
      // The Vendor struct is deliberately narrow: attestor, status, timestamps
      // and a hash. Anything richer would let an observer enumerate a vendor's
      // takings or tie invoices to a physical stall.
      const { registry, vendorA } = await loadFixture(withVendorA);
      const vendor = await registry.getVendor(vendorA);
      expect(Object.keys(vendor.toObject())).to.have.members([
        "attestor",
        "status",
        "registeredAt",
        "statusChangedAt",
        "metadataHash",
      ]);
    });
  });

  describe("rotateAttestor", function () {
    it("moves authority to the new key", async function () {
      const { registry, vendorManager, attestorA, attestorC, vendorA } =
        await loadFixture(withVendorA);
      await expect(registry.connect(vendorManager).rotateAttestor(vendorA, attestorC.address))
        .to.emit(registry, "VendorAttestorRotated")
        .withArgs(vendorA, attestorA.address, attestorC.address);

      expect((await registry.getVendor(vendorA)).attestor).to.equal(attestorC.address);
      expect(await registry.vendorIdOf(attestorC.address)).to.equal(vendorA);
      expect(await registry.resolveActiveVendor(attestorC.address)).to.equal(vendorA);
    });

    it("clears the old key's binding so a stolen phone goes dead", async function () {
      // The entire point of rotation. If the stale binding survived, the thief
      // would keep full invoicing power alongside the legitimate vendor.
      const { registry, vendorManager, attestorA, attestorC, vendorA } =
        await loadFixture(withVendorA);
      await registry.connect(vendorManager).rotateAttestor(vendorA, attestorC.address);

      expect(await registry.vendorIdOf(attestorA.address)).to.equal(ethers.ZeroHash);
      await expect(registry.resolveActiveVendor(attestorA.address))
        .to.be.revertedWithCustomError(registry, "VendorNotRegistered")
        .withArgs(ethers.ZeroHash);
    });

    it("preserves the vendor's history and identity", async function () {
      // Rotation must not orphan reputation — that is why it exists instead of
      // revoke-and-re-register.
      const { registry, vendorManager, attestorC, vendorA } = await loadFixture(withVendorA);
      const before = await registry.getVendor(vendorA);
      await registry.connect(vendorManager).rotateAttestor(vendorA, attestorC.address);
      const after = await registry.getVendor(vendorA);

      expect(after.registeredAt).to.equal(before.registeredAt);
      expect(after.metadataHash).to.equal(before.metadataHash);
      expect(after.status).to.equal(VendorStatus.Active);
      expect(await registry.vendorCount()).to.equal(1n);
    });

    it("is manager-only — the current attestor cannot rotate itself", async function () {
      // A thief holding the phone must not be able to lock the real vendor out.
      // Rotation belongs to an authority that can verify identity offline.
      const { registry, attestorA, attestorC, vendorA } = await loadFixture(withVendorA);
      await expect(registry.connect(attestorA).rotateAttestor(vendorA, attestorC.address))
        .to.be.revertedWithCustomError(registry, "Unauthorized")
        .withArgs(ROLES.VENDOR_MANAGER, attestorA.address);
    });

    it("rejects an admin without the manager role", async function () {
      const { registry, admin, attestorC, vendorA } = await loadFixture(withVendorA);
      await expect(registry.connect(admin).rotateAttestor(vendorA, attestorC.address))
        .to.be.revertedWithCustomError(registry, "Unauthorized")
        .withArgs(ROLES.VENDOR_MANAGER, admin.address);
    });

    it("rejects an unregistered vendor", async function () {
      const { registry, vendorManager, attestorC, vendorB } = await loadFixture(withVendorA);
      await expect(registry.connect(vendorManager).rotateAttestor(vendorB, attestorC.address))
        .to.be.revertedWithCustomError(registry, "VendorNotRegistered")
        .withArgs(vendorB);
    });

    it("rejects rotating to the same key", async function () {
      const { registry, vendorManager, attestorA, vendorA } = await loadFixture(withVendorA);
      await expect(registry.connect(vendorManager).rotateAttestor(vendorA, attestorA.address))
        .to.be.revertedWithCustomError(registry, "AttestorUnchanged")
        .withArgs(attestorA.address);
    });

    it("rejects a key already bound to another vendor", async function () {
      const { registry, vendorManager, attestorA, attestorB, vendorA, vendorB } =
        await loadFixture(withVendorA);
      await registry.connect(vendorManager).registerVendor(vendorB, attestorB.address, PROFILE_B);
      await expect(registry.connect(vendorManager).rotateAttestor(vendorA, attestorB.address))
        .to.be.revertedWithCustomError(registry, "AttestorAlreadyBound")
        .withArgs(attestorB.address, vendorB);
      // Neither vendor was disturbed.
      expect((await registry.getVendor(vendorA)).attestor).to.equal(attestorA.address);
      expect((await registry.getVendor(vendorB)).attestor).to.equal(attestorB.address);
    });

    it("validates the new key's address", async function () {
      const { registry, vendorManager, vendorA } = await loadFixture(withVendorA);
      const qi = mkAddress({ ledger: "qi", tag: 12 });
      await expect(registry.connect(vendorManager).rotateAttestor(vendorA, qi))
        .to.be.revertedWithCustomError(registry, "NotQuaiLedger")
        .withArgs(qi);
      await expect(
        registry.connect(vendorManager).rotateAttestor(vendorA, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("works for a suspended vendor", async function () {
      // Suspension is a pause on trading, not on administration; a suspended
      // vendor still needs to be able to replace a lost phone.
      const { registry, vendorManager, attestorC, vendorA } = await loadFixture(withVendorA);
      await registry.connect(vendorManager).suspendVendor(vendorA);
      await expect(registry.connect(vendorManager).rotateAttestor(vendorA, attestorC.address)).to.not
        .be.reverted;
      expect(await registry.vendorStatus(vendorA)).to.equal(VendorStatus.Suspended);
    });

    it("is blocked once the vendor is revoked", async function () {
      const { registry, vendorManager, attestorC, vendorA } = await loadFixture(withVendorA);
      await registry.connect(vendorManager).revokeVendor(vendorA);
      await expect(registry.connect(vendorManager).rotateAttestor(vendorA, attestorC.address))
        .to.be.revertedWithCustomError(registry, "VendorRevoked")
        .withArgs(vendorA);
    });

    it("frees the previous key for reuse by another vendor", async function () {
      const { registry, vendorManager, attestorA, attestorC, vendorA, vendorB } =
        await loadFixture(withVendorA);
      await registry.connect(vendorManager).rotateAttestor(vendorA, attestorC.address);
      // The old key is unbound, so a manager may deliberately reuse it.
      await expect(
        registry.connect(vendorManager).registerVendor(vendorB, attestorA.address, PROFILE_B)
      ).to.not.be.reverted;
      expect(await registry.vendorIdOf(attestorA.address)).to.equal(vendorB);
    });
  });

  describe("updateVendorMetadata", function () {
    it("lets the vendor update its own profile hash", async function () {
      const { registry, attestorA, vendorA } = await loadFixture(withVendorA);
      const next = ethers.id("profile:mama-put:v2");
      await expect(registry.connect(attestorA).updateVendorMetadata(vendorA, next))
        .to.emit(registry, "VendorMetadataUpdated")
        .withArgs(vendorA, PROFILE_A, next);
      expect((await registry.getVendor(vendorA)).metadataHash).to.equal(next);
    });

    it("lets a manager update it", async function () {
      const { registry, vendorManager, vendorA } = await loadFixture(withVendorA);
      const next = ethers.id("profile:corrected");
      await expect(registry.connect(vendorManager).updateVendorMetadata(vendorA, next)).to.not.be
        .reverted;
      expect((await registry.getVendor(vendorA)).metadataHash).to.equal(next);
    });

    it("rejects everyone else", async function () {
      const { registry, spare, attestorB, admin, vendorA } = await loadFixture(withVendorA);
      for (const caller of [spare, attestorB, admin]) {
        await expect(registry.connect(caller).updateVendorMetadata(vendorA, ethers.id("x")))
          .to.be.revertedWithCustomError(registry, "NotVendorOrManager")
          .withArgs(caller.address, vendorA);
      }
    });

    it("rejects an unchanged hash", async function () {
      const { registry, attestorA, vendorA } = await loadFixture(withVendorA);
      await expect(registry.connect(attestorA).updateVendorMetadata(vendorA, PROFILE_A))
        .to.be.revertedWithCustomError(registry, "MetadataUnchanged")
        .withArgs(PROFILE_A);
    });

    it("rejects an empty hash", async function () {
      const { registry, attestorA, vendorA } = await loadFixture(withVendorA);
      await expect(
        registry.connect(attestorA).updateVendorMetadata(vendorA, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(registry, "EmptyMetadataHash");
    });

    it("rejects an unregistered vendor", async function () {
      const { registry, vendorManager, vendorB } = await loadFixture(withVendorA);
      await expect(registry.connect(vendorManager).updateVendorMetadata(vendorB, ethers.id("x")))
        .to.be.revertedWithCustomError(registry, "VendorNotRegistered")
        .withArgs(vendorB);
    });

    it("is blocked after revocation", async function () {
      const { registry, vendorManager, attestorA, vendorA } = await loadFixture(withVendorA);
      await registry.connect(vendorManager).revokeVendor(vendorA);
      // The former attestor is unbound but the check is on vendor status, so the
      // authorization branch is unreachable either way.
      await expect(registry.connect(vendorManager).updateVendorMetadata(vendorA, ethers.id("x")))
        .to.be.revertedWithCustomError(registry, "VendorRevoked")
        .withArgs(vendorA);
      await expect(registry.connect(attestorA).updateVendorMetadata(vendorA, ethers.id("x")))
        .to.be.revertedWithCustomError(registry, "VendorRevoked")
        .withArgs(vendorA);
    });

    it("works while suspended", async function () {
      const { registry, vendorManager, attestorA, vendorA } = await loadFixture(withVendorA);
      await registry.connect(vendorManager).suspendVendor(vendorA);
      await expect(registry.connect(attestorA).updateVendorMetadata(vendorA, ethers.id("x"))).to.not
        .be.reverted;
    });

    it("does not require the contract to be unpaused", async function () {
      const { registry, pauser, attestorA, vendorA } = await loadFixture(withVendorA);
      await registry.connect(pauser).pause();
      await expect(registry.connect(attestorA).updateVendorMetadata(vendorA, ethers.id("x"))).to.not
        .be.reverted;
    });
  });

  describe("suspend and reinstate", function () {
    it("suspends an active vendor", async function () {
      const { registry, vendorManager, vendorA } = await loadFixture(withVendorA);
      await expect(registry.connect(vendorManager).suspendVendor(vendorA))
        .to.emit(registry, "VendorStatusChanged")
        .withArgs(vendorA, VendorStatus.Active, VendorStatus.Suspended, vendorManager.address);

      expect(await registry.vendorStatus(vendorA)).to.equal(VendorStatus.Suspended);
      expect(await registry.isActiveVendor(vendorA)).to.equal(false);
      expect((await registry.getVendor(vendorA)).statusChangedAt).to.equal(
        BigInt(await time.latest())
      );
    });

    it("stops a suspended vendor resolving as active", async function () {
      const { registry, vendorManager, attestorA, vendorA } = await loadFixture(withVendorA);
      await registry.connect(vendorManager).suspendVendor(vendorA);
      await expect(registry.resolveActiveVendor(attestorA.address))
        .to.be.revertedWithCustomError(registry, "VendorNotActive")
        .withArgs(vendorA, VendorStatus.Suspended);
      // The binding itself survives — suspension is reversible.
      expect(await registry.vendorIdOf(attestorA.address)).to.equal(vendorA);
    });

    it("reinstates a suspended vendor", async function () {
      const { registry, vendorManager, attestorA, vendorA } = await loadFixture(withVendorA);
      await registry.connect(vendorManager).suspendVendor(vendorA);
      await expect(registry.connect(vendorManager).reinstateVendor(vendorA))
        .to.emit(registry, "VendorStatusChanged")
        .withArgs(vendorA, VendorStatus.Suspended, VendorStatus.Active, vendorManager.address);
      expect(await registry.resolveActiveVendor(attestorA.address)).to.equal(vendorA);
    });

    it("rejects redundant transitions", async function () {
      const { registry, vendorManager, vendorA } = await loadFixture(withVendorA);
      await expect(registry.connect(vendorManager).reinstateVendor(vendorA))
        .to.be.revertedWithCustomError(registry, "AlreadyInStatus")
        .withArgs(VendorStatus.Active);

      await registry.connect(vendorManager).suspendVendor(vendorA);
      await expect(registry.connect(vendorManager).suspendVendor(vendorA))
        .to.be.revertedWithCustomError(registry, "AlreadyInStatus")
        .withArgs(VendorStatus.Suspended);
    });

    it("requires the manager role", async function () {
      const { registry, admin, spare, attestorA, vendorA } = await loadFixture(withVendorA);
      for (const caller of [admin, spare, attestorA]) {
        await expect(registry.connect(caller).suspendVendor(vendorA))
          .to.be.revertedWithCustomError(registry, "Unauthorized")
          .withArgs(ROLES.VENDOR_MANAGER, caller.address);
        await expect(registry.connect(caller).reinstateVendor(vendorA))
          .to.be.revertedWithCustomError(registry, "Unauthorized")
          .withArgs(ROLES.VENDOR_MANAGER, caller.address);
      }
    });

    it("rejects an unregistered vendor", async function () {
      const { registry, vendorManager, vendorB } = await loadFixture(withVendorA);
      await expect(registry.connect(vendorManager).suspendVendor(vendorB))
        .to.be.revertedWithCustomError(registry, "VendorNotRegistered")
        .withArgs(vendorB);
    });

    it("works while the contract is paused", async function () {
      // Suspending a vendor is incident response; a pause must not block it.
      const { registry, vendorManager, pauser, vendorA } = await loadFixture(withVendorA);
      await registry.connect(pauser).pause();
      await expect(registry.connect(vendorManager).suspendVendor(vendorA)).to.not.be.reverted;
    });
  });

  describe("revokeVendor", function () {
    it("marks the vendor revoked and releases the attestor binding", async function () {
      const { registry, vendorManager, attestorA, vendorA } = await loadFixture(withVendorA);
      await expect(registry.connect(vendorManager).revokeVendor(vendorA))
        .to.emit(registry, "VendorStatusChanged")
        .withArgs(vendorA, VendorStatus.Active, VendorStatus.Revoked, vendorManager.address);

      expect(await registry.vendorStatus(vendorA)).to.equal(VendorStatus.Revoked);
      expect(await registry.isActiveVendor(vendorA)).to.equal(false);
      expect(await registry.vendorIdOf(attestorA.address)).to.equal(ethers.ZeroHash);
    });

    it("keeps the vendor record for auditability", async function () {
      const { registry, vendorManager, attestorA, vendorA } = await loadFixture(withVendorA);
      await registry.connect(vendorManager).revokeVendor(vendorA);
      const vendor = await registry.getVendor(vendorA);
      // The entry is not deleted: a revoked-for-fraud vendor must stay on the
      // record, and the id must never become re-registerable.
      expect(vendor.attestor).to.equal(attestorA.address);
      expect(vendor.metadataHash).to.equal(PROFILE_A);
      expect(await registry.vendorCount()).to.equal(1n);
    });

    it("is terminal — no reinstatement, no re-registration", async function () {
      const { registry, vendorManager, attestorB, vendorA } = await loadFixture(withVendorA);
      await registry.connect(vendorManager).revokeVendor(vendorA);

      await expect(registry.connect(vendorManager).reinstateVendor(vendorA))
        .to.be.revertedWithCustomError(registry, "VendorRevoked")
        .withArgs(vendorA);
      await expect(registry.connect(vendorManager).suspendVendor(vendorA))
        .to.be.revertedWithCustomError(registry, "VendorRevoked")
        .withArgs(vendorA);
      await expect(
        registry.connect(vendorManager).registerVendor(vendorA, attestorB.address, PROFILE_B)
      )
        .to.be.revertedWithCustomError(registry, "VendorAlreadyRegistered")
        .withArgs(vendorA);
    });

    it("rejects a second revocation", async function () {
      const { registry, vendorManager, vendorA } = await loadFixture(withVendorA);
      await registry.connect(vendorManager).revokeVendor(vendorA);
      await expect(registry.connect(vendorManager).revokeVendor(vendorA))
        .to.be.revertedWithCustomError(registry, "AlreadyInStatus")
        .withArgs(VendorStatus.Revoked);
    });

    it("can revoke a suspended vendor", async function () {
      const { registry, vendorManager, vendorA } = await loadFixture(withVendorA);
      await registry.connect(vendorManager).suspendVendor(vendorA);
      await expect(registry.connect(vendorManager).revokeVendor(vendorA))
        .to.emit(registry, "VendorStatusChanged")
        .withArgs(vendorA, VendorStatus.Suspended, VendorStatus.Revoked, vendorManager.address);
    });

    it("requires the manager role", async function () {
      const { registry, admin, spare, vendorA } = await loadFixture(withVendorA);
      for (const caller of [admin, spare]) {
        await expect(registry.connect(caller).revokeVendor(vendorA))
          .to.be.revertedWithCustomError(registry, "Unauthorized")
          .withArgs(ROLES.VENDOR_MANAGER, caller.address);
      }
    });

    it("rejects an unregistered vendor", async function () {
      const { registry, vendorManager, vendorB } = await loadFixture(withVendorA);
      await expect(registry.connect(vendorManager).revokeVendor(vendorB))
        .to.be.revertedWithCustomError(registry, "VendorNotRegistered")
        .withArgs(vendorB);
    });

    it("does not silently re-enable the freed key", async function () {
      // The address is unbound, but only an explicit manager action can bind it
      // again — a revoked operator cannot quietly return under a new id.
      const { registry, vendorManager, attestorA, vendorA, vendorB } =
        await loadFixture(withVendorA);
      await registry.connect(vendorManager).revokeVendor(vendorA);

      await expect(registry.resolveActiveVendor(attestorA.address)).to.be.revertedWithCustomError(
        registry,
        "VendorNotRegistered"
      );
      // A deliberate re-bind is possible, and it is a visible manager transaction.
      await expect(
        registry.connect(vendorManager).registerVendor(vendorB, attestorA.address, PROFILE_B)
      )
        .to.emit(registry, "VendorRegistered")
        .withArgs(vendorB, attestorA.address, PROFILE_B, vendorManager.address);
    });
  });

  describe("views", function () {
    it("returns an empty record for an unknown vendor", async function () {
      const { registry, vendorB } = await loadFixture(withVendorA);
      const vendor = await registry.getVendor(vendorB);
      expect(vendor.status).to.equal(VendorStatus.None);
      expect(vendor.attestor).to.equal(ethers.ZeroAddress);
      expect(vendor.metadataHash).to.equal(ethers.ZeroHash);
      expect(await registry.isActiveVendor(vendorB)).to.equal(false);
      expect(await registry.vendorStatus(vendorB)).to.equal(VendorStatus.None);
    });

    it("returns zero for an unknown attestor", async function () {
      const { registry, spare } = await loadFixture(withVendorA);
      expect(await registry.vendorIdOf(spare.address)).to.equal(ethers.ZeroHash);
    });

    it("reverts resolveActiveVendor for an unknown attestor", async function () {
      const { registry, spare } = await loadFixture(withVendorA);
      await expect(registry.resolveActiveVendor(spare.address))
        .to.be.revertedWithCustomError(registry, "VendorNotRegistered")
        .withArgs(ethers.ZeroHash);
    });

    it("reverts resolveActiveVendor for a revoked vendor", async function () {
      const { registry, vendorManager, attestorA, vendorA } = await loadFixture(withVendorA);
      await registry.connect(vendorManager).revokeVendor(vendorA);
      // The binding is gone, so this fails at the lookup rather than the status.
      await expect(registry.resolveActiveVendor(attestorA.address))
        .to.be.revertedWithCustomError(registry, "VendorNotRegistered")
        .withArgs(ethers.ZeroHash);
      expect(vendorA).to.not.equal(ethers.ZeroHash);
    });

    it("derives vendor ids reproducibly off-chain", async function () {
      // Clients compute keccak256(abi.encode(campusId, vendorSlug)); a mismatch
      // would leave an app unable to find its own vendor's invoices.
      const a = vendorIdOf("campus:unilag", "vendor:mama-put");
      const b = vendorIdOf("campus:unilag", "vendor:mama-put");
      const c = vendorIdOf("campus:unilag", "vendor:print-shop");
      const d = vendorIdOf("campus:ui", "vendor:mama-put");
      expect(a).to.equal(b);
      expect(a).to.not.equal(c);
      expect(a).to.not.equal(d);
    });
  });
});
