# Verification record

Date: 16 November 2026 (Asia/Dhaka). Fictional local demonstration data only.

Final implementation revision `098e9a5e2580642a230a810de0e1e06f1fa38fe8` passed [fresh Linux CI](https://github.com/Shadman-Al-Muksit/campus-student-erp/actions/runs/43857499804), including 41 backend, 19 research-tool, and 8 browser tests plus production build. The redesigned English/Bangla sign-in screens were captured and visually inspected. Later checkpoint edits are documentation only.

| Check | Result |
| --- | --- |
| Django system checks | No issues |
| Migration drift | No pending model changes |
| Backend regression suite | 41 tests passed against PostgreSQL |
| Research tooling | 19 tests passed in Ubuntu WSL |
| TypeScript and production bundle | Builds successfully |
| Browser workflows | 8 passed using Windows Edge/Playwright against WSL servers |
| Dependency audit | npm reported 0 vulnerabilities at installation |
| Repeat setup and seed | Completed; existing records and counts preserved |
| Backup restoration | All 27 public tables and 915 rows matched by content hash in a separate restored database |

Later browser tests intentionally add fictional invoice/payment/audit records, so current row counts and balances can differ from that backup snapshot.

Backend tests cover login CSRF, anonymous denial, student isolation, unpublished results, missing curricula, elective matching, repeated-course deduplication, immutable assigned curriculum, historical credit snapshots, attendance denominators, unmarked records, financial validation, registration rules, and two-thread competition for the last seat.

Browser tests cover dashboard drill-downs, student destinations, helper questions, Bangla labels, baseline access, session expiry, denied staff access, mobile overflow, and administrator invoice/payment/audit interactions. Screenshot inspection identified clipped currency text on mobile; the layout was corrected and a numeric-card overflow assertion added.

## Limits

- No participant study has occurred. Software tests do not establish UX improvements.
- Local browser tests use installed Windows Edge because this computer uses WSL1. GitHub Actions separately runs Linux Chromium.
- No real university integration, official policy validation, production load test, or independent security audit is claimed.
- The production build reports a large chart-inclusive JavaScript chunk. Route/chart splitting remains a future performance improvement.
- Technical Django admin is deliberately read-only. Operational coverage is the documented set of custom application screens and APIs.
