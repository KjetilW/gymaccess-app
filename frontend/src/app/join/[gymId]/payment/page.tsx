'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function PaymentPage() {
  const { gymId } = useParams<{ gymId: string }>();
  const searchParams = useSearchParams();
  const memberId = searchParams.get('memberId');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberId) {
      setError('Missing member information. Please sign up again.');
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/subscriptions/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.url) {
          window.location.href = data.url;
        } else {
          setError(data.error || 'Failed to create checkout session');
          setLoading(false);
        }
      })
      .catch(() => {
        setError('Could not connect to payment service. Please try again.');
        setLoading(false);
      });
  }, [memberId]);

  return (
    <div className="min-h-screen bg-warm-50">
      <header className="bg-forest-900 text-white px-6 py-4">
        <Link href="/" className="font-display font-bold text-lg text-white hover:text-forest-200 transition-colors">
          OpenGym
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12 text-center">
        <div className="bg-white rounded-2xl border border-warm-200 p-8">
          {loading ? (
            <>
              <div className="w-10 h-10 border-2 border-forest-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-forest-800 font-medium">Redirecting to secure payment…</p>
              <p className="text-gray-400 text-sm mt-2">Powered by Stripe</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h1 className="font-display font-bold text-xl text-forest-900 mb-2">Payment setup failed</h1>
              <p className="text-gray-500 text-sm mb-6">{error}</p>
              <Link href={`/join/${gymId}`} className="text-sm text-forest-700 hover:underline font-medium">
                Back to signup
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
