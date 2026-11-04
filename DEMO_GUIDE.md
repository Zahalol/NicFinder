# Demo guide

A 10-minute walkthrough of every key flow. Setup: see README quick start.

## Accounts (seeded, local only — change in production)

| Role | Email | Password | Notes |
| --- | --- | --- | --- |
| Admin | `admin@example.com` | `admin-demo-password` | Full admin + moderation |
| Trusted user | `trusted@example.com` | `trusted-demo-password` | Reputation 80 → in-range price edits publish instantly |
| New user | `newbie@example.com` | `newbie-demo-password` | Reputation 0 → reports need corroboration |

## 1. Guest browsing (no account)

1. Open http://localhost:3000 → the **21+ age gate** appears first. Enter.
2. Search **60614**. You'll see:
   - Fictional "Demo …" stores with synthetic prices and a **demo data** badge.
   - Real Chicago stores (Shell, bp, …) honestly showing **No price yet**.
   - A **5-can deal** badge on Demo Fuel Stop #1.
3. Toggle **List/Map** (map pins show prices; needs network for OSM tiles).
4. Set **Buying = 5**: Demo Fuel Stop #1's per-can price drops by $1.00
   (deal applied); sort by **price** and watch the ranking change — the
   1-can ranking is *not* affected by the deal.
5. Switch **ZYN → ZYN Ultra**: only stores with actual Ultra reports show
   prices; nothing inherits the regular price.
6. Open **Demo Station #6** — its price is >21 days old and labeled
   "may be outdated". **Demo Depot #7** shows "No recent price" (expired).
7. Search **10001** (New York): accepted nationwide, shows the honest
   **no coverage** state.

## 2. Community flows

1. Sign in as **newbie@example.com**. On a demo store, click
   **Report a different price** → submit e.g. `7.99`. Response: it needs
   corroboration (visible as *corroborating* in your account page).
2. Sign in as **trusted@example.com** (different browser or sign out), report
   the *same* price → it may publish immediately (if within ±50% of current)
   or count as corroboration of the pending report.
3. Try an absurd price (`24.99`) as any user → routed to moderator review.
4. Click **✓ Confirm current price** — note the confirm appears on the
   store card ("✓ 1 confirm"). You can't confirm twice, can't confirm your
   own report, and re-confirming the same store is rate-limited by cooldown.
5. Post a store note; as the other user, **report** it. Three reports
   auto-hide it pending review.

## 3. Admin flows (`admin@example.com`)

1. **/admin** — live metrics: stores with prices, stale counts, queue sizes,
   audit log.
2. **/admin/imports** — upload `sample-data/sample-import.csv` (or the
   `.xlsx` twin). The preview shows per-row outcomes:
   - fictional stores to be created, one **flagged** $99.99 row,
   - one **rejected** bad-date row, one in-file **duplicate** skipped.
   Edit column mapping if desired, then **Commit**. Search 60614 again —
   "Sample Mart Alpha (fictional)" now appears with prices.
3. Upload the **same file again** and commit: every row skips as a
   duplicate; store/observation counts don't change (idempotency).
4. On the batch page, **Reverse import** (give a reason): its observations
   are invalidated (history retained), orphan stores retire, search updates.
5. **/admin/stores** — resolve the seeded **possible duplicate** (two Exxons
   sharing a corporate phone): merge or dismiss. Add a manual price entry.
6. **/admin/review** — approve/reject pending price reports (rejections
   require a reason and cost the reporter reputation), restore/hide comments.
7. **/admin/settings** — every trust threshold lives here (corroborations
   required, trusted reputation, max price-change ratio, rate limits…).

## 4. Proving the quality gates

```bash
npm test        # 51 unit/integration tests
npm run build   # production build
npm run e2e     # 20 end-to-end checks incl. authz + import idempotency
```
