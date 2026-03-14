'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '../../../components/LanguageSwitcher';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface MemberInfo {
  name: string;
  email: string;
  status: string;
  gym_name: string;
  membership_price: number;
  billing_interval: string;
  igloohome_configured: boolean;
}

interface PinResult {
  pin: string;
  valid_until: string;
}

interface BluetoothResult {
  keyId: string;
  bluetoothGuestKey: string;
  valid_until: string;
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

  // Access controls state
  const [pinLoading, setPinLoading] = useState(false);
  const [pinResult, setPinResult] = useState<PinResult | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinCopied, setPinCopied] = useState(false);
  const [btLoading, setBtLoading] = useState(false);
  const [btResult, setBtResult] = useState<BluetoothResult | null>(null);
  const [btError, setBtError] = useState<string | null>(null);
  const [btKeyCopied, setBtKeyCopied] = useState(false);

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

  async function requestPin() {
    setPinLoading(true);
    setPinError(null);
    try {
      const res = await fetch(`${API_URL}/access/request-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manage_token: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get PIN');
      setPinResult(data);
    } catch (err: any) {
      setPinError(err.message);
    } finally {
      setPinLoading(false);
    }
  }

  async function requestBluetooth() {
    setBtLoading(true);
    setBtError(null);
    try {
      const res = await fetch(`${API_URL}/access/request-bluetooth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manage_token: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get Bluetooth info');
      setBtResult(data);
    } catch (err: any) {
      setBtError(err.message);
    } finally {
      setBtLoading(false);
    }
  }

  async function copyPin() {
    if (!pinResult?.pin) return;
    try {
      await navigator.clipboard.writeText(pinResult.pin);
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2000);
    } catch { /* ignore */ }
  }

  async function copyBtKey() {
    if (!btResult?.bluetoothGuestKey) return;
    try {
      await navigator.clipboard.writeText(btResult.bluetoothGuestKey);
      setBtKeyCopied(true);
      setTimeout(() => setBtKeyCopied(false), 2000);
    } catch { /* ignore */ }
  }

  function formatLocalTime(isoString: string) {
    return new Date(isoString).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  const intervalLabel = member?.billing_interval === 'yearly' ? t('interval.year') : t('interval.month');

  return (
    <div className="min-h-screen bg-warm-50">
      <header className="bg-forest-900 text-white px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-display font-bold text-lg text-white hover:text-forest-200 transition-colors">
          GymAccess
        </Link>
        <LanguageSwitcher />
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

              {/* Access Controls — only shown for igloohome gyms */}
              {member.igloohome_configured && (
                <div className="mt-6 border-t border-warm-200 pt-6">
                  <h2 className="font-display font-semibold text-base text-forest-900 mb-1">{t('access.heading')}</h2>
                  <p className="text-xs text-gray-500 mb-4">{t('access.subtitle')}</p>

                  {member.status !== 'active' && (
                    <div className="bg-warm-50 border border-warm-200 rounded-xl p-3 text-sm text-gray-600 text-center mb-4">
                      {t('access.inactiveWarning')}
                    </div>
                  )}

                  {/* Primary: Bluetooth */}
                  <button
                    onClick={requestBluetooth}
                    disabled={member.status !== 'active' || btLoading}
                    className="w-full flex items-center justify-center gap-2 bg-forest-900 hover:bg-forest-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-4 rounded-xl transition-colors mb-3 min-h-[56px]"
                  >
                    {btLoading ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L12 22M12 2L18 8M12 2L6 8M12 22L18 16M12 22L6 16" />
                      </svg>
                    )}
                    {btResult ? t('access.bluetooth.getNew') : t('access.bluetooth.setup')}
                  </button>
                  <p className="text-xs text-gray-500 text-center mb-4">{t('access.bluetooth.recommended')}</p>

                  {btResult && (
                    <div className="bg-forest-50 border border-forest-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-forest-600">{t('access.bluetooth.keyLabel')}</span>
                        <button
                          onClick={copyBtKey}
                          className="text-xs text-forest-700 hover:text-forest-900 border border-forest-300 rounded-lg px-2 py-1 transition-colors"
                        >
                          {btKeyCopied ? t('access.bluetooth.copied') : t('access.bluetooth.copy')}
                        </button>
                      </div>
                      <div className="font-mono text-xs bg-white border border-forest-200 rounded-lg px-3 py-2 break-all text-forest-900 mb-3 select-all">
                        {btResult.bluetoothGuestKey}
                      </div>
                      <p className="text-xs font-semibold text-forest-800 mb-1">{t('access.bluetooth.howToUse')}</p>
                      <ol className="space-y-1 list-decimal list-inside text-xs text-gray-700">
                        <li>{t('access.bluetooth.step1')}</li>
                        <li>{t('access.bluetooth.step2')}</li>
                        <li>{t('access.bluetooth.step3')}</li>
                        <li>{t('access.bluetooth.step4')}</li>
                      </ol>
                      <p className="text-xs text-gray-400 mt-2">
                        {t('access.bluetooth.validUntil', { date: new Date(btResult.valid_until).toLocaleDateString() })}
                      </p>
                    </div>
                  )}
                  {btError && (
                    <p className="text-xs text-red-600 text-center mb-4">{btError}</p>
                  )}

                  {/* Secondary: Door PIN */}
                  <button
                    onClick={requestPin}
                    disabled={member.status !== 'active' || pinLoading}
                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-warm-50 disabled:opacity-50 disabled:cursor-not-allowed border border-warm-300 text-forest-800 font-medium py-3 px-4 rounded-xl transition-colors min-h-[48px]"
                  >
                    {pinLoading ? (
                      <span className="w-4 h-4 border-2 border-forest-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                    {t('access.pin.getPin')}
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-1 mb-3">{t('access.pin.subtitle')}</p>

                  {pinResult && (
                    <div className="bg-forest-50 border border-forest-200 rounded-xl p-4 mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-forest-600">{t('access.pin.label')}</span>
                        <button
                          onClick={copyPin}
                          className="text-xs text-forest-700 hover:text-forest-900 border border-forest-300 rounded-lg px-2 py-1 transition-colors"
                        >
                          {pinCopied ? t('access.bluetooth.copied') : t('access.bluetooth.copy')}
                        </button>
                      </div>
                      <div className="font-mono text-3xl font-bold text-forest-900 tracking-widest text-center py-2">
                        {pinResult.pin.split('').join(' ')}
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        {t('access.pin.validUntil', { time: formatLocalTime(pinResult.valid_until) })}
                      </p>
                    </div>
                  )}
                  {pinError && (
                    <p className="text-xs text-red-600 text-center mt-2">{pinError}</p>
                  )}
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
