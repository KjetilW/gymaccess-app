# Multilingual i18n Design — GymAccess
Date: 2026-03-11

## Overview

Add English + Norwegian Bokmål (`nb`) support to GymAccess following multilingual SEO best practices. All public-facing pages get locale-prefixed URLs with translated slugs, hreflang tags, canonical tags, per-locale metadata, and a language-aware sitemap. Admin pages stay at `/admin/` with a language preference stored per gym.

---

## Library

**`next-intl`** — purpose-built for Next.js 14+ App Router. Supports:
- Dynamic `[locale]` routing segment
- Translated URL slugs via `pathnames` config
- Per-locale `generateMetadata()` with hreflang and canonical
- Middleware-based locale detection and routing
- TypeScript-safe translation keys

---

## Locales

| Code | Language | URL prefix |
|------|----------|------------|
| `en` | English (default) | `/en/` |
| `nb` | Norwegian Bokmål | `/nb/` |

`x-default` canonical points to `/en/`.

---

## Directory Structure

```
app/
  [locale]/                  ← new (en | nb)
    layout.tsx               ← locale-aware root layout (sets lang attr, loads messages)
    page.tsx                 ← landing page
    join/[gymId]/
      page.tsx
      payment/page.tsx
      success/page.tsx
    manage/[token]/
      page.tsx
  admin/                     ← unchanged, no locale prefix
    login/page.tsx
    register/page.tsx
    members/...
    payments/...
    access/...
    settings/page.tsx
    layout.tsx
  layout.tsx                 ← minimal root layout (no locale)
  sitemap.xml/route.ts       ← custom XML sitemap with hreflang

middleware.ts                ← next-intl locale detection + routing
i18n/
  config.ts                  ← locales, defaultLocale, pathnames
  request.ts                 ← next-intl server-side request helper
messages/
  en.json                    ← English strings
  nb.json                    ← Norwegian strings
```

---

## Translated URL Slugs

| Internal path | `/en/` URL | `/nb/` URL |
|---|---|---|
| `/` (landing) | `/en/` | `/nb/` |
| `/join/[gymId]` | `/en/join/[gymId]` | `/nb/bli-med/[gymId]` |
| `/join/[gymId]/payment` | `/en/join/[gymId]/payment` | `/nb/bli-med/[gymId]/betaling` |
| `/join/[gymId]/success` | `/en/join/[gymId]/success` | `/nb/bli-med/[gymId]/velkommen` |
| `/manage/[token]` | `/en/manage/[token]` | `/nb/administrer/[token]` |

Configured in `i18n/config.ts` `pathnames` map. Admin routes (`/admin/*`) excluded from locale routing entirely.

---

## Root URL Behavior

- `/` → middleware reads `locale-pref` cookie first; if absent, detects `Accept-Language` header
  - Norwegian browser languages treated as Norwegian: `nb`, `no`, `nb-NO`, `nn`, `nn-NO`
  - If Norwegian detected (and no cookie): redirect to `/nb/`
  - Otherwise: redirect to `/en/`
  - **The `locale-pref` cookie is ONLY written on explicit user action** (clicking language switcher or dismissing banner) — never by the middleware itself

**Suggestion banner** (`locale-banner-dismissed` cookie, separate from `locale-pref`):
A dismissible banner is shown on the `/en/` landing page when the browser's `Accept-Language` is Norwegian and no `locale-pref` cookie is set:
> "Siden er tilgjengelig på norsk. [Bytt til norsk →]"
Clicking "Bytt til norsk" sets `locale-pref=nb` and navigates to `/nb/`. Dismissing the banner without switching sets `locale-banner-dismissed=1`. Two separate cookies — no confusion between redirect preference and banner state.

---

## SEO Implementation

### hreflang tags (in `<head>`)
Generated via `generateMetadata()` `alternates`. **Important**: hreflang tags must be page-specific — not inherited from the layout — for any page with translated slugs. The layout provides the root `/` hreflang. Each translated-slug page (join, manage) must override `alternates` in its own `generateMetadata()` to point to the correct locale-specific URLs.

Example for `/nb/bli-med/[gymId]`:

```html
<!-- Root landing page -->
<link rel="alternate" hreflang="en" href="https://gymaccess.app/en/" />
<link rel="alternate" hreflang="nb" href="https://gymaccess.app/nb/" />
<link rel="alternate" hreflang="x-default" href="https://gymaccess.app/en/" />

<!-- Join page (per-page override) -->
<link rel="alternate" hreflang="en" href="https://gymaccess.app/en/join/[gymId]" />
<link rel="alternate" hreflang="nb" href="https://gymaccess.app/nb/bli-med/[gymId]" />
<link rel="alternate" hreflang="x-default" href="https://gymaccess.app/en/join/[gymId]" />
```

Note: `x-default` points to `/en/` throughout. For a Norwegian-market product this is a judgment call — it signals English as the fallback for unlisted languages.

### Canonical tags
Each page includes a self-referencing canonical:
```html
<link rel="canonical" href="https://gymaccess.app/nb/" />
```
Generated via `alternates.canonical` in `generateMetadata()`.

### Per-locale metadata
Each page exports `generateMetadata({ params: { locale } })` returning locale-specific:
- `title`
- `description`
- `openGraph.title`, `openGraph.description`
- `alternates.canonical`
- `alternates.languages`

Metadata strings live in `messages/en.json` and `messages/nb.json` alongside UI strings.

### `<html lang>` attribute
Set dynamically in `[locale]/layout.tsx`:
```tsx
<html lang={locale}>  // "en" or "nb"
```

### Sitemap (`/sitemap.xml`)
Custom route handler at `app/sitemap.xml/route.ts` returning XML with `<xhtml:link>` hreflang alternate entries for each static page.

**Why a custom route handler** (not `app/sitemap.ts`): Next.js 14's built-in sitemap convention does not support `<xhtml:link>` alternate entries for hreflang. A custom `route.ts` is needed to produce standards-compliant multilingual sitemap XML.

```xml
<url>
  <loc>https://gymaccess.app/en/</loc>
  <xhtml:link rel="alternate" hreflang="en" href="https://gymaccess.app/en/"/>
  <xhtml:link rel="alternate" hreflang="nb" href="https://gymaccess.app/nb/"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://gymaccess.app/en/"/>
</url>
```

Dynamic routes (`/join/[gymId]`, `/manage/[token]`) are excluded (gym/member-specific, not indexable).

### robots.txt
Add `Sitemap: https://gymaccess.app/sitemap.xml` to `app/robots.ts`.

---

## Language Switcher UI

Visible in:
- Landing page navbar
- Join/signup flow header
- Manage page header

Renders as a compact toggle (e.g., `EN | NB`). Uses `next-intl`'s `useRouter` + `usePathname` to resolve the equivalent URL in the alternate locale and navigate to it (respecting translated slugs).

---

## Admin Language Preference

- **DB**: New column `gyms.admin_language` (text, default `'en'`)
- **Migration**: Added automatically on API startup
- **API**: `GET /admin/gym` returns `admin_language`; `PUT /admin/settings` accepts `admin_language`
- **Frontend**: Language selector in Admin Settings page → stores preference, reloads messages
- **Implementation**: Admin layout reads `admin_language` from the gym profile API response and passes the correct `next-intl` messages to an `IntlProvider`-equivalent wrapper. No URL prefix change for admin.

---

## Translation File Structure

`messages/en.json` and `messages/nb.json` organized by page/section:

```json
{
  "meta": {
    "landing": { "title": "...", "description": "..." },
    "join": { "title": "...", "description": "..." }
  },
  "nav": { "signIn": "Sign in", "register": "Register your gym" },
  "landing": {
    "hero": { "headline": "...", "cta": "..." },
    "pricing": { "starter": { "name": "Starter", ... }, ... },
    "faq": { "q1": "...", "a1": "..." }
  },
  "join": { "form": { "name": "...", "email": "...", ... } },
  "manage": { ... },
  "admin": {
    "members": { ... },
    "settings": { ... },
    "payments": { ... },
    "access": { ... }
  },
  "common": {
    "status": {
      "active": "Active", "pending": "Pending", "past_due": "Past due",
      "cancelled": "Cancelled", "suspended": "Suspended", "expired": "Expired"
    },
    "actions": { "save": "Save", "cancel": "Cancel", "delete": "Delete" }
  }
}
```

---

## Implementation Scope

### Backend changes
- Migration: add `admin_language` column to `gyms` table (default `'en'`)
- `GET /admin/gym`: include `admin_language` in response
- `PUT /admin/settings`: accept and save `admin_language`

### Frontend changes

**Prerequisites (before i18n work):**
- All public pages currently use `'use client'`. `generateMetadata()` requires Server Components. Each of these files must be refactored into a **Server Component wrapper** that exports `generateMetadata` and renders a child `'use client'` component:
  - `join/[gymId]/page.tsx` → `JoinPage` server wrapper + `JoinPageClient` component
  - `join/[gymId]/payment/page.tsx` → same pattern
  - `join/[gymId]/success/page.tsx` → same pattern
  - `manage/[token]/page.tsx` → same pattern
  - Landing `page.tsx` (already may be server-compatible — verify)

**i18n setup:**
1. Install `next-intl`
2. Update `next.config.js` to wrap config with `createNextIntlPlugin()` (required for pathnames-based routing)
3. Create `i18n/config.ts` (locales: `['en', 'nb']`, defaultLocale: `'en'`, pathnames map)
4. Create `i18n/request.ts` (server-side `getRequestConfig`)
5. Create `middleware.ts` with locale detection and routing; include matcher that **excludes admin routes**:
   ```ts
   export const config = {
     matcher: ['/((?!admin|_next|_vercel|.*\\..*).*)']
   };
   ```

**Content:**
6. Move public pages into `app/[locale]/`
7. Extract all strings into `messages/en.json` and `messages/nb.json` (~900-1200 strings across all 16 pages)
8. Update all public page components to use `useTranslations()` hook
9. Update admin page components to use `useTranslations()` via `NextIntlClientProvider` in admin layout

**SEO:**
10. Add `generateMetadata()` with per-page hreflang + canonical to all public pages (Server Component wrappers from prerequisites)
11. Create `app/sitemap.xml/route.ts` (custom XML with `<xhtml:link>` hreflang)
12. Create `app/robots.ts` (include Sitemap URL)

**UI:**
13. Add `LanguageSwitcher` component to public page navbars (uses `next-intl` router for slug-aware switching)
14. Add suggestion banner to `/en/` landing page (reads `Accept-Language`, checks `locale-banner-dismissed` cookie)

**Admin language:**
15. Add language selector in Admin Settings page
16. Wrap admin layout with `NextIntlClientProvider` loading the correct messages based on `admin_language`
17. Read initial language from localStorage (`admin-lang`) to avoid flash-of-default-language (FOIL) on first render; sync with API response and update localStorage on save

**Standalone build (production only):**
18. In the dev Docker image (`npm run dev`) Next.js resolves `messages/` from the project root automatically — no action needed for development. For production `next build` + standalone output, `messages/` must be explicitly copied into `.next/standalone/` — either place under `public/` (copied automatically) or add an explicit `COPY` step in the production Dockerfile after `next build`.

---

## Verification

1. `npm run build` in frontend — no type errors
2. Visit `/en/` and `/nb/` — correct language renders
3. Visit `/nb/bli-med/[gymId]` — Norwegian join page renders
4. View page source — confirm hreflang, canonical, `lang` attribute correct
5. Fetch `/sitemap.xml` — confirm hreflang alternate entries present
6. Join flow end-to-end in both locales
7. Admin settings: change language preference → admin UI switches language
8. Browser with `Accept-Language: nb` visits `/` → redirects to `/nb/`
9. Validate with Google's Rich Results Test or hreflang checker tool
