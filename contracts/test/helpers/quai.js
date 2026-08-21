/**
 * Shared test helpers for the QiCash contracts.
 *
 * ===========================================================================
 *  WHY THIS FILE EXISTS: QiCash ADDRESSES ARE NOT ARBITRARY
 * ===========================================================================
 *
 * Every QiCash contract validates the addresses it is handed. `QuaiAddress`
 * requires privileged accounts to be Quai-ledger addresses inside the expected
 * shard, which on Cyprus-1 means:
 *
 *   - byte 0 (the shard prefix) is 0x00
 *   - bit 8 (the ledger flag, i.e. the high bit of the 3rd hex character) is 0
 *
 * Hardhat's built-in signers are ordinary random addresses. Roughly 511 out of
 * every 512 of them fail that predicate, so `grantRole`, `registerVendor` and
 * even the constructors revert if you hand them a default signer. Worse, the
 * hub's constructor validates the *registry's own deployed address*, which is
 * keccak-derived and therefore not something you can pick.
 *
 * Both problems are solved by mining rather than by weakening the contracts:
 *
 *   - `minedSigners()` derives private keys deterministically until the
 *     resulting EOA address satisfies the Cyprus-1 predicate. These are real
 *     signers, so no `impersonateAccount` is involved and nothing depends on
 *     how snapshot/revert interacts with the impersonation manager.
 *
 *   - `minedDeployers()` derives keys whose *nonce-0 CREATE address* satisfies
 *     the predicate. Deploying the registry from such a key as its first
 *     transaction lands the registry at a valid Cyprus-1 address.
 *
 * Mining is ~1/512 per attempt and costs ~130ms per key, so the whole pool is
 * mined once per process and cached. The search is seeded from a fixed string,
 * so a failing run reproduces exactly.
 */

const { ethers } = require("hardhat");
const { ethers: ethersLib } = require("ethers");

// ---------------------------------------------------------------- constants

/// Shard prefix of Cyprus-1 (region 0, zone 0) — the only active Quai zone.
const ZONE_CYPRUS1 = 0x00;

/// Domain tags. Must match QiCashPaymentHub exactly or every parity test fails.
const COMMIT_DOMAIN = ethersLib.keccak256(ethersLib.toUtf8Bytes("QiCash:InvoiceCommitment:v1"));
const SEAL_DOMAIN = ethersLib.keccak256(ethersLib.toUtf8Bytes("QiCash:SealedPaymentRef:v1"));

const ROLES = {
  ADMIN: ethersLib.keccak256(ethersLib.toUtf8Bytes("QiCash.ADMIN")),
  VENDOR_MANAGER: ethersLib.keccak256(
    ethersLib.toUtf8Bytes("QiCash.VENDOR_MANAGER")
  ),
  ARBITER: ethersLib.keccak256(ethersLib.toUtf8Bytes("QiCash.ARBITER")),
  PAUSER: ethersLib.keccak256(ethersLib.toUtf8Bytes("QiCash.PAUSER")),
};

/// Mirrors QiCashPaymentHub.InvoiceStatus.
const InvoiceStatus = {
  None: 0n,
  Open: 1n,
  Settled: 2n,
  Cancelled: 3n,
  Disputed: 4n,
  Refunded: 5n,
  DisputeRejected: 6n,
  ArbitrationExpired: 7n,
};

/// Mirrors QiCashPaymentHub.VerificationResult.
const VerificationResult = {
  Payable: 0n,
  InvoiceNotFound: 1n,
  VendorNotActive: 2n,
  InvoiceNotOpen: 3n,
  InvoiceExpired: 4n,
  InvalidQiPayoutAddress: 5n,
  InvalidDenomination: 6n,
  ExpiryMismatch: 7n,
};

/// Mirrors IQiCashVendorRegistry.VendorStatus.
const VendorStatus = {
  None: 0n,
  Active: 1n,
  Suspended: 2n,
  Revoked: 3n,
};

const DEFAULT_MAX_TTL = 900; // 15 minutes
const DEFAULT_DISPUTE_WINDOW = 7 * 24 * 60 * 60; // 7 days
const DEFAULT_ARBITRATION_DEADLINE = 14 * 24 * 60 * 60; // 14 days
const MAX_DENOMINATION_INDEX = 15;

// ------------------------------------------------- address bit-level helpers

/** True if `addr` sits on the Qi (UTXO) ledger — ledger flag bit 8 is set. */
function isQiLedger(addr) {
  return (ethersLib.getBytes(addr)[1] & 0x80) !== 0;
}

/** The 8-bit shard prefix (region nibble << 4 | zone nibble). */
function shardPrefix(addr) {
  return ethersLib.getBytes(addr)[0];
}

/** True if `addr` is a Quai-ledger address in Cyprus-1 — what the contracts demand. */
function isCyprus1Quai(addr) {
  const b = ethersLib.getBytes(addr);
  return b[0] === ZONE_CYPRUS1 && (b[1] & 0x80) === 0;
}

/**
 * Builds a syntactically valid address with a chosen ledger flag and shard.
 *
 * Used for values the contracts only ever hash or validate and never call —
 * above all `qiPayoutAddress`, which must be a Qi-ledger address that by
 * definition can never be a Hardhat signer. `tag` just keeps addresses
 * distinguishable in assertion output.
 */
function mkAddress({ ledger = "quai", zone = ZONE_CYPRUS1, tag = 1 } = {}) {
  const prefix = zone.toString(16).padStart(2, "0");
  // High bit of the 3rd hex char is the ledger flag: 0x8 sets it, 0x0 clears it.
  const flagNibble = ledger === "qi" ? "8" : "0";
  const tail = BigInt(tag).toString(16).padStart(37, "0");
  if (tail.length !== 37) throw new Error(`tag ${tag} too large for an address`);
  return ethersLib.getAddress(`0x${prefix}${flagNibble}${tail}`);
}

/** A Qi-ledger (UTXO) address on Cyprus-1 — a legitimate QI payout target. */
const qiPayout = (tag = 1) => mkAddress({ ledger: "qi", tag });

/** A Quai-ledger address on Cyprus-1 that is not a signer. */
const quaiAddr = (tag = 1) => mkAddress({ ledger: "quai", tag });

// ---------------------------------------------------------- key mining pool

/**
 * Deterministically derives keys from `seed` and keeps those whose derived
 * address (per `addressOf`) satisfies `predicate`.
 *
 * @param seed       Fixed string, so a failure is reproducible.
 * @param count      How many matching keys to return.
 * @param addressOf  Maps a wallet to the address the predicate applies to.
 */
function mineKeys(seed, count, addressOf) {
  const out = [];
  const LIMIT = 2_000_000; // ~4000x the expected work; a real miss means a bug.
  for (let i = 0; out.length < count && i < LIMIT; i++) {
    const pk = ethersLib.keccak256(ethersLib.toUtf8Bytes(`${seed}/${i}`));
    const wallet = new ethersLib.Wallet(pk);
    if (isCyprus1Quai(addressOf(wallet))) out.push(wallet);
  }
  if (out.length < count) {
    throw new Error(`mineKeys: only found ${out.length}/${count} for "${seed}"`);
  }
  return out;
}

// Mined once per mocha process and shared by every spec file.
let _signerPool = null;
let _deployerPool = null;

/** Wallets whose own EOA address is a valid Cyprus-1 Quai-ledger address. */
function minedSigners(count = 10) {
  if (!_signerPool || _signerPool.length < count) {
    _signerPool = mineKeys("qicash/test/signer", Math.max(count, 10), (w) => w.address);
  }
  return _signerPool.slice(0, count).map((w) => w.connect(ethers.provider));
}

/**
 * Wallets whose nonce-0 CREATE address is a valid Cyprus-1 Quai-ledger address.
 * Deploying from one of these as its first transaction lands the contract on a
 * valid Cyprus-1 address, which the hub's constructor then accepts.
 */
function minedDeployers(count = 4) {
  if (!_deployerPool || _deployerPool.length < count) {
    _deployerPool = mineKeys("qicash/test/deployer", Math.max(count, 4), (w) =>
      ethersLib.getCreateAddress({ from: w.address, nonce: 0 })
    ).map((w) => w.connect(ethers.provider));
  }
  return _deployerPool.slice(0, count);
}

/**
 * Deploys a contract to an address that satisfies the Cyprus-1 predicate.
 *
 * The hub's constructor validates the *registry's own deployed address*, and a
 * CREATE address is keccak-derived from (deployer, nonce) — not something you
 * can choose. So the nonce is mined instead: scan forward from the deployer's
 * current nonce for one whose CREATE address lands in Cyprus-1 on the Quai
 * ledger (~1/512, found in microseconds since it is pure JS), then jump the
 * account to it with `hardhat_setNonce`.
 *
 * Scanning forward from the *current* nonce rather than from zero is what makes
 * this safe under `loadFixture`, which runs a newly-seen fixture on top of
 * whatever state the previous one left behind instead of resetting first. A
 * helper that assumed a nonce of zero would work in isolation and then fail once
 * a spec file interleaved two fixtures.
 */
async function deployAtCyprus1(factory, args, deployer) {
  const current = await ethers.provider.getTransactionCount(deployer.address);
  let target = current;
  const LIMIT = current + 100_000;
  while (
    target < LIMIT &&
    !isCyprus1Quai(ethersLib.getCreateAddress({ from: deployer.address, nonce: target }))
  ) {
    target++;
  }
  if (target >= LIMIT) throw new Error("deployAtCyprus1: no suitable nonce found");
  if (target !== current) await setNonce(deployer.address, target);

  const contract = await factory.connect(deployer).deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  if (!isCyprus1Quai(address)) {
    throw new Error(`deployAtCyprus1: landed on non-Cyprus-1 address ${address}`);
  }
  return contract;
}

/**
 * Tops up mined wallets, which start with a zero balance.
 *
 * Uses `hardhat_setBalance` rather than transfers from signer[0]. Alternating
 * between two fixtures makes `loadFixture` re-run them repeatedly, and funding
 * ten accounts by transfer on every re-run drains signer[0] partway through the
 * suite — a confusing "sender doesn't have enough funds" failure in a test that
 * has nothing to do with balances. Setting balances directly also costs no
 * blocks and leaves signer[0]'s nonce alone.
 */
async function fund(wallets, amount = ethers.parseEther("100")) {
  for (const w of wallets) {
    await setBalance(w.address, amount);
  }
}

// ------------------------------------------------- off-chain hash reference

/**
 * Independent JavaScript reimplementation of `QiCashPaymentHub.computeCommitment`.
 *
 * This is not a convenience wrapper — it is the assertion. The mobile app has to
 * build this hash off-chain from a scanned QR payload, so a silent divergence
 * between contract and client would make every payment unverifiable while both
 * sides individually look correct. The parity tests compare the two directly.
 */
function commitmentJs({ vendorId, qiPayoutAddress, amount, denomination, salt, expiresAt }, chainId, hubAddress) {
  return ethersLib.keccak256(
    ethersLib.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "address", "bytes32", "address", "uint256", "uint8", "bytes32", "uint40"],
      [COMMIT_DOMAIN, chainId, hubAddress, vendorId, qiPayoutAddress, amount, denomination, salt, expiresAt]
    )
  );
}

/** JS reimplementation of `computeSealedPaymentRef`. */
function sealedRefJs(commitment, qiTxHash, salt) {
  return ethersLib.keccak256(
    ethersLib.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "bytes32", "bytes32", "bytes32"],
      [SEAL_DOMAIN, commitment, qiTxHash, salt]
    )
  );
}

/** JS reimplementation of `invoiceKey`. */
function invoiceKeyJs(vendorId, commitment) {
  return ethersLib.keccak256(
    ethersLib.AbiCoder.defaultAbiCoder().encode(["bytes32", "bytes32"], [vendorId, commitment])
  );
}

/** Vendor id as clients derive it: keccak256(abi.encode(campusId, vendorSlug)). */
function vendorIdOf(campus, slug) {
  return ethersLib.keccak256(
    ethersLib.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "bytes32"],
      [ethersLib.id(campus), ethersLib.id(slug)]
    )
  );
}

/** A 256-bit salt. Production must use a CSPRNG; tests need reproducibility. */
const saltOf = (label) => ethersLib.id(`qicash/salt/${label}`);

// --------------------------------------------------------------- deployment

/**
 * Deploys a registry + hub pair wired together, with roles distributed across
 * distinct accounts.
 *
 * Roles are deliberately NOT all held by one address. QiCashAccessControl makes
 * roles non-hierarchical on purpose, and a fixture that piles every role onto a
 * single account would hide any accidental privilege escalation.
 */
async function deployQiCash({
  maxInvoiceTtl = DEFAULT_MAX_TTL,
  disputeWindow = DEFAULT_DISPUTE_WINDOW,
  arbitrationDeadline = DEFAULT_ARBITRATION_DEADLINE,
  deployerIndex = 0,
} = {}) {
  const [faucet, student, bystander] = await ethers.getSigners();
  const [admin, vendorManager, arbiter, pauser, attestorA, attestorB, attestorC, spare, spare2] =
    minedSigners(9);
  const deployer = minedDeployers(4)[deployerIndex];

  await fund([deployer, admin, vendorManager, arbiter, pauser, attestorA, attestorB, attestorC, spare, spare2]);

  // First transaction from `deployer`, so the registry lands on the mined
  // nonce-0 CREATE address, which the hub's constructor then accepts. Uses
  // `deployAtCyprus1` so re-runs under `loadFixture` (when the deployer's
  // nonce has already advanced) scan forward to the next suitable nonce
  // instead of failing.
  const Registry = await ethers.getContractFactory("QiCashVendorRegistry", deployer);
  const registry = await deployAtCyprus1(Registry, [admin.address, ZONE_CYPRUS1], deployer);
  const registryAddress = await registry.getAddress();

  if (!isCyprus1Quai(registryAddress)) {
    throw new Error(
      `registry deployed to non-Cyprus-1 address ${registryAddress}; ` +
        `deployer nonce was not 0`
    );
  }

  const Hub = await ethers.getContractFactory("QiCashPaymentHub", deployer);
  const hub = await Hub.deploy(
    admin.address,
    ZONE_CYPRUS1,
    registryAddress,
    maxInvoiceTtl,
    disputeWindow,
    arbitrationDeadline
  );
  await hub.waitForDeployment();

  // Grant the operational roles. ADMIN_ROLE is intentionally not grantable —
  // it only moves through the propose/accept handover.
  await registry.connect(admin).grantRole(ROLES.VENDOR_MANAGER, vendorManager.address);
  await registry.connect(admin).grantRole(ROLES.PAUSER, pauser.address);
  await hub.connect(admin).grantRole(ROLES.ARBITER, arbiter.address);
  await hub.connect(admin).grantRole(ROLES.PAUSER, pauser.address);

  const chainId = (await ethers.provider.getNetwork()).chainId;

  return {
    registry,
    hub,
    registryAddress,
    hubAddress: await hub.getAddress(),
    chainId,
    faucet,
    deployer,
    admin,
    vendorManager,
    arbiter,
    pauser,
    attestorA,
    attestorB,
    attestorC,
    spare,
    spare2,
    student,
    bystander,
    maxInvoiceTtl,
    disputeWindow,
    arbitrationDeadline,
  };
}

/** Registry + hub with vendor A registered and Active — the common starting point. */
async function deployWithVendor() {
  const ctx = await deployQiCash();
  const vendorA = vendorIdOf("campus:unilag", "vendor:mama-put");
  const vendorB = vendorIdOf("campus:unilag", "vendor:print-shop");

  await ctx.registry
    .connect(ctx.vendorManager)
    .registerVendor(vendorA, ctx.attestorA.address, ethersLib.id("profile:mama-put"));
  await ctx.registry
    .connect(ctx.vendorManager)
    .registerVendor(vendorB, ctx.attestorB.address, ethersLib.id("profile:print-shop"));

  return { ...ctx, vendorA, vendorB };
}

/**
 * Builds a payment request plus its commitment, exactly as a vendor's app would.
 * `expiresAt` defaults to a comfortable point inside the hub's max TTL.
 */
async function buildRequest(ctx, overrides = {}) {
  const now = BigInt(await time.latest());
  const req = {
    vendorId: ctx.vendorA,
    qiPayoutAddress: qiPayout(0xa11ce),
    amount: 1250n, // 12.50 QI in minor units
    denomination: 3,
    salt: saltOf("default"),
    expiresAt: now + 600n,
    ...overrides,
  };
  const commitment = commitmentJs(req, ctx.chainId, ctx.hubAddress);
  return { req, commitment };
}

// Required lazily so this module can be loaded outside a Hardhat run.
const { time, setBalance, setNonce } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

module.exports = {
  ZONE_CYPRUS1,
  COMMIT_DOMAIN,
  SEAL_DOMAIN,
  ROLES,
  InvoiceStatus,
  VerificationResult,
  VendorStatus,
  DEFAULT_MAX_TTL,
  DEFAULT_DISPUTE_WINDOW,
  DEFAULT_ARBITRATION_DEADLINE,
  MAX_DENOMINATION_INDEX,
  isQiLedger,
  shardPrefix,
  isCyprus1Quai,
  mkAddress,
  qiPayout,
  quaiAddr,
  mineKeys,
  minedSigners,
  minedDeployers,
  fund,
  commitmentJs,
  sealedRefJs,
  invoiceKeyJs,
  vendorIdOf,
  saltOf,
  deployQiCash,
  deployWithVendor,
  buildRequest,
};
