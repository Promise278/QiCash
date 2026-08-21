#!/usr/bin/env node
/**
 * Raw-RPC deploy script for QiCash contracts on Orchard testnet.
 * Uses quais SDK Wallet for signing + raw HTTPS with IPv4 for RPC.
 */
require("dotenv").config();
const https = require("https");
const { Wallet, AbiCoder } = require("quais");

const RPC_URL = process.env.RPC_URL || "https://orchard.rpc.quai.network/cyprus1";
const PK = (process.env.CYPRUS1_PK || "").trim();
const ADMIN = (process.env.QICASH_ADMIN || "").trim();
const CHAIN_ID = 15000;

if (!PK) {
  console.error("CYPRUS1_PK is not set");
  process.exit(1);
}

function rpc(method, params) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ jsonrpc: "2.0", method, params, id: Date.now() });
    const u = new URL(RPC_URL);
    const req = https.request(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname,
        method: "POST",
        family: 4,
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
        timeout: 30000,
      },
      (res) => {
        let body = "";
        res.on("data", (d) => (body += d));
        res.on("end", () => {
          try {
            const j = JSON.parse(body);
            if (j.error) reject(new Error(`RPC error: ${JSON.stringify(j.error)}`));
            else resolve(j.result);
          } catch (e) {
            reject(new Error(`Parse error: ${body.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("timeout", () => { req.destroy(); reject(new Error("RPC timeout")); });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function deployContract(bytecode, constructorArgs, label) {
  const wallet = new Wallet(PK);

  let encodedArgs = "0x";
  if (constructorArgs && constructorArgs.length > 0) {
    const coder = AbiCoder.defaultAbiCoder();
    encodedArgs = coder.encode(
      constructorArgs.map((a) => a.type),
      constructorArgs.map((a) => a.value)
    );
  }

  const deployData = bytecode + encodedArgs.slice(2);
  const nonce = parseInt(await rpc("eth_getTransactionCount", [wallet.address, "pending"]), 16);
  const gasPrice = BigInt(await rpc("eth_gasPrice", []));

  let gasEstimate;
  try {
    gasEstimate = await rpc("eth_estimateGas", [{ from: wallet.address, data: deployData }]);
  } catch {
    gasEstimate = "0x4C4B40";
  }

  const tx = {
    type: 0,
    nonce,
    gasPrice,
    gasLimit: parseInt(gasEstimate, 16),
    data: deployData,
    chainId: CHAIN_ID,
  };

  console.log(`  Deploying ${label}...`);
  const signed = await wallet.signTransaction(tx);
  const txHash = await rpc("eth_sendRawTransaction", [signed]);
  console.log(`  TX hash: ${txHash}`);

  let receipt = null;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    receipt = await rpc("eth_getTransactionReceipt", [txHash]);
    if (receipt) break;
    process.stdout.write(".");
  }
  console.log("");

  if (!receipt || receipt.status !== "0x1") {
    console.error(`  Deployment of ${label} failed!`);
    if (receipt) console.error("  Receipt:", JSON.stringify(receipt, null, 2));
    process.exit(1);
  }

  console.log(`  ${label} deployed at: ${receipt.contractAddress}`);
  return receipt.contractAddress;
}

async function main() {
  const wallet = new Wallet(PK);
  console.log("Deployer:", wallet.address);

  const bal = await rpc("eth_getBalance", [wallet.address, "latest"]);
  console.log("Balance:", (BigInt(bal) / 10n ** 18n).toString(), "QUAI");

  const chainId = await rpc("eth_chainId", []);
  console.log("Chain ID:", parseInt(chainId));

  const admin = ADMIN || wallet.address;
  console.log("Admin:", admin);

  const RegistryArtifact = require("../artifacts/contracts/QiCashVendorRegistry.sol/QiCashVendorRegistry.json");
  const HubArtifact = require("../artifacts/contracts/QiCashPaymentHub.sol/QiCashPaymentHub.json");

  console.log("\n=== Deploying QiCashVendorRegistry ===");
  const registryAddr = await deployContract(
    RegistryArtifact.bytecode,
    [{ type: "address", value: admin }, { type: "uint8", value: 0x00 }],
    "QiCashVendorRegistry"
  );

  console.log("\n=== Deploying QiCashPaymentHub ===");
  const maxInvoiceTtl = parseInt(process.env.QICASH_MAX_INVOICE_TTL || "900");
  const disputeWindow = parseInt(process.env.QICASH_DISPUTE_WINDOW || "604800");
  const arbitrationDeadline = parseInt(process.env.QICASH_ARBITRATION_DEADLINE || "1209600");

  const hubAddr = await deployContract(
    HubArtifact.bytecode,
    [
      { type: "address", value: admin },
      { type: "uint8", value: 0x00 },
      { type: "address", value: registryAddr },
      { type: "uint40", value: maxInvoiceTtl },
      { type: "uint40", value: disputeWindow },
      { type: "uint40", value: arbitrationDeadline },
    ],
    "QiCashPaymentHub"
  );

  console.log("\n======================================================");
  console.log("QiCash deployment complete (Orchard Testnet)");
  console.log("  Registry:", registryAddr);
  console.log("  Hub     :", hubAddr);
  console.log("  Admin   :", admin);
  console.log("\nUpdate mobile/.env:");
  console.log(`  EXPO_PUBLIC_HUB_ADDRESS=${hubAddr}`);
  console.log(`  EXPO_PUBLIC_REGISTRY_ADDRESS=${registryAddr}`);
  console.log("======================================================");
}

main().catch((e) => {
  console.error("Deploy failed:", e.message);
  process.exit(1);
});
