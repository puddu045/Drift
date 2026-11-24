'use client';

import { FormEvent, useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';
import { deleteFeatureFlag, FeatureFlag, listFeatureFlags, setFeatureFlag } from '@/lib/admin-api';

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');

  useEffect(() => {
    let cancelled = false;
    listFeatureFlags()
      .then((result) => {
        if (!cancelled) setFlags(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load feature flags.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onToggle = async (key: string, enabled: boolean) => {
    const updated = await setFeatureFlag(key, enabled);
    setFlags((prev) => prev.map((f) => (f.key === key ? updated : f)));
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    const created = await setFeatureFlag(newKey.trim(), false);
    setFlags((prev) => [...prev, created].sort((a, b) => a.key.localeCompare(b.key)));
    setNewKey('');
  };

  const onDelete = async (key: string) => {
    await deleteFeatureFlag(key);
    setFlags((prev) => prev.filter((f) => f.key !== key));
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Feature flags</h1>

      <form onSubmit={onCreate} className="mb-6 flex gap-2">
        <input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="new_flag_key"
          className="w-64 rounded border border-slate-300 px-3 py-2"
        />
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Create
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Key</th>
              <th className="py-2">Enabled</th>
              <th className="py-2">Updated</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((flag) => (
              <tr key={flag.key} className="border-b border-slate-100">
                <td className="py-2 font-mono text-xs">{flag.key}</td>
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={flag.enabled}
                    onChange={(e) => onToggle(flag.key, e.target.checked)}
                  />
                </td>
                <td className="py-2">{new Date(flag.updatedAt).toLocaleString()}</td>
                <td className="py-2">
                  <button
                    onClick={() => onDelete(flag.key)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {flags.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500">
                  No feature flags yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
