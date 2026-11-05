# Running several sessions at once

Five Claude sessions once worked on this repo in parallel without
coordination. Merging them took a dedicated session: about 60 conflicting
code sections, eight features built twice, two migrations that both created
the same table, and docs that contradicted each other. This guide is how to
avoid that.

## Before starting the sessions

1. **Start every session from the latest `main`.** Give each one its own new
   branch; never reuse a branch whose PR has already merged.
2. **Give each session a distinct area and say which files it owns.** Good
   splits follow the code's seams:

   | Area | Typical files |
   |---|---|
   | Search experience | `src/app/search/`, `src/components/SearchResults.tsx`, `SearchBox.tsx`, `StoreMap.tsx` |
   | Store pages | `src/app/stores/[id]/` |
   | SEO pages | `src/app/zyn-prices/`, `src/app/sitemap.ts` |
   | Admin tools | `src/app/admin/`, `src/app/api/admin/` |
   | Import pipeline | `src/lib/import/`, `src/app/api/imports/` |
   | Community and trust | `src/lib/reputation.ts`, `src/lib/comments.ts`, contribution APIs |
   | Security and platform | `src/middleware.ts`, `next.config.ts`, `src/lib/rate-limit.ts`, auth |
   | Research | `research/` only |

   Two sessions should never both be told "improve the UX" or "harden
   security" across the whole app: that is exactly how features got built
   twice.
3. **Put the boundary in the prompt**, for example: "You own
   `src/app/admin/`. Don't edit files outside it; if you need a change
   elsewhere, describe it in your PR instead."

## Files only one session should edit at a time

These conflict on almost every parallel change:

- `HANDOFF.md`, `DEVLOG.md`, `README.md`, `docs/DECISIONS.md`,
  `docs/ROADMAP.md`, `docs/PROGRESS.md`
- `docs/screenshots/` (every session retaking screenshots collides)
- `prisma/schema.prisma` and `prisma/migrations/`
- `scripts/e2e-smoke.mjs` (append checks at the end of a section, not in the
  middle)
- `package.json` / `package-lock.json`

Parallel sessions should put their notes in their PR description instead.
After the PRs merge, one session updates the shared docs from those notes.

**Schema changes:** let only one session change the database schema at a
time. Two sessions creating migrations in parallel produce two migrations
for the same table, which breaks a fresh deploy.

## While they run

- **Merge early and often.** A session that finishes opens a PR; merge it
  as soon as `verify` is green. Long-running sessions should merge the
  latest `main` into their branch every few hours, so conflicts stay small.
- **Don't send one session's work to another to "finish".** Old sessions
  don't know what merged after they started; start a fresh session from
  `main` instead.

## After they finish

1. Merge the PRs one at a time, smallest and least overlapping first,
   letting `verify` run between merges.
2. If two PRs conflict heavily, merge one, then ask a new session to bring
   the other up to date with `main` (merge, don't rebase).
3. Have one session refresh the shared docs (`HANDOFF.md`, `DEVLOG.md`,
   README counts, screenshots) from the merged PRs' descriptions.
4. Delete merged branches, and archive sessions whose branches are gone.
