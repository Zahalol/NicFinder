# Decisions & assumptions

Running log of choices made autonomously, with reasoning. Reversible unless
noted.

## Product

1. **Working brand = "NicFinder"** — matches the repo name and the
   workbook's `NICfindER` idea; brand-neutral enough to add other pouch
   brands. No domain bought; availability not verified.
2. **Real stores ship without prices.** The workbook's April 2026 calls are
   not evidence of current prices; attaching any price to a real store
   would violate the honesty requirement. Real stores are a directory
   ("No price yet"); synthetic prices live only on fictional `isDemo`
   stores with visible badges + a site banner.
3. **Workbook store list sanitized & deduplicated** (27 unique from ~31
   rows): 801 W Addison's three rows (Shell/Circle K duplicates) became one
   "Shell / Circle K"; "Milito's" merged with the Mobil at 1106 W Fullerton
   (same phone); the two Exxons sharing a corporate phone were kept separate
   and seeded as an open DuplicateCandidate to demo the merge workflow.
   The `Links and Keys` sheet was never read into the repo; even the
   "no keys" workbook still contains 2 credential-like values — **owner
   should rotate anything that was in shared copies**.
4. **Age gate = 21+ interstitial cookie**, not ID verification — the norm
   for informational nicotine-adjacent sites; flagged for counsel in the
   research docs.
5. **Quantity selector fixed to 1/3/5/10** — covers observed deal shapes
   without a free-form input cluttering mobile.

## Technical

6. **Next.js 15 + Prisma + SQLite** per the brief's stated preference;
   prices as integer cents; Postgres path documented in ARCHITECTURE.md.
   (Next 15 chosen over 16 for ecosystem maturity with react-leaflet 5.)
7. **Custom session auth instead of NextAuth/Auth.js**: scrypt + hashed
   DB tokens is small, fully testable, has no beta-version churn, and the
   Google OAuth flow is ~80 lines implemented directly against Google's
   endpoints, active only when credentials exist. Honest config states
   required by the brief are easier this way.
8. **Geocoding without paid APIs**: bundled GeoNames ZIP centroids
   (CC BY 4.0, 41k rows, ~1.5 MB) for offline ZIP search + throttled,
   cached public Nominatim for street addresses. No API key, attribution
   in footer, `NOMINATIM_ENABLED=false` gives a fully offline demo.
9. **ExcelJS (read+write) instead of SheetJS** — maintained npm releases;
   papaparse for CSV.
10. **Import store-matching thresholds**: coords ≤75 m + name-bigram
    similarity ≥0.4; single-phone matches are overridden by conflicting
    address evidence (shared corporate lines exist in the real seed data).
    Ambiguity always flags rather than guesses.
11. **Latest price is computed, never stored** (append-only observations):
    makes reversal/moderation trivial and every displayed number
    explainable. Community publishes also mark the replaced observation
    SUPERSEDED for explicit authority.
12. **Reputation deltas** (+5 publish, +2 confirm, −3 stale confirm,
    −8 rejected, −15 abuse) are starting points; all *thresholds* are
    admin-configurable, deltas are constants in code (changing them
    retroactively would corrupt the audit trail).
13. **In-memory IP rate limiting for auth** is accepted for a
    single-process MVP; documented as a scale-out item.
14. **E2E uses the environment's preinstalled Playwright** via
    `createRequire` rather than pinning a browser download in deps; the
    script degrades with a clear message if Playwright is absent.
15. **Prisma's AI guard on `db push --force-reset`** respected: the test
    harness deletes its own throwaway `prisma/test.db` file and runs a
    plain non-destructive `db push` instead.
16. **No zod on the small route surface** — hand validation kept the
    dependency count down; revisit if the API grows.

## Research

17. Historical workbook economics (≈$0.07/call, $0.108/store) are treated
    as HISTORICAL and re-derived from Nov 2026 verified pricing in
    ELEVENLABS_CALLING_RESEARCH.md (base case ≈$0.19–0.20/observation with
    honest disclosure lengthening calls).
18. The historical "pose as a normal guy" agent prompt is **rejected**;
    the research doc specifies transparent automated-agent disclosure and
    flags TCPA wireless-consent as the gating legal risk requiring counsel
    before any calling.
