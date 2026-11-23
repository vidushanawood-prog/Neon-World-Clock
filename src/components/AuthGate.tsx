import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Lock,
  Mail,
} from 'lucide-react';
import {
  createAccount,
  evaluatePasswordStrength,
  getRegisteredAccountCount,
  isValidEmail,
  signInAccount,
  type AuthSession,
} from '../utils/auth';
import { HumanVerificationGate } from './HumanVerificationGate';

interface AuthGateProps {
  onBack: () => void;
  onAuthenticated: (session: AuthSession) => void;
}

type AuthTab = 'signin' | 'signup';

export const AuthGate: React.FC<AuthGateProps> = ({ onBack, onAuthenticated }) => {
  // Default to Create Account if this browser has no saved accounts yet, else Sign In
  const [tab, setTab] = useState<AuthTab>(() =>
    getRegisteredAccountCount() > 0 ? 'signin' : 'signup'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [humanVerified, setHumanVerified] = useState(false);
  const [verifyResetSignal, setVerifyResetSignal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorState, setErrorState] = useState<{
    message: string;
    suggestTab?: AuthTab;
  } | null>(null);

  const emailTouched = email.trim().length > 0;
  const emailValid = isValidEmail(email);
  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);
  const passwordsMatch = tab === 'signin' || confirmPassword === password;

  const canSubmit =
    !submitting &&
    humanVerified &&
    emailValid &&
    password.length >= (tab === 'signup' ? 6 : 1) &&
    passwordsMatch;

  const handleSwitchTab = (next: AuthTab) => {
    setTab(next);
    setErrorState(null);
    setConfirmPassword('');
    setHumanVerified(false);
    setVerifyResetSignal((s) => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorState(null);

    if (!humanVerified) {
      setErrorState({
        message: 'Complete the orbital Human Verification slider to unlock authentication.',
      });
      return;
    }

    if (!emailValid) {
      setErrorState({ message: 'Please enter a valid email address.' });
      return;
    }

    if (tab === 'signup' && password !== confirmPassword) {
      setErrorState({ message: 'Passwords do not match. Please re-enter to confirm.' });
      return;
    }

    setSubmitting(true);
    try {
      const result =
        tab === 'signup'
          ? await createAccount(email, password)
          : await signInAccount(email, password);

      if (!result.ok) {
        setErrorState({
          message: result.error,
          suggestTab:
            result.code === 'EXISTS'
              ? 'signin'
              : result.code === 'NOT_FOUND'
                ? 'signup'
                : undefined,
        });
        return;
      }

      onAuthenticated(result.session);
    } finally {
      setSubmitting(false);
    }
  };

  const strengthColors: Record<number, string> = {
    0: 'bg-slate-800',
    1: 'bg-rose-500',
    2: 'bg-amber-400',
    3: 'bg-sky-400',
    4: 'bg-emerald-400',
  };

  const strengthTextColors: Record<number, string> = {
    0: 'text-slate-500',
    1: 'text-rose-400',
    2: 'text-amber-300',
    3: 'text-sky-300',
    4: 'text-emerald-300',
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#060a14] text-slate-100">
      {/* Subtle Ambient Telemetry Backdrop */}
      <div className="telemetry-grid-bg pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 60% 45% at 20% 10%, rgba(14, 165, 233, 0.16), transparent 60%), radial-gradient(ellipse 55% 45% at 85% 90%, rgba(99, 102, 241, 0.14), transparent 60%)',
        }}
      />

      {/* Top Bar */}
      <header className="relative z-20 border-b border-white/[0.07] bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Preview</span>
          </button>

          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 ring-1 ring-sky-400/35">
              <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-bold tracking-tight text-white">Meridian</span>
          </div>

          <span className="hidden text-xs text-slate-400 sm:inline">SHA-256 Local Vault</span>
        </div>
      </header>

      {/* Main Centered Auth Card */}
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-white/[0.1] bg-slate-950/80 p-6 shadow-[0_24px_80px_-20px_rgba(14,165,233,0.22)] backdrop-blur-2xl sm:p-8">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white [text-wrap:balance]">
              {tab === 'signin' ? 'Operator Sign In' : 'Create Operator Account'}
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400 sm:text-sm">
              {tab === 'signin'
                ? 'Authenticate and pass orbital human verification to enter the dashboard.'
                : 'Register your local operator profile sealed with Web Crypto SHA-256.'}
            </p>
          </div>

          {/* Segmented Mode Tabs */}
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="mt-6 grid grid-cols-2 rounded-2xl border border-white/[0.08] bg-slate-900/90 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'signin'}
              onClick={() => handleSwitchTab('signin')}
              className={`rounded-xl py-2.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                tab === 'signin'
                  ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/35 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'signup'}
              onClick={() => handleSwitchTab('signup')}
              className={`rounded-xl py-2.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                tab === 'signup'
                  ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/35 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            {/* Email Input */}
            <div className="space-y-1.5">
              <label htmlFor="auth-email" className="block text-xs font-medium text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorState) setErrorState(null);
                  }}
                  placeholder="operator@domain.com"
                  aria-invalid={emailTouched && !emailValid}
                  className={`h-11 w-full rounded-xl border bg-slate-900/80 pr-4 pl-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
                    emailTouched && !emailValid
                      ? 'border-rose-400/60 focus:border-rose-400 focus:ring-rose-400/20'
                      : 'border-white/12 focus:border-sky-400 focus:ring-sky-400/20'
                  }`}
                />
              </div>
              {emailTouched && !emailValid && (
                <p className="text-[11px] text-rose-400">Enter a valid email format (e.g., name@example.com).</p>
              )}
            </div>

            {/* Password Input + Show/Hide Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="auth-password" className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                {password.length > 0 && (
                  <span className={`text-[11px] font-semibold ${strengthTextColors[strength.score]}`}>
                    Strength: {strength.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <KeyRound
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorState) setErrorState(null);
                  }}
                  placeholder={tab === 'signup' ? 'Create a strong password (min 6 chars)' : 'Enter your password'}
                  className="h-11 w-full rounded-xl border border-white/12 bg-slate-900/80 pr-11 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* 4-Segment Password Strength Meter */}
              {(tab === 'signup' || password.length > 0) && (
                <div className="pt-1">
                  <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                    {[1, 2, 3, 4].map((segment) => (
                      <div
                        key={segment}
                        className={`h-1 rounded-full transition-colors duration-200 ${
                          strength.score >= segment ? strengthColors[strength.score] : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                  {tab === 'signup' && (
                    <p className="mt-1 text-[11px] text-slate-400">{strength.hint}</p>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password (Create Account only) */}
            {tab === 'signup' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-xs font-medium text-slate-300"
                >
                  Confirm Password
                </label>
                <input
                  id="auth-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorState) setErrorState(null);
                  }}
                  placeholder="Re-enter your password"
                  aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
                  className={`h-11 w-full rounded-xl border bg-slate-900/80 px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
                    confirmPassword.length > 0 && !passwordsMatch
                      ? 'border-rose-400/60 focus:border-rose-400 focus:ring-rose-400/20'
                      : 'border-white/12 focus:border-sky-400 focus:ring-sky-400/20'
                  }`}
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-[11px] text-rose-400">Passwords do not match.</p>
                )}
              </div>
            )}

            {/* Interactive Neon Human Verification Gate */}
            <div className="pt-1">
              <HumanVerificationGate
                verified={humanVerified}
                onVerifyChange={(v) => {
                  setHumanVerified(v);
                  if (v && errorState) setErrorState(null);
                }}
                resetSignal={verifyResetSignal}
              />
            </div>

            {/* Error Alert */}
            {errorState && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rose-400/35 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                <div className="flex-1 space-y-1">
                  <p>{errorState.message}</p>
                  {errorState.suggestTab && (
                    <button
                      type="button"
                      onClick={() => handleSwitchTab(errorState.suggestTab!)}
                      className="font-semibold text-sky-300 underline underline-offset-2 hover:text-sky-200"
                    >
                      {errorState.suggestTab === 'signup'
                        ? 'Switch to Create Account'
                        : 'Switch to Sign In'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button (Locked until Human Verified + Valid Form) */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                canSubmit
                  ? 'bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 text-slate-950 shadow-[0_0_28px_-4px_rgba(34,211,238,0.7)] hover:brightness-105'
                  : 'cursor-not-allowed border border-white/10 bg-slate-900/90 text-slate-500'
              }`}
            >
              {!humanVerified ? (
                <>
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  <span>Complete Human Verification to Unlock</span>
                </>
              ) : submitting ? (
                <span>Hashing Credentials...</span>
              ) : (
                <>
                  <span>{tab === 'signin' ? 'Sign In & Boot Dashboard' : 'Create Account & Boot'}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Local Storage + SHA-256 Transparency Note */}
          <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-500">
            Accounts are salted and hashed locally with Web Crypto SHA-256 in your browser for
            zero-backend static deployment.
          </p>
        </div>
      </main>
    </div>
  );
};
