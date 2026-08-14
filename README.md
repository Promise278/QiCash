# QiPay

**Privacy-first campus payments on Quai Network.**

QiPay makes everyday digital payments as simple as cash — and as private as
cash — for students and small vendors on African campuses. A student scans a
vendor's QR code, pays in **native QI**, and the sale is done. Nobody —
neither the network nor an onlooker — can see *who bought what, for how much,
from whom*.

The privacy is not an "extra layer bolted on." It is the product. QiPay is
built around QI's cash-like properties (UTXO ledger, fixed denominations,
prohibition of address reuse) and turns them into a QR checkout that hides the
*content* of every transaction from the public ledgers that settle it.

---

## Table of contents

1. [The problem](#the-problem)
2. [The experience](#the-experience)
3. [Why QI and Quai Network](#why-qi-and-quai-network)
4. [How a payment actually works](#how-a-payment-actually-works)
5. [The privacy model](#the-privacy-model)
6. [Architecture](#architecture)
7. [Security model](#security-model)
8. [Security hardening log](#security-hardening-log)
9. [Honest limitations](#honest-limitations)
10. [Getting started](#getting-started)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Roadmap](#roadmap)

---

## The problem

Students and campus vendors face a stack of payment problems:

- **Digital payments expose your life.** Payment apps record every transaction
  — what shop, what amount, what time — and link it to your identity.
- **Fees eat small purchases.** Percentage fees that barely matter on a big
  transfer are significant on a plate of food.
- **Cash is inconvenient and unsafe.** Change, queues, theft, and no digital
  record.
- **Crypto wallets are unusable for normal people.** Addresses, networks,
  gas, seed phrases, linkable activity — none of it belongs in a lunch queue.

There is a gap between cash (private, simple, ubiquitous) and digital payments
(convenient, but surveilled).

## The experience

**Student:** open QiPay → select the campus item → scan the vendor's QR → pay →
confirmed. **Vendor:** create a payment request → display the QR → detect the
payment → complete the sale.

Choose, scan, pay, confirmed. All blockchain complexity stays behind the
interface.

## Why QI and Quai Network

Quai describes QI as a UTXO-based ledger with **fixed denominations** and
**restrictions on address reuse**, giving it cash-like privacy. QiPay converts
those protocol-level properties into a practical payment experience:

| Conventional blockchain payment | QiPay using QI on Quai |
|---------------------------------|------------------------|
| Public addresses and activity are linkable, especially with address reuse | QI's design prohibits address reuse, supporting a cash-like privacy model |
| Privacy requires extra application or protocol layers | Privacy-oriented transaction behavior is part of QI's design |
| Users must understand wallets, addresses, networks, gas | A familiar QR checkout handles everything underneath |
| The blockchain is a settlement rail | The QI privacy model *is* the value proposition |

This "privacy by asset design" is what makes QiPay different from yet another
crypto payments wrapper.

---

## How a payment actually works

Five steps, two ledgers, one purpose: a payment that is *verifiable where it
needs to be* and *invisible everywhere else*.

1. **The vendor creates an invoice (on-chain, public).**
   The vendor's app builds a payment request containing the secret values —
   the amount, a *fresh* Qi payout address (used once, never again), a random
   salt of at least 128 bits, and an expiry — then hashes the whole thing and
   publishes only the 32-byte **commitment** to the `QiPayPaymentHub`
   (`createInvoice`). The plaintext never touches the chain.

2. **The QR code is the plaintext.**
   The vendor shows a QR encoding the full preimage. It exists only between the
   vendor's phone and the student's phone. Whoever scans it sees the amount
   and the payout address; the network sees only the hash from step 1.

3. **The student's app verifies without publishing (read-only).**
   The app recomputes the hash from the QR and checks it against the chain via
   `verifyPaymentRequest` — an `eth_call` (a read, not a transaction). The
   invoice must exist, be unexpired, belong to a vendor that is still
   **Active**, and point at a valid Qi-ledger payout address. A forged or
   swapped QR hashes to nothing and the app **refuses before any value
   moves** — that is the anti-QR-substitution defense.

4. **The student pays in native QI (off-chain, private).**
   The student sends native QI directly to the vendor's Qi address — a UTXO
   transfer that never touches the smart contract, never costs the student
   QUAI gas, and goes to an address that has never been used before. In the
   happy path, the student's own address never appears anywhere on-chain.

5. **The vendor attests settlement (on-chain, dispute-able).**
   The vendor records a **sealed reference** — a hash of the QI transaction id
   plus the invoice commitment — so the sale gets a public receipt without
   publishing the raw txid (which would link the vendor's identity to specific
   QI transactions).

If something goes wrong, either party can open a **dispute**, which an arbiter
rules on within a bounded window, and which can never be locked or evaded (see
[Security hardening log](#security-hardening-log)).

---

## The privacy model

The core promise: **no one can learn how much you paid for your Indomie, who
sold it to you, or where it went.** Here is exactly how, layer by layer.

### What the public ledgers see

| On the smart-contract ledger (public) | On the QI UTXO ledger (public) |
|---------------------------------------|-------------------------------|
| A 32-byte commitment hash | That *some* QI payment occurred |
| The `vendorId` — itself a hash of (campus, slug), not a name | Its value (QI amounts are fixed-denomination and visible) |
| Invoice expiry and timestamps | |
| Dispute records, *if* someone escalates | |

The vendor's readable name and stall details live off-chain behind
`metadataHash`; no amount, payout address, or item description ever reaches
either ledger.

### Why the chain cannot reveal the amount

Campus prices are low-entropy — "¥2,000, ¥1,500", a handful of familiar
values. An observer who sees a commitment hash could in principle guess each
candidate amount and check. That is why every request carries a **salt**: 128+
bits of CSPRNG randomness, fresh per invoice, mixed into the hash. Guessing the
amount is only useful if you can also guess the salt, which is
computationally infeasible. **The salt is the lock.** (See
[Honest limitations](#honest-limitations) for who guarantees it.)

### Why payments cannot be linked together

QI forbids address reuse, and QiPay generates a **fresh payout address per
invoice** on the vendor side. Two payments cannot be joined by a shared
address — a series of Indomie purchases looks like cash from a new pocket to
a new pocket every morning, not a pattern.

### Why the student is invisible

In the happy path the student never sends a blockchain transaction of their
own — they only read (verification) and then pay off-chain. Their address
appears on no public record unless they choose to dispute.

### The deliberate exception: disputes

A dispute requires the full preimage, and publishing it reveals the amount and
payout address to the arbiter. Privacy is traded for recourse, *only when*
someone escalates. Nothing is revealed in the normal course of business, and
the QR is the only place the preimage ever exists.

---

## Architecture

```
Qicash/
├── contracts/                 # Smart contracts + tests (Hardhat, Solidity 0.8.19)
│   ├── contracts/
│   │   ├── QiPayPaymentHub.sol        # Invoices, verification, attestation, disputes
│   │   ├── QiPayVendorRegistry.sol    # Root of trust: vendor whitelist + attestor keys
│   │   ├── access/QiPayAccessControl.sol  # Roles, admin handover, pause
│   │   ├── libraries/QuaiAddress.sol  # Quai shard / ledger-flag validation
│   │   └── interfaces/                # Consumable read surfaces
│   └── test/                  # 187 tests, incl. JS↔Solidity hash parity
├── mobile/                    # Student & vendor app (Expo 54, expo-router, NativeWind)
└── frontend/                  # Web dashboard (Next.js 16, App Router)
```

### Contract roles

| Contract | Responsibilities |
|----------|------------------|
| `QiPayPaymentHub` | Publishes invoice commitments, serves `verifyPaymentRequest` verdicts, records settlement attestations, runs the dispute lifecycle |
| `QiPayVendorRegistry` | Onboards vendors, binds attestor keys (one key = one vendor), suspend / revoke / rotate, metadata hashes only |
| `QiPayAccessControl` | Non-hierarchical roles, two-step admin handover, last-admin guard, pausable |
| `QuaiAddress` | Rejects zero, wrong-ledger or wrong-shard addresses before value can be sent to them |

> **These contracts never hold or move value** — native QI cannot be received
> by Quai's EVM, and wrapping it would destroy the privacy (Quai states Qi↔WQi
> swaps are transparent and lock outputs for two weeks). The design therefore
> makes the contracts the *trust and accountability* layer of an off-chain,
> cash-like payment.

---

## Security model

The design's security ladder, bottom to top:

1. **No custody, no theft surface.** No `receive`/`fallback`, no external
   calls, no reentrancy surface, no token approvals. The worst an attacker can
   do on-chain is *grief*, not *steal*.
2. **Anti-QR-substitution** (the dominant real-world QR fraud): a payment is
   refused unless the scanned preimage resolves to a real invoice from an
   Active vendor. Taping a phony QR over a stall does nothing — the fake
   request has no invoice behind it.
3. **Replay-proof commitments.** Every commitment binds the chain id and the
   hub's own address, so a QR captured on Orchard cannot be replayed against
   mainnet or against a redeployed hub.
4. **DoS-resistant storage.** Invoice keys are namespaced by vendor
   (`keccak256(vendorId, commitment)`), so an attacker cannot squat a pending
   commitment to brick a vendor's invoices.
5. **Address validation at the edge.** Payout addresses are checked to be
   Qi-ledger addresses in the active shard — a wrong-ledger or zero address
   would silently burn funds, so it is refused before paying.
6. **Careful governance.** Roles are non-hierarchical (an admin must
   explicitly grant itself operational roles), the last admin can never be
   removed, handover is two-step (propose + accept from the new key), and
   vendor revocation is terminal — a known-fraud vendor cannot be quietly
   restored.
7. **Pause that cannot harm consumers.** Halting is scoped to *new* invoices;
   settlement and disputes stay open, so a pause can never strand a student
   who already paid.

---

## Security hardening log

What was found in review, and what was changed. This history is kept in the
repo so the fixes are auditable.

### 1. The money-or-receipt hole (critical, fixed)

**The flaw.** `cancelInvoice` worked on any `Open` invoice, and disputes were
only possible on `Open` or `Settled` ones. The smart contract cannot tell an
"nobody paid, void it" cancellation from a "I got the money, now remove the
receipt" cancellation. So a dishonest vendor could take a student's QI
off-chain, cancel the invoice on-chain, and the student would have **zero
on-chain recourse** — `Cancelled` was not disputable.

**The fix.** `openDispute` now accepts `Cancelled` invoices
(`QiPayPaymentHub.sol`). A cancellation no longer erases the receipt — it
simply *starts the dispute clock* (anchored at the cancellation time). A
student who was paid-and-cancelled can open a dispute exactly like a student
who was paid-and-ignored. The honest cost is small and deliberate: an arbiter
may occasionally have to establish whether a payment on a cancelled invoice
actually occurred.

**The test.** "THE FIX: a vendor who cancels after being paid cannot escape a
dispute" (`test/QiPayPaymentHub.test.js`) — cancels, then disputes, then
asserts the invoice reached `Disputed`.

### 2. Unverifiable expiry (medium, fixed)

**The flaw.** The commitment (inside the hash) contains an `expiresAt`, and
`createInvoice` also stores an `expiresAt` argument — and the two were never
compared. A buggy or malicious vendor could publish a QR that read "valid for
5 minutes" while the stored invoice stayed payable for the maximum TTL. The
code comment even claimed a mismatch was impossible; it was not.

**The fix.** `verifyPaymentRequest` now returns a new verdict,
`ExpiryMismatch`, whenever the QR's expiry disagrees with the stored invoice's
expiry — the app refuses before payment, regardless of which value is
"correct." The misleading comment was corrected.

### 3. Disputes that could lock forever (medium, fixed)

**The flaw.** Once a dispute was opened, only an arbiter could close it. A
lost, compromised, or inactive arbiter could leave the invoice stuck in
`Disputed` indefinitely — unresolved and unresolvable.

**The fix.** Added a bounded `arbitrationDeadline` (admin-set, clamped 1–90
days) and `expireDispute()`, callable by anyone once the deadline passes,
moving the invoice to a neutral terminal status (`ArbitrationExpired`) that
blames neither party. The invoice can then never be permanently locked.

### 4. Arbiter conflicts of interest (low, fixed)

**The fix.** An arbiter can no longer rule on a dispute they opened
themselves, and a vendor's own attestor can no longer arbitrate disputes
against that same vendor (`ArbiterIsComplainant`, `ArbiterRepresentsVendor`).

### 5. Missing test coverage for the core contract (process, fixed)

The hub — the most important contract — had no test file of its own, only a
3-line smoke test. A dedicated `test/QiPayPaymentHub.test.js` now exercises
the full state machine: the verification verdict matrix, all three dispute
windows (expiry / settlement / cancellation anchors), pause semantics,
arbiter conflicts, arbitration timeouts, vendor stats, and the privacy surface
(preimage must never appear in events or storage). Suite: **187 passing
tests**.

---

## Honest limitations

These are by design, and are stated rather than hidden:

- **The contract cannot cryptographically prove a payment happened.** QI is a
  UTXO ledger with no data field, so settlement attestation is the vendor
  asserting a fact, sealed — not a proof. `verifyPaymentRef` proves the vendor
  *committed* to a txid, not that funds moved. Dispute adjudication therefore
  rests on what parties reveal plus off-chain checks.
- **Dispute rulings cannot force refunds.** The contracts hold no funds, so an
  upheld ruling is a public, attributable, permanent record and a reputation
  penalty (`disputesUpheld`) — not an automatic transfer.
- **The privacy is only as strong as the client.** The contract cannot verify
  salt strength or payout-address freshness; the vendor app must generate a
  CSPRNG salt and a fresh address per invoice. A weak salt would let an
  observer brute-force amounts out of the public commitments.
- **Payments are visible as events, not as content.** Any blockchain is a
  public ledger; the existence and timing of commerce is visible. What is
  hidden is the *content*: who, what, how much, which address.
- **Disputes de-anonymize.** Opening one publishes the preimage and your
  address — the price of recourse.

---

## Getting started

**Contracts (the finished core):**

```shell
cd contracts
npm install
npm test        # 187 tests
```

**Mobile app (scaffold — SDK not yet wired):**

```shell
cd mobile
npm install
npx expo start
```

**Web dashboard (scaffold — landing page only):**

```shell
cd frontend
npm install
npm run dev
```

## Testing

```shell
cd contracts
npm test                 # full suite
npm run test:gas         # with gas report
npm run coverage         # instruction coverage
```

The suite mines real signers and deploy addresses that satisfy Quai's
Cyprus-1 address predicate rather than weakening the contracts, and includes
JS ↔ Solidity parity tests for every hash the client must reproduce — the
exact divergence that would silently break every payment in production.

## Deployment

Networks are configured in `hardhat.config.js` (Orchard testnet, chain 15000;
Cyprus-1 mainnet, chain 9; local node). Copy `.env.example` to `.env` set
`CYPRUS1_PK` / `RPC_URL`, then compile and deploy. The live deploy script
(`contracts/scripts/deploy.js` with Quaiscan metadata) is a tracked next step.

## Roadmap

1. **Shared SDK** — commitment hashing, QR payload encoding, CSPRNG salt,
   address freshness — with JS↔Solidity parity tests.
2. **Vendor app flow** — create invoice, display QR, detect native QI payment,
   attest settlement.
3. **Student app flow** — scan, verify (`eth_call`), pay native QI, confirm.
4. **Web dashboard** — onboarding, reputation (`getVendorStats`), arbiter
   tooling.
5. **Deploy to Orchard**, then a pilot on a partner campus.