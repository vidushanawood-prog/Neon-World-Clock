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
  ArrowRight,
  CheckCircle2,
  Crown,
  Database,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MailCheck,
  Receipt,
  RefreshCw,
  ShieldCheck,
  User as UserIcon,
  UserCheck,
} from 'lucide-react';
import {
  auth,
  fetchUserProfile,
  firebaseProjectId,
  isFirebaseConfigured,
  mapFirebaseAuthError,
  sanitizeDisplayName,
  syncVerifiedUserProfile,
  type FirestoreUserProfile,
} from '../lib/firebase';
import {
  evaluatePasswordStrength,
  isValidEmail,
  saveActiveSession,
  type AuthSession,
} from '../utils/auth';
import { formatShortDate, getDaysRemaining, isProActive } from '../services/subscription';

interface AccountPageProps {
  session: AuthSession | null;
  firebaseUser: User | null;
  userProfile?: FirestoreUserProfile | null;
  isProUser?: boolean;
  hasLastReceipt?: boolean;
  onOpenUpgrade?: () => void;
  onViewLastReceipt?: () => void;
  onAccountBanned?: (email: string) => void;
  onSessionVerified: (session: AuthSession) => void;
  onSignOut: () => Promise<void> | void;
  onOpenDashboard: () => void;
  onBackToGlobe: () => void;
}

type AccountTab = 'signin' | 'signup';

export const AccountPage: React.FC<AccountPageProps> = ({
  session,
  firebaseUser,
  userProfile,
  isProUser = false,
  hasLastReceipt = false,
  onOpenUpgrade,
  onViewLastReceipt,
  onAccountBanned,
  onSessionVerified,
  onSignOut,
  onOpenDashboard,
  onBackToGlobe,
}) => {
  const [tab, setTab] = useState<AccountTab>('signup');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{
    message: string;
    suggestTab?: AccountTab;
  } | null>(null);

  // Pending verification state when signed-up or returning user has emailVerified === false
  const [pendingEmail, setPendingEmail] = useState<string | null>(() =>
    firebaseUser && !firebaseUser.emailVerified ? firebaseUser.email : null
  );
  const [pendingDisplayName, setPendingDisplayName] = useState<string>(() =>
    firebaseUser?.displayName || ''
  );

  // Synced Firestore profile state for verified users
  const [firestoreProfile, setFirestoreProfile] = useState<FirestoreUserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const checkingRef = useRef(false);

  const emailTrimmed = email.trim().toLowerCase();
  const emailTouched = emailTrimmed.length > 0;
  const emailValid = isValidEmail(emailTrimmed);
  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);

  // Keep pending verification state aligned with active unverified Firebase user
  useEffect(() => {
    if (firebaseUser && !firebaseUser.emailVerified) {
      setPendingEmail(firebaseUser.email || null);
      if (firebaseUser.displayName && !pendingDisplayName) {
        setPendingDisplayName(firebaseUser.displayName);
      }
    } else if (firebaseUser && firebaseUser.emailVerified) {
      setPendingEmail(null);
    }
  }, [firebaseUser, pendingDisplayName]);

  // Load Firestore profile when a verified Firebase user is signed in
  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseUser?.emailVerified) {
      setFirestoreProfile(null);
      return;
    }
    let cancelled = false;
    setLoadingProfile(true);
    fetchUserProfile(firebaseUser.uid)
      .then((profile) => {
        if (cancelled) return;
        setFirestoreProfile(profile);
        setEditingName(
          profile?.displayName ||
            firebaseUser.displayName ||
            session?.displayName ||
            ''
        );
      })
      .catch(() => {
        if (!cancelled) {
          setEditingName(firebaseUser.displayName || session?.displayName || '');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, session?.displayName]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  const completeVerifiedLogin = useCallback(
    async (user: User, preferredName?: string) => {
      const resolvedName = sanitizeDisplayName(
        preferredName || user.displayName,
        user.email || 'operator@neonworldclock.app'
      );

      if (user.displayName !== resolvedName) {
        try {
          await updateProfile(user, { displayName: resolvedName });
        } catch {
          // Non-fatal if profile name update fails
        }
      }

      const savedProfile = await syncVerifiedUserProfile(user, resolvedName);
      if (savedProfile?.isBanned) {
        if (auth) {
          try {
            await signOut(auth);
          } catch {
            // ignore
          }
        }
        onAccountBanned?.((user.email || '').toLowerCase());
        setErrorState({ message: 'Your account has been suspended by Admin.' });
        return;
      }
      if (savedProfile) {
        setFirestoreProfile(savedProfile);
        setEditingName(savedProfile.displayName);
      }

      const verifiedSession: AuthSession = {
        uid: user.uid,
        email: (user.email || '').toLowerCase(),
        displayName: savedProfile?.displayName || resolvedName,
        emailVerified: true,
        loggedInAt: new Date().toISOString(),
        provider: 'firebase',
      };
      saveActiveSession(verifiedSession);
      setPendingEmail(null);
      setErrorState(null);
      setStatusMessage('Email verified! Your profile is synced to Cloud Firestore.');
      onSessionVerified(verifiedSession);
    },
    [onSessionVerified, onAccountBanned]
  );

  // Check Firebase Auth reload() for verification status (manual button + auto tab focus + interval)
  const checkVerificationStatus = useCallback(
    async (manualTrigger: boolean) => {
      if (!auth?.currentUser || checkingRef.current) return;
      checkingRef.current = true;
      if (manualTrigger) {
        setCheckingVerification(true);
        setErrorState(null);
        setStatusMessage(null);
      }

      try {
        await reload(auth.currentUser);
        const refreshed = auth.currentUser;
        if (refreshed && refreshed.emailVerified) {
          await completeVerifiedLogin(refreshed, pendingDisplayName || displayName);
        } else if (manualTrigger) {
          setErrorState({
            message:
              'Your email is not verified yet. Please click the verification link in your inbox (and check Spam/Junk), then tap Check Verification again.',
          });
        }
      } catch (err) {
        if (manualTrigger) {
          setErrorState(mapFirebaseAuthError(err));
        }
      } finally {
        checkingRef.current = false;
        if (manualTrigger) setCheckingVerification(false);
      }
    },
    [completeVerifiedLogin, displayName, pendingDisplayName]
  );

  // Automatic verification check when returning to tab or every 5s while waiting on verification
  useEffect(() => {
    if (!pendingEmail || !auth?.currentUser) return;

    const handleReturn = () => {
      if (document.visibilityState === 'visible') {
        void checkVerificationStatus(false);
      }
    };

    window.addEventListener('focus', handleReturn);
    document.addEventListener('visibilitychange', handleReturn);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkVerificationStatus(false);
      }
    }, 5000);

    return () => {
      window.removeEventListener('focus', handleReturn);
      document.removeEventListener('visibilitychange', handleReturn);
      window.clearInterval(intervalId);
    };
  }, [pendingEmail, checkVerificationStatus]);

  const handleResendVerification = async () => {
    if (!auth?.currentUser || resendingEmail || resendCooldown > 0) return;
    setResendingEmail(true);
    setErrorState(null);
    setStatusMessage(null);
    try {
      await sendEmailVerification(auth.currentUser);
      setResendCooldown(30);
      setStatusMessage(
        `Verification email sent to ${auth.currentUser.email}. Check your inbox and spam folder.`
      );
    } catch (err) {
      setErrorState(mapFirebaseAuthError(err));
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorState(null);
    setStatusMessage(null);

    if (!isFirebaseConfigured || !auth) {
      setErrorState({
        message:
          'Firebase is not configured yet. Add VITE_FIREBASE_* keys in your hosting environment variables to enable cloud accounts.',
      });
      return;
    }

    if (!emailValid) {
      setErrorState({ message: 'Please enter a valid email address.' });
      return;
    }

    if (tab === 'signup') {
      const cleanName = displayName.trim();
      if (cleanName.length < 1 || cleanName.length > 80) {
        setErrorState({ message: 'Please enter a display name (1–80 characters).' });
        return;
      }
      if (password.length < 6) {
        setErrorState({ message: 'Password must be at least 6 characters long.' });
        return;
      }
    } else if (!password) {
      setErrorState({ message: 'Please enter your password.' });
      return;
    }

    setSubmitting(true);
    try {
      if (tab === 'signup') {
        const cleanName = sanitizeDisplayName(displayName, emailTrimmed);
        const cred = await createUserWithEmailAndPassword(auth, emailTrimmed, password);
        await updateProfile(cred.user, { displayName: cleanName });
        await sendEmailVerification(cred.user);

        setPendingDisplayName(cleanName);
        setPendingEmail(cred.user.email || emailTrimmed);
        setResendCooldown(30);
        setPassword('');
        setStatusMessage(
          `Verification link sent to ${cred.user.email || emailTrimmed}. Verify your email to sign in automatically.`
        );
      } else {
        const cred = await signInWithEmailAndPassword(auth, emailTrimmed, password);
        await reload(cred.user);
        const current = auth.currentUser || cred.user;

        if (!current.emailVerified) {
          setPendingDisplayName(current.displayName || '');
          setPendingEmail(current.email || emailTrimmed);
          setPassword('');
          setErrorState({
            message:
              'Your email address has not been verified yet. Please check your inbox or resend the verification email below.',
          });
          return;
        }

        await completeVerifiedLogin(current);
        setPassword('');
      }
    } catch (err) {
      setErrorState(mapFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.currentUser || !auth.currentUser.emailVerified || savingName) return;
    const clean = editingName.trim().slice(0, 80);
    if (!clean) {
      setErrorState({ message: 'Display name cannot be empty.' });
      return;
    }
    setSavingName(true);
    setErrorState(null);
    setStatusMessage(null);
    try {
      await updateProfile(auth.currentUser, { displayName: clean });
      const updated = await syncVerifiedUserProfile(auth.currentUser, clean);
      if (updated) {
        setFirestoreProfile(updated);
      }
      const refreshedSession: AuthSession = {
        uid: auth.currentUser.uid,
        email: (auth.currentUser.email || '').toLowerCase(),
        displayName: clean,
        emailVerified: true,
        loggedInAt: session?.loggedInAt || new Date().toISOString(),
        provider: 'firebase',
      };
      saveActiveSession(refreshedSession);
      onSessionVerified(refreshedSession);
      setStatusMessage('Display name updated and saved to Firestore.');
    } catch (err) {
      setErrorState(mapFirebaseAuthError(err));
    } finally {
      setSavingName(false);
    }
  };

  const handleUseDifferentAccount = async () => {
    setPendingEmail(null);
    setPendingDisplayName('');
    setErrorState(null);
    setStatusMessage(null);
    if (auth?.currentUser) {
      try {
        await signOut(auth);
      } catch {
        // Ignore
      }
    }
  };

  const strengthColors: Record<number, string> = {
    0: 'bg-slate-800',
    1: 'bg-rose-500',
    2: 'bg-amber-400',
    3: 'bg-sky-400',
    4: 'bg-emerald-400',
  };

  const isVerifiedSignedIn = Boolean(
    firebaseUser && firebaseUser.emailVerified && session?.provider === 'firebase'
  );

  const createdAtDisplay = firestoreProfile?.createdAt?.toDate
    ? firestoreProfile.createdAt.toDate().toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : session?.loggedInAt
      ? new Date(session.loggedInAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'Synced';

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      {/* Safe Config Notice if Firebase env keys are not set */}
      {!isFirebaseConfigured && (
        <div
          role="status"
          className="rounded-3xl border border-amber-400/35 bg-amber-500/10 p-5 text-xs leading-relaxed text-amber-100"
        >
          <p className="font-bold text-amber-200">Firebase Configuration Required</p>
          <p className="mt-1 text-amber-100/90">
            Firebase keys are not set yet. Configure{' '}
            <code className="rounded bg-black/30 px-1 py-0.5 text-amber-200">
              VITE_FIREBASE_API_KEY
            </code>
            ,{' '}
            <code className="rounded bg-black/30 px-1 py-0.5 text-amber-200">
              VITE_FIREBASE_AUTH_DOMAIN
            </code>
            ,{' '}
            <code className="rounded bg-black/30 px-1 py-0.5 text-amber-200">
              VITE_FIREBASE_PROJECT_ID
            </code>
            ,{' '}
            <code className="rounded bg-black/30 px-1 py-0.5 text-amber-200">
              VITE_FIREBASE_STORAGE_BUCKET
            </code>
            ,{' '}
            <code className="rounded bg-black/30 px-1 py-0.5 text-amber-200">
              VITE_FIREBASE_MESSAGING_SENDER_ID
            </code>
            , and{' '}
            <code className="rounded bg-black/30 px-1 py-0.5 text-amber-200">
              VITE_FIREBASE_APP_ID
            </code>{' '}
            in your environment to enable Firebase Authentication and Firestore profile sync.
          </p>
        </div>
      )}

      {/* STATE A: Verified Signed-In Cloud Profile */}
      {isVerifiedSignedIn && firebaseUser ? (
        <section className="rounded-3xl border border-emerald-400/30 bg-[#071022]/95 p-6 shadow-[0_24px_70px_-22px_rgba(16,185,129,0.3)] sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/15 text-emerald-300">
                <UserCheck className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Email Verified
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300">
                    <Database className="h-3.5 w-3.5" aria-hidden="true" />
                    Firestore Synced
                  </span>
                </div>
                <h1 className="mt-1.5 truncate text-xl font-bold text-white sm:text-2xl">
                  {firestoreProfile?.displayName ||
                    firebaseUser.displayName ||
                    session?.displayName ||
                    'Verified Operator'}
                </h1>
                <p className="truncate text-xs text-slate-300 sm:text-sm">{firebaseUser.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void onSignOut()}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-400/35 bg-rose-500/15 px-4 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/25 hover:text-white"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Subscription Plan Banner */}
          {(() => {
            const effectiveProfile = userProfile || firestoreProfile;
            const proActiveNow = isProUser || isProActive(effectiveProfile);
            const daysRemaining = getDaysRemaining(effectiveProfile?.proExpiresAt);
            return (
              <div
                className={`mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
                  proActiveNow
                    ? 'border-cyan-400/40 bg-gradient-to-r from-cyan-500/15 via-slate-950/90 to-fuchsia-500/15'
                    : 'border-white/10 bg-slate-950/75'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                      proActiveNow
                        ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                        : 'border-white/15 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <Crown className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-white">
                      {proActiveNow ? 'Neon World Clock Pro Active' : 'Free Plan Active'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {proActiveNow
                        ? effectiveProfile?.proExpiresAt
                          ? `${daysRemaining} days remaining · Expires ${formatShortDate(effectiveProfile.proExpiresAt)}`
                          : 'All 215 countries, Live TV, Radio, Entertainment & Movies unlocked'
                        : 'First 100 countries + 4 Live TV, Radio, Entertainment & Movies free'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasLastReceipt && onViewLastReceipt && (
                    <button
                      type="button"
                      onClick={onViewLastReceipt}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
                    >
                      <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
                      Receipt
                    </button>
                  )}
                  {!proActiveNow && onOpenUpgrade && (
                    <button
                      type="button"
                      onClick={onOpenUpgrade}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.35)] hover:brightness-110"
                    >
                      <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                      Upgrade to Pro
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Firestore Profile Record Summary */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-slate-950/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Firestore Document Path
              </p>
              <p className="mt-1 truncate font-mono text-xs text-cyan-300">
                users/{firebaseUser.uid}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-slate-950/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Account Created
              </p>
              <p className="mt-1 text-xs font-semibold text-white">
                {loadingProfile ? 'Loading profile…' : createdAtDisplay}
              </p>
            </div>
          </div>

          {/* Update Display Name Form */}
          <form onSubmit={handleSaveDisplayName} className="mt-5 space-y-3 rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4">
            <label htmlFor="profile-display-name" className="block text-xs font-semibold text-slate-200">
              Display Name
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                id="profile-display-name"
                type="text"
                maxLength={80}
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Your display name"
                className="h-10 flex-1 rounded-xl border border-white/12 bg-slate-950/85 px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              />
              <button
                type="submit"
                disabled={savingName}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 text-xs font-bold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-50 whitespace-nowrap"
              >
                {savingName ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>Save Name</span>
              </button>
            </div>
          </form>

          {statusMessage && (
            <div
              role="status"
              className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/12 px-3.5 py-2.5 text-xs text-emerald-200"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorState && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/35 bg-rose-500/12 px-3.5 py-2.5 text-xs text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              <span>{errorState.message}</span>
            </div>
          )}

          {/* Quick Navigation */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenDashboard}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 px-4 text-xs font-bold text-slate-950 transition-all hover:brightness-105"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              <span>Open User Dashboard</span>
            </button>
            <button
              type="button"
              onClick={onBackToGlobe}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/14 bg-white/[0.06] px-4 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"
            >
              <Globe2 className="h-4 w-4 text-sky-400" aria-hidden="true" />
              <span>Return to 3D Globe</span>
            </button>
          </div>
        </section>
      ) : pendingEmail ? (
        /* STATE B: Check Your Inbox & Verify Email */
        <section className="rounded-3xl border border-cyan-400/35 bg-[#071022]/95 p-6 text-center shadow-[0_24px_70px_-22px_rgba(34,211,238,0.3)] sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-500/15 text-cyan-300">
            <MailCheck className="h-8 w-8" aria-hidden="true" />
          </div>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
            Email Verification Required
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Check your inbox and verify your email
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-300 sm:text-sm">
            We sent a verification link to{' '}
            <span className="font-semibold text-white">{pendingEmail}</span>. Open the link in your
            email, then return to this tab — we will automatically complete your sign-in and save
            your profile to Firestore.
          </p>

          {statusMessage && (
            <div
              role="status"
              className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/12 px-4 py-2.5 text-xs text-emerald-200"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorState && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-400/35 bg-rose-500/12 px-4 py-3 text-left text-xs text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              <span>{errorState.message}</span>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => void checkVerificationStatus(true)}
              disabled={checkingVerification}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 px-6 text-sm font-bold text-slate-950 shadow-[0_0_28px_-6px_rgba(34,211,238,0.75)] transition-all hover:brightness-105 disabled:opacity-60"
            >
              {checkingVerification ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              <span>
                {checkingVerification ? 'Checking Verification…' : 'Check Verification / Continue'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void handleResendVerification()}
              disabled={resendingEmail || resendCooldown > 0}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/[0.06] px-5 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/[0.12] disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 text-cyan-400 ${resendingEmail ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend Verification Email'}
              </span>
            </button>
          </div>

          <div className="mt-6 border-t border-white/[0.08] pt-4">
            <button
              type="button"
              onClick={() => void handleUseDifferentAccount()}
              className="text-xs font-medium text-slate-400 underline underline-offset-4 hover:text-white"
            >
              Sign out or use a different email address
            </button>
          </div>
        </section>
      ) : (
        /* STATE C: Sign Up / Sign In Form */
        <section className="rounded-3xl border border-sky-400/25 bg-[#071022]/95 p-6 shadow-[0_24px_80px_-20px_rgba(14,165,233,0.28)] sm:p-8">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              Neon World Clock · Cloud Account
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              {tab === 'signup' ? 'Create Your Account' : 'Sign In to Your Account'}
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400 sm:text-sm">
              {tab === 'signup'
                ? 'Sign up with Email & Password, verify your inbox, and sync your profile to Firestore.'
                : 'Welcome back. Sign in with your verified Email & Password.'}
            </p>
          </div>

          {/* Segmented Tabs: Sign Up / Sign In */}
          <div
            role="tablist"
            aria-label="Account mode"
            className="mt-6 grid grid-cols-2 rounded-2xl border border-white/[0.08] bg-slate-900/90 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'signup'}
              onClick={() => {
                setTab('signup');
                setErrorState(null);
                setStatusMessage(null);
              }}
              className={`rounded-xl py-2.5 text-xs font-semibold transition-all ${
                tab === 'signup'
                  ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/35'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'signin'}
              onClick={() => {
                setTab('signin');
                setErrorState(null);
                setStatusMessage(null);
              }}
              className={`rounded-xl py-2.5 text-xs font-semibold transition-all ${
                tab === 'signin'
                  ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/35'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            {/* Display Name (Sign Up only) */}
            {tab === 'signup' && (
              <div className="space-y-1.5">
                <label htmlFor="account-display-name" className="block text-xs font-medium text-slate-300">
                  Display Name
                </label>
                <div className="relative">
                  <UserIcon
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500"
                    aria-hidden="true"
                  />
                  <input
                    id="account-display-name"
                    type="text"
                    autoComplete="name"
                    maxLength={80}
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (errorState) setErrorState(null);
                    }}
                    placeholder="Vidusha Nawood"
                    className="h-11 w-full rounded-xl border border-white/12 bg-slate-900/80 pr-4 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="account-email" className="block text-xs font-medium text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="account-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorState) setErrorState(null);
                  }}
                  placeholder="you@example.com"
                  aria-invalid={emailTouched && !emailValid}
                  className={`h-11 w-full rounded-xl border bg-slate-900/80 pr-4 pl-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
                    emailTouched && !emailValid
                      ? 'border-rose-400/60 focus:border-rose-400 focus:ring-rose-400/20'
                      : 'border-white/12 focus:border-sky-400 focus:ring-sky-400/20'
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="account-password" className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                {tab === 'signup' && password.length > 0 && (
                  <span className="text-[11px] font-semibold text-cyan-300">
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
                  id="account-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorState) setErrorState(null);
                  }}
                  placeholder={tab === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                  className="h-11 w-full rounded-xl border border-white/12 bg-slate-900/80 pr-11 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.08] hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {tab === 'signup' && (
                <div className="grid grid-cols-4 gap-1.5 pt-1" aria-hidden="true">
                  {[1, 2, 3, 4].map((seg) => (
                    <div
                      key={seg}
                      className={`h-1 rounded-full transition-colors ${
                        strength.score >= seg ? strengthColors[strength.score] : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {errorState && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rose-400/35 bg-rose-500/12 px-3.5 py-3 text-xs text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                <div className="flex-1 space-y-1">
                  <p>{errorState.message}</p>
                  {errorState.suggestTab && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab(errorState.suggestTab!);
                        setErrorState(null);
                      }}
                      className="font-semibold text-sky-300 underline underline-offset-2 hover:text-sky-200"
                    >
                      {errorState.suggestTab === 'signin' ? 'Switch to Sign In' : 'Switch to Sign Up'}
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !isFirebaseConfigured}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 text-sm font-bold text-slate-950 shadow-[0_0_28px_-6px_rgba(34,211,238,0.7)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>{tab === 'signup' ? 'Creating Account…' : 'Signing In…'}</span>
                </>
              ) : (
                <>
                  <span>{tab === 'signup' ? 'Sign Up & Verify Email' : 'Sign In'}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-500">
            Powered by Firebase Authentication &amp; Cloud Firestore
            {firebaseProjectId ? ` (${firebaseProjectId})` : ''}. Passwords are never stored in
            Firestore.
          </p>
        </section>
      )}
    </div>
  );
};
