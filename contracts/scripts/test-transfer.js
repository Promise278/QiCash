const http = require('http');
const https = require('https');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const proxy = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const r = https.request({
      hostname: 'orchard.rpc.quai.network', port: 443, path: '/cyprus1', method: 'POST', family: 4, timeout: 60000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
    }, pres => {
      let d = '';
      pres.on('data', c => d += c);
      pres.on('end', () => { res.writeHead(200, {'Content-Type': 'application/json'}); res.end(d); });
    });
    r.on('timeout', () => { r.destroy(); res.writeHead(504); res.end('timeout'); });
    r.on('error', e => { res.writeHead(500); res.end(e.message); });
    r.write(body); r.end();
  });
});

function rpc(method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() });
    const req = http.request({ hostname: '127.0.0.1', port: 18545, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { const j = JSON.parse(d); if (j.error) reject(new Error(JSON.stringify(j.error))); else resolve(j.result); });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

proxy.listen(18545, '127.0.0.1', async () => {
  try {
    console.log('Proxy ready');

    const origFetch = globalThis.fetch;
    globalThis.fetch = async function(url, opts) {
      if (typeof url === 'string' && url.includes('orchard.rpc.quai.network')) {
        url = url.replace('https://orchard.rpc.quai.network', 'http://127.0.0.1:18545');
        if (opts && opts.agent) delete opts.agent;
      }
      return origFetch.call(this, url, opts);
    };

    const {quais} = require('quais');

    const PK = '0xa12a4fdf1a5c00e0968f8585ff9b0a339f6eab7dec10992547c3222f4a21e7d1';
    const ADMIN = '0x0042340a75f07D761ac5e61CcD140B7eb75692A4';
    const wallet = new quais.Wallet(PK);

    console.log('Deployer:', wallet.address);
    const bal = await rpc('eth_getBalance', [wallet.address, 'latest']);
    console.log('Balance:', (BigInt(bal) / 10n**18n).toString(), 'QUAI');

    // Test simple transfer with quais signTransaction
    console.log('\n=== Testing simple transfer ===');
    const tx = {
      type: 0,
      nonce: 0,
      gasPrice: BigInt(await rpc('eth_gasPrice', [])),
      gasLimit: 21000,
      to: ADMIN,
      value: quais.parseUnits('0.001', 18),
      chainId: 15000,
    };
    console.log('TX object built, signing...');
    const signed = await wallet.signTransaction(tx);
    console.log('Signed tx length:', signed.length);
    console.log('First 20 chars:', signed.slice(0, 20));

    const txHash = await rpc('eth_sendRawTransaction', [signed]);
    console.log('TX hash:', txHash);

    // Wait for receipt
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const receipt = await rpc('eth_getTransactionReceipt', [txHash]);
      if (receipt) {
        console.log('Receipt status:', receipt.status);
        console.log('Block:', parseInt(receipt.blockNumber));
        break;
      }
      process.stdout.write('.');
    }

    proxy.close();
    process.exit(0);
  } catch(e) {
    console.error('FAILED:', e.message);
    proxy.close();
    process.exit(1);
  }
});

setTimeout(() => { console.log('GLOBAL TIMEOUT'); process.exit(1); }, 300000);
