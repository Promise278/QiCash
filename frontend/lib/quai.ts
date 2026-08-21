import { quais } from 'quais';

export { quais };

export const QUAI_RPC = process.env.NEXT_PUBLIC_QUAI_RPC || 'https://orchard.rpc.quai.network/cyprus1';
export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '15000', 10);
export const HUB_ADDRESS = process.env.NEXT_PUBLIC_HUB_ADDRESS || '0x0000000000000000000000000000000000000000';
export const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000';
export const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://orchard.quaiscan.io';
export const BLIP_URL = process.env.NEXT_PUBLIC_BLIP_URL || 'https://blippay.me';
export const FAUCET_URL = process.env.NEXT_PUBLIC_FAUCET_URL || 'https://orchard.faucet.quai.network';

export const COMMIT_DOMAIN = quais.keccak256(quais.toUtf8Bytes('QiCash:InvoiceCommitment:v1'));
export const SEAL_DOMAIN = quais.keccak256(quais.toUtf8Bytes('QiCash:SealedPaymentRef:v1'));

const HUB_ABI = [
  'function computeCommitment(tuple(bytes32 vendorId, address qiPayoutAddress, uint256 amount, uint8 denomination, bytes32 salt, uint40 expiresAt) req) view returns (bytes32)',
  'function invoiceKey(bytes32 vendorId, bytes32 commitment) pure returns (bytes32)',
  'function computeSealedPaymentRef(bytes32 commitment, bytes32 qiTxHash, bytes32 salt) pure returns (bytes32)',
  'function verifyPaymentRequest(tuple(bytes32 vendorId, address qiPayoutAddress, uint256 amount, uint8 denomination, bytes32 salt, uint40 expiresAt) req) view returns (uint8 result, bytes32 commitment, bytes32 key)',
  'function getInvoice(bytes32 vendorId, bytes32 commitment) view returns (tuple(address complainant, uint8 status, uint40 expiresAt, uint40 statusChangedAt, bytes32 sealedPaymentRef))',
  'function getVendorStats(bytes32 vendorId) view returns (tuple(uint64 invoicesCreated, uint64 settlementsAttested, uint64 disputesOpened, uint64 disputesUpheld))',
  'function COMMIT_DOMAIN() view returns (bytes32)',
  'function SEAL_DOMAIN() view returns (bytes32)',
  'function maxInvoiceTtl() view returns (uint40)',
  'function disputeWindow() view returns (uint40)',
];

const REGISTRY_ABI = [
  'function getVendor(bytes32 vendorId) view returns (tuple(address attestor, uint8 status, uint40 registeredAt, uint40 statusChangedAt, bytes32 metadataHash))',
  'function vendorStatus(bytes32 vendorId) view returns (uint8)',
  'function isActiveVendor(bytes32 vendorId) view returns (bool)',
  'function vendorIdOf(address attestor) view returns (bytes32)',
  'function resolveActiveVendor(address attestor) view returns (bytes32 vendorId)',
  'function vendorCount() view returns (uint256)',
];

export interface PaymentRequest {
  vendorId: string;
  qiPayoutAddress: string;
  amount: bigint;
  denomination: number;
  salt: string;
  expiresAt: number;
}

export enum InvoiceStatus {
  None = 0,
  Open = 1,
  Settled = 2,
  Cancelled = 3,
  Disputed = 4,
  Refunded = 5,
  DisputeRejected = 6,
  ArbitrationExpired = 7,
}

export enum VerificationResult {
  Payable = 0,
  InvoiceNotFound = 1,
  VendorNotActive = 2,
  InvoiceNotOpen = 3,
  InvoiceExpired = 4,
  InvalidQiPayoutAddress = 5,
  InvalidDenomination = 6,
  ExpiryMismatch = 7,
}

export function getProvider(): quais.JsonRpcProvider {
  return new quais.JsonRpcProvider(QUAI_RPC, CHAIN_ID);
}

export function getHubContract(signerOrProvider?: quais.Signer | quais.Provider): quais.Contract {
  return new quais.Contract(HUB_ADDRESS, HUB_ABI, signerOrProvider || getProvider());
}

export function getRegistryContract(signerOrProvider?: quais.Signer | quais.Provider): quais.Contract {
  return new quais.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signerOrProvider || getProvider());
}

export function computeCommitmentJS(
  req: PaymentRequest,
  chainId: bigint,
  hubAddress: string,
): string {
  return quais.keccak256(
    quais.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint256', 'address', 'bytes32', 'address', 'uint256', 'uint8', 'bytes32', 'uint40'],
      [COMMIT_DOMAIN, chainId, hubAddress, req.vendorId, req.qiPayoutAddress, req.amount, req.denomination, req.salt, req.expiresAt],
    ),
  );
}

export function generateSalt(): string {
  return quais.hexlify(quais.randomBytes(32));
}

export function getShortAddress(address: string): string {
  if (!address || address.length < 10) return address || '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isQiAddress(address: string): boolean {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return false;
  const bytes = quais.getBytes(address);
  return (bytes[1] & 0x80) !== 0;
}

export function isQuaiAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

export function vendorIdOf(campus: string, slug: string): string {
  return quais.keccak256(
    quais.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'bytes32'],
      [quais.id(campus), quais.id(slug)],
    ),
  );
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
