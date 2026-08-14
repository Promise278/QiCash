const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const H = require("./helpers/quai");

describe("smoke", function () {
  it("deploys registry at a Cyprus-1 address and wires the hub", async function () {
    const ctx = await loadFixture(H.deployWithVendor);
    console.log("  registry:", ctx.registryAddress, "cyprus1:", H.isCyprus1Quai(ctx.registryAddress));
    console.log("  hub     :", ctx.hubAddress);
    console.log("  admin   :", ctx.admin.address, "cyprus1:", H.isCyprus1Quai(ctx.admin.address));
    console.log("  attestorA:", ctx.attestorA.address);
    expect(await ctx.hub.registry()).to.equal(ctx.registryAddress);
    expect(await ctx.registry.vendorCount()).to.equal(2n);
  });

  it("creates an invoice and verifies it as payable, with JS/Solidity hash parity", async function () {
    const ctx = await loadFixture(H.deployWithVendor);
    const { req, commitment } = await H.buildRequest(ctx);
    expect(await ctx.hub.computeCommitment(req)).to.equal(commitment);
    await ctx.hub.connect(ctx.attestorA).createInvoice(commitment, req.expiresAt);
    const [result] = await ctx.hub.verifyPaymentRequest(req);
    expect(result).to.equal(H.VerificationResult.Payable);
  });

  it("second fixture load still works (snapshot revert is clean)", async function () {
    const ctx = await loadFixture(H.deployWithVendor);
    expect(await ctx.registry.vendorCount()).to.equal(2n);
  });
});
