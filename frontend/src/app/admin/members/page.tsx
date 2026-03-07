'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

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

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-forest-100 text-forest-800',
  pending: 'bg-yellow-100 text-yellow-800',
  past_due: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-gray-100 text-gray-500',
  suspended: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
};

interface ConfirmModal {
  memberId: string;
  memberName: string;
  action: 'suspend' | 'cancel';
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);
  const [resendMsg, setResendMsg] = useState<{ memberId: string; text: string; isError: boolean } | null>(null);
  const [gymId, setGymId] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('gymId') || '';
    setGymId(id);
  }, []);

  const loadMembers = useCallback(async (q = '', status = '', page = 1) => {
    const token = localStorage.getItem('token');
    try {
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      if (status) params.set('status', status);
      params.set('page', String(page));
      params.set('limit', '50');
      const res = await fetch(`${API_URL}/admin/members?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setMembers(data.members);
      setPagination(data.pagination);
      setError('');
    } catch {
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(search, statusFilter, currentPage); }, [loadMembers, search, statusFilter, currentPage]);

  const handleStatusFilter = (status: string) => {
    const next = statusFilter === status ? '' : status;
    setStatusFilter(next);
    setCurrentPage(1);
    loadMembers(search, next, 1);
  };

  const doAction = async (memberId: string, action: 'suspend' | 'cancel' | 'resend') => {
    const token = localStorage.getItem('token');
    setActionLoading(memberId + action);
    try {
      const res = await fetch(`${API_URL}/admin/members/${memberId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (action === 'resend') {
        if (res.ok) {
          setResendMsg({ memberId, text: 'Access code sent!', isError: false });
        } else {
          const data = await res.json().catch(() => ({}));
          setResendMsg({ memberId, text: data.error || 'Failed to send', isError: true });
        }
        setTimeout(() => setResendMsg(null), 3000);
      }
      await loadMembers(search, statusFilter, currentPage);
    } finally {
      setActionLoading(null);
    }
  };

  const totalCount = pagination?.total ?? members.length;
  const counts = {
    total: totalCount,
    active: members.filter(m => m.status === 'active').length,
    pending: members.filter(m => m.status === 'pending').length,
    past_due: members.filter(m => m.status === 'past_due').length,
    suspended: members.filter(m => m.status === 'suspended').length,
    cancelled: members.filter(m => m.status === 'cancelled').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-forest-900">Members</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {pagination ? `${pagination.total} total` : `${members.length} total`}
          </p>
        </div>
        {gymId && (
          <div className="flex items-center gap-2 bg-white border border-warm-200 rounded-xl px-4 py-2.5 shadow-sm">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-forest-600 uppercase tracking-widest mb-0.5">Signup link</span>
              <span className="text-sm text-forest-800 font-mono truncate max-w-[240px]">{APP_URL}/join/{gymId}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${APP_URL}/join/${gymId}`);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className="ml-2 px-3 py-1.5 text-xs font-semibold bg-forest-900 text-white rounded-lg hover:bg-forest-800 transition-colors whitespace-nowrap"
            >
              {linkCopied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total', count: pagination?.total ?? counts.total, color: 'bg-white border-warm-200 text-forest-900', click: '' },
            { label: 'Active', count: counts.active, color: 'bg-forest-50 border-forest-100 text-forest-800', click: 'active' },
            { label: 'Pending', count: counts.pending, color: 'bg-yellow-50 border-yellow-100 text-yellow-800', click: 'pending' },
            { label: 'Past Due', count: counts.past_due, color: 'bg-orange-50 border-orange-100 text-orange-800', click: 'past_due' },
            { label: 'Suspended', count: counts.suspended, color: 'bg-red-50 border-red-100 text-red-700', click: 'suspended' },
            { label: 'Cancelled', count: counts.cancelled, color: 'bg-gray-50 border-gray-100 text-gray-600', click: 'cancelled' },
          ].map(({ label, count, color, click }) => (
            <button
              key={label}
              onClick={() => handleStatusFilter(click)}
              className={`rounded-xl border px-4 py-3 text-left transition-all ${color} ${statusFilter === click ? 'ring-2 ring-forest-900 ring-offset-1' : 'hover:shadow-sm'}`}
            >
              <div className="text-2xl font-bold font-display">{count}</div>
              <div className="text-xs font-medium mt-0.5 opacity-75">{label}</div>
            </button>
          ))}
        </div>
      )}

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
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setCurrentPage(1);
                  loadMembers(search, statusFilter, 1);
                }
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); loadMembers(search, e.target.value, 1); }}
            className="px-3 py-2 rounded-xl border border-warm-200 text-sm text-forest-900 focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent bg-white"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="past_due">Past Due</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
          <button
            onClick={() => { setCurrentPage(1); loadMembers(search, statusFilter, 1); }}
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
            <h3 className="font-display font-bold text-xl text-forest-900 mb-2">
              {statusFilter ? `No ${statusFilter} members` : 'No members yet'}
            </h3>
            <p className="text-gray-500 text-sm">
              {statusFilter ? 'Try a different filter.' : "Share your gym's signup link to get started."}
            </p>
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
                      <Link href={`/admin/members/${member.member_id}`} className="font-medium text-forest-900 text-sm hover:text-forest-700 hover:underline">{member.name}</Link>
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
                        {resendMsg?.memberId === member.member_id ? (
                          <span className={`text-xs font-medium ${resendMsg.isError ? 'text-red-600' : 'text-forest-700'}`}>
                            {resendMsg.text}
                          </span>
                        ) : (
                          <button
                            onClick={() => doAction(member.member_id, 'resend')}
                            disabled={actionLoading === member.member_id + 'resend'}
                            className="text-xs text-forest-700 hover:text-forest-900 font-medium hover:underline disabled:opacity-50"
                          >
                            {actionLoading === member.member_id + 'resend' ? 'Sending…' : 'Resend'}
                          </button>
                        )}
                        {member.status === 'active' && (
                          <button
                            onClick={() => setConfirmModal({ memberId: member.member_id, memberName: member.name, action: 'suspend' })}
                            disabled={actionLoading === member.member_id + 'suspend'}
                            className="text-xs text-orange-600 hover:text-orange-800 font-medium hover:underline disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        )}
                        {member.status !== 'cancelled' && (
                          <button
                            onClick={() => setConfirmModal({ memberId: member.member_id, memberName: member.name, action: 'cancel' })}
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

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="px-5 py-4 border-t border-warm-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { const p = currentPage - 1; setCurrentPage(p); loadMembers(search, statusFilter, p); }}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-warm-200 text-forest-800 hover:bg-warm-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const start = Math.max(1, Math.min(currentPage - 2, pagination.pages - 4));
                    const page = start + i;
                    return page <= pagination.pages ? (
                      <button
                        key={page}
                        onClick={() => { setCurrentPage(page); loadMembers(search, statusFilter, page); }}
                        className={`w-8 h-8 text-sm rounded-lg transition-colors ${page === currentPage ? 'bg-forest-900 text-white' : 'border border-warm-200 text-forest-800 hover:bg-warm-50'}`}
                      >
                        {page}
                      </button>
                    ) : null;
                  })}
                  <button
                    onClick={() => { const p = currentPage + 1; setCurrentPage(p); loadMembers(search, statusFilter, p); }}
                    disabled={currentPage === pagination.pages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-warm-200 text-forest-800 hover:bg-warm-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-display font-bold text-xl text-forest-900 mb-2">
              {confirmModal.action === 'suspend' ? 'Suspend member?' : 'Cancel membership?'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {confirmModal.action === 'suspend'
                ? `This will suspend ${confirmModal.memberName}'s access. They can be reactivated later.`
                : `This will cancel ${confirmModal.memberName}'s membership and revoke their access code. This action cannot be easily undone.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-warm-200 text-sm font-medium text-forest-800 hover:bg-warm-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const { memberId, action } = confirmModal;
                  setConfirmModal(null);
                  await doAction(memberId, action);
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${
                  confirmModal.action === 'suspend'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {confirmModal.action === 'suspend' ? 'Suspend' : 'Cancel membership'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
