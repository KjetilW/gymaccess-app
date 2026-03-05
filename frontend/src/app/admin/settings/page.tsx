'use client';

import { useEffect, useState, FormEvent } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface GymSettings {
  gym_id: string;
  name: string;
  location: string;
  membership_price: number;
  billing_interval: string;
  access_type: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<GymSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [price, setPrice] = useState('');
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [accessType, setAccessType] = useState('shared_pin');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/admin/gym`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setSettings(data);
        setPrice(String(data.membership_price || ''));
        setBillingInterval(data.billing_interval || 'monthly');
        setAccessType(data.access_type || 'shared_pin');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipPrice: Number(price),
          billingInterval,
          accessType,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-forest-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-forest-900">Settings</h1>
        {settings && (
          <p className="text-gray-500 text-sm mt-0.5">{settings.name} · {settings.location}</p>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-2xl border border-warm-200 p-6 space-y-5">
          <h2 className="font-display font-bold text-xs uppercase tracking-widest text-forest-600">Membership</h2>

          <div>
            <label className="block text-sm font-semibold text-forest-800 mb-1.5">Membership price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400 text-sm select-none">NOK</span>
              <input
                type="number"
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full pl-14 pr-4 py-3 rounded-xl border border-warm-200 text-forest-900 focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent transition-all hover:border-forest-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-forest-800 mb-2.5">Billing frequency</label>
            <div className="grid grid-cols-2 gap-3">
              {(['monthly', 'yearly'] as const).map(interval => (
                <label
                  key={interval}
                  className={`flex items-center justify-center py-3 px-4 rounded-xl border cursor-pointer font-semibold text-sm transition-all duration-150 ${
                    billingInterval === interval
                      ? 'bg-forest-900 border-forest-900 text-white'
                      : 'bg-white border-warm-200 text-forest-700 hover:border-forest-400'
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
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-forest-800 mb-2.5">Access control method</label>
            <div className="space-y-2">
              {[
                { value: 'shared_pin', label: 'Shared PIN', desc: 'One PIN for all active members.' },
                { value: 'individual_pin', label: 'Individual PIN', desc: 'Unique PIN per member.' },
                { value: 'smart_lock', label: 'Smart Lock', desc: 'Igloohome or Seam integration.' },
              ].map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    accessType === value
                      ? 'border-forest-700 bg-forest-50 ring-1 ring-forest-700'
                      : 'border-warm-200 bg-white hover:border-forest-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="accessType"
                    value={value}
                    checked={accessType === value}
                    onChange={() => setAccessType(value)}
                    className="mt-1 accent-forest-700"
                  />
                  <div>
                    <div className="font-semibold text-forest-900 text-sm">{label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-forest-900 text-white rounded-xl font-display font-bold hover:bg-forest-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {saved && <p className="text-sm text-forest-700 font-medium">✓ Settings saved</p>}
        </div>
      </form>
    </div>
  );
}
