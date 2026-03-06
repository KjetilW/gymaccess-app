import Link from 'next/link';

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
          Built for community gyms
        </div>

        <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-7xl text-forest-900 leading-[1.05] mb-6 tracking-tight">
          Automate your<br />
          <span className="text-sage-dark">gym membership</span>
        </h1>
        <p className="text-xl text-forest-700 max-w-2xl mx-auto mb-10 leading-relaxed">
          Signup, recurring payments, and access control — all automated.
          Built for small gyms run by volunteers.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/admin/register"
            className="bg-forest-900 text-white px-8 py-4 rounded-xl font-display font-semibold text-lg hover:bg-forest-800 transition-all duration-150 shadow-lg shadow-forest-900/20"
          >
            Register your gym →
          </Link>
          <Link
            href="/admin/login"
            className="bg-white border border-warm-200 text-forest-800 px-8 py-4 rounded-xl font-display font-semibold text-lg hover:bg-warm-100 transition-all duration-150"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-warm-200">
        <div className="max-w-6xl mx-auto px-8 py-20">
          <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-4">
            Everything you need
          </h2>
          <p className="text-forest-600 text-center mb-16 text-lg">
            Replace spreadsheets and manual processes with automated workflows
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '👥',
                title: 'Member Signup',
                desc: 'Public signup page for each gym. Members pay and get access automatically.',
              },
              {
                icon: '💳',
                title: 'Recurring Payments',
                desc: 'Stripe-powered subscriptions. Automatic retries on failed payments.',
              },
              {
                icon: '🔑',
                title: 'Access Control',
                desc: 'Shared PIN, individual codes, or smart lock integration. Sent instantly.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="p-6 rounded-2xl bg-warm-50 border border-warm-200 hover:border-forest-300 transition-colors group">
                <div className="w-12 h-12 bg-forest-900 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform duration-150">
                  {icon}
                </div>
                <h3 className="font-display font-bold text-xl text-forest-900 mb-2">{title}</h3>
                <p className="text-forest-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <h2 className="font-display font-bold text-4xl text-forest-900 text-center mb-4">
          Up and running in 15 minutes
        </h2>
        <p className="text-forest-600 text-center mb-16 text-lg max-w-2xl mx-auto">
          No technical expertise required.
        </p>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Register', desc: 'Create your gym account and set your membership price.' },
            { step: '02', title: 'Share link', desc: "Send your gym's signup URL to new members." },
            { step: '03', title: 'Members join', desc: 'They pay via Stripe and receive their access code.' },
            { step: '04', title: 'Relax', desc: 'Renewals, reminders, and access are fully automated.' },
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
      </section>

      {/* CTA */}
      <section className="bg-forest-900 mx-8 mb-8 rounded-3xl">
        <div className="max-w-4xl mx-auto px-8 py-16 text-center">
          <h2 className="font-display font-extrabold text-4xl lg:text-5xl text-white mb-4">
            Ready to automate your gym?
          </h2>
          <p className="text-forest-200 text-xl mb-10">
            Join gyms that have eliminated manual membership work.
          </p>
          <Link
            href="/admin/register"
            className="inline-block bg-sage text-forest-900 px-10 py-4 rounded-xl font-display font-bold text-lg hover:bg-sage-light transition-all duration-150 shadow-lg"
          >
            Get started for free →
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
            <a href="mailto:support@opengym.app" className="hover:text-forest-900 transition-colors">Support</a>
          </nav>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} GymAccess. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
