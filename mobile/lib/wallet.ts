import * as SecureStore from 'expo-secure-store';
import { quais } from 'quais';

const WALLET_KEY = 'qicash_wallet_v1';
const PRICE_CACHE_KEY = 'qicash_quai_price';
const PRICE_CACHE_TTL = 10_000; // 10 seconds

export interface QiCashWallet {
  address: string;
  privateKey: string;
  mnemonic: string;
  serializedQuaiWallet: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string; // in QUAI
  timestamp: number;
  blockNumber: number;
  type: 'sent' | 'received';
  status: 'success' | 'pending' | 'failed';
}

export const QUAI_RPC = process.env.EXPO_PUBLIC_RPC_URL || 'https://rpc.quai.network/cyprus1';
export const CHAIN_ID = parseInt(process.env.EXPO_PUBLIC_CHAIN_ID || '9', 10);
export const EXPLORER_URL = process.env.EXPO_PUBLIC_EXPLORER_URL || 'https://quaiscan.io';
export const BLIP_URL = process.env.EXPO_PUBLIC_BLIP_URL || 'https://blippay.me';
export const FAUCET_URL = process.env.EXPO_PUBLIC_FAUCET_URL || '';
export const HUB_ADDRESS = process.env.EXPO_PUBLIC_HUB_ADDRESS || '0x0000000000000000000000000000000000000000';
export const REGISTRY_ADDRESS = process.env.EXPO_PUBLIC_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000';

export async function rpcCall(method: string, params: any[] = []): Promise<any> {
  const data = JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() });
  const res = await fetch(QUAI_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC ${method}: ${JSON.stringify(json.error)}`);
  return json.result;
}

export async function getBalanceRaw(address: string): Promise<bigint> {
  const hex = await rpcCall('eth_getBalance', [address, 'latest']);
  return BigInt(hex);
}

export async function getQuaiPrice(): Promise<number> {
  try {
    const cached = await SecureStore.getItemAsync(PRICE_CACHE_KEY);
    if (cached) {
      const { price, ts } = JSON.parse(cached);
      if (Date.now() - ts < PRICE_CACHE_TTL) return price;
    }
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=quai-network&vs_currencies=usd'
    );
    const json = await res.json();
    const price = json?.quai-network?.usd ?? 0;
    if (price > 0) {
      await SecureStore.setItemAsync(
        PRICE_CACHE_KEY,
        JSON.stringify({ price, ts: Date.now() })
      );
      return price;
    }
    // Fallback: try quai.red
    const res2 = await fetch('https://quai.red/api/price');
    const json2 = await res2.json();
    const price2 = json2?.usd ?? json2?.price ?? 0;
    if (price2 > 0) {
      await SecureStore.setItemAsync(
        PRICE_CACHE_KEY,
        JSON.stringify({ price: price2, ts: Date.now() })
      );
      return price2;
    }
    return 0;
  } catch {
    return 0;
  }
}

export async function sendQuai(
  privateKey: string,
  to: string,
  amountQuai: number
): Promise<{ hash: string }> {
  const provider = new quais.JsonRpcProvider(QUAI_RPC, CHAIN_ID);
  const wallet = new quais.Wallet(privateKey, provider);

  const valueWei = quais.parseQuai(amountQuai);
  const tx = await wallet.sendTransaction({ to, value: valueWei });
  return { hash: tx.hash };
}

export async function getTransactionHistory(
  address: string
): Promise<Transaction[]> {
  try {
    const res = await fetch(
      `https://quaiscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=50`
    );
    const json = await res.json();
    if (json.status !== '1' || !Array.isArray(json.result)) return [];

    return json.result.map((tx: any) => {
      const isSent = tx.from.toLowerCase() === address.toLowerCase();
      const valueQuai = parseFloat(quais.formatQuai(tx.value));
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: valueQuai.toFixed(4),
        timestamp: parseInt(tx.timeStamp) * 1000,
        blockNumber: parseInt(tx.blockNumber),
        type: isSent ? 'sent' : 'received',
        status: tx.txreceipt_status === '1' ? 'success' : 'failed',
      } as Transaction;
    });
  } catch {
    return [];
  }
}

function secureRandomBytes(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  return buf;
}

export async function createWallet(email: string): Promise<QiCashWallet> {
  const existing = await loadWallet();
  if (existing) return existing;

  const mnemonic = quais.Mnemonic.fromEntropy(secureRandomBytes(32));
  const phrase = mnemonic.phrase;

  const quaiHd = quais.QuaiHDWallet.fromMnemonic(mnemonic);
  const quaiAddressInfo = quaiHd.getNextAddressSync(0, quais.Zone.Cyprus1);
  const quaiAddress = quaiAddressInfo.address;
  const quaiPrivateKey = quaiHd.getPrivateKey(quaiAddress);

  const wallet: QiCashWallet = {
    address: quaiAddress,
    privateKey: quaiPrivateKey,
    mnemonic: phrase,
    serializedQuaiWallet: JSON.stringify(quaiHd.serialize()),
  };

  await saveWallet(wallet);
  return wallet;
}

export async function saveWallet(wallet: QiCashWallet): Promise<void> {
  await SecureStore.setItemAsync(WALLET_KEY, JSON.stringify(wallet));
}

export async function loadWallet(): Promise<QiCashWallet | null> {
  const data = await SecureStore.getItemAsync(WALLET_KEY);
  if (!data) return null;
  return JSON.parse(data);
}

export async function deleteWallet(): Promise<void> {
  await SecureStore.deleteItemAsync(WALLET_KEY);
}

export function getShortAddress(address: string): string {
  if (!address || address.length < 10) return address || '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isQuaiAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

export function buildPaymentUri(params: {
  address: string;
  amount?: number;
  label?: string;
  message?: string;
}): string {
  const { address, amount, label, message } = params;
  let uri = `quai:${address}`;
  const queryParts: string[] = [];
  if (amount !== undefined) queryParts.push(`amount=${amount}`);
  if (label) queryParts.push(`label=${encodeURIComponent(label)}`);
  if (message) queryParts.push(`message=${encodeURIComponent(message)}`);
  if (queryParts.length > 0) uri += `?${queryParts.join('&')}`;
  return uri;
}

export function parsePaymentUri(uri: string): {
  address?: string;
  amount?: number;
  label?: string;
  message?: string;
} | null {
  try {
    const cleaned = uri.replace(/^(quai:|qi:)/, '');
    const [addressPart, queryPart] = cleaned.split('?');
    const address = addressPart || undefined;
    const params: Record<string, string> = {};
    if (queryPart) {
      queryPart.split('&').forEach((pair) => {
        const [key, value] = pair.split('=');
        if (key && value) params[decodeURIComponent(key)] = decodeURIComponent(value);
      });
    }
    return {
      address,
      amount: params.amount ? parseFloat(params.amount) : undefined,
      label: params.label,
      message: params.message,
    };
  } catch {
    return null;
  }
}
