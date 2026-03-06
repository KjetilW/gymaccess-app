'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface FormData {
  name: string;
  email: string;
  password: string;
  gymName: string;
  location: string;
  membershipPrice: string;
  billingInterval: 'monthly' | 'yearly';
  accessType: 'shared_pin' | 'individual_pin' | 'smart_lock';
}

type FormErrors = Partial<Record<keyof FormData, string>>;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    gymName: '',
    location: '',
    membershipPrice: '299',
    billingInterval: 'monthly',
    accessType: 'shared_pin',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (field: keyof FormData) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = 'Your name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (!form.gymName.trim()) errs.gymName = 'Gym name is required';
    if (!form.location.trim()) errs.location = 'Location is required';
    if (!form.membershipPrice) errs.membershipPrice = 'Membership price is required';
    else if (isNaN(Number(form.membershipPrice)) || Number(form.membershipPrice) < 0) {
      errs.membershipPrice = 'Enter a valid price';
    }
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    setServerError('');
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, membershipPrice: Number(form.membershipPrice) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || 'Registration failed. Please try again.');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('gymId', data.gymId);
      localStorage.setItem('adminId', data.adminId);
      router.push('/admin/members');
    } catch {
      setServerError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: keyof FormData) =>
    `w-full px-4 py-3 rounded-xl border text-forest-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent transition-all ${errors[field] ? 'border-red-300 bg-red-50' : 'border-warm-200 hover:border-forest-400'}`;

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 bg-forest-900 p-12">
        <Link href="/" className="font-display font-bold text-2xl text-white">GymAccess</Link>

        <div>
          <h2 className="font-display font-extrabold text-4xl text-white leading-tight mb-5">
            Automate your gym<br />in 15 minutes
          </h2>
          <p className="text-forest-200 text-lg mb-10 leading-relaxed">
            Set up payments, access control, and member notifications — no technical expertise needed.
          </p>
          <ul className="space-y-4">
            {[
              'Stripe recurring subscriptions',
              'Automatic access code distribution',
              'Payment failure notifications',
              'Admin dashboard for member management',
            ].map(item => (
              <li key={item} className="flex items-center gap-3 text-forest-100">
                <svg className="w-5 h-5 flex-shrink-0 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-forest-500 text-sm">&copy; 2026 GymAccess &mdash; Built for community gyms</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col bg-warm-50 overflow-y-auto">
        <div className="flex-1 flex flex-col max-w-xl w-full mx-auto px-8 py-12">
          <div className="lg:hidden mb-8">
            <Link href="/" className="font-display font-bold text-2xl text-forest-900">GymAccess</Link>
          </div>

          <h1 className="font-display font-extrabold text-3xl text-forest-900 mb-1">
            Register your gym
          </h1>
          <p className="text-gray-500 mb-8">
            Already registered?{' '}
            <Link href="/admin/login" className="text-sage-dark font-semibold hover:underline">Sign in</Link>
          </p>

          {serverError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-8">
            {/* Section: Your Details */}
            <section>
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-forest-600 mb-4">Your Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-forest-800 mb-1.5">Full name</label>
                  <input type="text" placeholder="John Smith" value={form.name} onChange={setField('name')} className={inputClass('name')} />
                  {errors.name && <p className="mt-1.5 text-sm text-red-600">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-forest-800 mb-1.5">Email address</label>
                  <input type="email" placeholder="john@example.com" value={form.email} onChange={setField('email')} className={inputClass('email')} />
                  {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-forest-800 mb-1.5">Password</label>
                  <input type="password" placeholder="Minimum 8 characters" value={form.password} onChange={setField('password')} className={inputClass('password')} />
                  {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>}
                </div>
              </div>
            </section>

            <hr className="border-warm-200" />

            {/* Section: Your Gym */}
            <section>
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-forest-600 mb-4">Your Gym</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-forest-800 mb-1.5">Gym name</label>
                  <input type="text" placeholder="Nordfjord Gym" value={form.gymName} onChange={setField('gymName')} className={inputClass('gymName')} />
                  {errors.gymName && <p className="mt-1.5 text-sm text-red-600">{errors.gymName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-forest-800 mb-1.5">Location</label>
                  <input type="text" placeholder="Nordfjordeid, Norway" value={form.location} onChange={setField('location')} className={inputClass('location')} />
                  {errors.location && <p className="mt-1.5 text-sm text-red-600">{errors.location}</p>}
                </div>
              </div>
            </section>

            <hr className="border-warm-200" />

            {/* Section: Membership Settings */}
            <section>
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-forest-600 mb-4">Membership Settings</h2>
              <div className="space-y-5">

                {/* Price */}
                <div>
                  <label className="block text-sm font-semibold text-forest-800 mb-1.5">Membership price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400 text-sm select-none">NOK</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.membershipPrice}
                      onChange={setField('membershipPrice')}
                      className={`${inputClass('membershipPrice')} pl-14`}
                    />
                  </div>
                  {errors.membershipPrice && <p className="mt-1.5 text-sm text-red-600">{errors.membershipPrice}</p>}
                </div>

                {/* Billing interval */}
                <div>
                  <label className="block text-sm font-semibold text-forest-800 mb-2.5">Billing frequency</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['monthly', 'yearly'] as const).map(interval => (
                      <label
                        key={interval}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border cursor-pointer font-semibold text-sm transition-all duration-150 ${
                          form.billingInterval === interval
                            ? 'bg-forest-900 border-forest-900 text-white shadow-md shadow-forest-900/25'
                            : 'bg-white border-warm-200 text-forest-700 hover:border-forest-400 hover:bg-forest-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="billingInterval"
                          value={interval}
                          checked={form.billingInterval === interval}
                          onChange={setField('billingInterval')}
                          className="sr-only"
                        />
                        {interval === 'monthly' ? 'Monthly' : 'Yearly'}
                        {interval === 'yearly' && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${form.billingInterval === 'yearly' ? 'bg-sage text-forest-900' : 'bg-sage-light text-forest-800'}`}>
                            SAVE
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Access type */}
                <div>
                  <label className="block text-sm font-semibold text-forest-800 mb-2.5">Access control method</label>
                  <div className="space-y-2">
                    {[
                      { value: 'shared_pin', label: 'Shared PIN', desc: 'One PIN for all active members. Simplest setup, no device needed.', icon: '🔢' },
                      { value: 'individual_pin', label: 'Individual PIN', desc: 'Unique PIN per member. Better security, prevents code sharing.', icon: '🔐' },
                      { value: 'smart_lock', label: 'Smart Lock', desc: 'Igloohome or Seam integration. Full automation.', icon: '🔒' },
                    ].map(({ value, label, desc, icon }) => (
                      <label
                        key={value}
                        className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
                          form.accessType === value
                            ? 'border-forest-700 bg-forest-50 ring-1 ring-forest-700'
                            : 'border-warm-200 bg-white hover:border-forest-400 hover:bg-warm-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="accessType"
                          value={value}
                          checked={form.accessType === value}
                          onChange={setField('accessType')}
                          className="mt-1 accent-forest-700"
                        />
                        <span className="text-xl leading-none mt-0.5">{icon}</span>
                        <div>
                          <div className="font-semibold text-forest-900 text-sm">{label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-8 bg-forest-900 text-white rounded-xl font-display font-bold text-base hover:bg-forest-800 active:bg-forest-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-forest-900/20 focus:outline-none focus:ring-2 focus:ring-forest-700 focus:ring-offset-2 focus:ring-offset-warm-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating your gym…
                </span>
              ) : (
                'Create gym account →'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
