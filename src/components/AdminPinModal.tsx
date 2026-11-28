import React, { useEffect, useRef, useState } from 'react';
import { Lock, ShieldAlert, X } from 'lucide-react';
import { ADMIN_PIN_CODE } from '../services/subscription';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({ isOpen, onClose, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPin('');
      setError(null);
      setShaking(false);
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN_CODE) {
      setPin('');
      setError(null);
      onUnlock();
      return;
    }
    setError('Invalid Admin PIN. Access denied.');
    setShaking(true);
    setPin('');
    window.setTimeout(() => {
      setShaking(false);
      onClose();
    }, 650);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Admin PIN Verification"
    >
      <div
        className={`relative w-full max-w-sm rounded-3xl border border-cyan-400/35 bg-slate-950/95 p-6 shadow-[0_0_50px_rgba(34,211,238,0.22)] transition-transform ${
          shaking ? 'animate-pulse -translate-x-2 border-rose-500/70 shadow-[0_0_45px_rgba(244,63,94,0.35)]' : ''
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close PIN modal"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 text-slate-400 transition hover:border-white/25 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_24px_rgba(56,189,248,0.35)]">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white">Restricted Console</h2>
          <p className="mt-1 text-xs text-slate-400">Enter 4-digit Admin PIN to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              if (error) setError(null);
            }}
            placeholder="••••"
            className="w-full rounded-2xl border border-cyan-400/30 bg-slate-900/90 px-4 py-3.5 text-center font-mono text-2xl tracking-[0.55em] text-cyan-200 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
          />

          {error && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-white/25 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition hover:brightness-110"
            >
              Verify PIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
