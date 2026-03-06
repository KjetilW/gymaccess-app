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

  // Notification templates state
  const [templates, setTemplates] = useState<NotificationTemplate[]>(DEFAULT_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savedTemplate, setSavedTemplate] = useState(false);
  const [templateError, setTemplateError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    Promise.all([
      fetch(`${API_URL}/admin/gym`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/admin/notification-templates`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([gymData, templateData]) => {
      setSettings(gymData);
      setPrice(String(gymData.membership_price || ''));
      setBillingInterval(gymData.billing_interval || 'monthly');
      setAccessType(gymData.access_type || 'shared_pin');

      if (Array.isArray(templateData) && templateData.length > 0) {
        // Merge saved templates with defaults
        const merged = DEFAULT_TEMPLATES.map(def => {
          const saved = templateData.find((t: NotificationTemplate) => t.type === def.type);
          return saved || def;
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

      {/* Notification Templates */}
      <div className="mt-8">
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
