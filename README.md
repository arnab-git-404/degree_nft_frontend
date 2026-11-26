# DegreeNFT — Web App

The DegreeNFT web app is where colleges issue academic credentials as NFTs on Solana, students claim them into their own wallets, and anyone can verify them.

This folder holds only the React frontend. It needs the API in `../degree_nft_backend` to run. The public marketing site is in `../degree_nft_website`.

## How it works

- **Platform (Super Admin):** approves college applications, creates each college's on-chain collection, and sets the global credential price.
- **College:** manages staff and roles, programs, batches, students and enrollments. It prepays a balance in SOL or USDC and approves credentials, wallet recoveries and burns.
- **Student:** gets an email invite, links a wallet, and claims credentials. The college pays for the mint, so the student needs no SOL.
- **Anyone:** checks a credential at `/verify/:assetAddress`, which needs no login.

Credentials are Metaplex Core assets, one collection per college, and they are soulbound. All minting happens on the backend. The frontend only signs in, signs approvals, and shows on-chain state.

## Tech stack

- React 19 + Vite 6
- Tailwind CSS 4, with a scoped `.css` file per page
- React Router 7
- Solana wallet adapter + `@solana/web3.js`
- axios, react-hot-toast, lucide-react, exceljs (sheet import/export), qrcode.react

## Getting started

Requires Node 18+ and the backend running locally (port `5001` by default).

```bash
npm install
cp .env.example .env   # then edit the values
npm run dev            # http://localhost:5173
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_APP_SERVER_URL` | yes | Backend API base URL, e.g. `http://localhost:5001/api` |
| `VITE_SOLANA_NETWORK` | no | `devnet` (default) or `mainnet`. Must match the backend's `SOLANA_CLUSTER`. |
| `VITE_SOLANA_RPC_URL` | no | Your own RPC provider (Helius, QuickNode, …). Defaults to the public RPC for the network. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Project structure

```
src/
  AppRoutes.jsx      all routes and their permission guards
  context/           AuthContext (wallet + email sign-in, memberships), SolanaContext
  layouts/           AdminLayout (Super Admin shell)
  components/        shared UI (Button, Input, Navbar, AppSidebar, ProtectedRoute, ...)
    admin/           page header, toolbar, StatusBadge
    CatalogPage/     list pages: stat cards, toolbar, Select
    FormFields/      ColorField, StatusCards, FormPreview
    SheetImport/     Excel import/export
    StaffManager/    staff and role assignment
    nft/             CredentialCard
  hooks/             useAdminList
  lib/               api client, roles/permissions, Solana helpers, sheet helpers
  pages/             one folder per page: Page.jsx + Page.css
    admin/           Super Admin pages (/admin/*)
```

## Main routes

| Path | Who | Page |
|---|---|---|
| `/login`, `/activate/:token`, `/apply/:token` | public | Sign in, activate an account, apply as a college |
| `/claim/:token`, `/recover/:token` | student | Claim a wallet invite, prove a new wallet for recovery |
| `/verify/:assetAddress` | public | Credential verification |
| `/student` | student | Student dashboard and credential claim |
| `/institution/*` | college staff | Dashboard, students, enrollments, programs, batches, credentials, approvals |
| `/administration/*` | college admin | Staff, roles, billing, settings, activity |
| `/batch-upload` | college staff | Bulk upload from a spreadsheet |
| `/admin/*` | Super Admin | Institutions, users, roles, credentials, applications, reports, settings |
| `/faucet` | anyone | Links to get Devnet SOL for testing |

Each page is gated by permissions (see `src/lib/roles.js` and `ProtectedRoute`), not by fixed role names.

## UI conventions

- Records are **Active** or **Inactive**. There is no delete; every record has an Edit option.
- Inactive is always shown in red.
- Create forms open in a modal and set a colour automatically, which can be changed.

## Deployment

The app is deployed on Vercel. `vercel.json` sends every route to `index.html` so deep links work. Set the same `VITE_*` variables in the Vercel project. To switch to Mainnet, set `VITE_SOLANA_NETWORK=mainnet` here and `SOLANA_CLUSTER=mainnet` on the backend together.
