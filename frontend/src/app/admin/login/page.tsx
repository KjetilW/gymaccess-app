'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid email or password');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('gymId', data.gymId);
      localStorage.setItem('adminId', data.adminId);
      router.push('/admin/members');
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-50 bg-grid-forest flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block font-display font-extrabold text-3xl text-forest-900">
            OpenGym
          </Link>
          <p className="text-gray-500 mt-2">Sign in to your gym admin</p>
        </div>

        <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-forest-800 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="admin@yourgym.com"
                className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white text-forest-900 placeholder-gray-400 hover:border-forest-400 focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-forest-800 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Your password"
                className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white text-forest-900 placeholder-gray-400 hover:border-forest-400 focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 bg-forest-900 text-white rounded-xl font-display font-bold hover:bg-forest-800 active:bg-forest-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-forest-900/20 focus:outline-none focus:ring-2 focus:ring-forest-700 focus:ring-offset-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign in →'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Don&apos;t have a gym account?{' '}
          <Link href="/admin/register" className="text-sage-dark font-semibold hover:underline">
            Register your gym
          </Link>
        </p>
      </div>
    </div>
  );
}
