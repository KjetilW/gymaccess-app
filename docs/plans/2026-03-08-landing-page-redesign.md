# Landing Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the GymAccess front page to target gym owners with a problem-first conversion funnel.

**Architecture:** Single-file React component rewrite of `frontend/src/app/page.tsx`. No backend changes. Uses existing Tailwind theme (forest/sage/warm palette, Syne display font, DM Sans body font). FAQ section uses client-side `useState` for accordion toggle — extracted to a small `'use client'` component at the top of the file.

**Tech Stack:** Next.js, React, Tailwind CSS

**Design doc:** `docs/plans/2026-03-08-landing-page-redesign-design.md`

---

### Task 1: FAQ Accordion Component

The FAQ needs client-side interactivity (`useState`). Since `page.tsx` is a server component by default in Next.js App Router, create a small client component for the FAQ.

**Files:**
- Create: `frontend/src/app/components/FaqItem.tsx`

**Step 1: Create the FAQ accordion component**

```tsx
'use client';

import { useState } from 'react';

export function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-warm-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-display font-bold text-lg text-forest-900 group-hover:text-forest-700 transition-colors">
          {question}
        </span>
        <span className={`text-forest-400 transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="4" x2="10" y2="16" />
            <line x1="4" y1="10" x2="16" y2="10" />
          </svg>
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-40 pb-5' : 'max-h-0'}`}
      >
        <p className="text-forest-600 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `docker compose logs -f frontend` — check no TypeScript errors.

**Step 3: Commit**

```bash
git add frontend/src/app/components/FaqItem.tsx
git commit -m "feat: add FAQ accordion component for landing page"
```

---

### Task 2: Rewrite page.tsx — Navigation + Hero

Replace the entire `page.tsx` content. Start with nav and hero sections.

**Files:**
- Modify: `frontend/src/app/page.tsx` (full rewrite)

**Step 1: Replace page.tsx with new navigation and hero**

```tsx
import Link from 'next/link';
import { FaqItem } from './components/FaqItem';

export default function Home() {
  return (
    <div className="min-h-screen bg-warm-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <span className="font-display font-bold text-2xl text-forest-900">GymAccess</span>
        <div className="flex items-center gap-4">
          <Link href="/admin/login" className="text-forest-700 font-medium hover:text-forest-900 transition-colors text-sm">
            Sign in
          </Link>
          <Link
            href="/admin/register"
            className="bg-forest-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-forest-800 transition-colors text-sm"
          >
            Register your gym
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-grid-forest max-w-6xl mx-auto px-8 py-20 lg:py-28 text-center">
        <div className="inline-flex items-center gap-2 bg-forest-50 border border-forest-200 text-forest-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>
          Built for community gyms with 20–200 members
        </div>

        <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-7xl text-forest-900 leading-[1.05] mb-6 tracking-tight">
          Stop chasing payments.<br />
          <span className="text-sage-dark">Start running your gym.</span>
        </h1>
        <p className="text-xl text-forest-700 max-w-2xl mx-auto mb-10 leading-relaxed">
          GymAccess automates signups, recurring payments, and door access —
          so you can spend less time on admin and more time on your gym.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/admin/register"
            className="bg-forest-900 text-white px-8 py-4 rounded-xl font-display font-semibold text-lg hover:bg-forest-800 transition-all duration-150 shadow-lg shadow-forest-900/20"
          >
            Start free trial →
          </Link>
          <a
            href="#how-it-works"
            className="bg-white border border-warm-200 text-forest-800 px-8 py-4 rounded-xl font-display font-semibold text-lg hover:bg-warm-100 transition-all duration-150"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* ... remaining sections added in subsequent tasks ... */}
    </div>
  );
}
```

**Step 2: Verify page loads**

Navigate to http://localhost:3000 — verify hero displays with new headline and CTAs.

**Step 3: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: rewrite landing page hero with owner-focused messaging"
```

---

### Task 3: Pain Points Section

**Files:**
- Modify: `frontend/src/app/page.tsx` (add section after hero, before closing `</div>`)

**Step 1: Add the "Sound familiar?" section**

Insert after the hero `</section>` closing tag, before the comment placeholder:

```tsx
      {/* Pain Points */}
      <section className="bg-white border-y border-warm-200">
        <div className="max-w-6xl mx-auto px-8 py-20">
          <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-16">
            Sound familiar?
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125" />
                  </svg>
                ),
                title: 'Spreadsheet chaos',
                desc: "Tracking members in Excel. Who's paid? Who hasn't? Nobody knows.",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                ),
                title: 'Chasing payments',
                desc: 'Sending reminders on Vipps, bank transfer, or WhatsApp. Every. Single. Month.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                  </svg>
                ),
                title: 'Sharing door codes',
                desc: 'Texting codes manually. Ex-members still have access.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ),
                title: 'No overview',
                desc: 'No dashboard. No history. Just your inbox and a prayer.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="p-6 rounded-2xl bg-warm-50 border border-warm-200">
                <div className="w-10 h-10 bg-warm-200 rounded-lg flex items-center justify-center text-forest-700 mb-4">
                  {icon}
                </div>
                <h3 className="font-display font-bold text-lg text-forest-900 mb-2">{title}</h3>
                <p className="text-forest-600 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
```

**Step 2: Verify section renders**

Navigate to http://localhost:3000 — verify "Sound familiar?" section appears with 4 cards.

**Step 3: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: add pain points section to landing page"
```

---

### Task 4: Features Before/After Section

**Files:**
- Modify: `frontend/src/app/page.tsx` (add section after pain points)

**Step 1: Add the "Automate the boring stuff" section**

Insert after the pain points `</section>`:

```tsx
      {/* Features — Before/After */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-4">
          Automate the boring stuff
        </h2>
        <p className="text-forest-600 text-center mb-16 text-lg">
          Everything that used to take hours — now runs itself.
        </p>

        <div className="space-y-8">
          {[
            {
              title: 'Member signup',
              before: 'New members message you. You add them to the spreadsheet. Maybe.',
              after: "Share your gym's signup link. Members register and pay themselves.",
            },
            {
              title: 'Recurring payments',
              before: 'Monthly reminders. Awkward follow-ups. Lost revenue.',
              after: 'Stripe handles billing automatically. Failed payments retry. You get notified.',
            },
            {
              title: 'Access control',
              before: 'Texting door codes. Changing codes when someone leaves. Forgetting to.',
              after: 'Codes issued on payment, revoked on cancellation. Supports shared PINs, individual codes, or smart locks.',
            },
          ].map(({ title, before, after }) => (
            <div key={title} className="grid md:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-warm-100 border border-warm-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-warm-300">Before</span>
                </div>
                <h3 className="font-display font-bold text-xl text-forest-900 mb-2">{title}</h3>
                <p className="text-forest-500 line-through decoration-warm-300 leading-relaxed">{before}</p>
              </div>
              <div className="p-6 rounded-2xl bg-forest-50 border border-forest-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-sage-dark">After</span>
                </div>
                <h3 className="font-display font-bold text-xl text-forest-900 mb-2">{title}</h3>
                <p className="text-forest-700 leading-relaxed">{after}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
```

**Step 2: Verify section renders**

Navigate to http://localhost:3000 — verify 3 before/after feature blocks appear.

**Step 3: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: add before/after features section to landing page"
```

---

### Task 5: How It Works Section

**Files:**
- Modify: `frontend/src/app/page.tsx` (add section after features)

**Step 1: Add the "How it works" section**

Insert after features `</section>`:

```tsx
      {/* How it works */}
      <section id="how-it-works" className="bg-white border-y border-warm-200">
        <div className="max-w-6xl mx-auto px-8 py-20">
          <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-4">
            Up and running in 15 minutes
          </h2>
          <p className="text-forest-600 text-center mb-16 text-lg">
            No technical skills needed. No hardware required.
          </p>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Create your gym', desc: "Set your name, price, and billing cycle. That's it." },
              { step: '02', title: 'Share your link', desc: 'Every gym gets a signup page. Send it to members.' },
              { step: '03', title: 'Members pay & get access', desc: 'They sign up via Stripe and receive their door code instantly.' },
              { step: '04', title: "You're done", desc: 'Renewals, reminders, and access revocation happen automatically.' },
            ].map(({ step, title, desc }) => (
              <div key={step}>
                <div className="font-display font-extrabold text-6xl text-warm-200 mb-3 leading-none">
                  {step}
                </div>
                <h3 className="font-display font-bold text-xl text-forest-900 mb-2">{title}</h3>
                <p className="text-forest-600 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
```

**Step 2: Verify section renders and anchor link works**

Navigate to http://localhost:3000 — click "See how it works" in hero — verify it scrolls to this section.

**Step 3: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: add 'how it works' section to landing page"
```

---

### Task 6: Pricing Section

**Files:**
- Modify: `frontend/src/app/page.tsx` (add section after how-it-works)

**Step 1: Add the pricing section**

Insert after how-it-works `</section>`:

```tsx
      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-4">
          Simple, transparent pricing
        </h2>
        <p className="text-forest-600 text-center mb-12 text-lg">
          One plan. Everything included.
        </p>

        <div className="max-w-md mx-auto bg-white border border-warm-200 rounded-3xl p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="font-display font-extrabold text-5xl text-forest-900">
              299 <span className="text-2xl font-bold text-forest-600">kr/month</span>
            </div>
            <p className="text-forest-500 mt-2">30-day free trial · No credit card required</p>
          </div>

          <ul className="space-y-3 mb-8">
            {[
              'Unlimited members',
              'Automated payments via Stripe',
              'Access code management',
              'Smart lock support (igloohome)',
              'Email notifications',
              'Admin dashboard',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-forest-700">
                <svg className="w-5 h-5 text-sage flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>

          <Link
            href="/admin/register"
            className="block w-full text-center bg-forest-900 text-white py-4 rounded-xl font-display font-semibold text-lg hover:bg-forest-800 transition-all duration-150 shadow-lg shadow-forest-900/20"
          >
            Start free trial →
          </Link>
        </div>
      </section>
```

**Step 2: Verify pricing card renders**

Navigate to http://localhost:3000 — verify single pricing card with feature list and CTA.

**Step 3: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: add pricing section to landing page"
```

---

### Task 7: FAQ Section

**Files:**
- Modify: `frontend/src/app/page.tsx` (add section after pricing)

**Step 1: Add the FAQ section**

Insert after pricing `</section>`:

```tsx
      {/* FAQ */}
      <section className="bg-white border-y border-warm-200">
        <div className="max-w-3xl mx-auto px-8 py-20">
          <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-12">
            Common questions
          </h2>

          <div className="divide-y divide-warm-200 border-t border-warm-200">
            <FaqItem
              question="Do I need technical skills?"
              answer="No. If you can fill in a form, you can set up GymAccess. It takes about 15 minutes."
            />
            <FaqItem
              question="What about my existing members?"
              answer="You can add existing members manually from the admin dashboard and send them a signup link to start paying automatically."
            />
            <FaqItem
              question="What payment methods do members use?"
              answer="Card payments via Stripe. Members enter their card once and get billed automatically."
            />
            <FaqItem
              question="How does access control work?"
              answer="You choose: shared PIN for the whole gym, individual codes per member, or smart lock integration with igloohome. Codes are sent automatically on payment and revoked on cancellation."
            />
            <FaqItem
              question="Can I cancel anytime?"
              answer="Yes. No lock-in, no contracts. Cancel from your dashboard."
            />
          </div>
        </div>
      </section>
```

**Step 2: Verify FAQ renders and accordion toggles work**

Navigate to http://localhost:3000 — click each FAQ question — verify answers expand/collapse.

**Step 3: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: add FAQ accordion section to landing page"
```

---

### Task 8: Final CTA + Footer

**Files:**
- Modify: `frontend/src/app/page.tsx` (add closing CTA and footer after FAQ)

**Step 1: Add closing CTA and footer**

Insert after FAQ `</section>`:

```tsx
      {/* Final CTA */}
      <section className="bg-forest-900 mx-8 mb-8 rounded-3xl">
        <div className="max-w-4xl mx-auto px-8 py-16 text-center">
          <h2 className="font-display font-extrabold text-4xl lg:text-5xl text-white mb-4">
            Your gym runs 24/7.<br />Your admin shouldn&apos;t.
          </h2>
          <p className="text-forest-200 text-xl mb-10">
            Set up GymAccess in 15 minutes and never chase a payment again.
          </p>
          <Link
            href="/admin/register"
            className="inline-block bg-sage text-forest-900 px-10 py-4 rounded-xl font-display font-bold text-lg hover:bg-sage-light transition-all duration-150 shadow-lg"
          >
            Start free trial →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-warm-200 bg-white">
        <div className="max-w-6xl mx-auto px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-lg text-forest-900">GymAccess</span>
            <span className="text-warm-300">·</span>
            <span className="text-sm text-forest-600">Built for community gyms</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-forest-600">
            <Link href="/admin/register" className="hover:text-forest-900 transition-colors">Register</Link>
            <Link href="/admin/login" className="hover:text-forest-900 transition-colors">Sign in</Link>
            <a href="mailto:support@gymaccess.app" className="hover:text-forest-900 transition-colors">Support</a>
          </nav>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} GymAccess. All rights reserved.</p>
        </div>
      </footer>
```

**Step 2: Verify full page renders end-to-end**

Navigate to http://localhost:3000 — scroll through entire page. Verify all 8 sections render: nav, hero, pain points, features, how-it-works, pricing, FAQ, CTA, footer.

**Step 3: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: add closing CTA and footer to landing page"
```

---

### Task 9: Mobile Responsiveness Check

**Files:**
- Modify: `frontend/src/app/page.tsx` (if adjustments needed)

**Step 1: Test at mobile viewport**

Open http://localhost:3000 at 375px width (Chrome DevTools → Toggle Device Toolbar → iPhone SE).

**Step 2: Verify each section**

- Hero: headline wraps cleanly, CTAs stack vertically
- Pain points: cards stack into 1 column on mobile, 2 on sm
- Features: before/after blocks stack vertically
- How it works: steps stack into 1 column
- Pricing: card is full-width
- FAQ: accordion works with touch
- No horizontal overflow anywhere

**Step 3: Fix any issues found and commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "fix: landing page mobile responsiveness adjustments"
```

---

### Task 10: Update feature_list.json passes

**Files:**
- Modify: `feature_list.json`

**Step 1: After verifying all sections, set all 8 new features to `"passes": true`**

Search for features with `"passes": false` that match the new landing page features (descriptions starting with "Landing page...") and set them to `true`.

**Step 2: Commit**

```bash
git add feature_list.json
git commit -m "feat: mark 8 landing page redesign features as passing"
```
