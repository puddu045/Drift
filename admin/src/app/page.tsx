'use client';

import { useEffect, useState } from 'react';

import { DashboardStats, getDashboardStats } from '@/lib/admin-api';

const CARDS: { key: keyof DashboardStats; label: string }[] = [
  { key: 'totalUsers', label: 'Total users' },
  { key: 'suspendedOrBannedUsers', label: 'Suspended / banned' },
  { key: 'totalThoughts', label: 'Thoughts (live)' },
  { key: 'openReports', label: 'Open reports' },
  { key: 'totalReports', label: 'Reports (all time)' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {CARDS.map((card) => (
          <div key={card.key} className="rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="text-2xl font-semibold">{stats ? stats[card.key] : '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
