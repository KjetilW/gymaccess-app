'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface MemberDetail {
  member_id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  access_code: string | null;
  access_source: string | null;
  provider_code_id: string | null;
  subscription_end_date: string | null;
  igloohome_configured: boolean;
  created_at: string;
  updated_at: string;
  provider: string | null;
  provider_subscription_id: string | null;
  start_date: string | null;
  subscription_status: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-forest-100 text-forest-800',
  pending: 'bg-yellow-100 text-yellow-800',
  past_due: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-gray-100 text-gray-500',
  suspended: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
};

export default function MemberDetailPage() {
  const params = useParams<{ memberId: string }>();
  const memberId = params?.memberId;
  const router = useRouter();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [pinCopied, setPinCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenMsg, setRegenMsg] = useState('');

  const loadMember = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/admin/members/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Not found');
      setMember(await res.json());
    } catch {
      setError('Member not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMember(); }, [memberId]);

  const doAction = async (action: 'suspend' | 'cancel' | 'resend') => {
    const token = localStorage.getItem('token');
    setActionLoading(action);
    setActionMsg('');
    try {
      await fetch(`${API_URL}/admin/members/${memberId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setActionMsg(action === 'resend' ? 'Access info resent.' : `Member ${action}led.`);
      await loadMember();
    } catch {
      setActionMsg('Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyPin = async () => {
    if (!member?.access_code) return;
    try {
      await navigator.clipboard.writeText(member.access_code);
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleRegeneratePin = async () => {
    const token = localStorage.getItem('token');
    setRegenerating(true);
    setRegenMsg('');
    try {
      const res = await fetch(`${API_URL}/admin/members/${memberId}/igloohome/regenerate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to regenerate');
      setRegenMsg('PIN regenerated successfully.');
      await loadMember();
    } catch (err: any) {
      setRegenMsg(err.message || 'Failed to regenerate PIN.');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-forest-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 text-center py-24">
        <p className="text-forest-900 font-display font-bold text-xl mb-2">Member not found</p>
        <Link href="/admin/members" className="text-sm text-forest-700 hover:underline">← Back to members</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Link href="/admin/members" className="text-sm text-gray-500 hover:text-forest-700 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Members
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-forest-900">{member.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Member since {new Date(member.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold capitalize ${STATUS_STYLES[member.status] || 'bg-gray-100 text-gray-600'}`}>
          {member.status.replace('_', ' ')}
        </span>
      </div>

      {/* Contact info */}
      <div className="bg-white rounded-2xl border border-warm-200 p-6 mb-4">
        <h2 className="font-display font-semibold text-base text-forest-900 mb-4">Contact Information</h2>
        <dl className="space-y-3">
          <div className="flex gap-4">
            <dt className="w-28 text-xs font-semibold uppercase tracking-wider text-gray-400 pt-0.5">Email</dt>
            <dd className="text-sm text-forest-900">{member.email}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-28 text-xs font-semibold uppercase tracking-wider text-gray-400 pt-0.5">Phone</dt>
            <dd className="text-sm text-forest-900">{member.phone || <span className="text-gray-400">—</span>}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-28 text-xs font-semibold uppercase tracking-wider text-gray-400 pt-0.5">Access Code</dt>
            <dd>
              {member.access_code
                ? <span className="font-mono text-sm text-forest-700 bg-forest-50 px-2 py-1 rounded">{member.access_code}</span>
                : <span className="text-gray-400 text-sm">—</span>
              }
            </dd>
          </div>
        </dl>
      </div>

      {/* Subscription */}
      <div className="bg-white rounded-2xl border border-warm-200 p-6 mb-4">
        <h2 className="font-display font-semibold text-base text-forest-900 mb-4">Subscription</h2>
        <dl className="space-y-3">
          <div className="flex gap-4">
            <dt className="w-28 text-xs font-semibold uppercase tracking-wider text-gray-400 pt-0.5">Status</dt>
            <dd className="text-sm text-forest-900 capitalize">{member.subscription_status || <span className="text-gray-400">No subscription</span>}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-28 text-xs font-semibold uppercase tracking-wider text-gray-400 pt-0.5">Provider</dt>
            <dd className="text-sm text-forest-900 capitalize">{member.provider || <span className="text-gray-400">—</span>}</dd>
          </div>
          {member.start_date && (
            <div className="flex gap-4">
              <dt className="w-28 text-xs font-semibold uppercase tracking-wider text-gray-400 pt-0.5">Started</dt>
              <dd className="text-sm text-forest-900">{new Date(member.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
            </div>
          )}
          {member.provider_subscription_id && (
            <div className="flex gap-4">
              <dt className="w-28 text-xs font-semibold uppercase tracking-wider text-gray-400 pt-0.5">Stripe ID</dt>
              <dd className="text-sm font-mono text-gray-500">{member.provider_subscription_id}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* igloohome algoPIN — only shown when igloohome is configured for this gym */}
      {member.igloohome_configured && (
        <div className="bg-white rounded-2xl border border-warm-200 p-6 mb-4">
          <h2 className="font-display font-semibold text-base text-forest-900 mb-4">igloohome algoPIN</h2>

          {member.access_source === 'igloohome' && member.access_code ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-forest-50 border border-forest-200 rounded-xl">
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-forest-600 mb-1">Current PIN</div>
                  <div className="font-mono text-2xl font-bold text-forest-900 tracking-widest">{member.access_code}</div>
                  {member.subscription_end_date && (
                    <div className="text-xs text-gray-400 mt-1">
                      Valid until {new Date(member.subscription_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleCopyPin}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-forest-300 text-forest-700 rounded-lg hover:bg-forest-100 transition-colors"
                >
                  {pinCopied ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy PIN
                    </>
                  )}
                </button>
              </div>

              {regenMsg && (
                <p className="text-xs text-forest-700 bg-forest-50 border border-forest-200 rounded-lg px-3 py-2">{regenMsg}</p>
              )}

              <button
                onClick={handleRegeneratePin}
                disabled={regenerating}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-warm-200 rounded-xl text-forest-700 hover:bg-forest-50 disabled:opacity-50 transition-colors"
              >
                {regenerating ? (
                  <span className="w-4 h-4 border-2 border-forest-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Regenerate PIN
              </button>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-800">
                {member.status !== 'active'
                  ? 'Member is not active — no igloohome PIN is assigned.'
                  : 'PIN generation failed or is pending. Try regenerating.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-warm-200 p-6">
        <h2 className="font-display font-semibold text-base text-forest-900 mb-4">Actions</h2>
        {actionMsg && (
          <p className="text-sm text-forest-700 bg-forest-50 border border-forest-200 rounded-xl px-4 py-2 mb-4">{actionMsg}</p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => doAction('resend')}
            disabled={!!actionLoading}
            className="px-4 py-2 text-sm font-medium border border-warm-200 rounded-xl text-forest-700 hover:bg-forest-50 disabled:opacity-50 transition-colors"
          >
            {actionLoading === 'resend' ? 'Sending…' : 'Resend Access Info'}
          </button>
          {member.status === 'active' && (
            <button
              onClick={() => doAction('suspend')}
              disabled={!!actionLoading}
              className="px-4 py-2 text-sm font-medium border border-orange-200 rounded-xl text-orange-600 hover:bg-orange-50 disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'suspend' ? 'Suspending…' : 'Suspend Member'}
            </button>
          )}
          {member.status !== 'cancelled' && (
            <button
              onClick={() => doAction('cancel')}
              disabled={!!actionLoading}
              className="px-4 py-2 text-sm font-medium border border-red-200 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel Membership'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
