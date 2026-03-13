# Pricing Revision Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace single-tier SaaS subscription with Starter (free, 3% fee) / Pro (299/mo, 1% fee) model, remove trial system, remove Seam integration.

**Architecture:** Add `saas_plan` column to gyms table ('starter'|'pro'), repurpose `saas_status` for subscription lifecycle only (null|'active'|'past_due'), remove Seam columns/code entirely. Platform fee at member checkout derived from gym's plan.

**Tech Stack:** Express/TypeScript backend, Next.js frontend, PostgreSQL, Stripe

---

### Task 1: Database Migration — Add saas_plan, remove Seam/trial columns

**Files:**
- Modify: `api/src/migrate.ts`

**Step 1: Add the new saas_plan column and migrate existing data**

In `api/src/migrate.ts`, add at the end of the `migrations` template literal (before the closing backtick on line 154):

```sql
-- Pricing revision: add saas_plan column
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS saas_plan VARCHAR(20) NOT NULL DEFAULT 'starter';

-- Migrate existing data: active SaaS subscribers become 'pro'
UPDATE gyms SET saas_plan = 'pro' WHERE saas_status = 'active';
UPDATE gyms SET saas_plan = 'pro' WHERE saas_status = 'past_due';

-- Revert trial and cancelled gyms to starter with null status
UPDATE gyms SET saas_status = NULL WHERE saas_status = 'trial';
UPDATE gyms SET saas_plan = 'starter', saas_status = NULL WHERE saas_status = 'cancelled';

-- Drop unused columns (Seam + trial)
ALTER TABLE gyms DROP COLUMN IF EXISTS trial_ends_at;
ALTER TABLE gyms DROP COLUMN IF EXISTS seam_tier;
ALTER TABLE gyms DROP COLUMN IF EXISTS seam_connected_account_id;
ALTER TABLE gyms DROP COLUMN IF EXISTS seam_device_id;
```

Also change the default on the existing saas_status column. Replace line 129:
```sql
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS saas_status VARCHAR(20) NOT NULL DEFAULT 'trial';
```
with:
```sql
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS saas_status VARCHAR(20);
```

And remove lines 132, 134-135 (trial_ends_at), lines 137-139 (seam columns), and line 148-149 (seam_tier).

**Step 2: Run migration to verify it works**

```bash
docker compose exec api npx tsx src/migrate.ts
```
Expected: "Migrations completed successfully."

**Step 3: Commit**

```bash
git add api/src/migrate.ts
git commit -m "feat: add saas_plan column, remove Seam/trial columns from migration"
```

---

### Task 2: Remove Seam backend code

**Files:**
- Delete: `api/src/utils/seam.ts`
- Modify: `api/src/routes/admin.ts` — remove Seam imports, routes, seamRequired()
- Modify: `api/src/routes/subscriptions.ts` — remove Seam imports and Seam branch in activateMemberAccess
- Modify: `api/src/routes/webhooks.ts` — remove Seam import and Seam source handling
- Modify: `api/package.json` — remove `"seam"` dependency

**Step 1: Delete `api/src/utils/seam.ts`**

```bash
rm api/src/utils/seam.ts
```

**Step 2: Remove seam dependency from api/package.json**

Remove line 20: `"seam": "^1.156.0",`

**Step 3: Clean up `api/src/routes/admin.ts`**

Remove:
- Line 5-9: The entire import block for seam (`isSeamConfigured`, `isSeamMockMode`, `createConnectWebview`, etc.)
- Lines 133: `g.seam_device_id, g.seam_connected_account_id, g.seam_tier,` from member detail query
- Lines 153-154: `igloohomeSeamConfigured` variable and its use in `igloohomeConfigured`
- Lines 575-829: The entire Seam integration section:
  - `seamRequired()` function (577-592)
  - `POST /admin/igloohome/connect` (594-615)
  - `GET /admin/igloohome/status` (617-639)
  - `GET /admin/igloohome/devices` (641-660)
  - `PUT /admin/settings/igloohome` (662-679)
  - `DELETE /admin/igloohome/connect` (681-694)
  - Lines 719-720, 735-736, 771-779 in regenerate route: Seam branches
  - `POST /admin/saas/seam-addon` (793-829)

In the member detail query (line 127-145), remove Seam columns:
```sql
g.seam_device_id, g.seam_connected_account_id, g.seam_tier,
```

In the member detail response, simplify igloohomeConfigured:
```typescript
const igloohomeConfigured = isIgloohomeConfigured(member.igloohome_client_id, member.igloohome_client_secret) && !!member.igloohome_lock_id;
```

In the regenerate route (`POST /admin/members/:memberId/igloohome/regenerate`):
- Remove Seam query columns (`g.seam_device_id, g.seam_tier`) from the SQL
- Remove `useSeam` logic (lines 719-720)
- Remove the Seam branch in the if/else (lines 771-779)
- Change `if (!useIgloohomeDirect && !useSeam)` to just `if (!useIgloohomeDirect)`
- Remove Seam source handling in existingCodes loop (line 735-736 for `source === 'igloohome'`)

**Step 4: Clean up `api/src/routes/subscriptions.ts`**

Remove:
- Line 5: `import { isSeamConfigured, isSeamMockMode, createOfflineAccessCode, deleteAccessCode } from '../utils/seam';`
- Lines 41-42: `const useSeam = ...` variable
- Lines 76-92: The entire `else if (useSeam)` block in activateMemberAccess
- Lines 123-126: The `if (existing.source === 'igloohome' && ...)` block (Seam delete)
- Line 147: Update condition from `(useIgloohomeDirect || useSeam)` to just `useIgloohomeDirect`

**Step 5: Clean up `api/src/routes/webhooks.ts`**

Remove:
- Line 5: `import { deleteAccessCode } from '../utils/seam';`
- Lines 46-49: The `if (row.source === 'igloohome' && ...)` block in revokeAccessCodes
- Lines 239-244: The `if (addon === 'seam')` block in handleSaasEvent

**Step 6: Restart API and verify it starts without errors**

```bash
docker compose restart api && docker compose logs -f api --tail=20
```
Expected: "Migrations completed successfully." and "API server running on port 8080"

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: remove all Seam integration code and dependency"
```

---

### Task 3: Update platform fee logic — dynamic per-plan fees

**Files:**
- Modify: `api/src/routes/subscriptions.ts:199-202` — replace fixed PLATFORM_FEE_PERCENT with plan-based fee
- Modify: `.env` — replace PLATFORM_FEE_PERCENT with STARTER_FEE_PERCENT and PRO_FEE_PERCENT
- Modify: `.env.example` — same

**Step 1: Update checkout fee logic in `api/src/routes/subscriptions.ts`**

Replace lines 198-202:
```typescript
const unitAmount = Math.round(member.membership_price) * 100;
const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '0');
const applicationFeeAmount = platformFeePercent > 0
  ? Math.round(unitAmount * platformFeePercent / 100)
  : 0;
```

With:
```typescript
const unitAmount = Math.round(member.membership_price) * 100;

// Look up gym's plan to determine platform fee
const gymPlanResult = await pool.query('SELECT saas_plan FROM gyms WHERE gym_id = $1', [member.gid]);
const gymPlan = gymPlanResult.rows[0]?.saas_plan || 'starter';
const platformFeePercent = gymPlan === 'pro'
  ? parseFloat(process.env.PRO_FEE_PERCENT || '1')
  : parseFloat(process.env.STARTER_FEE_PERCENT || '3');
const applicationFeeAmount = platformFeePercent > 0
  ? Math.round(unitAmount * platformFeePercent / 100)
  : 0;
```

**Step 2: Update `.env`**

Replace:
```
PLATFORM_FEE_PERCENT=5
```
With:
```
STARTER_FEE_PERCENT=3
PRO_FEE_PERCENT=1
```

**Step 3: Update `.env.example`**

Replace:
```
PLATFORM_FEE_PERCENT=5
```
With:
```
# Platform fee percentages (applied on top of Stripe processing fees)
STARTER_FEE_PERCENT=3
PRO_FEE_PERCENT=1
```

Also remove from `.env.example`:
```
# Seam (igloohome smart lock integration — paid add-on)
# Get your API key from https://console.seam.co
SEAM_API_KEY=seam_test_placeholder_use_real_key
# Set SEAM_MOCK=true for development/testing without a real Seam account
SEAM_MOCK=false
# Monthly price in cents for the Seam add-on (e.g. 14900 = 149 NOK/month)
SEAM_ADDON_PRICE=14900
```

And remove from `.env`:
```
SEAM_API_KEY=...
SEAM_MOCK=false
```

**Step 4: Restart API**

```bash
docker compose up -d api
```

**Step 5: Commit**

```bash
git add api/src/routes/subscriptions.ts .env .env.example
git commit -m "feat: dynamic platform fee based on gym plan (3% starter, 1% pro)"
```

---

### Task 4: Update webhook state machine for new pricing model

**Files:**
- Modify: `api/src/routes/webhooks.ts:231-287` — update handleSaasEvent

**Step 1: Update handleSaasEvent in `api/src/routes/webhooks.ts`**

Replace the `handleSaasEvent` function (lines 232-287):

```typescript
async function handleSaasEvent(event: any) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const gymId = session.metadata?.gymId;
      if (gymId) {
        // Pro plan subscription activated
        await pool.query(
          `UPDATE gyms SET saas_plan = 'pro', saas_status = 'active',
           saas_subscription_id = $1, saas_stripe_customer_id = $2
           WHERE gym_id = $3`,
          [session.subscription, session.customer, gymId]
        );
      }
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      if (subscriptionId) {
        await pool.query(
          "UPDATE gyms SET saas_status = 'active' WHERE saas_subscription_id = $1",
          [subscriptionId]
        );
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      if (subscriptionId) {
        await pool.query(
          "UPDATE gyms SET saas_status = 'past_due' WHERE saas_subscription_id = $1",
          [subscriptionId]
        );
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      // Revert to Starter plan on cancellation
      await pool.query(
        `UPDATE gyms SET saas_plan = 'starter', saas_status = NULL,
         saas_subscription_id = NULL, saas_stripe_customer_id = NULL
         WHERE saas_subscription_id = $1`,
        [subscription.id]
      );
      break;
    }
  }
}
```

**Step 2: Restart API and verify**

```bash
docker compose restart api
```

**Step 3: Commit**

```bash
git add api/src/routes/webhooks.ts
git commit -m "feat: update SaaS webhook to set saas_plan, revert to starter on cancel"
```

---

### Task 5: Update gym registration — start on Starter, no trial

**Files:**
- Modify: `api/src/routes/auth.ts:24-28` — change gym creation to use starter plan

**Step 1: Update auth.ts gym creation**

Replace lines 24-28:
```typescript
const gymResult = await pool.query(
  `INSERT INTO gyms (name, location, membership_price, billing_interval, access_type, saas_status, trial_ends_at)
   VALUES ($1, $2, $3, $4, $5, 'trial', NOW() + INTERVAL '30 days') RETURNING gym_id`,
  [gymName, location || '', membershipPrice, billingInterval || 'monthly', accessType || 'shared_pin']
);
```

With:
```typescript
const gymResult = await pool.query(
  `INSERT INTO gyms (name, location, membership_price, billing_interval, access_type, saas_plan)
   VALUES ($1, $2, $3, $4, $5, 'starter') RETURNING gym_id`,
  [gymName, location || '', membershipPrice, billingInterval || 'monthly', accessType || 'shared_pin']
);
```

**Step 2: Commit**

```bash
git add api/src/routes/auth.ts
git commit -m "feat: new gyms start on Starter plan instead of trial"
```

---

### Task 6: Update admin GET /gym to return saas_plan

**Files:**
- Modify: `api/src/routes/admin.ts:44-58` — include saas_plan in response (already returned via SELECT *, but verify)

**Step 1: Verify the GET /gym endpoint returns saas_plan**

The endpoint uses `SELECT *` (line 46), so `saas_plan` will be included automatically. No code change needed here.

However, remove `seam_tier`, `seam_connected_account_id`, `seam_device_id` references if they were part of the response. Since we're using `SELECT *` and the columns are dropped by migration, this is handled.

No changes needed for this task — skip to commit if verified.

---

### Task 7: Update admin layout — remove trial/cancelled banners, add upgrade nudge

**Files:**
- Modify: `frontend/src/app/admin/layout.tsx`

**Step 1: Update GymInfo interface and SaasBanner**

Replace the entire `GymInfo` interface (lines 10-14):
```typescript
interface GymInfo {
  name: string;
  saas_plan?: string;
  saas_status?: string | null;
}
```

Remove the `daysUntil` function (lines 16-20) — no longer needed.

Replace the `SaasBanner` component (lines 22-90):
```typescript
function SaasBanner({ saasPlan, saasStatus }: { saasPlan: string; saasStatus: string | null | undefined }) {
  // Pro with active subscription — no banner needed
  if (saasPlan === 'pro' && saasStatus === 'active') return null;

  // Pro with payment issue
  if (saasPlan === 'pro' && saasStatus === 'past_due') {
    return (
      <div className="bg-orange-500 text-white px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">Payment issue with your Pro subscription.</span>
          <span className="opacity-90">Update your payment method to keep the 1% transaction fee.</span>
        </div>
        <Link
          href="/admin/settings"
          className="shrink-0 px-3 py-1 bg-white text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-50 transition-colors"
        >
          Fix now
        </Link>
      </div>
    );
  }

  // Starter plan — subtle upgrade nudge
  if (saasPlan === 'starter') {
    return (
      <div className="bg-forest-800 text-forest-200 px-6 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="opacity-80">You&apos;re on the Starter plan (3% transaction fee).</span>
          <span className="font-semibold text-white">Upgrade to Pro for just 1%.</span>
        </div>
        <Link
          href="/admin/settings"
          className="shrink-0 px-3 py-1 bg-sage text-forest-900 rounded-lg text-xs font-bold hover:bg-sage/80 transition-colors"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  return null;
}
```

Update the `useEffect` data setter (lines 113-119) to use `saas_plan`:
```typescript
setGymInfo({
  name: data.name || '',
  saas_plan: data.saas_plan || 'starter',
  saas_status: data.saas_status || null,
});
```

Update the SaasBanner usage (line 188-190):
```tsx
{gymInfo.saas_plan && (
  <SaasBanner saasPlan={gymInfo.saas_plan} saasStatus={gymInfo.saas_status ?? null} />
)}
```

**Step 2: Commit**

```bash
git add frontend/src/app/admin/layout.tsx
git commit -m "feat: update admin layout with starter/pro banners, remove trial system"
```

---

### Task 8: Update admin settings page — remove Seam, update Plan & Billing

**Files:**
- Modify: `frontend/src/app/admin/settings/page.tsx`

This is the largest UI change. Key changes:

**Step 1: Update GymSettings interface**

Remove:
- `trial_ends_at: string | null;`
- `seam_connected_account_id: string | null;`
- `seam_device_id: string | null;`
- `seam_tier: string;`

Add:
- `saas_plan: string;`

Remove the `SeamDevice` interface entirely (lines 29-33).

**Step 2: Remove all Seam-related state variables**

Remove these state declarations (lines 144-152):
- `seamConnected`, `seamDeviceId`, `seamDevices`
- `igloohomeLoading`, `igloohomeError`, `igloohomeSaved` (Seam-specific)
- `seamAddonLoading`, `seamAddonError`

Remove these handler functions:
- `fetchDevices` (154-164)
- `handleIgloohomeConnect` (343-360)
- `handleIgloohomeDisconnect` (362-380)
- `handleSaveDevice` (382-397)
- `handleSeamAddonCheckout` (433-449)

**Step 3: Remove Seam webview detection from useEffect**

Remove lines 169-183 (the webviewId check block).

Remove lines 206-210 (Seam state initialization from gym data).

**Step 4: Remove the "Smart Lock via Seam — Premium" section**

Delete the entire section from line 833 to line 948.

**Step 5: Rewrite Plan & Billing section**

Replace lines 950-1091 with new plan-aware UI:

```tsx
{/* Plan & Billing Section */}
<div className="mt-6">
  <div className="bg-white rounded-2xl border border-warm-200 p-6">
    <h2 className="font-display font-bold text-xs uppercase tracking-widest text-forest-600 mb-4">Plan &amp; Billing</h2>

    {settings?.saas_plan === 'starter' && (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-warm-50 border border-warm-200 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-forest-800">Starter plan — Free</p>
            <p className="text-xs text-gray-500 mt-0.5">3% platform fee on member payments (on top of Stripe processing fees)</p>
          </div>
        </div>

        <p className="text-sm text-gray-600">Upgrade to Pro to reduce your platform fee to just 1%.</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="border border-warm-200 rounded-xl p-4">
            <div className="font-display font-bold text-xl text-forest-900">NOK 299</div>
            <div className="text-xs text-gray-500 mb-1">/month</div>
            <div className="text-xs text-forest-700 font-medium mb-3">1% platform fee</div>
            <button
              type="button"
              onClick={() => handleSaasCheckout('monthly')}
              disabled={saasLoading}
              className="w-full py-2 bg-forest-900 text-white rounded-lg text-sm font-semibold hover:bg-forest-800 disabled:opacity-50 transition-colors"
            >
              {saasLoading ? 'Loading…' : 'Upgrade monthly'}
            </button>
          </div>
          <div className="border border-forest-700 rounded-xl p-4 ring-1 ring-forest-700 relative">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
              <span className="bg-forest-700 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">Save 31%</span>
            </div>
            <div className="font-display font-bold text-xl text-forest-900">NOK 2,490</div>
            <div className="text-xs text-gray-500 mb-1">/year</div>
            <div className="text-xs text-forest-700 font-medium mb-3">1% platform fee</div>
            <button
              type="button"
              onClick={() => handleSaasCheckout('yearly')}
              disabled={saasLoading}
              className="w-full py-2 bg-forest-900 text-white rounded-lg text-sm font-semibold hover:bg-forest-800 disabled:opacity-50 transition-colors"
            >
              {saasLoading ? 'Loading…' : 'Upgrade yearly'}
            </button>
          </div>
        </div>
        {saasError && <p className="text-xs text-red-600">{saasError}</p>}
      </div>
    )}

    {settings?.saas_plan === 'pro' && settings?.saas_status === 'active' && (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-forest-50 border border-forest-200 rounded-xl">
          <svg className="w-5 h-5 text-forest-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-forest-800">Pro plan active</p>
            <p className="text-xs text-gray-500 mt-0.5">1% platform fee on member payments</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleManageSubscription}
          disabled={portalLoading}
          className="px-5 py-2.5 border border-forest-700 text-forest-800 rounded-xl text-sm font-semibold hover:bg-forest-50 disabled:opacity-50 transition-colors"
        >
          {portalLoading ? 'Opening…' : 'Manage Subscription'}
        </button>
        {saasError && <p className="text-xs text-red-600">{saasError}</p>}
      </div>
    )}

    {settings?.saas_plan === 'pro' && settings?.saas_status === 'past_due' && (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <svg className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-orange-800">Payment issue with your Pro subscription</p>
            <p className="text-xs text-orange-700 mt-0.5">Please update your payment method to keep the 1% fee rate.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleManageSubscription}
          disabled={portalLoading}
          className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          {portalLoading ? 'Opening…' : 'Update Payment Method'}
        </button>
        {saasError && <p className="text-xs text-red-600">{saasError}</p>}
      </div>
    )}
  </div>
</div>
```

**Step 6: Remove trial-related variables**

Remove from the component body:
- `const saasStatus = settings?.saas_status || 'trial';` — replace with direct `settings?.saas_plan` and `settings?.saas_status` usage
- `const trialEndsAt = settings?.trial_ends_at;`
- `const trialDaysLeft = ...`
- `const trialExpired = ...`
- Any other `daysUntil` usage

**Step 7: Update register page Seam reference**

In `frontend/src/app/admin/register/page.tsx` line 252, change:
```
'Smart Lock', desc: 'Igloohome or Seam integration. Full automation.'
```
to:
```
'Smart Lock', desc: 'igloohome lock integration. Full automation.'
```

**Step 8: Restart frontend and verify**

```bash
docker compose restart frontend
```

**Step 9: Commit**

```bash
git add frontend/
git commit -m "feat: update settings page with starter/pro plan UI, remove Seam UI"
```

---

### Task 9: Clean up .env and remove Seam env vars

**Files:**
- Modify: `.env` — remove SEAM_API_KEY, SEAM_MOCK
- Modify: `.env.example` — remove Seam section

**Step 1: Remove Seam env vars from `.env`**

Remove:
```
SEAM_API_KEY=seam_testfvy2_9geWYMCLqorsn7pTKkv2Y1bL
SEAM_MOCK=false
```

**Step 2: Already done in Task 3 for `.env.example` — verify**

**Step 3: Commit**

```bash
git add .env .env.example
git commit -m "chore: remove Seam env vars, update fee config"
```

---

### Task 10: Browser testing via Chrome extension

**Test the following flows:**

1. **Login as admin** — navigate to `/admin/login`, login with `admin@nordfjordgym.no` / `password123`
2. **Verify Starter banner** — should see subtle upgrade nudge in admin layout header
3. **Navigate to Settings** — verify Plan & Billing shows "Starter plan — Free" with 3% fee info and upgrade cards
4. **Verify no Seam section** — the "Smart Lock via Seam — Premium" section should be gone
5. **Verify igloohome Direct section** — should still be present with guided setup flow
6. **Verify Stripe Connect section** — should still work as before
7. **Check registration page** — verify "Seam" text is removed from access type description

---

### Task 11: Update memory and progress files

**Files:**
- Modify: `/Users/kjetil/.claude/projects/-Users-kjetil-repos-private-gymaccess-app/memory/MEMORY.md`

Update the memory file to reflect:
- New pricing model (Starter free/3%, Pro 299mo/1%)
- Seam integration removed
- Trial system removed
- `saas_plan` column added
- `PLATFORM_FEE_PERCENT` replaced by `STARTER_FEE_PERCENT` and `PRO_FEE_PERCENT`
