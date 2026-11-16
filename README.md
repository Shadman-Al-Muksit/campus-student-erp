# Campus · Bilingual Student ERP

A portfolio ERP for a fictional CSE program: an English/Bangla student portal, academic administration, interactive degree progress, and a small deterministic navigation helper.

**Implementation in progress.** This repository records the build as it develops. A verified feature list, screenshots, test results, and complete setup instructions will replace this status when validation is complete.

## Architecture

React + TypeScript + Vite → Django REST API → PostgreSQL.

The browser uses Django session cookies and CSRF protection. All permissions and academic calculations run on the server. Dashboard graphs and detail tables share the same calculation service.

## Project layout

- `frontend/` — React interface, bilingual strings, Recharts visualizations, guided help.
- `backend/` — Django models, API, administration, demo seed, and backend tests.
- `research/` — usability protocol, anonymized template, analysis code, and tests. No participant observations have been collected.
- `docs/` — API contract, design decisions, and beginner learning guide.
- `scripts/` — WSL setup, startup, PostgreSQL backup and safe restore.

## Local development

Requires Ubuntu WSL, Python 3.12+, PostgreSQL 16+, curl, and xz-utils. Run from this folder in Ubuntu:

```bash
bash scripts/setup.sh
bash scripts/dev.sh
```

Open http://localhost:5173. Setup creates a project-specific Python environment, Node runtime, PostgreSQL cluster, and ignored `.env` file. Database data lives outside the repository in `~/.local/share/campus-erp/pgdata` on port 55432. No existing PostgreSQL cluster is overwritten.

## Demonstration accounts

| Role | Username | Password |
| --- | --- | --- |
| Student | `student` | `CampusDemo!2026` |
| Second student | `student2` | `CampusDemo!2026` |
| Study profiles | `study_a`, `study_b` | `CampusDemo!2026` |
| Administrator | `admin` | `CampusAdmin!2026` |

These are intentionally public fictional demo accounts. Do not reuse their passwords for real accounts or expose an unmodified demo to real student records.

## Boundaries

This is an independent project inspired by student ERP workflows. It is not affiliated with Premier University, does not connect to its ERP, does not process real payments, and does not issue official academic documents. Curricula and policies are explicitly demonstration data.

The research study is exploratory. Real results can only be reported after consenting volunteers participate. Raw observations, local credentials, database dumps, and runtime files are excluded from Git.

MIT licensed. Built with AI coding assistance; the repository documents implementation and verification without implying independent institutional validation.
