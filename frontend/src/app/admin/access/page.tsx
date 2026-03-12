'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface AccessCode {
  code_id: string;
  code: string;
  member_name: string;
  valid_from: string;
}

interface AccessData {
  accessType: string;
  sharedPin: string | null;
  codes: AccessCode[];
}

export default function AccessPage() {
  const t = useTranslations('admin.access');
  const [data, setData] = useState<AccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [rotateSuccess, setRotateSuccess] = useState('');

  const loadAccess = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/admin/access`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAccess(); }, []);

  const rotatePin = async () => {
    const token = localStorage.getItem('token');
    setRotating(true);
    setRotateSuccess('');
    try {
      const res = await fetch(`${API_URL}/admin/access/rotate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      setRotateSuccess(`New PIN: ${result.newPin}`);
      await loadAccess();
    } finally {
      setRotating(false);
    }
  };

  const accessTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      shared_pin: t('types.shared_pin'),
      individual_pin: t('types.individual'),
      smart_lock: t('types.igloohome_direct'),
    };
    return labels[type] || type;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-forest-900">{t('title')}</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage member access codes</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-forest-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Access type info */}
          <div className="bg-white rounded-2xl border border-warm-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">Access Method</p>
                <p className="font-display font-bold text-2xl text-forest-900">{accessTypeLabel(data.accessType)}</p>
              </div>
              <div className="w-12 h-12 bg-forest-50 rounded-xl flex items-center justify-center text-2xl">
                {data.accessType === 'shared_pin' ? '🔢' : data.accessType === 'individual_pin' ? '🔐' : '🔒'}
              </div>
            </div>

            {data.accessType === 'shared_pin' && (
              <div className="mt-5 pt-5 border-t border-warm-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Current Gym PIN</p>
                    <p className="font-mono font-bold text-4xl text-forest-900 tracking-widest">
                      {data.sharedPin || '——'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Shared with all active members</p>
                  </div>
                  <div className="text-right">
                    <button
                      onClick={rotatePin}
                      disabled={rotating}
                      className="px-5 py-2.5 bg-forest-900 text-white rounded-xl text-sm font-semibold hover:bg-forest-800 disabled:opacity-50 transition-colors"
                    >
                      {rotating ? 'Rotating…' : 'Rotate PIN'}
                    </button>
                    {rotateSuccess && (
                      <p className="text-sm text-forest-700 font-medium mt-2">{rotateSuccess}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Individual codes */}
          {data.codes.length > 0 && (
            <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-warm-100">
                <h2 className="font-display font-semibold text-base text-forest-900">Active Access Codes</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-warm-50 border-b border-warm-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{t('table.member')}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{t('table.code')}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{t('table.validFrom')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-50">
                  {data.codes.map(code => (
                    <tr key={code.code_id} className="hover:bg-warm-50">
                      <td className="px-5 py-3 text-sm font-medium text-forest-900">{code.member_name}</td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-sm bg-forest-50 text-forest-700 px-2 py-1 rounded">{code.code}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {new Date(code.valid_from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.codes.length === 0 && data.accessType !== 'shared_pin' && (
            <div className="bg-white rounded-2xl border border-warm-200 p-12 text-center">
              <div className="text-4xl mb-3">🔑</div>
              <p className="text-gray-500 text-sm">{t('noAccess')}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-500">Failed to load access data.</p>
      )}
    </div>
  );
}
