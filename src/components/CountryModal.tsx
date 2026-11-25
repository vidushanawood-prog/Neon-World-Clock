import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  BookOpen,
  Briefcase,
  Cable,
  Car,
  Check,
  Compass,
  Copy,
  ExternalLink,
  Factory,
  Globe2,
  Landmark,
  Languages,
  Lock,
  MapPin,
  Maximize2,
  Moon,
  Package,
  Phone,
  Satellite,
  Shield,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Trophy,
  Users,
  Volume2,
  Wifi,
  Wind,
  X,
} from 'lucide-react';
import type { Country } from '../data/countries';
import { getCountryConnectivity } from '../data/connectivity';
import { getCulturalProfile } from '../data/culturalProfiles';
import {
  getCountryFootballProfile,
  getCountryTradeProfile,
} from '../data/tradeAndBrands';
import { getCountryOverviewParagraph } from '../data/countryOverviews';
import {
  getOverheadSatellitesForCountry,
  type LiveSatellite,
} from '../services/satellites';
import {
  fetchEnrichedCountryProfile,
  fetchFootballPlayerPortraits,
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
import {
  NationalAnthemBar,
  type NationalAnthemController,
} from './NationalAnthemBar';

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
  anthemController: NationalAnthemController;
  scrollTarget?: 'football' | null;
  onClose: () => void;
  onTogglePin: (iso: string) => void;
  onFocusOnGlobe: (country: Country) => void;
  onCopySummary: (country: Country, text: string) => void;
  onNarrateCountry: (country: Country) => void;
  onReadOverview: (country: Country, overviewText: string) => void;
  onNarrateSection?: (topic: string, text: string) => void;
}

function getInitials(name: string): string {
  const parts = name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'XI';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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
  anthemController,
  scrollTarget,
  onClose,
  onTogglePin,
  onFocusOnGlobe,
  onCopySummary,
  onNarrateCountry,
  onReadOverview,
  onNarrateSection,
}) => {
  const footballSectionRef = useRef<HTMLElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [amountInput, setAmountInput] = useState<string>('100');
  const [converterDir, setConverterDir] = useState<'to-lkr' | 'from-lkr'>('to-lkr');
  const [copiedLocal, setCopiedLocal] = useState(false);
  const [enrichedProfile, setEnrichedProfile] = useState<{
    iso: string;
    data: EnrichedCountryProfile;
  } | null>(null);
  const [playerPortraits, setPlayerPortraits] = useState<Record<string, string>>({});
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());

  const markImageFailed = useCallback((url: string) => {
    setFailedUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);

  const footballProfile = useMemo(
    () => (country ? getCountryFootballProfile(country) : null),
    [country]
  );

  useEffect(() => {
    if (!country) return;
    setAmountInput(country.currency === 'LKR' ? '1000' : '100');
    setConverterDir('to-lkr');
    setCopiedLocal(false);
    setFailedUrls(new Set());
    setPlayerPortraits({});
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    let cancelled = false;
    const baseline = getBaselineCountryProfile(country);
    setEnrichedProfile({ iso: country.iso, data: baseline });

    void fetchEnrichedCountryProfile(country).then((loaded) => {
      if (!cancelled) {
        setEnrichedProfile({ iso: country.iso, data: loaded });
      }
    });

    const fb = getCountryFootballProfile(country);
    const slugs = fb.keyPlayers
      .map((p) => p.wikiSlug)
      .filter((s): s is string => Boolean(s));
    if (slugs.length > 0) {
      void fetchFootballPlayerPortraits(slugs).then((map) => {
        if (!cancelled) {
          setPlayerPortraits(map);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [country]);

  // Lock body scroll cleanly while full-screen country view is open
  useEffect(() => {
    if (!country) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
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

  const tradeProfile = useMemo(
    () => (country ? getCountryTradeProfile(country) : null),
    [country]
  );

  const overviewParagraph = useMemo(() => {
    if (!country || !tradeProfile || !connectivity || !footballProfile || !activeProfile) {
      return '';
    }
    return getCountryOverviewParagraph(country, tradeProfile, connectivity, footballProfile, {
      subregion: activeProfile.subregion,
      areaKm2: activeProfile.areaKm2,
      drivingSide: activeProfile.drivingSide,
      languages: activeProfile.languages,
      leaderName: activeProfile.leader.name,
      leaderTitle: activeProfile.leader.title,
    });
  }, [country, tradeProfile, connectivity, footballProfile, activeProfile]);

  useEffect(() => {
    if (!country || scrollTarget !== 'football') return;
    const t = window.setTimeout(() => {
      footballSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 220);
    return () => window.clearTimeout(t);
  }, [country, scrollTarget]);

  if (
    !country ||
    !clock ||
    !solarData ||
    !connectivity ||
    !culturalProfile ||
    !overheadSats ||
    !activeProfile ||
    !tradeProfile ||
    !footballProfile
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
      ? { dot: 'bg-emerald-400', text: 'text-emerald-300' }
      : clock.callStatus.level === 'window'
        ? { dot: 'bg-amber-400', text: 'text-amber-300' }
        : { dot: 'bg-rose-400', text: 'text-rose-300' };

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

  const handleNarrateFootball = () => {
    const playersSummary = footballProfile.keyPlayers
      .slice(0, 3)
      .map((p) => `${p.name}, ${p.position}`)
      .join('; ');
    const text = `${footballProfile.teamName}, nicknamed ${footballProfile.nickname}, competes in ${footballProfile.confederation} from ${footballProfile.homeStadium}. Highlight: ${footballProfile.iconicMoment}. Key squad players include ${playersSummary}.`;
    if (onNarrateSection) {
      onNarrateSection(`Football · ${country.name}`, text);
    } else {
      onReadOverview(country, text);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden bg-[#050a18] text-slate-100"
      role="dialog"
      aria-modal="true"
      aria-labelledby="country-modal-title"
    >
      {/* STICKY FULL-SCREEN HEADER (Zero crowding even on 360px phones) */}
      <header className="shrink-0 border-b border-white/[0.09] bg-[#060d1f] px-3.5 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to World Clocks"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.06] px-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:px-3"
            >
              <ArrowLeft className="h-4 w-4 text-sky-400" aria-hidden="true" />
              <span className="hidden sm:inline">Back</span>
            </button>

            {flagValid ? (
              <img
                src={flagUrl}
                alt={`Flag of ${country.name}`}
                width={48}
                height={32}
                referrerPolicy="no-referrer"
                onError={() => markImageFailed(flagUrl)}
                className="h-7 w-10 shrink-0 rounded-md object-cover ring-1 ring-white/20 sm:h-8 sm:w-12 sm:rounded-lg"
              />
            ) : (
              <div className="flex h-7 w-10 shrink-0 items-center justify-center rounded-md bg-slate-800 text-[11px] font-bold uppercase text-sky-300 ring-1 ring-white/20 sm:h-8 sm:w-12 sm:rounded-lg">
                {country.iso}
              </div>
            )}

            <div className="min-w-0">
              <h2
                id="country-modal-title"
                className="truncate text-base font-bold tracking-tight text-white sm:text-xl"
              >
                {country.name}
              </h2>
              <p className="truncate text-[11px] text-slate-400 sm:text-xs">
                <span className="font-medium text-slate-200">{country.capital}</span>
                <span aria-hidden="true"> · </span>
                <span>{activeProfile.subregion}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => onNarrateCountry(country)}
              aria-label={`Narrate ${country.name} details`}
              title="On-Demand Voice Narrator: Read country details aloud"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-2.5 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 hover:text-white whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:px-3.5"
            >
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Narrate</span>
            </button>

            <button
              type="button"
              onClick={() => onTogglePin(country.iso)}
              aria-label={isPinned ? 'Unpin favorite' : 'Pin favorite'}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                isPinned
                  ? 'border-amber-400/40 bg-amber-400/15 text-amber-300'
                  : 'border-white/12 bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] hover:text-white'
              }`}
            >
              <Star className="h-4 w-4" fill={isPinned ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close country view"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-slate-300 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* FULL-SCREEN ADAPTIVE SCROLLABLE BODY (Spacious cards, zero cramped boxes, zero horizontal scroll) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#071022] via-[#060c1b] to-[#050914]"
      >
        <div className="mx-auto w-full max-w-6xl space-y-6 px-3.5 pt-5 pb-28 sm:space-y-7 sm:px-6 sm:pt-6 sm:pb-24 lg:px-8">
          {/* 1. HERO BAND: Auto-Rotating Dual Character Showcase + Live Clock, Weather & Anthem */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Strictly Auto-Rotating 3D Dual Character Stage */}
            <div className="overflow-hidden rounded-3xl border border-sky-400/20 bg-[#050a18] lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] bg-[#070f21] px-4 py-3 text-xs">
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-200">
                  {culturalProfile.attireSummary}
                </span>
                <span
                  title="Turntable rotates automatically in a continuous 360° loop (manual rotation disabled)"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-400/25 bg-[#081327] px-2.5 py-1 text-[11px] font-semibold text-sky-300"
                >
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  <span>Auto-Rotate 360°</span>
                </span>
              </div>

              <CharacterTurntableStage country={country} />
            </div>

            {/* Live Clock, Analog Dial, Weather & National Anthem Control Bar */}
            <div className="flex flex-col justify-between gap-5 rounded-3xl border border-white/[0.09] bg-[#081226]/92 p-5 sm:p-6 lg:col-span-5">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                  <AnalogClock
                    hour24={clock.hour24}
                    minute={clock.minuteNum}
                    second={clock.secondNum}
                    isDaytime={clock.isDaytime}
                    size={84}
                  />
                  <div className="min-w-0 flex-1">
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
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                      <span className="tabular-clock font-medium text-slate-200">{clock.utcOffset}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{country.timezone}</span>
                    </div>
                    <div className={`mt-1.5 flex items-center gap-1.5 text-xs font-semibold ${callStyles.text}`}>
                      <span className={`h-2 w-2 shrink-0 rounded-full ${callStyles.dot}`} aria-hidden="true" />
                      <span className="truncate">{clock.callStatus.label}</span>
                    </div>
                  </div>
                </div>

                {/* Weather Card */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-slate-950/65 px-4 py-3.5">
                  {weather ? (
                    <>
                      <div className="flex items-center gap-3">
                        <WeatherIcon kind={weather.icon} className="h-7 w-7" />
                        <div>
                          <p className="tabular-clock text-xl font-bold text-white">
                            {formatTemperature(weather.tempC, tempUnit)}
                          </p>
                          <p className="text-xs text-slate-300">{weather.label}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <p className="inline-flex items-center gap-1.5 font-medium text-slate-200">
                          <Wind className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                          <span className="tabular-clock">{weather.windKmh} km/h</span>
                        </p>
                        <p className="mt-1 inline-flex items-center gap-1.5">
                          {clock.isDaytime ? (
                            <Sun className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                          ) : (
                            <Moon className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
                          )}
                          <span>{clock.isDaytime ? 'Daytime' : 'Nighttime'}</span>
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400">Fetching live weather…</p>
                  )}
                </div>
              </div>

              {/* National Anthem Auto-Play Control Bar (strictly coordinates with on-demand voice) */}
              <NationalAnthemBar controller={anthemController} variant="modal" />
            </div>
          </div>

          {/* 2. Leader Profile & Country Visual Gallery */}
          <section
            aria-label="National leadership and country visual highlights"
            className="space-y-4"
          >
            {/* Spacious Leader Card */}
            <div className="flex items-center justify-between gap-4 rounded-3xl border border-sky-400/20 bg-slate-900/65 p-5">
              <div className="flex min-w-0 items-center gap-4">
                {leaderPortraitValid && activeProfile.leader.portraitUrl ? (
                  <img
                    src={activeProfile.leader.portraitUrl}
                    alt={`${activeProfile.leader.name} — ${activeProfile.leader.title}`}
                    width={72}
                    height={72}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={() => markImageFailed(activeProfile.leader.portraitUrl!)}
                    className="h-16 w-16 shrink-0 rounded-2xl bg-slate-950 object-cover object-top ring-1 ring-sky-400/35 sm:h-20 sm:w-20"
                  />
                ) : coatOfArmsValid && activeProfile.coatOfArmsUrl ? (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-slate-950/90 p-2 sm:h-20 sm:w-20">
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
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-500/20 to-indigo-500/20 text-sky-300 sm:h-20 sm:w-20">
                    <Landmark className="h-7 w-7" aria-hidden="true" />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                    <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Head of State / Government</span>
                  </p>
                  <h3 className="mt-1 truncate text-base font-bold text-white sm:text-lg">
                    {activeProfile.leader.name}
                  </h3>
                  <p className="truncate text-xs font-medium text-amber-300/90 sm:text-sm">
                    {activeProfile.leader.title}
                  </p>
                  {activeProfile.leader.summary && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
                      {activeProfile.leader.summary}
                    </p>
                  )}
                </div>
              </div>

              {leaderPortraitValid && coatOfArmsValid && activeProfile.coatOfArmsUrl && (
                <div
                  title={`National Emblem of ${country.name}`}
                  className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 p-2 sm:flex"
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

            {/* Country Visual Gallery (Generous height, clean 1-col mobile / 2-col tablet+) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {activeProfile.gallery.map((item, idx) => {
                const hasValidImage = Boolean(item.imageUrl && !failedUrls.has(item.imageUrl));
                return (
                  <figure
                    key={`${country.iso}-${item.label}-${idx}`}
                    className="group relative h-48 overflow-hidden rounded-3xl border border-white/[0.1] bg-slate-900/75 sm:h-52"
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
                        <figcaption className="absolute inset-x-0 bottom-0 p-4">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                            {item.label}
                          </span>
                          <p className="truncate text-sm font-semibold text-white">
                            {item.caption}
                          </p>
                        </figcaption>
                      </>
                    ) : (
                      <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-[#0b1730] via-[#091225] to-[#070e1d] p-5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                            {idx === 0 ? (
                              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {item.label}
                          </span>
                          {flagValid && (
                            <img
                              src={flagUrl}
                              alt=""
                              aria-hidden="true"
                              referrerPolicy="no-referrer"
                              className="h-5 w-7 rounded-sm object-cover opacity-80 ring-1 ring-white/15"
                            />
                          )}
                        </div>
                        <div>
                          <p className="truncate text-base font-semibold text-white">
                            {item.caption}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
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
          </section>

          {/* 3. Comprehensive Country Intelligence Specs Grid */}
          <section
            aria-label="Country key details"
            className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Globe2 className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
                <span className="truncate">Capital &amp; Region</span>
              </div>
              <p className="mt-1.5 truncate text-sm font-semibold text-white">{country.capital}</p>
              <p className="mt-0.5 truncate text-xs text-slate-400">{activeProfile.subregion}</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Users className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
                <span>Population</span>
              </div>
              <p className="tabular-clock mt-1.5 text-sm font-semibold text-white">
                {formatPopulation(country.population)}
              </p>
              <p className="tabular-clock mt-0.5 truncate text-xs text-slate-400">
                {country.population.toLocaleString()}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Maximize2 className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
                <span>Land Area</span>
              </div>
              <p className="tabular-clock mt-1.5 truncate text-sm font-semibold text-white">
                {activeProfile.areaKm2
                  ? `${activeProfile.areaKm2.toLocaleString()} km²`
                  : activeProfile.isLoaded
                    ? '—'
                    : 'Loading…'}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{solarData.season.hemisphere} Hem.</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Languages className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
                <span>Languages</span>
              </div>
              <p
                className="mt-1.5 truncate text-sm font-semibold text-white"
                title={activeProfile.languages.join(', ')}
              >
                {activeProfile.languages.slice(0, 2).join(', ')}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {activeProfile.languages.length > 2
                  ? `+${activeProfile.languages.length - 2} more`
                  : 'Official'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Phone className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
                <span>Calling Code</span>
              </div>
              <p className="tabular-clock mt-1.5 text-sm font-semibold text-white">
                {country.callingCode}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">International dial</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Car className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
                <span>Driving Side</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-white">
                {activeProfile.drivingSide}-hand
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {activeProfile.drivingSide === 'Left' ? 'Keep Left (LHT)' : 'Keep Right (RHT)'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
                <span>Currency</span>
              </div>
              <p className="tabular-clock mt-1.5 truncate text-sm font-semibold text-white">
                {country.currency} · {country.currencySymbol}
              </p>
              <p className="tabular-clock mt-0.5 truncate text-xs text-slate-400">
                ≈ {oneUnitToLkr >= 1 ? oneUnitToLkr.toFixed(1) : oneUnitToLkr.toFixed(3)} LKR
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
                <span>Coordinates</span>
              </div>
              <p className="tabular-clock mt-1.5 truncate text-sm font-semibold text-white">
                {Math.abs(country.lat).toFixed(2)}°{country.lat >= 0 ? 'N' : 'S'},{' '}
                {Math.abs(country.lng).toFixed(2)}°{country.lng >= 0 ? 'E' : 'W'}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-400">{country.continent}</p>
            </div>
          </section>

          {/* 4. Dedicated Full-Width Trade, Exports & Famous Brands Card */}
          <section
            aria-label={`Trade, exports, and famous brands of ${country.name}`}
            className="rounded-3xl border border-white/[0.09] bg-slate-900/60 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <Briefcase className="h-4.5 w-4.5 text-sky-400" aria-hidden="true" />
                <span>Trade, Exports &amp; Famous Brands</span>
              </h3>
              <span className="text-xs font-medium text-sky-300">{country.name} Economy</span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
              {tradeProfile.tradeHighlight}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3.5 rounded-2xl border border-white/[0.07] bg-slate-950/65 p-4 sm:p-5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                    <Package className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Top Exports</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-100 sm:text-sm">
                    {tradeProfile.topExports.join(' · ')}
                  </p>
                </div>
                <div className="border-t border-white/[0.06] pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Key Imports</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                    {tradeProfile.topImports.join(' · ')}
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 rounded-2xl border border-white/[0.07] bg-slate-950/65 p-4 sm:p-5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                    <Factory className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Core Industries</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-100 sm:text-sm">
                    {tradeProfile.coreIndustries.join(' · ')}
                  </p>
                </div>
                <div className="border-t border-white/[0.06] pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                    <Star className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Famous National &amp; Global Brands</span>
                  </div>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-white sm:text-sm">
                    {tradeProfile.famousBrands.join(' · ')}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Dedicated Full-Width National Football Team + Key Players & Player Portraits */}
          <section
            id="country-football-section"
            ref={footballSectionRef}
            aria-label={`National Football team and players of ${country.name}`}
            className="rounded-3xl border border-amber-400/20 bg-slate-900/60 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-white">
                  <Trophy className="h-4.5 w-4.5 text-amber-400" aria-hidden="true" />
                  <span>{footballProfile.teamName}</span>
                </h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-300">
                  <span className="font-semibold text-sky-300">{footballProfile.nickname}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-amber-300">{footballProfile.confederation}</span>
                  <span aria-hidden="true">·</span>
                  <span>{footballProfile.homeStadium}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleNarrateFootball}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-500/12 px-3 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/22 hover:text-white whitespace-nowrap"
              >
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Narrate Team</span>
              </button>
            </div>

            <p className="mt-3 rounded-2xl border border-white/[0.07] bg-slate-950/60 px-4 py-3 text-xs leading-relaxed text-slate-200 sm:text-sm">
              {footballProfile.iconicMoment}
            </p>

            {/* Key National Players Grid with Live Portrait Images */}
            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {footballProfile.keyPlayers.map((player) => {
                const portraitUrl = player.wikiSlug ? playerPortraits[player.wikiSlug] : undefined;
                const portraitValid = Boolean(portraitUrl && !failedUrls.has(portraitUrl));
                return (
                  <div
                    key={`${country.iso}-${player.name}-${player.number}`}
                    className="flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-slate-950/70 p-3.5 sm:flex-col sm:items-stretch sm:p-4"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-sky-400/25 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 sm:h-40 sm:w-full">
                      {portraitValid && portraitUrl ? (
                        <img
                          src={portraitUrl}
                          alt={`${player.name} — ${footballProfile.teamName}`}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={() => markImageFailed(portraitUrl)}
                          className="h-full w-full object-cover object-top"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#0e2040] via-[#0a152b] to-[#060c1a] text-sky-300">
                          <span className="text-lg font-bold tracking-tight sm:text-2xl">
                            {getInitials(player.name)}
                          </span>
                          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {country.iso} XI
                          </span>
                        </div>
                      )}
                      <span className="tabular-clock absolute top-1.5 right-1.5 rounded-lg bg-[#050a18]/90 px-2 py-0.5 text-[11px] font-bold text-amber-300 ring-1 ring-amber-400/35">
                        #{player.number}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{player.name}</p>
                      <p className="mt-0.5 truncate text-xs font-medium text-cyan-300">
                        {player.position}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-400">{player.club}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 6. Major ISPs & Submarine Cables + Nearby Satellites & ISS */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <section
              aria-label="Submarine cables and major ISPs"
              className="rounded-3xl border border-white/[0.09] bg-slate-900/60 p-5 sm:p-6 lg:col-span-7"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white sm:text-base">
                  <Cable className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                  <span>ISPs &amp; Submarine Cables</span>
                </h3>
                <span className="text-xs text-slate-400">{connectivity.gatewaySummary}</span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.07] bg-slate-950/65 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                    <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Major National ISPs</span>
                  </div>
                  <ul className="mt-2.5 divide-y divide-white/[0.06] text-xs">
                    {connectivity.isps.map((isp, idx) => (
                      <li key={isp} className="flex items-center justify-between gap-2 py-2 text-slate-200">
                        <span className="truncate font-medium">{isp}</span>
                        <span className="tabular-clock shrink-0 text-[11px] text-slate-400">
                          {idx === 0 ? 'Primary' : 'Broadband / 5G'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-slate-950/65 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <Cable className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {connectivity.isLandlockedTransit
                        ? 'Regional Submarine Gateways'
                        : 'Connected Submarine Cables'}
                    </span>
                  </div>
                  <ul className="mt-2.5 divide-y divide-white/[0.06] text-xs">
                    {activeCables.map((cable) => (
                      <li key={cable.id} className="py-2 first:pt-0.5 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate font-semibold ${
                              cable.color === 'cyan' ? 'text-cyan-300' : 'text-amber-300'
                            }`}
                          >
                            {cable.name}
                          </span>
                          <span className="tabular-clock shrink-0 text-[11px] text-slate-400">
                            {cable.capacityTbps} Tbps
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400">{cable.regionLabel}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Nearby Satellites & ISS */}
            <section
              aria-label="Overhead satellites and ISS pass status"
              className="rounded-3xl border border-white/[0.09] bg-slate-900/60 p-5 sm:p-6 lg:col-span-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white sm:text-base">
                  <Satellite className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span>Satellites &amp; ISS Pass</span>
                </h3>
                <span className="tabular-clock text-xs text-emerald-300">
                  {overheadSats.issMatch.distanceKm.toLocaleString()} km
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.08] px-4 py-3">
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
                    <span>
                      {Math.round(overheadSats.issMatch.satellite.velocityKmh).toLocaleString()} km/h
                    </span>
                  </div>
                </div>

                {overheadSats.nearest.slice(0, 3).map(({ satellite, distanceKm, statusLabel }) => (
                  <div
                    key={satellite.id}
                    className="rounded-2xl border border-white/[0.07] bg-slate-950/65 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5 font-semibold text-white">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: satellite.colorHex }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{satellite.name}</span>
                      </span>
                      <span className="tabular-clock shrink-0 text-[11px] text-sky-300">
                        {statusLabel}
                      </span>
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
          </div>

          {/* 7. Currency Converter & Solar Daylight Bar */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <section
              aria-label="Currency and live exchange rate"
              className="rounded-3xl border border-white/[0.09] bg-slate-900/60 p-5 sm:p-6 lg:col-span-7"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-white sm:text-base">
                  Currency Converter ({country.currency} · {country.currencySymbol})
                </h3>
                <span className="tabular-clock text-xs text-slate-400">
                  {ratesAreLive ? 'Live rates' : 'Reference'} · 1 {country.currency} ={' '}
                  {oneUnitToLkr >= 1 ? oneUnitToLkr.toFixed(2) : oneUnitToLkr.toFixed(4)} LKR · $
                  {oneUnitToUsd >= 0.01 ? oneUnitToUsd.toFixed(3) : oneUnitToUsd.toFixed(5)} USD
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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

                <div className="flex flex-1 flex-col rounded-xl bg-slate-950/75 px-4 py-2.5">
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

            {/* Solar Season & Daylight Duration Bar */}
            <section
              aria-label="Season and solar daylight duration"
              className="flex flex-col justify-center rounded-3xl border border-white/[0.09] bg-slate-900/60 p-5 sm:p-6 lg:col-span-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{solarData.season.season} Season</span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-slate-400">{solarData.season.hemisphere} Hem.</span>
                </div>
                <span className="tabular-clock font-semibold text-slate-200">
                  {solarData.daylight.daylightHoursStr} ({solarData.daylight.progressPercent}%)
                </span>
              </div>

              <div className="mt-3.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  style={{ width: `${solarData.daylight.progressPercent}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${
                    solarData.daylight.isAfterSunriseBeforeSunset
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-sky-400'
                      : 'bg-indigo-500/60'
                  }`}
                />
              </div>

              <div className="tabular-clock mt-3 flex items-center justify-between text-xs text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Sunrise className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                  Sunrise {solarData.daylight.sunriseStr}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  Sunset {solarData.daylight.sunsetStr}
                  <Sunset className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
                </span>
              </div>
            </section>
          </div>

          {/* 8. DETAILED COUNTRY OVERVIEW PARAGRAPH (Generous Bottom Card of Every Country Page) */}
          <section
            aria-label={`Detailed overview of ${country.name}`}
            className="rounded-3xl border border-sky-400/25 bg-gradient-to-br from-[#09152b]/95 via-[#071124]/95 to-[#060d1c]/95 p-5 sm:p-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-300">
                  <BookOpen className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    About {country.name} — Detailed Country Overview
                  </h3>
                  <p className="text-xs text-slate-400">
                    Geography, history &amp; culture, economy, and global significance
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onReadOverview(country, overviewParagraph)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/18 px-4 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30 hover:text-white whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>Read Overview</span>
              </button>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-200 sm:text-[15px] sm:leading-8">
              {overviewParagraph}
            </p>
          </section>
        </div>
      </div>

      {/* STICKY BOTTOM ACTION FOOTER (Wraps cleanly on 360px phones) */}
      <footer className="shrink-0 border-t border-white/[0.09] bg-[#060c1a] px-3.5 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onFocusOnGlobe(country);
                onClose();
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.06] px-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.12] hover:text-white sm:px-3.5"
            >
              <Compass className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              <span>Focus Cables</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.06] px-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.12] hover:text-white sm:px-3.5"
            >
              {copiedLocal ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{copiedLocal ? 'Copied!' : 'Copy Summary'}</span>
            </button>
          </div>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 sm:px-4"
          >
            <span>Google Maps</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </footer>
    </div>
  );
};
