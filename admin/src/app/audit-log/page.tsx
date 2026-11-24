'use client';

import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';
import { AuditLogEntry, listAuditLog } from '@/lib/admin-api';

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAuditLog({})
      .then((result) => setEntries(result.entries))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Could not load the audit log.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Audit log</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">When</th>
              <th className="py-2">Admin</th>
              <th className="py-2">Action</th>
              <th className="py-2">Target</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-slate-100 align-top">
                <td className="py-2 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</td>
                <td className="py-2 font-mono text-xs">{entry.actorId}</td>
                <td className="py-2">{entry.action}</td>
                <td className="py-2 font-mono text-xs">
                  {entry.targetType ? `${entry.targetType}:` : ''}
                  {entry.targetId}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500">
                  Nothing yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
