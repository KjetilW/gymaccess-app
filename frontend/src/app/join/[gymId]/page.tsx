'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface GymInfo {
  gym_id: string;
  name: string;
  location: string;
  membership_price: number;
  billing_interval: string;
}

export default function JoinPage() {
  const { gymId } = useParams<{ gymId: string }>();
  const router = useRouter();

  const [gym, setGym] = useState<GymInfo | null>(null);
  const [gymLoading, setGymLoading] = useState(true);
  const [gymError, setGymError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [terms, setTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/gyms/${gymId}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => {
        setGym(data);
        setGymLoading(false);
      })
      .catch(() => {
        setGymError('Gym not found.');
        setGymLoading(false);
      });
  }, [gymId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Your name is required';
    if (!email.trim()) {
      e.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'Please enter a valid email address';
    }
    if (!terms) e.terms = 'You must accept the terms to proceed';
    return e;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`${API_URL}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, gymId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      router.push(`/join/${gymId}/payment?memberId=${data.member_id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (gymLoading) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-forest-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (gymError || !gym) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-display font-bold text-forest-900 mb-2">Gym not found</p>
          <p className="text-gray-500 text-sm">This signup link may be invalid or expired.</p>
          <Link href="/" className="mt-6 inline-block text-sm text-forest-700 hover:underline">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50">
      <header className="bg-forest-900 text-white px-6 py-4">
        <Link href="/" className="font-display font-bold text-lg text-white hover:text-forest-200 transition-colors">
          OpenGym
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12">
        {/* Gym info card */}
        <div className="bg-forest-900 text-white rounded-2xl p-6 mb-8">
          <p className="text-forest-300 text-xs font-semibold uppercase tracking-widest mb-1">Join</p>
          <h1 className="font-display font-bold text-2xl mb-1">{gym.name}</h1>
          <p className="text-forest-400 text-sm">{gym.location}</p>
          <div className="mt-4 pt-4 border-t border-forest-800 flex items-baseline gap-2">
            <span className="font-display font-bold text-3xl">NOK {gym.membership_price.toLocaleString()}</span>
            <span className="text-forest-400 text-sm">/ {gym.billing_interval === 'yearly' ? 'year' : 'month'}</span>
          </div>
        </div>

        {/* Signup form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-warm-200 p-6 space-y-5">
          <h2 className="font-display font-bold text-lg text-forest-900">Your details</h2>

          <div>
            <label className="block text-sm font-semibold text-forest-800 mb-1.5">Full name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className={`w-full px-4 py-3 rounded-xl border text-forest-900 focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent transition-all ${errors.name ? 'border-red-400 bg-red-50' : 'border-warm-200 hover:border-forest-400'}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-forest-800 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`w-full px-4 py-3 rounded-xl border text-forest-900 focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent transition-all ${errors.email ? 'border-red-400 bg-red-50' : 'border-warm-200 hover:border-forest-400'}`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-forest-800 mb-1.5">
              Phone number <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+47 123 45 678"
              className="w-full px-4 py-3 rounded-xl border border-warm-200 text-forest-900 focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent transition-all hover:border-forest-400"
            />
          </div>

          <div>
            <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${errors.terms ? 'border-red-400 bg-red-50' : 'border-warm-200 hover:border-forest-400'}`}>
              <input
                type="checkbox"
                checked={terms}
                onChange={e => setTerms(e.target.checked)}
                className="mt-0.5 accent-forest-700 w-4 h-4 flex-shrink-0"
              />
              <span className="text-sm text-forest-800">
                I agree to the{' '}
                <span className="text-forest-700 font-semibold">terms and conditions</span>{' '}
                and understand that my membership will renew automatically until cancelled.
              </span>
            </label>
            {errors.terms && <p className="text-red-500 text-xs mt-1">{errors.terms}</p>}
          </div>

          {submitError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-forest-900 text-white rounded-xl font-display font-bold text-base hover:bg-forest-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creating account…' : `Proceed to payment — NOK ${gym.membership_price.toLocaleString()}`}
          </button>
        </form>
      </main>

      <footer className="border-t border-warm-200 bg-white mt-8">
        <div className="max-w-lg mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span className="font-display font-semibold text-forest-800">OpenGym</span>
          <span>Secure payments by Stripe · Member data is encrypted</span>
          <span>© {new Date().getFullYear()} OpenGym</span>
        </div>
      </footer>
    </div>
  );
}
