# Demo guide

A 10-minute walkthrough of every key flow. Setup: see README quick start.

## Accounts (seeded, local only — change in production)

| Role | Email | Password | Notes |
| --- | --- | --- | --- |
| Admin | `admin@example.com` | `admin-demo-password` | Full admin + moderation |
| Trusted user | `trusted@example.com` | `trusted-demo-password` | Reputation 80 → in-range price edits publish instantly |
| New user | `newbie@example.com` | `newbie-demo-password` | Reputation 0 → reports need corroboration |

> **Since the enhancement pass:** the age gate is now an overlay (not a
> separate page); search results lead with a **Best price nearby** card;
> uncovered areas offer **“Request prices for this area”** (view demand at
> /admin/coverage); store pages have a **☆ Save** watchlist button (list on
> /account); SEO pages live at **/zyn-prices/60614**; admin gained
> **Coverage demand** and **Analytics** tabs. Database is now PostgreSQL —
> see README "Database setup".

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
5. Post a store note; as the other user, **report** it. Three reports from
   **distinct users** auto-hide it pending review (one person reporting
   repeatedly counts once). Authors can **edit** their notes — edited notes
   are labeled.
6. In **Price history** on any store page, click **report issue** on a row
   to flag a specific (even historical) observation; on a listed deal,
   **report issue** flags the deal as ended/wrong. Both land in the
   moderator review queue.
7. Click **Report a multi-can deal** ("buy 5, $1 off each") — deal reports
   are always moderator-reviewed before they appear.
8. **Save** a store (☆). When its price later changes (community publish,
   admin entry, or import), an in-app alert appears — bell in the header,
   list under /account. Your own reports also notify you when a moderator
   resolves them.

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
6. **/admin/review** — approve/reject pending price reports and community
   deal reports (rejections require a reason and cost the reporter
   reputation), uphold/dismiss observation flags (upholding invalidates the
   entry append-only) and deal flags (resolve as *ended* or *invalid*),
   restore/hide comments.
7. **/admin/settings** — every trust threshold lives here (corroborations
   required, trusted reputation, max price-change ratio, rate limits…), plus
   the append-only **audit log**.
8. **/admin/coverage** — demand by ZIP vs store/price coverage (expansion
   planning); **/admin/economics** — real coverage stats + a what-if calling
   cost calculator (initiates nothing); **/admin/stores** — duplicate scan
   button, a CSV export of current displayed prices, and per-store
   retire/restore (retired stores keep full history).

## 4. Proving the quality gates

```bash
npm test        # 122 unit/integration tests
npm run build   # production build
npm run e2e     # ~41 end-to-end checks incl. authz, import idempotency,
                # and the watchlist-alert trust loop
```
