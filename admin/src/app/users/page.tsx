'use client';

import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';
import { AdminUser, listUsers, setUserStatus } from '@/lib/admin-api';

const STATUS_OPTIONS: { value: 'active' | 'suspended' | 'banned'; label: string }[] = [
  { value: 'active', label: 'Reactivate' },
  { value: 'suspended', label: 'Suspend' },
  { value: 'banned', label: 'Ban' },
];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback((q: string) => {
    setLoading(true);
    setError(null);
    listUsers({ search: q || undefined })
      .then((result) => setUsers(result.users))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Could not load users.'))
      .finally(() => setLoading(false));
  }, []);

  // A separate, inline fetch for the initial load (rather than calling
  // runSearch from the effect) so no setState happens synchronously inside
  // the effect body itself.
  useEffect(() => {
    let cancelled = false;
    listUsers({})
      .then((result) => {
        if (!cancelled) setUsers(result.users);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load users.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onChangeStatus = async (userId: string, status: 'active' | 'suspended' | 'banned') => {
    await setUserStatus(userId, status);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Users</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(search);
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or display name"
          className="w-80 rounded border border-slate-300 px-3 py-2"
        />
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Search
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Name</th>
              <th className="py-2">Username</th>
              <th className="py-2">Status</th>
              <th className="py-2">Joined</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="py-2">{u.profile?.displayName ?? '—'}</td>
                <td className="py-2">{u.profile ? `@${u.profile.username}` : '—'}</td>
                <td className="py-2 capitalize">{u.status}</td>
                <td className="py-2">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="flex gap-2 py-2">
                  {STATUS_OPTIONS.filter((opt) => opt.value !== u.status).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onChangeStatus(u.id, opt.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      {opt.label}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
