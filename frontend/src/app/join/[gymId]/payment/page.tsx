'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface GymInfo {
  name: string;
  membership_price: number;
  billing_interval: string;
}

export default function PaymentPage() {
  const { gymId } = useParams<{ gymId: string }>();
  const searchParams = useSearchParams();
  const memberId = searchParams.get('memberId');

  const [gym, setGym] = useState<GymInfo | null>(null);

  useEffect(() => {
    if (!gymId) return;
    fetch(`${API_URL}/gyms/${gymId}`)
      .then(r => r.json())
      .then(setGym)
      .catch(() => {});
  }, [gymId]);

  return (
    <div className="min-h-screen bg-warm-50">
      <header className="bg-forest-900 text-white px-6 py-4">
        <Link href="/" className="font-display font-bold text-lg text-white hover:text-forest-200 transition-colors">
          OpenGym
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12 text-center">
        <div className="bg-white rounded-2xl border border-warm-200 p-8">
          <div className="w-16 h-16 bg-forest-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-forest-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>

          <h1 className="font-display font-bold text-2xl text-forest-900 mb-2">
            {gym ? `Join ${gym.name}` : 'Complete your membership'}
          </h1>

          {gym && (
            <p className="text-gray-500 text-sm mb-6">
              NOK {gym.membership_price.toLocaleString()} / {gym.billing_interval === 'yearly' ? 'year' : 'month'}
            </p>
          )}

          <div className="bg-warm-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-gray-600">
              Payment processing via Stripe is coming soon. Your membership application has been received and your account is pending activation.
            </p>
          </div>

          {memberId && (
            <p className="text-xs text-gray-400 font-mono mb-6">Member ID: {memberId}</p>
          )}

          <Link
            href={`/join/${gymId}`}
            className="text-sm text-forest-700 hover:underline font-medium"
          >
            Back to signup
          </Link>
        </div>
      </main>
    </div>
  );
}
