'use client';

import { useEffect, useState, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Member {
  member_id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  access_code: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-forest-100 text-forest-800',
  pending: 'bg-yellow-100 text-yellow-800',
  past_due: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-gray-100 text-gray-500',
  suspended: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadMembers = useCallback(async (q = '') => {
    const token = localStorage.getItem('token');
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : '';
      const res = await fetch(`${API_URL}/admin/members${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      setMembers(await res.json());
      setError('');
    } catch {
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const doAction = async (memberId: string, action: 'suspend' | 'cancel' | 'resend') => {
    const token = localStorage.getItem('token');
    setActionLoading(memberId + action);
    try {
      await fetch(`${API_URL}/admin/members/${memberId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadMembers(search);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-forest-900">Members</h1>
          <p className="text-gray-500 text-sm mt-0.5">{members.length} total</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadMembers(search)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent"
            />
          </div>
          <button
            onClick={() => loadMembers(search)}
            className="px-4 py-2 text-sm font-medium bg-forest-900 text-white rounded-xl hover:bg-forest-800 transition-colors"
          >
            Search
          </button>
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <div className="w-8 h-8 border-2 border-forest-900 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500">{error}</div>
        ) : members.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-forest-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">👥</div>
            <h3 className="font-display font-bold text-xl text-forest-900 mb-2">No members yet</h3>
            <p className="text-gray-500 text-sm">Share your gym&apos;s signup link to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-50 border-b border-warm-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Member</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Access Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Joined</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-50">
                {members.map(member => (
                  <tr key={member.member_id} className="hover:bg-warm-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium text-forest-900 text-sm">{member.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{member.email}</div>
                      {member.phone && <div className="text-xs text-gray-400">{member.phone}</div>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[member.status] || 'bg-gray-100 text-gray-600'}`}>
                        {member.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm text-forest-700 bg-forest-50 px-2 py-1 rounded">
                        {member.access_code || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {new Date(member.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => doAction(member.member_id, 'resend')}
                          disabled={actionLoading === member.member_id + 'resend'}
                          className="text-xs text-forest-700 hover:text-forest-900 font-medium hover:underline disabled:opacity-50"
                        >
                          Resend
                        </button>
                        {member.status === 'active' && (
                          <button
                            onClick={() => doAction(member.member_id, 'suspend')}
                            disabled={actionLoading === member.member_id + 'suspend'}
                            className="text-xs text-orange-600 hover:text-orange-800 font-medium hover:underline disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        )}
                        {member.status !== 'cancelled' && (
                          <button
                            onClick={() => doAction(member.member_id, 'cancel')}
                            disabled={actionLoading === member.member_id + 'cancel'}
                            className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
