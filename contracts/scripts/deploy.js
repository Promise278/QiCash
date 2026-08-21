// /**
//  * Orchard testnet deploy — bypasses Hardhat's provider (which can't talk to
//  * Quai's RPC over IPv6) by using raw HTTPS with forced IPv4 + quais SDK
//  * for signing.
//  *
//  * Usage:
//  *   node scripts/deploy.js
//  *   (reads .env: CYPRUS1_PK, QICASH_ADMIN, etc.)
//  */
// require("dotenv").config();
// const https = require("https");
// const path = require("path");
// const { Wallet, AbiCoder, keccak256, toUtf8Bytes } = require("quais");

// const RPC_URL = process.env.RPC_URL || "https://orchard.rpc.quai.network/cyprus1";
// const PK = (process.env.CYPRUS1_PK || "").trim();
// const CHAIN_ID = 15000;
// const ZONE_CYPRUS1 = 0x00;
// const ROOT = path.join(__dirname, "..");

// if (!PK) {
//   console.error("CYPRUS1_PK is not set in .env");
//   process.exit(1);
// }

// // --- raw IPv4-only JSON-RPC ---

// function rpc(method, params = []) {
//   return new Promise((resolve, reject) => {
//     const data = JSON.stringify({ jsonrpc: "2.0", method, params, id: Date.now() });
//     const u = new URL(RPC_URL);
//     const req = https.request(
//       {
//         hostname: u.hostname,
//         port: 443,
//         path: u.pathname,
//         method: "POST",
//         family: 4,
//         timeout: 60000,
//         headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
//       },
//       (res) => {
//         let body = "";
//         res.on("data", (d) => (body += d));
//         res.on("end", () => {
//           try {
//             const j = JSON.parse(body);
//             if (j.error) reject(new Error(`RPC ${method}: ${JSON.stringify(j.error)}`));
//             else resolve(j.result);
//           } catch (e) {
//             reject(new Error(`Parse error: ${body.slice(0, 200)}`));
//           }
//         });
//       }
//     );
//     req.on("timeout", () => { req.destroy(); reject(new Error(`RPC timeout: ${method}`)); });
//     req.on("error", reject);
//     req.write(data);
//     req.end();
//   });
// }

// async function sendRawTx(signed) {
//   const txHash = await rpc("eth_sendRawTransaction", [signed]);
//   return txHash;
// }

// async function waitForReceipt(txHash, maxWaitMs = 300000) {
//   const start = Date.now();
//   while (Date.now() - start < maxWaitMs) {
//     try {
//       const receipt = await rpc("eth_getTransactionReceipt", [txHash]);
//       if (receipt) return receipt;
//     } catch {}
//     await new Promise((r) => setTimeout(r, 5000));
//     process.stdout.write(".");
//   }
//   return null;
// }

// // --- address validation ---

// function isCyprus1Quai(address) {
//   const hex = address.toLowerCase().startsWith("0x") ? address.toLowerCase() : "0x" + address;
//   const b = Buffer.from(hex.slice(2), "hex");
//   return b[0] === 0x00 && (b[1] & 0x80) === 0;
// }

// function assertCyprus1Quai(address, label) {
//   if (!isCyprus1Quai(address)) {
//     throw new Error(
//       `${label} ${address} is NOT a Cyprus-1 Quai-ledger address.\n` +
//       `  Must start with 0x00, third hex char 0-7.\n` +
//       `  Faucet: https://orchard.faucet.quai.network`
//     );
//   }
// }

// // --- env helpers ---

// function envInt(name, fallback) {
//   const raw = process.env[name];
//   if (!raw || raw.trim() === "") return fallback;
//   const n = Number(raw);
//   if (!Number.isInteger(n) || n <= 0) throw new Error(`${name} must be a positive integer, got "${raw}"`);
//   return n;
// }

// // --- deploy ---

// async function deployContract(abi, bytecode, args, wallet, label) {
//   const coder = AbiCoder.defaultAbiCoder();
//   const types = args.map((a) => a.type);
//   const values = args.map((a) => a.value);
//   const encodedArgs = coder.encode(types, values);
//   const deployData = bytecode + encodedArgs.slice(2);

//   const nonce = parseInt(await rpc("eth_getTransactionCount", [wallet.address, "pending"]), 16);
//   const gasPrice = BigInt(await rpc("eth_gasPrice", []));

//   let gasEstimate;
//   try {
//     gasEstimate = await rpc("eth_estimateGas", [{ from: wallet.address, data: deployData }]);
//   } catch {
//     gasEstimate = "0x5F5E100"; // 100M fallback
//   }

//   const tx = {
//     type: 0,
//     nonce,
//     gasPrice,
//     gasLimit: Math.floor(parseInt(gasEstimate, 16) * 1.3),
//     data: deployData,
//     chainId: CHAIN_ID,
//   };

//   process.stdout.write(`  Deploying ${label}...`);
//   const signed = await wallet.signTransaction(tx);
//   const txHash = await sendRawTx(signed);

//   const receipt = await waitForReceipt(txHash);
//   console.log("");

//   if (!receipt || receipt.status !== "0x1") {
//     console.error(`  FAILED to deploy ${label}`);
//     if (receipt) console.error("  Receipt:", JSON.stringify(receipt, null, 2));
//     process.exit(1);
//   }

//   console.log(`  ${label} deployed at: ${receipt.contractAddress}`);
//   return receipt.contractAddress;
// }

// async function sendRoleTx(contractAbi, contractAddr, methodSig, wallet, label) {
//   const coder = AbiCoder.defaultAbiCoder();
//   const selector = Wallet.keccak256(Buffer.from(methodSig)).slice(0, 10);

//   // We'll use the quais Contract for encoding
//   const { Contract } = require("quais");
//   const tempContract = new Contract(contractAddr, contractAbi);

//   const data = tempContract.interface.encodeFunctionData(
//     methodSig.split("(")[0],
//     // We'll handle this differently below
//   );
// }

// async function grantRole(contractAbi, contractAddr, roleHash, account, wallet) {
//   // Manual ABI encoding for grantRole(bytes32,address)
//   const selector = keccak256(toUtf8Bytes("grantRole(bytes32,address)")).slice(0, 10);
//   const coder = AbiCoder.defaultAbiCoder();
//   const data = selector + coder.encode(["bytes32", "address"], [roleHash, account]).slice(2);

//   const nonce = parseInt(await rpc("eth_getTransactionCount", [wallet.address, "pending"]), 16);
//   const gasPrice = BigInt(await rpc("eth_gasPrice", []));

//   let gasEstimate;
//   try {
//     gasEstimate = await rpc("eth_estimateGas", [{ from: wallet.address, to: contractAddr, data }]);
//   } catch {
//     gasEstimate = "0x3D090"; // 250k
//   }

//   const tx = {
//     type: 0,
//     nonce,
//     gasPrice,
//     gasLimit: Math.floor(parseInt(gasEstimate, 16) * 1.3),
//     to: contractAddr,
//     data,
//     chainId: CHAIN_ID,
//   };

//   const signed = await wallet.signTransaction(tx);
//   const txHash = await sendRawTx(signed);
//   const receipt = await waitForReceipt(txHash);

//   if (!receipt || receipt.status !== "0x1") {
//     throw new Error(`Failed to grant role: ${txHash}`);
//   }
// }

// // --- main ---

// async function main() {
//   const wallet = new Wallet(PK);
//   console.log("QiCash deploy — Orchard Testnet (chain 15000)");
//   console.log("------------------------------------------------------");

//   assertCyprus1Quai(wallet.address, "deployer");

//   const bal = await rpc("eth_getBalance", [wallet.address, "latest"]);
//   console.log("Deployer:", wallet.address);
//   console.log("Balance:", (BigInt(bal) / 10n ** 18n).toString(), "QUAI");

//   if (BigInt(bal) === 0n) {
//     console.error("\n  Zero balance! Get testnet QUAI from: https://orchard.faucet.quai.network");
//     process.exit(1);
//   }

//   const admin = (process.env.QICASH_ADMIN || wallet.address).toLowerCase();
//   const vendorManager = (process.env.QICASH_VENDOR_MANAGER || wallet.address).toLowerCase();
//   const arbiter = (process.env.QICASH_ARBITER || wallet.address).toLowerCase();
//   const pauser = (process.env.QICASH_PAUSER || wallet.address).toLowerCase();

//   for (const [role, addr] of Object.entries({ ADMIN: admin, VENDOR_MANAGER: vendorManager, ARBITER: arbiter, PAUSER: pauser })) {
//     assertCyprus1Quai(addr, role);
//   }

//   const maxInvoiceTtl = envInt("QICASH_MAX_INVOICE_TTL", 900);
//   const disputeWindow = envInt("QICASH_DISPUTE_WINDOW", 604800);
//   const arbitrationDeadline = envInt("QICASH_ARBITRATION_DEADLINE", 1209600);

//   // Load compiled artifacts
//   const RegistryArtifact = require(path.join(ROOT, "artifacts/contracts/QiCashVendorRegistry.sol/QiCashVendorRegistry.json"));
//   const HubArtifact = require(path.join(ROOT, "artifacts/contracts/QiCashPaymentHub.sol/QiCashPaymentHub.json"));

//   // Deploy Registry
//   console.log("\n=== Deploying QiCashVendorRegistry ===");
//   const registryAddr = await deployContract(
//     RegistryArtifact.abi,
//     RegistryArtifact.bytecode,
//     [{ type: "address", value: admin }, { type: "uint8", value: ZONE_CYPRUS1 }],
//     wallet,
//     "QiCashVendorRegistry"
//   );
//   assertCyprus1Quai(registryAddr, "registry (CREATE address)");

//   // Deploy Hub
//   console.log("\n=== Deploying QiCashPaymentHub ===");
//   const hubAddr = await deployContract(
//     HubArtifact.abi,
//     HubArtifact.bytecode,
//     [
//       { type: "address", value: admin },
//       { type: "uint8", value: ZONE_CYPRUS1 },
//       { type: "address", value: registryAddr },
//       { type: "uint40", value: maxInvoiceTtl },
//       { type: "uint40", value: disputeWindow },
//       { type: "uint40", value: arbitrationDeadline },
//     ],
//     wallet,
//     "QiCashPaymentHub"
//   );

//   // Grant roles (if deployer is admin)
//   const ROLES = {
//     VENDOR_MANAGER: keccak256(toUtf8Bytes("QiCash.VENDOR_MANAGER")),
//     ARBITER: keccak256(toUtf8Bytes("QiCash.ARBITER")),
//     PAUSER: keccak256(toUtf8Bytes("QiCash.PAUSER")),
//   };

//   const deployerIsAdmin = wallet.address.toLowerCase() === admin;
//   if (deployerIsAdmin) {
//     console.log("\n=== Granting roles ===");
//     const grants = [
//       { abi: RegistryArtifact.abi, addr: registryAddr, role: ROLES.VENDOR_MANAGER, account: vendorManager, label: "VENDOR_MANAGER @ registry" },
//       { abi: RegistryArtifact.abi, addr: registryAddr, role: ROLES.PAUSER, account: pauser, label: "PAUSER @ registry" },
//       { abi: HubArtifact.abi, addr: hubAddr, role: ROLES.ARBITER, account: arbiter, label: "ARBITER @ hub" },
//       { abi: HubArtifact.abi, addr: hubAddr, role: ROLES.PAUSER, account: pauser, label: "PAUSER @ hub" },
//     ];

//     for (const { abi, addr, role, account, label } of grants) {
//       if (account === wallet.address.toLowerCase()) continue;
//       process.stdout.write(`  Granting ${label}...`);
//       await grantRole(abi, addr, role, account, wallet);
//       console.log(` done -> ${account}`);
//     }
//   } else {
//     console.log("\n  Deployer is not admin. Grant roles manually from the admin account.");
//   }

//   // Summary
//   console.log("\n======================================================");
//   console.log("QiCash deployment complete (Orchard Testnet)");
//   console.log("  Registry:", registryAddr);
//   console.log("  Hub     :", hubAddr);
//   console.log("  Admin   :", admin);
//   console.log("  VendorMgr:", vendorManager);
//   console.log("  Arbiter  :", arbiter);
//   console.log("  Pauser   :", pauser);
//   console.log("======================================================");
//   console.log("\nUpdate your app .env files:");
//   console.log(`  EXPO_PUBLIC_HUB_ADDRESS=${hubAddr}`);
//   console.log(`  EXPO_PUBLIC_REGISTRY_ADDRESS=${registryAddr}`);
//   console.log(`  NEXT_PUBLIC_HUB_ADDRESS=${hubAddr}`);
//   console.log(`  NEXT_PUBLIC_REGISTRY_ADDRESS=${registryAddr}`);
//   console.log("\nVerify on Quaiscan (Orchard): https://orchard.quaiscan.io");
//   console.log("  Follow: https://docs.qu.ai/guides/development/verifycontract");
// }

// main()
//   .then(() => process.exit(0))
//   .catch((err) => {
//     console.error("\nDeploy failed:", err.message);
//     process.exit(1);
//   });


/**
 * QiCash — Quai Mainnet Deployment
 *
 * Usage:
 *   npx hardhat compile
 *   npx hardhat run scripts/deploy.js --network cyprus1
 *
 * Required .env:
 *   CYPRUS1_PK=0x...
 *
 * Optional:
 *   RPC_URL=https://rpc.quai.network/cyprus1
 *   QICASH_ADMIN=0x...
 *   QICASH_VENDOR_MANAGER=0x...
 *   QICASH_ARBITER=0x...
 *   QICASH_PAUSER=0x...
 *   QICASH_MAX_INVOICE_TTL=900
 *   QICASH_DISPUTE_WINDOW=604800
 *   QICASH_ARBITRATION_DEADLINE=1209600
 */

const hre = require("hardhat");
const quais = require("quais");
require("dotenv").config();

const path = require("path");

const RPC_URL =
  process.env.RPC_URL ||
  hre.network.config.url ||
  "https://rpc.quai.network/cyprus1";

const CHAIN_ID = 9;
const ZONE_CYPRUS1 = 0x00;

const ROOT = path.join(__dirname, "..");

function envInt(name, fallback) {
  const raw = process.env[name];

  if (!raw || raw.trim() === "") {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      `${name} must be a positive integer, got "${raw}"`
    );
  }

  return value;
}

function assertCyprus1Quai(address, label) {
  const value = address.toLowerCase();

  if (!/^0x[0-9a-f]{40}$/.test(value)) {
    throw new Error(`${label} is not a valid EVM address: ${address}`);
  }

  const firstByte = Number.parseInt(value.slice(2, 4), 16);
  const secondByte = Number.parseInt(value.slice(4, 6), 16);

  if (firstByte !== 0x00 || (secondByte & 0x80) !== 0) {
    throw new Error(
      `${label} ${address} is not a Cyprus-1 Quai-ledger address. ` +
        `Expected first byte 0x00 and the ledger flag clear.`
    );
  }
}

async function loadArtifact(relativePath) {
  return require(path.join(ROOT, relativePath));
}

async function deployContract(factory, args, label) {
  console.log(`\nDeploying ${label}...`);

  const contract = await factory.deploy(...args);

  const tx = contract.deploymentTransaction();

  if (tx) {
    console.log("Transaction:", tx.hash);
  }

  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log(`${label} deployed at: ${address}`);

  return contract;
}

async function grantRole(contract, role, account, label) {
  console.log(`Granting ${label}...`);

  const tx = await contract.grantRole(role, account);

  console.log(`  Transaction: ${tx.hash}`);

  await tx.wait();

  console.log(`  Done -> ${account}`);
}

async function main() {
  if (hre.network.name !== "cyprus1") {
    console.warn(
      `Warning: deployment script is intended for mainnet cyprus1, but network is "${hre.network.name}".`
    );
  }

  const privateKey = (process.env.CYPRUS1_PK || "").trim();

  if (!privateKey) {
    throw new Error(
      "CYPRUS1_PK is not set. Add your mainnet deployer private key to .env."
    );
  }

  console.log("======================================================");
  console.log("QiCash — Quai Mainnet Deployment");
  console.log("======================================================");
  console.log("RPC:", RPC_URL);
  console.log("Chain ID:", CHAIN_ID);

  // Quai-aware provider.
  // usePathing enables Quai shard/zone routing.
  const provider = new quais.JsonRpcProvider(
    RPC_URL,
    undefined,
    { usePathing: true }
  );

  const deployer = new quais.Wallet(privateKey, provider);

  const network = await provider.getNetwork();
  const actualChainId = Number(network.chainId);

  console.log("Connected chain:", actualChainId);
  console.log("Deployer:", deployer.address);

  if (actualChainId !== CHAIN_ID) {
    throw new Error(
      `Wrong network. Expected mainnet chain ${CHAIN_ID}, got ${actualChainId}.`
    );
  }

  assertCyprus1Quai(deployer.address, "Deployer");

  const balance = await provider.getBalance(deployer.address);

  console.log(
    "Deployer balance:",
    quais.formatQuai(balance),
    "QUAI"
  );

  if (balance === 0n) {
    throw new Error(
      "Deployer has zero QUAI. Fund the account with QUAI for gas fees."
    );
  }

  // ------------------------------------------------------------
  // Accounts / roles
  // ------------------------------------------------------------

  const admin = (
    process.env.QICASH_ADMIN || deployer.address
  ).toLowerCase();

  const vendorManager = (
    process.env.QICASH_VENDOR_MANAGER || deployer.address
  ).toLowerCase();

  const arbiter = (
    process.env.QICASH_ARBITER || deployer.address
  ).toLowerCase();

  const pauser = (
    process.env.QICASH_PAUSER || deployer.address
  ).toLowerCase();

  const roleAccounts = {
    ADMIN: admin,
    VENDOR_MANAGER: vendorManager,
    ARBITER: arbiter,
    PAUSER: pauser,
  };

  for (const [role, account] of Object.entries(roleAccounts)) {
    assertCyprus1Quai(account, `${role} account`);
  }

  console.log("\nRole accounts:");
  console.log("  ADMIN          :", admin);
  console.log("  VENDOR_MANAGER :", vendorManager);
  console.log("  ARBITER        :", arbiter);
  console.log("  PAUSER         :", pauser);

  // ------------------------------------------------------------
  // Configuration
  // ------------------------------------------------------------

  const maxInvoiceTtl = envInt(
    "QICASH_MAX_INVOICE_TTL",
    900
  );

  const disputeWindow = envInt(
    "QICASH_DISPUTE_WINDOW",
    7 * 24 * 60 * 60
  );

  const arbitrationDeadline = envInt(
    "QICASH_ARBITRATION_DEADLINE",
    14 * 24 * 60 * 60
  );

  // ------------------------------------------------------------
  // Artifacts
  // ------------------------------------------------------------

  const RegistryArtifact = await loadArtifact(
    "artifacts/contracts/QiCashVendorRegistry.sol/QiCashVendorRegistry.json"
  );

  const HubArtifact = await loadArtifact(
    "artifacts/contracts/QiCashPaymentHub.sol/QiCashPaymentHub.json"
  );

  // ------------------------------------------------------------
  // Contract factories
  // ------------------------------------------------------------

  const RegistryFactory = new quais.ContractFactory(
    RegistryArtifact.abi,
    RegistryArtifact.bytecode,
    deployer
  );

  const HubFactory = new quais.ContractFactory(
    HubArtifact.abi,
    HubArtifact.bytecode,
    deployer
  );

  // ------------------------------------------------------------
  // Deploy Registry
  // ------------------------------------------------------------

  const registry = await deployContract(
    RegistryFactory,
    [
      admin,
      ZONE_CYPRUS1,
    ],
    "QiCashVendorRegistry"
  );

  const registryAddress = await registry.getAddress();

  assertCyprus1Quai(
    registryAddress,
    "Registry"
  );

  // ------------------------------------------------------------
  // Deploy Payment Hub
  // ------------------------------------------------------------

  const hub = await deployContract(
    HubFactory,
    [
      admin,
      ZONE_CYPRUS1,
      registryAddress,
      maxInvoiceTtl,
      disputeWindow,
      arbitrationDeadline,
    ],
    "QiCashPaymentHub"
  );

  const hubAddress = await hub.getAddress();

  assertCyprus1Quai(
    hubAddress,
    "Payment Hub"
  );

  // ------------------------------------------------------------
  // Role hashes
  // ------------------------------------------------------------

  const ROLES = {
    VENDOR_MANAGER: quais.keccak256(
      quais.toUtf8Bytes("QiCash.VENDOR_MANAGER")
    ),

    ARBITER: quais.keccak256(
      quais.toUtf8Bytes("QiCash.ARBITER")
    ),

    PAUSER: quais.keccak256(
      quais.toUtf8Bytes("QiCash.PAUSER")
    ),
  };

  // ------------------------------------------------------------
  // Connect to deployed contracts
  // ------------------------------------------------------------

  const registryContract = new quais.Contract(
    registryAddress,
    RegistryArtifact.abi,
    deployer
  );

  const hubContract = new quais.Contract(
    hubAddress,
    HubArtifact.abi,
    deployer
  );

  // ------------------------------------------------------------
  // Grant roles
  // ------------------------------------------------------------

  const deployerIsAdmin =
    deployer.address.toLowerCase() === admin;

  if (deployerIsAdmin) {
    console.log("\n======================================================");
    console.log("Granting QiCash roles");
    console.log("======================================================");

    if (
      vendorManager !==
      deployer.address.toLowerCase()
    ) {
      await grantRole(
        registryContract,
        ROLES.VENDOR_MANAGER,
        vendorManager,
        "VENDOR_MANAGER @ registry"
      );
    } else {
      console.log(
        "VENDOR_MANAGER already belongs to deployer."
      );
    }

    if (
      pauser !==
      deployer.address.toLowerCase()
    ) {
      await grantRole(
        registryContract,
        ROLES.PAUSER,
        pauser,
        "PAUSER @ registry"
      );
    } else {
      console.log(
        "PAUSER already belongs to deployer on registry."
      );
    }

    if (
      arbiter !==
      deployer.address.toLowerCase()
    ) {
      await grantRole(
        hubContract,
        ROLES.ARBITER,
        arbiter,
        "ARBITER @ hub"
      );
    } else {
      console.log(
        "ARBITER already belongs to deployer."
      );
    }

    if (
      pauser !==
      deployer.address.toLowerCase()
    ) {
      await grantRole(
        hubContract,
        ROLES.PAUSER,
        pauser,
        "PAUSER @ hub"
      );
    } else {
      console.log(
        "PAUSER already belongs to deployer on hub."
      );
    }
  } else {
    console.log(
      "\nDeployer is not QICASH_ADMIN."
    );

    console.log(
      "Roles were not automatically granted."
    );

    console.log(
      "Use the admin wallet to grant the configured roles."
    );
  }

  // ------------------------------------------------------------
  // Final summary
  // ------------------------------------------------------------

  console.log("\n======================================================");
  console.log("QiCash deployment complete (Quai Mainnet)");
  console.log("======================================================");

  console.log("Network        :", "Quai Mainnet (Cyprus-1)");
  console.log("Chain ID       :", CHAIN_ID);
  console.log("Registry       :", registryAddress);
  console.log("Payment Hub    :", hubAddress);
  console.log("Admin          :", admin);
  console.log("Vendor Manager :", vendorManager);
  console.log("Arbiter        :", arbiter);
  console.log("Pauser         :", pauser);

  console.log("\nConfiguration:");
  console.log("Max Invoice TTL       :", maxInvoiceTtl);
  console.log("Dispute Window        :", disputeWindow);
  console.log("Arbitration Deadline  :", arbitrationDeadline);

  console.log("\nUpdate your application .env files:");
  console.log(
    `EXPO_PUBLIC_HUB_ADDRESS=${hubAddress}`
  );
  console.log(
    `EXPO_PUBLIC_REGISTRY_ADDRESS=${registryAddress}`
  );
  console.log(
    `NEXT_PUBLIC_HUB_ADDRESS=${hubAddress}`
  );
  console.log(
    `NEXT_PUBLIC_REGISTRY_ADDRESS=${registryAddress}`
  );

  console.log(
    "\nMainnet Explorer: https://quaiscan.io"
  );

  console.log(
    "======================================================"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n======================================================");
    console.error("QiCash deployment FAILED (Mainnet)");
    console.error("======================================================");
    console.error(error);
    process.exit(1);
  });