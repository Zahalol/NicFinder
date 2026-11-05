# NicFinder documentation

Start with [`HANDOFF.md`](../HANDOFF.md) for the current state and open
items, and the root [`README.md`](../README.md) for setup. AI coding
sessions also read [`CLAUDE.md`](../CLAUDE.md).

## Using and demoing
| Doc | Contents |
| --- | --- |
| [DEMO_GUIDE.md](DEMO_GUIDE.md) | Walkthrough of every flow with the demo accounts |
| [screenshots/](screenshots/README.md) | Visual tour of every screen (retake with `scripts/capture-screenshots.mjs`) |

## Running it
| Doc | Contents |
| --- | --- |
| [REPLIT.md](REPLIT.md) | Deployment: database, secrets, Replit Auth SSO, Autoscale, scheduled maintenance |
| [API.md](API.md) | Programmatic import API (bearer key, signed webhooks; off by default) |

## How it works
| Doc | Contents |
| --- | --- |
| [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) | Scope, user flows, edge cases, age and marketing posture |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, data model, latest-price policy, import pipeline, security, operations |
| [IMPORT_CONTRACT.md](IMPORT_CONTRACT.md) | The CSV/XLSX integration contract: columns, validation, issue codes |
| [COMMUNITY_REPUTATION.md](COMMUNITY_REPUTATION.md) | Trust scoring, publication rules, abuse defenses |

## Working on it
| Doc | Contents |
| --- | --- |
| [PARALLEL_SESSIONS.md](PARALLEL_SESSIONS.md) | How to run several sessions at once without conflicts |
| [DECISIONS.md](DECISIONS.md) | Every significant choice and why, including the merge decisions |
| [ROADMAP.md](ROADMAP.md) | Prioritized next work |
| [PROGRESS.md](PROGRESS.md) | Milestone ledger |
| [../DEVLOG.md](../DEVLOG.md) | Dated log of finished work and lessons |

## Business research
| Doc | Contents |
| --- | --- |
| [../research/](../research/RESEARCH_INDEX.md) | **Latest** due diligence: legal, structure, monetization, calling economics, launch plan, expansion, financial scenarios. Start with the [decision brief](../research/99_FOUNDER_DECISION_BRIEF.md). |
| [BUSINESS_RESEARCH.md](BUSINESS_RESEARCH.md) | First-pass market research; partly superseded by `research/` (banner lists the changes) |
| [ELEVENLABS_CALLING_RESEARCH.md](ELEVENLABS_CALLING_RESEARCH.md) | Outbound-calling design research, no code; partly superseded by `research/` |

## History
| Doc | Contents |
| --- | --- |
| [history/AUTONOMOUS_WORKLOG.md](history/AUTONOMOUS_WORKLOG.md) | keen-planck session: one row per improvement cycle |
| [history/AUTONOMOUS_BACKLOG.md](history/AUTONOMOUS_BACKLOG.md) | keen-planck session's idea backlog |
| [history/SECURITY_RELIABILITY_LOG.md](history/SECURITY_RELIABILITY_LOG.md) | focused-darwin session: security findings and fixes |
| [history/UX_EXPERIMENTS_LOG.md](history/UX_EXPERIMENTS_LOG.md) | beautiful-keller session: UX experiments and keep/discard calls |

These logs predate the merge; each opens with a note on what changed since.
