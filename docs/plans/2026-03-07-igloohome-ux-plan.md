# igloohome Guided Setup UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat igloohome Direct form in Settings with a guided multi-step onboarding flow that walks gym owners through getting API credentials and connecting their lock.

**Architecture:** Frontend-only change to `frontend/src/app/admin/settings/page.tsx`. Add a `igloohomeStep` state variable (0 = disconnected, 1 = credentials, 2 = lock ID, 3 = connected). Replace the raw form section (lines 635–713) with a step-renderer that shows one concern at a time. All existing state variables, handlers, and API calls remain unchanged.

**Tech Stack:** React, Next.js (App Router), Tailwind CSS, existing fetch calls to Express API

---

## Background: Current State

The current igloohome Direct section (lines 635–713 of settings/page.tsx) is a flat card with three unlabelled inputs — Lock ID, Client ID, Client Secret — and a single "Save igloohome Settings" button. Gym owners have no guidance on where to find these values.

Existing state that drives this section:
- `igloohomeLockId` / `setIgloohomeLockId`
- `igloohomeClientId` / `setIgloohomeClientId`
- `igloohomeClientSecret` / `setIgloohomeClientSecret`
- `igloohomeCredConfigured` — true when DB has both client_id and client_secret
- `igloohomeLockSaving` / `igloohomeLockSaved` / `igloohomeLockError`
- `handleSaveIgloohomeLockId()` — existing save handler (calls PUT /admin/settings)

These all stay unchanged.

---

## Task 1: Add `igloohomeStep` state and compute initial step on data load

**Files:**
- Modify: `frontend/src/app/admin/settings/page.tsx`

This is a pure state addition — no UI changes yet.

**Step 1: Add the new state variable**

Find the block of igloohome state declarations (around line 135):
```tsx
const [igloohomeLockId, setIgloohomeLockId] = useState('');
const [igloohomeClientId, setIgloohomeClientId] = useState('');
```

Add after `igloohomeCredConfigured`:
```tsx
// 0=disconnected, 1=enter credentials, 2=enter lock ID, 3=connected
const [igloohomeStep, setIgloohomeStep] = useState(0);
```

**Step 2: Set initial step when gym data loads**

Find the block where igloohome state is initialised from `gymData` (around line 194):
```tsx
setIgloohomeLockId(gymData.igloohome_lock_id || '');
setIgloohomeClientId(gymData.igloohome_client_id || '');
setIgloohomeCredConfigured(!!gymData.igloohome_configured);
```

Add directly after those three lines:
```tsx
// Set starting step based on what's already configured
if (gymData.igloohome_configured && gymData.igloohome_lock_id) {
  setIgloohomeStep(3); // fully connected
} else if (gymData.igloohome_configured) {
  setIgloohomeStep(2); // have creds, need lock ID
} else {
  setIgloohomeStep(0); // nothing configured yet
}
```

**Step 3: Verify the app still compiles and loads without errors**

```bash
docker compose logs -f frontend
```
Expected: no TypeScript errors, settings page loads normally (looks identical — no UI changes yet).

**Step 4: Commit**
```bash
git add frontend/src/app/admin/settings/page.tsx
git commit -m "feat: add igloohomeStep state for guided setup flow"
```

---

## Task 2: Replace the flat igloohome Direct card with the step-based renderer

**Files:**
- Modify: `frontend/src/app/admin/settings/page.tsx` (lines 635–713)

This is the main UI change. Replace the entire igloohome Direct `<div>` block with a new component that renders different content per step.

**Step 1: Locate the section to replace**

The section starts at (approximately):
```tsx
{/* igloohome Direct — Free */}
<div className="mt-6">
  <div className="bg-white rounded-2xl border border-warm-200 p-6">
```
and ends at:
```tsx
        </div>
      </div>
    </div>
```
before `{/* Smart Lock via Seam — Premium */}`.

**Step 2: Replace the entire block**

Replace lines 635–713 with the following:

```tsx
      {/* igloohome Direct — Free */}
      <div className="mt-6">
        <div className="bg-white rounded-2xl border border-warm-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display font-bold text-xs uppercase tracking-widest text-forest-600">Smart Lock — igloohome Direct</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-forest-100 text-forest-800 border border-forest-200">Free</span>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            Connect your igloohome smart lock to automatically generate time-bound access codes for members.
          </p>

          {/* Step 0: Disconnected — prerequisites + CTA */}
          {igloohomeStep === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-forest-800">Before you start, confirm:</p>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  {[
                    'Your igloohome lock is installed on the gym door',
                    'The lock is paired in the igloohome mobile app',
                    'You can unlock the door using the igloohome app',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-forest-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setIgloohomeStep(1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest-900 text-white rounded-xl font-semibold text-sm hover:bg-forest-800 transition-colors"
              >
                Connect igloohome lock
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Step 1: Enter API credentials */}
          {igloohomeStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-forest-50 border border-forest-200 rounded-xl">
                <span className="text-xs font-bold text-forest-700 bg-forest-200 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <p className="text-sm font-semibold text-forest-800 mb-1">Get your igloohome API credentials</p>
                  <p className="text-sm text-forest-700 mb-3">
                    Create a free account at iglooaccess, then copy your Client ID and Client Secret from the API Access page.
                  </p>
                  <a
                    href="https://access.igloocompany.co/api-access"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-forest-700 text-forest-800 rounded-lg text-sm font-semibold hover:bg-forest-100 transition-colors"
                  >
                    Open iglooaccess
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-forest-800 mb-1.5">Client ID</label>
                  <input
                    type="text"
                    value={igloohomeClientId}
                    onChange={e => setIgloohomeClientId(e.target.value)}
                    placeholder="e.g. ddsieb9c44gtm7c7sxtfban7wp"
                    className="w-full px-4 py-3 rounded-xl border border-warm-200 text-forest-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent transition-all hover:border-forest-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-forest-800 mb-1.5">Client Secret</label>
                  <input
                    type="password"
                    value={igloohomeClientSecret}
                    onChange={e => setIgloohomeClientSecret(e.target.value)}
                    placeholder="Paste your Client Secret"
                    className="w-full px-4 py-3 rounded-xl border border-warm-200 text-forest-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent transition-all hover:border-forest-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIgloohomeStep(0)}
                  className="px-4 py-2.5 border border-warm-300 text-gray-600 rounded-xl text-sm font-semibold hover:bg-warm-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setIgloohomeStep(2)}
                  disabled={!igloohomeClientId.trim() || !igloohomeClientSecret.trim()}
                  className="px-5 py-2.5 bg-forest-900 text-white rounded-xl font-semibold text-sm hover:bg-forest-800 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Enter lock ID and save */}
          {igloohomeStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-forest-50 border border-forest-200 rounded-xl">
                <span className="text-xs font-bold text-forest-700 bg-forest-200 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <p className="text-sm font-semibold text-forest-800 mb-1">Find your lock's Device ID</p>
                  <p className="text-sm text-forest-700">
                    Open the igloohome app → Devices → select your lock → Settings → Device Info. Copy the Bluetooth Device ID.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-forest-800 mb-1.5">Lock ID (Bluetooth Device ID)</label>
                <input
                  type="text"
                  value={igloohomeLockId}
                  onChange={e => setIgloohomeLockId(e.target.value)}
                  placeholder="e.g. A1B2C3D4E5F6"
                  className="w-full px-4 py-3 rounded-xl border border-warm-200 text-forest-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent transition-all hover:border-forest-400"
                />
              </div>

              {igloohomeLockError && <p className="text-xs text-red-600">{igloohomeLockError}</p>}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIgloohomeStep(1)}
                  className="px-4 py-2.5 border border-warm-300 text-gray-600 rounded-xl text-sm font-semibold hover:bg-warm-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleSaveIgloohomeLockId();
                    if (!igloohomeLockError) setIgloohomeStep(3);
                  }}
                  disabled={!igloohomeLockId.trim() || igloohomeLockSaving}
                  className="px-5 py-2.5 bg-forest-900 text-white rounded-xl font-semibold text-sm hover:bg-forest-800 disabled:opacity-40 transition-colors"
                >
                  {igloohomeLockSaving ? 'Saving…' : 'Save & finish'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Connected summary */}
          {igloohomeStep === 3 && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-forest-50 border border-forest-200 rounded-xl">
                <svg className="w-5 h-5 text-forest-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-forest-800">igloohome lock connected</p>
                  {igloohomeLockId && (
                    <p className="text-xs text-forest-600 mt-0.5 font-mono truncate">
                      Lock ID: {igloohomeLockId}
                    </p>
                  )}
                  <p className="text-xs text-forest-600 mt-0.5">Access codes will be generated automatically for active members.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIgloohomeStep(1)}
                className="text-xs font-semibold text-forest-700 hover:text-forest-900 underline underline-offset-2 transition-colors"
              >
                Change credentials or lock ID
              </button>
            </div>
          )}
        </div>
      </div>
```

**Step 3: Verify the app compiles**

```bash
docker compose logs -f frontend
```
Expected: no TypeScript errors.

**Step 4: Open the browser and verify all four states**

Navigate to http://localhost:3000/admin/settings

- Step 0 should show by default if the gym has no igloohome configured (checklist + "Connect igloohome lock" button)
- Click "Connect igloohome lock" → should advance to Step 1 (credentials form with "Open iglooaccess" link)
- Fill in Client ID + Secret, click "Next" → should advance to Step 2 (lock ID form)
- Fill in lock ID, click "Save & finish" → should call the API and advance to Step 3 (connected summary)
- "Change credentials or lock ID" link should go back to Step 1

If the gym already has credentials configured, the page should load directly at Step 2 or Step 3.

**Step 5: Commit**
```bash
git add frontend/src/app/admin/settings/page.tsx
git commit -m "feat: replace flat igloohome form with guided multi-step setup flow"
```

---

## Task 3: Handle the "Change settings" re-entry path correctly

When the gym owner clicks "Change credentials or lock ID" from Step 3 and goes to Step 1, the Client Secret field should show a placeholder indicating the existing secret is kept if left blank (same behaviour as the old UI).

**Files:**
- Modify: `frontend/src/app/admin/settings/page.tsx`

**Step 1: Update the Client Secret input in Step 1 to handle the re-entry case**

The re-entry case is: `igloohomeCredConfigured === true` AND `igloohomeStep === 1` (navigated back from Step 3).

In the Step 1 block, find the Client Secret input and update its placeholder:

```tsx
placeholder="Paste your Client Secret"
```

Change to:

```tsx
placeholder={igloohomeCredConfigured && !igloohomeClientSecret ? 'Leave blank to keep existing secret' : 'Paste your Client Secret'}
```

**Step 2: Update the "Next" button disabled condition in Step 1 to allow blank secret on re-entry**

Find:
```tsx
disabled={!igloohomeClientId.trim() || !igloohomeClientSecret.trim()}
```

Change to:
```tsx
disabled={!igloohomeClientId.trim() || (!igloohomeCredConfigured && !igloohomeClientSecret.trim())}
```

This means: if credentials are already configured, a blank secret is fine (keeps existing). If not yet configured, both fields are required.

**Step 3: Verify behaviour**

- With credentials configured, go to Step 3 → click "Change credentials or lock ID"
- Client ID should be pre-filled; Secret should be blank with "Leave blank to keep existing secret" placeholder
- "Next" should be enabled even with blank Secret
- After saving with blank Secret, the existing secret should be preserved (existing API behaviour)

**Step 4: Commit**
```bash
git add frontend/src/app/admin/settings/page.tsx
git commit -m "feat: allow blank client secret on re-entry when credentials already configured"
```

---

## Task 4: Fix step transition after save in Task 2

The Step 2 "Save & finish" button uses an async inline handler:
```tsx
onClick={async () => {
  await handleSaveIgloohomeLockId();
  if (!igloohomeLockError) setIgloohomeStep(3);
}}
```

The problem: `igloohomeLockError` is React state and won't reflect the latest value immediately after `handleSaveIgloohomeLockId()` resolves — it's the value from the previous render.

**Step 1: Check the existing `handleSaveIgloohomeLockId` handler**

Find `handleSaveIgloohomeLockId` in the settings page (around line 370–415). Verify whether it sets `igloohomeLockError` on failure and clears it on success.

**Step 2: Refactor the handler to return a success boolean**

Find the handler definition and update it to return `true` on success, `false` on error:

```tsx
const handleSaveIgloohomeLockId = async (): Promise<boolean> => {
  setIgloohomeLockSaving(true);
  setIgloohomeLockError('');
  setIgloohomeLockSaved(false);
  try {
    const token = localStorage.getItem('gymaccess_token');
    const body: Record<string, string> = {
      igloohome_lock_id: igloohomeLockId.trim(),
      igloohome_client_id: igloohomeClientId.trim(),
    };
    if (igloohomeClientSecret.trim()) {
      body.igloohome_client_secret = igloohomeClientSecret.trim();
    }
    const res = await fetch(`${API_URL}/admin/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setIgloohomeLockError(data.error || 'Failed to save settings');
      return false;
    }
    const updated = await res.json();
    setIgloohomeLockSaved(true);
    setIgloohomeCredConfigured(!!updated.igloohome_configured);
    return true;
  } catch {
    setIgloohomeLockError('Network error. Please try again.');
    return false;
  } finally {
    setIgloohomeLockSaving(false);
  }
};
```

**Step 3: Update the Step 2 save button to use the return value**

```tsx
onClick={async () => {
  const ok = await handleSaveIgloohomeLockId();
  if (ok) setIgloohomeStep(3);
}}
```

**Step 4: Verify save → success navigates to Step 3, save → error stays on Step 2 with error message**

Test with a valid lock ID → should advance to Step 3.
Temporarily use an invalid API URL to trigger a network error → should stay on Step 2 showing the error.

**Step 5: Commit**
```bash
git add frontend/src/app/admin/settings/page.tsx
git commit -m "fix: use return value from save handler to drive step transition"
```

---

## Notes

- No backend changes. All existing `PUT /admin/settings` behaviour is unchanged.
- The Seam (Premium) section below is completely untouched.
- The `igloohomeStep` state is ephemeral (not persisted to DB). On page reload, it is re-derived from `gymData` in the `useEffect` data-load block.
- For the iglooconnect OAuth upgrade path (future): replace Steps 1–2 with a single OAuth redirect; Step 3 (connected summary) can remain as-is.
