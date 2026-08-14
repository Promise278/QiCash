require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Quai's deploy flow pins contract metadata to IPFS and embeds the CID in the
// bytecode so Quaiscan can find the sources later. The plugin is only needed for
// live deploys, so a missing install must not break `compile` or `test`.
try {
  require("@quai/hardhat-deploy-metadata");
} catch {
  // Optional. `npm i -D @quai/hardhat-deploy-metadata` before deploying.
}

const CYPRUS1_PK = process.env.CYPRUS1_PK;
const accounts = CYPRUS1_PK ? [CYPRUS1_PK] : [];

/**
 * Solidity 0.8.19 with evmVersion "london" is a hard requirement, not a
 * preference.
 *
 *   - Quai's EVM "supports Solidity versions up to 0.8.19" and warns that
 *     anything newer "may result in errors when deploying smart contracts"
 *     (https://docs.qu.ai/build/smart-contracts/solidity). The scaffold this
 *     replaced was on 0.8.28, which would not have deployed.
 *   - "london" predates the PUSH0 opcode introduced with Shanghai, matching the
 *     target used in Quai's own hardhat-example.
 *   - `bytecodeHash: "ipfs"` plus `useLiteralContent: true` are mandatory for
 *     Quaiscan verification — Quai's guide states dropping them "will break
 *     Quaiscan verification".
 *
 * If a deploy ever rejects the bytecode, drop to 0.8.17 (also used by Quai's
 * example); nothing here depends on 0.8.18 or 0.8.19 features.
 */
const compilerSettings = {
  optimizer: { enabled: true, runs: 1000 },
  evmVersion: "london",
  metadata: {
    bytecodeHash: "ipfs",
    useLiteralContent: true,
  },
};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [{ version: "0.8.20", settings: compilerSettings }],
  },

  networks: {
    // Local in-process EVM used by `npx hardhat test`. The contracts avoid
    // Quai's custom opcodes (isaddrinternal/etx/convert) precisely so the whole
    // suite runs here without a node.
    hardhat: {
      chainId: 31337,
    },

    // Quai mainnet, Cyprus-1.
    cyprus1: {
      url: process.env.RPC_URL || "https://rpc.quai.network/cyprus1",
      chainId: 9,
      accounts,
    },

    // Orchard public testnet. Faucet: https://orchard.faucet.quai.network
    orchard: {
      url: process.env.RPC_URL || "https://orchard.rpc.quai.network/cyprus1",
      chainId: 15000,
      accounts,
    },

    // Local Quai node (Local Node Runner), Cyprus-1 shard port.
    quaiLocal: {
      url: process.env.RPC_URL || "http://localhost:9200",
      chainId: 1337,
      accounts,
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
  },

  mocha: {
    timeout: 40000,
  },
};
