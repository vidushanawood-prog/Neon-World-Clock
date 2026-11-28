import React from 'react';
import { Ban, LogOut, ShieldAlert } from 'lucide-react';

interface BannedAccountScreenProps {
  email?: string | null;
  reason?: string;
  onDismiss?: () => void;
}

export const BannedAccountScreen: React.FC<BannedAccountScreenProps> = ({
  email,
  reason,
  onDismiss,
}) => {
  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950 p-6 text-center text-slate-100"
      role="alertdialog"
      aria-modal="true"
      aria-label="Account Suspended"
    >
      <div className="w-full max-w-md rounded-3xl border border-rose-500/45 bg-slate-950 p-8 shadow-[0_0_70px_rgba(244,63,94,0.28)]">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-rose-500/50 bg-rose-500/15 text-rose-400 shadow-[0_0_32px_rgba(244,63,94,0.4)]">
          <Ban className="h-8 w-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-rose-300">
          <ShieldAlert className="h-3.5 w-3.5" />
          Access Restricted
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-white">
          Your account has been suspended by Admin
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
          {reason ||
            'Access to Neon World Clock has been revoked for this account. You have been signed out automatically.'}
        </p>
        {email && (
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2 font-mono text-xs text-rose-300">
            {email}
          </div>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-slate-900 px-5 py-3 text-xs font-bold text-slate-200 transition hover:border-rose-400/50 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Return to Sign In
          </button>
        )}
      </div>
    </div>
  );
};
