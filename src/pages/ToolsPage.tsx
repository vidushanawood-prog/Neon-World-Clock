import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Calendar,
  CalendarClock,
  Clock,
  Globe,
  Moon,
  Plane,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import type { Country } from '../data/countries';
import type { CompareConfig } from '../components/CompareModal';
import {
  formatClockForZone,
  getLocalTimeZone,
  toDateInputValue,
  toTimeInputValue,
  zonedWallTimeToUtcDate,
} from '../utils/time';

interface ToolsPageProps {
  initialTab?: 'settings' | 'jetlag' | 'compare';
  countries: readonly Country[];
  pinnedCountries: Country[];
  is24Hour: boolean;
  clockView: 'digital' | 'analog';
  tempUnit: 'C' | 'F';
  isDark: boolean;
  hourlyChimeEnabled: boolean;
  activeAlarmsCount: number;
  compareConfig: CompareConfig;
  onSetClockView: (mode: 'digital' | 'analog') => void;
  onSet24Hour: (v: boolean) => void;
  onSetTempUnit: (u: 'C' | 'F') => void;
  onSetDark: (v: boolean) => void;
  onSetHourlyChime: (v: boolean) => void;
  onApplyCompare: (cfg: CompareConfig) => void;
  onResetLive: () => void;
  onOpenAlarmsPage: () => void;
}

type ToolsTab = 'settings' | 'jetlag' | 'compare';
type SelectorSlot = 'origin' | 'layover' | 'destination' | null;

function formatMinutesPretty(totalMins: number): string {
  const safe = Math.max(0, Math.round(totalMins));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export const ToolsPage: React.FC<ToolsPageProps> = ({
  initialTab = 'settings',
  countries,
  pinnedCountries,
  is24Hour,
  clockView,
  tempUnit,
  isDark,
  hourlyChimeEnabled,
  activeAlarmsCount,
  compareConfig,
  onSetClockView,
  onSet24Hour,
  onSetTempUnit,
  onSetDark,
  onSetHourlyChime,
  onApplyCompare,
  onResetLive,
  onOpenAlarmsPage,
}) => {
  const [activeTab, setActiveTab] = useState<ToolsTab>(initialTab);

  // Route & Jet Lag state
  const [originIso, setOriginIso] = useState('lk');
  const [hasLayover, setHasLayover] = useState(true);
  const [layoverIso, setLayoverIso] = useState('ae');
  const [destIso, setDestIso] = useState('gb');
  const [depDate, setDepDate] = useState(() => toDateInputValue(new Date(), 'Asia/Colombo'));
  const [depTime, setDepTime] = useState(() => toTimeInputValue(new Date(), 'Asia/Colombo'));
  const [leg1Hours, setLeg1Hours] = useState(4);
  const [leg1Mins, setLeg1Mins] = useState(30);
  const [layoverHours, setLayoverHours] = useState(2);
  const [layoverMins, setLayoverMins] = useState(15);
  const [leg2Hours, setLeg2Hours] = useState(7);
  const [leg2Mins, setLeg2Mins] = useState(20);
  const [openPicker, setOpenPicker] = useState<SelectorSlot>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  // Timezone Compare state
  const localTz = useMemo(() => getLocalTimeZone(), []);
  const [refZone, setRefZone] = useState(compareConfig.refZone || localTz);
  const [refLabel, setRefLabel] = useState(compareConfig.refLabel || 'My Local Time');
  const [dateStr, setDateStr] = useState(
    compareConfig.dateStr || toDateInputValue(new Date(), localTz)
  );
  const [timeStr, setTimeStr] = useState(
    compareConfig.timeStr || toTimeInputValue(new Date(), localTz)
  );
  const [zoneSearch, setZoneSearch] = useState('');
  const [showZoneList, setShowZoneList] = useState(false);

  const byIso = useMemo(() => new Map(countries.map((c) => [c.iso, c])), [countries]);
  const origin = byIso.get(originIso) || countries[0];
  const layover = byIso.get(layoverIso) || countries[0];
  const destination = byIso.get(destIso) || countries[0];

  const pickerMatches = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return countries.slice(0, 45);
    return countries
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.capital.toLowerCase().includes(q) ||
          c.timezone.toLowerCase().includes(q)
      )
      .slice(0, 45);
  }, [countries, pickerSearch]);

  const filteredZones = useMemo(() => {
    const q = zoneSearch.trim().toLowerCase();
    if (!q) return countries.slice(0, 40);
    return countries
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.capital.toLowerCase().includes(q) ||
          c.timezone.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [countries, zoneSearch]);

  const calculation = useMemo(() => {
    const depUtc = zonedWallTimeToUtcDate(depDate, depTime, origin.timezone);
    const leg1TotalMin = Math.max(0, leg1Hours * 60 + leg1Mins);
    const layoverTotalMin = hasLayover ? Math.max(0, layoverHours * 60 + layoverMins) : 0;
    const leg2TotalMin = hasLayover ? Math.max(0, leg2Hours * 60 + leg2Mins) : 0;
    const totalTravelMin = leg1TotalMin + layoverTotalMin + leg2TotalMin;

    const layoverArrUtc = new Date(depUtc.getTime() + leg1TotalMin * 60_000);
    const layoverDepUtc = new Date(layoverArrUtc.getTime() + layoverTotalMin * 60_000);
    const finalArrUtc = new Date(depUtc.getTime() + totalTravelMin * 60_000);

    const originClock = formatClockForZone(depUtc, origin.timezone, is24Hour);
    const layoverArrClock = formatClockForZone(
      layoverArrUtc,
      layover.timezone,
      is24Hour,
      originClock.dateKey
    );
    const layoverDepClock = formatClockForZone(
      layoverDepUtc,
      layover.timezone,
      is24Hour,
      originClock.dateKey
    );
    const destClock = formatClockForZone(
      finalArrUtc,
      destination.timezone,
      is24Hour,
      originClock.dateKey
    );

    const rawShiftHours = (destClock.offsetMinutes - originClock.offsetMinutes) / 60;
    let shortestShiftHours = rawShiftHours;
    if (shortestShiftHours > 12) shortestShiftHours -= 24;
    if (shortestShiftHours < -12) shortestShiftHours += 24;

    const absShift = Math.abs(shortestShiftHours);
    const direction: 'east' | 'west' | 'none' =
      absShift < 0.25 ? 'none' : shortestShiftHours > 0 ? 'east' : 'west';
    const effectiveScore = direction === 'east' ? absShift * 1.15 : absShift;

    let severity: 'Low' | 'Moderate' | 'High' = 'Low';
    if (effectiveScore > 6.5) severity = 'High';
    else if (effectiveScore > 3) severity = 'Moderate';

    const tips: string[] = [];
    if (severity === 'Low') {
      tips.push('Minimal circadian shift — switch immediately to destination meal and sleep times upon landing.');
      tips.push('Hydrate consistently during the flight and limit caffeine within 6 hours of local bedtime.');
    } else if (direction === 'east') {
      tips.push(
        `Flying east shortens your day by ${absShift.toFixed(1)}h — seek bright morning sunlight in ${destination.capital} to advance your body clock.`
      );
      tips.push('Shift bedtime 45–60 minutes earlier for 2 nights before departure and avoid late-evening blue light.');
    } else {
      tips.push(
        `Flying west lengthens your day by ${absShift.toFixed(1)}h — get late afternoon daylight in ${destination.capital} to delay sleep onset.`
      );
      tips.push('Stay awake until at least 9:30 PM local destination time on arrival day to anchor your rhythm.');
    }

    return {
      originClock,
      layoverArrClock,
      layoverDepClock,
      destClock,
      totalTravelMin,
      shortestShiftHours,
      direction,
      severity,
      tips,
    };
  }, [
    depDate,
    depTime,
    origin.timezone,
    layover.timezone,
    destination.timezone,
    destination.capital,
    hasLayover,
    leg1Hours,
    leg1Mins,
    layoverHours,
    layoverMins,
    leg2Hours,
    leg2Mins,
    is24Hour,
  ]);

  const previewDate = useMemo(
    () => zonedWallTimeToUtcDate(dateStr, timeStr, refZone),
    [dateStr, timeStr, refZone]
  );
  const previewRefClock = useMemo(
    () => formatClockForZone(previewDate, refZone, is24Hour),
    [previewDate, refZone, is24Hour]
  );
  const previewLocations = useMemo(() => {
    if (pinnedCountries.length > 0) return pinnedCountries.slice(0, 6);
    const fallback = new Set(['lk', 'gb', 'us', 'jp', 'au', 'de']);
    return countries.filter((c) => fallback.has(c.iso)).slice(0, 6);
  }, [pinnedCountries, countries]);

  const [hh, mm] = timeStr.split(':').map(Number);
  const totalMinutes = (Number.isNaN(hh) ? 12 : hh) * 60 + (Number.isNaN(mm) ? 0 : mm);

  const severityStyles =
    calculation.severity === 'Low'
      ? { text: 'text-emerald-600 dark:text-emerald-300', bar: 'bg-emerald-500 w-1/3' }
      : calculation.severity === 'Moderate'
        ? { text: 'text-amber-600 dark:text-amber-300', bar: 'bg-amber-500 w-2/3' }
        : { text: 'text-rose-600 dark:text-rose-300', bar: 'bg-rose-500 w-full' };

  const handlePickCountry = (c: Country) => {
    if (openPicker === 'origin') setOriginIso(c.iso);
    else if (openPicker === 'layover') setLayoverIso(c.iso);
    else if (openPicker === 'destination') setDestIso(c.iso);
    setOpenPicker(null);
    setPickerSearch('');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Section Tabs */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/90 bg-white/85 p-5 sm:flex-row sm:items-center dark:border-white/[0.09] dark:bg-[#081226]/90">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl dark:text-white">
            Tools, Jet Lag &amp; Display Settings
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
            Configure global clock formats, plan multi-stop flights, compare timezones, or manage
            world alarms.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Tools and settings sections"
          className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200/90 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-slate-950/75"
        >
          {(
            [
              ['settings', 'Display & Units', SlidersHorizontal],
              ['jetlag', 'Jet Lag Calculator', Plane],
              ['compare', 'Timezone Compare', CalendarClock],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === id
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-sky-500 dark:text-slate-950'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: Display & Format Settings */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <section className="space-y-4 rounded-3xl border border-slate-200/90 bg-white/85 p-5 sm:p-6 lg:col-span-7 dark:border-white/[0.09] dark:bg-[#081226]/90">
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
              Clock &amp; Measurement Preferences
            </h2>

            <div className="divide-y divide-slate-200/75 dark:divide-white/[0.07]">
              {/* Digital / Analog */}
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Clock Display Mode
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose tabular digital readouts or live analog dials on all 215 cards.
                  </p>
                </div>
                <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-white/10 dark:bg-slate-950">
                  <button
                    type="button"
                    onClick={() => onSetClockView('digital')}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${
                      clockView === 'digital'
                        ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Digital
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetClockView('analog')}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${
                      clockView === 'analog'
                        ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Analog
                  </button>
                </div>
              </div>

              {/* 12H / 24H */}
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Time Format (12H / 24H)
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Switch between AM/PM notation and international 24-hour time.
                  </p>
                </div>
                <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-white/10 dark:bg-slate-950">
                  <button
                    type="button"
                    onClick={() => onSet24Hour(false)}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${
                      !is24Hour
                        ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    12H
                  </button>
                  <button
                    type="button"
                    onClick={() => onSet24Hour(true)}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${
                      is24Hour
                        ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    24H
                  </button>
                </div>
              </div>

              {/* °C / °F */}
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Temperature Scale (°C / °F)
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Applies to all live Open-Meteo weather readouts and country pages.
                  </p>
                </div>
                <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-white/10 dark:bg-slate-950">
                  <button
                    type="button"
                    onClick={() => onSetTempUnit('C')}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${
                      tempUnit === 'C'
                        ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Celsius (°C)
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetTempUnit('F')}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${
                      tempUnit === 'F'
                        ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Fahrenheit (°F)
                  </button>
                </div>
              </div>

              {/* Theme */}
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Interface Theme
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Toggle Neon Dark Mode or crisp daylight surfaces.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSetDark(!isDark)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-white/12 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
                >
                  {isDark ? (
                    <>
                      <Sun className="h-4 w-4 text-amber-300" aria-hidden="true" />
                      <span>Switch to Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4 text-sky-600" aria-hidden="true" />
                      <span>Switch to Neon Dark</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Quick Jump Cards to Alarms & Audio Chime */}
          <section className="space-y-4 rounded-3xl border border-slate-200/90 bg-white/85 p-5 sm:p-6 lg:col-span-5 dark:border-white/[0.09] dark:bg-[#081226]/90">
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
              Alarms &amp; Audio Signals
            </h2>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/[0.08] dark:bg-slate-950/65">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    World Alarms Manager
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {activeAlarmsCount} active timezone{' '}
                    {activeAlarmsCount === 1 ? 'alarm' : 'alarms'} scheduled
                  </p>
                </div>
                <Bell className="h-5 w-5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
              </div>
              <button
                type="button"
                onClick={onOpenAlarmsPage}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-500 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                <span>Open Dedicated Alarms Page</span>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/[0.08] dark:bg-slate-950/65">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Top-of-Hour Chime
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Soft synthesized tone at every :00 local hour
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hourlyChimeEnabled}
                  onClick={() => onSetHourlyChime(!hourlyChimeEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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
          </section>
        </div>
      )}

      {/* TAB 2: Multi-Stop Route & Jet Lag Calculator */}
      {activeTab === 'jetlag' && (
        <section className="space-y-6 rounded-3xl border border-slate-200/90 bg-white/85 p-5 sm:p-6 dark:border-white/[0.09] dark:bg-[#081226]/90">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(
              [
                ['origin', 'Origin Country', origin],
                ...(hasLayover ? ([['layover', 'Layover Stop', layover]] as const) : []),
                ['destination', 'Destination Country', destination],
              ] as const
            ).map(([slot, label, selected]) => (
              <div key={slot} className="space-y-1.5">
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                  {label}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOpenPicker((cur) => (cur === slot ? null : slot));
                    setPickerSearch('');
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-2xl border px-3.5 py-3 text-left text-sm transition-colors ${
                    openPicker === slot
                      ? 'border-sky-500 bg-sky-50/70 dark:border-sky-400 dark:bg-sky-950/35'
                      : 'border-slate-200 bg-slate-50/85 dark:border-white/12 dark:bg-slate-950/70'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <img
                      src={`https://flagcdn.com/w40/${selected.iso}.png`}
                      alt=""
                      width={22}
                      height={15}
                      referrerPolicy="no-referrer"
                      className="h-4 w-6 shrink-0 rounded-[3px] object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-950 dark:text-white">
                        {selected.name}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {selected.capital}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                    Select
                  </span>
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setHasLayover((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/12 dark:text-slate-200 dark:hover:bg-white/[0.08]"
            >
              {hasLayover ? (
                <>
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                  <span>Remove Layover Stop</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />
                  <span>Add Intermediate Layover</span>
                </>
              )}
            </button>
          </div>

          {openPicker && (
            <div className="overflow-hidden rounded-2xl border border-sky-400/40 bg-white shadow-lg dark:bg-slate-950">
              <div className="flex items-center gap-2 border-b border-slate-200/80 px-3.5 py-2.5 dark:border-white/[0.08]">
                <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder={`Search ${openPicker} country or capital...`}
                  autoFocus
                  className="w-full bg-transparent text-sm text-slate-900 focus:outline-none dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setOpenPicker(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  Done
                </button>
              </div>
              <div className="grid max-h-52 grid-cols-1 gap-1 overflow-y-auto p-2 sm:grid-cols-2 lg:grid-cols-3">
                {pickerMatches.map((c) => (
                  <button
                    key={c.iso}
                    type="button"
                    onClick={() => handlePickCountry(c)}
                    className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.07]"
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
                    </span>
                    <span className="tabular-clock shrink-0 text-[10px] text-slate-400">
                      {c.capital}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Departure Date
              </label>
              <input
                type="date"
                value={depDate}
                onChange={(e) => e.target.value && setDepDate(e.target.value)}
                className="tabular-clock h-11 w-full rounded-xl border border-slate-200 bg-slate-50/85 px-3 text-sm text-slate-900 dark:border-white/12 dark:bg-slate-950/70 dark:text-white dark:[color-scheme:dark]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Departure Time ({origin.capital})
              </label>
              <input
                type="time"
                value={depTime}
                onChange={(e) => e.target.value && setDepTime(e.target.value)}
                className="tabular-clock h-11 w-full rounded-xl border border-slate-200 bg-slate-50/85 px-3 text-sm text-slate-900 dark:border-white/12 dark:bg-slate-950/70 dark:text-white dark:[color-scheme:dark]"
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                {hasLayover ? 'Flight 1 (h / m)' : 'Flight Duration (h / m)'}
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={leg1Hours}
                  onChange={(e) => setLeg1Hours(Math.max(0, Math.min(24, Number(e.target.value) || 0)))}
                  aria-label="Flight 1 hours"
                  className="tabular-clock h-11 w-full rounded-xl border border-slate-200 bg-slate-50/85 px-2.5 text-sm text-slate-900 dark:border-white/12 dark:bg-slate-950/70 dark:text-white"
                />
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={leg1Mins}
                  onChange={(e) => setLeg1Mins(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                  aria-label="Flight 1 minutes"
                  className="tabular-clock h-11 w-full rounded-xl border border-slate-200 bg-slate-50/85 px-2.5 text-sm text-slate-900 dark:border-white/12 dark:bg-slate-950/70 dark:text-white"
                />
              </div>
            </div>

            {hasLayover && (
              <>
                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Layover (h / m)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={48}
                      value={layoverHours}
                      onChange={(e) =>
                        setLayoverHours(Math.max(0, Math.min(48, Number(e.target.value) || 0)))
                      }
                      aria-label="Layover hours"
                      className="tabular-clock h-11 w-full rounded-xl border border-slate-200 bg-slate-50/85 px-2.5 text-sm text-slate-900 dark:border-white/12 dark:bg-slate-950/70 dark:text-white"
                    />
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={layoverMins}
                      onChange={(e) =>
                        setLayoverMins(Math.max(0, Math.min(59, Number(e.target.value) || 0)))
                      }
                      aria-label="Layover minutes"
                      className="tabular-clock h-11 w-full rounded-xl border border-slate-200 bg-slate-50/85 px-2.5 text-sm text-slate-900 dark:border-white/12 dark:bg-slate-950/70 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Flight 2 (h / m)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={leg2Hours}
                      onChange={(e) =>
                        setLeg2Hours(Math.max(0, Math.min(24, Number(e.target.value) || 0)))
                      }
                      aria-label="Flight 2 hours"
                      className="tabular-clock h-11 w-full rounded-xl border border-slate-200 bg-slate-50/85 px-2.5 text-sm text-slate-900 dark:border-white/12 dark:bg-slate-950/70 dark:text-white"
                    />
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={leg2Mins}
                      onChange={(e) =>
                        setLeg2Mins(Math.max(0, Math.min(59, Number(e.target.value) || 0)))
                      }
                      aria-label="Flight 2 minutes"
                      className="tabular-clock h-11 w-full rounded-xl border border-slate-200 bg-slate-50/85 px-2.5 text-sm text-slate-900 dark:border-white/12 dark:bg-slate-950/70 dark:text-white"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Itinerary & Recovery Results */}
          <div className="grid grid-cols-1 gap-5 border-t border-slate-200/80 pt-5 lg:grid-cols-2 dark:border-white/[0.08]">
            <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/[0.08] dark:bg-slate-950/65">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                  Local Arrival Timeline
                </h3>
                <span className="tabular-clock text-xs font-semibold text-sky-600 dark:text-sky-300">
                  Total: {formatMinutesPretty(calculation.totalTravelMin)}
                </span>
              </div>

              <div className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Depart · {origin.name} ({origin.capital})
                    </p>
                    <p className="tabular-clock text-[11px] text-slate-400">
                      {calculation.originClock.utcOffset} · {calculation.originClock.shortDate}
                    </p>
                  </div>
                  <span className="tabular-clock text-base font-bold text-slate-950 dark:text-white">
                    {calculation.originClock.hours}:{calculation.originClock.minutes}
                    {!is24Hour && calculation.originClock.dayPeriod
                      ? ` ${calculation.originClock.dayPeriod}`
                      : ''}
                  </span>
                </div>

                {hasLayover && (
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-sky-600 dark:text-sky-300">
                        Layover · {layover.name} ({layover.capital})
                      </p>
                      <p className="tabular-clock text-[11px] text-slate-400">
                        {calculation.layoverArrClock.utcOffset} · {calculation.layoverArrClock.shortDate}
                      </p>
                    </div>
                    <span className="tabular-clock inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                      {calculation.layoverArrClock.hours}:{calculation.layoverArrClock.minutes}
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      {calculation.layoverDepClock.hours}:{calculation.layoverDepClock.minutes}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                      Arrive · {destination.name} ({destination.capital})
                    </p>
                    <p className="tabular-clock text-[11px] text-slate-400">
                      {calculation.destClock.utcOffset} · {calculation.destClock.fullDate}
                    </p>
                  </div>
                  <span className="tabular-clock text-base font-bold text-slate-950 dark:text-white">
                    {calculation.destClock.hours}:{calculation.destClock.minutes}
                    {!is24Hour && calculation.destClock.dayPeriod
                      ? ` ${calculation.destClock.dayPeriod}`
                      : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/[0.08] dark:bg-slate-950/65">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-500 dark:text-sky-400" aria-hidden="true" />
                  <span className="text-sm font-bold text-slate-950 dark:text-white">
                    Jet Lag Impact:
                  </span>
                  <span className={`text-sm font-bold ${severityStyles.text}`}>
                    {calculation.severity}
                  </span>
                </div>
                <span className="tabular-clock text-xs text-slate-500 dark:text-slate-300">
                  Shift:{' '}
                  {calculation.direction === 'none'
                    ? '0h'
                    : `${calculation.shortestShiftHours > 0 ? '+' : ''}${calculation.shortestShiftHours.toFixed(1)}h (${calculation.direction})`}
                </span>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className={`h-full rounded-full ${severityStyles.bar}`} />
              </div>

              <ul className="mt-4 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {calculation.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" aria-hidden="true" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: Timezone & Daylight Comparator */}
      {activeTab === 'compare' && (
        <section className="space-y-6 rounded-3xl border border-slate-200/90 bg-white/85 p-5 sm:p-6 dark:border-white/[0.09] dark:bg-[#081226]/90">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-6">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Reference Timezone
              </label>
              <button
                type="button"
                onClick={() => setShowZoneList((v) => !v)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/85 px-4 py-3 text-left text-sm dark:border-white/12 dark:bg-slate-950/70"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Globe className="h-4 w-4 shrink-0 text-sky-500" aria-hidden="true" />
                  <span className="truncate font-semibold text-slate-950 dark:text-white">
                    {refLabel}
                  </span>
                  <span className="tabular-clock shrink-0 text-xs text-slate-400">
                    {previewRefClock.utcOffset}
                  </span>
                </span>
                <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                  Change
                </span>
              </button>

              {showZoneList && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-white/12 dark:bg-slate-950">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 px-3 py-2 dark:border-white/[0.08]">
                    <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <input
                      type="text"
                      value={zoneSearch}
                      onChange={(e) => setZoneSearch(e.target.value)}
                      placeholder="Filter country or IANA timezone..."
                      autoFocus
                      className="w-full bg-transparent text-xs text-slate-900 focus:outline-none dark:text-white"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRefZone(localTz);
                        setRefLabel('My Local Time');
                        setShowZoneList(false);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.07]"
                    >
                      <span>My Local Time</span>
                      <span className="tabular-clock text-slate-400">{localTz}</span>
                    </button>
                    {filteredZones.map((c) => (
                      <button
                        key={c.iso}
                        type="button"
                        onClick={() => {
                          setRefZone(c.timezone);
                          setRefLabel(`${c.name} (${c.capital})`);
                          setDateStr(toDateInputValue(previewDate, c.timezone));
                          setTimeStr(toTimeInputValue(previewDate, c.timezone));
                          setShowZoneList(false);
                          setZoneSearch('');
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.07]"
                      >
                        <span className="truncate font-medium">
                          {c.name} ({c.capital})
                        </span>
                        <span className="tabular-clock text-slate-400">{c.timezone}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 lg:col-span-3">
              <label
                htmlFor="tools-compare-date"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                Date
              </label>
              <input
                id="tools-compare-date"
                type="date"
                value={dateStr}
                onChange={(e) => e.target.value && setDateStr(e.target.value)}
                className="tabular-clock h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/85 px-3.5 text-sm text-slate-900 dark:border-white/12 dark:bg-slate-950/70 dark:text-white dark:[color-scheme:dark]"
              />
            </div>

            <div className="space-y-2 lg:col-span-3">
              <label
                htmlFor="tools-compare-time"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Time
              </label>
              <input
                id="tools-compare-time"
                type="time"
                value={timeStr}
                onChange={(e) => e.target.value && setTimeStr(e.target.value)}
                className="tabular-clock h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/85 px-3.5 text-sm text-slate-900 dark:border-white/12 dark:bg-slate-950/70 dark:text-white dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* 24-Hour Scrubber */}
          <div className="space-y-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/[0.08] dark:bg-slate-950/65">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Scrub Time of Day
              </span>
              <span className="tabular-clock text-xs font-bold text-sky-600 dark:text-sky-300">
                {previewRefClock.hours}:{previewRefClock.minutes}
                {!is24Hour && previewRefClock.dayPeriod ? ` ${previewRefClock.dayPeriod}` : ''} ·{' '}
                {previewRefClock.shortDate}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1425}
              step={15}
              value={Math.min(1425, Math.round(totalMinutes / 15) * 15)}
              onChange={(e) => {
                const mins = Number(e.target.value);
                const h = Math.floor(mins / 60) % 24;
                const m = mins % 60;
                setTimeStr(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
              }}
              aria-label="Scrub comparison time"
              className="time-slider w-full bg-slate-200 dark:bg-slate-800"
            />
          </div>

          {/* Preview Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {previewLocations.map((country) => {
              const c = formatClockForZone(
                previewDate,
                country.timezone,
                is24Hour,
                previewRefClock.dateKey
              );
              return (
                <div
                  key={country.iso}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/[0.08] dark:bg-slate-950/70"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <img
                      src={`https://flagcdn.com/w40/${country.iso}.png`}
                      alt=""
                      width={22}
                      height={15}
                      referrerPolicy="no-referrer"
                      className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-950 dark:text-white">
                        {country.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {country.capital}
                      </p>
                    </div>
                  </div>
                  <div className="tabular-clock shrink-0 text-right">
                    <p className="text-sm font-bold text-sky-600 dark:text-sky-300">
                      {c.hours}:{c.minutes}
                      {!is24Hour && c.dayPeriod ? ` ${c.dayPeriod}` : ''}
                    </p>
                    <p className="text-[10px] text-slate-400">{c.shortDate}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4 dark:border-white/[0.08]">
            {compareConfig.active ? (
              <button
                type="button"
                onClick={onResetLive}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/12 dark:text-slate-200 dark:hover:bg-white/[0.08]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Restore Real-Time Clocks</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Applying projects all {countries.length} home clocks to this exact instant.
              </span>
            )}

            <button
              type="button"
              onClick={() =>
                onApplyCompare({
                  active: true,
                  refZone,
                  refLabel,
                  dateStr,
                  timeStr,
                })
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-600 px-5 text-xs font-semibold text-white hover:bg-sky-500 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
            >
              <span>Apply to All {countries.length} Clocks &amp; View Home</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
