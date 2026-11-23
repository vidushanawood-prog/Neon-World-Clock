import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Clock,
  Plane,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { Country } from '../data/countries';
import {
  formatClockForZone,
  toDateInputValue,
  toTimeInputValue,
  zonedWallTimeToUtcDate,
} from '../utils/time';

interface RouteJetLagModalProps {
  isOpen: boolean;
  onClose: () => void;
  countries: readonly Country[];
  is24Hour: boolean;
}

type SelectorSlot = 'origin' | 'layover' | 'destination' | null;

function formatMinutesPretty(totalMins: number): string {
  const safe = Math.max(0, Math.round(totalMins));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export const RouteJetLagModal: React.FC<RouteJetLagModalProps> = ({
  isOpen,
  onClose,
  countries,
  is24Hour,
}) => {
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

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openPicker) setOpenPicker(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, openPicker, onClose]);

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

    // Exact net timezone shift (DST-aware between origin at departure and destination at arrival)
    const rawShiftHours = (destClock.offsetMinutes - originClock.offsetMinutes) / 60;
    // Normalize shortest wrap across International Date Line (-12h .. +12h)
    let shortestShiftHours = rawShiftHours;
    if (shortestShiftHours > 12) shortestShiftHours -= 24;
    if (shortestShiftHours < -12) shortestShiftHours += 24;

    const absShift = Math.abs(shortestShiftHours);
    const direction: 'east' | 'west' | 'none' =
      absShift < 0.25 ? 'none' : shortestShiftHours > 0 ? 'east' : 'west';

    // Eastward travel causes slightly stronger circadian disruption than westward
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
        `Flying east shortens your day by ${absShift.toFixed(1)}h — seek bright morning sunlight at ${destination.capital} to advance your body clock.`
      );
      tips.push('Shift bedtime 45–60 minutes earlier for 2 nights prior to departure and avoid late-evening blue light.');
      tips.push('Take a brief 20-minute power nap only if needed, then hold out until local nightfall.');
    } else {
      tips.push(
        `Flying west lengthens your day by ${absShift.toFixed(1)}h — get late afternoon daylight in ${destination.capital} to delay sleep onset.`
      );
      tips.push('Stay awake until at least 9:30 PM local destination time on arrival day to anchor your circadian rhythm.');
      tips.push('Prioritize hydration and light protein-rich meals aligned to the destination schedule.');
    }

    return {
      originClock,
      layoverArrClock,
      layoverDepClock,
      destClock,
      totalTravelMin,
      shortestShiftHours,
      absShift,
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

  if (!isOpen) return null;

  const handlePickCountry = (c: Country) => {
    if (openPicker === 'origin') setOriginIso(c.iso);
    else if (openPicker === 'layover') setLayoverIso(c.iso);
    else if (openPicker === 'destination') setDestIso(c.iso);
    setOpenPicker(null);
    setPickerSearch('');
  };

  const severityStyles =
    calculation.severity === 'Low'
      ? {
          dot: 'bg-emerald-500 dark:bg-emerald-400',
          text: 'text-emerald-700 dark:text-emerald-300',
          bar: 'bg-emerald-500 w-1/3',
        }
      : calculation.severity === 'Moderate'
        ? {
            dot: 'bg-amber-500 dark:bg-amber-400',
            text: 'text-amber-700 dark:text-amber-300',
            bar: 'bg-amber-500 w-2/3',
          }
        : {
            dot: 'bg-rose-500 dark:bg-rose-400',
            text: 'text-rose-700 dark:text-rose-300',
            bar: 'bg-rose-500 w-full',
          };

  const renderCountryButton = (slot: Exclude<SelectorSlot, null>, label: string, selected: Country) => (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <button
        type="button"
        onClick={() => {
          setOpenPicker((cur) => (cur === slot ? null : slot));
          setPickerSearch('');
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
          openPicker === slot
            ? 'border-sky-500 bg-sky-50/50 dark:border-sky-400 dark:bg-sky-950/30'
            : 'border-slate-200 bg-slate-50/80 hover:border-slate-300 dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-white/20'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <img
            src={`https://flagcdn.com/w40/${selected.iso}.png`}
            alt=""
            width={22}
            height={15}
            referrerPolicy="no-referrer"
            className="h-4 w-6 shrink-0 rounded-[3px] object-cover ring-1 ring-black/10 dark:ring-white/15"
          />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-slate-900 dark:text-white">
              {selected.name}
            </span>
            <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
              {selected.capital} · {selected.timezone}
            </span>
          </span>
        </span>
        <span className="shrink-0 text-xs font-medium text-sky-600 dark:text-sky-400">Select</span>
      </button>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="route-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-2xl dark:border-white/12 dark:bg-slate-900/95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <Plane className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="route-modal-title"
                className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white"
              >
                Multi-Stop Route &amp; Jet Lag Calculator
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compute local arrival times across stops, total travel duration, and circadian shift.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close route calculator"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Route Country Selectors */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {renderCountryButton('origin', 'Origin Country', origin)}
            {renderCountryButton('destination', 'Destination Country', destination)}
          </div>

          {/* Optional Layover Toggle + Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Intermediate Stop / Layover
              </span>
              <button
                type="button"
                onClick={() => setHasLayover((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/[0.08]"
              >
                {hasLayover ? (
                  <>
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                    Remove Layover
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />
                    Add Layover Stop
                  </>
                )}
              </button>
            </div>

            {hasLayover && renderCountryButton('layover', 'Layover Country', layover)}
          </div>

          {/* Inline Searchable Country Dropdown (when any picker is open) */}
          {openPicker && (
            <div className="overflow-hidden rounded-2xl border border-sky-300/80 bg-white shadow-lg dark:border-sky-400/30 dark:bg-slate-950">
              <div className="flex items-center gap-2 border-b border-slate-200/80 px-3.5 py-2.5 dark:border-white/[0.08]">
                <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder={`Search ${openPicker} country or capital...`}
                  autoFocus
                  className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setOpenPicker(null)}
                  className="text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  Done
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto p-1.5">
                {pickerMatches.map((c) => (
                  <button
                    key={c.iso}
                    type="button"
                    onClick={() => handlePickCountry(c)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.06]"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <img
                        src={`https://flagcdn.com/w40/${c.iso}.png`}
                        alt=""
                        width={20}
                        height={14}
                        referrerPolicy="no-referrer"
                        className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover"
                      />
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="truncate text-xs text-slate-400">{c.capital}</span>
                    </span>
                    <span className="tabular-clock shrink-0 text-xs text-slate-400">
                      {c.timezone}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Departure Date & Local Time + Flight Durations */}
          <div className="grid grid-cols-1 gap-3 border-t border-slate-200/80 pt-4 sm:grid-cols-2 dark:border-white/[0.08]">
            <div className="space-y-1.5">
              <label
                htmlFor="route-dep-date"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Departure Date ({origin.capital})
              </label>
              <input
                id="route-dep-date"
                type="date"
                value={depDate}
                onChange={(e) => e.target.value && setDepDate(e.target.value)}
                className="tabular-clock w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:[color-scheme:dark]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="route-dep-time"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Departure Time ({origin.capital} local)
              </label>
              <input
                id="route-dep-time"
                type="time"
                value={depTime}
                onChange={(e) => e.target.value && setDepTime(e.target.value)}
                className="tabular-clock w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* Flight & Layover Duration Inputs */}
          <div
            className={`grid grid-cols-1 gap-3 ${hasLayover ? 'sm:grid-cols-3' : 'sm:grid-cols-1'}`}
          >
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                {hasLayover ? 'Flight 1 Duration' : 'Direct Flight Duration'}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={leg1Hours}
                  onChange={(e) => setLeg1Hours(Math.max(0, Math.min(24, Number(e.target.value) || 0)))}
                  aria-label="Flight 1 hours"
                  className="tabular-clock w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                />
                <span className="text-xs text-slate-400">h</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={leg1Mins}
                  onChange={(e) => setLeg1Mins(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                  aria-label="Flight 1 minutes"
                  className="tabular-clock w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                />
                <span className="text-xs text-slate-400">m</span>
              </div>
            </div>

            {hasLayover && (
              <>
                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Layover Duration
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={48}
                      value={layoverHours}
                      onChange={(e) =>
                        setLayoverHours(Math.max(0, Math.min(48, Number(e.target.value) || 0)))
                      }
                      aria-label="Layover hours"
                      className="tabular-clock w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                    />
                    <span className="text-xs text-slate-400">h</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={layoverMins}
                      onChange={(e) =>
                        setLayoverMins(Math.max(0, Math.min(59, Number(e.target.value) || 0)))
                      }
                      aria-label="Layover minutes"
                      className="tabular-clock w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                    />
                    <span className="text-xs text-slate-400">m</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Flight 2 Duration
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={leg2Hours}
                      onChange={(e) =>
                        setLeg2Hours(Math.max(0, Math.min(24, Number(e.target.value) || 0)))
                      }
                      aria-label="Flight 2 hours"
                      className="tabular-clock w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                    />
                    <span className="text-xs text-slate-400">h</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={leg2Mins}
                      onChange={(e) =>
                        setLeg2Mins(Math.max(0, Math.min(59, Number(e.target.value) || 0)))
                      }
                      aria-label="Flight 2 minutes"
                      className="tabular-clock w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                    />
                    <span className="text-xs text-slate-400">m</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Computed Itinerary Timeline */}
          <div className="border-t border-slate-200/80 pt-5 space-y-4 dark:border-white/[0.08]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Local Itinerary Breakdown
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Total Travel:</span>
                <span className="tabular-clock font-semibold text-slate-900 dark:text-white">
                  {formatMinutesPretty(calculation.totalTravelMin)}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-200/70 dark:divide-white/[0.07]">
              {/* Origin Departure */}
              <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Depart · {origin.name} ({origin.capital})
                  </p>
                  <p className="tabular-clock text-xs text-slate-400">
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

              {/* Layover Window */}
              {hasLayover && (
                <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-sky-600 dark:text-sky-400">
                      Layover · {layover.name} ({layover.capital})
                    </p>
                    <p className="tabular-clock text-xs text-slate-400">
                      {calculation.layoverArrClock.utcOffset} · {calculation.layoverArrClock.shortDate}
                    </p>
                  </div>
                  <div className="tabular-clock flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <span>
                      {calculation.layoverArrClock.hours}:{calculation.layoverArrClock.minutes}
                      {!is24Hour && calculation.layoverArrClock.dayPeriod
                        ? ` ${calculation.layoverArrClock.dayPeriod}`
                        : ''}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>
                      {calculation.layoverDepClock.hours}:{calculation.layoverDepClock.minutes}
                      {!is24Hour && calculation.layoverDepClock.dayPeriod
                        ? ` ${calculation.layoverDepClock.dayPeriod}`
                        : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Destination Arrival */}
              <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Arrive · {destination.name} ({destination.capital})
                  </p>
                  <p className="tabular-clock text-xs text-slate-400">
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

            {/* Jet Lag Severity & Recovery Guidance */}
            <div className="border-t border-slate-200/80 pt-4 dark:border-white/[0.08]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Jet Lag Impact:
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-bold ${severityStyles.text}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${severityStyles.dot}`} aria-hidden="true" />
                    {calculation.severity}
                  </span>
                </div>

                <span className="tabular-clock text-xs font-medium text-slate-600 dark:text-slate-300">
                  Net shift:{' '}
                  {calculation.direction === 'none'
                    ? '0h (Same zone)'
                    : `${calculation.shortestShiftHours > 0 ? '+' : ''}${calculation.shortestShiftHours.toFixed(1)}h (${calculation.direction === 'east' ? 'Eastward' : 'Westward'})`}
                </span>
              </div>

              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className={`h-full rounded-full transition-all ${severityStyles.bar}`} />
              </div>

              <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {calculation.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-500" aria-hidden="true" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
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
