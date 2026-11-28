'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { supabase } from '@/lib/supabase';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/users', label: 'Users' },
  { href: '/reports', label: 'Reports' },
  { href: '/audit-log', label: 'Audit log' },
  { href: '/feature-flags', label: 'Feature flags' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
      <div className="flex items-center gap-6">
        <span className="font-semibold">Unwritten Admin</span>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? 'font-medium text-slate-900' : 'text-slate-500 hover:text-slate-800'}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <button onClick={() => supabase.auth.signOut()} className="text-sm text-slate-500 hover:text-slate-800">
        Sign out
      </button>
    </nav>
  );
}
