# GymAccess App - Claude Memory

## Project Overview
SaaS platform for community gyms. Stack: Next.js (frontend port 3000), Express/TypeScript (API port 8080), PostgreSQL, Redis, MailHog (email port 8025), Docker Compose.

## Current Status: 57/166 tests passing

## Key Credentials (test data)
- Nordfjord Gym admin: admin@nordfjordgym.no / password123 (Shared PIN, monthly NOK 299)
- Individual Pin Gym admin: admin@individualgym.no / password123
- Yearly Gym admin: yearly@testgym.no / password123
- Smart Lock Gym admin: admin@smartlockgym.no / password123

## Architecture
- `feature_list.json` - source of truth, only `"passes"` field may be changed
- `claude-progress.txt` - session progress notes
- API routes in `api/src/routes/` - auth, gyms, members, subscriptions, access, webhooks, admin
- Frontend pages in `frontend/src/app/` - admin/login, admin/members, admin/access, admin/payments, admin/settings, join/[gymId]
- Worker processes notifications from DB `notifications` table via polling

## What's Working
- Full admin auth flow (login, logout, unauthenticated redirect)
- Admin dashboard: members list, search, suspend, cancel, resend
- Admin access: shared PIN display, rotate PIN (updates all active members)
- Admin access: individual PIN gym shows correct empty state
- Admin payments: revenue, subscription count, failed payments
- Admin settings: price, billing interval, access type (saves with confirmation)
- Public signup form with validation, shows location/price/billing interval/terms
- Signup page: invalid gym ID shows friendly error
- Admin members: status dropdown filter (client-side filtering)
- Admin member detail page at /admin/members/[memberId] - shows contact, subscription, actions
- API: /members, /subscriptions/activate, /access/generate, /access/revoke
- Worker: processes notifications, sends emails to MailHog
- All Docker services running

## Next Priorities
1. Stripe checkout (features 12-19) - needs real sk_test_ key in .env
2. Style/design features (110-145) - many may already pass
3. Notification emails for member activation/cancellation (features 26-30)
4. Admin dashboard member count cards by status
5. Gym admin registration flow (feature index ~49)

## Browser Extension Issue
The mcp__claude-in-chrome extension disconnects intermittently. Using javascript_tool first (e.g., `document.title`) seems to reconnect it. navigate tool also helps reconnect.
