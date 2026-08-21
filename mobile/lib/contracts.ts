import { quais } from 'quais';
import { QUAI_RPC, CHAIN_ID } from './wallet';

const HUB_ADDRESS = process.env.EXPO_PUBLIC_HUB_ADDRESS || '0x0000000000000000000000000000000000000000';
const REGISTRY_ADDRESS = process.env.EXPO_PUBLIC_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000';

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

const COMMIT_DOMAIN = quais.keccak256(quais.toUtf8Bytes('QiCash:InvoiceCommitment:v1'));
const SEAL_DOMAIN = quais.keccak256(quais.toUtf8Bytes('QiCash:SealedPaymentRef:v1'));

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

export enum VendorStatus {
  None = 0,
  Active = 1,
  Suspended = 2,
  Revoked = 3,
}

function getProvider(): quais.JsonRpcProvider {
  return new quais.JsonRpcProvider(QUAI_RPC, CHAIN_ID);
}

function getHubContract(provider?: quais.Provider): quais.Contract {
  const p = provider || getProvider();
  return new quais.Contract(HUB_ADDRESS, HUB_ABI, p);
}

function getRegistryContract(provider?: quais.Provider): quais.Contract {
  const p = provider || getProvider();
  return new quais.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, p);
}

export function computeCommitmentJS(
  req: PaymentRequest,
  chainId: bigint,
  hubAddress: string
): string {
  return quais.keccak256(
    quais.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint256', 'address', 'bytes32', 'address', 'uint256', 'uint8', 'bytes32', 'uint40'],
      [COMMIT_DOMAIN, chainId, hubAddress, req.vendorId, req.qiPayoutAddress, req.amount, req.denomination, req.salt, req.expiresAt]
    )
  );
}

export function computeSealedRefJS(commitment: string, qiTxHash: string, salt: string): string {
  return quais.keccak256(
    quais.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'bytes32', 'bytes32', 'bytes32'],
      [SEAL_DOMAIN, commitment, qiTxHash, salt]
    )
  );
}

export function invoiceKeyJS(vendorId: string, commitment: string): string {
  return quais.keccak256(
    quais.AbiCoder.defaultAbiCoder().encode(['bytes32', 'bytes32'], [vendorId, commitment])
  );
}

export function vendorIdOf(campus: string, slug: string): string {
  return quais.keccak256(
    quais.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'bytes32'],
      [quais.id(campus), quais.id(slug)]
    )
  );
}

export function generateSalt(): string {
  return quais.hexlify(quais.randomBytes(32));
}

export async function verifyPaymentRequest(req: PaymentRequest): Promise<{
  result: VerificationResult;
  commitment: string;
  key: string;
}> {
  const hub = getHubContract();
  const [result, commitment, key] = await hub.verifyPaymentRequest([
    req.vendorId,
    req.qiPayoutAddress,
    req.amount,
    req.denomination,
    req.salt,
    req.expiresAt,
  ]);
  return { result: Number(result) as VerificationResult, commitment, key };
}

export async function getInvoice(vendorId: string, commitment: string) {
  const hub = getHubContract();
  return await hub.getInvoice(vendorId, commitment);
}

export async function getVendorInfo(vendorId: string) {
  const registry = getRegistryContract();
  return await registry.getVendor(vendorId);
}

export async function isActiveVendor(vendorId: string): Promise<boolean> {
  const registry = getRegistryContract();
  return await registry.isActiveVendor(vendorId);
}

export async function getVendorStats(vendorId: string) {
  const hub = getHubContract();
  return await hub.getVendorStats(vendorId);
}

export async function getVendorCount(): Promise<bigint> {
  const registry = getRegistryContract();
  return await registry.vendorCount();
}
