# igloohome Setup UX Redesign

**Date:** 2026-03-07
**Scope:** Frontend only — `frontend/src/app/admin/settings/page.tsx`
**No backend or DB changes required**

## Context

The current igloohome Direct section in Settings exposes three raw form inputs (Lock ID, Client ID, Client Secret) with no guidance. Gym owners with no developer background have no idea what these fields mean or where to find the values.

The igloohome integration uses the **iglooaccess** product (client_credentials OAuth2 flow). Each gym owner must create their own iglooaccess account at https://access.igloocompany.co/api-access to obtain their own Client ID and Client Secret.

Note: The authorization_code OAuth flow (iglooconnect) that would allow gym owners to connect via a single click is not available without a BD partnership with igloohome. This design improves the current model within those constraints.

## Design

Replace the flat form with a multi-step guided onboarding flow. Steps are shown inline (no modal), one concern at a time.

### Disconnected State (Step 0)

When no igloohome credentials are configured, show a card containing:
- A brief description of what the integration does
- A prerequisite checklist:
  1. Lock is installed on the gym door
  2. Lock is paired in the igloohome mobile app
  3. You can unlock the door using the igloohome app
- Primary CTA button: "Connect igloohome lock" — clicking this opens the guided flow inline

### Step 1 — Get API credentials

Content:
- Heading: "Step 1: Get your igloohome API credentials"
- Instruction: "Create a free account at iglooaccess and copy your Client ID and Client Secret."
- Link button to https://access.igloocompany.co/api-access (opens new tab)
- Helper note: "Once logged in, go to API Access — your Client ID and Client Secret are shown there."
- Input: Client ID (text)
- Input: Client Secret (password)
- "Next" button — disabled until both fields are non-empty

### Step 2 — Enter Lock ID

Content:
- Heading: "Step 2: Enter your lock's Device ID"
- Instruction: "Find it in the igloohome app: Devices → select your lock → Settings → Device Info."
- Input: Lock ID (text)
- "Save & finish" button — calls the existing PUT /admin/settings endpoint

### Connected State

When credentials and lock ID are all configured:
- Show a compact "Connected" summary: green badge + "igloohome Direct — Connected"
- Show lock ID (truncated if long)
- "Change settings" link that re-opens the guided flow pre-filled with existing values (Client Secret field shows placeholder "Leave blank to keep existing")

## What Does Not Change

- All API routes, DB schema, token caching logic — unchanged
- The Seam paid add-on section — unchanged
- Lock ID is still entered manually (auto-discovery requires iglooconnect)
- PUT /admin/settings request body format — unchanged

## Future

When iglooconnect BD partnership is obtained, the guided flow can be replaced with a single OAuth redirect. The backend would need new columns (access_token, refresh_token, token_expiry) and routes for the OAuth callback. The frontend step-based flow would be removed entirely.
