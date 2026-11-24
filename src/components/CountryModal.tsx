import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Cable,
  Car,
  Check,
  Compass,
  Copy,
  ExternalLink,
  Globe2,
  Landmark,
  Languages,
  Lock,
  MapPin,
  Maximize2,
  Moon,
  Phone,
  Satellite,
  Shield,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Users,
  Wifi,
  Wind,
  X,
} from 'lucide-react';
import type { Country } from '../data/countries';
import { getCountryConnectivity } from '../data/connectivity';
import { getCulturalProfile } from '../data/culturalProfiles';
import {
  getOverheadSatellitesForCountry,
  type LiveSatellite,
} from '../services/satellites';
import {
  fetchEnrichedCountryProfile,
  getBaselineCountryProfile,
  type EnrichedCountryProfile,
} from '../services/countryProfile';
import { formatClockForZone, formatPopulation } from '../utils/time';
import { getDaylightInfo, getSeasonInfo } from '../utils/solar';
import {
  convertCurrency,
  formatTemperature,
  type WeatherEntry,
} from '../services/intelligence';
import { AnalogClock } from './AnalogClock';
import { WeatherIcon } from './WeatherIcon';
import { CharacterTurntableStage } from './CharacterTurntableStage';

interface CountryModalProps {
  country: Country | null;
  displayDate: Date;
  satellites: readonly LiveSatellite[];
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
  satellites,
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
  const [enrichedProfile, setEnrichedProfile] = useState<{
    iso: string;
    data: EnrichedCountryProfile;
  } | null>(null);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());

  const markImageFailed = useCallback((url: string) => {
    setFailedUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!country) return;
    setAmountInput(country.currency === 'LKR' ? '1000' : '100');
    setConverterDir('to-lkr');
    setCopiedLocal(false);
    setFailedUrls(new Set());

    let cancelled = false;
    const baseline = getBaselineCountryProfile(country);
    setEnrichedProfile({ iso: country.iso, data: baseline });

    void fetchEnrichedCountryProfile(country).then((loaded) => {
      if (!cancelled) {
        setEnrichedProfile({ iso: country.iso, data: loaded });
      }
    });

    return () => {
      cancelled = true;
    };
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

  const connectivity = useMemo(
    () => (country ? getCountryConnectivity(country) : null),
    [country]
  );

  const culturalProfile = useMemo(
    () => (country ? getCulturalProfile(country) : null),
    [country]
  );

  const overheadSats = useMemo(
    () => (country ? getOverheadSatellitesForCountry(country, satellites) : null),
    [country, satellites]
  );

  const activeProfile = useMemo(() => {
    if (!country) return null;
    if (enrichedProfile && enrichedProfile.iso === country.iso) {
      return enrichedProfile.data;
    }
    return getBaselineCountryProfile(country);
  }, [country, enrichedProfile]);

  if (
    !country ||
    !clock ||
    !solarData ||
    !connectivity ||
    !culturalProfile ||
    !overheadSats ||
    !activeProfile
  ) {
    return null;
  }

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

  const activeCables =
    connectivity.directCables.length > 0 ? connectivity.directCables : connectivity.transitCables;

  const leaderPortraitValid = Boolean(
    activeProfile.leader.portraitUrl && !failedUrls.has(activeProfile.leader.portraitUrl)
  );
  const coatOfArmsValid = Boolean(
    activeProfile.coatOfArmsUrl && !failedUrls.has(activeProfile.coatOfArmsUrl)
  );
  const flagUrl = `https://flagcdn.com/w160/${country.iso}.png`;
  const flagValid = !failedUrls.has(flagUrl);

  const handleCopy = () => {
    const weatherPart = weather
      ? ` · ${formatTemperature(weather.tempC, tempUnit)} ${weather.label}`
      : '';
    const summary = `${country.name} (${country.capital}) — ${clock.copyText}${weatherPart} · ${country.currency} · ${activeProfile.leader.title}: ${activeProfile.leader.name} · ISPs: ${connectivity.isps.slice(0, 3).join(', ')}`;
    onCopySummary(country, summary);
    setCopiedLocal(true);
    window.setTimeout(() => setCopiedLocal(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="country-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Country Spotlight Modal: Top Auto-Rotating Dual Character Stage + Bottom Scrollable Neon Telemetry Dock */}
      <div className="relative z-10 flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-sky-400/25 bg-[#070d1b]/95 text-slate-100 shadow-[0_24px_80px_-16px_rgba(14,165,233,0.38)]">
        {/* TOP STAGE: Non-Interactive Auto-Rotating 3D Dual Character Showcase */}
        <div className="relative shrink-0 border-b border-white/[0.1] bg-[#050a18]">
          {/* Solid Top Bar Overlay (zero backdrop-filter over WebGL) */}
          <div className="relative z-20 flex items-start justify-between gap-3 px-4 pt-3.5 pb-1 sm:px-6 sm:pt-4">
            <div className="flex min-w-0 items-center gap-3">
              {flagValid ? (
                <img
                  src={flagUrl}
                  alt={`Flag of ${country.name}`}
                  width={48}
                  height={32}
                  referrerPolicy="no-referrer"
                  onError={() => markImageFailed(flagUrl)}
                  className="h-8 w-12 shrink-0 rounded-lg object-cover ring-1 ring-white/20"
                />
              ) : (
                <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[11px] font-bold uppercase text-sky-300 ring-1 ring-white/20">
                  {country.iso}
                </div>
              )}
              <div className="min-w-0">
                <h2
                  id="country-modal-title"
                  className="truncate text-lg font-bold tracking-tight text-white sm:text-xl"
                >
                  {country.name}
                </h2>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                  <span className="font-medium text-slate-200">{country.capital}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeProfile.subregion}</span>
                  <span aria-hidden="true" className="hidden sm:inline">
                    ·
                  </span>
                  <span className="tabular-clock hidden uppercase sm:inline">{country.iso}</span>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <span
                title="Turntable rotates automatically in a continuous 360° loop (manual rotation disabled)"
                className="hidden items-center gap-1.5 rounded-lg border border-sky-400/25 bg-[#081327] px-2.5 py-1.5 text-[11px] font-medium text-sky-300 sm:inline-flex"
              >
                <Lock className="h-3 w-3" aria-hidden="true" />
                <span>Auto-Rotate 360°</span>
              </span>
              <button
                type="button"
                onClick={() => onTogglePin(country.iso)}
                aria-label={isPinned ? 'Unpin favorite' : 'Pin favorite'}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  isPinned
                    ? 'border-amber-400/40 bg-amber-400/15 text-amber-300'
                    : 'border-white/12 bg-[#081327] text-slate-300 hover:bg-white/[0.1] hover:text-white'
                }`}
              >
                <Star className="h-4 w-4" fill={isPinned ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close country spotlight"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-[#081327] text-slate-300 transition-colors hover:bg-white/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Locked Auto-Rotating 3D Dual Character Turntable Canvas */}
          <CharacterTurntableStage country={country} />

          {/* Quiet Cultural Ensemble Caption Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] bg-[#070f21] px-4 py-2 text-[11px] text-slate-400 sm:px-6">
            <span className="truncate text-slate-300">{culturalProfile.attireSummary}</span>
            <span className="shrink-0 text-sky-300/90">
              Continuous 360° Showcase Stage
            </span>
          </div>
        </div>

        {/* BOTTOM DOCK: Scrollable Neon Glassmorphism Telemetry Panel */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#081123]/95 to-[#060b18]/98 px-4 py-5 space-y-6 sm:px-6">
          {/* 1. Live Local Time/Date + Current Weather & Temperature */}
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4 sm:gap-5">
              <AnalogClock
                hour24={clock.hour24}
                minute={clock.minuteNum}
                second={clock.secondNum}
                isDaytime={clock.isDaytime}
                size={84}
              />
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="tabular-clock text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {clock.hours}:{clock.minutes}
                    <span className="text-base font-medium text-slate-400 sm:text-lg">
                      :{clock.seconds}
                    </span>
                  </span>
                  {!is24Hour && clock.dayPeriod && (
                    <span className="tabular-clock text-sm font-semibold text-sky-400">
                      {clock.dayPeriod}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-200">{clock.fullDate}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                  <span className="tabular-clock font-medium text-slate-200">{clock.utcOffset}</span>
                  <span aria-hidden="true">·</span>
                  <span>{country.timezone}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    {clock.isDaytime ? (
                      <Sun className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                    ) : (
                      <Moon className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
                    )}
                    {clock.isDaytime ? 'Daytime' : 'Nighttime'}
                  </span>
                </div>
                <div className={`mt-1.5 flex items-center gap-1.5 text-xs font-semibold ${callStyles.text}`}>
                  <span className={`h-2 w-2 rounded-full ${callStyles.dot}`} aria-hidden="true" />
                  <span>{clock.callStatus.label}</span>
                  <span className="font-normal text-slate-400">— {clock.callStatus.detail}</span>
                </div>
              </div>
            </div>

            {/* Weather & Temperature */}
            <div className="flex items-center justify-between border-t border-white/[0.08] pt-4 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
              {weather ? (
                <>
                  <div className="flex items-center gap-2">
                    <WeatherIcon kind={weather.icon} className="h-6 w-6" />
                    <span className="tabular-clock text-2xl font-bold text-white">
                      {formatTemperature(weather.tempC, tempUnit)}
                    </span>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p className="font-medium text-slate-200">{weather.label}</p>
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

          {/* 2. Country Visual Highlights & Head of State / Government Profile */}
          <section
            aria-label="Country visual highlights and national leadership"
            className="space-y-3.5 border-t border-white/[0.08] pt-5"
          >
            {/* Head of State / Government Card */}
            <div className="flex items-center justify-between gap-3.5 rounded-2xl border border-sky-400/20 bg-slate-900/65 p-3.5 sm:p-4">
              <div className="flex min-w-0 items-center gap-3.5">
                {leaderPortraitValid && activeProfile.leader.portraitUrl ? (
                  <img
                    src={activeProfile.leader.portraitUrl}
                    alt={`${activeProfile.leader.name} — ${activeProfile.leader.title}`}
                    width={64}
                    height={64}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={() => markImageFailed(activeProfile.leader.portraitUrl!)}
                    className="h-14 w-14 shrink-0 rounded-xl bg-slate-950 object-cover object-top ring-1 ring-sky-400/35 sm:h-16 sm:w-16"
                  />
                ) : coatOfArmsValid && activeProfile.coatOfArmsUrl ? (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-slate-950/90 p-2 sm:h-16 sm:w-16">
                    <img
                      src={activeProfile.coatOfArmsUrl}
                      alt={`Coat of arms of ${country.name}`}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={() => markImageFailed(activeProfile.coatOfArmsUrl!)}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-gradient-to-br from-sky-500/20 to-indigo-500/20 text-sky-300 sm:h-16 sm:w-16">
                    <Landmark className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                    <Shield className="h-3 w-3" aria-hidden="true" />
                    <span>Head of State / Government</span>
                  </p>
                  <h3 className="mt-0.5 truncate text-base font-bold text-white">
                    {activeProfile.leader.name}
                  </h3>
                  <p className="truncate text-xs font-medium text-amber-300/90">
                    {activeProfile.leader.title}
                  </p>
                  {activeProfile.leader.summary && (
                    <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">
                      {activeProfile.leader.summary}
                    </p>
                  )}
                </div>
              </div>

              {/* Optional Coat of Arms Emblem when Leader Portrait is shown */}
              {leaderPortraitValid && coatOfArmsValid && activeProfile.coatOfArmsUrl && (
                <div
                  title={`National Emblem of ${country.name}`}
                  className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950/80 p-1.5 sm:flex"
                >
                  <img
                    src={activeProfile.coatOfArmsUrl}
                    alt={`Emblem of ${country.name}`}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={() => markImageFailed(activeProfile.coatOfArmsUrl!)}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* Country Visual Images Gallery (Capital City & National Landmark / Scenic View) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeProfile.gallery.map((item, idx) => {
                const hasValidImage = Boolean(item.imageUrl && !failedUrls.has(item.imageUrl));
                return (
                  <figure
                    key={`${country.iso}-${item.label}-${idx}`}
                    className="group relative h-36 overflow-hidden rounded-2xl border border-white/[0.1] bg-slate-900/75 sm:h-40"
                  >
                    {hasValidImage && item.imageUrl ? (
                      <>
                        <img
                          src={item.imageUrl}
                          alt={item.caption}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={() => markImageFailed(item.imageUrl!)}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        <div
                          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050a16]/95 via-[#050a16]/30 to-transparent"
                          aria-hidden="true"
                        />
                        <figcaption className="absolute inset-x-0 bottom-0 p-3">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">
                            {item.label}
                          </span>
                          <p className="truncate text-xs font-semibold text-white">
                            {item.caption}
                          </p>
                        </figcaption>
                      </>
                    ) : (
                      <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-[#0b1730] via-[#091225] to-[#070e1d] p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
                            {idx === 0 ? (
                              <MapPin className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <Landmark className="h-3 w-3" aria-hidden="true" />
                            )}
                            {item.label}
                          </span>
                          {flagValid && (
                            <img
                              src={flagUrl}
                              alt=""
                              aria-hidden="true"
                              referrerPolicy="no-referrer"
                              className="h-4 w-6 rounded-sm object-cover opacity-75 ring-1 ring-white/15"
                            />
                          )}
                        </div>
                        <div>
                          <p className="truncate text-sm font-semibold text-white">
                            {item.caption}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {!activeProfile.isLoaded
                              ? 'Loading regional imagery…'
                              : `${country.continent} · ${Math.abs(country.lat).toFixed(1)}°${country.lat >= 0 ? 'N' : 'S'}, ${Math.abs(country.lng).toFixed(1)}°${country.lng >= 0 ? 'E' : 'W'}`}
                          </p>
                        </div>
                      </div>
                    )}
                  </figure>
                );
              })}
            </div>

            {activeProfile.countryExtract && (
              <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
                {activeProfile.countryExtract}
              </p>
            )}
          </section>

          {/* 3. Comprehensive Country Intelligence Specs Grid */}
          <section
            aria-label="Country key details"
            className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-white/[0.08] pt-5 sm:grid-cols-4"
          >
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Globe2 className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                <span>Capital &amp; Region</span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-white">{country.capital}</p>
              <p className="truncate text-[11px] text-slate-500">{activeProfile.subregion}</p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Users className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                <span>Population</span>
              </div>
              <p className="tabular-clock mt-1 text-sm font-semibold text-white">
                {formatPopulation(country.population)}
              </p>
              <p className="tabular-clock text-[11px] text-slate-500">
                {country.population.toLocaleString()}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Maximize2 className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                <span>Land Area</span>
              </div>
              <p className="tabular-clock mt-1 text-sm font-semibold text-white">
                {activeProfile.areaKm2
                  ? `${activeProfile.areaKm2.toLocaleString()} km²`
                  : activeProfile.isLoaded
                    ? '—'
                    : 'Loading…'}
              </p>
              <p className="text-[11px] text-slate-500">{solarData.season.hemisphere} Hem.</p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Languages className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                <span>Languages</span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-white" title={activeProfile.languages.join(', ')}>
                {activeProfile.languages.slice(0, 2).join(', ')}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {activeProfile.languages.length > 2
                  ? `+${activeProfile.languages.length - 2} more official`
                  : 'Official language'}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Phone className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                <span>Calling Code</span>
              </div>
              <p className="tabular-clock mt-1 text-sm font-semibold text-white">
                {country.callingCode}
              </p>
              <p className="text-[11px] text-slate-500">International dial</p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Car className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                <span>Driving Side</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-white">
                {activeProfile.drivingSide}-hand
              </p>
              <p className="text-[11px] text-slate-500">
                {activeProfile.drivingSide === 'Left' ? 'Keep Left (LHT)' : 'Keep Right (RHT)'}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ArrowRightLeft className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                <span>Currency</span>
              </div>
              <p className="tabular-clock mt-1 text-sm font-semibold text-white">
                {country.currency} · {country.currencySymbol}
              </p>
              <p className="tabular-clock text-[11px] text-slate-500">
                ≈ {oneUnitToLkr >= 1 ? oneUnitToLkr.toFixed(1) : oneUnitToLkr.toFixed(3)} LKR
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                <span>Coordinates</span>
              </div>
              <p className="tabular-clock mt-1 text-sm font-semibold text-white">
                {Math.abs(country.lat).toFixed(2)}°{country.lat >= 0 ? 'N' : 'S'},{' '}
                {Math.abs(country.lng).toFixed(2)}°{country.lng >= 0 ? 'E' : 'W'}
              </p>
              <p className="truncate text-[11px] text-slate-500">{country.continent}</p>
            </div>
          </section>

          {/* 4. Major Internet Service Providers (ISPs) & Submarine Cable Connections */}
          <section
            aria-label="Submarine cables and major ISPs"
            className="border-t border-white/[0.08] pt-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Cable className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                <span>Internet Service Providers (ISPs) &amp; Submarine Cables</span>
              </h3>
              <span className="text-xs text-slate-400">{connectivity.gatewaySummary}</span>
            </div>

            <div className="mt-3.5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Major ISPs List */}
              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                  <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Major National ISPs</span>
                </div>
                <ul className="mt-2.5 divide-y divide-white/[0.06] text-xs">
                  {connectivity.isps.map((isp, idx) => (
                    <li key={isp} className="flex items-center justify-between py-1.5 text-slate-200">
                      <span className="font-medium">{isp}</span>
                      <span className="tabular-clock text-[11px] text-slate-500">
                        {idx === 0 ? 'Primary Backbone' : 'Broadband / 5G'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Submarine Fiber-Optic Cables */}
              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <Cable className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {connectivity.isLandlockedTransit
                      ? 'Nearest Regional Submarine Gateways'
                      : 'Connected Submarine Fiber Cables'}
                  </span>
                </div>
                <ul className="mt-2.5 divide-y divide-white/[0.06] text-xs">
                  {activeCables.map((cable) => (
                    <li key={cable.id} className="py-2 first:pt-0.5 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-semibold ${
                            cable.color === 'cyan' ? 'text-cyan-300' : 'text-amber-300'
                          }`}
                        >
                          {cable.name}
                        </span>
                        <span className="tabular-clock text-[11px] text-slate-400">
                          {cable.capacityTbps} Tbps · {cable.lengthKm.toLocaleString()} km
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">{cable.regionLabel}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* 5. Nearby / Overhead Satellites & ISS Pass Status */}
          <section
            aria-label="Overhead satellites and ISS pass status"
            className="border-t border-white/[0.08] pt-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Satellite className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span>Nearby Satellites &amp; ISS Pass Status</span>
              </h3>
              <span className="tabular-clock text-xs text-emerald-300">
                ISS: {overheadSats.issMatch.statusLabel} ({overheadSats.issMatch.distanceKm.toLocaleString()} km ground range)
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {/* ISS Priority Telemetry Row */}
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/[0.08] px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-emerald-300">
                    {overheadSats.issMatch.satellite.name}
                  </span>
                  <span className="tabular-clock font-semibold text-emerald-200">
                    {overheadSats.issMatch.statusLabel}
                  </span>
                </div>
                <div className="tabular-clock mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-300">
                  <span>LEO</span>
                  <span>·</span>
                  <span>Alt {Math.round(overheadSats.issMatch.satellite.altitudeKm)} km</span>
                  <span>·</span>
                  <span>{Math.round(overheadSats.issMatch.satellite.velocityKmh).toLocaleString()} km/h</span>
                </div>
              </div>

              {/* Top Nearest Constellation Satellites */}
              {overheadSats.nearest.slice(0, 3).map(({ satellite, distanceKm, statusLabel }) => (
                <div
                  key={satellite.id}
                  className="rounded-xl border border-white/[0.08] bg-slate-900/60 px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-white">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: satellite.colorHex }}
                        aria-hidden="true"
                      />
                      {satellite.name}
                    </span>
                    <span className="tabular-clock text-[11px] text-sky-300">{statusLabel}</span>
                  </div>
                  <div className="tabular-clock mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
                    <span>{satellite.orbitType}</span>
                    <span>·</span>
                    <span>{satellite.category}</span>
                    <span>·</span>
                    <span>{distanceKm.toLocaleString()} km</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Currency & Live Exchange Rate (including LKR & USD Converter) */}
          <section
            aria-label="Currency and live exchange rate"
            className="border-t border-white/[0.08] pt-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">
                Currency &amp; Exchange Converter ({country.currency} · {country.currencySymbol})
              </h3>
              <span className="tabular-clock text-xs text-slate-400">
                {ratesAreLive ? 'Live rates' : 'Reference rates'} · 1 {country.currency} ={' '}
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
                  className="tabular-clock h-11 w-full rounded-xl border border-white/12 bg-slate-950/80 px-3.5 text-sm font-semibold text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                />
                <span className="tabular-clock shrink-0 text-xs font-bold text-slate-300">
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
                className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-xl border border-white/12 text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="flex flex-1 flex-col rounded-xl bg-white/[0.05] px-4 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="tabular-clock text-base font-bold text-white">
                    {convertedPrimary.toLocaleString(undefined, {
                      maximumFractionDigits: convertedPrimary >= 100 ? 2 : 4,
                    })}
                  </span>
                  <span className="tabular-clock text-xs font-bold text-sky-400">
                    {toPrimaryCode}
                  </span>
                </div>
                {toPrimaryCode !== 'USD' && fromCode !== 'USD' && (
                  <span className="tabular-clock text-[11px] text-slate-400">
                    ≈ $
                    {convertedUsd.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{' '}
                    USD
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* 7. Season & Solar Daylight Duration Bar */}
          <div className="border-t border-white/[0.08] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{solarData.season.season} Season</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-slate-400">{solarData.season.hemisphere} Hemisphere</span>
              </div>
              <span className="tabular-clock font-semibold text-slate-200">
                Daylight: {solarData.daylight.daylightHoursStr} ({solarData.daylight.progressPercent}%)
              </span>
            </div>

            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                style={{ width: `${solarData.daylight.progressPercent}%` }}
                className={`h-full rounded-full transition-all duration-300 ${
                  solarData.daylight.isAfterSunriseBeforeSunset
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-sky-400'
                    : 'bg-indigo-500/60'
                }`}
              />
            </div>

            <div className="tabular-clock mt-2 flex items-center justify-between text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Sunrise className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                Sunrise {solarData.daylight.sunriseStr}
              </span>
              <span className="inline-flex items-center gap-1.5">
                Sunset {solarData.daylight.sunsetStr}
                <Sunset className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-white/[0.08] bg-[#060c1a] px-4 py-3.5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onFocusOnGlobe(country);
                onClose();
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.06] px-3.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.12] hover:text-white"
            >
              <Compass className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              Focus Cables on Globe
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.06] px-3.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.12] hover:text-white"
            >
              {copiedLocal ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
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
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sky-500 px-4 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400"
          >
            <span>Open in Google Maps</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
};
