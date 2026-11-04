# NicFinder

Location-based price comparison for nicotine pouches (ZYN pilot, Chicago).
An informational service for adults 21+ — **no sales, checkout, delivery, or
nicotine marketing**. Browse free; sign in to confirm or correct prices.

The site works like a calmer GasBuddy for pouches: search any US address or
ZIP, see nearby stores on a list or map, compare single-can prices and
multi-can deal pricing, and see exactly how fresh and trustworthy every
number is. Prices arrive by **file import** (CSV/XLSX from a future calling
system — see `IMPORT_CONTRACT.md`), by **community reports**, and by
**manual admin entry**. There is deliberately **no calling code** in this
application (`ELEVENLABS_CALLING_RESEARCH.md` covers that future workstream).

## Quick start

Requires Node 20+ (tested on 22). No paid services or API keys needed.

```bash
npm install
cp .env.example .env          # defaults work for local dev; set SESSION_SECRET
npx prisma migrate deploy     # creates prisma/dev.db (SQLite)
npm run db:seed               # product lines, demo users, Chicago store directory
npm run dev                   # http://localhost:3000
```

Then search **60614** (the Chicago pilot area). Demo accounts are listed in
`DEMO_GUIDE.md` (admin: `admin@example.com` / `admin-demo-password`).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | 51 unit/integration tests (isolated `prisma/test.db`) |
| `npm run e2e` | 20-check Playwright smoke test against a production build |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:seed` | Idempotent seed |
| `node scripts/make-sample-xlsx.mjs` | Regenerate the XLSX import sample |

## What's honest here (by design)

- Real Chicago stores from the exploratory research are listed as a
  **directory without prices** — the old spreadsheet is not evidence of
  current prices and is never shown as such.
- Synthetic prices appear only on clearly fictional "Demo …" stores, with a
  visible **demo data** badge and a site-wide banner (`DEMO_MODE` in `.env`).
- Unknown prices show as unknown. ZYN Ultra never inherits regular ZYN
  prices. Stale prices say they're stale. Outside covered areas you get a
  no-coverage message, never an invented result.

## Documentation map

| File | Contents |
| --- | --- |
| `PRODUCT_REQUIREMENTS.md` | Scope, user flows, edge cases |
| `ARCHITECTURE.md` | Data model, latest-price policy, security, Postgres path |
| `IMPORT_CONTRACT.md` | CSV/XLSX schema, aliases, validation, idempotency |
| `COMMUNITY_REPUTATION.md` | Trust scoring, publication rules, abuse defenses |
| `ELEVENLABS_CALLING_RESEARCH.md` | Future calling system research (no code) |
| `BUSINESS_RESEARCH.md` | Market/competitor/geo/financial research |
| `DECISIONS.md` | Assumptions and why |
| `PROGRESS.md` | Build status, how to resume |
| `DEMO_GUIDE.md` | Demo script with accounts |
| `ROADMAP.md` | Post-MVP priorities |

## Security & privacy notes

- Passwords: scrypt; sessions: random tokens stored hashed, httpOnly cookies.
- Google OAuth activates only when `GOOGLE_CLIENT_ID/SECRET` are set
  (`.env.example` documents the redirect URI). Without them the UI says so.
- Admin APIs check roles server-side on every route; the e2e suite verifies
  guests get 401/redirects.
- Never commit `.env`, database files, or the original research workbook
  (it contained credentials; `.gitignore` blocks `*.xlsx` outside
  `sample-data/`). Rotate any credentials that were in shared copies.

## Attribution

Map tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright)
contributors. ZIP centroids from [GeoNames](https://www.geonames.org/)
(CC BY 4.0). Street-address geocoding via the public Nominatim API
(throttled to 1 req/s and cached; disable with `NOMINATIM_ENABLED=false`).
