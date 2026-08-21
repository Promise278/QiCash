const http = require('http');
const https = require('https');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function startProxy() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks);
        // Forward any path to orchard RPC
        const r = https.request({
          hostname: 'orchard.rpc.quai.network', port: 443, path: req.url || '/cyprus1', method: 'POST', family: 4, timeout: 120000,
          headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
        }, pres => {
          let d = '';
          pres.on('data', c => d += c);
          pres.on('end', () => { res.writeHead(200, {'Content-Type': 'application/json'}); res.end(d); });
        });
        r.on('timeout', () => { r.destroy(); res.writeHead(504); res.end('{"error":"timeout"}'); });
        r.on('error', e => { res.writeHead(500); res.end('{"error":"' + e.message + '"}'); });
        r.write(body); r.end();
      });
    });
    server.listen(18545, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  const proxy = await startProxy();
  console.log('Proxy ready on :18545 (all paths)');

  // Patch fetch to use our proxy
  const origFetch = globalThis.fetch;
  globalThis.fetch = async function(url, opts) {
    if (typeof url === 'string' && url.includes('orchard.rpc.quai.network')) {
      const u = new URL(url);
      url = 'http://127.0.0.1:18545' + u.pathname;
      if (opts && opts.agent) delete opts.agent;
    }
    return origFetch.call(this, url, opts);
  };

  const {quais} = require('quais');

  const PK = '0xa12a4fdf1a5c00e0968f8585ff9b0a339f6eab7dec10992547c3222f4a21e7d1';
  const ADMIN = '0x0042340a75f07D761ac5e61CcD140B7eb75692A4';

  const provider = new quais.JsonRpcProvider('http://127.0.0.1:18545', undefined, { usePathing: true });
  const wallet = new quais.Wallet(PK, provider);

  console.log('Deployer:', wallet.address);
  const bal = await provider.getBalance(wallet.address);
  console.log('Balance:', quais.formatUnits(bal, 18), 'QUAI');

  const RegistryArtifact = require(path.join(ROOT, 'artifacts/contracts/QiCashVendorRegistry.sol/QiCashVendorRegistry.json'));
  const HubArtifact = require(path.join(ROOT, 'artifacts/contracts/QiCashPaymentHub.sol/QiCashPaymentHub.json'));
  const DUMMY_CID = 'QmYwAPJzv5CZsnAzt8auVZRn1iiR7aHnGFdPuE2UoHbVz2';

  console.log('\n=== Deploying QiCashVendorRegistry ===');
  const RegistryFactory = new quais.ContractFactory(RegistryArtifact.abi, RegistryArtifact.bytecode, wallet, DUMMY_CID);
  const registry = await RegistryFactory.deploy(ADMIN, 0x00);
  console.log('Registry TX:', registry.deploymentTransaction()?.hash);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log('Registry deployed:', registryAddr);

  console.log('\n=== Deploying QiCashPaymentHub ===');
  const HubFactory = new quais.ContractFactory(HubArtifact.abi, HubArtifact.bytecode, wallet, DUMMY_CID);
  const hub = await HubFactory.deploy(ADMIN, 0x00, registryAddr, 900, 604800, 1209600);
  console.log('Hub TX:', hub.deploymentTransaction()?.hash);
  await hub.waitForDeployment();
  const hubAddr = await hub.getAddress();
  console.log('Hub deployed:', hubAddr);

  console.log('\n========================================');
  console.log('DEPLOYMENT COMPLETE ON ORCHARD TESTNET');
  console.log('Registry:', registryAddr);
  console.log('Hub:', hubAddr);
  console.log('Admin:', ADMIN);
  console.log('========================================');
  console.log('\nAdd to mobile/.env:');
  console.log('EXPO_PUBLIC_HUB_ADDRESS=' + hubAddr);
  console.log('EXPO_PUBLIC_REGISTRY_ADDRESS=' + registryAddr);

  proxy.close();
  process.exit(0);
}

main().catch(e => { console.error('FAILED:', e.message || e); process.exit(1); });
setTimeout(() => { console.log('GLOBAL TIMEOUT'); process.exit(1); }, 600000);
