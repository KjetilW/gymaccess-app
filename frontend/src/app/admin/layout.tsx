'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface GymInfo {
  name: string;
  saas_status?: string;
  trial_ends_at?: string | null;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function SaasBanner({ saasStatus, trialEndsAt }: { saasStatus: string; trialEndsAt: string | null | undefined }) {
  const trialDaysLeft = trialEndsAt ? daysUntil(trialEndsAt) : null;
  const trialExpired = saasStatus === 'trial' && trialDaysLeft !== null && trialDaysLeft <= 0;

  if (saasStatus === 'active') return null;
  if (saasStatus === 'trial' && !trialExpired) return null;

  if (trialExpired) {
    return (
      <div className="bg-red-600 text-white px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">Your free trial has expired.</span>
          <span className="opacity-90">Subscribe to GymAccess to continue managing your gym.</span>
        </div>
        <Link
          href="/admin/settings"
          className="shrink-0 px-3 py-1 bg-white text-red-700 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
        >
          Subscribe now
        </Link>
      </div>
    );
  }

  if (saasStatus === 'past_due') {
    return (
      <div className="bg-orange-500 text-white px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">Payment issue with your GymAccess subscription.</span>
          <span className="opacity-90">Update your payment method to avoid service interruption.</span>
        </div>
        <Link
          href="/admin/settings"
          className="shrink-0 px-3 py-1 bg-white text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-50 transition-colors"
        >
          Fix now
        </Link>
      </div>
    );
  }

  if (saasStatus === 'cancelled') {
    return (
      <div className="bg-gray-700 text-white px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span className="font-semibold">Your GymAccess subscription has been cancelled.</span>
          <span className="opacity-90">Re-subscribe to continue using the platform.</span>
        </div>
        <Link
          href="/admin/settings"
          className="shrink-0 px-3 py-1 bg-white text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
        >
          Re-subscribe
        </Link>
      </div>
    );
  }

  return null;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [gymInfo, setGymInfo] = useState<GymInfo>({ name: '' });
  const [checking, setChecking] = useState(true);

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
        setGymInfo({
          name: data.name || '',
          saas_status: data.saas_status,
          trial_ends_at: data.trial_ends_at,
        });
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [pathname, router]);

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
    { href: '/admin/members', label: 'Members' },
    { href: '/admin/access', label: 'Access' },
    { href: '/admin/payments', label: 'Payments' },
    { href: '/admin/settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <header className="bg-forest-900 text-white px-6 py-0 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 py-4">
          <Link href="/" className="font-display font-bold text-lg text-white hover:text-forest-200 transition-colors">
            GymAccess
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
            const active = pathname === href || pathname.startsWith(href + '/');
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
          onClick={() => {
            localStorage.clear();
            router.push('/admin/login');
          }}
          className="text-forest-400 hover:text-white text-sm transition-colors py-4"
        >
          Sign out
        </button>
      </header>

      {gymInfo.saas_status && (
        <SaasBanner saasStatus={gymInfo.saas_status} trialEndsAt={gymInfo.trial_ends_at} />
      )}

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
