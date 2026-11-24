import React from 'react';
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  Clock,
  Coins,
  Globe2,
  LogOut,
  Moon,
  Plane,
  ShieldCheck,
  Star,
  Sun,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import type { Country } from '../data/countries';
import { formatClockForZone } from '../utils/time';
import { getRegisteredAccountCount, type AuthSession } from '../utils/auth';
import type { WorldAlarm } from './AlarmModal';

interface UserDashboardSectionProps {
  session: AuthSession | null;
  pinnedCountries: readonly Country[];
  focusedCountry: Country;
  alarms: readonly WorldAlarm[];
  hourlyChimeEnabled: boolean;
  displayDate: Date;
  is24Hour: boolean;
  clockView: 'digital' | 'analog';
  tempUnit: 'C' | 'F';
  isDark: boolean;
  onBackToGlobe: () => void;
  onOpenCrypto: () => void;
  onOpenCountry: (country: Country) => void;
  onOpenAlarms: () => void;
  onOpenJetLag: () => void;
  onOpenCompare: () => void;
  onToggle24Hour: () => void;
  onToggleClockView: () => void;
  onToggleTempUnit: () => void;
  onToggleTheme: () => void;
  onToggleHourlyChime: () => void;
  onSwitchAccount: () => void;
  onLogout: () => void;
}

export const UserDashboardSection: React.FC<UserDashboardSectionProps> = ({
  session,
  pinnedCountries,
  focusedCountry,
  alarms,
  hourlyChimeEnabled,
  displayDate,
  is24Hour,
  clockView,
  tempUnit,
  isDark,
  onBackToGlobe,
  onOpenCrypto,
  onOpenCountry,
  onOpenAlarms,
  onOpenJetLag,
  onOpenCompare,
  onToggle24Hour,
  onToggleClockView,
  onToggleTempUnit,
  onToggleTheme,
  onToggleHourlyChime,
  onSwitchAccount,
  onLogout,
}) => {
  const activeAlarmsCount = alarms.filter((a) => a.enabled).length;
  const totalLocalAccounts = getRegisteredAccountCount();
  const signedInAtLabel = session?.loggedInAt
    ? new Date(session.loggedInAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Guest Session';

  const focusedClock = formatClockForZone(displayDate, focusedCountry.timezone, is24Hour);

  return (
    <section
      aria-label="vidushanawood Account User Dashboard"
      className="space-y-6 pb-8"
    >
      {/* Top Header Strip */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-sky-400/25 bg-[#070f21]/92 p-5 text-slate-100 shadow-[0_20px_60px_-24px_rgba(14,165,233,0.35)] sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/35 bg-gradient-to-br from-sky-500/25 via-cyan-500/20 to-indigo-500/25 text-sky-300">
            <UserCheck className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
              vidushanawood Account · User Dashboard
            </p>
            <h2 className="mt-0.5 truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
              {session ? session.email : 'Operator Profile'}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                SHA-256 Local Vault Active
              </span>
              <span aria-hidden="true">·</span>
              <span>Signed in {signedInAtLabel}</span>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <span className="hidden sm:inline">
                {totalLocalAccounts} saved {totalLocalAccounts === 1 ? 'account' : 'accounts'} on device
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onBackToGlobe}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.06] px-3.5 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/[0.12]"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
            <span>Globe &amp; Clocks</span>
          </button>

          <button
            type="button"
            onClick={onSwitchAccount}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-sky-400/35 bg-sky-500/15 px-3.5 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/25 hover:text-white"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Switch / Sign Up</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-rose-400/35 bg-rose-500/12 px-3.5 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/22 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Key Operator Summary Metrics */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.09] bg-[#081226]/90 p-4 text-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Pinned Favorites</span>
            <Star className="h-4 w-4 text-amber-400" fill="currentColor" aria-hidden="true" />
          </div>
          <p className="tabular-clock mt-2 text-2xl font-bold text-white">
            {pinnedCountries.length}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Synced locally in browser</p>
        </div>

        <button
          type="button"
          onClick={onOpenAlarms}
          className="rounded-2xl border border-white/[0.09] bg-[#081226]/90 p-4 text-left text-slate-100 transition-colors hover:border-amber-400/35 hover:bg-[#0b1831]"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Alarms</span>
            <Bell className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </div>
          <p className="tabular-clock mt-2 text-2xl font-bold text-white">{activeAlarmsCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Hourly chime: {hourlyChimeEnabled ? 'Enabled' : 'Off'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onOpenCountry(focusedCountry)}
          className="rounded-2xl border border-white/[0.09] bg-[#081226]/90 p-4 text-left text-slate-100 transition-colors hover:border-sky-400/35 hover:bg-[#0b1831]"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Focused Nation</span>
            <Globe2 className="h-4 w-4 text-sky-400" aria-hidden="true" />
          </div>
          <p className="mt-2 truncate text-lg font-bold text-white">{focusedCountry.name}</p>
          <p className="tabular-clock mt-1 text-[11px] text-sky-300">
            {focusedClock.hours}:{focusedClock.minutes}
            {!is24Hour && focusedClock.dayPeriod ? ` ${focusedClock.dayPeriod}` : ''} ·{' '}
            {focusedCountry.capital}
          </p>
        </button>

        <button
          type="button"
          onClick={onOpenCrypto}
          className="rounded-2xl border border-white/[0.09] bg-[#081226]/90 p-4 text-left text-slate-100 transition-colors hover:border-cyan-400/35 hover:bg-[#0b1831]"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Crypto Live Desk</span>
            <Coins className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          </div>
          <p className="mt-2 text-lg font-bold text-white">USD &amp; LKR</p>
          <p className="mt-1 text-[11px] text-slate-400">Open live crypto ticker</p>
        </button>
      </div>

      {/* Two-Column Main Grid: Pinned Countries Quick Launch + Workspace Preferences */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Pinned Countries Quick Launch */}
        <div className="rounded-3xl border border-white/[0.09] bg-[#070f21]/90 p-5 text-slate-100 lg:col-span-7">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-3.5">
            <div>
              <h3 className="text-sm font-bold text-white">Pinned Countries Quick Launch</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Tap any pinned region to open its full-screen country view &amp; live telemetry
              </p>
            </div>
            <span className="tabular-clock text-xs font-semibold text-sky-300">
              {pinnedCountries.length} pinned
            </span>
          </div>

          {pinnedCountries.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-300">No pinned countries yet.</p>
              <button
                type="button"
                onClick={onBackToGlobe}
                className="mt-3 rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
              >
                Explore 215 Regions
              </button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {pinnedCountries.map((country) => {
                const c = formatClockForZone(displayDate, country.timezone, is24Hour);
                return (
                  <button
                    key={country.iso}
                    type="button"
                    onClick={() => onOpenCountry(country)}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-slate-900/65 px-3.5 py-3 text-left transition-colors hover:border-sky-400/40 hover:bg-slate-900"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={`https://flagcdn.com/w80/${country.iso}.png`}
                        alt={`Flag of ${country.name}`}
                        width={32}
                        height={22}
                        referrerPolicy="no-referrer"
                        className="h-5.5 w-8 shrink-0 rounded object-cover ring-1 ring-white/15"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{country.name}</p>
                        <p className="truncate text-[11px] text-slate-400">
                          {country.capital} · {c.utcOffset}
                        </p>
                      </div>
                    </div>
                    <div className="tabular-clock shrink-0 text-right">
                      <p className="text-sm font-bold text-sky-300">
                        {c.hours}:{c.minutes}
                        {!is24Hour && c.dayPeriod ? ` ${c.dayPeriod}` : ''}
                      </p>
                      <p className="text-[10px] text-slate-400">{c.isDaytime ? 'Day' : 'Night'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Display Preferences & Quick Command Tools */}
        <div className="space-y-4 rounded-3xl border border-white/[0.09] bg-[#070f21]/90 p-5 text-slate-100 lg:col-span-5">
          <div className="border-b border-white/[0.07] pb-3.5">
            <h3 className="text-sm font-bold text-white">Operator Preferences &amp; Tools</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Preferences persist automatically to your browser profile
            </p>
          </div>

          <div className="divide-y divide-white/[0.07] text-xs">
            <div className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-2 text-slate-300">
                <Clock className="h-4 w-4 text-sky-400" aria-hidden="true" />
                Clock Face Style
              </span>
              <button
                type="button"
                onClick={onToggleClockView}
                className="rounded-lg border border-white/12 bg-white/[0.06] px-3 py-1 font-semibold text-white hover:bg-white/[0.12]"
              >
                {clockView === 'digital' ? 'Digital' : 'Analog'}
              </button>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-300">Time Format</span>
              <button
                type="button"
                onClick={onToggle24Hour}
                className="rounded-lg border border-white/12 bg-white/[0.06] px-3 py-1 font-semibold text-white hover:bg-white/[0.12]"
              >
                {is24Hour ? '24-Hour' : '12-Hour'}
              </button>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-300">Temperature Unit</span>
              <button
                type="button"
                onClick={onToggleTempUnit}
                className="rounded-lg border border-white/12 bg-white/[0.06] px-3 py-1 font-semibold text-white hover:bg-white/[0.12]"
              >
                °{tempUnit}
              </button>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-2 text-slate-300">
                {isDark ? (
                  <Moon className="h-4 w-4 text-indigo-300" aria-hidden="true" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-300" aria-hidden="true" />
                )}
                Interface Theme
              </span>
              <button
                type="button"
                onClick={onToggleTheme}
                className="rounded-lg border border-white/12 bg-white/[0.06] px-3 py-1 font-semibold text-white hover:bg-white/[0.12]"
              >
                {isDark ? 'Neon Dark' : 'Light'}
              </button>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-2 text-slate-300">
                <Bell className="h-4 w-4 text-amber-400" aria-hidden="true" />
                Hourly Chime
              </span>
              <button
                type="button"
                onClick={onToggleHourlyChime}
                className={`rounded-lg border px-3 py-1 font-semibold transition-colors ${
                  hourlyChimeEnabled
                    ? 'border-emerald-400/40 bg-emerald-500/18 text-emerald-200'
                    : 'border-white/12 bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]'
                }`}
              >
                {hourlyChimeEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              type="button"
              onClick={onOpenJetLag}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.09] bg-slate-900/70 py-3 text-xs font-semibold text-slate-200 hover:border-sky-400/35 hover:text-white"
            >
              <Plane className="h-4 w-4 text-sky-400" aria-hidden="true" />
              <span>Jet Lag</span>
            </button>
            <button
              type="button"
              onClick={onOpenAlarms}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.09] bg-slate-900/70 py-3 text-xs font-semibold text-slate-200 hover:border-amber-400/35 hover:text-white"
            >
              <Bell className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <span>Alarms</span>
            </button>
            <button
              type="button"
              onClick={onOpenCompare}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.09] bg-slate-900/70 py-3 text-xs font-semibold text-slate-200 hover:border-cyan-400/35 hover:text-white"
            >
              <CalendarClock className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <span>Compare</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
