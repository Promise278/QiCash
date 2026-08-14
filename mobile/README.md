# QiPay Mobile

Student and vendor payment app for QiPay, built with **Expo 54**,
**expo-router** and **NativeWind** (Tailwind CSS for React Native).

**Status: scaffold.** The app currently consists of the default Expo tabs —
home, explore, profile, wallet — plus a modal. None of the QiPay SDK (QR
generation, commitment computation, `eth_call` verification, native QI payment)
is wired in yet. That is the next build step; the contracts it must talk to are
finished and tested in `contracts/`.

## Getting started

```shell
npm install
npx expo start        # then press a / i / w for Android, iOS, or web
```

Or run directly:

```shell
npm run android       # expo start --android
npm run ios           # expo start --ios
npm run web           # expo start --web
```

## Scripts

| Script | What it does |
|--------|--------------|
| `npm start` | Expo dev server |
| `npm run android` / `ios` / `web` | Dev server for a platform |
| `npm run lint` | ESLint (expo config) |
| `npm run reset-project` | Reset to bare scaffold (one-way) |

## Project structure

```
app/
  _layout.tsx       # Root stack layout
  (tabs)/           # Bottom tabs
    index.tsx       # Home
    explore.tsx
    profile.tsx
    wallet.tsx
  modal.tsx         # Modal route
  global.css        # NativeWind styles
```

## Planned flows

**Student:** select item → scan vendor QR → recompute commitment locally →
`verifyPaymentRequest` via `eth_call` (never a transaction) → pay native QI →
confirmation.

**Vendor:** create invoice (fresh Qi payout address per invoice, CSPRNG salt
≥128 bits) → display QR → watch for the native QI payment → `attestSettlement`
→ complete the sale.

## Security notes for the SDK work

The mobile app is where QiPay's privacy and anti-fraud properties actually live:

- Always call `verifyPaymentRequest` as a **read**; sending it as a transaction
  publishes the preimage to public calldata.
- Generate `salt` from a CSPRNG, fresh per invoice — a weak salt lets anyone
  brute-force the amount and payout address out of the on-chain commitment.
- Never generate two invoices with the same payout address; address reuse is
  what the cash-like privacy model depends on breaking.
- Verify the hub and registry addresses you call are the genuine deployed ones.