import React, { useMemo, useState } from 'react';
import { Check, Compass, Copy, Lock, Moon, Star, Sun, Sunrise, Sunset } from 'lucide-react';
import type { Country } from '../data/countries';
import { formatClockForZone } from '../utils/time';
import { getDaylightInfo, getSeasonInfo } from '../utils/solar';
import {
  formatLkrRateShort,
  formatTemperature,
  type WeatherEntry,
} from '../services/intelligence';
import { AnalogClock } from './AnalogClock';
import { WeatherIcon } from './WeatherIcon';

interface ClockCardProps {
  country: Country;
  displayDate: Date;
  is24Hour: boolean;
  clockView: 'digital' | 'analog';
  tempUnit: 'C' | 'F';
  isPinned: boolean;
  isFocusedOnGlobe: boolean;
  isCompareMode: boolean;
  referenceDateKey: string;
  isCopied: boolean;
  weather?: WeatherEntry;
  rates: Record<string, number>;
  onTogglePin: (iso: string) => void;
  onCopy: (country: Country, formattedText: string) => void;
  onFocusGlobe: (country: Country) => void;
  onOpenDetails: (country: Country) => void;
  isLocked?: boolean;
}

export const ClockCard: React.FC<ClockCardProps> = React.memo(
  ({
    country,
    displayDate,
    is24Hour,
    clockView,
    tempUnit,
    isPinned,
    isFocusedOnGlobe,
    isCompareMode,
    referenceDateKey,
    isCopied,
    weather,
    rates,
    onTogglePin,
    onCopy,
    onFocusGlobe,
    onOpenDetails,
    isLocked = false,
  }) => {
    const [flagError, setFlagError] = useState(false);

    const minuteKey = Math.floor(displayDate.getTime() / 60000);

    const clock = formatClockForZone(
      displayDate,
      country.timezone,
      is24Hour,
      referenceDateKey
    );

    const { seasonInfo, daylight } = useMemo(() => {
      const sampleDate = new Date(minuteKey * 60000);
      return {
        seasonInfo: getSeasonInfo(country.lat, sampleDate, country.timezone),
        daylight: getDaylightInfo(
          country.lat,
          country.lng,
          sampleDate,
          country.timezone,
          clock.offsetMinutes,
          is24Hour
        ),
      };
    }, [country.lat, country.lng, country.timezone, minuteKey, clock.offsetMinutes, is24Hour]);

    const lkrRateLabel = useMemo(
      () => formatLkrRateShort(country.currency, rates),
      [country.currency, rates]
    );

    const handleCopy = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isLocked) {
        onOpenDetails(country);
        return;
      }
      const weatherStr = weather
        ? ` · ${formatTemperature(weather.tempC, tempUnit)} ${weather.label}`
        : '';
      const fullCopy = `${country.name} (${country.capital}) — ${clock.copyText}${weatherStr}`;
      onCopy(country, fullCopy);
    };

    const handlePin = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isLocked) {
        onOpenDetails(country);
        return;
      }
      onTogglePin(country.iso);
    };

    const handleGlobe = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isLocked) {
        onOpenDetails(country);
        return;
      }
      onFocusGlobe(country);
    };

    const showDayDelta =
      clock.dayDeltaLabel && clock.dayDeltaLabel !== 'Today';

    const callIndicator =
      clock.callStatus.level === 'good'
        ? {
            dot: 'bg-emerald-500 dark:bg-emerald-400',
            text: 'text-emerald-700 dark:text-emerald-300',
          }
        : clock.callStatus.level === 'window'
          ? {
              dot: 'bg-amber-500 dark:bg-amber-400',
              text: 'text-amber-700 dark:text-amber-300',
            }
          : {
              dot: 'bg-rose-500 dark:bg-rose-400',
              text: 'text-rose-700 dark:text-rose-300',
            };

    return (
      <article
        onClick={() => onOpenDetails(country)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenDetails(country);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Inspect ${country.name} (${country.capital}) details`}
        className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-5 text-left transition-transform duration-200 ease-out hover:-translate-y-0.5 [content-visibility:auto] [contain-intrinsic-size:236px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
          isFocusedOnGlobe
            ? 'bg-white/95 border-sky-400/80 shadow-[0_6px_24px_-6px_rgba(2,132,199,0.2)] dark:bg-[#0d172d]/95 dark:border-sky-400/55 dark:shadow-[0_10px_28px_-12px_rgba(56,189,248,0.26)]'
            : isPinned
              ? 'bg-white/95 border-sky-200/90 shadow-[0_4px_18px_-6px_rgba(2,132,199,0.12)] dark:bg-[#0b1428]/92 dark:border-sky-400/28'
              : 'bg-white/92 border-slate-200/80 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.06)] hover:border-slate-300/90 dark:bg-[#091122]/88 dark:border-white/[0.08] dark:shadow-none dark:hover:border-white/[0.16]'
        }`}
      >
        {/* Lightweight Day / Night corner tint (zero GPU blur layer cost) */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 opacity-65 transition-opacity duration-200 group-hover:opacity-100 ${
            clock.isDaytime
              ? 'bg-[radial-gradient(circle_at_95%_5%,rgba(251,191,36,0.12),transparent_48%)]'
              : 'bg-[radial-gradient(circle_at_95%_5%,rgba(99,102,241,0.14),transparent_48%)]'
          }`}
        />

        {/* Top Row: Flag + Country & Capital + Action Buttons */}
        <div className="relative flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            {flagError ? (
              <div
                className="flex h-6 w-9 shrink-0 items-center justify-center rounded-[5px] border border-slate-200 bg-slate-100 text-[10px] font-bold tracking-wider text-slate-600 uppercase dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
                aria-label={`${country.name} code`}
              >
                {country.iso}
              </div>
            ) : (
              <img
                src={`https://flagcdn.com/w80/${country.iso}.png`}
                srcSet={`https://flagcdn.com/w160/${country.iso}.png 2x`}
                alt={`Flag of ${country.name}`}
                width={36}
                height={24}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setFlagError(true)}
                className="h-6 w-9 shrink-0 rounded-[5px] object-cover ring-1 ring-slate-900/10 dark:ring-white/15"
              />
            )}

            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {country.name}
              </h3>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {country.capital}
              </p>
            </div>
          </div>

          {/* Action Buttons / Pro Lock Badge */}
          <div className="flex shrink-0 items-center gap-0.5">
            {isLocked && (
              <span
                title="Neon Pro required to unlock all 215 countries"
                className="mr-1 inline-flex items-center gap-1 rounded-lg border border-fuchsia-400/45 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-200 shadow-[0_0_12px_rgba(232,121,249,0.28)]"
              >
                <Lock className="h-2.5 w-2.5 text-cyan-300" aria-hidden="true" />
                Pro
              </span>
            )}
            <button
              type="button"
              onClick={handleGlobe}
              aria-label={`Focus 3D globe on ${country.name}`}
              title="Focus on 3D Globe"
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                isFocusedOnGlobe
                  ? 'text-sky-600 bg-sky-500/12 dark:text-sky-400'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-100'
              }`}
            >
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleCopy}
              aria-label={`Copy time for ${country.name}`}
              title="Copy date & time"
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                isCopied
                  ? 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-100'
              }`}
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={handlePin}
              aria-label={
                isPinned
                  ? `Unpin ${country.name} from favorites`
                  : `Pin ${country.name} to favorites`
              }
              aria-pressed={isPinned}
              title={isPinned ? 'Unpin favorite' : 'Pin to top'}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                isPinned
                  ? 'text-amber-500 hover:bg-amber-500/10 dark:text-amber-400'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-100'
              }`}
            >
              <Star
                className="h-3.5 w-3.5"
                fill={isPinned ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Center Focal Point: Digital OR Analog Live Clock */}
        {clockView === 'analog' ? (
          <div className="relative mt-4 flex items-center gap-4">
            <AnalogClock
              hour24={clock.hour24}
              minute={clock.minuteNum}
              second={clock.secondNum}
              isDaytime={clock.isDaytime}
              showSeconds={!isCompareMode}
              size={84}
            />
            <div className="min-w-0">
              <div className="tabular-clock flex items-baseline gap-1 text-lg font-semibold text-slate-950 dark:text-white">
                <span>
                  {clock.hours}:{clock.minutes}
                </span>
                {!is24Hour && clock.dayPeriod && (
                  <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                    {clock.dayPeriod}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-300">
                {clock.shortDate}
                {showDayDelta && (
                  <span
                    className={`ml-1 font-medium ${
                      clock.dayDeltaLabel === 'Tomorrow'
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    · {clock.dayDeltaLabel}
                  </span>
                )}
              </p>
              <div
                className={`mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold ${callIndicator.text}`}
                title={clock.callStatus.detail}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${callIndicator.dot}`} aria-hidden="true" />
                <span>{clock.callStatus.label}</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="relative mt-4 flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <div className="tabular-clock flex items-baseline text-[1.9rem] leading-none font-semibold tracking-tight text-slate-950 dark:text-white">
                  <span>{clock.hours}</span>
                  <span className="mx-[1px] text-slate-400 dark:text-slate-500">:</span>
                  <span>{clock.minutes}</span>
                  {!isCompareMode && (
                    <span className="ml-0.5 text-[1.1rem] font-medium text-slate-400 dark:text-slate-400">
                      :{clock.seconds}
                    </span>
                  )}
                </div>
                {!is24Hour && clock.dayPeriod && (
                  <span className="tabular-clock text-xs font-semibold tracking-wide text-sky-600 dark:text-sky-400">
                    {clock.dayPeriod}
                  </span>
                )}
              </div>

              {/* Best Time to Call Indicator (Static dot + clear label) */}
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold ${callIndicator.text}`}
                title={clock.callStatus.detail}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${callIndicator.dot}`} aria-hidden="true" />
                <span>{clock.callStatus.label}</span>
              </span>
            </div>

            {/* Date Line */}
            <div className="relative mt-2 flex items-center gap-1.5 text-[12.5px] text-slate-600 dark:text-slate-300">
              <span className="truncate">{clock.fullDate}</span>
              {showDayDelta && (
                <>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                    ·
                  </span>
                  <span
                    className={`shrink-0 font-medium ${
                      clock.dayDeltaLabel === 'Tomorrow'
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {clock.dayDeltaLabel}
                  </span>
                </>
              )}
            </div>
          </>
        )}

        {/* Weather & Currency LKR Rate Strip */}
        <div className="relative mt-3.5 flex items-center justify-between gap-2 border-t border-slate-200/65 pt-2.5 text-[11.5px] dark:border-white/[0.06]">
          <div className="flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-300">
            {weather ? (
              <>
                <WeatherIcon kind={weather.icon} className="h-3.5 w-3.5 shrink-0" />
                <span className="tabular-clock shrink-0 font-semibold text-slate-800 dark:text-slate-100">
                  {formatTemperature(weather.tempC, tempUnit)}
                </span>
                <span className="truncate text-slate-500 dark:text-slate-400">
                  {weather.label}
                </span>
              </>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">Weather…</span>
            )}
          </div>

          <span
            className="tabular-clock shrink-0 text-slate-500 dark:text-slate-400"
            title={`${country.currency} (${country.currencySymbol}) exchange reference`}
          >
            {lkrRateLabel}
          </span>
        </div>

        {/* Season & Daylight Duration Bar */}
        <div className="relative mt-3 border-t border-slate-200/65 pt-2.5 dark:border-white/[0.06]">
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {seasonInfo.season}
            </span>
            <span className="tabular-clock flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5" title="Sunrise">
                <Sunrise className="h-3 w-3 text-amber-500 dark:text-amber-300" aria-hidden="true" />
                {daylight.sunriseStr}
              </span>
              <span className="inline-flex items-center gap-0.5" title="Sunset">
                <Sunset className="h-3 w-3 text-indigo-400 dark:text-indigo-300" aria-hidden="true" />
                {daylight.sunsetStr}
              </span>
            </span>
            <span className="tabular-clock shrink-0 font-medium text-slate-600 dark:text-slate-300" title="Total daylight duration">
              {daylight.daylightHoursStr}
            </span>
          </div>
          <div
            className="relative mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-800"
            title={`Daylight progress: ${daylight.progressPercent}%`}
          >
            <div
              style={{ width: `${daylight.progressPercent}%` }}
              className={`h-full rounded-full transition-all duration-300 ${
                daylight.isAfterSunriseBeforeSunset
                  ? 'bg-gradient-to-r from-amber-400 to-sky-400'
                  : 'bg-indigo-400/60 dark:bg-indigo-500/50'
              }`}
            />
          </div>
        </div>

        {/* Bottom Metadata Footer: UTC Offset + IANA + Day/Night */}
        <div className="relative mt-2.5 flex items-center justify-between gap-2 border-t border-slate-200/65 pt-2.5 text-[11.5px] dark:border-white/[0.06]">
          <div className="flex min-w-0 items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="tabular-clock shrink-0 font-medium text-slate-700 dark:text-slate-300">
              {clock.utcOffset}
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
              ·
            </span>
            <span className="truncate" title={country.timezone}>
              {country.timezone}
            </span>
          </div>

          <div
            className={`flex shrink-0 items-center gap-1 font-medium ${
              clock.isDaytime
                ? 'text-amber-600 dark:text-amber-300'
                : 'text-indigo-600 dark:text-indigo-300'
            }`}
            title={clock.isDaytime ? 'Daytime (6:00 AM – 6:00 PM)' : 'Nighttime (6:00 PM – 6:00 AM)'}
          >
            {clock.isDaytime ? (
              <Sun className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{clock.isDaytime ? 'Day' : 'Night'}</span>
          </div>
        </div>
      </article>
    );
  }
);

ClockCard.displayName = 'ClockCard';
