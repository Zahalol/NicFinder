# Screenshot tour

Captured 2026-11-05 from a production build of `main` against a freshly
seeded database, so everything shown is demo data. Fictional "Demo" stores
carry synthetic prices; real directory stores honestly show "No price yet".
Desktop shots are 1440×900 and mobile shots 390×844, both at 2× scale.

**Retaking them:** `node scripts/capture-screenshots.mjs` regenerates every
image in this folder. Run it after `npm run build`, against a **new, empty**
database that you have migrated and seeded; the script header has the steps.
The file names below are the script's, so keep the two in sync.

## Visitor

| | |
|---|---|
| **21+ age gate.** A client overlay; the page behind it stays indexable and is `inert` until confirmed. | ![Age gate](01-age-gate.png) |
| **Home.** One-box search, "near me" and neighbourhood quick chips, latest price reports. | ![Home](02-home.png) |
| **Search, desktop.** List beside a sticky live map, best-price card, reliability tiers, "Priced only" and name filters, honest "Not carried" / "No price yet" states. | ![Search](03-search-desktop.png) |
| **Search at 5 cans.** Deal-aware per-can pricing re-ranks stores; unknown deal terms are never extrapolated. | ![5 cans](04-search-5-cans.png) |
| **Store detail.** Per-line prices with reliability, "What you'd pay" strip, mini-map, history sparkline, nearby alternatives, hours, notes. | ![Store](05-store-detail.png) |
| **Two-store compare** (`/compare`). Per-line prices and N-can deal math. | ![Compare](06-compare.png) |
| **ZIP landing page** (`/zyn-prices/60614`). Price summary tiles, best deal, Ultra column, FAQ structured data. | ![ZIP page](07-zip-landing-page.png) |
| **Covered areas index** (`/zyn-prices`). | ![Covered areas](08-covered-areas.png) |
| **Recent price drops** (`/price-drops`). | ![Price drops](09-price-drops.png) |
| **How NicFinder works** (`/how-it-works`). Data sources, freshness, reliability, verification. `/about` redirects here. | ![How it works](10-how-it-works.png) |
| **No coverage yet.** Nearest covered area plus a coverage request (Joliet, 60435). | ![No coverage](11-no-coverage.png) |

## Signed-in member

| | |
|---|---|
| **Search, signed in.** One-tap "Still this price?" and save-to-watchlist on result cards. | ![Signed-in search](12-search-signed-in.png) |
| **Confirm or report a price** on the store page. | ![Contribute](13-contribute.png) |
| **Account.** Price alerts, settings, watchlist with quick-compare, contribution history. | ![Account](14-account.png) |

## Admin

| | |
|---|---|
| **Overview.** Live metrics, queues, audit log. | ![Admin](15-admin-overview.png) |
| **Import preview.** Per-row outcomes for `sample-data/sample-import.csv`: accepted, flagged, rejected, duplicate. | ![Import preview](16-admin-import-preview.png) |
| **Review queue.** Disputes, deal reports, observation and deal flags, comments. | ![Review](17-admin-review.png) |
| **Collect prices.** The calling worksheet: tap-to-call, inline entry, availability-only facts. | ![Collect](18-admin-collect.png) |
| **Coverage demand.** Requests by ZIP, joined with store and price coverage. | ![Coverage](19-admin-coverage.png) |
| **Pilot economics.** Coverage stats plus a what-if call-cost calculator. | ![Economics](20-admin-economics.png) |
| **Analytics.** Price dispersion, freshness, contribution trends. | ![Analytics](21-admin-analytics.png) |
| **Settings.** Every trust threshold in one place. | ![Settings](22-admin-settings.png) |

## Mobile and dark mode

| | |
|---|---|
| **Mobile search** with the List/Map toggle. | ![Mobile search](23-mobile-search.png) |
| **Mobile map.** Price chips; faded chips are stale prices, dots are unpriced stores. | ![Mobile map](24-mobile-map.png) |
| **Mobile store page.** | ![Mobile store](25-mobile-store.png) |
| **Dark mode, search.** Follows the system preference, including the map tiles. | ![Dark search](26-dark-search.png) |
| **Dark mode, store page.** | ![Dark store](27-dark-store.png) |
