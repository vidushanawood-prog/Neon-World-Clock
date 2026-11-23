import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Plus, Search, Trash2, Volume2, X } from 'lucide-react';
import type { Country } from '../data/countries';
import { formatClockForZone } from '../utils/time';
import { playAlarmChime, playHourlyChime } from '../utils/audio';

export interface WorldAlarm {
  id: string;
  countryIso: string;
  time: string; // HH:MM (24-hour)
  label: string;
  enabled: boolean;
}

interface AlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  countries: readonly Country[];
  now: Date;
  is24Hour: boolean;
  alarms: WorldAlarm[];
  hourlyChimeEnabled: boolean;
  onAddAlarm: (alarm: Omit<WorldAlarm, 'id'>) => void;
  onToggleAlarm: (id: string) => void;
  onDeleteAlarm: (id: string) => void;
  onToggleHourlyChime: (enabled: boolean) => void;
}

export const AlarmModal: React.FC<AlarmModalProps> = ({
  isOpen,
  onClose,
  countries,
  now,
  is24Hour,
  alarms,
  hourlyChimeEnabled,
  onAddAlarm,
  onToggleAlarm,
  onDeleteAlarm,
  onToggleHourlyChime,
}) => {
  const [selectedIso, setSelectedIso] = useState('lk');
  const [alarmTime, setAlarmTime] = useState('09:00');
  const [alarmLabel, setAlarmLabel] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const byIso = useMemo(() => new Map(countries.map((c) => [c.iso, c])), [countries]);
  const selectedCountry = byIso.get(selectedIso) || countries[0];

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return countries.slice(0, 40);
    return countries
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.capital.toLowerCase().includes(q) ||
          c.timezone.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [countries, countrySearch]);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alarmTime) return;
    onAddAlarm({
      countryIso: selectedCountry.iso,
      time: alarmTime,
      label: alarmLabel.trim() || `${selectedCountry.capital} Reminder`,
      enabled: true,
    });
    setAlarmLabel('');
    // Warm up AudioContext on user gesture
    playHourlyChime();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alarm-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-2xl dark:border-white/12 dark:bg-slate-900/95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
              <Bell className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="alarm-modal-title"
                className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white"
              >
                World Alarms &amp; Hourly Chime
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Schedule alarms in any country&apos;s local timezone using Web Audio chimes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close alarms dialog"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Hourly Chime Toggle Section */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3.5 dark:border-white/[0.08] dark:bg-slate-950/50">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Hourly Chime
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Play a gentle synthesized chime at the top of every hour (:00).
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => playHourlyChime()}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.12]"
              >
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                Test
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={hourlyChimeEnabled}
                onClick={() => {
                  const next = !hourlyChimeEnabled;
                  onToggleHourlyChime(next);
                  if (next) playHourlyChime();
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  hourlyChimeEnabled
                    ? 'bg-sky-600 dark:bg-sky-500'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    hourlyChimeEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Add New World Alarm Form */}
          <form onSubmit={handleCreate} className="space-y-3 border-t border-slate-200/80 pt-5 dark:border-white/[0.08]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                New Timezone Alarm
              </h3>
              <button
                type="button"
                onClick={() => playAlarmChime()}
                className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
              >
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                Preview Alarm Sound
              </button>
            </div>

            {/* Target Country Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPicker((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-left text-sm dark:border-white/10 dark:bg-slate-950/60"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <img
                    src={`https://flagcdn.com/w40/${selectedCountry.iso}.png`}
                    alt=""
                    width={22}
                    height={15}
                    referrerPolicy="no-referrer"
                    className="h-4 w-6 shrink-0 rounded-[3px] object-cover"
                  />
                  <span className="truncate font-semibold text-slate-900 dark:text-white">
                    {selectedCountry.name}
                  </span>
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                    ({selectedCountry.capital})
                  </span>
                </span>
                <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
                  Change
                </span>
              </button>

              {showPicker && (
                <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-white/12 dark:bg-slate-950">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 px-3 py-2 dark:border-white/[0.08]">
                    <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Filter country or capital..."
                      autoFocus
                      className="w-full bg-transparent text-sm text-slate-900 focus:outline-none dark:text-white"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto p-1.5">
                    {filteredCountries.map((c) => (
                      <button
                        key={c.iso}
                        type="button"
                        onClick={() => {
                          setSelectedIso(c.iso);
                          setShowPicker(false);
                          setCountrySearch('');
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.06]"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <img
                            src={`https://flagcdn.com/w40/${c.iso}.png`}
                            alt=""
                            width={18}
                            height={12}
                            referrerPolicy="no-referrer"
                            className="h-3 w-4.5 rounded-[2px] object-cover"
                          />
                          <span className="truncate font-medium">{c.name}</span>
                          <span className="truncate text-xs text-slate-400">{c.capital}</span>
                        </span>
                        <span className="tabular-clock text-xs text-slate-400">{c.timezone}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <input
                  type="time"
                  value={alarmTime}
                  onChange={(e) => setAlarmTime(e.target.value)}
                  required
                  aria-label="Alarm time in target timezone"
                  className="tabular-clock h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm font-semibold text-slate-900 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:[color-scheme:dark]"
                />
              </div>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  value={alarmLabel}
                  onChange={(e) => setAlarmLabel(e.target.value)}
                  placeholder="Label (e.g., Tokyo Open)"
                  maxLength={40}
                  aria-label="Alarm label"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-sky-500 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Alarm
                </button>
              </div>
            </div>
          </form>

          {/* Saved Alarms List */}
          <div className="border-t border-slate-200/80 pt-5 dark:border-white/[0.08]">
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
              Scheduled Alarms ({alarms.length})
            </h3>
            {alarms.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                No world alarms scheduled yet. Add an alarm above tied to any country&apos;s local time.
              </p>
            ) : (
              <div className="divide-y divide-slate-200/70 dark:divide-white/[0.07]">
                {alarms.map((alarm) => {
                  const country = byIso.get(alarm.countryIso);
                  if (!country) return null;
                  const liveClock = formatClockForZone(now, country.timezone, is24Hour);
                  const [ah, am] = alarm.time.split(':').map(Number);
                  const displayAlarmTime = is24Hour
                    ? alarm.time
                    : `${ah % 12 || 12}:${String(am).padStart(2, '0')} ${ah >= 12 ? 'PM' : 'AM'}`;

                  return (
                    <div
                      key={alarm.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={`https://flagcdn.com/w40/${country.iso}.png`}
                          alt=""
                          width={24}
                          height={16}
                          referrerPolicy="no-referrer"
                          className="h-4 w-6 shrink-0 rounded-[3px] object-cover ring-1 ring-black/10 dark:ring-white/15"
                        />
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span
                              className={`tabular-clock text-base font-bold ${
                                alarm.enabled
                                  ? 'text-slate-950 dark:text-white'
                                  : 'text-slate-400 line-through dark:text-slate-500'
                              }`}
                            >
                              {displayAlarmTime}
                            </span>
                            <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                              {alarm.label}
                            </span>
                          </div>
                          <p className="tabular-clock text-[11px] text-slate-500 dark:text-slate-400">
                            {country.name} · Now {liveClock.hours}:{liveClock.minutes}
                            {!is24Hour && liveClock.dayPeriod ? ` ${liveClock.dayPeriod}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={alarm.enabled}
                          aria-label={`Toggle alarm ${alarm.label}`}
                          onClick={() => onToggleAlarm(alarm.id)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            alarm.enabled
                              ? 'bg-sky-600 dark:bg-sky-500'
                              : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                              alarm.enabled ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteAlarm(alarm.id)}
                          aria-label={`Delete alarm ${alarm.label}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-200/80 bg-slate-50/75 px-6 py-3.5 dark:border-white/[0.08] dark:bg-slate-950/55">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
