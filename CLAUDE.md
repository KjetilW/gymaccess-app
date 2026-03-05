# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GymAccess** (gymaccess.app) is a SaaS platform for small community gyms to automate membership signup, recurring payments, access control (PIN codes), and membership lifecycle management. Target: 20–200 member gyms run by volunteers.

The full product specification is in `prompts/app_spec.md`. Read it before implementing anything.

## Project Status

This repository is in pre-implementation phase. The `prompts/` directory contains:
- `app_spec.md` — full product specification
- `initializer_prompt.md` — instructions for the first agent session (bootstrapping)
- `coding_prompt.md` — instructions for subsequent coding agent sessions

## Multi-Session Agent Workflow

This project uses a multi-session autonomous development pattern:

1. **Initializer agent** (`prompts/initializer_prompt.md`): Creates `feature_list.json` (200 end-to-end tests), `init.sh`, and project structure.
2. **Coding agents** (`prompts/coding_prompt.md`): Each session reads `feature_list.json`, verifies previously passing tests, implements one feature at a time, verifies via browser automation, marks tests as passing, commits, and updates `claude-progress.txt`.

Key files created during development:
- `feature_list.json` — source of truth for all features; only `"passes"` field may be changed
- `claude-progress.txt` — session-to-session progress notes
- `init.sh` — starts the development environment

## Intended Architecture

### Stack
- **Backend**: Node.js / TypeScript
- **Frontend**: React / Next.js
- **Database**: PostgreSQL
- **Deployment**: Docker Compose on a single VM

### Services (docker-compose)
```
reverse-proxy (Traefik or Nginx)
frontend        → http://localhost:3000
api             → http://localhost:8080
worker          (async tasks: notifications, retries)
postgres
redis           (optional: queues, caching)
```

### Repository Structure (to be created)
```
/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── api/
├── worker/
├── frontend/
├── infrastructure/
│   ├── nginx/
│   └── traefik/
└── scripts/
    ├── dev
    ├── backup
    └── migrate
```

## Development Commands

Once initialized:

```bash
# Start all services
docker compose up

# Reset database
docker compose down -v && docker compose up

# Run migrations
./scripts/migrate

# Seed demo data
./scripts/seed

# Test Stripe webhooks locally
stripe listen --forward-to localhost:8080/webhooks/stripe

# View logs
docker compose logs -f api
docker compose logs -f worker
```

## Core Domain Model

- **Gym**: gym_id, name, location, admin_user, membership_price, billing_interval, access_type
- **Member**: member_id, gym_id, name, email, phone, status, created_at
- **Subscription**: subscription_id, member_id, provider, provider_subscription_id, status, start_date, end_date
- **AccessCode**: code_id, member_id, code, valid_from, valid_to, device_id

Membership states: `Pending → Active → PastDue → Cancelled / Expired`

Access granted only when `status == Active`.

## Key Integrations

- **Stripe**: recurring subscriptions, webhooks drive membership state transitions
- **Access control**: Shared PIN, Individual PIN, or smart lock (Igloohome/Seam)
- **Notifications**: Email (required), SMS (optional)

## Environment Variables

See `.env.example` (to be created). Key vars:
```
DATABASE_URL
STRIPE_API_KEY
STRIPE_WEBHOOK_SECRET
SMTP_HOST / SMTP_USER / SMTP_PASSWORD
ACCESS_CODE_LENGTH
DEFAULT_MEMBERSHIP_PRICE
```

## Frontend design
When doing frontend design, always use the frontend-design skill.