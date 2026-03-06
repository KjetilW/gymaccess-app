'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [gymName, setGymName] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Skip auth check on login/register pages
    if (pathname === '/admin/login' || pathname === '/admin/register') {
      setChecking(false);
      return;
    }

    const token = localStorage.getItem('token');
    const gymId = localStorage.getItem('gymId');

    if (!token) {
      router.push('/admin/login');
      return;
    }

    if (gymId) {
      fetch(`${API_URL}/gyms/${gymId}`)
        .then(r => r.json())
        .then(data => { setGymName(data.name || ''); setChecking(false); })
        .catch(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [pathname, router]);

  // Don't wrap login/register in the admin shell
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
          {gymName && (
            <>
              <span className="text-forest-600 text-lg">/</span>
              <span className="text-forest-300 text-sm font-medium">{gymName}</span>
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

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
