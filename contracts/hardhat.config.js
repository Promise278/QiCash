require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

try {
  require("@quai/hardhat-deploy-metadata");
} catch {
  // Optional. `npm i -D @quai/hardhat-deploy-metadata` before deploying.
}

const CYPRUS1_PK = process.env.CYPRUS1_PK;
const accounts = CYPRUS1_PK ? [CYPRUS1_PK] : [];

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
