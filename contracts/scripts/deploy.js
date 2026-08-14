const { ethers } = require("hardhat");

const ZONE_CYPRUS1 = 0x00;

const ROLES = {
  ADMIN: ethers.keccak256(ethers.toUtf8Bytes("QiPay.ADMIN")),
  VENDOR_MANAGER: ethers.keccak256(ethers.toUtf8Bytes("QiPay.VENDOR_MANAGER")),
  ARBITER: ethers.keccak256(ethers.toUtf8Bytes("QiPay.ARBITER")),
  PAUSER: ethers.keccak256(ethers.toUtf8Bytes("QiPay.PAUSER")),
};

/** Cyprus-1 Quai-ledger: first byte 0x00, ledger-flag bit (high bit of the
 *  third hex character) clear. */
function isCyprus1Quai(address) {
  const b = ethers.getBytes(address);
  return b[0] === 0x00 && (b[1] & 0x80) === 0;
}

function assertCyprus1Quai(address, label) {
  if (!isCyprus1Quai(address)) {
    throw new Error(
      `${label} ${address} is not a Cyprus-1 Quai-ledger address (first byte 0x00, ` +
        `third hex char 0-7). Addresses with any other prefix belong to another ` +
        `shard or the Qi ledger and would be rejected or silently misrouted.`
    );
  }
}

function envInt(name, fallback) {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${name} must be a positive integer, got "${raw}"`);
  return n;
}

async function main() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  console.log(`QiPay deploy — chain ${chainId} (${process.env.RPC_URL || "default RPC"})`);
  console.log("------------------------------------------------------");

  // Use the private key from the environment directly rather than the network's
  // configured accounts: the local `hardhat` network uses its default mnemonic
  // accounts, and no network config can guarantee which signer is "the
  // deployer" for this flow.
  const deployerKey = (process.env.CYPRUS1_PK || "").trim();
  if (!deployerKey) {
    throw new Error("CYPRUS1_PK is not set — add it to .env (see .env.example).");
  }
  const deployer = new ethers.Wallet(deployerKey, ethers.provider);
  assertCyprus1Quai(deployer.address, "deployer");

  const admin = (process.env.QICASH_ADMIN || deployer.address).toLowerCase();
  const vendorManager = (process.env.QICASH_VENDOR_MANAGER || deployer.address).toLowerCase();
  const arbiter = (process.env.QICASH_ARBITER || deployer.address).toLowerCase();
  const pauser = (process.env.QICASH_PAUSER || deployer.address).toLowerCase();

  const roleAccounts = { ADMIN: admin, VENDOR_MANAGER: vendorManager, ARBITER: arbiter, PAUSER: pauser };
  for (const [role, account] of Object.entries(roleAccounts)) {
    assertCyprus1Quai(account, `${role} (${account})`);
  }

  // Local in-process node: give the deployer (and the admin, if separate)
  // balance. Never on a real network — there accounts must be funded from the
  // faucet: https://orchard.faucet.quai.network
  if (hre.network.name === "hardhat") {
    await ethers.provider.send("hardhat_setBalance", [deployer.address, "0x3635C9ADC5DEA00000"]);
    if (admin !== deployer.address.toLowerCase()) {
      await ethers.provider.send("hardhat_setBalance", [admin, "0x3635C9ADC5DEA00000"]);
    }
    console.log("local node: funded deployer" + (admin !== deployer.address.toLowerCase() ? " and admin" : ""));
  }

  const maxInvoiceTtl = envInt("QICASH_MAX_INVOICE_TTL", 900);
  const disputeWindow = envInt("QICASH_DISPUTE_WINDOW", 7 * 24 * 60 * 60);
  const arbitrationDeadline = envInt("QICASH_ARBITRATION_DEADLINE", 14 * 24 * 60 * 60);

  // ------------------------------------------------------------- deployment

  const Registry = await ethers.getContractFactory("QiPayVendorRegistry", deployer);
  const registry = await Registry.deploy(admin, ZONE_CYPRUS1);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  // The hub's constructor rejects a registry outside Cyprus-1 — catch it here
  // with a human-readable error (usually: the deployer key already has a
  // non-zero nonce, so the CREATE address moved off-shard).
  assertCyprus1Quai(registryAddress, "registry");
  console.log("registry deployed:", registryAddress);

  const Hub = await ethers.getContractFactory("QiPayPaymentHub", deployer);
  const hub = await Hub.deploy(
    admin,
    ZONE_CYPRUS1,
    registryAddress,
    maxInvoiceTtl,
    disputeWindow,
    arbitrationDeadline
  );
  await hub.waitForDeployment();
  const hubAddress = await hub.getAddress();
  console.log("hub deployed      :", hubAddress);

  // --------------------------------------------------------------- roles

  // VENDOR_MANAGER and PAUSER live on the registry; ARBITER and PAUSER on the
  // hub. ADMIN_ROLE itself is not grantable — it can only move via the
  // two-step handover, so the constructor-set admin is final for this deploy.
  const grants = [
    { contract: registry, role: ROLES.VENDOR_MANAGER, account: vendorManager, label: "VENDOR_MANAGER @ registry" },
    { contract: registry, role: ROLES.PAUSER, account: pauser, label: "PAUSER @ registry" },
    { contract: hub, role: ROLES.ARBITER, account: arbiter, label: "ARBITER @ hub" },
    { contract: hub, role: ROLES.PAUSER, account: pauser, label: "PAUSER @ hub" },
  ];

  const deployerIsAdmin = deployer.address.toLowerCase() === admin;
  const adminPk = (process.env.QICASH_ADMIN_PK || "").trim();
  let adminSigner = null;
  if (adminPk) {
    const wallet = new ethers.Wallet(adminPk, deployer.provider);
    if (wallet.address.toLowerCase() !== admin) {
      throw new Error(`QICASH_ADMIN_PK unlocks ${wallet.address}, but QICASH_ADMIN is ${admin} — they must match`);
    }
    adminSigner = wallet;
  }

  if (deployerIsAdmin) {
    for (const { contract, role, account, label } of grants) {
      if (account === deployer.address.toLowerCase()) continue; // admin already has nothing to grant itself
      const tx = await contract.connect(deployer).grantRole(role, account);
      await tx.wait();
      console.log(`granted ${label} -> ${account}`);
    }
  } else if (adminSigner) {
    for (const { contract, role, account, label } of grants) {
      if (account === admin) continue;
      const tx = await contract.connect(adminSigner).grantRole(role, account);
      await tx.wait();
      console.log(`granted ${label} -> ${account}`);
    }
  } else {
    console.log("\nQICASH_ADMIN is not the deployer. Send these from the admin account:\n");
    for (const { contract, role, account, label } of grants) {
      if (account === admin) continue;
      console.log(`  ${await contract.getAddress()}.grantRole("${role}", "${account}")  # ${label}`);
    }
    console.log("\nOr redeploy with blank QICASH_ADMIN to default all roles to the deployer.");
  }

  // ------------------------------------------------------------- summary

  console.log("\n------------------------------------------------------");
  console.log("QiPay deployment complete");
  console.log("  registry        :", registryAddress);
  console.log("  hub             :", hubAddress);
  console.log("  admin           :", admin);
  console.log("  vendor manager  :", vendorManager);
  console.log("  arbiter         :", arbiter);
  console.log("  pauser          :", pauser);
  console.log("  maxInvoiceTtl   :", maxInvoiceTtl, "s");
  console.log("  disputeWindow   :", disputeWindow, "s");
  console.log("  arbitrationDeadline:", arbitrationDeadline, "s");
  console.log("\nVerify on Quaiscan (Orchard): https://orchard.quaiscan.io");
  console.log("  Following the guide at https://docs.qu.ai/guides/development/verifycontract,");
  console.log("  verify the registry first, then the hub (the hub references the");
  console.log("  registry address in its constructor).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nDeploy failed:", err.message);
    process.exit(1);
  });
