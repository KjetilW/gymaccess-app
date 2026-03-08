import Link from 'next/link';
import { FaqItem } from './components/FaqItem';
import { Logo } from './components/Logo';

export default function Home() {
  return (
    <div className="min-h-screen bg-warm-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <Logo size={32} />
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
      <section className="max-w-6xl mx-auto px-8 py-20 lg:py-28 text-center">
        <div className="inline-flex items-center gap-2 bg-forest-50 border border-forest-200 text-forest-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>
          Built for community gyms with 20–200 members
        </div>

        <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-7xl text-forest-900 leading-[1.05] mb-6 tracking-tight">
          Stop chasing payments.<br />
          <span className="text-sage-dark">Start running your gym.</span>
        </h1>
        <p className="text-xl text-forest-700 max-w-2xl mx-auto mb-10 leading-relaxed">
          GymAccess automates signups, recurring payments, and door access — so you can spend less time on admin and more time on your gym.
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

      {/* Pain Points — "Sound familiar?" */}
      <section className="bg-white border-y border-warm-200">
        <div className="max-w-6xl mx-auto px-8 py-20">
          <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-4">
            Sound familiar?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {/* Spreadsheet chaos */}
            <div className="p-6 rounded-2xl bg-warm-50 border border-warm-200">
              <div className="w-12 h-12 bg-warm-200 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-forest-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg text-forest-900 mb-2">Spreadsheet chaos</h3>
              <p className="text-forest-600 text-sm leading-relaxed">Tracking members in Excel. Who&apos;s paid? Who hasn&apos;t? Nobody knows.</p>
            </div>

            {/* Chasing payments */}
            <div className="p-6 rounded-2xl bg-warm-50 border border-warm-200">
              <div className="w-12 h-12 bg-warm-200 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-forest-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg text-forest-900 mb-2">Chasing payments</h3>
              <p className="text-forest-600 text-sm leading-relaxed">Sending reminders on Vipps, bank transfer, or WhatsApp. Every. Single. Month.</p>
            </div>

            {/* Sharing door codes */}
            <div className="p-6 rounded-2xl bg-warm-50 border border-warm-200">
              <div className="w-12 h-12 bg-warm-200 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-forest-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg text-forest-900 mb-2">Sharing door codes</h3>
              <p className="text-forest-600 text-sm leading-relaxed">Texting codes manually. Ex-members still have access.</p>
            </div>

            {/* No overview */}
            <div className="p-6 rounded-2xl bg-warm-50 border border-warm-200">
              <div className="w-12 h-12 bg-warm-200 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-forest-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-lg text-forest-900 mb-2">No overview</h3>
              <p className="text-forest-600 text-sm leading-relaxed">No dashboard. No history. Just your inbox and a prayer.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features — "Automate the boring stuff" */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-4">
          Automate the boring stuff
        </h2>
        <p className="text-forest-600 text-center mb-12 text-lg">
          Everything that used to take hours — now runs itself.
        </p>

        <div className="space-y-8">
          {/* Member signup */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-warm-100 border border-warm-200">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-warm-300 mb-3">Before</span>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">Member signup</h3>
              <p className="text-forest-500 line-through decoration-warm-300">New members message you. You add them to the spreadsheet. Maybe.</p>
            </div>
            <div className="p-6 rounded-2xl bg-forest-50 border border-forest-200">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-sage-dark mb-3">After</span>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">Member signup</h3>
              <p className="text-forest-700">Share your gym&apos;s signup link. Members register and pay themselves.</p>
            </div>
          </div>

          {/* Recurring payments */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-warm-100 border border-warm-200">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-warm-300 mb-3">Before</span>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">Recurring payments</h3>
              <p className="text-forest-500 line-through decoration-warm-300">Monthly reminders. Awkward follow-ups. Lost revenue.</p>
            </div>
            <div className="p-6 rounded-2xl bg-forest-50 border border-forest-200">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-sage-dark mb-3">After</span>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">Recurring payments</h3>
              <p className="text-forest-700">Stripe handles billing automatically. Failed payments retry. You get notified.</p>
            </div>
          </div>

          {/* Access control */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-warm-100 border border-warm-200">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-warm-300 mb-3">Before</span>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">Access control</h3>
              <p className="text-forest-500 line-through decoration-warm-300">Texting door codes. Changing codes when someone leaves. Forgetting to.</p>
            </div>
            <div className="p-6 rounded-2xl bg-forest-50 border border-forest-200">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-sage-dark mb-3">After</span>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">Access control</h3>
              <p className="text-forest-700">Codes issued on payment, revoked on cancellation. Supports shared PINs, individual codes, or smart locks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white border-y border-warm-200">
        <div className="max-w-6xl mx-auto px-8 py-20">
          <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-4">
            Up and running in 15 minutes
          </h2>
          <p className="text-forest-600 text-center mb-16 text-lg">
            No technical skills needed. No hardware required.
          </p>

          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <div className="font-display font-extrabold text-6xl text-warm-200 mb-3 leading-none">01</div>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">Create your gym</h3>
              <p className="text-forest-600 text-sm leading-relaxed">Set your name, price, and billing cycle. That&apos;s it.</p>
            </div>
            <div>
              <div className="font-display font-extrabold text-6xl text-warm-200 mb-3 leading-none">02</div>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">Share your link</h3>
              <p className="text-forest-600 text-sm leading-relaxed">Every gym gets a signup page. Send it to members.</p>
            </div>
            <div>
              <div className="font-display font-extrabold text-6xl text-warm-200 mb-3 leading-none">03</div>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">Members pay & get access</h3>
              <p className="text-forest-600 text-sm leading-relaxed">They sign up via Stripe and receive their door code instantly.</p>
            </div>
            <div>
              <div className="font-display font-extrabold text-6xl text-warm-200 mb-3 leading-none">04</div>
              <h3 className="font-display font-bold text-xl text-forest-900 mb-2">You&apos;re done</h3>
              <p className="text-forest-600 text-sm leading-relaxed">Renewals, reminders, and access revocation happen automatically.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-4">
          Simple, transparent pricing
        </h2>
        <p className="text-forest-600 text-center mb-12 text-lg">
          One plan. Everything included.
        </p>

        <div className="max-w-md mx-auto bg-white border border-warm-200 rounded-3xl p-8 text-center">
          <div className="mb-2">
            <span className="font-display font-extrabold text-5xl text-forest-900">299 kr</span>
            <span className="text-forest-600 text-lg">/month</span>
          </div>
          <p className="text-forest-500 text-sm mb-8">30-day free trial · No credit card required</p>

          <ul className="space-y-3 text-left mb-8">
            {[
              'Unlimited members',
              'Automated payments via Stripe',
              'Access code management',
              'Smart lock support (igloohome)',
              'Email notifications',
              'Admin dashboard',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-sage flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <span className="text-forest-700">{item}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/admin/register"
            className="block w-full bg-forest-900 text-white py-4 rounded-xl font-display font-semibold text-lg hover:bg-forest-800 transition-all duration-150 shadow-lg shadow-forest-900/20"
          >
            Start free trial →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-y border-warm-200">
        <div className="max-w-3xl mx-auto px-8 py-20">
          <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-12">
            Common questions
          </h2>

          <div>
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
          <div className="flex items-center gap-3">
            <Logo size={24} />
            <span className="text-warm-300">·</span>
            <span className="text-sm text-forest-600">Built for community gyms</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-forest-600">
            <Link href="/admin/register" className="hover:text-forest-900 transition-colors">Register</Link>
            <Link href="/admin/login" className="hover:text-forest-900 transition-colors">Sign in</Link>
            <a href="mailto:support@gymaccess.app" className="hover:text-forest-900 transition-colors">Support</a>
          </nav>
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} GymAccess. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
