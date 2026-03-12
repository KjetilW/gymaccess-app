'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '../components/Logo';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import enMessages from '../../../messages/en.json';
import nbMessages from '../../../messages/nb.json';
import { plusJakarta, dmSans } from '../fonts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const messagesByLocale: Record<string, typeof enMessages> = { en: enMessages, nb: nbMessages };

interface GymInfo {
  name: string;
  saas_plan?: string;
  saas_status?: string | null;
  stripe_connect_status?: string;
  admin_language?: string;
}

// ─── Components that call useTranslations — must be children of NextIntlClientProvider ───

function SaasBanner({ saasPlan, saasStatus }: { saasPlan: string; saasStatus: string | null | undefined }) {
  const t = useTranslations('admin.banners');

  if (saasPlan === 'pro' && saasStatus === 'active') return null;

  if (saasPlan === 'pro' && saasStatus === 'past_due') {
    return (
      <div className="bg-orange-500 text-white px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">{t('saasPastDue.title')}</span>
          <span className="opacity-90">{t('saasPastDue.body')}</span>
        </div>
        <Link href="/admin/settings" className="shrink-0 px-3 py-1 bg-white text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-50 transition-colors">
          {t('saasPastDue.cta')}
        </Link>
      </div>
    );
  }

  if (saasPlan === 'starter') {
    return (
      <div className="bg-forest-800 text-forest-200 px-6 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="opacity-80">{t('saasStarter.body')}</span>
          <span className="font-semibold text-white">{t('saasStarter.upgrade')}</span>
        </div>
        <Link href="/admin/settings" className="shrink-0 px-3 py-1 bg-sage text-forest-900 rounded-lg text-xs font-bold hover:bg-sage/80 transition-colors">
          {t('saasStarter.cta')}
        </Link>
      </div>
    );
  }

  return null;
}

function StripeConnectBanner({ status }: { status: string | undefined }) {
  const t = useTranslations('admin.banners');

  if (!status || status === 'active') return null;

  if (status === 'pending') {
    return (
      <div className="bg-yellow-500 text-yellow-950 px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">{t('stripePending.title')}</span>
          <span className="opacity-80">{t('stripePending.body')}</span>
        </div>
        <Link href="/admin/settings" className="shrink-0 px-3 py-1 bg-yellow-950 text-yellow-100 rounded-lg text-xs font-bold hover:bg-yellow-900 transition-colors">
          {t('stripePending.cta')}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-red-600 text-white px-6 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm">
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="font-semibold">{t('stripeNotConnected.title')}</span>
        <span className="opacity-90">{t('stripeNotConnected.body')}</span>
      </div>
      <Link href="/admin/settings" className="shrink-0 px-3 py-1 bg-white text-red-700 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors">
        {t('stripeNotConnected.cta')}
      </Link>
    </div>
  );
}

function AdminShell({
  children,
  gymInfo,
  checking,
  onSignOut,
}: {
  children: React.ReactNode;
  gymInfo: GymInfo;
  checking: boolean;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const t = useTranslations('admin');

  if (pathname === '/admin/login' || pathname === '/admin/register') {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-forest-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const navItems = [
    { href: '/admin/members', label: t('nav.members') },
    { href: '/admin/access', label: t('nav.access') },
    { href: '/admin/payments', label: t('nav.payments') },
    { href: '/admin/settings', label: t('nav.settings') },
  ];

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <header className="bg-forest-900 text-white px-6 py-0 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 py-4">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Logo size={28} variant="light" />
          </Link>
          {gymInfo.name && (
            <>
              <span className="text-forest-600 text-lg">/</span>
              <span className="text-forest-300 text-sm font-medium">{gymInfo.name}</span>
            </>
          )}
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map(({ href, label }) => {
            const active = pathname === href || pathname?.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-5 text-sm font-medium transition-colors border-b-2 ${
                  active
                    ? 'border-sage text-white'
                    : 'border-transparent text-forest-300 hover:text-white hover:border-forest-500'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={onSignOut}
          className="text-forest-400 hover:text-white text-sm transition-colors py-4"
        >
          {t('nav.signOut')}
        </button>
      </header>

      <StripeConnectBanner status={gymInfo.stripe_connect_status} />
      {gymInfo.saas_plan && (
        <SaasBanner saasPlan={gymInfo.saas_plan} saasStatus={gymInfo.saas_status ?? null} />
      )}

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

// ─── AdminLayout — manages auth + locale, renders html/body + provider ──────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [gymInfo, setGymInfo] = useState<GymInfo>({ name: '' });
  const [checking, setChecking] = useState(true);
  const [adminLocale, setAdminLocale] = useState<string>(() => {
    // Read localStorage immediately to avoid FOIL (Flash Of Initial Language)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin-lang') || 'en';
    }
    return 'en';
  });

  useEffect(() => {
    if (pathname === '/admin/login' || pathname === '/admin/register') {
      setChecking(false);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    fetch(`${API_URL}/admin/gym`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const lang = data.admin_language || 'en';
        setAdminLocale(lang);
        localStorage.setItem('admin-lang', lang);
        setGymInfo({
          name: data.name || '',
          saas_plan: data.saas_plan || 'starter',
          saas_status: data.saas_status || null,
          stripe_connect_status: data.stripe_connect_status || 'not_connected',
          admin_language: lang,
        });
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [pathname, router]);

  function handleSignOut() {
    localStorage.clear();
    router.push('/admin/login');
  }

  return (
    <html lang={adminLocale} className={`${plusJakarta.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-warm-50 text-forest-900 antialiased font-body">
        <NextIntlClientProvider
          locale={adminLocale}
          messages={messagesByLocale[adminLocale] || enMessages}
        >
          <AdminShell gymInfo={gymInfo} checking={checking} onSignOut={handleSignOut}>
            {children}
          </AdminShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
