'use client';

import Link from 'next/link';

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-warm-50">
      <header className="bg-forest-900 text-white px-6 py-4">
        <Link href="/" className="font-display font-bold text-lg text-white hover:text-forest-200 transition-colors">
          GymAccess
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12 text-center">
        <div className="bg-white rounded-2xl border border-warm-200 p-8">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="font-display font-bold text-2xl text-forest-900 mb-2">
            Payment successful!
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            Welcome! Your membership is being activated. Check your email for access instructions including your access code.
          </p>

          <div className="bg-warm-50 rounded-xl p-4 text-left text-sm text-gray-600">
            <p className="font-semibold text-forest-800 mb-1">What happens next?</p>
            <ul className="space-y-1 list-disc list-inside text-gray-500">
              <li>You will receive a welcome email with your access code</li>
              <li>Your membership renews automatically each billing period</li>
              <li>Contact your gym admin if you have any questions</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
