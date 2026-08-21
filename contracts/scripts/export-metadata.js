const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "metadata");

function findBuildInfo() {
  const dir = path.join(__dirname, "..", "artifacts", "build-info");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (files.length !== 1) throw new Error(`expected 1 build-info file, found ${files.length}`);
  return JSON.parse(fs.readFileSync(path.join(dir, files[0]), "utf8"));
}

const SOURCES = {
  QiCashVendorRegistry: "contracts/QiCashVendorRegistry.sol",
  QiCashPaymentHub: "contracts/QiCashPaymentHub.sol",
};

for (const [name, sourceName] of Object.entries(SOURCES)) {
  const bi = findBuildInfo();
  const out = bi.output.contracts[sourceName][name];
  const metadata = out.metadata;
  const bytecode = out.evm.bytecode.object;
  if (!/^0x00[0-7]/.test(name)) { /* noop */ }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const p = path.join(OUT_DIR, `${name}.metadata.json`);
  fs.writeFileSync(p, metadata);
  const bytecodeHash = metadata.toLowerCase().includes("ipfs") ? "ipfs-listed" : "";
  console.log(`${name}: ${path.relative(process.cwd(), p)} (${metadata.length} chars, bytecode ${bytecode.length} hex)`);
}