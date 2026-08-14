# QiPay Contracts

Verification and accountability layer for QiPay campus payments, written for
Quai Network's EVM (Solidity `0.8.20` — the buildathon cap — pinned in every
contract, `evmVersion: "london"`).

**These contracts never hold or move value.** Native QI lives on Quai's UTXO
ledger, which smart contracts cannot receive; a contract-compatible escrow would
require wrapping QI, destroying the privacy and adding up to two weeks of
settlement. Instead the contracts provide exactly what an off-chain UTXO payment
cannot: a public, verifiable reason to trust a QR code, and a dispute-able
receipt.

## Contracts

| Contract | Role |
|----------|------|
| `contracts/QiPayPaymentHub.sol` | Invoices (commitments), verification, settlement attestation, disputes, arbiter |
| `contracts/QiPayVendorRegistry.sol` | Root of trust: whitelist of vendors, attestor keys, suspend / revoke / rotate |
| `contracts/access/QiPayAccessControl.sol` | Roles, two-step admin handover, circuit breaker (pause) |
| `contracts/libraries/QuaiAddress.sol` | Quai shard / ledger-flag bit validation for addresses |
| `contracts/interfaces/IQiPayVendorRegistry.sol` | Read surface the hub and clients consume |

## The flow

1. **`createInvoice(commitment, expiresAt)`** — an Active vendor's attestor
   publishes a 32-byte hash of (domain, chainId, hub, vendorId, payout address,
   amount, denomination, salt, expiry). The preimage never enters calldata.
2. **`verifyPaymentRequest(req)`** — read-only. The student's app recomputes the
   commitment from the scanned QR and gets a precise verdict: payable, or one of
   `InvoiceNotFound`, `VendorNotActive`, `InvoiceNotOpen`, `InvoiceExpired`,
   `ExpiryMismatch`, `InvalidQiPayoutAddress`, `InvalidDenomination`. A forged QR
   is refused before any value moves.
3. Payment is sent by the student in **native QI directly to the vendor** —
   off-chain, private, no QUAI gas.
4. **`attestSettlement(commitment, sealedPaymentRef)`** — the vendor records a
   sealed reference (`keccak256(SEAL_DOMAIN, commitment, qiTxHash, salt)`), never
   a raw txid, so the vendor's Quai identity stays unlinked to specific QI
   transactions.
5. **Disputes** — opened by anyone holding the preimage (the student, or anyone
   who saw the QR), within a bounded window, including against **cancelled**
   invoices so a vendor cannot void the receipt after taking payment. Arbiters
   rule with conflict-of-interest guards; if an arbiter stays silent past the
   `arbitrationDeadline`, anyone may call `expireDispute`.

## Security model

- **No custody**: no `receive`/`fallback`, no external calls, no reentrancy
  surface, no approvals, no HTLC. On-chain attacks are griefability, not theft.
- **Anti QR-substitution**: a commitment must resolve to a real invoice from an
  Active vendor before the app pays.
- **Commitments bind `chainId` and hub address** — no cross-chain or replay
  across redeployments.
- **Storage keys are namespaced by vendor** (`keccak256(vendorId, commitment)`)
  — no commitment-squatting DoS between vendors.
- **Privacy**: amounts and payout addresses exist only inside the commitment.
  The salt is load-bearing (campus amounts are low-entropy) and MUST be ≥128
  bits of CSPRNG randomness, fresh per invoice — the contract cannot verify
  this; the client owns it.
- **Honest limits**: the contract cannot cryptographically prove a QI payment
  occurred — settlement attestation is self-asserted and dispute rulings are
  reputation (the contract holds no funds to refund). Disputes de-anonymize the
  transaction by design.

## Testing

```shell
npm install
npm test                 # 187 tests: hub state machine, registry, access control, address library
npm run test:gas         # with gas report
npm run coverage
```

The test suite mines real signers and deploy addresses that satisfy Quai's
Cyprus-1 address predicate rather than weakening the contracts, and includes
JS ↔ Solidity parity tests for the commitment and sealed-ref hashing — the exact
divergence that would silently break every payment in production.

## Deployment

Networks are configured in `hardhat.config.js`:

| Network | RPC | Chain ID |
|---------|-----|----------|
| `orchard` (testnet) | `https://orchard.rpc.quai.network/cyprus1` | 15000 |
| `cyprus1` (mainnet) | `https://rpc.quai.network/cyprus1` | 9 |
| `quaiLocal` | `http://localhost:9200` | 1337 |

```shell
cp .env.example .env   # set CYPRUS1_PK and RPC_URL
npx hardhat compile
```

The live deploy flow (`scripts/deploy.js`, plus the optional
`@quai/hardhat-deploy-metadata` plugin for Quaiscan verification) is not
committed yet. For local verification, use Orchard's faucet:
`https://orchard.faucet.quai.network`.