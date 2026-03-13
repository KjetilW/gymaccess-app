# Multilingual i18n (EN + NB) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full English + Norwegian Bokmål (`nb`) support to all GymAccess pages using `next-intl`, with SEO-compliant URL routing, hreflang tags, canonical tags, a language-aware sitemap, and admin language preferences stored per gym.

**Architecture:** Public pages move into an `app/[locale]/` dynamic segment (en/nb) with translated URL slugs (e.g. `/nb/bli-med/[gymId]`). Admin stays at `/admin/` with a language preference stored in `gyms.admin_language` DB column. `next-intl` v3 handles routing, message lookup, and the `Link`/`useRouter` wrappers needed for slug-aware language switching.

**Tech Stack:** next-intl v3, Next.js 14 App Router, TypeScript, PostgreSQL (new `admin_language` column)

---

## File Map

### New files
| Path | Purpose |
|---|---|
| `frontend/i18n/routing.ts` | Locales, defaultLocale, pathnames map (via `defineRouting`) |
| `frontend/i18n/navigation.ts` | Typed `Link`, `useRouter`, `usePathname` helpers (via `createNavigation`) |
| `frontend/i18n/request.ts` | next-intl server-side `getRequestConfig` |
| `frontend/middleware.ts` | next-intl locale routing + detection |
| `frontend/messages/en.json` | All English strings |
| `frontend/messages/nb.json` | All Norwegian strings |
| `frontend/src/app/[locale]/layout.tsx` | Locale-aware layout (NextIntlClientProvider) |
| `frontend/src/app/[locale]/page.tsx` | Landing page (moved from `app/page.tsx`) |
| `frontend/src/app/[locale]/join/[gymId]/page.tsx` | Server wrapper for join page |
| `frontend/src/app/[locale]/join/[gymId]/JoinPageClient.tsx` | Client component (moved from old page.tsx) |
| `frontend/src/app/[locale]/join/[gymId]/payment/page.tsx` | Server wrapper |
| `frontend/src/app/[locale]/join/[gymId]/payment/PaymentPageClient.tsx` | Client component |
| `frontend/src/app/[locale]/join/[gymId]/success/page.tsx` | Server wrapper |
| `frontend/src/app/[locale]/join/[gymId]/success/SuccessPageClient.tsx` | Client component |
| `frontend/src/app/[locale]/manage/[token]/page.tsx` | Server wrapper |
| `frontend/src/app/[locale]/manage/[token]/ManagePageClient.tsx` | Client component |
| `frontend/src/app/components/LanguageSwitcher.tsx` | EN/NB toggle for public navbars |
| `frontend/src/app/components/LocaleBanner.tsx` | "Switch to Norwegian?" suggestion banner |
| `frontend/src/app/sitemap.xml/route.ts` | Custom XML sitemap with hreflang |
| `frontend/src/app/robots.ts` | robots.txt with sitemap URL |

### Modified files
| Path | Change |
|---|---|
| `frontend/next.config.js` | Wrap with `createNextIntlPlugin` |
| `frontend/src/app/layout.tsx` | Strip `<html>/<body>` — becomes a minimal pass-through; fonts stay |
| `frontend/src/app/admin/layout.tsx` | Add `<html>/<body>` wrapper + `NextIntlClientProvider`; extract nav/banners into child `AdminShell` component |
| `frontend/src/app/admin/settings/page.tsx` | Add language selector field |
| `api/src/migrate.ts` | Add `admin_language` column |
| `api/src/routes/admin.ts` | GET /admin/gym + PUT /admin/settings: include `admin_language` |

### Deleted files (replaced by `[locale]/` equivalents)
- `frontend/src/app/page.tsx`
- `frontend/src/app/join/[gymId]/page.tsx`
- `frontend/src/app/join/[gymId]/payment/page.tsx`
- `frontend/src/app/join/[gymId]/success/page.tsx`
- `frontend/src/app/manage/[token]/page.tsx`

---

## Chunk 1: Backend — DB Migration + API

### Task 1: Add `admin_language` to gyms table

**Files:**
- Modify: `api/src/migrate.ts` (end of migrations string, before closing backtick)
- Modify: `api/src/routes/admin.ts:576` (PUT /settings handler)

- [ ] **Step 1: Add migration**

In `api/src/migrate.ts`, add before the closing backtick of the `migrations` string:

```sql
  -- i18n: per-gym admin language preference
  ALTER TABLE gyms ADD COLUMN IF NOT EXISTS admin_language VARCHAR(10) NOT NULL DEFAULT 'en';
```

- [ ] **Step 2: Update PUT /admin/settings to accept `admin_language`**

In `api/src/routes/admin.ts`, update the destructure line at line 578:

Old:
```ts
const { membershipPrice, billingInterval, accessType, igloohome_lock_id, igloohome_client_id, igloohome_client_secret } = req.body;
```

New:
```ts
const { membershipPrice, billingInterval, accessType, igloohome_lock_id, igloohome_client_id, igloohome_client_secret, admin_language } = req.body;
```

Then add a new block after the `igloohome_client_secret` block (before `updates.push('updated_at = NOW()')`):

```ts
if (admin_language && ['en', 'nb'].includes(admin_language)) {
  updates.push(`admin_language = $${paramCount++}`);
  values.push(admin_language);
}
```

- [ ] **Step 3: Restart API to run migration**

```bash
docker compose restart api
docker compose logs -f api | head -5
```
Expected: `Migrations completed successfully.`

- [ ] **Step 4: Verify column exists**

```bash
docker compose exec postgres psql -U postgres -d gymaccess -c "\d gyms" | grep admin_language
```
Expected: `admin_language | character varying(10) | not null default 'en'`

- [ ] **Step 5: Commit**

```bash
git add api/src/migrate.ts api/src/routes/admin.ts
git commit -m "feat: add admin_language column and API support"
```

---

## Chunk 2: next-intl Infrastructure

### Task 2: Install next-intl + update next.config.js

**Files:**
- Modify: `frontend/package.json` (via npm install)
- Modify: `frontend/next.config.js`

- [ ] **Step 1: Install next-intl**

```bash
cd frontend && npm install next-intl
```
Expected: `next-intl` appears in `package.json` dependencies.

- [ ] **Step 2: Update next.config.js**

Replace entire `frontend/next.config.js` with:

```js
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};

module.exports = withNextIntl(nextConfig);
```

### Task 3: Create i18n/routing.ts and i18n/navigation.ts

**Files:**
- Create: `frontend/i18n/routing.ts`
- Create: `frontend/i18n/navigation.ts`

- [ ] **Step 1: Create `frontend/i18n/routing.ts`**

```ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'nb'] as const,
  defaultLocale: 'en',
  localePrefix: 'always',
  pathnames: {
    '/': '/',
    '/join/[gymId]': {
      en: '/join/[gymId]',
      nb: '/bli-med/[gymId]',
    },
    '/join/[gymId]/payment': {
      en: '/join/[gymId]/payment',
      nb: '/bli-med/[gymId]/betaling',
    },
    '/join/[gymId]/success': {
      en: '/join/[gymId]/success',
      nb: '/bli-med/[gymId]/velkommen',
    },
    '/manage/[token]': {
      en: '/manage/[token]',
      nb: '/administrer/[token]',
    },
  },
});

export const locales = routing.locales;
export type Locale = (typeof locales)[number];
export const defaultLocale = routing.defaultLocale;
```

- [ ] **Step 2: Create `frontend/i18n/navigation.ts`** (typed navigation helpers)

```ts
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

### Task 4: Create i18n/request.ts

**Files:**
- Create: `frontend/i18n/request.ts`

- [ ] **Step 1: Create server-side config**

```ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate and fall back to default if invalid
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

### Task 5: Create middleware.ts

**Files:**
- Create: `frontend/middleware.ts`

- [ ] **Step 1: Create middleware**

```ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  ...routing,
  localeDetection: true,
});

export default function middleware(request: NextRequest) {
  // Check for explicit locale preference cookie
  const localePref = request.cookies.get('locale-pref')?.value;
  if (localePref && routing.locales.includes(localePref as any)) {
    // Cookie takes precedence — next-intl will use Accept-Language by default,
    // so we override by temporarily spoofing the header only when cookie is set.
    // next-intl localeDetection uses Accept-Language; cookie is handled by
    // redirecting via the existing intlMiddleware with the cookie-set locale.
  }
  return intlMiddleware(request);
}

export const config = {
  // Match all paths except: admin/*, _next/*, _vercel/*, and static files
  matcher: ['/((?!admin|_next|_vercel|.*\\..*).*)'],
};
```

> **Note:** next-intl's built-in `localeDetection` uses the `Accept-Language` header. The `locale-pref` cookie is read in the middleware and respected by checking it before delegating to intlMiddleware. The LanguageSwitcher sets this cookie when the user explicitly switches. The simplest way to respect the cookie: check it before calling intlMiddleware and redirect if it differs from the current locale path.

Full middleware with cookie handling:

```ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for explicit locale preference cookie
  const localePref = request.cookies.get('locale-pref')?.value;
  const validLocales = routing.locales as readonly string[];

  if (localePref && validLocales.includes(localePref)) {
    // If user has a preference cookie, check if current path already matches it
    const pathLocale = pathname.split('/')[1];
    if (pathLocale !== localePref && validLocales.includes(pathLocale)) {
      // Redirect to preferred locale version
      // Replace only the leading locale segment (not occurrences elsewhere in the path)
    const newPath = `/${localePref}${pathname.slice(pathLocale.length + 1)}`;
      return NextResponse.redirect(new URL(newPath, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!admin|_next|_vercel|.*\\..*).*)'],
};
```

- [ ] **Step 2: Commit infrastructure**

```bash
cd frontend && git add i18n/ middleware.ts next.config.js package.json package-lock.json
git commit -m "feat: add next-intl infrastructure (config, routing, middleware)"
```

---

## Chunk 3: Translation Files

### Task 6: Create messages/en.json and messages/nb.json

**Files:**
- Create: `frontend/messages/en.json`
- Create: `frontend/messages/nb.json`

These files must contain ALL translatable strings from all 16 pages. The structure below is complete for the public pages (landing, join, manage). Admin strings must be extracted by reading each admin page source file and adding them to the `admin.*` namespace.

- [ ] **Step 1: Create `frontend/messages/en.json`**

```json
{
  "meta": {
    "landing": {
      "title": "GymAccess — Gym Membership Management",
      "description": "Automated membership management for small community gyms. Signup, payments, and access control in one place.",
      "ogTitle": "GymAccess — Gym Membership Management",
      "ogDescription": "Automated membership management for small community gyms."
    },
    "join": {
      "title": "Join {gymName} — GymAccess",
      "description": "Sign up for a membership at {gymName}."
    },
    "manage": {
      "title": "Manage Membership — GymAccess",
      "description": "Manage your gym membership."
    }
  },
  "nav": {
    "signIn": "Sign in",
    "register": "Register your gym",
    "support": "Support"
  },
  "landing": {
    "badge": "Built for community gyms with 20–200 members",
    "hero": {
      "headline1": "Stop chasing payments.",
      "headline2": "Start running your gym.",
      "body": "GymAccess automates signups, recurring payments, and door access — so you can spend less time on admin and more time on your gym.",
      "ctaPrimary": "Get started free →",
      "ctaSecondary": "See how it works"
    },
    "pain": {
      "heading": "Sound familiar?",
      "spreadsheet": {
        "title": "Spreadsheet chaos",
        "body": "Tracking members in Excel. Who's paid? Who hasn't? Nobody knows."
      },
      "chasing": {
        "title": "Chasing payments",
        "body": "Sending reminders on Vipps, bank transfer, or WhatsApp. Every. Single. Month."
      },
      "codes": {
        "title": "Sharing door codes",
        "body": "Texting codes manually. Ex-members still have access."
      },
      "nooverview": {
        "title": "No overview",
        "body": "No dashboard. No history. Just your inbox and a prayer."
      }
    },
    "features": {
      "heading": "Automate the boring stuff",
      "subheading": "Everything that used to take hours — now runs itself.",
      "before": "Before",
      "after": "After",
      "signup": {
        "title": "Member signup",
        "before": "New members message you. You add them to the spreadsheet. Maybe.",
        "after": "Share your gym's signup link. Members register and pay themselves."
      },
      "payments": {
        "title": "Recurring payments",
        "before": "Monthly reminders. Awkward follow-ups. Lost revenue.",
        "after": "Stripe handles billing automatically. Failed payments retry. You get notified."
      },
      "access": {
        "title": "Access control",
        "before": "Texting door codes. Changing the code when someone leaves. Forgetting to.",
        "after": "Codes issued on payment, revoked on cancellation. Supports shared PINs, individual codes, or smart locks."
      }
    },
    "howItWorks": {
      "heading": "Up and running in 15 minutes",
      "subheading": "No technical skills needed. No hardware required.",
      "step1": { "title": "Create your gym", "body": "Set your name, price, and billing cycle. That's it." },
      "step2": { "title": "Share your link", "body": "Every gym gets a signup page. Send it to members." },
      "step3": { "title": "Members pay & get access", "body": "They sign up via Stripe and receive their door code instantly." },
      "step4": { "title": "You're done", "body": "Renewals, reminders, and access revocation happen automatically." }
    },
    "pricing": {
      "heading": "Simple, transparent pricing",
      "subheading": "Start free. Upgrade when you're ready.",
      "saveOnFees": "Save on fees",
      "starter": {
        "name": "Starter",
        "price": "Free",
        "fee": "3% platform fee on member payments",
        "cta": "Get started free →",
        "features": [
          "Unlimited members",
          "Automated payments via Stripe",
          "Access code management",
          "igloohome lock support",
          "Email notifications",
          "Admin dashboard"
        ]
      },
      "pro": {
        "name": "Pro",
        "price": "299 kr",
        "interval": "/month",
        "fee": "1% platform fee · or 2 490 kr/year",
        "cta": "Start with Pro →",
        "features": [
          "Everything in Starter",
          "1% platform fee (vs. 3%)",
          "Lower cost as you grow"
        ]
      }
    },
    "faq": {
      "heading": "Common questions",
      "q1": "Do I need technical skills?",
      "a1": "No. If you can fill in a form, you can set up GymAccess. It takes about 15 minutes.",
      "q2": "What about my existing members?",
      "a2": "You can add existing members manually from the admin dashboard and send them a signup link to start paying automatically.",
      "q3": "What payment methods do members use?",
      "a3": "Card payments via Stripe. Members enter their card once and get billed automatically.",
      "q4": "How does access control work?",
      "a4": "You choose: shared PIN for the whole gym, individual codes per member, or smart lock integration with igloohome. Codes are sent automatically on payment and revoked on cancellation.",
      "q5": "Can I cancel anytime?",
      "a5": "Yes. No lock-in, no contracts. Cancel from your dashboard."
    },
    "cta": {
      "heading1": "Your gym runs 24/7.",
      "heading2": "Your admin shouldn't.",
      "body": "Set up GymAccess in 15 minutes and never chase a payment again.",
      "button": "Get started free →"
    },
    "footer": {
      "tagline": "Built for community gyms",
      "register": "Register",
      "signIn": "Sign in",
      "support": "Support",
      "copyright": "© {year} GymAccess. All rights reserved."
    }
  },
  "join": {
    "loading": "",
    "notFound": {
      "title": "Gym not found",
      "body": "This signup link may be invalid or expired.",
      "back": "Back to home"
    },
    "gymCard": {
      "label": "Join",
      "year": "year",
      "month": "month"
    },
    "form": {
      "heading": "Your details",
      "name": { "label": "Full name", "placeholder": "Your name", "error": "Your name is required" },
      "email": { "label": "Email address", "placeholder": "you@example.com", "errorRequired": "Email is required", "errorInvalid": "Please enter a valid email address" },
      "phone": { "label": "Phone number", "optional": "(optional)", "placeholder": "+47 123 45 678" },
      "terms": { "text": "I agree to the", "link": "terms and conditions", "suffix": "and understand that my membership will renew automatically until cancelled.", "error": "You must accept the terms to proceed" },
      "submit": "Proceed to payment — NOK {price}",
      "submitting": "Creating account…",
      "submitError": "Something went wrong. Please try again."
    },
    "footer": {
      "security": "Secure payments by Stripe · Member data is encrypted"
    }
  },
  "payment": {
    "loading": {
      "title": "Redirecting to secure payment…",
      "poweredBy": "Powered by Stripe"
    },
    "error": {
      "title": "Payment setup failed",
      "backToSignup": "Back to signup",
      "missingMember": "Missing member information. Please sign up again.",
      "connectionError": "Could not connect to payment service. Please try again."
    }
  },
  "success": {
    "activating": "Activating your membership…",
    "title": "Payment successful!",
    "body": "Welcome! Your membership is now active. Check your email for your access code.",
    "nextSteps": {
      "heading": "What happens next?",
      "step1": "You will receive a welcome email with your access code",
      "step2": "Your membership renews automatically each billing period",
      "step3": "Check your email for a link to manage your subscription"
    }
  },
  "manage": {
    "loading": "Loading your membership…",
    "error": {
      "title": "Invalid link",
      "body": "This manage link is invalid or has expired. Please contact your gym administrator."
    },
    "membershipAt": "Membership at",
    "labels": {
      "member": "Member",
      "email": "Email",
      "plan": "Plan",
      "status": "Status"
    },
    "interval": { "year": "year", "month": "month" },
    "actions": {
      "manage": "Manage Subscription",
      "managing": "Opening…",
      "updatePayment": "Update Payment Method"
    },
    "states": {
      "pastDue": "Your last payment failed. Please update your payment method to restore access.",
      "cancelled": "Your membership has been cancelled. Contact your gym to rejoin.",
      "pending": "Your membership is pending payment. Check your email for the payment link.",
      "suspended": "Your membership has been suspended. Please contact your gym administrator."
    }
  },
  "common": {
    "status": {
      "active": "Active",
      "pending": "Pending",
      "past_due": "Past due",
      "cancelled": "Cancelled",
      "suspended": "Suspended",
      "expired": "Expired"
    },
    "actions": {
      "save": "Save",
      "saving": "Saving…",
      "cancel": "Cancel",
      "delete": "Delete",
      "back": "Back"
    },
    "appName": "GymAccess"
  },
  "banner": {
    "text": "This page is available in Norwegian.",
    "cta": "Switch to Norwegian →",
    "dismiss": "Dismiss"
  },
  "languageSwitcher": {
    "en": "EN",
    "nb": "NB"
  },
  "admin": {
    "nav": {
      "members": "Members",
      "access": "Access",
      "payments": "Payments",
      "settings": "Settings",
      "signOut": "Sign out"
    },
    "banners": {
      "stripeNotConnected": {
        "title": "Stripe not connected.",
        "body": "Your members won't be able to pay until you connect your Stripe account.",
        "cta": "Connect Stripe"
      },
      "stripePending": {
        "title": "Stripe setup incomplete.",
        "body": "Finish your Stripe onboarding to start accepting member payments.",
        "cta": "Finish setup"
      },
      "saasPastDue": {
        "title": "Payment issue with your Pro subscription.",
        "body": "Update your payment method to keep the 1% transaction fee.",
        "cta": "Fix now"
      },
      "saasStarter": {
        "body": "You're on the Starter plan (3% transaction fee).",
        "upgrade": "Upgrade to Pro for just 1%.",
        "cta": "Upgrade"
      }
    },
    "login": {
      "title": "Sign in to GymAccess",
      "subtitle": "Manage your gym membership system",
      "email": "Email address",
      "password": "Password",
      "submit": "Sign in",
      "submitting": "Signing in…",
      "noAccount": "Don't have an account?",
      "register": "Register your gym",
      "error": "Invalid email or password"
    },
    "register": {
      "title": "Register your gym",
      "steps": {
        "account": "Account",
        "plan": "Plan",
        "pricing": "Pricing",
        "access": "Access"
      },
      "submit": "Create gym",
      "submitting": "Creating…",
      "alreadyHave": "Already have an account?",
      "signIn": "Sign in"
    },
    "members": {
      "title": "Members",
      "search": "Search members…",
      "filterAll": "All statuses",
      "copyLink": "Copy signup link",
      "linkCopied": "Link copied!",
      "addMember": "Add member",
      "table": {
        "name": "Name",
        "email": "Email",
        "status": "Status",
        "accessCode": "Access code",
        "joined": "Joined",
        "actions": "Actions"
      },
      "actions": {
        "suspend": "Suspend",
        "cancel": "Cancel",
        "resend": "Resend email",
        "viewDetails": "View details"
      },
      "noMembers": "No members found.",
      "pagination": {
        "previous": "Previous",
        "next": "Next",
        "of": "of",
        "page": "Page"
      },
      "confirmSuspend": {
        "title": "Suspend {name}?",
        "body": "This will revoke their access code. They can be reactivated later.",
        "confirm": "Suspend",
        "cancel": "Cancel"
      },
      "confirmCancel": {
        "title": "Cancel membership for {name}?",
        "body": "This will cancel their Stripe subscription and revoke access. This cannot be undone.",
        "confirm": "Cancel membership",
        "cancel": "Keep membership"
      }
    },
    "payments": {
      "title": "Payments",
      "table": {
        "member": "Member",
        "amount": "Amount",
        "status": "Status",
        "date": "Date",
        "description": "Description"
      },
      "noPayments": "No payments found.",
      "status": {
        "paid": "Paid",
        "failed": "Failed",
        "pending": "Pending",
        "refunded": "Refunded"
      }
    },
    "access": {
      "title": "Access",
      "table": {
        "member": "Member",
        "code": "Access code",
        "type": "Type",
        "validFrom": "Valid from",
        "validTo": "Valid to"
      },
      "noAccess": "No access codes found.",
      "types": {
        "shared_pin": "Shared PIN",
        "individual": "Individual",
        "igloohome_direct": "igloohome"
      }
    },
    "settings": {
      "title": "Settings",
      "gym": {
        "heading": "Gym settings",
        "name": "Gym name",
        "location": "Location",
        "price": "Membership price (NOK)",
        "interval": "Billing interval",
        "intervalMonthly": "Monthly",
        "intervalYearly": "Yearly",
        "accessType": "Access type",
        "accessShared": "Shared PIN",
        "accessIndividual": "Individual codes",
        "save": "Save settings"
      },
      "language": {
        "heading": "Language",
        "label": "Admin interface language",
        "en": "English",
        "nb": "Norwegian (Bokmål)",
        "save": "Save language"
      },
      "stripe": {
        "heading": "Stripe Connect",
        "connected": "Connected",
        "notConnected": "Not connected",
        "connect": "Connect Stripe",
        "manage": "Manage Stripe account"
      },
      "plan": {
        "heading": "Plan & Billing",
        "currentPlan": "Current plan",
        "upgradeToProMonthly": "Upgrade to Pro — 299 kr/month",
        "upgradeToProYearly": "Upgrade to Pro — 2 490 kr/year",
        "manageSubscription": "Manage subscription",
        "cancelPlan": "Cancel Pro plan"
      },
      "igloohome": {
        "heading": "igloohome Direct",
        "connected": "Connected",
        "notConnected": "Not connected",
        "configure": "Configure",
        "clientId": "Client ID",
        "clientSecret": "Client Secret",
        "lockId": "Lock ID",
        "save": "Save igloohome settings",
        "disconnect": "Disconnect"
      },
      "notifications": {
        "heading": "Email notifications",
        "welcome": "Welcome email",
        "paymentReceipt": "Payment receipt",
        "paymentFailed": "Payment failed",
        "cancellation": "Cancellation",
        "subject": "Subject",
        "body": "Body",
        "save": "Save template",
        "variables": "Available variables"
      },
      "saved": "Settings saved",
      "error": "Failed to save settings"
    }
  }
}
```

- [ ] **Step 2: Create `frontend/messages/nb.json`**

```json
{
  "meta": {
    "landing": {
      "title": "GymAccess — Administrasjon av treningssentermedlemskap",
      "description": "Automatisert medlemsadministrasjon for små lokalgymer. Registrering, betalinger og tilgangskontroll på ett sted.",
      "ogTitle": "GymAccess — Administrasjon av treningssentermedlemskap",
      "ogDescription": "Automatisert medlemsadministrasjon for små lokalgymer."
    },
    "join": {
      "title": "Bli medlem hos {gymName} — GymAccess",
      "description": "Registrer deg for et medlemskap hos {gymName}."
    },
    "manage": {
      "title": "Administrer medlemskap — GymAccess",
      "description": "Administrer ditt treningssentermedlemskap."
    }
  },
  "nav": {
    "signIn": "Logg inn",
    "register": "Registrer treningssenteret ditt",
    "support": "Support"
  },
  "landing": {
    "badge": "Bygget for lokalgymer med 20–200 medlemmer",
    "hero": {
      "headline1": "Slutt å jage betalinger.",
      "headline2": "Begynn å drive treningssenteret ditt.",
      "body": "GymAccess automatiserer registreringer, gjentakende betalinger og dørtilgang — så du kan bruke mindre tid på administrasjon og mer tid på treningssenteret ditt.",
      "ctaPrimary": "Kom i gang gratis →",
      "ctaSecondary": "Se hvordan det fungerer"
    },
    "pain": {
      "heading": "Kjent problemstilling?",
      "spreadsheet": {
        "title": "Regneark-kaos",
        "body": "Sporer medlemmer i Excel. Hvem har betalt? Hvem har ikke? Ingen vet."
      },
      "chasing": {
        "title": "Jage betalinger",
        "body": "Sender påminnelser på Vipps, bankoverføring eller WhatsApp. Hver. Eneste. Måned."
      },
      "codes": {
        "title": "Dele dørkoden",
        "body": "Sender koder manuelt. Tidligere medlemmer har fortsatt tilgang."
      },
      "nooverview": {
        "title": "Ingen oversikt",
        "body": "Ingen dashbord. Ingen historikk. Bare innboksen din og et håp."
      }
    },
    "features": {
      "heading": "Automatiser det kjedelige",
      "subheading": "Alt som pleide å ta timer — kjører nå av seg selv.",
      "before": "Før",
      "after": "Etter",
      "signup": {
        "title": "Medlemsregistrering",
        "before": "Nye medlemmer sender deg melding. Du legger dem til i regnearket. Kanskje.",
        "after": "Del registreringslenken til treningssenteret ditt. Medlemmer registrerer og betaler selv."
      },
      "payments": {
        "title": "Gjentakende betalinger",
        "before": "Månedlige påminnelser. Vanskelige oppfølginger. Tapte inntekter.",
        "after": "Stripe håndterer fakturering automatisk. Mislykkede betalinger prøves på nytt. Du får varsel."
      },
      "access": {
        "title": "Tilgangskontroll",
        "before": "Sender dørkoden manuelt. Endrer koden når noen slutter. Glemmer det.",
        "after": "Koder utstedes ved betaling, tilbakekalles ved kansellering. Støtter delte PINer, individuelle koder eller smarte låser."
      }
    },
    "howItWorks": {
      "heading": "Oppe og kjører på 15 minutter",
      "subheading": "Ingen tekniske ferdigheter nødvendig. Ingen maskinvare kreves.",
      "step1": { "title": "Opprett treningssenteret ditt", "body": "Sett navn, pris og faktureringssyklus. Det er alt." },
      "step2": { "title": "Del lenken din", "body": "Hvert treningssenter får en registreringsside. Send den til medlemmer." },
      "step3": { "title": "Medlemmer betaler og får tilgang", "body": "De registrerer seg via Stripe og mottar dørkodet umiddelbart." },
      "step4": { "title": "Du er ferdig", "body": "Fornyelser, påminnelser og tilbakekalling av tilgang skjer automatisk." }
    },
    "pricing": {
      "heading": "Enkel, transparent prising",
      "subheading": "Start gratis. Oppgrader når du er klar.",
      "saveOnFees": "Spar på avgifter",
      "starter": {
        "name": "Starter",
        "price": "Gratis",
        "fee": "3% plattformavgift på medlemsbetalinger",
        "cta": "Kom i gang gratis →",
        "features": [
          "Ubegrenset antall medlemmer",
          "Automatiserte betalinger via Stripe",
          "Administrasjon av tilgangskoder",
          "Støtte for igloohome-lås",
          "E-postvarsler",
          "Administrasjonsdashbord"
        ]
      },
      "pro": {
        "name": "Pro",
        "price": "299 kr",
        "interval": "/måned",
        "fee": "1% plattformavgift · eller 2 490 kr/år",
        "cta": "Start med Pro →",
        "features": [
          "Alt i Starter",
          "1% plattformavgift (mot 3%)",
          "Lavere kostnad etter hvert som du vokser"
        ]
      }
    },
    "faq": {
      "heading": "Vanlige spørsmål",
      "q1": "Trenger jeg tekniske ferdigheter?",
      "a1": "Nei. Hvis du kan fylle ut et skjema, kan du sette opp GymAccess. Det tar omtrent 15 minutter.",
      "q2": "Hva med eksisterende medlemmer?",
      "a2": "Du kan legge til eksisterende medlemmer manuelt fra administrasjonsdashbordet og sende dem en registreringslenke for å starte automatisk betaling.",
      "q3": "Hvilke betalingsmetoder bruker medlemmer?",
      "a3": "Kortbetalinger via Stripe. Medlemmer legger inn kortet sitt én gang og faktureres automatisk.",
      "q4": "Hvordan fungerer tilgangskontrollen?",
      "a4": "Du velger: delt PIN for hele treningssenteret, individuelle koder per medlem eller smart låsintegrering med igloohome. Koder sendes automatisk ved betaling og tilbakekalles ved kansellering.",
      "q5": "Kan jeg kansellere når som helst?",
      "a5": "Ja. Ingen bindingstid, ingen kontrakter. Kanseller fra dashbordet ditt."
    },
    "cta": {
      "heading1": "Treningssenteret ditt er åpent 24/7.",
      "heading2": "Administrasjonen din bør ikke være det.",
      "body": "Sett opp GymAccess på 15 minutter og jag aldri en betaling igjen.",
      "button": "Kom i gang gratis →"
    },
    "footer": {
      "tagline": "Bygget for lokalgymer",
      "register": "Registrer",
      "signIn": "Logg inn",
      "support": "Support",
      "copyright": "© {year} GymAccess. Alle rettigheter forbeholdt."
    }
  },
  "join": {
    "loading": "",
    "notFound": {
      "title": "Treningssenter ikke funnet",
      "body": "Denne registreringslenken kan være ugyldig eller utløpt.",
      "back": "Tilbake til hjem"
    },
    "gymCard": {
      "label": "Bli med",
      "year": "år",
      "month": "måned"
    },
    "form": {
      "heading": "Dine opplysninger",
      "name": { "label": "Fullt navn", "placeholder": "Ditt navn", "error": "Navn er påkrevd" },
      "email": { "label": "E-postadresse", "placeholder": "deg@eksempel.no", "errorRequired": "E-post er påkrevd", "errorInvalid": "Vennligst skriv inn en gyldig e-postadresse" },
      "phone": { "label": "Telefonnummer", "optional": "(valgfritt)", "placeholder": "+47 123 45 678" },
      "terms": { "text": "Jeg godtar", "link": "vilkårene og betingelsene", "suffix": "og forstår at mitt medlemskap fornyes automatisk til det kanselleres.", "error": "Du må godta vilkårene for å gå videre" },
      "submit": "Gå til betaling — NOK {price}",
      "submitting": "Oppretter konto…",
      "submitError": "Noe gikk galt. Vennligst prøv igjen."
    },
    "footer": {
      "security": "Sikre betalinger av Stripe · Medlemsdata er kryptert"
    }
  },
  "payment": {
    "loading": {
      "title": "Omdirigerer til sikker betaling…",
      "poweredBy": "Drevet av Stripe"
    },
    "error": {
      "title": "Betalingsoppsett mislyktes",
      "backToSignup": "Tilbake til registrering",
      "missingMember": "Mangler medlemsinformasjon. Vennligst registrer deg på nytt.",
      "connectionError": "Kunne ikke koble til betalingstjenesten. Vennligst prøv igjen."
    }
  },
  "success": {
    "activating": "Aktiverer ditt medlemskap…",
    "title": "Betaling vellykket!",
    "body": "Velkommen! Ditt medlemskap er nå aktivt. Sjekk e-posten din for tilgangskoden din.",
    "nextSteps": {
      "heading": "Hva skjer videre?",
      "step1": "Du vil motta en velkomst-e-post med tilgangskoden din",
      "step2": "Ditt medlemskap fornyes automatisk hver faktureringsperiode",
      "step3": "Sjekk e-posten din for en lenke til å administrere abonnementet ditt"
    }
  },
  "manage": {
    "loading": "Laster ditt medlemskap…",
    "error": {
      "title": "Ugyldig lenke",
      "body": "Denne administrasjonslenken er ugyldig eller har utløpt. Vennligst kontakt treningssenterets administrator."
    },
    "membershipAt": "Medlemskap hos",
    "labels": {
      "member": "Medlem",
      "email": "E-post",
      "plan": "Plan",
      "status": "Status"
    },
    "interval": { "year": "år", "month": "måned" },
    "actions": {
      "manage": "Administrer abonnement",
      "managing": "Åpner…",
      "updatePayment": "Oppdater betalingsmetode"
    },
    "states": {
      "pastDue": "Din siste betaling mislyktes. Vennligst oppdater betalingsmetoden din for å gjenopprette tilgang.",
      "cancelled": "Ditt medlemskap er kansellert. Kontakt treningssenteret ditt for å bli med igjen.",
      "pending": "Ditt medlemskap venter på betaling. Sjekk e-posten din for betalingslenken.",
      "suspended": "Ditt medlemskap er suspendert. Vennligst kontakt treningssenterets administrator."
    }
  },
  "common": {
    "status": {
      "active": "Aktiv",
      "pending": "Venter",
      "past_due": "Forfalt",
      "cancelled": "Kansellert",
      "suspended": "Suspendert",
      "expired": "Utløpt"
    },
    "actions": {
      "save": "Lagre",
      "saving": "Lagrer…",
      "cancel": "Avbryt",
      "delete": "Slett",
      "back": "Tilbake"
    },
    "appName": "GymAccess"
  },
  "banner": {
    "text": "Siden er tilgjengelig på norsk.",
    "cta": "Bytt til norsk →",
    "dismiss": "Lukk"
  },
  "languageSwitcher": {
    "en": "EN",
    "nb": "NB"
  },
  "admin": {
    "nav": {
      "members": "Medlemmer",
      "access": "Tilgang",
      "payments": "Betalinger",
      "settings": "Innstillinger",
      "signOut": "Logg ut"
    },
    "banners": {
      "stripeNotConnected": {
        "title": "Stripe ikke tilkoblet.",
        "body": "Medlemmene dine vil ikke kunne betale før du kobler til Stripe-kontoen din.",
        "cta": "Koble til Stripe"
      },
      "stripePending": {
        "title": "Stripe-oppsett ufullstendig.",
        "body": "Fullfør Stripe-onboardingen for å begynne å motta medlemsbetalinger.",
        "cta": "Fullfør oppsett"
      },
      "saasPastDue": {
        "title": "Betalingsproblem med Pro-abonnementet ditt.",
        "body": "Oppdater betalingsmetoden din for å beholde 1% transaksjonsavgiften.",
        "cta": "Fiks nå"
      },
      "saasStarter": {
        "body": "Du bruker Starter-planen (3% transaksjonsavgift).",
        "upgrade": "Oppgrader til Pro for bare 1%.",
        "cta": "Oppgrader"
      }
    },
    "login": {
      "title": "Logg inn på GymAccess",
      "subtitle": "Administrer treningssenterets medlemssystem",
      "email": "E-postadresse",
      "password": "Passord",
      "submit": "Logg inn",
      "submitting": "Logger inn…",
      "noAccount": "Har du ikke en konto?",
      "register": "Registrer treningssenteret ditt",
      "error": "Ugyldig e-post eller passord"
    },
    "register": {
      "title": "Registrer treningssenteret ditt",
      "steps": {
        "account": "Konto",
        "plan": "Plan",
        "pricing": "Prissetting",
        "access": "Tilgang"
      },
      "submit": "Opprett treningssenter",
      "submitting": "Oppretter…",
      "alreadyHave": "Har du allerede en konto?",
      "signIn": "Logg inn"
    },
    "members": {
      "title": "Medlemmer",
      "search": "Søk etter medlemmer…",
      "filterAll": "Alle statuser",
      "copyLink": "Kopier registreringslenke",
      "linkCopied": "Lenke kopiert!",
      "addMember": "Legg til medlem",
      "table": {
        "name": "Navn",
        "email": "E-post",
        "status": "Status",
        "accessCode": "Tilgangskode",
        "joined": "Ble med",
        "actions": "Handlinger"
      },
      "actions": {
        "suspend": "Suspender",
        "cancel": "Kanseller",
        "resend": "Send e-post på nytt",
        "viewDetails": "Se detaljer"
      },
      "noMembers": "Ingen medlemmer funnet.",
      "pagination": {
        "previous": "Forrige",
        "next": "Neste",
        "of": "av",
        "page": "Side"
      },
      "confirmSuspend": {
        "title": "Suspender {name}?",
        "body": "Dette vil tilbakekalle tilgangskoden deres. De kan reaktiveres senere.",
        "confirm": "Suspender",
        "cancel": "Avbryt"
      },
      "confirmCancel": {
        "title": "Kanseller medlemskap for {name}?",
        "body": "Dette vil kansellere Stripe-abonnementet og tilbakekalle tilgang. Dette kan ikke angres.",
        "confirm": "Kanseller medlemskap",
        "cancel": "Behold medlemskap"
      }
    },
    "payments": {
      "title": "Betalinger",
      "table": {
        "member": "Medlem",
        "amount": "Beløp",
        "status": "Status",
        "date": "Dato",
        "description": "Beskrivelse"
      },
      "noPayments": "Ingen betalinger funnet.",
      "status": {
        "paid": "Betalt",
        "failed": "Mislyktes",
        "pending": "Venter",
        "refunded": "Refundert"
      }
    },
    "access": {
      "title": "Tilgang",
      "table": {
        "member": "Medlem",
        "code": "Tilgangskode",
        "type": "Type",
        "validFrom": "Gyldig fra",
        "validTo": "Gyldig til"
      },
      "noAccess": "Ingen tilgangskoder funnet.",
      "types": {
        "shared_pin": "Delt PIN",
        "individual": "Individuell",
        "igloohome_direct": "igloohome"
      }
    },
    "settings": {
      "title": "Innstillinger",
      "gym": {
        "heading": "Treningssenterinnstillinger",
        "name": "Navn på treningssenter",
        "location": "Sted",
        "price": "Medlemskapspris (NOK)",
        "interval": "Faktureringsintervall",
        "intervalMonthly": "Månedlig",
        "intervalYearly": "Årlig",
        "accessType": "Tilgangstype",
        "accessShared": "Delt PIN",
        "accessIndividual": "Individuelle koder",
        "save": "Lagre innstillinger"
      },
      "language": {
        "heading": "Språk",
        "label": "Administrasjonsgrensesnittets språk",
        "en": "Engelsk",
        "nb": "Norsk (Bokmål)",
        "save": "Lagre språk"
      },
      "stripe": {
        "heading": "Stripe Connect",
        "connected": "Tilkoblet",
        "notConnected": "Ikke tilkoblet",
        "connect": "Koble til Stripe",
        "manage": "Administrer Stripe-konto"
      },
      "plan": {
        "heading": "Plan og fakturering",
        "currentPlan": "Gjeldende plan",
        "upgradeToProMonthly": "Oppgrader til Pro — 299 kr/måned",
        "upgradeToProYearly": "Oppgrader til Pro — 2 490 kr/år",
        "manageSubscription": "Administrer abonnement",
        "cancelPlan": "Kanseller Pro-plan"
      },
      "igloohome": {
        "heading": "igloohome Direct",
        "connected": "Tilkoblet",
        "notConnected": "Ikke tilkoblet",
        "configure": "Konfigurer",
        "clientId": "Klient-ID",
        "clientSecret": "Klienthemmelighet",
        "lockId": "Lås-ID",
        "save": "Lagre igloohome-innstillinger",
        "disconnect": "Koble fra"
      },
      "notifications": {
        "heading": "E-postvarsler",
        "welcome": "Velkomst-e-post",
        "paymentReceipt": "Betalingskvittering",
        "paymentFailed": "Betaling mislyktes",
        "cancellation": "Kansellering",
        "subject": "Emne",
        "body": "Innhold",
        "save": "Lagre mal",
        "variables": "Tilgjengelige variabler"
      },
      "saved": "Innstillinger lagret",
      "error": "Kunne ikke lagre innstillinger"
    }
  }
}
```

> **Important:** After writing these files, also read `frontend/src/app/admin/settings/page.tsx`, `frontend/src/app/admin/payments/page.tsx`, `frontend/src/app/admin/access/page.tsx`, `frontend/src/app/admin/login/page.tsx`, and `frontend/src/app/admin/register/page.tsx` to find any additional strings not yet covered above. Add them to the appropriate `admin.*` namespace in both files.

- [ ] **Step 3: Commit**

```bash
git add messages/
git commit -m "feat: add en/nb translation files"
```

---

## Chunk 4: Directory Restructure + Server Component Wrappers

### Task 7: Prepare directory structure

**Files:**
- Create: `frontend/src/app/[locale]/` directory
- Create: `frontend/src/app/[locale]/layout.tsx`

- [ ] **Step 1: Create locale layout**

Create `frontend/src/app/[locale]/layout.tsx`:

```tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../../i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as any)) notFound();

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 2: Restructure root layout to be a pass-through shell**

The correct Next.js 14 App Router pattern for per-locale `<html lang>`: each "subtree root" layout renders its own `<html>/<body>`. The root `app/layout.tsx` becomes a minimal pass-through. Public pages get their `<html lang={locale}>` from `[locale]/layout.tsx`. Admin pages get `<html lang="en">` from an updated `app/admin/layout.tsx`.

Replace `frontend/src/app/layout.tsx` entirely:

```tsx
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google';
import './globals.css';

// Fonts defined here so both locale and admin layouts can import them
export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
});

// Root layout is a pass-through — html/body are rendered by [locale]/layout.tsx
// and admin/layout.tsx respectively so each can set the correct lang attribute.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children as any;
}
```

> Note: Returning `children` directly without `<html>/<body>` is valid in Next.js 14 when all active routes provide their own `<html>/<body>` via nested layouts. The TypeScript cast `as any` suppresses the return type mismatch. Next.js may show a dev warning but will build and run correctly.

- [ ] **Step 3: Update `[locale]/layout.tsx` to render `<html lang={locale}>`**

Replace the locale layout content so it renders `<html>` and `<body>`:

```tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../../i18n/routing';
import { plusJakarta, dmSans } from '../layout';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as any)) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${plusJakarta.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-warm-50 text-forest-900 antialiased font-body">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

This gives the correct `lang="nb"` in the server-rendered HTML for `/nb/` pages. No client-side workaround needed.

### Task 8: Move landing page to [locale]/page.tsx

**Files:**
- Create: `frontend/src/app/[locale]/page.tsx` (landing page with translations)
- Delete: `frontend/src/app/page.tsx`

The landing page (`app/page.tsx`) has NO `'use client'` directive — it is already a Server Component. Move it directly and add `useTranslations`.

- [ ] **Step 1: Create `frontend/src/app/[locale]/page.tsx`**

The page needs to:
1. Import `useTranslations` from `next-intl`
2. Replace all hardcoded strings with `t('key')` calls
3. Export `generateMetadata` with per-locale title/description/hreflang/canonical
4. Use the `Link` component from `i18n/navigation` (not `next/link`) for locale-aware routing

Key pattern for the page:
```tsx
// Server Component — import getTranslations (async), NOT useTranslations (client hook)
import { getTranslations } from 'next-intl/server';
import { Link } from '../../../i18n/navigation';
import { routing } from '../../../i18n/routing';
import { FaqItem } from '../components/FaqItem';
import { Logo } from '../components/Logo';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { LocaleBanner } from '../components/LocaleBanner';

const BASE_URL = 'https://gymaccess.app';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'meta.landing' });
  const alternateLocale = locale === 'en' ? 'nb' : 'en';
  const localePath = locale === 'en' ? '/en' : '/nb';
  const alternatePath = locale === 'en' ? '/nb' : '/en';

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
    },
    alternates: {
      canonical: `${BASE_URL}${localePath}/`,
      languages: {
        en: `${BASE_URL}/en/`,
        nb: `${BASE_URL}/nb/`,
        'x-default': `${BASE_URL}/en/`,
      },
    },
  };
}

export default async function Home({ params: { locale } }: { params: { locale: string } }) {
  // Server Component: use getTranslations (async), NOT useTranslations (client hook)
  const t = await getTranslations({ locale, namespace: 'landing' });
  const nav = await getTranslations({ locale, namespace: 'nav' });
  // Use t('hero.headline1'), t('pain.heading'), nav('signIn'), etc.
  // FaqItem receives pre-translated strings as props (valid: Server Component → Client Component)
}
```

> Full implementation: go through the existing `app/page.tsx` line by line, replacing each hardcoded string with the appropriate `t('key')` call using the en.json structure defined in Task 6. The component structure (JSX layout, Tailwind classes) stays identical.

- [ ] **Step 2: Add LanguageSwitcher to the nav**

In the navbar section of `[locale]/page.tsx`, add `<LanguageSwitcher />` next to the sign-in link.

- [ ] **Step 3: Delete old page.tsx**

```bash
rm frontend/src/app/page.tsx
```

### Task 9: Create Server Component wrappers for join/* pages

The join pages use `'use client'` hooks (`useParams`, `useRouter`, `useSearchParams`). Strategy: create a thin Server Component that exports `generateMetadata` and renders the existing client component.

**Files:**
- Create: `frontend/src/app/[locale]/join/[gymId]/page.tsx` (server wrapper)
- Create: `frontend/src/app/[locale]/join/[gymId]/JoinPageClient.tsx` (client component, adapted from old page)
- Create: `frontend/src/app/[locale]/join/[gymId]/payment/page.tsx`
- Create: `frontend/src/app/[locale]/join/[gymId]/payment/PaymentPageClient.tsx`
- Create: `frontend/src/app/[locale]/join/[gymId]/success/page.tsx`
- Create: `frontend/src/app/[locale]/join/[gymId]/success/SuccessPageClient.tsx`
- Delete: `frontend/src/app/join/[gymId]/page.tsx` and subdirs

- [ ] **Step 1: Move join page content to client component**

Create `frontend/src/app/[locale]/join/[gymId]/JoinPageClient.tsx`:
- Copy the ENTIRE content of `frontend/src/app/join/[gymId]/page.tsx`
- `'use client';` is already at the top
- Import `useTranslations` from `next-intl`
- Import `useRouter`, `usePathname` from `../../../../../i18n/navigation` (NOT from `next/navigation`)
- Replace hardcoded strings with `t()` calls using the `join.*` namespace
- The `useParams` hook returns `{ gymId, locale }` — destructure only `gymId`

**Critical — locale-aware `router.push` with query params:**

The existing code pushes to `/join/${gymId}/payment?memberId=...`. With next-intl typed pathnames, use:

```tsx
// In JoinPageClient.tsx — use router from i18n/navigation
import { useRouter } from '../../../../../i18n/navigation';

// Inside handleSubmit success:
router.push(
  { pathname: '/join/[gymId]/payment', params: { gymId } },
  { query: { memberId: data.member_id } }
  // Note: next-intl router.push passes extra props through as a second arg in some versions
  // If this doesn't work, fall back to: router.push(`/join/${gymId}/payment?memberId=${data.member_id}`)
  // using the internal (un-prefixed) pathname — next-intl will add the locale prefix automatically
);
```

The safest pattern (works in all next-intl v3 versions):
```tsx
router.push(`/join/${gymId}/payment?memberId=${data.member_id}` as any);
```
This works because next-intl's router respects the `pathnames` config when given an internal path string and adds the locale prefix + slug translation automatically.

Create `frontend/src/app/[locale]/join/[gymId]/page.tsx` (server wrapper):

```tsx
import { getTranslations } from 'next-intl/server';
import JoinPageClient from './JoinPageClient';

const BASE_URL = 'https://gymaccess.app';

export async function generateMetadata({
  params: { locale, gymId },
}: {
  params: { locale: string; gymId: string };
}) {
  const t = await getTranslations({ locale, namespace: 'meta.join' });
  const enPath = `/en/join/${gymId}`;
  const nbPath = `/nb/bli-med/${gymId}`;
  const localePath = locale === 'en' ? enPath : nbPath;

  return {
    title: t('title', { gymName: '' }).replace(' — GymAccess', ' — GymAccess'),
    description: t('description', { gymName: '' }),
    alternates: {
      canonical: `${BASE_URL}${localePath}`,
      languages: {
        en: `${BASE_URL}${enPath}`,
        nb: `${BASE_URL}${nbPath}`,
        'x-default': `${BASE_URL}${enPath}`,
      },
    },
  };
}

export default function JoinPage() {
  return <JoinPageClient />;
}
```

- [ ] **Step 2: Repeat for payment and success pages**

Follow the same server-wrapper + client-component pattern for:
- `payment/page.tsx` + `payment/PaymentPageClient.tsx` (uses `join.payment.*` namespace)
- `success/page.tsx` + `success/SuccessPageClient.tsx` (uses `success.*` namespace)

For the payment page `generateMetadata`, the alternates should point to the payment sub-paths:
```
/en/join/[gymId]/payment
/nb/bli-med/[gymId]/betaling
```

- [ ] **Step 3: Temporarily keep old join directory**

Do NOT delete `frontend/src/app/join/` yet. The old pages coexist without conflict (different paths). Delete them in Task 16 (verification) after confirming the new locale routes work end-to-end.

### Task 10: Create Server Component wrapper for manage/[token]

**Files:**
- Create: `frontend/src/app/[locale]/manage/[token]/page.tsx`
- Create: `frontend/src/app/[locale]/manage/[token]/ManagePageClient.tsx`
- Delete: `frontend/src/app/manage/[token]/page.tsx`

- [ ] **Step 1: Move manage page to client component**

Create `ManagePageClient.tsx` with the content of `manage/[token]/page.tsx`, replacing hardcoded strings with `useTranslations('manage')` calls. The `StatusBadge` component in the same file should use `useTranslations('common.status')`.

Create the server wrapper `manage/[token]/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import ManagePageClient from './ManagePageClient';

const BASE_URL = 'https://gymaccess.app';

export async function generateMetadata({ params: { locale, token } }: { params: { locale: string; token: string } }) {
  const t = await getTranslations({ locale, namespace: 'meta.manage' });
  const enPath = `/en/manage/${token}`;
  const nbPath = `/nb/administrer/${token}`;
  const localePath = locale === 'en' ? enPath : nbPath;

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${BASE_URL}${localePath}`,
      languages: {
        en: `${BASE_URL}${enPath}`,
        nb: `${BASE_URL}${nbPath}`,
        'x-default': `${BASE_URL}${enPath}`,
      },
    },
  };
}

export default function ManagePage() {
  return <ManagePageClient />;
}
```

- [ ] **Step 2: Temporarily keep old manage directory**

Do NOT delete `frontend/src/app/manage/` yet. Delete it in Task 16 after verification passes.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/
git commit -m "feat: restructure public pages into [locale] segment with Server Component wrappers"
```

---

## Chunk 5: Components — LanguageSwitcher + LocaleBanner

### Task 11: Create LanguageSwitcher component

**Files:**
- Create: `frontend/src/app/components/LanguageSwitcher.tsx`

- [ ] **Step 1: Create LanguageSwitcher**

```tsx
'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '../../../i18n/navigation';
import { routing } from '../../../i18n/routing';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    // Set explicit preference cookie (expires in 1 year)
    document.cookie = `locale-pref=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div className="flex items-center gap-1 text-xs font-semibold">
      {routing.locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-forest-500">|</span>}
          <button
            onClick={() => switchLocale(l)}
            className={`px-1 py-0.5 rounded transition-colors ${
              locale === l
                ? 'text-forest-900 font-bold'
                : 'text-forest-500 hover:text-forest-700'
            }`}
          >
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}
```

### Task 12: Create LocaleBanner component

**Files:**
- Create: `frontend/src/app/components/LocaleBanner.tsx`

The banner shows on `/en/` landing page when browser language is Norwegian and `locale-banner-dismissed` cookie is not set. It is a client component (reads cookies and navigator.language).

- [ ] **Step 1: Create LocaleBanner**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '../../../i18n/navigation';

const NORWEGIAN_LANGS = ['nb', 'no', 'nb-NO', 'nn', 'nn-NO'];

function isBrowserNorwegian(): boolean {
  if (typeof navigator === 'undefined') return false;
  const langs = navigator.languages || [navigator.language];
  return langs.some((l) => NORWEGIAN_LANGS.some((n) => l.toLowerCase().startsWith(n.toLowerCase())));
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.split(';').find((c) => c.trim().startsWith(name + '='))?.split('=')[1];
}

export function LocaleBanner() {
  const locale = useLocale();
  const t = useTranslations('banner');
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (locale !== 'en') return;
    if (getCookie('locale-pref')) return;
    if (getCookie('locale-banner-dismissed')) return;
    if (isBrowserNorwegian()) setShow(true);
  }, [locale]);

  if (!show) return null;

  function switchToNorwegian() {
    document.cookie = 'locale-pref=nb;path=/;max-age=31536000;SameSite=Lax';
    document.cookie = 'locale-banner-dismissed=1;path=/;max-age=31536000;SameSite=Lax';
    router.replace(pathname, { locale: 'nb' });
  }

  function dismiss() {
    document.cookie = 'locale-banner-dismissed=1;path=/;max-age=31536000;SameSite=Lax';
    setShow(false);
  }

  return (
    <div className="bg-forest-800 text-forest-100 px-6 py-2.5 flex items-center justify-between gap-4 text-sm">
      <span>{t('text')}</span>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={switchToNorwegian}
          className="font-semibold text-white hover:text-forest-200 transition-colors"
        >
          {t('cta')}
        </button>
        <button
          onClick={dismiss}
          className="text-forest-400 hover:text-forest-200 transition-colors text-xs"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add LocaleBanner to landing page**

In `frontend/src/app/[locale]/page.tsx`, add `<LocaleBanner />` immediately after the opening `<div>` and before `<nav>`:

```tsx
import { LocaleBanner } from '../components/LocaleBanner';
// ...
return (
  <div className="min-h-screen bg-warm-50">
    <LocaleBanner />
    <nav ...>
```

- [ ] **Step 3: Add LanguageSwitcher to public page navbars**

In `[locale]/page.tsx` navbar, after the register link:
```tsx
<LanguageSwitcher />
```

In `JoinPageClient.tsx` header:
```tsx
<LanguageSwitcher />
```

In `ManagePageClient.tsx` header:
```tsx
<LanguageSwitcher />
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/components/
git commit -m "feat: add LanguageSwitcher and LocaleBanner components"
```

---

## Chunk 6: SEO — Sitemap + robots.txt

### Task 13: Create custom XML sitemap with hreflang

**Files:**
- Create: `frontend/src/app/sitemap.xml/route.ts`
- Create: `frontend/src/app/robots.ts`

- [ ] **Step 1: Create `frontend/src/app/sitemap.xml/route.ts`**

```ts
import { NextResponse } from 'next/server';

const BASE_URL = 'https://gymaccess.app';

interface SitemapUrl {
  en: string;
  nb: string;
}

const staticUrls: SitemapUrl[] = [
  { en: '/en/', nb: '/nb/' },
  // Dynamic routes (join, manage) are excluded — gym/member-specific, not indexable
];

export async function GET() {
  const urlEntries = staticUrls.map(({ en, nb }) => `
  <url>
    <loc>${BASE_URL}${en}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${BASE_URL}${en}"/>
    <xhtml:link rel="alternate" hreflang="nb" href="${BASE_URL}${nb}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${en}"/>
  </url>
  <url>
    <loc>${BASE_URL}${nb}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${BASE_URL}${en}"/>
    <xhtml:link rel="alternate" hreflang="nb" href="${BASE_URL}${nb}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${en}"/>
  </url>`
  ).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
```

- [ ] **Step 2: Create `frontend/src/app/robots.ts`**

```ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin/',
    },
    sitemap: 'https://gymaccess.app/sitemap.xml',
  };
}
```

- [ ] **Step 3: Test sitemap in dev**

```bash
curl http://localhost:3000/sitemap.xml
```
Expected: valid XML with `<xhtml:link>` alternate entries.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/sitemap.xml/ frontend/src/app/robots.ts
git commit -m "feat: add multilingual sitemap with hreflang and robots.txt"
```

---

## Chunk 7: Admin i18n

### Task 14: Wrap admin layout with NextIntlClientProvider

**Files:**
- Modify: `frontend/src/app/admin/layout.tsx`

The admin layout is `'use client'`. It fetches gym data via `useEffect`. We need to:
1. Load the correct messages based on `admin_language` from the API (with localStorage fallback for FOIL)
2. Wrap children with `NextIntlClientProvider`
3. Move all JSX that uses `useTranslations` into a **child component** of the provider — a component cannot consume its own context

**Architecture:** Split the admin layout into two parts:
- `AdminLayout` (the current default export) — manages auth, fetches gym data, initializes locale, renders `<html lang="en"><body>`, wraps with `NextIntlClientProvider`
- `AdminShell` (new component in the same file) — contains all the header/nav/banner JSX, calls `useTranslations`, renders as a child of the provider

- [ ] **Step 1: Restructure admin layout**

Replace `frontend/src/app/admin/layout.tsx` with this structure:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '../components/Logo';
import { NextIntlClientProvider } from 'next-intl';
import { useTranslations } from 'next-intl';
import enMessages from '../../../../messages/en.json';
import nbMessages from '../../../../messages/nb.json';
import { plusJakarta, dmSans } from '../layout';

const messagesByLocale: Record<string, any> = { en: enMessages, nb: nbMessages };

// ─── AdminShell — child of NextIntlClientProvider, can call useTranslations ─────
function SaasBanner({ saasPlan, saasStatus }: { saasPlan: string; saasStatus: string | null | undefined }) {
  const t = useTranslations('admin.banners');
  // Replace all hardcoded banner strings with t('saasStarter.body') etc.
  // ... (keep existing JSX structure, swap string literals for t() calls)
}

function StripeConnectBanner({ status }: { status: string | undefined }) {
  const t = useTranslations('admin.banners');
  // ... same pattern
}

function AdminShell({
  children,
  gymInfo,
  checking,
}: {
  children: React.ReactNode;
  gymInfo: GymInfo;
  checking: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('admin');

  // Move all the existing nav/header/banner JSX here from AdminLayout
  // Use t('nav.members'), t('nav.signOut') etc.

  const navItems = [
    { href: '/admin/members', label: t('nav.members') },
    { href: '/admin/access', label: t('nav.access') },
    { href: '/admin/payments', label: t('nav.payments') },
    { href: '/admin/settings', label: t('nav.settings') },
  ];

  // ... render full header + main layout (same as existing AdminLayout JSX)
  // Sign out button uses t('nav.signOut')
}

// ─── AdminLayout — manages auth + locale, renders html/body + provider ──────────
interface GymInfo {
  name: string;
  saas_plan?: string;
  saas_status?: string | null;
  stripe_connect_status?: string;
  admin_language?: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [gymInfo, setGymInfo] = useState<GymInfo>({ name: '' });
  const [checking, setChecking] = useState(true);
  const [adminLocale, setAdminLocale] = useState<string>(() => {
    // Read localStorage immediately to avoid FOIL
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin-lang') || 'en';
    }
    return 'en';
  });

  useEffect(() => {
    if (pathname === '/admin/login' || pathname === '/admin/register') {
      setChecking(false);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) { router.push('/admin/login'); return; }

    fetch(`${API_URL}/admin/gym`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const lang = data.admin_language || 'en';
        setAdminLocale(lang);
        localStorage.setItem('admin-lang', lang);
        setGymInfo({
          name: data.name || '',
          saas_plan: data.saas_plan || 'starter',
          saas_status: data.saas_status || null,
          stripe_connect_status: data.stripe_connect_status || 'not_connected',
          admin_language: lang,
        });
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [pathname, router]);

  return (
    <html lang="en" className={`${plusJakarta.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-warm-50 text-forest-900 antialiased font-body">
        <NextIntlClientProvider
          locale={adminLocale}
          messages={messagesByLocale[adminLocale] || enMessages}
        >
          <AdminShell gymInfo={gymInfo} checking={checking}>
            {children}
          </AdminShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

> **Key architectural note:** `AdminLayout` renders `<html lang="en">` + `<body>` (since admin routes don't go through `[locale]/layout.tsx`). It also renders `NextIntlClientProvider`. `AdminShell` is rendered as a *child* of the provider and can safely call `useTranslations`. This is the required pattern — a component cannot consume the context it renders.

> **`GET /admin/gym` already returns `admin_language`:** The existing query is `SELECT * FROM gyms`. Once the migration adds the `admin_language` column, it is automatically included in the response. No additional API code change is needed for the GET endpoint.

- [ ] **Step 3: Apply translations to admin pages**

For each admin page (`members`, `payments`, `access`, `settings`, `login`, `register`), add:
```tsx
const t = useTranslations('admin.members'); // or relevant namespace
```
And replace hardcoded strings with `t()` calls.

> Work through each page systematically. Cross-reference the translation files from Task 6 to ensure all strings are covered.

### Task 15: Add language selector to admin settings page

**Files:**
- Modify: `frontend/src/app/admin/settings/page.tsx`

- [ ] **Step 1: Add language selector section**

In the settings page, add a new "Language" section (after the gym settings section):

```tsx
{/* Language */}
<div className="bg-white border border-warm-200 rounded-2xl p-6">
  <h2 className="font-display font-semibold text-lg text-forest-900 mb-4">
    {t('settings.language.heading')}
  </h2>
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-semibold text-forest-800 mb-1.5">
        {t('settings.language.label')}
      </label>
      <select
        value={adminLanguage}
        onChange={e => setAdminLanguage(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-warm-200 text-forest-900 focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent"
      >
        <option value="en">{t('settings.language.en')}</option>
        <option value="nb">{t('settings.language.nb')}</option>
      </select>
    </div>
    <button
      onClick={saveLanguage}
      className="bg-forest-900 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-forest-800 transition-colors"
    >
      {t('settings.language.save')}
    </button>
  </div>
</div>
```

Add state `const [adminLanguage, setAdminLanguage] = useState('en');` and populate it from the gym data fetch.

The `saveLanguage` function calls `PUT /admin/settings` with `{ admin_language: adminLanguage }`.

After a successful save, update `localStorage.setItem('admin-lang', adminLanguage)` and update the locale in the admin layout (this happens automatically since the layout re-reads from localStorage on next page load — or trigger an event to update the parent context if needed).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/admin/
git commit -m "feat: add admin i18n with language selector and NextIntlClientProvider"
```

---

## Chunk 8: Verification

### Task 16: End-to-end verification

- [ ] **Step 1: Start dev environment**

```bash
docker compose up -d
```

- [ ] **Step 2: Verify routing**

```bash
# Should redirect to /en/ or /nb/ based on browser language
curl -I http://localhost:3000/

# English landing page
curl -s http://localhost:3000/en/ | grep -o 'lang="[^"]*"'
# Expected: lang="en" (set server-side in [locale]/layout.tsx)

# Norwegian landing page
curl -s http://localhost:3000/nb/ | grep -c 'Slutt å jage'
# Expected: 1 (Norwegian text present)

# Norwegian join URL slug
curl -I http://localhost:3000/nb/bli-med/test-gym-id
# Expected: 200 (not 404)

# English join URL
curl -I http://localhost:3000/en/join/test-gym-id
# Expected: 200
```

- [ ] **Step 3: Verify hreflang in page source**

```bash
curl -s http://localhost:3000/en/ | grep -i hreflang
```
Expected output:
```
<link rel="alternate" hreflang="en" href="https://gymaccess.app/en/"/>
<link rel="alternate" hreflang="nb" href="https://gymaccess.app/nb/"/>
<link rel="alternate" hreflang="x-default" href="https://gymaccess.app/en/"/>
```

- [ ] **Step 4: Verify canonical tag**

```bash
curl -s http://localhost:3000/nb/ | grep -i canonical
```
Expected: `<link rel="canonical" href="https://gymaccess.app/nb/"/>`

- [ ] **Step 5: Verify sitemap**

```bash
curl -s http://localhost:3000/sitemap.xml
```
Expected: valid XML with `<xhtml:link>` entries for both `/en/` and `/nb/`.

- [ ] **Step 6: Verify admin route not affected**

```bash
curl -I http://localhost:3000/admin/login
```
Expected: 200 (NOT redirected to /en/admin/login)

- [ ] **Step 7: Test language switcher**

Open `http://localhost:3000/en/` in browser. Click NB in the language switcher. Should navigate to `http://localhost:3000/nb/` with Norwegian text.

- [ ] **Step 8: Test join flow in both locales**

1. Navigate to `http://localhost:3000/en/join/{gymId}` — verify English text
2. Navigate to `http://localhost:3000/nb/bli-med/{gymId}` — verify Norwegian text
3. Complete signup in both locales — verify payment redirect works

- [ ] **Step 9: Test admin language preference**

1. Log into admin dashboard
2. Go to Settings → Language → Select "Norwegian (Bokmål)" → Save
3. Navigate away and back — verify admin UI shows Norwegian
4. Log out and log back in — verify language preference persists

- [ ] **Step 10: Delete old page files now that locale routes are verified**

```bash
rm frontend/src/app/page.tsx
rm -rf frontend/src/app/join/
rm -rf frontend/src/app/manage/
```

Verify no 404s after deletion:
```bash
curl -I http://localhost:3000/en/
curl -I http://localhost:3000/nb/bli-med/dummy-gym-id
```
Expected: 200 (not 404).

- [ ] **Step 11: Admin language change requires reload — verify UX**

After saving language preference in admin settings, the language change takes effect on the next page load (the admin layout re-reads `localStorage.admin-lang` on mount). After `saveLanguage()` succeeds:
- Call `window.location.reload()` in the settings page save handler to apply the language immediately

Update the `saveLanguage` function in `admin/settings/page.tsx`:
```tsx
async function saveLanguage() {
  // ... PUT /admin/settings with admin_language
  localStorage.setItem('admin-lang', adminLanguage);
  window.location.reload(); // Apply new language immediately
}
```

- [ ] **Step 12: Final commit**

```bash
git add -A
git commit -m "feat: complete EN/NB multilingual i18n with SEO-compliant URL routing"
```

---

## Notes for Implementation Agent

1. **next-intl version**: Install the latest v3.x — API may differ slightly from these code samples. Check `next-intl` docs at https://next-intl-docs.vercel.app/docs/getting-started/app-router if a function signature doesn't match.

2. **Pathnames routing**: `createNavigation` from `next-intl/navigation` is the v3 API. Import `Link`, `useRouter`, `usePathname` from `i18n/navigation.ts` (NOT from `next/link` or `next/navigation`) in any component that needs locale-aware navigation.

3. **Admin pages not SEO-indexed**: Admin routes stay at `/admin/` and are excluded from the middleware matcher. They do not get hreflang tags or sitemap entries. This is intentional.

4. **Translation completeness**: After writing the translation files, re-read each admin page source to verify every string is covered. Pay special attention to: `admin/settings/page.tsx` (igloohome setup wizard has many strings), `admin/register/page.tsx` (multi-step form), and `admin/members/page.tsx` (confirmation modals).

5. **`useParams` in locale routes**: Inside `app/[locale]/join/[gymId]/`, `useParams()` returns `{ locale, gymId }`. The client components should destructure only `gymId` and ignore `locale` (locale is available via `useLocale()` from next-intl).
