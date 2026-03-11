'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function SuccessPageClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session_id') ?? null;
  const [activating, setActivating] = useState(!!sessionId);
  const t = useTranslations('success');

  useEffect(() => {
    if (!sessionId) return;

    fetch(`${API_URL}/subscriptions/verify-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .catch(() => {/* best-effort; webhook may still deliver */})
      .finally(() => setActivating(false));
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-warm-50">
      <header className="bg-forest-900 text-white px-6 py-4">
        <Link href="/" className="font-display font-bold text-lg text-white hover:text-forest-200 transition-colors">
          GymAccess
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12 text-center">
        <div className="bg-white rounded-2xl border border-warm-200 p-8">
          {activating ? (
            <>
              <div className="w-10 h-10 border-2 border-forest-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-forest-800 font-medium">{t('activating')}</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="font-display font-bold text-2xl text-forest-900 mb-2">
                {t('title')}
              </h1>
              <p className="text-gray-500 text-sm mb-6">
                {t('body')}
              </p>

              <div className="bg-warm-50 rounded-xl p-4 text-left text-sm text-gray-600">
                <p className="font-semibold text-forest-800 mb-1">{t('nextSteps.heading')}</p>
                <ul className="space-y-1 list-disc list-inside text-gray-500">
                  <li>{t('nextSteps.step1')}</li>
                  <li>{t('nextSteps.step2')}</li>
                  <li>{t('nextSteps.step3')}</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
