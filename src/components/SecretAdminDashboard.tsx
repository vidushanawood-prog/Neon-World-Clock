import React, { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Crown,
  LogOut,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  adminDeleteUserProfile,
  adminSetUserBanned,
  adminSetUserPlan,
  BOOTSTRAPPED_ADMIN_EMAIL,
  subscribeToAllUsers,
  type FirestoreUserProfile,
} from '../lib/firebase';
import { formatShortDate, getDaysRemaining, isProActive } from '../services/subscription';

interface SecretAdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string | null;
  currentUserUid: string | null;
  onSignOutAndSwitch?: () => void;
}

export const SecretAdminDashboard: React.FC<SecretAdminDashboardProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  currentUserUid,
  onSignOutAndSwitch,
}) => {
  const [users, setUsers] = useState<FirestoreUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'pro' | 'free' | 'banned'>('all');
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<FirestoreUserProfile | null>(null);

  const isSignedInAsAdmin =
    Boolean(currentUserEmail) &&
    currentUserEmail?.trim().toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSyncError(null);

    const unsubscribe = subscribeToAllUsers(
      (list) => {
        setUsers(list);
        setLoading(false);
        setSyncError(null);
      },
      (err) => {
        setLoading(false);
        const msg = err?.message || 'Unable to sync users from Firestore.';
        if (msg.toLowerCase().includes('permission')) {
          setSyncError(
            `Firestore Admin access is restricted to verified owner account (${BOOTSTRAPPED_ADMIN_EMAIL}). Please sign in with your admin email to manage live users.`
          );
        } else {
          setSyncError(msg);
        }
      }
    );

    return () => unsubscribe();
  }, [isOpen, currentUserEmail]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const stats = useMemo(() => {
    const total = users.length;
    const pro = users.filter((u) => isProActive(u)).length;
    const banned = users.filter((u) => Boolean(u.isBanned)).length;
    const free = total - pro;
    return { total, pro, free, banned };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (filterTab === 'pro' && !isProActive(u)) return false;
      if (filterTab === 'free' && isProActive(u)) return false;
      if (filterTab === 'banned' && !u.isBanned) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, filterTab]);

  if (!isOpen) return null;

  const handleTogglePlan = async (target: FirestoreUserProfile) => {
    setBusyUid(target.uid);
    const nextPlan = isProActive(target) ? 'free' : 'pro';
    try {
      await adminSetUserPlan(target, nextPlan);
      setToast({
        kind: 'ok',
        text:
          nextPlan === 'pro'
            ? `${target.email} upgraded to Neon Pro (30 Days) — celebration queued!`
            : `${target.email} downgraded to Free Plan.`,
      });
    } catch (err) {
      setToast({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Failed to update plan.',
      });
    } finally {
      setBusyUid(null);
    }
  };

  const handleToggleBan = async (target: FirestoreUserProfile) => {
    if (target.uid === currentUserUid) {
      setToast({ kind: 'err', text: 'You cannot ban your own active Admin account.' });
      return;
    }
    setBusyUid(target.uid);
    const nextBanned = !target.isBanned;
    try {
      await adminSetUserBanned(target, nextBanned);
      setToast({
        kind: 'ok',
        text: nextBanned
          ? `${target.email} has been banned and locked out immediately.`
          : `${target.email} has been unbanned.`,
      });
    } catch (err) {
      setToast({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Failed to update ban status.',
      });
    } finally {
      setBusyUid(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteUser) return;
    if (confirmDeleteUser.uid === currentUserUid) {
      setToast({ kind: 'err', text: 'You cannot remove your own active Admin account.' });
      setConfirmDeleteUser(null);
      return;
    }
    const target = confirmDeleteUser;
    setConfirmDeleteUser(null);
    setBusyUid(target.uid);
    try {
      await adminDeleteUserProfile(target.uid);
      setToast({ kind: 'ok', text: `Removed user record for ${target.email}.` });
    } catch (err) {
      setToast({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Failed to remove user.',
      });
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[115] flex flex-col bg-slate-950/98 text-slate-100 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Secret Admin Dashboard"
    >
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 bg-slate-950/90 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-fuchsia-400/40 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-fuchsia-500/25 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.3)]">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white sm:text-lg">
                Neon Admin Command Center
              </h1>
              <span className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Live Firestore
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time user subscriptions, 30-day Pro grants &amp; moderation controls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUserEmail && (
            <span className="hidden rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 sm:inline-block">
              Signed in: <strong className="text-cyan-300">{currentUserEmail}</strong>
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/50 hover:text-white"
          >
            <X className="h-4 w-4" />
            Exit Admin
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          {/* Toast notification */}
          {toast && (
            <div
              className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-medium shadow-lg ${
                toast.kind === 'ok'
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-rose-500/40 bg-rose-500/15 text-rose-200'
              }`}
            >
              {toast.kind === 'ok' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <ShieldAlert className="h-4 w-4 shrink-0" />
              )}
              <span>{toast.text}</span>
            </div>
          )}

          {/* KPI Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Total Users</span>
                <Users className="h-4 w-4 text-sky-400" />
              </div>
              <div className="mt-2 font-mono text-2xl font-black text-white">{stats.total}</div>
            </div>
            <div className="rounded-2xl border border-cyan-400/25 bg-cyan-950/25 p-4">
              <div className="flex items-center justify-between text-xs text-cyan-300">
                <span>Active Pro</span>
                <Crown className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-2 font-mono text-2xl font-black text-cyan-200">{stats.pro}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Free Plan</span>
                <Sparkles className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2 font-mono text-2xl font-black text-slate-200">{stats.free}</div>
            </div>
            <div className="rounded-2xl border border-rose-500/25 bg-rose-950/20 p-4">
              <div className="flex items-center justify-between text-xs text-rose-300">
                <span>Banned</span>
                <Ban className="h-4 w-4 text-rose-400" />
              </div>
              <div className="mt-2 font-mono text-2xl font-black text-rose-200">{stats.banned}</div>
            </div>
          </div>

          {/* Permission / Non-Admin Session Notice */}
          {syncError && (
            <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 p-5 text-sm text-amber-100">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div className="space-y-2">
                  <p className="font-semibold text-amber-200">Admin Account Authentication Required</p>
                  <p className="text-xs leading-relaxed text-amber-100/90">{syncError}</p>
                  {!isSignedInAsAdmin && onSignOutAndSwitch && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSignOutAndSwitch();
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-300"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Switch to Admin Account
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search + Filter Controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by email, name, or UID..."
                className="w-full rounded-2xl border border-white/15 bg-slate-900/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: `All (${stats.total})` },
                  { id: 'pro', label: `Pro (${stats.pro})` },
                  { id: 'free', label: `Free (${stats.free})` },
                  { id: 'banned', label: `Banned (${stats.banned})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    filterTab === tab.id
                      ? 'border border-cyan-400/50 bg-cyan-500/20 text-cyan-200'
                      : 'border border-white/10 bg-slate-900/80 text-slate-400 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Table / List */}
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-10 text-center text-sm text-slate-400">
              Connecting to Firestore user directory...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-10 text-center text-sm text-slate-400">
              {syncError ? 'Sign in as Admin to load user records.' : 'No matching users found.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => {
                const proNow = isProActive(u);
                const daysLeft = getDaysRemaining(u.proExpiresAt);
                const isSelf = u.uid === currentUserUid;
                const isBusy = busyUid === u.uid;

                return (
                  <div
                    key={u.uid}
                    className={`flex flex-col justify-between gap-4 rounded-2xl border p-4 transition lg:flex-row lg:items-center ${
                      u.isBanned
                        ? 'border-rose-500/40 bg-rose-950/15'
                        : proNow
                          ? 'border-cyan-400/30 bg-slate-900/80 shadow-[0_0_24px_rgba(34,211,238,0.08)]'
                          : 'border-white/10 bg-slate-900/60'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-bold text-white">{u.displayName}</span>
                        {proNow ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                            <Crown className="h-3 w-3" />
                            PRO · {daysLeft}d left
                          </span>
                        ) : (
                          <span className="rounded-lg border border-white/15 bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                            FREE
                          </span>
                        )}
                        {u.isBanned && (
                          <span className="rounded-lg border border-rose-500/50 bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-300">
                            BANNED
                          </span>
                        )}
                        {isSelf && (
                          <span className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-300">
                            You (Admin)
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span className="font-mono text-slate-300">{u.email}</span>
                        <span className="text-slate-600">•</span>
                        <span className="font-mono text-[11px] text-slate-500">UID: {u.uid}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        <span>
                          Method:{' '}
                          <strong className="text-slate-200 uppercase">
                            {u.activationMethod || 'none'}
                          </strong>
                        </span>
                        {proNow && u.proExpiresAt && (
                          <span>
                            Expires:{' '}
                            <strong className="text-cyan-300">{formatShortDate(u.proExpiresAt)}</strong>
                          </span>
                        )}
                        {u.createdAt?.toMillis && (
                          <span>
                            Joined:{' '}
                            <strong className="text-slate-300">
                              {formatShortDate(u.createdAt.toMillis())}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleTogglePlan(u)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition disabled:opacity-50 ${
                          proNow
                            ? 'border border-slate-600 bg-slate-800 text-slate-200 hover:border-amber-400/50 hover:text-amber-200'
                            : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.35)] hover:brightness-110'
                        }`}
                      >
                        <Crown className="h-3.5 w-3.5" />
                        {proNow ? 'Downgrade to Free' : 'Make Pro (30 Days)'}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy || isSelf}
                        onClick={() => void handleToggleBan(u)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          u.isBanned
                            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                            : 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                        }`}
                      >
                        {u.isBanned ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            Unban
                          </>
                        ) : (
                          <>
                            <Ban className="h-3.5 w-3.5" />
                            Ban User
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy || isSelf}
                        onClick={() => setConfirmDeleteUser(u)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* In-App Delete Confirmation Modal */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/40 bg-slate-950 p-6 shadow-[0_0_40px_rgba(244,63,94,0.25)]">
            <div className="flex items-center gap-3 text-rose-300">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/15">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove User Account?</h3>
                <p className="text-xs text-slate-400">This deletes their Firestore record and revokes access.</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-xs text-slate-300">
              <p className="font-semibold text-white">{confirmDeleteUser.displayName}</p>
              <p className="font-mono text-slate-400">{confirmDeleteUser.email}</p>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="flex-1 rounded-xl border border-white/15 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:bg-rose-500"
              >
                Yes, Remove User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
