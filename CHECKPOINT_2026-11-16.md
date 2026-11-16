# Campus ERP checkpoint — 16 November 2026

## User intent

Implement the approved independent portfolio ERP locally and publish all source, tests, documentation, and research materials to the user's public GitHub account. One fictional CSE program, English/Bangla, student/admin first, interactive progress charts and drill-downs, deterministic seven-topic navigation helper, exploratory usability study materials. Real university integration, faculty/accounts roles, hosting, and actual volunteer sessions are later work.

User asked for a checkpoint at 3% of the five-hour allowance, then explicitly said **continue**. Resume was authorized; do not create scheduled continuation or automations. Latest visual preference: make login human and professional, remove the AI-looking marketing layout.

## Locations and access

- Local: `D:\Shadman-Desktop\Career\student-erp`.
- WSL: `/mnt/d/Shadman-Desktop/Career/student-erp`.
- Public repository: https://github.com/Shadman-Al-Muksit/campus-student-erp (main).
- GitHub CLI in Ubuntu is authenticated as `Shadman-Al-Muksit`.
- Python environment: `/home/shadman/.local/share/campus-erp/venv`.
- Node 22 runtime: `/home/shadman/.local/share/campus-erp/node`.
- PostgreSQL data: `/home/shadman/.local/share/campus-erp/pgdata`, localhost port 55432, database/user `campus_erp`.
- Root `.env` contains generated local credentials and is ignored. Never print or publish it. Demo account credentials are intentionally public in README.

## Implemented

React/TypeScript/Vite frontend with Tailwind/shadcn-style primitives, Recharts, TanStack Query, React Router, i18next; Django5.2/DRF backend, PostgreSQL, migrations, additive demo seed, audited admin workflows, session/CSRF protection, registration locking, financial validation, shared progress calculations, elective matching, historical credit snapshots, immutable assigned curriculum, unmarked attendance handling.

All planned student screens and custom admin workflows exist. Basic/enhanced study modes and bilingual helper exist. Research protocol, bilingual scripts, empty CSV template, validation/analysis code, pending report template, and learner documentation exist. No human-study findings are claimed.

Login redesigned to a restrained academic portal: slim identity header, language switch, centered form, compact collapsible demo access, no marketing hero or fake progress graphic. Initial fields are empty; demo selection fills them.

Root fixed mobile financial-value clipping and added overflow assertions; helper breadcrumb paths now match actual sidebar groups. Financial browser tests intentionally add clearly labelled fictional invoices/payments, so seeded balances can change.

## Verification evidence

- 41 backend tests passed against PostgreSQL, including two-thread last-seat approval.
- 19 research-tool tests passed in Ubuntu WSL. Empty observations produce no findings.
- Eight browser workflows passed after the login redesign (53.9 seconds), including mobile financial-value overflow assertions.
- TypeScript/Vite production build passed after the login redesign. Final CI rebuild checks the checkpoint commit too.
- Fresh Linux GitHub Actions run passed for commit `c8dceba6c9ad50748455714eb0ffa9db6651c6e8`: https://github.com/Shadman-Al-Muksit/campus-student-erp/actions/runs/43829186246.
- Repeat setup/seed completed without resetting data.
- Backup restored into `campus_restore_final_20261116`: all 27 tables and 915 rows matched by content hash at that snapshot. Later test mutations are expected to differ.
- npm installation audit reported zero vulnerabilities.

See `docs/VERIFICATION.md` for practical limits. The large chart-inclusive bundle is a known future optimization.

New English/Bangla login screenshots were captured and visually inspected. README, startup/recovery instructions, screenshots, learner guide, and verification record are present. Root review also fixed custom database-name detection and added explicit research-environment activation.

## Finish/resume steps

1. Check local Git status and read this file; preserve all project and unrelated Career files.
2. Start if needed: `bash scripts/dev.sh` in the WSL project folder; app http://localhost:5173, backend8000.
3. Browser verification and screenshots are complete. Rerun only after relevant changes; commands are in README.
4. This checkpoint commit saves implementation, README, screenshots, verification, startup/recovery, ignore, and checkpoint changes. Build metadata is untracked and ignored. Verify Git status before further work.
5. Confirm final GitHub Actions status; do not report old green CI as checking a newer commit.
6. Final response should link public repo, local README/learning guide, show the new login screenshot, provide startup/demo access, and distinguish prepared research from unperformed volunteer sessions.

## Further work boundary

Do not fabricate participant results or claim production/institutional readiness. No real ERP credentials were used. Publishing GitHub source is authorized; public hosting was deferred. Never commit databases, dumps, `.env`, raw participant observations, contact/consent records, runtime logs, node_modules, browser traces, or build artifacts.
