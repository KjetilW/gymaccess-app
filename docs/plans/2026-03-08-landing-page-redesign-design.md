# Landing Page Redesign — Design Document

**Date:** 2026-03-08
**Goal:** Redesign the GymAccess front page to clearly target gym owners (not members), optimizing for conversion. Focus on automated simplicity.

## Target Audience

Gym owners running small community gyms (20–200 members). They currently manage memberships manually with spreadsheets, bank transfers, and manual door code distribution. They want a hands-off solution.

## Page Structure

### 1. Navigation
- Logo: "GymAccess"
- Right: "Sign in" (text link) + "Register your gym" (button)

### 2. Hero
- **Badge:** "Built for community gyms with 20–200 members"
- **Headline:** "Stop chasing payments. Start running your gym."
- **Subtitle:** "GymAccess automates signups, recurring payments, and door access — so you can spend less time on admin and more time on your gym."
- **CTAs:** "Start free trial →" (primary) + "See how it works" (secondary, scrolls to How It Works)

### 3. Pain Points — "Sound familiar?"
Four cards:
1. **Spreadsheet chaos** — "Tracking members in Excel. Who's paid? Who hasn't? Nobody knows."
2. **Chasing payments** — "Sending reminders on Vipps, bank transfer, or WhatsApp. Every. Single. Month."
3. **Sharing door codes** — "Texting codes manually. Ex-members still have access."
4. **No overview** — "No dashboard. No history. Just your inbox and a prayer."

### 4. Features — "Automate the boring stuff"
Subtitle: "Everything that used to take hours — now runs itself."

Three before/after feature blocks:

1. **Member signup**
   - Before: "New members message you. You add them to the spreadsheet. Maybe."
   - After: "Share your gym's signup link. Members register and pay themselves."

2. **Recurring payments**
   - Before: "Monthly reminders. Awkward follow-ups. Lost revenue."
   - After: "Stripe handles billing automatically. Failed payments retry. You get notified."

3. **Access control**
   - Before: "Texting door codes. Changing codes when someone leaves. Forgetting to."
   - After: "Codes issued on payment, revoked on cancellation. Supports shared PINs, individual codes, or smart locks."

### 5. How It Works — "Up and running in 15 minutes"
Subtitle: "No technical skills needed. No hardware required."

1. **Create your gym** — "Set your name, price, and billing cycle. That's it."
2. **Share your link** — "Every gym gets a signup page. Send it to members."
3. **Members pay & get access** — "They sign up via Stripe and receive their door code instantly."
4. **You're done** — "Renewals, reminders, and access revocation happen automatically."

### 6. Pricing — "Simple, transparent pricing"
Subtitle: "One plan. Everything included."

Single card:
- **299 kr/month**
- "30-day free trial · No credit card required"
- Checklist: Unlimited members, Automated payments via Stripe, Access code management, Smart lock support (igloohome), Email notifications, Admin dashboard
- CTA: "Start free trial →"

### 7. FAQ — "Common questions"
Accordion-style, 5 items:

1. **"Do I need technical skills?"** — "No. If you can fill in a form, you can set up GymAccess. It takes about 15 minutes."
2. **"What about my existing members?"** — "You can add existing members manually from the admin dashboard and send them a signup link to start paying automatically."
3. **"What payment methods do members use?"** — "Card payments via Stripe. Members enter their card once and get billed automatically."
4. **"How does access control work?"** — "You choose: shared PIN for the whole gym, individual codes per member, or smart lock integration with igloohome. Codes are sent automatically on payment and revoked on cancellation."
5. **"Can I cancel anytime?"** — "Yes. No lock-in, no contracts. Cancel from your dashboard."

### 8. Final CTA
Dark background block:
- **"Your gym runs 24/7. Your admin shouldn't."**
- Subtitle: "Set up GymAccess in 15 minutes and never chase a payment again."
- CTA: "Start free trial →"

### 9. Footer
Same as current — logo, links, copyright.

## Design Direction
- Keep existing "Nordic Forest Industrial" aesthetic (Syne + DM Sans, forest/sage/warm palette)
- Pain point cards: muted/warm background, slightly distressed feel
- Feature before/after: "before" text in muted/struck-through style, "after" in bold/highlighted
- FAQ: accordion with expand/collapse interaction
- Pricing card: centered, prominent, single plan
- Overall tone: direct, empathetic, slightly wry — not corporate

## Dropped Elements
- Social proof / testimonials — skipped until real data exists
- Dashboard mockup in hero — too heavy without real screenshots
