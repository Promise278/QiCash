const https = require('https');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// IPv4-only JSON-RPC via raw HTTPS
function rawRpc(method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params });
    const req = https.request({
      hostname: 'orchard.rpc.quai.network', port: 443, path: '/cyprus1', method: 'POST', family: 4, timeout: 60000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { const j = JSON.parse(d); if (j.error) reject(new Error(JSON.stringify(j.error))); else resolve(j.result); }
        catch (e) { reject(new Error('parse: ' + d.slice(0, 200))); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function waitForReceipt(txHash, maxWaitMs) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const receipt = await rawRpc('eth_getTransactionReceipt', [txHash]);
      if (receipt) return receipt;
    } catch {}
    await new Promise(r => setTimeout(r, 5000));
  }
  return null;
}

async function main() {
  const { Wallet, AbiCoder } = require('quais');

  const PK = '0xa12a4fdf1a5c00e0968f8585ff9b0a339f6eab7dec10992547c3222f4a21e7d1';
  const ADMIN = '0x0042340a75f07D761ac5e61CcD140B7eb75692A4';
  const wallet = new Wallet(PK);

  console.log('Deployer:', wallet.address);
  const bal = await rawRpc('eth_getBalance', [wallet.address, 'latest']);
  console.log('Balance:', (BigInt(bal) / 10n**18n).toString(), 'QUAI');

  // Try deploying just the Registry with raw tx (no quais protobuf)
  // Encode constructor: (address, uint8)
  const coder = AbiCoder.defaultAbiCoder();
  const constructorArgs = coder.encode(['address', 'uint8'], [ADMIN, 0x00]);

  const RegistryArtifact = require(path.join(ROOT, 'artifacts/contracts/QiCashVendorRegistry.sol/QiCashVendorRegistry.json'));
  const deployData = RegistryArtifact.bytecode + constructorArgs.slice(2);

  console.log('\nBytecode + args length:', deployData.length);

  // Estimate gas
  let gasEstimate;
  try {
    gasEstimate = await rawRpc('eth_estimateGas', [{ from: wallet.address, data: deployData }]);
    console.log('Gas estimate:', parseInt(gasEstimate, 16));
  } catch (e) {
    console.log('Gas estimate error:', e.message);
    gasEstimate = '0x7A1200'; // 8M
  }

  // Try signing with quais (protobuf format)
  const nonce = parseInt(await rawRpc('eth_getTransactionCount', [wallet.address, 'pending']), 16);
  const gasPrice = BigInt(await rawRpc('eth_gasPrice', []));

  const tx = {
    type: 0,
    nonce,
    gasPrice,
    gasLimit: parseInt(gasEstimate, 16) || 8000000,
    data: deployData,
    chainId: 15000,
  };

  console.log('Signing tx...');
  const signed = await wallet.signTransaction(tx);
  console.log('Signed tx (first 40 chars):', signed.slice(0, 40));
  console.log('Signed tx length:', signed.length);

  // Send
  console.log('Sending tx...');
  const txHash = await rawRpc('eth_sendRawTransaction', [signed]);
  console.log('TX hash:', txHash);

  // Wait
  console.log('Waiting for receipt...');
  const receipt = await waitForReceipt(txHash, 300000);
  if (receipt) {
    console.log('Status:', receipt.status);
    console.log('Contract:', receipt.contractAddress);
    console.log('Block:', parseInt(receipt.blockNumber));
  } else {
    console.log('TIMEOUT - tx not mined after 5 minutes');
    // Check if tx exists
    const txData = await rawRpc('eth_getTransactionByHash', [txHash]);
    console.log('TX on chain:', txData ? 'yes' : 'no');
  }

  process.exit(0);
}

main().catch(e => { console.error('FAILED:', e); process.exit(1); });
