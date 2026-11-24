'use client';

import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';
import { AdminReport, listReports, ModerationActionType, resolveReport } from '@/lib/admin-api';

const STATUS_TABS: { value: 'open' | 'resolved' | 'dismissed'; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const ACTIONS: { value: ModerationActionType; label: string }[] = [
  { value: 'dismissed', label: 'Dismiss' },
  { value: 'warning', label: 'Warn' },
  { value: 'content_removed', label: 'Remove content' },
  { value: 'suspended', label: 'Suspend user' },
  { value: 'banned', label: 'Ban user' },
];

function reportContent(report: AdminReport) {
  if (report.thought) return { label: 'Thought', text: report.thought.text, deleted: !!report.thought.deletedAt };
  if (report.reply) return { label: 'Reply', text: report.reply.text, deleted: !!report.reply.deletedAt };
  if (report.message) return { label: 'Message', text: report.message.text, deleted: !!report.message.deletedAt };
  return { label: 'Profile', text: report.reportedUserId ?? '—', deleted: false };
}

export default function ReportsPage() {
  const [status, setStatus] = useState<'open' | 'resolved' | 'dismissed'>('open');
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    listReports({ status })
      .then((result) => {
        if (!cancelled) setReports(result.reports);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load reports.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const onResolve = async (reportId: string, action: ModerationActionType) => {
    await resolveReport(reportId, action, notes[reportId]?.trim() || undefined);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Reports</h1>
      <div className="mb-4 flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`rounded px-3 py-1 text-sm ${
              status === tab.value ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : reports.length === 0 ? (
        <p className="text-slate-500">No {status} reports.</p>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const content = reportContent(report);
            return (
              <div key={report.id} className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">
                  {content.label} {content.deleted && '(already removed)'} — reported for: {report.reason}
                </p>
                <p className="mt-1 text-sm">{content.text}</p>
                {status === 'open' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      placeholder="Notes (optional)"
                      value={notes[report.id] ?? ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [report.id]: e.target.value }))}
                      className="min-w-48 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                    {ACTIONS.map((action) => (
                      <button
                        key={action.value}
                        onClick={() => onResolve(report.id, action.value)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
