'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface MemberInfo {
  name: string;
  email: string;
  status: string;
  gym_name: string;
  membership_price: number;
  billing_interval: string;
}

export default function ManagePageClient() {
  const params = useParams();
  const token = (params?.token ?? '') as string;
  const t = useTranslations('manage');
  const commonT = useTranslations('common');

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/subscriptions/manage/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Invalid link');
        }
        return res.json();
      })
      .then((data) => setMember(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch(`${API_URL}/subscriptions/manage/${token}/portal`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to open portal');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setPortalLoading(false);
    }
  }

  const intervalLabel = member?.billing_interval === 'yearly' ? t('interval.year') : t('interval.month');

  return (
    <div className="min-h-screen bg-warm-50">
      <header className="bg-forest-900 text-white px-6 py-4">
        <Link href="/" className="font-display font-bold text-lg text-white hover:text-forest-200 transition-colors">
          GymAccess
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-warm-200 p-8">
          {loading ? (
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-forest-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-forest-800 font-medium">{t('loading')}</p>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="font-display font-bold text-2xl text-forest-900 mb-2">{t('error.title')}</h1>
              <p className="text-gray-500 text-sm">{t('error.body')}</p>
            </div>
          ) : member ? (
            <>
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-1">{t('membershipAt')}</p>
                <h1 className="font-display font-bold text-2xl text-forest-900">{member.gym_name}</h1>
              </div>

              <div className="bg-warm-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('labels.member')}</span>
                  <span className="font-medium text-forest-900">{member.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('labels.email')}</span>
                  <span className="font-medium text-forest-900">{member.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('labels.plan')}</span>
                  <span className="font-medium text-forest-900">
                    NOK {member.membership_price} / {intervalLabel}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">{t('labels.status')}</span>
                  <StatusBadge status={member.status} commonT={commonT} />
                </div>
              </div>

              {member.status === 'active' && (
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="w-full bg-forest-900 hover:bg-forest-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {portalLoading ? t('actions.managing') : t('actions.manage')}
                </button>
              )}

              {member.status === 'past_due' && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-800">
                    {t('states.pastDue')}
                  </div>
                  <button
                    onClick={openPortal}
                    disabled={portalLoading}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {portalLoading ? t('actions.managing') : t('actions.updatePayment')}
                  </button>
                </>
              )}

              {member.status === 'cancelled' && (
                <div className="bg-warm-50 border border-warm-200 rounded-xl p-4 text-sm text-gray-600 text-center">
                  {t('states.cancelled')}
                </div>
              )}

              {member.status === 'pending' && (
                <div className="bg-warm-50 border border-warm-200 rounded-xl p-4 text-sm text-gray-600 text-center">
                  {t('states.pending')}
                </div>
              )}

              {member.status === 'suspended' && (
                <div className="bg-warm-50 border border-warm-200 rounded-xl p-4 text-sm text-gray-600 text-center">
                  {t('states.suspended')}
                </div>
              )}

              {error && (
                <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status, commonT }: { status: string; commonT: (key: string) => string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    past_due: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-gray-100 text-gray-600',
    pending: 'bg-blue-100 text-blue-700',
    suspended: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {commonT(`status.${status}`) || status}
    </span>
  );
}
