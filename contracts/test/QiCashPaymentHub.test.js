/**
 * QiCashPaymentHub — the verification and accountability layer.
 *
 * These are the properties a student's phone depends on, in order of risk:
 *
 *   - the QR the student scans must resolve to a real, open, unexpired
 *     invoice raised by a vendor that is still Active — everything else must
 *     come back as a precise refusal BEFORE any payment is made;
 *   - nobody may touch an invoice except the vendor that raised it, and the
 *     status machine must be exactly as the docs claim;
 *   - a vendor who takes a payment and then cancels the invoice must NOT be
 *     able to escape a dispute (the money-or-receipt hole);
 *   - a dispute must never be able to lock an invoice forever, so an arbiter
 *     that stops responding can be timed out;
 *   - the privacy surface: amount and payout address appear in no event and
 *     no storage slot, only inside the commitment hash.
 */

const { expect } = require("chai");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");

const {
  ROLES,
  InvoiceStatus,
  VerificationResult,
  DEFAULT_MAX_TTL,
  DEFAULT_DISPUTE_WINDOW,
  DEFAULT_ARBITRATION_DEADLINE,
  qiPayout,
  quaiAddr,
  saltOf,
  commitmentJs,
  sealedRefJs,
  invoiceKeyJs,
  deployWithVendor,
  buildRequest,
} = require("./helpers/quai");

const DAY = 24 * 60 * 60;

describe("QiCashPaymentHub", function () {
  describe("createInvoice", function () {
    it("publishes an invoice commitment and emits it, hiding the preimage", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);

      const tx = await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      const receipt = await tx.wait();
      const ev = receipt.logs
        .map((l) => {
          try {
            return ctx.hub.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((p) => p && p.name === "InvoiceCreated");
      expect(ev.args.vendorId).to.equal(ctx.vendorA);
      expect(ev.args.commitment).to.equal(commitment);
      expect(ev.args.expiresAt).to.equal(req.expiresAt);

      const invoice = await ctx.hub.getInvoice(ctx.vendorA, commitment);
      expect(invoice.status).to.equal(InvoiceStatus.Open);
      expect(invoice.expiresAt).to.equal(req.expiresAt);
      expect(invoice.complainant).to.equal(ethers.ZeroAddress);
    });

    it("stores only the hash — no amount or payout address ever reaches storage", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx, {
        qiPayoutAddress: qiPayout(0xdead),
        amount: 1337n,
        denomination: 9,
      });

      const tx = await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      const receipt = await tx.wait();
      for (const log of receipt.logs) {
        const parsed = ctx.hub.interface.parseLog(log);
        if (!parsed) continue;
        const args = parsed.args.map((a) =>
          typeof a === "bigint" ? a.toString() : a
        );
        const blob = JSON.stringify(args);
        // The preimage must appear nowhere: not the raw payout address, not
        // the amount (1337), not the denomination (9).
        expect(blob).not.to.contain(qiPayout(0xdead).toLowerCase());
        expect(blob).not.to.contain("1337");
        expect(blob).not.to.contain(`"9"`);
      }

      const invoice = await ctx.hub.getInvoice(ctx.vendorA, commitment);
      // The stored record is exactly status + timestamps + sealed ref.
      expect(invoice.status).to.equal(InvoiceStatus.Open);
      expect(invoice.sealedPaymentRef).to.equal(ethers.ZeroHash);
      expect(invoice.complainant).to.equal(ethers.ZeroAddress);
      expect(invoice.expiresAt).to.equal(req.expiresAt);
    });

    it("refuses a zero commitment", async function () {
      const ctx = await loadFixture(deployWithVendor);
      await expect(
        ctx.hub.connect(ctx.attestorA).createInvoice(ethers.ZeroHash, 0)
      ).to.be.revertedWithCustomError(ctx.hub, "ZeroCommitment");
    });

    it("refuses an expiry in the past", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx, { expiresAt: 1n });
      await expect(
        ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt)
      ).to.be.revertedWithCustomError(ctx.hub, "ExpiryInPast");
    });

    it("refuses an expiry beyond the max TTL", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx, {
        expiresAt: BigInt(await time.latest()) + BigInt(DEFAULT_MAX_TTL + 60),
      });
      await expect(
        ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt)
      ).to.be.revertedWithCustomError(ctx.hub, "ExpiryTooFar");
    });

    it("refuses a duplicate commitment", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await expect(
        ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt)
      ).to.be.revertedWithCustomError(ctx.hub, "InvoiceAlreadyExists");
    });

    it("namespaces keys by vendor — the same commitment is fine under a second vendor", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      // Vendor B can use the identical commitment: keys are keccak(vendorId, commitment).
      const tx = await ctx.hub.connect(ctx.attestorB).createInvoice(commitment, req.expiresAt);
      await expect(tx).to.emit(ctx.hub, "InvoiceCreated").withArgs(
        ctx.vendorB,
        commitment,
        invoiceKeyJs(ctx.vendorB, commitment),
        req.expiresAt,
        await time.latest()
      );
    });

    it("only an Active vendor's attestor may raise an invoice", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);

      await expect(
        ctx.hub.connect(ctx.spare).createInvoice(commitment, req.expiresAt)
      ).to.be.revertedWithCustomError(ctx.registry, "VendorNotRegistered");

      await ctx.registry.connect(ctx.vendorManager).suspendVendor(ctx.vendorA);
      await expect(
        ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt)
      ).to.be.revertedWithCustomError(ctx.registry, "VendorNotActive");
    });

    it("is blocked while paused", async function () {
      const ctx = await loadFixture(deployWithVendor);
      await ctx.hub.connect(ctx.pauser).pause();
      const { req, commitment } = await buildRequest(ctx);
      await expect(
        ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt)
      ).to.be.revertedWithCustomError(ctx.hub, "ContractPaused");
    });
  });

  describe("verifyPaymentRequest", function () {
    it("returns Payable for a live invoice", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      const [result, returnedCommitment, key] = await ctx.hub.verifyPaymentRequest(req);
      expect(result).to.equal(VerificationResult.Payable);
      expect(returnedCommitment).to.equal(commitment);
      expect(key).to.equal(invoiceKeyJs(ctx.vendorA, commitment));
    });

    it("refuses a forged QR with no invoice behind it", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req } = await buildRequest(ctx); // never published on-chain
      const [result] = await ctx.hub.verifyPaymentRequest(req);
      expect(result).to.equal(VerificationResult.InvoiceNotFound);
    });

    it("refuses a QR whose preimage differs from the published commitment", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      // Same amount, different payout address -> different hash -> not found.
      const tampered = { ...req, qiPayoutAddress: qiPayout(0xbad) };
      const [result] = await ctx.hub.verifyPaymentRequest(tampered);
      expect(result).to.equal(VerificationResult.InvoiceNotFound);
    });

    it("refuses a zero or wrong-ledger payout address before anything else", async function () {
      const ctx = await loadFixture(deployWithVendor);

      for (const payout of [ethers.ZeroAddress, quaiAddr(2)]) {
        const { req, commitment } = await buildRequest(ctx, { qiPayoutAddress: payout });
        await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
        const [result] = await ctx.hub.verifyPaymentRequest(req);
        expect(result).to.equal(VerificationResult.InvalidQiPayoutAddress);
      }
    });

    it("refuses a denomination index beyond QI's 16 denominations", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx, { denomination: 16 });
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      const [result] = await ctx.hub.verifyPaymentRequest(req);
      expect(result).to.equal(VerificationResult.InvalidDenomination);
    });

    it("refuses an invoice that has left Open", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await ctx.hub.connect(ctx.attestorA).attestSettlement(commitment, sealedRefJs(commitment, saltOf("tx"), req.salt));

      const [result] = await ctx.hub.verifyPaymentRequest(req);
      expect(result).to.equal(VerificationResult.InvoiceNotOpen);
    });

    it("refuses an expired invoice", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx, { expiresAt: BigInt(await time.latest()) + 60n });
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      await time.increase(61);
      const [result] = await ctx.hub.verifyPaymentRequest(req);
      expect(result).to.equal(VerificationResult.InvoiceExpired);
    });

    it("refuses a QR whose expiry disagrees with the stored invoice expiry", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      // Vendor publishes with a different stored expiry than the one committed.
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt - 1n);

      const [result] = await ctx.hub.verifyPaymentRequest(req);
      expect(result).to.equal(VerificationResult.ExpiryMismatch);
    });

    it("refuses payment to a vendor revoked after the invoice was created", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      await ctx.registry.connect(ctx.vendorManager).revokeVendor(ctx.vendorA);
      const [result] = await ctx.hub.verifyPaymentRequest(req);
      expect(result).to.equal(VerificationResult.VendorNotActive);
    });

    it("refuses payment to a suspended vendor", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      await ctx.registry.connect(ctx.vendorManager).suspendVendor(ctx.vendorA);
      const [result] = await ctx.hub.verifyPaymentRequest(req);
      expect(result).to.equal(VerificationResult.VendorNotActive);
    });
  });

  describe("cancelInvoice", function () {
    it("lets the vendor void an unpaid invoice", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      const tx = await ctx.hub.connect(ctx.attestorA).cancelInvoice(commitment);
      await expect(tx).to.emit(ctx.hub, "InvoiceCancelled").withArgs(ctx.vendorA, invoiceKeyJs(ctx.vendorA, commitment));

      const invoice = await ctx.hub.getInvoice(ctx.vendorA, commitment);
      expect(invoice.status).to.equal(InvoiceStatus.Cancelled);

      const [result] = await ctx.hub.verifyPaymentRequest(req);
      expect(result).to.equal(VerificationResult.InvoiceNotOpen);
    });

    it("only the vendor that raised the invoice may cancel it", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      // A different registered vendor resolves to its OWN storage namespace,
      // finds no invoice under it, and is refused.
      await expect(
        ctx.hub.connect(ctx.attestorB).cancelInvoice(commitment)
      ).to.be.revertedWithCustomError(ctx.hub, "InvoiceNotOpenError");
      // An unregistered address is refused outright.
      await expect(
        ctx.hub.connect(ctx.spare).cancelInvoice(commitment)
      ).to.be.revertedWithCustomError(ctx.hub, "VendorNotRecognised");
    });

    it("cannot cancel an invoice that is not Open", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await ctx.hub.connect(ctx.attestorA).attestSettlement(commitment, sealedRefJs(commitment, saltOf("tx"), req.salt));

      await expect(
        ctx.hub.connect(ctx.attestorA).cancelInvoice(commitment)
      ).to.be.revertedWithCustomError(ctx.hub, "InvoiceNotOpenError");
    });
  });

  describe("attestSettlement", function () {
    it("records a sealed reference and moves the invoice to Settled", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      const sealed = sealedRefJs(commitment, saltOf("qitx:abc"), req.salt);
      const tx = await ctx.hub.connect(ctx.attestorA).attestSettlement(commitment, sealed);
      await expect(tx).to.emit(ctx.hub, "SettlementAttested").withArgs(ctx.vendorA, invoiceKeyJs(ctx.vendorA, commitment), sealed);

      const invoice = await ctx.hub.getInvoice(ctx.vendorA, commitment);
      expect(invoice.status).to.equal(InvoiceStatus.Settled);
      expect(invoice.sealedPaymentRef).to.equal(sealed);
    });

    it("still works after expiry — a student who paid at 11:59 gets a receipt at 12:01", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx, { expiresAt: BigInt(await time.latest()) + 60n });
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      await time.increase(61);
      await ctx.hub.connect(ctx.attestorA).attestSettlement(commitment, sealedRefJs(commitment, saltOf("qitx:late"), req.salt));

      const invoice = await ctx.hub.getInvoice(ctx.vendorA, commitment);
      expect(invoice.status).to.equal(InvoiceStatus.Settled);
    });

    it("a suspended vendor may still attest — receipts must never be stripped", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      await ctx.registry.connect(ctx.vendorManager).suspendVendor(ctx.vendorA);
      await ctx.hub.connect(ctx.attestorA).attestSettlement(commitment, sealedRefJs(commitment, saltOf("qitx:s"), req.salt));
      expect((await ctx.hub.getInvoice(ctx.vendorA, commitment)).status).to.equal(InvoiceStatus.Settled);
    });

    it("a revoked vendor cannot attest — its attestor binding is gone", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      await ctx.registry.connect(ctx.vendorManager).revokeVendor(ctx.vendorA);
      // revokeVendor deletes the attestor binding, so the address resolves to
      // no vendor at all.
      await expect(
        ctx.hub.connect(ctx.attestorA).attestSettlement(commitment, sealedRefJs(commitment, saltOf("qitx:r"), req.salt))
      ).to.be.revertedWithCustomError(ctx.hub, "VendorNotRecognised");
    });

    it("works while the hub is paused", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await ctx.hub.connect(ctx.pauser).pause();

      await ctx.hub.connect(ctx.attestorA).attestSettlement(commitment, sealedRefJs(commitment, saltOf("qitx:p"), req.salt));
      expect((await ctx.hub.getInvoice(ctx.vendorA, commitment)).status).to.equal(InvoiceStatus.Settled);
    });

    it("verifyPaymentRef only matches the sealed reference that was committed", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      const realTx = saltOf("qitx:real");
      await ctx.hub.connect(ctx.attestorA).attestSettlement(commitment, sealedRefJs(commitment, realTx, req.salt));

      expect(await ctx.hub.verifyPaymentRef(ctx.vendorA, commitment, realTx, req.salt)).to.equal(true);
      expect(await ctx.hub.verifyPaymentRef(ctx.vendorA, commitment, saltOf("qitx:forged"), req.salt)).to.equal(false);
      expect(await ctx.hub.verifyPaymentRef(ctx.vendorA, commitment, realTx, saltOf("wrong-salt"))).to.equal(false);
    });
  });

  describe("openDispute", function () {
    it("requires a non-zero reason hash", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await expect(ctx.hub.openDispute(req, ethers.ZeroHash)).to.be.revertedWithCustomError(
        ctx.hub,
        "ZeroReasonHash"
      );
    });

    it("authorizes by preimage knowledge — a wrong salt finds no invoice", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      const wrongSalt = { ...req, salt: saltOf("attacker-salt") };
      await expect(ctx.hub.openDispute(wrongSalt, saltOf("reason:uhoh"))).to.be.revertedWithCustomError(
        ctx.hub,
        "InvoiceMissing"
      );
    });

    it("accepts a student with the preimage against an Open invoice", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      const tx = await ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:no-receipt"));
      await expect(tx).to.emit(ctx.hub, "DisputeOpened").withArgs(
        ctx.vendorA,
        invoiceKeyJs(ctx.vendorA, commitment),
        ctx.student.address,
        saltOf("reason:no-receipt")
      );

      const invoice = await ctx.hub.getInvoice(ctx.vendorA, commitment);
      expect(invoice.status).to.equal(InvoiceStatus.Disputed);
      expect(invoice.complainant).to.equal(ctx.student.address);
    });

    it("THE FIX: a vendor who cancels after being paid cannot escape a dispute", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      // Vendor takes the payment off-chain, then voids the invoice.
      await ctx.hub.connect(ctx.attestorA).cancelInvoice(commitment);
      expect((await ctx.hub.getInvoice(ctx.vendorA, commitment)).status).to.equal(InvoiceStatus.Cancelled);

      // The student's recourse survives the cancellation.
      await ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:paid-and-cancelled"));
      expect((await ctx.hub.getInvoice(ctx.vendorA, commitment)).status).to.equal(InvoiceStatus.Disputed);
    });

    it("accepts a dispute against a Settled invoice within the window", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await ctx.hub.connect(ctx.attestorA).attestSettlement(commitment, sealedRefJs(commitment, saltOf("qitx:1"), req.salt));

      await time.increase(DEFAULT_DISPUTE_WINDOW - 60);
      await ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:no-refund"));
      expect((await ctx.hub.getInvoice(ctx.vendorA, commitment)).status).to.equal(InvoiceStatus.Disputed);
    });

    it("closes the window `disputeWindow` after the settlement", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await ctx.hub.connect(ctx.attestorA).attestSettlement(commitment, sealedRefJs(commitment, saltOf("qitx:1"), req.salt));

      await time.increase(DEFAULT_DISPUTE_WINDOW + 61);
      await expect(ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:too-late"))).to.be.revertedWithCustomError(
        ctx.hub,
        "DisputeWindowClosed"
      );
    });

    it("anchors the window at expiry for an unpaid Open invoice", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx, { expiresAt: BigInt(await time.latest()) + 600n });
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      await time.increase(601); // invoice expired, still Open in storage
      await ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:late-payment"));
      expect((await ctx.hub.getInvoice(ctx.vendorA, commitment)).status).to.equal(InvoiceStatus.Disputed);
    });

    it("closes the window `disputeWindow` after the expiry of an unpaid invoice", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx, { expiresAt: BigInt(await time.latest()) + 600n });
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      await time.increase(601);
      await time.increase(DEFAULT_DISPUTE_WINDOW + 1);
      await expect(ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:too-late"))).to.be.revertedWithCustomError(
        ctx.hub,
        "DisputeWindowClosed"
      );
    });

    it("anchors the window at cancellation for a cancelled invoice", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await ctx.hub.connect(ctx.attestorA).cancelInvoice(commitment);

      await time.increase(DEFAULT_DISPUTE_WINDOW + 1);
      await expect(ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:too-late"))).to.be.revertedWithCustomError(
        ctx.hub,
        "DisputeWindowClosed"
      );
    });

    it("refuses invoices already terminal", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await ctx.hub.connect(ctx.attestorA).attestSettlement(commitment, sealedRefJs(commitment, saltOf("qitx:2"), req.salt));
      await ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:no-refund"));
      await ctx.hub.connect(ctx.arbiter).resolveDispute(ctx.vendorA, commitment, false, saltOf("resolution:no"));

      await expect(ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:again"))).to.be.revertedWithCustomError(
        ctx.hub,
        "InvoiceNotDisputable"
      );
    });

    it("works while the hub is paused", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await ctx.hub.connect(ctx.pauser).pause();

      await ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:paused"));
      expect((await ctx.hub.getInvoice(ctx.vendorA, commitment)).status).to.equal(InvoiceStatus.Disputed);
    });
  });

  describe("resolveDispute", function () {
    it("an upheld ruling marks the invoice Refunded and bumps disputesUpheld", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await ctx.hub.connect(ctx.attestorA).attestSettlement(commitment, sealedRefJs(commitment, saltOf("qitx:3"), req.salt));
      await ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:refund"));

      const tx = await ctx.hub.connect(ctx.arbiter).resolveDispute(ctx.vendorA, commitment, true, saltOf("resolution:upheld"));
      await expect(tx).to.emit(ctx.hub, "DisputeResolved").withArgs(
        ctx.vendorA,
        invoiceKeyJs(ctx.vendorA, commitment),
        ctx.arbiter.address,
        true,
        saltOf("resolution:upheld")
      );

      expect((await ctx.hub.getInvoice(ctx.vendorA, commitment)).status).to.equal(InvoiceStatus.Refunded);
      const stats = await ctx.hub.getVendorStats(ctx.vendorA);
      expect(stats.disputesUpheld).to.equal(1n);
    });

    it("a rejected ruling marks the invoice DisputeRejected", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:frivolous"));

      await ctx.hub.connect(ctx.arbiter).resolveDispute(ctx.vendorA, commitment, false, saltOf("resolution:no"));
      expect((await ctx.hub.getInvoice(ctx.vendorA, commitment)).status).to.equal(InvoiceStatus.DisputeRejected);
    });

    it("only an arbiter may resolve", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:x"));

      await expect(
        ctx.hub.connect(ctx.student).resolveDispute(ctx.vendorA, commitment, false, saltOf("nope"))
      ).to.be.revertedWithCustomError(ctx.hub, "Unauthorized");
    });

    it("the arbiter cannot rule on their own dispute", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);

      // Arbiter becomes the complainant...
      await ctx.hub.connect(ctx.arbiter).openDispute(req, saltOf("reason:arbiter"));
      // ...and cannot then rule on it.
      await expect(
        ctx.hub.connect(ctx.arbiter).resolveDispute(ctx.vendorA, commitment, true, saltOf("resolution:self"))
      ).to.be.revertedWithCustomError(ctx.hub, "ArbiterIsComplainant");
    });

    it("an arbiter cannot rule against their own vendor", async function () {
      const ctx = await loadFixture(deployWithVendor);
      // Give vendor A's attestor the ARBITER_ROLE — a conflict-of-interest setup.
      await ctx.hub.connect(ctx.admin).grantRole(ROLES.ARBITER, ctx.attestorA.address);

      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:conflict"));

      await expect(
        ctx.hub.connect(ctx.attestorA).resolveDispute(ctx.vendorA, commitment, false, saltOf("resolution:bias"))
      ).to.be.revertedWithCustomError(ctx.hub, "ArbiterRepresentsVendor");
    });
  });

  describe("expireDispute", function () {
    it("closes a dispute the arbiter ignored, after the arbitration deadline", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:ignored"));
      const openedAt = BigInt(await time.latest());
      const deadline = openedAt + BigInt(DEFAULT_ARBITRATION_DEADLINE);

      // A transaction mines one second past the increaseTo target, so -2 puts
      // the contract's view strictly before the deadline.
      await time.increaseTo(deadline - 2n);
      await expect(ctx.hub.connect(ctx.bystander).expireDispute(ctx.vendorA, commitment)).to.be.revertedWithCustomError(
        ctx.hub,
        "DisputeWindowClosed"
      );

      await time.increaseTo(deadline);
      const tx = await ctx.hub.connect(ctx.bystander).expireDispute(ctx.vendorA, commitment);
      await expect(tx).to.emit(ctx.hub, "DisputeExpired").withArgs(
        ctx.vendorA,
        invoiceKeyJs(ctx.vendorA, commitment),
        ctx.bystander.address
      );

      const invoice = await ctx.hub.getInvoice(ctx.vendorA, commitment);
      expect(invoice.status).to.equal(InvoiceStatus.ArbitrationExpired);
      // Neutral: the stats still show the dispute, but nothing was upheld.
      const stats = await ctx.hub.getVendorStats(ctx.vendorA);
      expect(stats.disputesOpened).to.equal(1n);
      expect(stats.disputesUpheld).to.equal(0n);
      // The openedAt recorded the dispute; expiry cannot have been before it.
      expect(invoice.statusChangedAt).to.be.gte(openedAt);
    });

    it("a timed-out dispute cannot be resolved or expired again", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:timed"));
      const openedAt = BigInt(await time.latest());

      await time.increaseTo(openedAt + BigInt(DEFAULT_ARBITRATION_DEADLINE));
      await ctx.hub.connect(ctx.bystander).expireDispute(ctx.vendorA, commitment);

      await expect(
        ctx.hub.connect(ctx.arbiter).resolveDispute(ctx.vendorA, commitment, false, saltOf("resolution:late"))
      ).to.be.revertedWithCustomError(ctx.hub, "InvoiceNotDisputed");
      await expect(
        ctx.hub.connect(ctx.bystander).expireDispute(ctx.vendorA, commitment)
      ).to.be.revertedWithCustomError(ctx.hub, "InvoiceNotDisputed");
    });
  });

  describe("governance", function () {
    it("bounds maxInvoiceTtl and emits updates", async function () {
      const ctx = await loadFixture(deployWithVendor);

      await expect(ctx.hub.connect(ctx.admin).setMaxInvoiceTtl(0)).to.be.revertedWithCustomError(
        ctx.hub,
        "TtlOutOfBounds"
      );
      await expect(ctx.hub.connect(ctx.admin).setMaxInvoiceTtl(2 * DAY + 1)).to.be.revertedWithCustomError(
        ctx.hub,
        "TtlOutOfBounds"
      );

      await expect(ctx.hub.connect(ctx.admin).setMaxInvoiceTtl(1200)).to.emit(ctx.hub, "MaxInvoiceTtlUpdated");
      expect(await ctx.hub.maxInvoiceTtl()).to.equal(1200);
    });

    it("bounds disputeWindow", async function () {
      const ctx = await loadFixture(deployWithVendor);

      await expect(ctx.hub.connect(ctx.admin).setDisputeWindow(59)).to.be.revertedWithCustomError(
        ctx.hub,
        "DisputeWindowOutOfBounds"
      );
      await expect(ctx.hub.connect(ctx.admin).setDisputeWindow(31 * DAY)).to.be.revertedWithCustomError(
        ctx.hub,
        "DisputeWindowOutOfBounds"
      );
    });

    it("bounds arbitrationDeadline", async function () {
      const ctx = await loadFixture(deployWithVendor);

      await expect(ctx.hub.connect(ctx.admin).setArbitrationDeadline(DAY - 1)).to.be.revertedWithCustomError(
        ctx.hub,
        "ArbitrationDeadlineOutOfBounds"
      );
      await expect(ctx.hub.connect(ctx.admin).setArbitrationDeadline(91 * DAY)).to.be.revertedWithCustomError(
        ctx.hub,
        "ArbitrationDeadlineOutOfBounds"
      );

      await expect(ctx.hub.connect(ctx.admin).setArbitrationDeadline(30 * DAY)).to.emit(
        ctx.hub,
        "ArbitrationDeadlineUpdated"
      );
      expect(await ctx.hub.arbitrationDeadline()).to.equal(30 * DAY);
    });

    it("rejects a zero registry at construction", async function () {
      const { deployer, admin } = await loadFixture(deployWithVendor);
      const Hub = await ethers.getContractFactory("QiCashPaymentHub");
      await expect(
        Hub.connect(deployer).deploy(admin.address, 0x00, ethers.ZeroAddress, 900, DEFAULT_DISPUTE_WINDOW, DEFAULT_ARBITRATION_DEADLINE)
      ).to.be.revertedWithCustomError(Hub, "ZeroRegistry");
    });
  });

  describe("stats", function () {
    it("accumulates per-vendor counters across the lifecycle", async function () {
      const ctx = await loadFixture(deployWithVendor);
      const { req, commitment } = await buildRequest(ctx);
      await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
      await ctx.hub.connect(ctx.attestorA).attestSettlement(commitment, sealedRefJs(commitment, saltOf("qitx:stats"), req.salt));
      await ctx.hub.connect(ctx.student).openDispute(req, saltOf("reason:stats"));
      await ctx.hub.connect(ctx.arbiter).resolveDispute(ctx.vendorA, commitment, true, saltOf("resolution:stats"));

      const stats = await ctx.hub.getVendorStats(ctx.vendorA);
      expect(stats.invoicesCreated).to.equal(1n);
      expect(stats.settlementsAttested).to.equal(1n);
      expect(stats.disputesOpened).to.equal(1n);
      expect(stats.disputesUpheld).to.equal(1n);

      const other = await ctx.hub.getVendorStats(ctx.vendorB);
      expect(other.invoicesCreated).to.equal(0n);
    });
  });
});
