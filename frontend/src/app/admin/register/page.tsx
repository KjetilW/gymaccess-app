'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type Step = 1 | 2 | 3 | 4;

interface AccountForm {
  name: string;
  email: string;
  password: string;
  gymName: string;
  location: string;
}

type AccountErrors = Partial<Record<keyof AccountForm, string>>;

const STEP_LABELS = ['Account', 'Plan', 'Pricing', 'Access'];

function calculateFees(price: number, platformFeePercent: number) {
  const stripeFeePercent = 1.4;
  const stripeFixedFee = 2.90;
  const stripeFee = price * (stripeFeePercent / 100) + stripeFixedFee;
  const platformFee = price * (platformFeePercent / 100);
  const netAmount = price - stripeFee - platformFee;
  return { stripeFee, platformFee, netAmount, stripeFeePercent, stripeFixedFee };
}

// --- Progress Bar ---
function ProgressBar({ current, completed }: { current: Step; completed: number }) {
  return (
    <div className="flex items-center justify-between mb-10">
      {STEP_LABELS.map((label, i) => {
        const step = (i + 1) as Step;
        const isCompleted = step < completed + 1 && step < current;
        const isCurrent = step === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-forest-900 text-white'
                    : isCurrent
                      ? 'bg-sage text-forest-900 ring-4 ring-sage/30'
                      : 'bg-warm-100 text-warm-300 border-2 border-warm-200'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span className={`text-xs mt-1.5 font-semibold ${isCurrent ? 'text-forest-900' : 'text-warm-300'}`}>
                {label}
              </span>
            </div>
            {i < 3 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 ${step < current ? 'bg-forest-900' : 'bg-warm-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Spinner ---
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// --- Error Banner ---
function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {message}
    </div>
  );
}

// --- Brand panel content per step ---
const BRAND_CONTENT: Record<Step, { title: string; subtitle: string; items: string[] }> = {
  1: {
    title: 'Set up your gym\nin 4 easy steps',
    subtitle: 'No technical expertise needed. Takes about 5 minutes.',
    items: ['Automated Stripe payments', 'Access code management', 'Email notifications', 'Admin dashboard'],
  },
  2: {
    title: 'Choose the plan\nthat fits your gym',
    subtitle: 'Start free, upgrade when your gym grows.',
    items: ['Starter: Free with 3% fee', 'Pro: 299 kr/mo with 1% fee', 'Upgrade or downgrade anytime', 'No lock-in, no contracts'],
  },
  3: {
    title: 'Set your\nmembership price',
    subtitle: 'See exactly what you earn after fees.',
    items: ['Transparent fee breakdown', 'Stripe handles all payments', 'Automatic recurring billing', 'Members pay by card'],
  },
  4: {
    title: 'How will members\naccess your gym?',
    subtitle: 'Choose the method that works for your setup.',
    items: ['Shared PIN: simplest option', 'Individual PIN: better security', 'Smart lock: fully automated', 'Change anytime from Settings'],
  },
};

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // Step 1: Account
  const [account, setAccount] = useState<AccountForm>({
    name: '', email: '', password: '', gymName: '', location: '',
  });
  const [accountErrors, setAccountErrors] = useState<AccountErrors>({});

  // Step 2: Plan
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro'>('starter');
  const [proBilling, setProBilling] = useState<'monthly' | 'yearly'>('monthly');

  // Step 3: Pricing
  const [membershipPrice, setMembershipPrice] = useState('299');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  // Step 4: Access
  const [accessType, setAccessType] = useState<'shared_pin' | 'individual_pin' | 'smart_lock'>('shared_pin');
  const [igloohomeStep, setIgloohomeStep] = useState(0);
  const [igloohomeClientId, setIgloohomeClientId] = useState('');
  const [igloohomeClientSecret, setIgloohomeClientSecret] = useState('');
  const [igloohomeLockId, setIgloohomeLockId] = useState('');
  const [igloohomeSaving, setIgloohomeSaving] = useState(false);
  const [igloohomeError, setIgloohomeError] = useState('');

  // Resume from Stripe redirect or page refresh
  useEffect(() => {
    const stepParam = searchParams?.get('step');
    const token = localStorage.getItem('token');
    if (token && stepParam) {
      const step = parseInt(stepParam) as Step;
      if (step >= 2 && step <= 4) {
        setCurrentStep(step);
        // Fetch gym data to determine plan
        fetch(`${API_URL}/admin/gym`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.json())
          .then(data => {
            if (data.saas_plan === 'pro') setSelectedPlan('pro');
            if (data.membership_price) setMembershipPrice(String(data.membership_price));
            if (data.billing_interval) setBillingInterval(data.billing_interval);
            if (data.access_type) setAccessType(data.access_type);
          })
          .catch(() => {});
      }
    }
  }, [searchParams]);

  // --- Step 1 handlers ---
  const setAccountField = (field: keyof AccountForm) => (e: ChangeEvent<HTMLInputElement>) => {
    setAccount(prev => ({ ...prev, [field]: e.target.value }));
    setAccountErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validateAccount = (): AccountErrors => {
    const errs: AccountErrors = {};
    if (!account.name.trim()) errs.name = 'Your name is required';
    if (!account.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) errs.email = 'Enter a valid email address';
    if (!account.password) errs.password = 'Password is required';
    else if (account.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (!account.gymName.trim()) errs.gymName = 'Gym name is required';
    if (!account.location.trim()) errs.location = 'Location is required';
    return errs;
  };

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateAccount();
    if (Object.keys(errs).length > 0) { setAccountErrors(errs); return; }
    setLoading(true);
    setServerError('');
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: account.name,
          email: account.email,
          password: account.password,
          gymName: account.gymName,
          location: account.location,
          membershipPrice: 299,
          billingInterval: 'monthly',
          accessType: 'shared_pin',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || 'Registration failed. Please try again.');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('gymId', data.gymId);
      localStorage.setItem('adminId', data.adminId);
      setCurrentStep(2);
    } catch {
      setServerError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2 handlers ---
  const handleProCheckout = async () => {
    setLoading(true);
    setServerError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/admin/saas/checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: proBilling, returnUrl: '/admin/register?step=3' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout');
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setServerError(err.message || 'Failed to start subscription checkout.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 3 handlers ---
  const handleSavePricing = async () => {
    setLoading(true);
    setServerError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipPrice: Number(membershipPrice),
          billingInterval,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setCurrentStep(4);
    } catch {
      setServerError('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 4 handlers ---
  const handleFinishSetup = async () => {
    setLoading(true);
    setServerError('');
    const token = localStorage.getItem('token');
    try {
      const body: Record<string, string> = { accessType };
      if (accessType === 'smart_lock' && igloohomeClientId.trim()) {
        body.igloohome_client_id = igloohomeClientId.trim();
        body.igloohome_lock_id = igloohomeLockId.trim();
        if (igloohomeClientSecret.trim()) {
          body.igloohome_client_secret = igloohomeClientSecret.trim();
        }
      }
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save');
      router.push('/admin/members');
    } catch {
      setServerError('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIgloohome = async (): Promise<boolean> => {
    setIgloohomeSaving(true);
    setIgloohomeError('');
    try {
      const token = localStorage.getItem('token');
      const body: Record<string, string> = {
        accessType: 'smart_lock',
        igloohome_lock_id: igloohomeLockId.trim(),
        igloohome_client_id: igloohomeClientId.trim(),
      };
      if (igloohomeClientSecret.trim()) {
        body.igloohome_client_secret = igloohomeClientSecret.trim();
      }
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setIgloohomeError(data.error || 'Failed to save settings');
        return false;
      }
      return true;
    } catch {
      setIgloohomeError('Network error. Please try again.');
      return false;
    } finally {
      setIgloohomeSaving(false);
    }
  };

  const inputClass = (hasError?: boolean) =>
    `w-full px-4 py-3 rounded-xl border text-forest-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent transition-all ${hasError ? 'border-red-300 bg-red-50' : 'border-warm-200 hover:border-forest-400'}`;

  const brandContent = BRAND_CONTENT[currentStep];

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 bg-forest-900 p-12">
        <Link href="/" className="font-display font-bold text-2xl text-white">GymAccess</Link>

        <div>
          <h2 className="font-display font-extrabold text-4xl text-white leading-tight mb-5 whitespace-pre-line">
            {brandContent.title}
          </h2>
          <p className="text-forest-200 text-lg mb-10 leading-relaxed">
            {brandContent.subtitle}
          </p>
          <ul className="space-y-4">
            {brandContent.items.map(item => (
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

          <ProgressBar current={currentStep} completed={currentStep - 1} />

          <ErrorBanner message={serverError} />

          {/* ===== STEP 1: Create Account ===== */}
          {currentStep === 1 && (
            <>
              <h1 className="font-display font-extrabold text-3xl text-forest-900 mb-1">
                Create your account
              </h1>
              <p className="text-gray-500 mb-8">
                Already registered?{' '}
                <Link href="/admin/login" className="text-sage-dark font-semibold hover:underline">Sign in</Link>
              </p>

              <form onSubmit={handleCreateAccount} noValidate className="space-y-8">
                <section>
                  <h2 className="font-display font-bold text-xs uppercase tracking-widest text-forest-600 mb-4">Your Details</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-forest-800 mb-1.5">Full name</label>
                      <input type="text" placeholder="John Smith" value={account.name} onChange={setAccountField('name')} className={inputClass(!!accountErrors.name)} />
                      {accountErrors.name && <p className="mt-1.5 text-sm text-red-600">{accountErrors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-forest-800 mb-1.5">Email address</label>
                      <input type="email" placeholder="john@example.com" value={account.email} onChange={setAccountField('email')} className={inputClass(!!accountErrors.email)} />
                      {accountErrors.email && <p className="mt-1.5 text-sm text-red-600">{accountErrors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-forest-800 mb-1.5">Password</label>
                      <input type="password" placeholder="Minimum 8 characters" value={account.password} onChange={setAccountField('password')} className={inputClass(!!accountErrors.password)} />
                      {accountErrors.password && <p className="mt-1.5 text-sm text-red-600">{accountErrors.password}</p>}
                    </div>
                  </div>
                </section>

                <hr className="border-warm-200" />

                <section>
                  <h2 className="font-display font-bold text-xs uppercase tracking-widest text-forest-600 mb-4">Your Gym</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-forest-800 mb-1.5">Gym name</label>
                      <input type="text" placeholder="Nordfjord Gym" value={account.gymName} onChange={setAccountField('gymName')} className={inputClass(!!accountErrors.gymName)} />
                      {accountErrors.gymName && <p className="mt-1.5 text-sm text-red-600">{accountErrors.gymName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-forest-800 mb-1.5">Location</label>
                      <input type="text" placeholder="Nordfjordeid, Norway" value={account.location} onChange={setAccountField('location')} className={inputClass(!!accountErrors.location)} />
                      {accountErrors.location && <p className="mt-1.5 text-sm text-red-600">{accountErrors.location}</p>}
                    </div>
                  </div>
                </section>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-8 bg-forest-900 text-white rounded-xl font-display font-bold text-base hover:bg-forest-800 active:bg-forest-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-forest-900/20"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2"><Spinner /> Creating your account…</span>
                  ) : (
                    'Create account'
                  )}
                </button>
              </form>
            </>
          )}

          {/* ===== STEP 2: Choose Plan ===== */}
          {currentStep === 2 && (
            <>
              <h1 className="font-display font-extrabold text-3xl text-forest-900 mb-1">
                Choose your plan
              </h1>
              <p className="text-gray-500 mb-8">
                Start free or save on fees with Pro. You can change anytime.
              </p>

              <div className="space-y-4">
                {/* Starter card */}
                <div
                  onClick={() => setSelectedPlan('starter')}
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-150 ${
                    selectedPlan === 'starter'
                      ? 'border-forest-700 bg-forest-50 ring-1 ring-forest-700'
                      : 'border-warm-200 bg-white hover:border-forest-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-display font-bold text-xl text-forest-900">Starter</h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="font-display font-extrabold text-3xl text-forest-900">Free</span>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedPlan === 'starter' ? 'border-forest-700 bg-forest-700' : 'border-warm-300'
                    }`}>
                      {selectedPlan === 'starter' && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-forest-600 mb-4">3% platform fee on each member payment</p>
                  <ul className="space-y-2">
                    {['Unlimited members', 'Automated Stripe payments', 'Access code management', 'Email notifications', 'Admin dashboard'].map(item => (
                      <li key={item} className="flex items-center gap-2 text-sm text-forest-700">
                        <svg className="w-4 h-4 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pro card */}
                <div
                  onClick={() => setSelectedPlan('pro')}
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-150 relative overflow-hidden ${
                    selectedPlan === 'pro'
                      ? 'border-forest-700 bg-forest-900 ring-1 ring-forest-700'
                      : 'border-warm-200 bg-forest-900 hover:border-forest-600'
                  }`}
                >
                  <div className="absolute top-4 right-12">
                    <span className="bg-sage text-forest-900 text-xs font-bold px-2.5 py-1 rounded-full">Lower fees</span>
                  </div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-display font-bold text-xl text-white">Pro</h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="font-display font-extrabold text-3xl text-white">
                          {proBilling === 'yearly' ? '2 490 kr' : '299 kr'}
                        </span>
                        <span className="text-forest-400 text-base">
                          /{proBilling === 'yearly' ? 'year' : 'month'}
                        </span>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedPlan === 'pro' ? 'border-sage bg-sage' : 'border-forest-500'
                    }`}>
                      {selectedPlan === 'pro' && (
                        <svg className="w-3.5 h-3.5 text-forest-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-forest-300 mb-3">1% platform fee on each member payment</p>

                  {selectedPlan === 'pro' && (
                    <div className="flex gap-2 mb-4">
                      {(['monthly', 'yearly'] as const).map(cycle => (
                        <button
                          key={cycle}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setProBilling(cycle); }}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            proBilling === cycle
                              ? 'bg-sage text-forest-900'
                              : 'bg-forest-800 text-forest-300 hover:bg-forest-700'
                          }`}
                        >
                          {cycle === 'monthly' ? '299 kr/mo' : '2 490 kr/yr'}
                          {cycle === 'yearly' && (
                            <span className="ml-1.5 text-xs opacity-80">save 31%</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <ul className="space-y-2">
                    {['Everything in Starter', 'Only 1% platform fee (vs 3%)', 'Lower cost as your gym grows'].map(item => (
                      <li key={item} className="flex items-center gap-2 text-sm text-forest-200">
                        <svg className="w-4 h-4 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (selectedPlan === 'pro') {
                      handleProCheckout();
                    } else {
                      setCurrentStep(3);
                    }
                  }}
                  className="w-full py-4 px-8 bg-forest-900 text-white rounded-xl font-display font-bold text-base hover:bg-forest-800 active:bg-forest-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-forest-900/20"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2"><Spinner /> Redirecting to checkout…</span>
                  ) : selectedPlan === 'pro' ? (
                    'Continue with Pro'
                  ) : (
                    'Continue with Starter'
                  )}
                </button>
                {selectedPlan === 'pro' && (
                  <button
                    type="button"
                    onClick={() => { setSelectedPlan('starter'); setCurrentStep(3); }}
                    className="w-full text-center text-sm text-gray-500 hover:text-forest-700 transition-colors"
                  >
                    Skip — continue with free Starter plan
                  </button>
                )}
              </div>
            </>
          )}

          {/* ===== STEP 3: Membership Price ===== */}
          {currentStep === 3 && (() => {
            const price = Number(membershipPrice) || 0;
            const platformFeePercent = selectedPlan === 'pro' ? 1 : 3;
            const fees = calculateFees(price, platformFeePercent);
            const showBreakdown = price > 0;

            return (
              <>
                <h1 className="font-display font-extrabold text-3xl text-forest-900 mb-1">
                  Set your membership price
                </h1>
                <p className="text-gray-500 mb-8">
                  What will you charge members? See exactly what you&apos;ll receive after fees.
                </p>

                <div className="space-y-6">
                  {/* Price input */}
                  <div>
                    <label className="block text-sm font-semibold text-forest-800 mb-1.5">Membership price</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400 text-sm select-none">NOK</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={membershipPrice}
                        onChange={e => setMembershipPrice(e.target.value)}
                        className={`${inputClass()} pl-14`}
                      />
                    </div>
                  </div>

                  {/* Billing frequency */}
                  <div>
                    <label className="block text-sm font-semibold text-forest-800 mb-2.5">Billing frequency</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['monthly', 'yearly'] as const).map(interval => (
                        <label
                          key={interval}
                          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border cursor-pointer font-semibold text-sm transition-all duration-150 ${
                            billingInterval === interval
                              ? 'bg-forest-900 border-forest-900 text-white shadow-md shadow-forest-900/25'
                              : 'bg-white border-warm-200 text-forest-700 hover:border-forest-400 hover:bg-forest-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="billingInterval"
                            value={interval}
                            checked={billingInterval === interval}
                            onChange={() => setBillingInterval(interval)}
                            className="sr-only"
                          />
                          {interval === 'monthly' ? 'Monthly' : 'Yearly'}
                          {interval === 'yearly' && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${billingInterval === 'yearly' ? 'bg-sage text-forest-900' : 'bg-sage-light text-forest-800'}`}>
                              SAVE
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Fee breakdown */}
                  {showBreakdown && (
                    <div className="bg-white rounded-2xl border border-warm-200 p-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-forest-600 mb-4">
                        Cost breakdown per {billingInterval === 'yearly' ? 'year' : 'month'}
                      </h3>

                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-forest-900 font-semibold">
                          <span>Member pays</span>
                          <span>{price.toFixed(2)} kr</span>
                        </div>
                        <div className="flex justify-between text-forest-600">
                          <span>Stripe processing (~{fees.stripeFeePercent}% + {fees.stripeFixedFee.toFixed(2)} kr)</span>
                          <span className="text-red-600">-{fees.stripeFee.toFixed(2)} kr</span>
                        </div>
                        <div className="flex justify-between text-forest-600">
                          <span>
                            Platform fee ({platformFeePercent}%
                            {selectedPlan === 'starter' && <span className="text-gray-400"> · Starter</span>}
                            {selectedPlan === 'pro' && <span className="text-sage-dark"> · Pro</span>})
                          </span>
                          <span className="text-red-600">-{fees.platformFee.toFixed(2)} kr</span>
                        </div>
                        <hr className="border-warm-200" />
                        <div className="flex justify-between font-bold text-forest-900 text-base">
                          <span>You receive (estimated)</span>
                          <span className="text-forest-900">{fees.netAmount.toFixed(2)} kr</span>
                        </div>
                      </div>

                      {selectedPlan === 'starter' && price > 0 && (
                        <div className="mt-4 p-3 bg-forest-50 border border-forest-200 rounded-xl">
                          <p className="text-xs text-forest-700">
                            <span className="font-semibold">With Pro (1% fee):</span> you&apos;d receive{' '}
                            <span className="font-bold">{calculateFees(price, 1).netAmount.toFixed(2)} kr</span>
                            {' '}&mdash; saving{' '}
                            <span className="font-bold text-sage-dark">{(calculateFees(price, 1).netAmount - fees.netAmount).toFixed(2)} kr</span>
                            {' '}per payment.
                          </p>
                        </div>
                      )}

                      <p className="mt-3 text-xs text-gray-400">
                        Stripe fees vary by card type. European cards: ~1.4% + 2.90 kr. International cards may be higher.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-4 border border-warm-300 text-gray-600 rounded-xl font-display font-bold text-base hover:bg-warm-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={loading || !membershipPrice || Number(membershipPrice) <= 0}
                    onClick={handleSavePricing}
                    className="flex-1 py-4 px-8 bg-forest-900 text-white rounded-xl font-display font-bold text-base hover:bg-forest-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-forest-900/20"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2"><Spinner /> Saving…</span>
                    ) : (
                      'Next'
                    )}
                  </button>
                </div>
              </>
            );
          })()}

          {/* ===== STEP 4: Lock Integration ===== */}
          {currentStep === 4 && (
            <>
              <h1 className="font-display font-extrabold text-3xl text-forest-900 mb-1">
                Access control
              </h1>
              <p className="text-gray-500 mb-8">
                How will members access your gym?
              </p>

              <div className="space-y-3">
                {/* Shared PIN */}
                <div
                  onClick={() => { setAccessType('shared_pin'); setIgloohomeStep(0); }}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-150 ${
                    accessType === 'shared_pin'
                      ? 'border-forest-700 bg-forest-50 ring-1 ring-forest-700'
                      : 'border-warm-200 bg-white hover:border-forest-400'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-warm-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-forest-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-base text-forest-900">Shared PIN</h3>
                        <span className="text-xs font-semibold text-warm-300 bg-warm-100 px-2 py-0.5 rounded-full">Simplest</span>
                      </div>
                      <p className="text-sm text-forest-600 mt-1">
                        All active members share the same PIN code. When a member cancels, GymAccess notifies you to consider changing the code.
                      </p>
                      <p className="text-xs text-gray-400 mt-2 italic">
                        You manage the code on your physical lock or keypad yourself.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Individual PIN */}
                <div
                  onClick={() => { setAccessType('individual_pin'); setIgloohomeStep(0); }}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-150 ${
                    accessType === 'individual_pin'
                      ? 'border-forest-700 bg-forest-50 ring-1 ring-forest-700'
                      : 'border-warm-200 bg-white hover:border-forest-400'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-warm-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-forest-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-6 0c0 2.013-.175 3.988-.507 5.914M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-base text-forest-900">Individual PIN</h3>
                        <span className="text-xs font-semibold text-forest-700 bg-forest-100 px-2 py-0.5 rounded-full">Better security</span>
                      </div>
                      <p className="text-sm text-forest-600 mt-1">
                        Each member gets a unique PIN code, automatically generated and emailed when they pay. Codes are revoked on cancellation.
                      </p>
                      <p className="text-xs text-gray-400 mt-2 italic">
                        You&apos;ll need to program each member&apos;s code into your lock or keypad system yourself.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Smart Lock */}
                <div
                  onClick={() => setAccessType('smart_lock')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-150 ${
                    accessType === 'smart_lock'
                      ? 'border-forest-700 bg-forest-50 ring-1 ring-forest-700'
                      : 'border-warm-200 bg-white hover:border-forest-400'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-sage/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-forest-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-bold text-base text-forest-900">Smart Lock</h3>
                        <span className="text-xs font-semibold text-sage-dark bg-sage/20 px-2 py-0.5 rounded-full">Fully automated</span>
                      </div>
                      <p className="text-sm text-forest-600 mt-1">
                        Connect an igloohome smart lock. Access codes are created and revoked automatically — no manual lock management needed.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-semibold text-forest-700">igloohome supported</span>
                        <span className="text-xs text-gray-400">&middot; more lock brands coming soon</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* igloohome setup (only when smart_lock is selected) */}
              {accessType === 'smart_lock' && (
                <div className="mt-6 bg-white rounded-2xl border border-warm-200 p-6">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-display font-bold text-xs uppercase tracking-widest text-forest-600">igloohome Setup</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-forest-100 text-forest-800 border border-forest-200">Free</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-5">
                    Connect your igloohome smart lock to automatically generate time-bound access codes for members.
                  </p>

                  {/* igloohome step 0: Prerequisites */}
                  {igloohomeStep === 0 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-forest-800">Before you start, confirm:</p>
                        <ul className="space-y-1.5 text-sm text-gray-600">
                          {[
                            'Your igloohome lock is installed on the gym door',
                            'The lock is paired in the igloohome mobile app',
                            'You can unlock the door using the igloohome app',
                          ].map(item => (
                            <li key={item} className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-forest-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIgloohomeStep(1)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest-900 text-white rounded-xl font-semibold text-sm hover:bg-forest-800 transition-colors"
                      >
                        Connect igloohome lock
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* igloohome step 1: API credentials */}
                  {igloohomeStep === 1 && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-forest-50 border border-forest-200 rounded-xl">
                        <span className="text-xs font-bold text-forest-700 bg-forest-200 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <div>
                          <p className="text-sm font-semibold text-forest-800 mb-1">Get your igloohome API credentials</p>
                          <p className="text-sm text-forest-700 mb-3">
                            Create a free account at iglooaccess, then copy your Client ID and Client Secret from the API Access page.
                          </p>
                          <a
                            href="https://access.igloocompany.co/api-access"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 border border-forest-700 text-forest-800 rounded-lg text-sm font-semibold hover:bg-forest-100 transition-colors"
                          >
                            Open iglooaccess
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-semibold text-forest-800 mb-1.5">Client ID</label>
                          <input
                            type="text"
                            value={igloohomeClientId}
                            onChange={e => setIgloohomeClientId(e.target.value)}
                            placeholder="e.g. ddsieb9c44gtm7c7sxtfban7wp"
                            className="w-full px-4 py-3 rounded-xl border border-warm-200 text-forest-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent transition-all hover:border-forest-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-forest-800 mb-1.5">Client Secret</label>
                          <input
                            type="password"
                            value={igloohomeClientSecret}
                            onChange={e => setIgloohomeClientSecret(e.target.value)}
                            placeholder="Paste your Client Secret"
                            className="w-full px-4 py-3 rounded-xl border border-warm-200 text-forest-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent transition-all hover:border-forest-400"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIgloohomeStep(0)}
                          className="px-4 py-2.5 border border-warm-300 text-gray-600 rounded-xl text-sm font-semibold hover:bg-warm-50 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setIgloohomeStep(2)}
                          disabled={!igloohomeClientId.trim() || !igloohomeClientSecret.trim()}
                          className="px-5 py-2.5 bg-forest-900 text-white rounded-xl font-semibold text-sm hover:bg-forest-800 disabled:opacity-50 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}

                  {/* igloohome step 2: Lock ID */}
                  {igloohomeStep === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-forest-50 border border-forest-200 rounded-xl">
                        <span className="text-xs font-bold text-forest-700 bg-forest-200 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <div>
                          <p className="text-sm font-semibold text-forest-800 mb-1">Find your lock&apos;s Device ID</p>
                          <p className="text-sm text-forest-700">
                            Open the igloohome app &rarr; Devices &rarr; select your lock &rarr; Settings &rarr; Device Info. Copy the Bluetooth Device ID.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-forest-800 mb-1.5">Lock ID (Bluetooth Device ID)</label>
                        <input
                          type="text"
                          value={igloohomeLockId}
                          onChange={e => setIgloohomeLockId(e.target.value)}
                          placeholder="e.g. A1B2C3D4E5F6"
                          className="w-full px-4 py-3 rounded-xl border border-warm-200 text-forest-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent transition-all hover:border-forest-400"
                        />
                      </div>

                      {igloohomeError && <p className="text-xs text-red-600">{igloohomeError}</p>}

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => { setIgloohomeError(''); setIgloohomeStep(1); }}
                          className="px-4 py-2.5 border border-warm-300 text-gray-600 rounded-xl text-sm font-semibold hover:bg-warm-50 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await handleSaveIgloohome();
                            if (ok) setIgloohomeStep(3);
                          }}
                          disabled={!igloohomeLockId.trim() || igloohomeSaving}
                          className="px-5 py-2.5 bg-forest-900 text-white rounded-xl font-semibold text-sm hover:bg-forest-800 disabled:opacity-50 transition-colors"
                        >
                          {igloohomeSaving ? 'Saving…' : 'Save & verify'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* igloohome step 3: Connected */}
                  {igloohomeStep === 3 && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-4 bg-forest-50 border border-forest-200 rounded-xl">
                        <svg className="w-5 h-5 text-forest-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-forest-800">igloohome lock connected</p>
                          {igloohomeLockId && (
                            <p className="text-xs text-forest-600 mt-0.5 font-mono truncate">Lock ID: {igloohomeLockId}</p>
                          )}
                          <p className="text-xs text-forest-600 mt-0.5">Access codes will be generated automatically for active members.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIgloohomeStep(1)}
                        className="text-xs font-semibold text-forest-700 hover:text-forest-900 underline underline-offset-2 transition-colors"
                      >
                        Change credentials or lock ID
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 space-y-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-4 border border-warm-300 text-gray-600 rounded-xl font-display font-bold text-base hover:bg-warm-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={loading || (accessType === 'smart_lock' && igloohomeStep > 0 && igloohomeStep < 3)}
                    onClick={handleFinishSetup}
                    className="flex-1 py-4 px-8 bg-forest-900 text-white rounded-xl font-display font-bold text-base hover:bg-forest-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-forest-900/20"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2"><Spinner /> Finishing setup…</span>
                    ) : (
                      'Finish setup'
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Skip with defaults — just go to dashboard
                    const token = localStorage.getItem('token');
                    if (token) {
                      fetch(`${API_URL}/admin/settings`, {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ accessType: 'shared_pin' }),
                      }).finally(() => router.push('/admin/members'));
                    } else {
                      router.push('/admin/members');
                    }
                  }}
                  className="w-full text-center text-sm text-gray-500 hover:text-forest-700 transition-colors"
                >
                  Skip — I&apos;ll set this up later
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
