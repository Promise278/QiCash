# QiCash Frontend

Web dashboard for QiCash, built with **Next.js 16** (App Router), React 19 and
Tailwind CSS v4.

**Status: scaffold.** This app currently renders a single landing page
(`app/page.tsx`) with no QiCash functionality wired in yet. The dashboards for
vendor onboarding, reputation, and dispute administration are planned consumers
of the QiCash contracts (see `contracts/`).

## Getting started

```shell
npm install
npm run dev       # http://localhost:3000
```

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint (Next.js config) |

## Project structure

```
app/
  layout.tsx    # Root layout
  page.tsx      # Landing page
  globals.css   # Tailwind entry
```

## Planned integration

- Vendor onboarding (registry metadata, attestor registration)
- Reputation view (`getVendorStats` per vendor, dispute outcomes)
- Arbiter tooling (review disputes, `resolveDispute` / `expireDispute`)

Note: Next.js 16 has breaking changes relative to older versions; check the
bundled docs under `node_modules/next/dist/docs/` before writing app code.