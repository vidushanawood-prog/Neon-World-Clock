import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  RefreshCw,
  User as UserIcon,
} from 'lucide-react';
import {
  auth,
  isFirebaseConfigured,
  mapFirebaseAuthError,
  sanitizeDisplayName,
  syncVerifiedUserProfile,
} from '../lib/firebase';
import {
  createAccount,
  evaluatePasswordStrength,
  getRegisteredAccountCount,
  isValidEmail,
  saveActiveSession,
  signInAccount,
  type AuthSession,
} from '../utils/auth';
import { HumanVerificationGate } from './HumanVerificationGate';

interface AuthGateProps {
  onBack: () => void;
  backLabel?: string;
  onAuthenticated: (session: AuthSession) => void;
}

type AuthTab = 'signin' | 'signup';

export const AuthGate: React.FC<AuthGateProps> = ({
  onBack,
  backLabel = 'Back to Preview',
  onAuthenticated,
}) => {
  const [tab, setTab] = useState<AuthTab>(() =>
    !isFirebaseConfigured && getRegisteredAccountCount() > 0 ? 'signin' : 'signup'
  );
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [humanVerified, setHumanVerified] = useState(false);
  const [verifyResetSignal, setVerifyResetSignal] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Firebase email verification waiting state
  const [pendingEmail, setPendingEmail] = useState<string | null>(() =>
    auth?.currentUser && !auth.currentUser.emailVerified ? auth.currentUser.email : null
  );
  const [pendingName, setPendingName] = useState<string>(() =>
    auth?.currentUser?.displayName || ''
  );
  const [checkingVerify, setCheckingVerify] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{
    message: string;
    suggestTab?: AuthTab;
  } | null>(null);

  const checkingRef = useRef(false);

  const emailTrimmed = email.trim().toLowerCase();
  const emailTouched = emailTrimmed.length > 0;
  const emailValid = isValidEmail(emailTrimmed);
  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);
  const passwordsMatch = tab === 'signin' || confirmPassword === password;
  const displayNameValid = tab === 'signin' || !isFirebaseConfigured || displayName.trim().length >= 1;

  const canSubmit =
    !submitting &&
    humanVerified &&
    emailValid &&
    displayNameValid &&
    password.length >= (tab === 'signup' ? 6 : 1) &&
    passwordsMatch;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  const finalizeFirebaseSession = useCallback(
    async (user: User, preferredName?: string) => {
      const cleanName = sanitizeDisplayName(
        preferredName || user.displayName,
        user.email || 'operator@neonworldclock.app'
      );
      if (user.displayName !== cleanName) {
        try {
          await updateProfile(user, { displayName: cleanName });
        } catch {
          // Non-fatal
        }
      }
      const saved = await syncVerifiedUserProfile(user, cleanName);
      const session: AuthSession = {
        uid: user.uid,
        email: (user.email || '').toLowerCase(),
        displayName: saved?.displayName || cleanName,
        emailVerified: true,
        loggedInAt: new Date().toISOString(),
        provider: 'firebase',
      };
      saveActiveSession(session);
      setPendingEmail(null);
      onAuthenticated(session);
    },
    [onAuthenticated]
  );

  const checkEmailVerification = useCallback(
    async (manual: boolean) => {
      if (!auth?.currentUser || checkingRef.current) return;
      checkingRef.current = true;
      if (manual) {
        setCheckingVerify(true);
        setErrorState(null);
        setInfoMessage(null);
      }
      try {
        await reload(auth.currentUser);
        if (auth.currentUser?.emailVerified) {
          await finalizeFirebaseSession(auth.currentUser, pendingName || displayName);
        } else if (manual) {
          setErrorState({
            message:
              'Email not verified yet. Please click the verification link sent to your inbox, then tap Check Verification again.',
          });
        }
      } catch (err) {
        if (manual) setErrorState(mapFirebaseAuthError(err));
      } finally {
        checkingRef.current = false;
        if (manual) setCheckingVerify(false);
      }
    },
    [displayName, finalizeFirebaseSession, pendingName]
  );

  useEffect(() => {
    if (!pendingEmail || !auth?.currentUser) return;
    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        void checkEmailVerification(false);
      }
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkEmailVerification(false);
      }
    }, 5000);

    return () => {
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      window.clearInterval(interval);
    };
  }, [pendingEmail, checkEmailVerification]);

  const handleResend = async () => {
    if (!auth?.currentUser || resending || resendCooldown > 0) return;
    setResending(true);
    setErrorState(null);
    setInfoMessage(null);
    try {
      await sendEmailVerification(auth.currentUser);
      setResendCooldown(30);
      setInfoMessage(`Verification email resent to ${auth.currentUser.email}.`);
    } catch (err) {
      setErrorState(mapFirebaseAuthError(err));
    } finally {
      setResending(false);
    }
  };

  const handleSwitchTab = (next: AuthTab) => {
    setTab(next);
    setErrorState(null);
    setInfoMessage(null);
    setConfirmPassword('');
    setHumanVerified(false);
    setVerifyResetSignal((s) => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorState(null);
    setInfoMessage(null);

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
      if (isFirebaseConfigured && auth) {
        if (tab === 'signup') {
          const cleanName = sanitizeDisplayName(displayName, emailTrimmed);
          const cred = await createUserWithEmailAndPassword(auth, emailTrimmed, password);
          await updateProfile(cred.user, { displayName: cleanName });
          await sendEmailVerification(cred.user);
          setPendingName(cleanName);
          setPendingEmail(cred.user.email || emailTrimmed);
          setResendCooldown(30);
          setInfoMessage(
            `Verification link sent to ${cred.user.email || emailTrimmed}. Verify your inbox to enter automatically.`
          );
          return;
        }

        const cred = await signInWithEmailAndPassword(auth, emailTrimmed, password);
        await reload(cred.user);
        const current = auth.currentUser || cred.user;
        if (!current.emailVerified) {
          setPendingName(current.displayName || '');
          setPendingEmail(current.email || emailTrimmed);
          setErrorState({
            message:
              'Please verify your email address before continuing. Check your inbox or resend the verification email below.',
          });
          return;
        }

        await finalizeFirebaseSession(current);
        return;
      }

      // Safe local SHA-256 fallback if Firebase keys are not set yet
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

      onAuthenticated({ ...result.session, provider: 'local' });
    } catch (err) {
      setErrorState(mapFirebaseAuthError(err));
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
            <span>{backLabel}</span>
          </button>

          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 ring-1 ring-sky-400/35">
              <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-bold tracking-tight text-white">vidushanawood</span>
          </div>

          <span className="hidden text-xs text-slate-400 sm:inline">
            {isFirebaseConfigured ? 'Firebase Cloud Auth' : 'SHA-256 Local Vault'}
          </span>
        </div>
      </header>

      {/* Main Centered Auth Card */}
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-white/[0.1] bg-slate-950/80 p-6 shadow-[0_24px_80px_-20px_rgba(14,165,233,0.22)] backdrop-blur-2xl sm:p-8">
          {pendingEmail ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-500/15 text-cyan-300">
                <MailCheck className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                Email Verification
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
                Check your inbox and verify your email
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                Verification sent to <span className="font-semibold text-white">{pendingEmail}</span>.
                Click the link in your inbox, then return here — sign-in completes automatically.
              </p>

              {infoMessage && (
                <div
                  role="status"
                  className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/12 px-3.5 py-2.5 text-xs text-emerald-200"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {errorState && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-400/35 bg-rose-500/10 px-3.5 py-2.5 text-left text-xs text-rose-200"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                  <span>{errorState.message}</span>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => void checkEmailVerification(true)}
                  disabled={checkingVerify}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 text-sm font-bold text-slate-950 shadow-[0_0_28px_-4px_rgba(34,211,238,0.7)] hover:brightness-105 disabled:opacity-60"
                >
                  {checkingVerify ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>
                    {checkingVerify ? 'Checking Verification…' : 'Check Verification / Continue'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={resending || resendCooldown > 0}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/14 bg-white/[0.06] text-xs font-semibold text-slate-100 hover:bg-white/[0.12] disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 text-cyan-400 ${resending ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>
                    {resendCooldown > 0
                      ? `Resend Verification Email (${resendCooldown}s)`
                      : 'Resend Verification Email'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setPendingEmail(null);
                    setErrorState(null);
                    setInfoMessage(null);
                    if (auth?.currentUser) {
                      try {
                        await signOut(auth);
                      } catch {
                        // Ignore
                      }
                    }
                  }}
                  className="pt-1 text-xs font-medium text-slate-400 underline underline-offset-4 hover:text-white"
                >
                  Use a different email address
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Title */}
              <div className="text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                  vidushanawood Account
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white [text-wrap:balance]">
                  {tab === 'signin' ? 'Sign In to User Dashboard' : 'Create vidushanawood Account'}
                </h1>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400 sm:text-sm">
                  {isFirebaseConfigured
                    ? tab === 'signin'
                      ? 'Sign in with your verified Firebase Email & Password to sync your Neon World Clock profile.'
                      : 'Register with Email & Password, verify your inbox, and persist your profile in Cloud Firestore.'
                    : tab === 'signin'
                      ? 'Authenticate and pass orbital human verification to enter your Neon World Clock dashboard.'
                      : 'Register your local operator account sealed with Web Crypto SHA-256.'}
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
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                {/* Display Name on Sign Up */}
                {tab === 'signup' && isFirebaseConfigured && (
                  <div className="space-y-1.5">
                    <label htmlFor="auth-display-name" className="block text-xs font-medium text-slate-300">
                      Display Name
                    </label>
                    <div className="relative">
                      <UserIcon
                        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500"
                        aria-hidden="true"
                      />
                      <input
                        id="auth-display-name"
                        type="text"
                        autoComplete="name"
                        maxLength={80}
                        value={displayName}
                        onChange={(e) => {
                          setDisplayName(e.target.value);
                          if (errorState) setErrorState(null);
                        }}
                        placeholder="Your display name"
                        className="h-11 w-full rounded-xl border border-white/12 bg-slate-900/80 pr-4 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                      />
                    </div>
                  </div>
                )}

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
                    <p className="text-[11px] text-rose-400">
                      Enter a valid email format (e.g., name@example.com).
                    </p>
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
                      placeholder={
                        tab === 'signup'
                          ? 'Create a strong password (min 6 chars)'
                          : 'Enter your password'
                      }
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

                {/* Confirm Password (Sign Up only) */}
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
                            ? 'Switch to Sign Up'
                            : 'Switch to Sign In'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
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
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>
                        {isFirebaseConfigured ? 'Authenticating with Firebase…' : 'Hashing Credentials…'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {tab === 'signin'
                          ? 'Sign In & Boot Dashboard'
                          : isFirebaseConfigured
                            ? 'Sign Up & Verify Email'
                            : 'Create Account & Boot'}
                      </span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-500">
                {isFirebaseConfigured
                  ? 'Authenticated via Firebase Auth with verified profile persistence in Firestore (users/{uid}). Passwords are never stored in Firestore.'
                  : 'Accounts are salted and hashed locally with Web Crypto SHA-256 in your browser for zero-backend static deployment.'}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
