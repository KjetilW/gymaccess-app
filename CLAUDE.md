# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GymAccess** (gymaccess.app) is a SaaS platform for small community gyms to automate membership signup, recurring payments, access control (PIN codes), and membership lifecycle management. Target: 20–200 member gyms run by volunteers.

The full product specification is in `prompts/app_spec.md`.

## Project Status

**166/166 features complete** (as of session 8, 2026-03-06). All tests passing.

Key files:
- `feature_list.json` — source of truth for all features; only `"passes"` field may be changed
- `claude-progress.txt` — session-by-session progress notes
- `init.sh` — starts the development environment

## Architecture

### Stack
- **Backend**: Node.js / TypeScript (Express) on port 8080
- **Frontend**: React / Next.js on port 3000
- **Database**: PostgreSQL
- **Deployment**: Docker Compose on a single VM

### Services (docker-compose)
```
reverse-proxy (Nginx — infrastructure/nginx/nginx.conf)
frontend        → http://localhost:3000
api             → http://localhost:8080
worker          (async tasks: notifications, expired subscription job)
postgres
redis
mailhog         → http://localhost:8025 (local email capture)
```

### Repository Structure
```
/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env / .env.example
├── api/
│   └── src/
│       ├── index.ts          (Express server, runs migrations on startup)
│       ├── migrate.ts        (runMigrations — auto-runs on startup)
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── admin.ts
│       │   ├── members.ts
│       │   ├── subscriptions.ts
│       │   ├── access.ts
│       │   └── webhooks.ts
│       ├── middleware/
│       │   ├── auth.ts
│       │   └── rateLimit.ts
│       └── utils/
│           └── crypto.ts     (AES-256-CBC encrypt/decrypt for access codes)
├── worker/
│   └── src/index.ts          (polls notifications every 5s, checks expiry every 60s)
├── frontend/
│   └── src/app/
│       ├── page.tsx          (landing page)
│       ├── admin/            (login, members, access, payments, settings)
│       └── join/[gymId]/     (signup, payment, success)
├── infrastructure/
│   └── nginx/nginx.conf      (HTTPS + HTTP→HTTPS redirect, HSTS)
└── scripts/
    ├── migrate
    ├── seed
    └── backup
```

## Development Commands

```bash
# Start all services
docker compose up

# Start in background
docker compose up -d

# Restart a single service (needed after .env changes)
docker compose up -d api

# Reset database
docker compose down -v && docker compose up

# Run migrations manually
docker compose exec api npx tsx src/migrate.ts

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
- **AccessCode**: code_id, member_id, code (encrypted), valid_from, valid_to, device_id
- **Notification**: id, member_id, type, subject, body, status, retry_count, error_message
- **NotificationTemplate**: id, gym_id, type, subject, body

Membership states: `Pending → Active → PastDue → Cancelled / Expired`

Access granted only when `status == Active`.

## Key Implementation Details

### Access Code Encryption
- Codes stored AES-256-CBC encrypted in DB as `ivHex:ciphertextHex`
- `api/src/utils/crypto.ts` — `encryptCode()`, `decryptCode()`, `isEncrypted()`
- Admin API always decrypts before returning to frontend
- Old plaintext codes still work via `isEncrypted()` check
- `ACCESS_CODE_ENCRYPTION_KEY` must be set in .env

### Stripe Integration
- `POST /subscriptions/checkout` creates Stripe checkout session with inline `price_data`
- Webhook handler at `POST /webhooks/stripe` with HMAC-SHA256 signature verification
- Webhook events handled: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
- Idempotency: checkout event checks member status and existing subscription before acting

### Webhook State Machine
- `checkout.session.completed`: pending → active + access code + welcome email
- `invoice.payment_failed`: active → past_due + access code revoked
- `invoice.payment_succeeded`: past_due → active + access code restored
- `customer.subscription.deleted`: → cancelled + access code revoked + cancellation email

### Notification System
- Worker polls `notifications` table every 5 seconds
- Retries up to `MAX_RETRIES=3`; status becomes `'failed'` after that
- 4 notification types: `welcome`, `payment_receipt`, `payment_failed`, `cancellation`
- Templates editable per gym via Settings page (`/admin/settings`)
- Email delivered via SMTP (MailHog locally)

### Admin API Patterns
- All admin routes filter by `gym_id` from JWT — gym isolation enforced
- `/admin/members` returns `{ members: [...], pagination: { total, page, limit, pages } }`
- Pagination: `?page=N&limit=N` (default limit=50, max=100)
- Rate limiting (in-memory): 30 req/min on `/auth`, 60 req/min on `/members` and `/gyms`

### HTTPS (Production)
- Nginx config at `infrastructure/nginx/nginx.conf`
- HTTP → HTTPS redirect (301), TLS 1.2/1.3, HSTS header

## Environment Variables

See `.env.example`. Key vars:
```
DATABASE_URL
STRIPE_API_KEY
STRIPE_WEBHOOK_SECRET
SMTP_HOST / SMTP_USER / SMTP_PASSWORD
ACCESS_CODE_LENGTH          (default: 4)
ACCESS_CODE_ENCRYPTION_KEY  (required for code encryption)
DEFAULT_MEMBERSHIP_PRICE
```

## Test Credentials (Demo Data)

- **Admin**: `admin@nordfjordgym.no` / `password123` → Nordfjord Gym
- **Members**: Anna Pedersen (active), Test User (suspended), Lars Eriksen (cancelled)
- Anna may appear on page 2 of members list if 50+ members exist — use search

## Frontend Design

When doing frontend design, always use the `frontend-design` skill.
The UI uses a "Nordic Forest Industrial" aesthetic: Syne (display) + DM Sans (body) fonts, custom Tailwind palette (forest, sage, warm).
