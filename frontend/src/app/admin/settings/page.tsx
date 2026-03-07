'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface GymSettings {
  gym_id: string;
  name: string;
  location: string;
  membership_price: number;
  billing_interval: string;
  access_type: string;
  stripe_connect_account_id: string | null;
  stripe_connect_status: string;
  saas_status: string;
  saas_subscription_id: string | null;
  saas_stripe_customer_id: string | null;
  trial_ends_at: string | null;
  seam_connected_account_id: string | null;
  seam_device_id: string | null;
  seam_tier: string;
  igloohome_lock_id: string | null;
  igloohome_client_id: string | null;
  igloohome_configured: boolean;
}

interface SeamDevice {
  device_id: string;
  display_name: string;
  device_type: string;
}

interface NotificationTemplate {
  type: string;
  subject: string;
  body: string;
}

const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    type: 'welcome',
    subject: 'Welcome to {gym_name}!',
    body: 'Hi {name},\n\nWelcome to {gym_name}! Your membership is now active.\n\nYour access code: {access_code}\n\nBest regards,\n{gym_name}',
  },
  {
    type: 'payment_receipt',
    subject: 'Payment received – {gym_name}',
    body: 'Hi {name},\n\nThank you for your payment of {amount}. Your membership at {gym_name} is active.\n\nBest regards,\n{gym_name}',
  },
  {
    type: 'payment_failed',
    subject: 'Payment issue – {gym_name}',
    body: 'Hi {name},\n\nWe had trouble processing your payment for {gym_name}. Please update your payment method to keep your access.\n\nBest regards,\n{gym_name}',
  },
  {
    type: 'cancellation',
    subject: 'Membership cancelled – {gym_name}',
    body: 'Hi {name},\n\nYour membership at {gym_name} has been cancelled. Your access code has been deactivated.\n\nBest regards,\n{gym_name}',
  },
];

const TEMPLATE_LABELS: Record<string, string> = {
  welcome: 'Welcome email',
  payment_receipt: 'Payment receipt',
  payment_failed: 'Payment failed reminder',
  cancellation: 'Cancellation notice',
};

function ConnectStatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-forest-100 text-forest-800">
        <span className="w-2 h-2 rounded-full bg-forest-600 inline-block" />
        Connected
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
        <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
      Not Connected
    </span>
  );
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [settings, setSettings] = useState<GymSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [price, setPrice] = useState('');
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [accessType, setAccessType] = useState('shared_pin');

  // Notification templates state
  const [templates, setTemplates] = useState<NotificationTemplate[]>(DEFAULT_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savedTemplate, setSavedTemplate] = useState(false);
  const [templateError, setTemplateError] = useState('');

  // Stripe Connect state
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState('');

  // SaaS checkout state
  const [saasLoading, setSaasLoading] = useState(false);
  const [saasError, setSaasError] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);

  // igloohome Direct state
  const [igloohomeLockId, setIgloohomeLockId] = useState('');
  const [igloohomeClientId, setIgloohomeClientId] = useState('');
  const [igloohomeClientSecret, setIgloohomeClientSecret] = useState('');
  // 0=disconnected, 1=enter credentials, 2=enter lock ID, 3=connected
  const [igloohomeStep, setIgloohomeStep] = useState(0);
  const [igloohomeLockSaving, setIgloohomeLockSaving] = useState(false);
  const [igloohomeLockError, setIgloohomeLockError] = useState('');

  // Seam state
  const [seamConnected, setSeamConnected] = useState(false);
  const [seamDeviceId, setSeamDeviceId] = useState<string | null>(null);
  const [seamDevices, setSeamDevices] = useState<SeamDevice[]>([]);
  const [igloohomeLoading, setIgloohomeLoading] = useState(false);
  const [igloohomeError, setIgloohomeError] = useState('');
  const [igloohomeSaved, setIgloohomeSaved] = useState(false);
  const [seamAddonLoading, setSeamAddonLoading] = useState(false);
  const [seamAddonError, setSeamAddonError] = useState('');

  const fetchDevices = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/igloohome/devices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSeamDevices(data.devices || []);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');

    // Check if returning from Seam Connect Webview (real Seam uses connect_webview_id, mock uses seam_webview_id)
    const webviewId = searchParams.get('connect_webview_id') || searchParams.get('seam_webview_id');
    if (webviewId) {
      // Check status and save connected_account_id
      fetch(`${API_URL}/admin/igloohome/status?connect_webview_id=${webviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).then(data => {
        if (data.status === 'authorized') {
          setSeamConnected(true);
          fetchDevices(token!);
        }
      }).catch(() => {});
      // Clean up URL
      router.replace('/admin/settings');
    }

    Promise.all([
      fetch(`${API_URL}/admin/gym`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/admin/notification-templates`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([gymData, templateData]) => {
      setSettings(gymData);
      setPrice(String(gymData.membership_price || ''));
      setBillingInterval(gymData.billing_interval || 'monthly');
      setAccessType(gymData.access_type || 'shared_pin');

      // igloohome Direct state
      setIgloohomeLockId(gymData.igloohome_lock_id || '');
      setIgloohomeClientId(gymData.igloohome_client_id || '');
      // Set starting step based on what's already configured
      if (gymData.igloohome_configured && gymData.igloohome_lock_id) {
        setIgloohomeStep(3); // fully connected
      } else if (gymData.igloohome_configured) {
        setIgloohomeStep(2); // have creds, need lock ID
      } else {
        setIgloohomeStep(0); // nothing configured yet
      }

      // Seam state from gym data
      const connected = !!(gymData.seam_connected_account_id && !gymData.seam_connected_account_id.startsWith('pending:'));
      setSeamConnected(connected);
      setSeamDeviceId(gymData.seam_device_id || null);
      if (connected) fetchDevices(token!);

      if (Array.isArray(templateData) && templateData.length > 0) {
        const merged = DEFAULT_TEMPLATES.map(def => {
          const savedTmpl = templateData.find((t: NotificationTemplate) => t.type === def.type);
          return savedTmpl || def;
        });
        setTemplates(merged);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
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

  const startEditTemplate = (tmpl: NotificationTemplate) => {
    setEditingTemplate(tmpl.type);
    setTemplateSubject(tmpl.subject);
    setTemplateBody(tmpl.body);
    setSavedTemplate(false);
    setTemplateError('');
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    const token = localStorage.getItem('token');
    setSavingTemplate(true);
    setTemplateError('');
    setSavedTemplate(false);
    try {
      const res = await fetch(`${API_URL}/admin/notification-templates/${editingTemplate}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: templateSubject, body: templateBody }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setTemplates(prev => prev.map(t =>
        t.type === editingTemplate ? { ...t, subject: templateSubject, body: templateBody } : t
      ));
      setSavedTemplate(true);
      setTimeout(() => {
        setSavedTemplate(false);
        setEditingTemplate(null);
      }, 1500);
    } catch {
      setTemplateError('Failed to save template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleStripeConnect = async () => {
    setConnectLoading(true);
    setConnectError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/admin/stripe/connect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect');
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setConnectError(err.message || 'Failed to start Stripe Connect setup.');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleSaasCheckout = async (plan: 'monthly' | 'yearly') => {
    setSaasLoading(true);
    setSaasError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/admin/saas/checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout');
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setSaasError(err.message || 'Failed to start subscription checkout.');
    } finally {
      setSaasLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setSaasError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/admin/saas/portal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to open portal');
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setSaasError(err.message || 'Failed to open subscription management.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleIgloohomeConnect = async () => {
    setIgloohomeLoading(true);
    setIgloohomeError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/admin/igloohome/connect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect');
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setIgloohomeError(err.message || 'Failed to start igloohome connection.');
    } finally {
      setIgloohomeLoading(false);
    }
  };

  const handleIgloohomeDisconnect = async () => {
    setIgloohomeLoading(true);
    setIgloohomeError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/admin/igloohome/connect`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      setSeamConnected(false);
      setSeamDeviceId(null);
      setSeamDevices([]);
    } catch (err: any) {
      setIgloohomeError(err.message || 'Failed to disconnect.');
    } finally {
      setIgloohomeLoading(false);
    }
  };

  const handleSaveDevice = async (deviceId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/admin/settings/igloohome`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      });
      if (!res.ok) throw new Error('Failed to save device');
      setSeamDeviceId(deviceId);
      setIgloohomeSaved(true);
      setTimeout(() => setIgloohomeSaved(false), 2000);
    } catch (err: any) {
      setIgloohomeError(err.message || 'Failed to save device selection.');
    }
  };

  const handleSaveIgloohomeLockId = async (): Promise<boolean> => {
    setIgloohomeLockSaving(true);
    setIgloohomeLockError('');
    try {
      const token = localStorage.getItem('token');
      const body: Record<string, string> = {
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
        setIgloohomeLockError(data.error || 'Failed to save settings');
        return false;
      }
      await res.json();
      return true;
    } catch {
      setIgloohomeLockError('Network error. Please try again.');
      return false;
    } finally {
      setIgloohomeLockSaving(false);
    }
  };

  const handleSeamAddonCheckout = async () => {
    setSeamAddonLoading(true);
    setSeamAddonError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/admin/saas/seam-addon`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout');
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setSeamAddonError(err.message || 'Failed to start Seam add-on checkout.');
    } finally {
      setSeamAddonLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-forest-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const connectStatus = settings?.stripe_connect_status || 'not_connected';
  const connectAccountId = settings?.stripe_connect_account_id;
  const saasStatus = settings?.saas_status || 'trial';
  const trialEndsAt = settings?.trial_ends_at;
  const trialDaysLeft = trialEndsAt ? daysUntil(trialEndsAt) : null;
  const trialExpired = trialDaysLeft !== null && trialDaysLeft <= 0;

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

      {/* Stripe Connect Section */}
      <div className="mt-8">
        <div className="bg-white rounded-2xl border border-warm-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xs uppercase tracking-widest text-forest-600">Stripe Connect</h2>
            <ConnectStatusBadge status={connectStatus} />
          </div>

          <p className="text-sm text-gray-500 mb-5">
            Connect your Stripe account to receive member payments directly. GymAccess uses Stripe Connect to route member subscription payments to your gym's bank account.
          </p>

          {connectStatus === 'not_connected' && (
            <>
              <button
                type="button"
                onClick={handleStripeConnect}
                disabled={connectLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#635BFF] text-white rounded-xl font-semibold text-sm hover:bg-[#5248d4] disabled:opacity-50 transition-colors"
              >
                {connectLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                  </svg>
                )}
                Connect with Stripe
              </button>
              {connectError && <p className="mt-2 text-xs text-red-600">{connectError}</p>}
            </>
          )}

          {connectStatus === 'pending' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <svg className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-yellow-800">Pending — complete your Stripe onboarding to start accepting member payments.</p>
              </div>
              <button
                type="button"
                onClick={handleStripeConnect}
                disabled={connectLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#635BFF] text-white rounded-xl font-semibold text-sm hover:bg-[#5248d4] disabled:opacity-50 transition-colors"
              >
                {connectLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                Continue Stripe Onboarding
              </button>
              {connectError && <p className="mt-2 text-xs text-red-600">{connectError}</p>}
            </div>
          )}

          {connectStatus === 'active' && (
            <div className="flex items-start gap-3 p-3 bg-forest-50 border border-forest-200 rounded-xl">
              <svg className="w-4 h-4 text-forest-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-forest-800">Stripe account connected</p>
                {connectAccountId && (
                  <p className="text-xs text-forest-600 mt-0.5 font-mono">
                    {connectAccountId.slice(0, 8)}…{connectAccountId.slice(-4)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* igloohome Direct — Free */}
      <div className="mt-6">
        <div className="bg-white rounded-2xl border border-warm-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display font-bold text-xs uppercase tracking-widest text-forest-600">Smart Lock — igloohome Direct</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-forest-100 text-forest-800 border border-forest-200">Free</span>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            Connect your igloohome smart lock to automatically generate time-bound access codes for members.
          </p>

          {/* Step 0: Disconnected — prerequisites + CTA */}
          {igloohomeStep === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-forest-800">Before you start, confirm:</p>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  {[
                    'Your igloohome lock is installed on the gym door',
                    'The lock is paired in the igloohome mobile app',
                    'You can unlock the door using the igloohome app',
                  ].map((item) => (
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

          {/* Step 1: Enter API credentials */}
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
                    placeholder={settings?.igloohome_configured && !igloohomeClientSecret ? 'Leave blank to keep existing secret' : 'Paste your Client Secret'}
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
                  disabled={!igloohomeClientId.trim() || (!settings?.igloohome_configured && !igloohomeClientSecret.trim())}
                  className="px-5 py-2.5 bg-forest-900 text-white rounded-xl font-semibold text-sm hover:bg-forest-800 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Enter lock ID and save */}
          {igloohomeStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-forest-50 border border-forest-200 rounded-xl">
                <span className="text-xs font-bold text-forest-700 bg-forest-200 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <p className="text-sm font-semibold text-forest-800 mb-1">Find your lock&apos;s Device ID</p>
                  <p className="text-sm text-forest-700">
                    Open the igloohome app → Devices → select your lock → Settings → Device Info. Copy the Bluetooth Device ID.
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

              {igloohomeLockError && <p className="text-xs text-red-600">{igloohomeLockError}</p>}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIgloohomeStep(1)}
                  className="px-4 py-2.5 border border-warm-300 text-gray-600 rounded-xl text-sm font-semibold hover:bg-warm-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await handleSaveIgloohomeLockId();
                    if (ok) setIgloohomeStep(3);
                  }}
                  disabled={!igloohomeLockId.trim() || igloohomeLockSaving}
                  className="px-5 py-2.5 bg-forest-900 text-white rounded-xl font-semibold text-sm hover:bg-forest-800 disabled:opacity-50 transition-colors"
                >
                  {igloohomeLockSaving ? 'Saving…' : 'Save & finish'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Connected summary */}
          {igloohomeStep === 3 && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-forest-50 border border-forest-200 rounded-xl">
                <svg className="w-5 h-5 text-forest-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-forest-800">igloohome lock connected</p>
                  {igloohomeLockId && (
                    <p className="text-xs text-forest-600 mt-0.5 font-mono truncate">
                      Lock ID: {igloohomeLockId}
                    </p>
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
      </div>

      {/* Smart Lock via Seam — Premium */}
      <div className="mt-6">
        <div className={`bg-white rounded-2xl border p-6 ${settings?.seam_tier === 'active' ? 'border-warm-200' : 'border-warm-200 opacity-90'}`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display font-bold text-xs uppercase tracking-widest text-forest-600">Smart Lock via Seam</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Premium</span>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            Connect your igloohome account via Seam for advanced multi-device management and automatic device discovery.
          </p>

          {settings?.seam_tier !== 'active' ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-amber-800">Seam add-on not active</p>
                  <p className="text-xs text-amber-700 mt-0.5">Upgrade to unlock automatic igloohome device discovery and multi-lock management via Seam.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSeamAddonCheckout}
                  disabled={seamAddonLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-semibold text-sm hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {seamAddonLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  Upgrade — NOK 149/month
                </button>
              </div>
              {seamAddonError && <p className="text-xs text-red-600">{seamAddonError}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-forest-100 text-forest-800">
                  <span className="w-2 h-2 rounded-full bg-forest-600 inline-block" />
                  Seam add-on active
                </span>
              </div>

              {!seamConnected ? (
                <>
                  <p className="text-sm text-gray-500">Connect your igloohome account via Seam to enable automatic device discovery.</p>
                  <button
                    type="button"
                    onClick={handleIgloohomeConnect}
                    disabled={igloohomeLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest-900 text-white rounded-xl font-semibold text-sm hover:bg-forest-800 disabled:opacity-50 transition-colors"
                  >
                    {igloohomeLoading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )}
                    Connect igloohome Account
                  </button>
                  {igloohomeError && <p className="mt-2 text-xs text-red-600">{igloohomeError}</p>}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-forest-50 border border-forest-200 rounded-xl">
                    <svg className="w-4 h-4 text-forest-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs font-semibold text-forest-800">igloohome account linked via Seam</p>
                  </div>

                  {seamDevices.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-forest-800 mb-2">Select keybox device</label>
                      <div className="flex items-center gap-3">
                        <select
                          value={seamDeviceId || ''}
                          onChange={e => handleSaveDevice(e.target.value)}
                          className="flex-1 px-3 py-2.5 rounded-xl border border-warm-200 text-forest-900 text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent"
                        >
                          <option value="">Select a device…</option>
                          {seamDevices.map(d => (
                            <option key={d.device_id} value={d.device_id}>{d.display_name}</option>
                          ))}
                        </select>
                        {igloohomeSaved && <span className="text-xs text-forest-700 font-medium whitespace-nowrap">✓ Saved</span>}
                      </div>
                      {seamDeviceId && (
                        <p className="mt-1.5 text-xs text-gray-400 font-mono truncate">{seamDeviceId}</p>
                      )}
                    </div>
                  )}

                  {igloohomeError && <p className="text-xs text-red-600">{igloohomeError}</p>}

                  <button
                    type="button"
                    onClick={handleIgloohomeDisconnect}
                    disabled={igloohomeLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    {igloohomeLoading ? (
                      <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Plan & Billing Section */}
      <div className="mt-6">
        <div className="bg-white rounded-2xl border border-warm-200 p-6">
          <h2 className="font-display font-bold text-xs uppercase tracking-widest text-forest-600 mb-4">Plan &amp; Billing</h2>

          {saasStatus === 'trial' && (
            <div className="space-y-4">
              {trialDaysLeft !== null && !trialExpired && (
                <div className="flex items-center gap-3 p-4 bg-forest-50 border border-forest-200 rounded-xl">
                  <div className="text-center min-w-[3.5rem]">
                    <div className="font-display font-bold text-2xl text-forest-900">{trialDaysLeft}</div>
                    <div className="text-xs text-forest-600">days left</div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-forest-800">Free trial active</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Trial expires {trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                    </p>
                  </div>
                </div>
              )}

              {trialExpired && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-red-800 font-medium">Your free trial has expired. Subscribe to continue using GymAccess.</p>
                </div>
              )}

              <p className="text-sm text-gray-600">Subscribe to GymAccess to continue managing your gym after the trial.</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-warm-200 rounded-xl p-4">
                  <div className="font-display font-bold text-xl text-forest-900">NOK 299</div>
                  <div className="text-xs text-gray-500 mb-3">/month</div>
                  <button
                    type="button"
                    onClick={() => handleSaasCheckout('monthly')}
                    disabled={saasLoading}
                    className="w-full py-2 bg-forest-900 text-white rounded-lg text-sm font-semibold hover:bg-forest-800 disabled:opacity-50 transition-colors"
                  >
                    {saasLoading ? 'Loading…' : 'Subscribe monthly'}
                  </button>
                </div>
                <div className="border border-forest-700 rounded-xl p-4 ring-1 ring-forest-700 relative">
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="bg-forest-700 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">Save 31%</span>
                  </div>
                  <div className="font-display font-bold text-xl text-forest-900">NOK 2,490</div>
                  <div className="text-xs text-gray-500 mb-3">/year</div>
                  <button
                    type="button"
                    onClick={() => handleSaasCheckout('yearly')}
                    disabled={saasLoading}
                    className="w-full py-2 bg-forest-900 text-white rounded-lg text-sm font-semibold hover:bg-forest-800 disabled:opacity-50 transition-colors"
                  >
                    {saasLoading ? 'Loading…' : 'Subscribe yearly'}
                  </button>
                </div>
              </div>
              {saasError && <p className="text-xs text-red-600">{saasError}</p>}
            </div>
          )}

          {saasStatus === 'active' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-forest-50 border border-forest-200 rounded-xl">
                <svg className="w-5 h-5 text-forest-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-forest-800">GymAccess subscription active</p>
                  <p className="text-xs text-gray-500 mt-0.5">Your gym is on an active plan.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="px-5 py-2.5 border border-forest-700 text-forest-800 rounded-xl text-sm font-semibold hover:bg-forest-50 disabled:opacity-50 transition-colors"
              >
                {portalLoading ? 'Opening…' : 'Manage Subscription'}
              </button>
              {saasError && <p className="text-xs text-red-600">{saasError}</p>}
            </div>
          )}

          {saasStatus === 'past_due' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <svg className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-orange-800">Payment issue with your GymAccess subscription</p>
                  <p className="text-xs text-orange-700 mt-0.5">Please update your payment method to avoid service interruption.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {portalLoading ? 'Opening…' : 'Update Payment Method'}
              </button>
              {saasError && <p className="text-xs text-red-600">{saasError}</p>}
            </div>
          )}

          {saasStatus === 'cancelled' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <svg className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <p className="text-sm text-gray-700">Your GymAccess subscription has been cancelled. Re-subscribe to continue using the platform.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSaasCheckout('monthly')}
                  disabled={saasLoading}
                  className="py-2.5 border border-forest-700 text-forest-800 rounded-xl text-sm font-semibold hover:bg-forest-50 disabled:opacity-50 transition-colors"
                >
                  Monthly — NOK 299
                </button>
                <button
                  type="button"
                  onClick={() => handleSaasCheckout('yearly')}
                  disabled={saasLoading}
                  className="py-2.5 bg-forest-900 text-white rounded-xl text-sm font-semibold hover:bg-forest-800 disabled:opacity-50 transition-colors"
                >
                  Yearly — NOK 2,490
                </button>
              </div>
              {saasError && <p className="text-xs text-red-600">{saasError}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Notification Templates */}
      <div className="mt-6">
        <div className="bg-white rounded-2xl border border-warm-200 p-6">
          <h2 className="font-display font-bold text-xs uppercase tracking-widest text-forest-600 mb-5">Notification Templates</h2>
          <p className="text-xs text-gray-500 mb-4">
            Customize the emails sent to members. Use <code className="bg-warm-100 px-1 rounded">{'{name}'}</code>, <code className="bg-warm-100 px-1 rounded">{'{gym_name}'}</code>, <code className="bg-warm-100 px-1 rounded">{'{access_code}'}</code>, <code className="bg-warm-100 px-1 rounded">{'{amount}'}</code> as placeholders.
          </p>
          <div className="space-y-3">
            {templates.map(tmpl => (
              <div key={tmpl.type} className="border border-warm-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-warm-50">
                  <span className="font-semibold text-sm text-forest-800">{TEMPLATE_LABELS[tmpl.type] || tmpl.type}</span>
                  <button
                    type="button"
                    onClick={() => startEditTemplate(tmpl)}
                    className="text-xs font-semibold text-forest-700 hover:text-forest-900 transition-colors px-2 py-1 rounded hover:bg-warm-200"
                  >
                    Edit
                  </button>
                </div>

                {editingTemplate === tmpl.type ? (
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-forest-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={templateSubject}
                        onChange={e => setTemplateSubject(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-warm-200 text-forest-900 focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-forest-700 mb-1">Body</label>
                      <textarea
                        value={templateBody}
                        onChange={e => setTemplateBody(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-warm-200 text-forest-900 focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent font-mono"
                      />
                    </div>
                    {templateError && <p className="text-xs text-red-600">{templateError}</p>}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSaveTemplate}
                        disabled={savingTemplate}
                        className="px-4 py-2 text-sm bg-forest-900 text-white rounded-lg font-semibold hover:bg-forest-800 disabled:opacity-50 transition-colors"
                      >
                        {savingTemplate ? 'Saving…' : 'Save template'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTemplate(null)}
                        className="px-4 py-2 text-sm text-forest-700 rounded-lg hover:bg-warm-100 transition-colors"
                      >
                        Cancel
                      </button>
                      {savedTemplate && <span className="text-xs text-forest-700 font-medium">✓ Saved</span>}
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-500 truncate">{tmpl.subject}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
