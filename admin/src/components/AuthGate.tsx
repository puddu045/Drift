'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

type Stage =
  | { name: 'loading' }
  | { name: 'signed-out' }
  | { name: 'not-admin' }
  | { name: 'needs-enroll'; qrCode: string; secret: string; factorId: string }
  | { name: 'needs-verify'; factorId: string }
  | { name: 'ready' };

/**
 * Every admin account must clear two gates before seeing anything behind
 * this component: role === 'admin' (from the Supabase JWT's app_metadata,
 * never user-settable — the same check the API enforces server-side) and
 * MFA at aal2 (enrolled here on first login if not already set up).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<Stage>({ name: 'loading' });
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const evaluate = useCallback(async (session: Session | null) => {
    if (!session) {
      setStage({ name: 'signed-out' });
      return;
    }
    if (session.user.app_metadata?.role !== 'admin') {
      setStage({ name: 'not-admin' });
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === 'aal2') {
      setStage({ name: 'ready' });
      return;
    }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verifiedTotp = factors?.totp.find((f) => f.status === 'verified');
    if (verifiedTotp) {
      setStage({ name: 'needs-verify', factorId: verifiedTotp.id });
      return;
    }

    const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (enrollError || !enrolled) {
      setError(enrollError?.message ?? 'Could not start MFA enrollment.');
      return;
    }
    setStage({
      name: 'needs-enroll',
      qrCode: enrolled.totp.qr_code,
      secret: enrolled.totp.secret,
      factorId: enrolled.id,
    });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => evaluate(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluate(session);
    });
    return () => subscription.subscription.unsubscribe();
  }, [evaluate]);

  const onSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
    setBusy(false);
  };

  const onVerify = async (factorId: string) => {
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    setCode('');
    const { data } = await supabase.auth.getSession();
    await evaluate(data.session);
  };

  if (stage.name === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  if (stage.name === 'signed-out') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <form onSubmit={onSignIn} className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 p-6">
          <h1 className="text-lg font-semibold">Drift Admin</h1>
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }

  if (stage.name === 'not-admin') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-slate-700">This account doesn&rsquo;t have admin access.</p>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-slate-500 underline">
          Sign out
        </button>
      </div>
    );
  }

  if (stage.name === 'needs-enroll') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 p-6 text-center">
          <h1 className="text-lg font-semibold">Set up two-factor authentication</h1>
          <p className="text-sm text-slate-600">
            Admin accounts require an authenticator app. Scan this code, or enter the secret manually.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL SVG, not an optimizable remote image */}
          <img src={stage.qrCode} alt="MFA QR code" className="mx-auto h-40 w-40" />
          <p className="break-all font-mono text-xs text-slate-500">{stage.secret}</p>
          <input
            inputMode="numeric"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-center"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={() => onVerify(stage.factorId)}
            disabled={busy || code.length < 6}
            className="w-full rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
          >
            Enable
          </button>
        </div>
      </div>
    );
  }

  if (stage.name === 'needs-verify') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 p-6 text-center">
          <h1 className="text-lg font-semibold">Enter your authenticator code</h1>
          <input
            inputMode="numeric"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-center"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={() => onVerify(stage.factorId)}
            disabled={busy || code.length < 6}
            className="w-full rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
          >
            Verify
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
