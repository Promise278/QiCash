/**
 * QiCashAccessControl — roles, admin handover and the circuit breaker.
 *
 * Exercised through QiCashVendorRegistry (the base contract is abstract) plus the
 * hub where cross-contract independence matters.
 *
 * The properties under test are the ones that decide who can move money-adjacent
 * state: that roles do NOT imply one another, that the contract can never be
 * left without an admin, that admin power cannot land on an address nobody
 * controls, and that a pause stops the right things and only the right things.
 */

const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");

const {
  ROLES,
  ZONE_CYPRUS1,
  minedSigners,
  fund,
  mkAddress,
  vendorIdOf,
  deployQiCash,
} = require("./helpers/quai");

describe("QiCashAccessControl", function () {
  /**
   * A bare registry. The registry's own address is never validated (only the
   * hub's constructor validates the registry it is pointed at), so this can be
   * deployed from an ordinary Hardhat signer — only `initialAdmin` has to be a
   * real Cyprus-1 Quai-ledger account.
   */
  async function deployRegistry() {
    const [faucet, outsider] = await ethers.getSigners();
    const [admin, manager, pauser, nominee, spare, spare2] = minedSigners(6);
    await fund([admin, manager, pauser, nominee, spare, spare2]);

    const Registry = await ethers.getContractFactory("QiCashVendorRegistry", faucet);
    const registry = await Registry.deploy(admin.address, ZONE_CYPRUS1);
    await registry.waitForDeployment();

    return { registry, Registry, faucet, outsider, admin, manager, pauser, nominee, spare, spare2 };
  }

  describe("construction", function () {
    it("grants ADMIN_ROLE to the initial admin and records one admin", async function () {
      const { registry, admin } = await loadFixture(deployRegistry);
      expect(await registry.hasRole(ROLES.ADMIN, admin.address)).to.equal(true);
      expect(await registry.adminCount()).to.equal(1n);
      expect(await registry.pendingAdmin()).to.equal(ethers.ZeroAddress);
      expect(await registry.paused()).to.equal(false);
    });

    it("stores the expected zone as an immutable", async function () {
      const { registry } = await loadFixture(deployRegistry);
      expect(await registry.expectedZone()).to.equal(ZONE_CYPRUS1);
    });

    it("emits RoleGranted attributed to the deployer", async function () {
      const { registry, admin, faucet } = await loadFixture(deployRegistry);
      await expect(registry.deploymentTransaction())
        .to.emit(registry, "RoleGranted")
        .withArgs(ROLES.ADMIN, admin.address, faucet.address);
    });

    it("grants the initial admin no other role", async function () {
      // Non-hierarchical roles are the central least-privilege guarantee: an
      // admin that could implicitly onboard vendors or arbitrate disputes would
      // make a single compromised key sufficient to fake a vendor and rule in
      // its favour.
      const { registry, admin } = await loadFixture(deployRegistry);
      expect(await registry.hasRole(ROLES.VENDOR_MANAGER, admin.address)).to.equal(false);
      expect(await registry.hasRole(ROLES.ARBITER, admin.address)).to.equal(false);
      expect(await registry.hasRole(ROLES.PAUSER, admin.address)).to.equal(false);
    });

    it("rejects a Qi-ledger initial admin", async function () {
      const { Registry } = await loadFixture(deployRegistry);
      const qiAdmin = mkAddress({ ledger: "qi", tag: 1 });
      await expect(Registry.deploy(qiAdmin, ZONE_CYPRUS1))
        .to.be.revertedWithCustomError(Registry, "NotQuaiLedger")
        .withArgs(qiAdmin);
    });

    it("rejects the zero address as initial admin", async function () {
      const { Registry } = await loadFixture(deployRegistry);
      await expect(Registry.deploy(ethers.ZeroAddress, ZONE_CYPRUS1)).to.be.revertedWithCustomError(
        Registry,
        "ZeroAddress"
      );
    });

    it("rejects an initial admin outside the declared zone", async function () {
      const { Registry, admin } = await loadFixture(deployRegistry);
      // Same admin, but the contract is told to expect zone 0x01.
      await expect(Registry.deploy(admin.address, 0x01))
        .to.be.revertedWithCustomError(Registry, "WrongZone")
        .withArgs(admin.address, 0x01, ZONE_CYPRUS1);
    });
  });

  describe("grantRole", function () {
    it("lets an admin grant an operational role", async function () {
      const { registry, admin, manager } = await loadFixture(deployRegistry);
      await expect(registry.connect(admin).grantRole(ROLES.VENDOR_MANAGER, manager.address))
        .to.emit(registry, "RoleGranted")
        .withArgs(ROLES.VENDOR_MANAGER, manager.address, admin.address);
      expect(await registry.hasRole(ROLES.VENDOR_MANAGER, manager.address)).to.equal(true);
    });

    it("refuses to grant ADMIN_ROLE", async function () {
      // Admin power must travel through propose/accept so the recipient proves
      // the key is live. A direct grant would let a typo mint an admin at an
      // address nobody can sign for.
      const { registry, admin, nominee } = await loadFixture(deployRegistry);
      await expect(registry.connect(admin).grantRole(ROLES.ADMIN, nominee.address))
        .to.be.revertedWithCustomError(registry, "Unauthorized")
        .withArgs(ROLES.ADMIN, admin.address);
      expect(await registry.hasRole(ROLES.ADMIN, nominee.address)).to.equal(false);
    });

    it("rejects a non-admin caller", async function () {
      const { registry, manager, admin } = await loadFixture(deployRegistry);
      await registry.connect(admin).grantRole(ROLES.VENDOR_MANAGER, manager.address);
      // A vendor manager is not an admin, whatever else it can do.
      await expect(registry.connect(manager).grantRole(ROLES.PAUSER, manager.address))
        .to.be.revertedWithCustomError(registry, "Unauthorized")
        .withArgs(ROLES.ADMIN, manager.address);
    });

    it("rejects a Qi-ledger grantee", async function () {
      const { registry, admin } = await loadFixture(deployRegistry);
      const qi = mkAddress({ ledger: "qi", tag: 2 });
      await expect(registry.connect(admin).grantRole(ROLES.VENDOR_MANAGER, qi))
        .to.be.revertedWithCustomError(registry, "NotQuaiLedger")
        .withArgs(qi);
    });

    it("rejects an out-of-zone grantee", async function () {
      const { registry, admin } = await loadFixture(deployRegistry);
      const wrongZone = mkAddress({ zone: 0x10, tag: 2 });
      await expect(registry.connect(admin).grantRole(ROLES.VENDOR_MANAGER, wrongZone))
        .to.be.revertedWithCustomError(registry, "WrongZone")
        .withArgs(wrongZone, ZONE_CYPRUS1, 0x10);
    });

    it("rejects the zero address", async function () {
      const { registry, admin } = await loadFixture(deployRegistry);
      await expect(
        registry.connect(admin).grantRole(ROLES.VENDOR_MANAGER, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("rejects a duplicate grant", async function () {
      const { registry, admin, manager } = await loadFixture(deployRegistry);
      await registry.connect(admin).grantRole(ROLES.VENDOR_MANAGER, manager.address);
      await expect(registry.connect(admin).grantRole(ROLES.VENDOR_MANAGER, manager.address))
        .to.be.revertedWithCustomError(registry, "AlreadyHasRole")
        .withArgs(ROLES.VENDOR_MANAGER, manager.address);
    });

    it("grants an arbitrary unused role hash without side effects", async function () {
      const { registry, admin, spare } = await loadFixture(deployRegistry);
      const unknown = ethers.id("QiCash.NOT_A_REAL_ROLE");
      await registry.connect(admin).grantRole(unknown, spare.address);
      expect(await registry.hasRole(unknown, spare.address)).to.equal(true);
      // It confers nothing the contract actually checks.
      expect(await registry.hasRole(ROLES.VENDOR_MANAGER, spare.address)).to.equal(false);
      expect(await registry.adminCount()).to.equal(1n);
    });

    it("keeps roles independent per account", async function () {
      const { registry, admin, manager, pauser } = await loadFixture(deployRegistry);
      await registry.connect(admin).grantRole(ROLES.VENDOR_MANAGER, manager.address);
      await registry.connect(admin).grantRole(ROLES.PAUSER, pauser.address);
      expect(await registry.hasRole(ROLES.PAUSER, manager.address)).to.equal(false);
      expect(await registry.hasRole(ROLES.VENDOR_MANAGER, pauser.address)).to.equal(false);
    });
  });

  describe("revokeRole", function () {
    it("lets an admin revoke an operational role", async function () {
      const { registry, admin, manager } = await loadFixture(deployRegistry);
      await registry.connect(admin).grantRole(ROLES.VENDOR_MANAGER, manager.address);
      await expect(registry.connect(admin).revokeRole(ROLES.VENDOR_MANAGER, manager.address))
        .to.emit(registry, "RoleRevoked")
        .withArgs(ROLES.VENDOR_MANAGER, manager.address, admin.address);
      expect(await registry.hasRole(ROLES.VENDOR_MANAGER, manager.address)).to.equal(false);
    });

    it("rejects revoking a role the account does not hold", async function () {
      const { registry, admin, manager } = await loadFixture(deployRegistry);
      await expect(registry.connect(admin).revokeRole(ROLES.VENDOR_MANAGER, manager.address))
        .to.be.revertedWithCustomError(registry, "DoesNotHaveRole")
        .withArgs(ROLES.VENDOR_MANAGER, manager.address);
    });

    it("rejects a non-admin caller", async function () {
      const { registry, admin, manager, pauser } = await loadFixture(deployRegistry);
      await registry.connect(admin).grantRole(ROLES.PAUSER, pauser.address);
      await expect(registry.connect(manager).revokeRole(ROLES.PAUSER, pauser.address))
        .to.be.revertedWithCustomError(registry, "Unauthorized")
        .withArgs(ROLES.ADMIN, manager.address);
    });

    it("refuses to remove the last admin", async function () {
      // Zero admins would permanently freeze vendor onboarding and dispute
      // resolution with no recovery path — the contract would be bricked.
      const { registry, admin } = await loadFixture(deployRegistry);
      await expect(
        registry.connect(admin).revokeRole(ROLES.ADMIN, admin.address)
      ).to.be.revertedWithCustomError(registry, "LastAdminCannotBeRemoved");
      expect(await registry.hasRole(ROLES.ADMIN, admin.address)).to.equal(true);
      expect(await registry.adminCount()).to.equal(1n);
    });

    it("allows removing an admin once a second one exists", async function () {
      const { registry, admin, nominee } = await loadFixture(deployRegistry);
      await registry.connect(admin).proposeAdmin(nominee.address);
      await registry.connect(nominee).acceptAdmin();
      expect(await registry.adminCount()).to.equal(2n);

      await registry.connect(nominee).revokeRole(ROLES.ADMIN, admin.address);
      expect(await registry.hasRole(ROLES.ADMIN, admin.address)).to.equal(false);
      expect(await registry.adminCount()).to.equal(1n);

      // And the floor holds again at one.
      await expect(
        registry.connect(nominee).revokeRole(ROLES.ADMIN, nominee.address)
      ).to.be.revertedWithCustomError(registry, "LastAdminCannotBeRemoved");
    });

    it("does not let a revoked admin keep acting", async function () {
      const { registry, admin, nominee, manager } = await loadFixture(deployRegistry);
      await registry.connect(admin).proposeAdmin(nominee.address);
      await registry.connect(nominee).acceptAdmin();
      await registry.connect(nominee).revokeRole(ROLES.ADMIN, admin.address);

      await expect(registry.connect(admin).grantRole(ROLES.VENDOR_MANAGER, manager.address))
        .to.be.revertedWithCustomError(registry, "Unauthorized")
        .withArgs(ROLES.ADMIN, admin.address);
    });
  });

  describe("renounceRole", function () {
    it("drops the caller's own role", async function () {
      const { registry, admin, manager } = await loadFixture(deployRegistry);
      await registry.connect(admin).grantRole(ROLES.VENDOR_MANAGER, manager.address);
      await expect(registry.connect(manager).renounceRole(ROLES.VENDOR_MANAGER))
        .to.emit(registry, "RoleRevoked")
        .withArgs(ROLES.VENDOR_MANAGER, manager.address, manager.address);
      expect(await registry.hasRole(ROLES.VENDOR_MANAGER, manager.address)).to.equal(false);
    });

    it("rejects renouncing a role not held", async function () {
      const { registry, spare } = await loadFixture(deployRegistry);
      await expect(registry.connect(spare).renounceRole(ROLES.VENDOR_MANAGER))
        .to.be.revertedWithCustomError(registry, "DoesNotHaveRole")
        .withArgs(ROLES.VENDOR_MANAGER, spare.address);
    });

    it("works while the contract is paused", async function () {
      // A holder who believes their key is compromised must be able to shed
      // privileges immediately, and an incident is exactly when the contract is
      // most likely to be paused.
      const { registry, admin, manager, pauser } = await loadFixture(deployRegistry);
      await registry.connect(admin).grantRole(ROLES.VENDOR_MANAGER, manager.address);
      await registry.connect(admin).grantRole(ROLES.PAUSER, pauser.address);
      await registry.connect(pauser).pause();

      await expect(registry.connect(manager).renounceRole(ROLES.VENDOR_MANAGER)).to.not.be.reverted;
      expect(await registry.hasRole(ROLES.VENDOR_MANAGER, manager.address)).to.equal(false);
    });

    it("stops the last admin from renouncing", async function () {
      const { registry, admin } = await loadFixture(deployRegistry);
      await expect(
        registry.connect(admin).renounceRole(ROLES.ADMIN)
      ).to.be.revertedWithCustomError(registry, "LastAdminCannotBeRemoved");
    });

    it("lets a non-final admin renounce", async function () {
      const { registry, admin, nominee } = await loadFixture(deployRegistry);
      await registry.connect(admin).proposeAdmin(nominee.address);
      await registry.connect(nominee).acceptAdmin();
      await expect(registry.connect(admin).renounceRole(ROLES.ADMIN)).to.not.be.reverted;
      expect(await registry.adminCount()).to.equal(1n);
    });
  });

  describe("two-step admin handover", function () {
    it("nominates a pending admin without granting anything yet", async function () {
      const { registry, admin, nominee } = await loadFixture(deployRegistry);
      await expect(registry.connect(admin).proposeAdmin(nominee.address))
        .to.emit(registry, "AdminProposed")
        .withArgs(nominee.address, admin.address);
      expect(await registry.pendingAdmin()).to.equal(nominee.address);
      // Crucially, no power has moved yet.
      expect(await registry.hasRole(ROLES.ADMIN, nominee.address)).to.equal(false);
      expect(await registry.adminCount()).to.equal(1n);
    });

    it("transfers on acceptance by the nominee", async function () {
      const { registry, admin, nominee } = await loadFixture(deployRegistry);
      await registry.connect(admin).proposeAdmin(nominee.address);
      await expect(registry.connect(nominee).acceptAdmin())
        .to.emit(registry, "RoleGranted")
        .withArgs(ROLES.ADMIN, nominee.address, nominee.address);
      expect(await registry.hasRole(ROLES.ADMIN, nominee.address)).to.equal(true);
      expect(await registry.adminCount()).to.equal(2n);
      expect(await registry.pendingAdmin()).to.equal(ethers.ZeroAddress);
    });

    it("rejects acceptance from anyone but the nominee", async function () {
      const { registry, admin, nominee, spare } = await loadFixture(deployRegistry);
      await registry.connect(admin).proposeAdmin(nominee.address);
      await expect(registry.connect(spare).acceptAdmin())
        .to.be.revertedWithCustomError(registry, "NotPendingAdmin")
        .withArgs(spare.address);
      // Even the proposing admin cannot accept on the nominee's behalf, which is
      // the whole point: the nominee's key must prove it is live.
      await expect(registry.connect(admin).acceptAdmin())
        .to.be.revertedWithCustomError(registry, "NotPendingAdmin")
        .withArgs(admin.address);
    });

    it("rejects acceptance when nothing is pending", async function () {
      const { registry, spare } = await loadFixture(deployRegistry);
      await expect(registry.connect(spare).acceptAdmin())
        .to.be.revertedWithCustomError(registry, "NotPendingAdmin")
        .withArgs(spare.address);
    });

    it("cannot be replayed after acceptance", async function () {
      const { registry, admin, nominee } = await loadFixture(deployRegistry);
      await registry.connect(admin).proposeAdmin(nominee.address);
      await registry.connect(nominee).acceptAdmin();
      await expect(registry.connect(nominee).acceptAdmin())
        .to.be.revertedWithCustomError(registry, "NotPendingAdmin")
        .withArgs(nominee.address);
      expect(await registry.adminCount()).to.equal(2n);
    });

    it("lets a later proposal supersede an earlier one", async function () {
      const { registry, admin, nominee, spare } = await loadFixture(deployRegistry);
      await registry.connect(admin).proposeAdmin(nominee.address);
      await registry.connect(admin).proposeAdmin(spare.address);
      expect(await registry.pendingAdmin()).to.equal(spare.address);

      await expect(registry.connect(nominee).acceptAdmin())
        .to.be.revertedWithCustomError(registry, "NotPendingAdmin")
        .withArgs(nominee.address);
      await expect(registry.connect(spare).acceptAdmin()).to.not.be.reverted;
    });

    it("cancels an outstanding nomination", async function () {
      const { registry, admin, nominee } = await loadFixture(deployRegistry);
      await registry.connect(admin).proposeAdmin(nominee.address);
      await expect(registry.connect(admin).cancelAdminProposal())
        .to.emit(registry, "AdminProposalCancelled")
        .withArgs(nominee.address, admin.address);
      expect(await registry.pendingAdmin()).to.equal(ethers.ZeroAddress);
      await expect(registry.connect(nominee).acceptAdmin())
        .to.be.revertedWithCustomError(registry, "NotPendingAdmin")
        .withArgs(nominee.address);
    });

    it("rejects cancelling when nothing is pending", async function () {
      const { registry, admin } = await loadFixture(deployRegistry);
      await expect(
        registry.connect(admin).cancelAdminProposal()
      ).to.be.revertedWithCustomError(registry, "NoPendingAdmin");
    });

    it("restricts proposing and cancelling to admins", async function () {
      const { registry, admin, nominee, spare } = await loadFixture(deployRegistry);
      await expect(registry.connect(spare).proposeAdmin(spare.address))
        .to.be.revertedWithCustomError(registry, "Unauthorized")
        .withArgs(ROLES.ADMIN, spare.address);

      await registry.connect(admin).proposeAdmin(nominee.address);
      await expect(registry.connect(spare).cancelAdminProposal())
        .to.be.revertedWithCustomError(registry, "Unauthorized")
        .withArgs(ROLES.ADMIN, spare.address);
    });

    it("rejects nominating an existing admin", async function () {
      const { registry, admin } = await loadFixture(deployRegistry);
      await expect(registry.connect(admin).proposeAdmin(admin.address))
        .to.be.revertedWithCustomError(registry, "AlreadyHasRole")
        .withArgs(ROLES.ADMIN, admin.address);
    });

    it("validates the nominee's address", async function () {
      const { registry, admin } = await loadFixture(deployRegistry);
      const qi = mkAddress({ ledger: "qi", tag: 3 });
      await expect(registry.connect(admin).proposeAdmin(qi))
        .to.be.revertedWithCustomError(registry, "NotQuaiLedger")
        .withArgs(qi);
      await expect(
        registry.connect(admin).proposeAdmin(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("survives a full rotation to a new admin", async function () {
      const { registry, admin, nominee, manager } = await loadFixture(deployRegistry);
      await registry.connect(admin).proposeAdmin(nominee.address);
      await registry.connect(nominee).acceptAdmin();
      await registry.connect(admin).renounceRole(ROLES.ADMIN);

      expect(await registry.adminCount()).to.equal(1n);
      await expect(registry.connect(nominee).grantRole(ROLES.VENDOR_MANAGER, manager.address)).to
        .not.be.reverted;
    });
  });

  describe("circuit breaker", function () {
    async function pausable() {
      const ctx = await deployRegistry();
      await ctx.registry.connect(ctx.admin).grantRole(ROLES.PAUSER, ctx.pauser.address);
      await ctx.registry.connect(ctx.admin).grantRole(ROLES.VENDOR_MANAGER, ctx.manager.address);
      return ctx;
    }

    it("pauses and unpauses", async function () {
      const { registry, pauser } = await loadFixture(pausable);
      await expect(registry.connect(pauser).pause())
        .to.emit(registry, "Paused")
        .withArgs(pauser.address);
      expect(await registry.paused()).to.equal(true);

      await expect(registry.connect(pauser).unpause())
        .to.emit(registry, "Unpaused")
        .withArgs(pauser.address);
      expect(await registry.paused()).to.equal(false);
    });

    it("restricts pausing to PAUSER_ROLE, admin included", async function () {
      // An admin holding no pauser role cannot pause. That is the
      // non-hierarchy rule applied to the emergency path.
      const { registry, admin, spare } = await loadFixture(pausable);
      await expect(registry.connect(admin).pause())
        .to.be.revertedWithCustomError(registry, "Unauthorized")
        .withArgs(ROLES.PAUSER, admin.address);
      await expect(registry.connect(spare).pause())
        .to.be.revertedWithCustomError(registry, "Unauthorized")
        .withArgs(ROLES.PAUSER, spare.address);
    });

    it("restricts unpausing to PAUSER_ROLE", async function () {
      const { registry, admin, pauser } = await loadFixture(pausable);
      await registry.connect(pauser).pause();
      await expect(registry.connect(admin).unpause())
        .to.be.revertedWithCustomError(registry, "Unauthorized")
        .withArgs(ROLES.PAUSER, admin.address);
    });

    it("rejects pausing twice and unpausing when live", async function () {
      const { registry, pauser } = await loadFixture(pausable);
      await expect(registry.connect(pauser).unpause()).to.be.revertedWithCustomError(
        registry,
        "ContractNotPaused"
      );
      await registry.connect(pauser).pause();
      await expect(registry.connect(pauser).pause()).to.be.revertedWithCustomError(
        registry,
        "ContractPaused"
      );
    });

    it("blocks vendor registration while paused and allows it again after", async function () {
      const { registry, manager, pauser, spare } = await loadFixture(pausable);
      const vendorId = vendorIdOf("campus:unilag", "vendor:paused-test");
      await registry.connect(pauser).pause();

      await expect(
        registry.connect(manager).registerVendor(vendorId, spare.address, ethers.id("p"))
      ).to.be.revertedWithCustomError(registry, "ContractPaused");

      await registry.connect(pauser).unpause();
      await expect(registry.connect(manager).registerVendor(vendorId, spare.address, ethers.id("p")))
        .to.not.be.reverted;
    });

    it("leaves role administration usable while paused", async function () {
      // The pause exists to stop new business, not to disable incident response.
      const { registry, admin, pauser, spare } = await loadFixture(pausable);
      await registry.connect(pauser).pause();
      await expect(registry.connect(admin).grantRole(ROLES.ARBITER, spare.address)).to.not.be
        .reverted;
      await expect(registry.connect(admin).revokeRole(ROLES.ARBITER, spare.address)).to.not.be
        .reverted;
      await expect(registry.connect(admin).proposeAdmin(spare.address)).to.not.be.reverted;
      await expect(registry.connect(spare).acceptAdmin()).to.not.be.reverted;
    });
  });

  describe("independence between the registry and the hub", function () {
    it("keeps roles scoped to the contract that granted them", async function () {
      // The two contracts each carry their own role table. A vendor manager on
      // the registry is not an arbiter on the hub, so compromising one does not
      // hand over the other.
      const ctx = await loadFixture(deployQiCash);
      expect(await ctx.registry.hasRole(ROLES.VENDOR_MANAGER, ctx.vendorManager.address)).to.equal(
        true
      );
      expect(await ctx.hub.hasRole(ROLES.VENDOR_MANAGER, ctx.vendorManager.address)).to.equal(false);

      expect(await ctx.hub.hasRole(ROLES.ARBITER, ctx.arbiter.address)).to.equal(true);
      expect(await ctx.registry.hasRole(ROLES.ARBITER, ctx.arbiter.address)).to.equal(false);
    });

    it("pauses independently", async function () {
      const ctx = await loadFixture(deployQiCash);
      await ctx.registry.connect(ctx.pauser).pause();
      expect(await ctx.registry.paused()).to.equal(true);
      expect(await ctx.hub.paused()).to.equal(false);
    });

    it("keeps admin handover separate per contract", async function () {
      const ctx = await loadFixture(deployQiCash);
      await ctx.registry.connect(ctx.admin).proposeAdmin(ctx.spare.address);
      expect(await ctx.registry.pendingAdmin()).to.equal(ctx.spare.address);
      expect(await ctx.hub.pendingAdmin()).to.equal(ethers.ZeroAddress);

      // Accepting on the registry grants nothing on the hub.
      await ctx.registry.connect(ctx.spare).acceptAdmin();
      expect(await ctx.hub.hasRole(ROLES.ADMIN, ctx.spare.address)).to.equal(false);
    });
  });

  describe("role hash constants", function () {
    it("matches the documented namespaced strings", async function () {
      const { registry } = await loadFixture(deployRegistry);
      expect(await registry.ADMIN_ROLE()).to.equal(ROLES.ADMIN);
      expect(await registry.VENDOR_MANAGER_ROLE()).to.equal(ROLES.VENDOR_MANAGER);
      expect(await registry.ARBITER_ROLE()).to.equal(ROLES.ARBITER);
      expect(await registry.PAUSER_ROLE()).to.equal(ROLES.PAUSER);
    });

    it("keeps all four role hashes distinct", async function () {
      const values = Object.values(ROLES);
      expect(new Set(values).size).to.equal(values.length);
    });
  });
});
