import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Check,
  Compass,
  Copy,
  ExternalLink,
  Languages,
  MapPin,
  Moon,
  Phone,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Users,
  Wind,
  X,
} from 'lucide-react';
import type { Country } from '../data/countries';
import { formatClockForZone, formatPopulation } from '../utils/time';
import { getDaylightInfo, getSeasonInfo } from '../utils/solar';
import {
  convertCurrency,
  formatTemperature,
  type WeatherEntry,
} from '../services/intelligence';
import { AnalogClock } from './AnalogClock';
import { WeatherIcon } from './WeatherIcon';

interface CountryModalProps {
  country: Country | null;
  displayDate: Date;
  is24Hour: boolean;
  tempUnit: 'C' | 'F';
  isPinned: boolean;
  weather?: WeatherEntry;
  rates: Record<string, number>;
  ratesAreLive: boolean;
  onClose: () => void;
  onTogglePin: (iso: string) => void;
  onFocusOnGlobe: (country: Country) => void;
  onCopySummary: (country: Country, text: string) => void;
}

export const CountryModal: React.FC<CountryModalProps> = ({
  country,
  displayDate,
  is24Hour,
  tempUnit,
  isPinned,
  weather,
  rates,
  ratesAreLive,
  onClose,
  onTogglePin,
  onFocusOnGlobe,
  onCopySummary,
}) => {
  const [amountInput, setAmountInput] = useState<string>('100');
  const [converterDir, setConverterDir] = useState<'to-lkr' | 'from-lkr'>('to-lkr');
  const [copiedLocal, setCopiedLocal] = useState(false);

  useEffect(() => {
    if (!country) return;
    setAmountInput(country.currency === 'LKR' ? '1000' : '100');
    setConverterDir('to-lkr');
    setCopiedLocal(false);
  }, [country]);

  useEffect(() => {
    if (!country) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [country, onClose]);

  const clock = useMemo(() => {
    if (!country) return null;
    return formatClockForZone(displayDate, country.timezone, is24Hour);
  }, [country, displayDate, is24Hour]);

  const solarData = useMemo(() => {
    if (!country || !clock) return null;
    const season = getSeasonInfo(country.lat, displayDate, country.timezone);
    const daylight = getDaylightInfo(
      country.lat,
      country.lng,
      displayDate,
      country.timezone,
      clock.offsetMinutes,
      is24Hour
    );
    return { season, daylight };
  }, [country, clock, displayDate, is24Hour]);

  if (!country || !clock || !solarData) return null;

  const numericAmount = parseFloat(amountInput);
  const safeAmount = Number.isFinite(numericAmount) && numericAmount >= 0 ? numericAmount : 0;

  const isLkrCountry = country.currency === 'LKR';
  const fromCode = isLkrCountry
    ? converterDir === 'to-lkr'
      ? 'LKR'
      : 'USD'
    : converterDir === 'to-lkr'
      ? country.currency
      : 'LKR';
  const toPrimaryCode = isLkrCountry
    ? converterDir === 'to-lkr'
      ? 'USD'
      : 'LKR'
    : converterDir === 'to-lkr'
      ? 'LKR'
      : country.currency;

  const convertedPrimary = convertCurrency(safeAmount, fromCode, toPrimaryCode, rates);
  const convertedUsd = convertCurrency(safeAmount, fromCode, 'USD', rates);
  const oneUnitToLkr = convertCurrency(1, country.currency, 'LKR', rates);
  const oneUnitToUsd = convertCurrency(1, country.currency, 'USD', rates);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${country.capital}, ${country.name}`
  )}`;

  const callStyles =
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

  const handleCopy = () => {
    const weatherPart = weather
      ? ` · ${formatTemperature(weather.tempC, tempUnit)} ${weather.label}`
      : '';
    const summary = `${country.name} (${country.capital}) — ${clock.copyText}${weatherPart} · ${country.currency} · ${country.callingCode}`;
    onCopySummary(country, summary);
    setCopiedLocal(true);
    window.setTimeout(() => setCopiedLocal(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="country-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-2xl dark:border-white/12 dark:bg-slate-900/95">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-6 py-5 dark:border-white/[0.08]">
          <div className="flex min-w-0 items-center gap-3.5">
            <img
              src={`https://flagcdn.com/w160/${country.iso}.png`}
              alt={`Flag of ${country.name}`}
              width={56}
              height={38}
              referrerPolicy="no-referrer"
              className="h-10 w-14 shrink-0 rounded-lg object-cover ring-1 ring-slate-900/10 dark:ring-white/15"
            />
            <div className="min-w-0">
              <h2
                id="country-modal-title"
                className="truncate text-xl font-bold tracking-tight text-slate-950 dark:text-white"
              >
                {country.name}
              </h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {country.capital}
                </span>
                <span aria-hidden="true">·</span>
                <span>{country.continent}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-clock uppercase">{country.iso}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => onTogglePin(country.iso)}
              aria-label={isPinned ? 'Unpin favorite' : 'Pin favorite'}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                isPinned
                  ? 'border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white'
              }`}
            >
              <Star className="h-4 w-4" fill={isPinned ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close country details"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Primary Live Time + Analog Clock + Weather Row */}
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-5">
              <AnalogClock
                hour24={clock.hour24}
                minute={clock.minuteNum}
                second={clock.secondNum}
                isDaytime={clock.isDaytime}
                size={92}
              />
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="tabular-clock text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                    {clock.hours}:{clock.minutes}
                    <span className="text-lg font-medium text-slate-400 dark:text-slate-500">
                      :{clock.seconds}
                    </span>
                  </span>
                  {!is24Hour && clock.dayPeriod && (
                    <span className="tabular-clock text-sm font-semibold text-sky-600 dark:text-sky-400">
                      {clock.dayPeriod}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {clock.fullDate}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="tabular-clock font-medium text-slate-700 dark:text-slate-200">
                    {clock.utcOffset}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{country.timezone}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    {clock.isDaytime ? (
                      <Sun className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" aria-hidden="true" />
                    ) : (
                      <Moon className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-300" aria-hidden="true" />
                    )}
                    {clock.isDaytime ? 'Daytime' : 'Nighttime'}
                  </span>
                </div>
                <div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${callStyles.text}`}>
                  <span className={`h-2 w-2 rounded-full ${callStyles.dot}`} aria-hidden="true" />
                  <span>{clock.callStatus.label}</span>
                  <span className="font-normal text-slate-500 dark:text-slate-400">
                    — {clock.callStatus.detail}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Capital Weather Readout */}
            <div className="flex items-center justify-between border-t border-slate-200/70 pt-4 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0 dark:border-white/[0.08]">
              {weather ? (
                <>
                  <div className="flex items-center gap-2">
                    <WeatherIcon kind={weather.icon} className="h-6 w-6" />
                    <span className="tabular-clock text-2xl font-bold text-slate-950 dark:text-white">
                      {formatTemperature(weather.tempC, tempUnit)}
                    </span>
                  </div>
                  <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {weather.label}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1">
                      <Wind className="h-3 w-3" aria-hidden="true" />
                      <span className="tabular-clock">{weather.windKmh} km/h</span>
                      {weather.isFallback && <span>· Est.</span>}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400">Fetching weather…</p>
              )}
            </div>
          </div>

          {/* Season & Solar Daylight Duration Bar */}
          <div className="border-t border-slate-200/80 pt-5 dark:border-white/[0.08]">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {solarData.season.season} Season
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                  ·
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {solarData.season.hemisphere} Hemisphere
                </span>
              </div>
              <span className="tabular-clock font-semibold text-slate-700 dark:text-slate-200">
                Daylight: {solarData.daylight.daylightHoursStr} ({solarData.daylight.progressPercent}%)
              </span>
            </div>

            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                style={{ width: `${solarData.daylight.progressPercent}%` }}
                className={`h-full rounded-full transition-all duration-300 ${
                  solarData.daylight.isAfterSunriseBeforeSunset
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-sky-400'
                    : 'bg-indigo-500/60'
                }`}
              />
            </div>

            <div className="tabular-clock mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Sunrise className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" aria-hidden="true" />
                Sunrise {solarData.daylight.sunriseStr}
              </span>
              <span className="inline-flex items-center gap-1.5">
                Sunset {solarData.daylight.sunsetStr}
                <Sunset className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-300" aria-hidden="true" />
              </span>
            </div>
          </div>

          {/* Country Intelligence Specs Grid (Clean hairline separators, no nested boxes) */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-200/80 pt-5 sm:grid-cols-4 dark:border-white/[0.08]">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Population</span>
              </div>
              <p className="tabular-clock mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {formatPopulation(country.population)}
              </p>
              <p className="tabular-clock text-[11px] text-slate-400 dark:text-slate-500">
                {country.population.toLocaleString()}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Calling Code</span>
              </div>
              <p className="tabular-clock mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {country.callingCode}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                International dial
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Official Language</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {country.language}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Coordinates</span>
              </div>
              <p className="tabular-clock mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {Math.abs(country.lat).toFixed(2)}°{country.lat >= 0 ? 'N' : 'S'},{' '}
                {Math.abs(country.lng).toFixed(2)}°{country.lng >= 0 ? 'E' : 'W'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {country.capital}
              </p>
            </div>
          </div>

          {/* Currency & Quick LKR / USD Converter */}
          <div className="border-t border-slate-200/80 pt-5 dark:border-white/[0.08]">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Currency &amp; Exchange Converter ({country.currency} · {country.currencySymbol})
              </h3>
              <span className="tabular-clock text-xs text-slate-500 dark:text-slate-400">
                {ratesAreLive ? 'Live reference rates' : 'Reference fallback rates'} · 1 {country.currency} ={' '}
                {oneUnitToLkr >= 1 ? oneUnitToLkr.toFixed(2) : oneUnitToLkr.toFixed(4)} LKR · $
                {oneUnitToUsd >= 0.01 ? oneUnitToUsd.toFixed(3) : oneUnitToUsd.toFixed(5)} USD
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  aria-label={`Amount in ${fromCode}`}
                  className="tabular-clock h-11 w-full rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                />
                <span className="tabular-clock shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300">
                  {fromCode}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setConverterDir((d) => (d === 'to-lkr' ? 'from-lkr' : 'to-lkr'))
                }
                aria-label="Swap conversion direction"
                title="Swap direction"
                className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
              >
                <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="flex flex-1 flex-col rounded-xl bg-slate-100/80 px-4 py-2 dark:bg-white/[0.05]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="tabular-clock text-base font-bold text-slate-950 dark:text-white">
                    {convertedPrimary.toLocaleString(undefined, {
                      maximumFractionDigits: convertedPrimary >= 100 ? 2 : 4,
                    })}
                  </span>
                  <span className="tabular-clock text-xs font-bold text-sky-600 dark:text-sky-400">
                    {toPrimaryCode}
                  </span>
                </div>
                {toPrimaryCode !== 'USD' && fromCode !== 'USD' && (
                  <span className="tabular-clock text-[11px] text-slate-500 dark:text-slate-400">
                    ≈ $
                    {convertedUsd.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{' '}
                    USD
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-200/80 bg-slate-50/75 px-6 py-4 dark:border-white/[0.08] dark:bg-slate-950/55">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onFocusOnGlobe(country);
                onClose();
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/12 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.12]"
            >
              <Compass className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              Focus on 3D Globe
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/12 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.12]"
            >
              {copiedLocal ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copiedLocal ? 'Copied!' : 'Copy Summary'}
            </button>
          </div>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-sky-500 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
          >
            <span>Open in Google Maps</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
};
