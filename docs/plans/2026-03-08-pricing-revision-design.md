# Pricing Revision Design

Date: 2026-03-08

## Goal

Replace the current single-tier SaaS subscription (299/mo + 5% fee) with a two-tier model that minimizes adoption friction for small gyms and scales revenue as gyms grow. Also remove Seam integration (not needed for MVP).

## Pricing Model

| | Starter | Pro |
|---|---|---|
| Monthly cost | 0 NOK | 299 NOK |
| Yearly cost | — | 2,490 NOK/year (31% saving) |
| Platform fee | 3% on member payments | 1% on member payments |
| Features | All core features | All core features |

The 3% / 1% platform fee is on top of Stripe's processing fee (~1.5% + fixed).

## Database Changes

### New column
- `gyms.saas_plan` VARCHAR(20) NOT NULL DEFAULT 'starter' — values: 'starter' | 'pro'

### Repurposed columns
- `gyms.saas_status` — NULL (no subscription / Starter), 'active', 'past_due', 'cancelled'
- Default changed from 'trial' to NULL

### Migration of existing data
- `saas_status='trial'` → `saas_plan='starter'`, `saas_status=NULL`
- `saas_status='active'` → `saas_plan='pro'`, `saas_status='active'`
- `saas_status='past_due'` → `saas_plan='pro'`, `saas_status='past_due'`
- `saas_status='cancelled'` → `saas_plan='starter'`, `saas_status=NULL`

### Removed columns
- `gyms.trial_ends_at`
- `gyms.seam_tier`
- `gyms.seam_connected_account_id`
- `gyms.seam_device_id`

### Removed env vars
- `PLATFORM_FEE_PERCENT` → replaced by `STARTER_FEE_PERCENT=3`, `PRO_FEE_PERCENT=1`
- `SEAM_MOCK`, `SEAM_API_KEY`, `SEAM_ADDON_PRICE`

## Platform Fee Logic

At member checkout (`POST /subscriptions/checkout`):
1. Query `gyms.saas_plan` for the gym
2. If `saas_plan = 'pro'` → use `PRO_FEE_PERCENT` (default 1%)
3. If `saas_plan = 'starter'` → use `STARTER_FEE_PERCENT` (default 3%)

## Webhook State Machine

```
SaaS checkout.session.completed → saas_plan='pro', saas_status='active'
invoice.payment_succeeded       → saas_status='active'
invoice.payment_failed          → saas_status='past_due'
customer.subscription.deleted   → saas_plan='starter', saas_status=NULL, clear subscription/customer IDs
```

Key: cancellation reverts to Starter (never locked out).

## Admin Settings UI — Plan & Billing

- **Starter**: "Free Starter plan (3% transaction fee)" + upgrade cards (monthly/yearly)
- **Pro active**: "Pro plan (1% transaction fee)" + "Manage Subscription" (Stripe portal)
- **Pro past_due**: Orange warning + "Update Payment Method" (Stripe portal)
- No trial system, no countdown, no lock-out state

## Admin Layout Banners

- Remove: trial expired (red), cancelled (gray) banners
- Keep: past_due (orange) banner for Pro
- Add: subtle upgrade nudge for Starter gyms (optional)

## Seam Removal

### Delete
- `api/src/utils/seam.ts`

### Remove from backend
- Seam add-on checkout route (`POST /admin/saas/seam-addon`)
- Seam connect/devices/settings routes
- `seamRequired()` middleware
- Seam webhook handling in checkout.session.completed
- Seam references in `activateMemberAccess()` and `revokeAccessCodes()`

### Remove from frontend
- Seam Premium section in Settings page
- Seam connect webview UI
- Seam-related state and API calls

### Keep
- igloohome direct integration (`igloohome.ts`, lock_id, client_id, client_secret)
- `access_codes.source` values: 'internal', 'igloohome_direct'

## Testing

- Verify new gym starts on Starter plan
- Verify Pro checkout sets plan to 'pro' with correct status
- Verify platform fee is 3% for Starter, 1% for Pro at member checkout
- Verify Pro cancellation reverts to Starter
- Verify admin settings UI shows correct plan state
- Verify Seam routes/UI are fully removed
- Browser testing via Chrome extension for all UI flows
