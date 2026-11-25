import React, { useMemo, useState } from 'react';
import { Bell, Plus, Search, Trash2, Volume2 } from 'lucide-react';
import type { Country } from '../data/countries';
import { formatClockForZone } from '../utils/time';
import { playAlarmChime, playHourlyChime } from '../utils/audio';
import type { WorldAlarm } from '../components/AlarmModal';

interface AlarmsPageProps {
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

export const AlarmsPage: React.FC<AlarmsPageProps> = ({
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

  const byIso = useMemo(() => new Map(countries.map((c) => [c.iso, c])), [countries]);
  const selectedCountry = byIso.get(selectedIso) || countries[0];

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return countries.slice(0, 48);
    return countries
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.capital.toLowerCase().includes(q) ||
          c.timezone.toLowerCase().includes(q)
      )
      .slice(0, 48);
  }, [countries, countrySearch]);

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
    playHourlyChime();
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Hourly Chime Full-Width Control Card */}
      <section className="rounded-3xl border border-slate-200/90 bg-white/85 p-5 sm:p-6 dark:border-white/[0.09] dark:bg-[#081226]/90">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl dark:text-white">
                World Alarms &amp; Hourly Chime
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                Schedule timezone-anchored alerts across any of the {countries.length} countries
                using Web Audio chimes.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => playHourlyChime()}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/12 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.12]"
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              <span>Test Hourly Chime</span>
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
              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-colors ${
                hourlyChimeEnabled
                  ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
                  : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-white/12 dark:bg-white/[0.06] dark:text-slate-300'
              }`}
            >
              <span>Hourly Chime: {hourlyChimeEnabled ? 'On' : 'Off'}</span>
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Create New Alarm Form */}
        <section className="rounded-3xl border border-slate-200/90 bg-white/85 p-5 sm:p-6 lg:col-span-5 dark:border-white/[0.09] dark:bg-[#081226]/90">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
              New Timezone Alarm
            </h2>
            <button
              type="button"
              onClick={() => playAlarmChime()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
            >
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              Preview Sound
            </button>
          </div>

          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Target Country &amp; Timezone
              </span>
              <button
                type="button"
                onClick={() => setShowPicker((v) => !v)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/85 px-4 py-3 text-left text-sm dark:border-white/12 dark:bg-slate-950/70"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <img
                    src={`https://flagcdn.com/w40/${selectedCountry.iso}.png`}
                    alt=""
                    width={24}
                    height={16}
                    referrerPolicy="no-referrer"
                    className="h-4 w-6 shrink-0 rounded-[3px] object-cover"
                  />
                  <span className="truncate font-semibold text-slate-950 dark:text-white">
                    {selectedCountry.name}
                  </span>
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                    ({selectedCountry.capital})
                  </span>
                </span>
                <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                  Change
                </span>
              </button>

              {showPicker && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-white/12 dark:bg-slate-950">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 px-3 py-2.5 dark:border-white/[0.08]">
                    <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Filter country, capital, or timezone..."
                      autoFocus
                      className="w-full bg-transparent text-xs text-slate-900 focus:outline-none dark:text-white"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto p-1.5">
                    {filteredCountries.map((c) => (
                      <button
                        key={c.iso}
                        type="button"
                        onClick={() => {
                          setSelectedIso(c.iso);
                          setShowPicker(false);
                          setCountrySearch('');
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.06]"
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
                          <span className="truncate text-slate-400">{c.capital}</span>
                        </span>
                        <span className="tabular-clock shrink-0 text-[11px] text-slate-400">
                          {c.timezone}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="page-alarm-time"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Local Time ({selectedCountry.capital})
                </label>
                <input
                  id="page-alarm-time"
                  type="time"
                  value={alarmTime}
                  onChange={(e) => setAlarmTime(e.target.value)}
                  required
                  className="tabular-clock h-11 w-full rounded-xl border border-slate-200 bg-slate-50/85 px-3 text-sm font-semibold text-slate-900 dark:border-white/12 dark:bg-slate-950/70 dark:text-white dark:[color-scheme:dark]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="page-alarm-label"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Label
                </label>
                <input
                  id="page-alarm-label"
                  type="text"
                  value={alarmLabel}
                  onChange={(e) => setAlarmLabel(e.target.value)}
                  placeholder="e.g., Tokyo Market Open"
                  maxLength={40}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/85 px-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/12 dark:bg-slate-950/70 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-sky-500 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Schedule World Alarm</span>
            </button>
          </form>
        </section>

        {/* Active & Scheduled Alarms List */}
        <section className="rounded-3xl border border-slate-200/90 bg-white/85 p-5 sm:p-6 lg:col-span-7 dark:border-white/[0.09] dark:bg-[#081226]/90">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3.5 dark:border-white/[0.08]">
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
              Scheduled Alarms
            </h2>
            <span className="tabular-clock text-xs font-semibold text-sky-600 dark:text-sky-300">
              {alarms.filter((a) => a.enabled).length} active / {alarms.length} total
            </span>
          </div>

          {alarms.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                No world alarms scheduled yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Create an alarm on the left to ring in any city&apos;s local timezone.
              </p>
            </div>
          ) : (
            <div className="mt-3 divide-y divide-slate-200/75 dark:divide-white/[0.07]">
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
                    className="flex items-center justify-between gap-3 py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <img
                        src={`https://flagcdn.com/w40/${country.iso}.png`}
                        alt=""
                        width={28}
                        height={18}
                        referrerPolicy="no-referrer"
                        className="h-4.5 w-7 shrink-0 rounded-[3px] object-cover ring-1 ring-black/10 dark:ring-white/15"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span
                            className={`tabular-clock text-lg font-bold ${
                              alarm.enabled
                                ? 'text-slate-950 dark:text-white'
                                : 'text-slate-400 line-through dark:text-slate-500'
                            }`}
                          >
                            {displayAlarmTime}
                          </span>
                          <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {alarm.label}
                          </span>
                        </div>
                        <p className="tabular-clock text-xs text-slate-500 dark:text-slate-400">
                          {country.name} ({country.capital}) · Local now {liveClock.hours}:
                          {liveClock.minutes}
                          {!is24Hour && liveClock.dayPeriod ? ` ${liveClock.dayPeriod}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={alarm.enabled}
                        aria-label={`Toggle alarm ${alarm.label}`}
                        onClick={() => onToggleAlarm(alarm.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          alarm.enabled
                            ? 'bg-sky-600 dark:bg-sky-500'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            alarm.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAlarm(alarm.id)}
                        aria-label={`Delete alarm ${alarm.label}`}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-500/12 hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
