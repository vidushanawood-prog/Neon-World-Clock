import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Globe, RotateCcw, Search, Sun, Moon, X } from 'lucide-react';
import type { Country } from '../data/countries';
import {
  formatClockForZone,
  getLocalTimeZone,
  toDateInputValue,
  toTimeInputValue,
  zonedWallTimeToUtcDate,
} from '../utils/time';

export interface CompareConfig {
  active: boolean;
  refZone: string; // IANA timezone string
  refLabel: string; // e.g., "My Local Time" or "Japan (Tokyo)"
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:MM
}

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  countries: readonly Country[];
  pinnedCountries: Country[];
  is24Hour: boolean;
  currentConfig: CompareConfig;
  onApply: (config: CompareConfig) => void;
  onResetLive: () => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  countries,
  pinnedCountries,
  is24Hour,
  currentConfig,
  onApply,
  onResetLive,
}) => {
  const localTz = useMemo(() => getLocalTimeZone(), []);
  const [refZone, setRefZone] = useState(currentConfig.refZone || localTz);
  const [refLabel, setRefLabel] = useState(currentConfig.refLabel || 'My Local Time');
  const [dateStr, setDateStr] = useState(
    currentConfig.dateStr || toDateInputValue(new Date(), localTz)
  );
  const [timeStr, setTimeStr] = useState(
    currentConfig.timeStr || toTimeInputValue(new Date(), localTz)
  );
  const [zoneSearch, setZoneSearch] = useState('');
  const [showZoneList, setShowZoneList] = useState(false);

  // Sync draft state when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const now = new Date();
    if (currentConfig.active) {
      setRefZone(currentConfig.refZone);
      setRefLabel(currentConfig.refLabel);
      setDateStr(currentConfig.dateStr);
      setTimeStr(currentConfig.timeStr);
    } else {
      setRefZone(localTz);
      setRefLabel('My Local Time');
      setDateStr(toDateInputValue(now, localTz));
      setTimeStr(toTimeInputValue(now, localTz));
    }
    setZoneSearch('');
    setShowZoneList(false);
  }, [isOpen, currentConfig, localTz]);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const previewDate = useMemo(
    () => zonedWallTimeToUtcDate(dateStr, timeStr, refZone),
    [dateStr, timeStr, refZone]
  );

  const previewRefClock = useMemo(
    () => formatClockForZone(previewDate, refZone, is24Hour),
    [previewDate, refZone, is24Hour]
  );

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

  const previewLocations = useMemo(() => {
    if (pinnedCountries.length > 0) return pinnedCountries.slice(0, 4);
    const fallbackIsos = new Set(['lk', 'gb', 'us', 'jp']);
    return countries.filter((c) => fallbackIsos.has(c.iso)).slice(0, 4);
  }, [pinnedCountries, countries]);

  if (!isOpen) return null;

  // Slider value in 15-minute steps (0 to 95 => 00:00 to 23:45)
  const [hh, mm] = timeStr.split(':').map(Number);
  const totalMinutes = (Number.isNaN(hh) ? 12 : hh) * 60 + (Number.isNaN(mm) ? 0 : mm);

  const handleSliderChange = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    setTimeStr(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const handleShiftHours = (deltaHours: number) => {
    const shifted = new Date(previewDate.getTime() + deltaHours * 3600 * 1000);
    setDateStr(toDateInputValue(shifted, refZone));
    setTimeStr(toTimeInputValue(shifted, refZone));
  };

  const handleSetNow = () => {
    const now = new Date();
    setDateStr(toDateInputValue(now, refZone));
    setTimeStr(toTimeInputValue(now, refZone));
  };

  const handleSelectZone = (tz: string, label: string) => {
    // Keep the same instant in time when switching reference zone
    setRefZone(tz);
    setRefLabel(label);
    setDateStr(toDateInputValue(previewDate, tz));
    setTimeStr(toTimeInputValue(previewDate, tz));
    setShowZoneList(false);
    setZoneSearch('');
  };

  const handleApply = () => {
    onApply({
      active: true,
      refZone,
      refLabel,
      dateStr,
      timeStr,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-2xl dark:border-white/12 dark:bg-slate-900/92">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 dark:border-white/[0.08]">
          <div>
            <h2
              id="compare-modal-title"
              className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white"
            >
              Compare Global Time
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Pick any date and time in a reference location to project all {countries.length} clocks.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close compare time dialog"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {/* Reference Location Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Reference Location
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowZoneList((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-left text-sm text-slate-900 transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:border-white/20"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Globe className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                  <span className="truncate font-medium">{refLabel}</span>
                  <span className="tabular-clock shrink-0 text-xs text-slate-500 dark:text-slate-400">
                    {refZone} · {previewRefClock.utcOffset}
                  </span>
                </span>
                <span className="ml-2 shrink-0 text-xs font-medium text-sky-600 dark:text-sky-400">
                  Change
                </span>
              </button>

              {showZoneList && (
                <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-white/12 dark:bg-slate-950">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 px-3 py-2 dark:border-white/[0.08]">
                    <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <input
                      type="text"
                      value={zoneSearch}
                      onChange={(e) => setZoneSearch(e.target.value)}
                      placeholder="Filter country, capital, or IANA zone..."
                      autoFocus
                      className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-500"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectZone(localTz, 'My Local Time')}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        refLabel === 'My Local Time'
                          ? 'bg-sky-500/12 text-sky-700 dark:text-sky-300'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="font-medium">My Local Time</span>
                      <span className="tabular-clock text-xs text-slate-500 dark:text-slate-400">
                        {localTz}
                      </span>
                    </button>
                    {filteredZones.map((c) => (
                      <button
                        key={c.iso}
                        type="button"
                        onClick={() => handleSelectZone(c.timezone, `${c.name} (${c.capital})`)}
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
            </div>
          </div>

          {/* Date & Time Inputs */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="compare-date"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                Date
              </label>
              <input
                id="compare-date"
                type="date"
                value={dateStr}
                onChange={(e) => e.target.value && setDateStr(e.target.value)}
                className="tabular-clock w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:[color-scheme:dark]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="compare-time"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                Time
              </label>
              <input
                id="compare-time"
                type="time"
                value={timeStr}
                onChange={(e) => e.target.value && setTimeStr(e.target.value)}
                className="tabular-clock w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* 24-Hour Quick Scrub Slider */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Scrub Time of Day
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleShiftHours(-1)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
                >
                  -1h
                </button>
                <button
                  type="button"
                  onClick={handleSetNow}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
                >
                  Now
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftHours(1)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
                >
                  +1h
                </button>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={1425}
              step={15}
              value={Math.min(1425, Math.round(totalMinutes / 15) * 15)}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              aria-label="Scrub time in 15-minute intervals"
              className="time-slider w-full bg-slate-200 dark:bg-slate-800"
            />
            <div className="tabular-clock flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <span>{is24Hour ? '00:00' : '12 AM'}</span>
              <span>{is24Hour ? '06:00' : '6 AM'}</span>
              <span>{is24Hour ? '12:00' : '12 PM'}</span>
              <span>{is24Hour ? '18:00' : '6 PM'}</span>
              <span>{is24Hour ? '23:45' : '11:45 PM'}</span>
            </div>
          </div>

          {/* Instant Preview of Pinned / Key Locations */}
          <div className="border-t border-slate-200/80 pt-4 dark:border-white/[0.08]">
            <div className="mb-2.5 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-300">
                Instant Preview
              </span>
              <span className="tabular-clock text-slate-500 dark:text-slate-400">
                {previewRefClock.hours}:{previewRefClock.minutes}{' '}
                {!is24Hour ? previewRefClock.dayPeriod : ''} · {previewRefClock.shortDate}
              </span>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
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
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <img
                        src={`https://flagcdn.com/w40/${country.iso}.png`}
                        alt=""
                        width={22}
                        height={15}
                        referrerPolicy="no-referrer"
                        className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover ring-1 ring-black/10 dark:ring-white/15"
                      />
                      <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                        {country.name}
                      </span>
                      <span className="hidden truncate text-xs text-slate-400 sm:inline">
                        {country.capital}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <span className="tabular-clock font-semibold text-slate-900 dark:text-white">
                        {c.hours}:{c.minutes}
                        {!is24Hour && c.dayPeriod ? ` ${c.dayPeriod}` : ''}
                      </span>
                      <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">
                        {c.shortDate}
                      </span>
                      {c.isDaytime ? (
                        <Sun className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" aria-label="Daytime" />
                      ) : (
                        <Moon className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-300" aria-label="Nighttime" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/70 px-6 py-4 dark:border-white/[0.08] dark:bg-slate-950/50">
          {currentConfig.active ? (
            <button
              type="button"
              onClick={() => {
                onResetLive();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Return to Live
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 dark:focus-visible:ring-offset-slate-900"
          >
            Apply to All {countries.length} Clocks
          </button>
        </div>
      </div>
    </div>
  );
};
