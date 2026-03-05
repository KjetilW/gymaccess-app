'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface PaymentStats {
  monthlyRevenue: number;
  activeSubscriptions: number;
  failedPayments: number;
  cancelledSubscriptions: number;
}

export default function PaymentsPage() {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/admin/payments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const StatCard = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) => (
    <div className="bg-white rounded-2xl border border-warm-200 p-6">
      <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
      <p className={`font-display font-bold text-3xl ${color || 'text-forest-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-forest-900">Payments</h1>
        <p className="text-gray-500 text-sm mt-0.5">Revenue and subscription overview</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-forest-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Monthly Revenue"
            value={`NOK ${stats.monthlyRevenue.toLocaleString()}`}
            sub="Based on active subscriptions"
          />
          <StatCard
            label="Active Subscriptions"
            value={stats.activeSubscriptions}
            sub="Currently paying members"
            color="text-forest-700"
          />
          <StatCard
            label="Failed Payments"
            value={stats.failedPayments}
            sub="Past due members"
            color={stats.failedPayments > 0 ? 'text-orange-600' : 'text-forest-900'}
          />
          <StatCard
            label="Cancelled"
            value={stats.cancelledSubscriptions}
            sub="Cancelled subscriptions"
            color="text-gray-500"
          />
        </div>
      ) : (
        <p className="text-gray-500">Failed to load payment data.</p>
      )}

      <div className="mt-8 bg-white rounded-2xl border border-warm-200 p-6">
        <h2 className="font-display font-semibold text-lg text-forest-900 mb-2">Stripe Integration</h2>
        <p className="text-gray-500 text-sm">
          Payment processing is handled via Stripe. Configure your Stripe API keys in the environment settings to enable live payments.
          Webhooks at <code className="bg-warm-100 px-1.5 py-0.5 rounded text-forest-800 text-xs">/webhooks/stripe</code> handle subscription lifecycle events automatically.
        </p>
      </div>
    </div>
  );
}
