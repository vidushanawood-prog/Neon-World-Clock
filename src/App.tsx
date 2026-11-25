import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Bell,
  Cable,
  CalendarClock,
  Check,
  Clock,
  Coins,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Orbit,
  Plane,
  RotateCcw,
  Search,
  Star,
  Sun,
  Trophy,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { CONTINENTS, COUNTRIES, DEFAULT_PINNED_ISOS, type Country } from './data/countries';
import {
  formatClockForZone,
  getDatePartsInZone,
  getLocalTimeZone,
  toDateInputValue,
  toTimeInputValue,
  zonedWallTimeToUtcDate,
} from './utils/time';
import {
  fetchLiveExchangeRates,
  fetchWeatherBatch,
  getInitialExchangeRates,
  hydrateWeatherCache,
  type ExchangeRatesState,
  type WeatherEntry,
} from './services/intelligence';
import { estimateIssPosition, fetchIssPosition, type IssPosition } from './services/iss';
import { propagateSatellites } from './services/satellites';
import { playAlarmChime, playHourlyChime } from './utils/audio';
import {
  clearActiveSession,
  getActiveSession,
  type AuthSession,
} from './utils/auth';
import { ClockCard } from './components/ClockCard';
import { CompareModal, type CompareConfig } from './components/CompareModal';
import { CountryModal } from './components/CountryModal';
import { EarthGlobe } from './components/EarthGlobe';
import { MarketStatusBar } from './components/MarketStatusBar';
import { RouteJetLagModal } from './components/RouteJetLagModal';
import { AlarmModal, type WorldAlarm } from './components/AlarmModal';
import { LandingPreview } from './components/LandingPreview';
import { AuthGate } from './components/AuthGate';
import { CinematicBootScreen } from './components/CinematicBootScreen';
import {
  ContinuousVoiceNarrator,
  type VoiceInterruptSignal,
} from './components/ContinuousVoiceNarrator';
import { CryptoLiveSection } from './components/CryptoLiveSection';
import { UserDashboardSection } from './components/UserDashboardSection';
import {
  NationalAnthemBar,
  useNationalAnthem,
} from './components/NationalAnthemBar';
import {
  buildCountryLines,
  buildPanelLines,
  type VoiceNarratorContext,
} from './services/voiceNarrator';

type EntryStage = 'landing' | 'auth' | 'booting' | 'dashboard';

type FilterTab = (typeof CONTINENTS)[number];
type SortMode = 'name' | 'offset-asc' | 'offset-desc';
type ClockViewMode = 'digital' | 'analog';
type TempUnit = 'C' | 'F';

const STORAGE_KEYS = {
  PINNED: 'meridian_pinned_v1',
  FORMAT_24H: 'meridian_format_24h',
  THEME: 'meridian_theme',
  CLOCK_VIEW: 'meridian_clock_view',
  TEMP_UNIT: 'meridian_temp_unit',
  ALARMS: 'meridian_alarms_v1',
  HOURLY_CHIME: 'meridian_hourly_chime_v1',
} as const;

function loadPinnedFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PINNED);
    if (raw === null) return [...DEFAULT_PINNED_ISOS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
    return [...DEFAULT_PINNED_ISOS];
  } catch {
    return [...DEFAULT_PINNED_ISOS];
  }
}

function loadFormat24h(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.FORMAT_24H) === 'true';
  } catch {
    return false;
  }
}

function loadDarkMode(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'light') return false;
    return true;
  } catch {
    return true;
  }
}

function loadClockView(): ClockViewMode {
  try {
    return localStorage.getItem(STORAGE_KEYS.CLOCK_VIEW) === 'analog' ? 'analog' : 'digital';
  } catch {
    return 'digital';
  }
}

function loadTempUnit(): TempUnit {
  try {
    return localStorage.getItem(STORAGE_KEYS.TEMP_UNIT) === 'F' ? 'F' : 'C';
  } catch {
    return 'C';
  }
}

function loadAlarms(): WorldAlarm[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALARMS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is WorldAlarm =>
        a &&
        typeof a.id === 'string' &&
        typeof a.countryIso === 'string' &&
        typeof a.time === 'string' &&
        typeof a.label === 'string' &&
        typeof a.enabled === 'boolean'
    );
  } catch {
    return [];
  }
}

function loadHourlyChime(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.HOURLY_CHIME) === 'true';
  } catch {
    return false;
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to execCommand fallback
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export default function App() {
  const localTz = useMemo(() => getLocalTimeZone(), []);

  // Cinematic Entry Sequence & Client-Side SHA-256 Session State
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => getActiveSession());
  const [entryStage, setEntryStage] = useState<EntryStage>(() =>
    getActiveSession() ? 'dashboard' : 'landing'
  );

  // Synchronized live clock driven by single rAF second-flip loop
  const [now, setNow] = useState<Date>(() => new Date());
  const [is24Hour, setIs24Hour] = useState<boolean>(loadFormat24h);
  const [isDark, setIsDark] = useState<boolean>(loadDarkMode);
  const [clockView, setClockView] = useState<ClockViewMode>(loadClockView);
  const [tempUnit, setTempUnit] = useState<TempUnit>(loadTempUnit);
  const [pinnedIsos, setPinnedIsos] = useState<string[]>(loadPinnedFromStorage);

  // Globe & Country Quick Info Modal state
  const [globeCollapsed, setGlobeCollapsed] = useState<boolean>(false);
  const [focusedIso, setFocusedIso] = useState<string>(() => {
    const initialPinned = loadPinnedFromStorage();
    return initialPinned[0] || 'lk';
  });
  const [inspectedCountry, setInspectedCountry] = useState<Country | null>(null);

  // Live ISS Position (polled every 6s with Keplerian orbital fallback)
  const [issPosition, setIssPosition] = useState<IssPosition>(() => estimateIssPosition());

  // Multi-Stop Route & Jet Lag Modal + World Alarms & Hourly Chime
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [alarms, setAlarms] = useState<WorldAlarm[]>(loadAlarms);
  const [hourlyChimeEnabled, setHourlyChimeEnabled] = useState<boolean>(loadHourlyChime);
  const [ringingAlarm, setRingingAlarm] = useState<{
    alarm: WorldAlarm;
    country: Country;
    firedTimeLabel: string;
  } | null>(null);
  const triggeredAlarmKeysRef = useRef<Set<string>>(new Set());
  const lastChimeHourRef = useRef<string>('');

  // Live Weather & Exchange Rates (TTL-cached)
  const [weatherMap, setWeatherMap] = useState<Record<string, WeatherEntry>>(() =>
    hydrateWeatherCache()
  );
  const [fxState, setFxState] = useState<ExchangeRatesState>(() => getInitialExchangeRates());

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [sortMode, setSortMode] = useState<SortMode>('name');

  // Compare time mode
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareConfig, setCompareConfig] = useState<CompareConfig>(() => {
    const initial = new Date();
    return {
      active: false,
      refZone: localTz,
      refLabel: 'My Local Time',
      dateStr: toDateInputValue(initial, localTz),
      timeStr: toTimeInputValue(initial, localTz),
    };
  });

  // Copy feedback, Toast, Navigation Menu, Dedicated View & Continuous Voice / Anthem Coordination
  const [copiedIso, setCopiedIso] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; title: string; detail?: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'globe' | 'crypto' | 'dashboard'>('globe');
  const [globeLayerCommand, setGlobeLayerCommand] = useState<{
    id: number;
    target: 'cables' | 'satellites';
  } | null>(null);
  const [modalScrollTarget, setModalScrollTarget] = useState<'football' | null>(null);
  const [isAnthemPlaying, setIsAnthemPlaying] = useState<boolean>(false);
  const [voiceInterrupt, setVoiceInterrupt] = useState<VoiceInterruptSignal | null>(null);
  const voiceInterruptSeqRef = useRef<number>(1);
  const voiceContextRef = useRef<VoiceNarratorContext | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const globeSectionRef = useRef<HTMLDivElement | null>(null);

  // Singleton National Anthem player coordinated with AI Voice Assistant
  const anthemController = useNationalAnthem(setIsAnthemPlaying);

  const triggerVoiceLines = useCallback((lines: VoiceInterruptSignal['lines']) => {
    if (lines.length === 0) return;
    voiceInterruptSeqRef.current += 1;
    setVoiceInterrupt({ id: voiceInterruptSeqRef.current, lines });
  }, []);

  const triggerVoicePanel = useCallback(
    (topic: string, text: string) => {
      triggerVoiceLines(buildPanelLines(topic, text));
    },
    [triggerVoiceLines]
  );

  // Single 60fps-friendly requestAnimationFrame clock loop (fires state update only on second flip)
  useEffect(() => {
    let rafId = 0;
    let lastSecond = Math.floor(Date.now() / 1000);

    const tick = () => {
      const currentSecond = Math.floor(Date.now() / 1000);
      if (currentSecond !== lastSecond) {
        lastSecond = currentSecond;
        setNow(new Date());
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  // Load live exchange rates once on mount (6h TTL cached)
  useEffect(() => {
    let cancelled = false;
    fetchLiveExchangeRates().then((next) => {
      if (!cancelled) setFxState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll live ISS position every 6 seconds (graceful orbital fallback if offline)
  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      fetchIssPosition().then((pos) => {
        if (!cancelled) setIssPosition(pos);
      });
    };
    poll();
    const id = window.setInterval(poll, 6000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // Persist alarms & hourly chime preference
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(alarms));
    } catch {
      // Ignore
    }
  }, [alarms]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HOURLY_CHIME, String(hourlyChimeEnabled));
    } catch {
      // Ignore
    }
  }, [hourlyChimeEnabled]);

  // Sync dark theme class & localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
    } catch {
      // Ignore
    }
  }, [isDark]);

  // Persist user preferences
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FORMAT_24H, String(is24Hour));
    } catch {
      // Ignore
    }
  }, [is24Hour]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLOCK_VIEW, clockView);
    } catch {
      // Ignore
    }
  }, [clockView]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TEMP_UNIT, tempUnit);
    } catch {
      // Ignore
    }
  }, [tempUnit]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PINNED, JSON.stringify(pinnedIsos));
    } catch {
      // Ignore
    }
  }, [pinnedIsos]);

  // '/' keyboard shortcut focuses search input cleanly on dashboard
  useEffect(() => {
    if (entryStage !== 'dashboard') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !compareModalOpen &&
        !inspectedCountry &&
        !routeModalOpen &&
        !alarmModalOpen &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [entryStage, compareModalOpen, inspectedCountry, routeModalOpen, alarmModalOpen]);

  const showToast = useCallback((title: string, detail?: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), title, detail });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 2400);
  }, []);

  // World Alarm & Hourly Chime live evaluation engine (active on dashboard)
  useEffect(() => {
    if (entryStage !== 'dashboard') return;
    const countryMap = new Map(COUNTRIES.map((c) => [c.iso, c]));

    // 1. Check enabled world alarms
    for (const alarm of alarms) {
      if (!alarm.enabled) continue;
      const country = countryMap.get(alarm.countryIso);
      if (!country) continue;
      const parts = getDatePartsInZone(now, country.timezone);
      const hhmm = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
      const minuteKey = `${alarm.id}|${parts.year}-${parts.month}-${parts.day}|${hhmm}`;

      if (hhmm === alarm.time && parts.second <= 2 && !triggeredAlarmKeysRef.current.has(minuteKey)) {
        triggeredAlarmKeysRef.current.add(minuteKey);
        const formatted = formatClockForZone(now, country.timezone, is24Hour);
        const firedTimeLabel = `${formatted.hours}:${formatted.minutes}${
          !is24Hour && formatted.dayPeriod ? ` ${formatted.dayPeriod}` : ''
        }`;
        playAlarmChime();
        setRingingAlarm({ alarm, country, firedTimeLabel });
      }
    }

    // 2. Check Hourly Chime at local :00:00
    if (hourlyChimeEnabled) {
      const localParts = getDatePartsInZone(now, localTz);
      const hourKey = `${localParts.year}-${localParts.month}-${localParts.day}-${localParts.hour}`;
      if (localParts.minute === 0 && localParts.second <= 1 && lastChimeHourRef.current !== hourKey) {
        lastChimeHourRef.current = hourKey;
        playHourlyChime();
        const formattedLocal = formatClockForZone(now, localTz, is24Hour);
        showToast(
          'Hourly Chime',
          `Local time is ${formattedLocal.hours}:00${!is24Hour && formattedLocal.dayPeriod ? ` ${formattedLocal.dayPeriod}` : ''}`
        );
      }
    }
  }, [entryStage, now, alarms, hourlyChimeEnabled, localTz, is24Hour, showToast]);

  const handleAddAlarm = useCallback(
    (input: Omit<WorldAlarm, 'id'>) => {
      const next: WorldAlarm = {
        ...input,
        id: `alarm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      };
      setAlarms((prev) => [next, ...prev]);
      const c = COUNTRIES.find((item) => item.iso === input.countryIso);
      showToast('Alarm scheduled', `${input.time} in ${c?.name || input.countryIso.toUpperCase()}`);
    },
    [showToast]
  );

  const handleToggleAlarm = useCallback((id: string) => {
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  }, []);

  const handleDeleteAlarm = useCallback((id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleSnoozeAlarm = useCallback(() => {
    if (!ringingAlarm) return;
    const { alarm, country } = ringingAlarm;
    const parts = getDatePartsInZone(new Date(Date.now() + 5 * 60_000), country.timezone);
    const snoozeTime = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
    setAlarms((prev) => [
      {
        id: `snooze_${Date.now()}`,
        countryIso: alarm.countryIso,
        time: snoozeTime,
        label: `${alarm.label} (Snoozed)`,
        enabled: true,
      },
      ...prev,
    ]);
    setRingingAlarm(null);
    showToast('Snoozed 5 minutes', `Will ring at ${snoozeTime} (${country.capital})`);
  }, [ringingAlarm, showToast]);

  const handleTogglePin = useCallback(
    (iso: string) => {
      setPinnedIsos((prev) => {
        const exists = prev.includes(iso);
        const country = COUNTRIES.find((c) => c.iso === iso);
        if (exists) {
          if (country) showToast('Unpinned', `${country.name} removed from favorites`);
          return prev.filter((item) => item !== iso);
        } else {
          if (country) showToast('Pinned to top', `${country.name} added to favorites`);
          return [iso, ...prev];
        }
      });
    },
    [showToast]
  );

  const handleCopyCard = useCallback(
    async (country: Country, formattedText: string) => {
      await copyToClipboard(formattedText);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      setCopiedIso(country.iso);
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedIso(null);
      }, 1800);
      showToast('Copied!', `${country.name} (${country.capital})`);
    },
    [showToast]
  );

  const handleFocusGlobe = useCallback(
    (country: Country, scrollToGlobe = true) => {
      setActiveSection('globe');
      setFocusedIso(country.iso);
      setGlobeCollapsed(false);
      // Auto-load & play clicked country's National Anthem (stopping any prior anthem first)
      anthemController.selectCountryAnthem(country, true);
      // Queue focused country's live time, weather & connectivity (will wait if anthem plays)
      if (voiceContextRef.current) {
        triggerVoiceLines(buildCountryLines(country, voiceContextRef.current, false));
      }
      // Ensure weather is loaded for the focused country
      fetchWeatherBatch([country]).then((updated) => setWeatherMap(updated));
      if (scrollToGlobe && globeSectionRef.current) {
        globeSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },
    [anthemController, triggerVoiceLines]
  );

  const handleOpenDetails = useCallback(
    (country: Country, scrollTo: 'football' | null = null) => {
      setFocusedIso(country.iso);
      setModalScrollTarget(scrollTo);
      setInspectedCountry(country);
      // Auto-load & play selected country's National Anthem (stopping any prior anthem first)
      anthemController.selectCountryAnthem(country, true);
      // Queue full Country Spotlight details (silenced automatically while anthem plays)
      if (voiceContextRef.current) {
        triggerVoiceLines(buildCountryLines(country, voiceContextRef.current, true));
      }
      fetchWeatherBatch([country]).then((updated) => setWeatherMap(updated));
    },
    [anthemController, triggerVoiceLines]
  );

  const handleNarrateCountry = useCallback(
    (country: Country) => {
      if (voiceContextRef.current) {
        triggerVoiceLines(buildCountryLines(country, voiceContextRef.current, true));
      }
    },
    [triggerVoiceLines]
  );

  const handleReadOverview = useCallback(
    (country: Country, overviewText: string) => {
      triggerVoicePanel(`Overview · ${country.name}`, overviewText);
    },
    [triggerVoicePanel]
  );

  // Focused country object for 3D Globe
  const focusedCountry = useMemo(() => {
    return COUNTRIES.find((c) => c.iso === focusedIso) || COUNTRIES[0];
  }, [focusedIso]);

  // Live orbital satellite constellation (ISS + LEO/SSO/MEO/GEO fleet)
  const liveSatellites = useMemo(
    () => propagateSatellites(now.getTime(), issPosition),
    [now, issPosition]
  );

  // Determine exact instant displayed across all clocks
  const displayDate = useMemo(() => {
    if (!compareConfig.active) return now;
    return zonedWallTimeToUtcDate(
      compareConfig.dateStr,
      compareConfig.timeStr,
      compareConfig.refZone
    );
  }, [compareConfig, now]);

  const referenceZone = compareConfig.active ? compareConfig.refZone : localTz;
  const referenceClock = useMemo(
    () => formatClockForZone(displayDate, referenceZone, is24Hour),
    [displayDate, referenceZone, is24Hour]
  );

  const liveLocalClock = useMemo(
    () => formatClockForZone(now, localTz, is24Hour),
    [now, localTz, is24Hour]
  );

  const pinnedSet = useMemo(() => new Set(pinnedIsos), [pinnedIsos]);

  const pinnedCountriesOrdered = useMemo(() => {
    const byIso = new Map(COUNTRIES.map((c) => [c.iso, c]));
    return pinnedIsos
      .map((iso) => byIso.get(iso))
      .filter((c): c is Country => Boolean(c));
  }, [pinnedIsos]);

  // On-demand context ref (updated in place — avoids re-rendering ContinuousVoiceNarrator every second)
  voiceContextRef.current = {
    entryStage,
    focusedCountry,
    inspectedCountry,
    pinnedCountries: pinnedCountriesOrdered,
    displayDate,
    is24Hour,
    tempUnit,
    weatherMap,
    rates: fxState.rates,
    issPosition,
    satellites: liveSatellites,
  };

  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = {
      All: COUNTRIES.length,
      Favorites: pinnedIsos.length,
      Asia: 0,
      Europe: 0,
      'North America': 0,
      'South America': 0,
      Africa: 0,
      Oceania: 0,
    };
    for (const c of COUNTRIES) {
      counts[c.continent] += 1;
    }
    return counts;
  }, [pinnedIsos.length]);

  // Compute UTC offset minutes map ONLY when sorting by offset
  const offsetSortMinuteKey = Math.floor(displayDate.getTime() / 60000);
  const offsetMap = useMemo(() => {
    if (sortMode === 'name') return null;
    const map = new Map<string, number>();
    const sampleDate = new Date(offsetSortMinuteKey * 60000);
    for (const c of COUNTRIES) {
      map.set(c.iso, formatClockForZone(sampleDate, c.timezone, true).offsetMinutes);
    }
    return map;
  }, [sortMode, offsetSortMinuteKey]);

  // Filtered & sorted lists (searches country, capital, currency, timezone, continent, ISO)
  const { pinnedVisible, regularVisible, totalMatched } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matchesQuery = (c: Country) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q) ||
        c.timezone.toLowerCase().includes(q) ||
        c.continent.toLowerCase().includes(q) ||
        c.iso.toLowerCase() === q
      );
    };

    const sortList = (list: Country[]) => {
      if (sortMode === 'name') {
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      }
      if (!offsetMap) return list;
      return [...list].sort((a, b) => {
        const diff = (offsetMap.get(a.iso) ?? 0) - (offsetMap.get(b.iso) ?? 0);
        if (diff !== 0) return sortMode === 'offset-asc' ? diff : -diff;
        return a.name.localeCompare(b.name);
      });
    };

    if (activeTab === 'Favorites') {
      const matchedFavs = pinnedCountriesOrdered.filter(matchesQuery);
      return {
        pinnedVisible: [],
        regularVisible: sortMode === 'name' ? matchedFavs : sortList(matchedFavs),
        totalMatched: matchedFavs.length,
      };
    }

    const continentMatches = COUNTRIES.filter(
      (c) => (activeTab === 'All' || c.continent === activeTab) && matchesQuery(c)
    );

    const pinnedList: Country[] = [];
    const regularList: Country[] = [];

    for (const c of continentMatches) {
      if (pinnedSet.has(c.iso)) {
        pinnedList.push(c);
      } else {
        regularList.push(c);
      }
    }

    pinnedList.sort((a, b) => pinnedIsos.indexOf(a.iso) - pinnedIsos.indexOf(b.iso));

    return {
      pinnedVisible: sortMode === 'name' ? pinnedList : sortList(pinnedList),
      regularVisible: sortList(regularList),
      totalMatched: continentMatches.length,
    };
  }, [activeTab, searchQuery, sortMode, offsetMap, pinnedSet, pinnedIsos, pinnedCountriesOrdered]);

  // Smart batched Open-Meteo weather prefetching (warms up during boot & active dashboard)
  useEffect(() => {
    if (entryStage !== 'booting' && entryStage !== 'dashboard') return;
    let cancelled = false;
    const priorityList: Country[] = [];
    const seen = new Set<string>();

    const pushUnique = (c: Country) => {
      if (!seen.has(c.iso)) {
        seen.add(c.iso);
        priorityList.push(c);
      }
    };

    pushUnique(focusedCountry);
    pinnedVisible.forEach(pushUnique);
    regularVisible.forEach(pushUnique);

    const runBatches = async () => {
      // Lazy/throttled prefetch: fetch up to 50 prioritized locations per view (2 batches of 25)
      // so expanding to 215+ regions never hits Open-Meteo rate limits; clicking/inspecting any card fetches on demand.
      const limit = Math.min(priorityList.length, 50);
      for (let offset = 0; offset < limit; offset += 25) {
        if (cancelled) return;
        const slice = priorityList.slice(offset, Math.min(offset + 25, limit));
        const updated = await fetchWeatherBatch(slice);
        if (cancelled) return;
        setWeatherMap(updated);
        if (offset + 25 < limit) {
          await new Promise((r) => window.setTimeout(r, 420));
        }
      }
    };

    // Debounce slightly when user is actively typing in search
    const timer = window.setTimeout(runBatches, searchQuery ? 300 : 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [entryStage, activeTab, searchQuery, focusedCountry, pinnedVisible, regularVisible]);

  // Entry sequence handlers
  const handleAuthenticated = useCallback((session: AuthSession) => {
    setAuthSession(session);
    setEntryStage('booting');
  }, []);

  const handleBootComplete = useCallback(() => {
    setEntryStage('dashboard');
    window.scrollTo({ top: 0, behavior: 'auto' });
    showToast('Command Center Active', 'All 215 regions and orbital telemetry synced');
    triggerVoicePanel(
      'Command Center Active',
      `Meridian Command Center is now online. Tracking ${COUNTRIES.length} regions, submarine cables, global stock markets, and the International Space Station.`
    );
  }, [showToast, triggerVoicePanel]);

  const handleLogout = useCallback(() => {
    anthemController.stopAnthem();
    clearActiveSession();
    setAuthSession(null);
    setMenuOpen(false);
    setActiveSection('globe');
    setCompareModalOpen(false);
    setInspectedCountry(null);
    setRouteModalOpen(false);
    setAlarmModalOpen(false);
    setRingingAlarm(null);
    setEntryStage('landing');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [anthemController]);

  // Menu (☰) Quick Navigation Handlers
  const handleNavigateMenu = useCallback(
    (target: 'globe' | 'crypto' | 'dashboard' | 'cables' | 'satellites' | 'football') => {
      setMenuOpen(false);
      if (target === 'dashboard') {
        setActiveSection('dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        triggerVoicePanel(
          'vidushanawood User Dashboard',
          `Opened your vidushanawood User Dashboard. You have ${pinnedIsos.length} pinned countries and ${alarms.filter((a) => a.enabled).length} active world alarms.`
        );
        return;
      }

      if (target === 'crypto') {
        setActiveSection('crypto');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        triggerVoicePanel(
          'Crypto Live Market',
          'Switched to Crypto Live view showing real-time Bitcoin, Ethereum, Solana, BNB, and top market coins in US Dollars and Sri Lankan Rupees.'
        );
        return;
      }

      setActiveSection('globe');

      if (target === 'globe') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        triggerVoicePanel(
          'Globe & World Clocks',
          'Viewing the interactive 3D Earth Globe and 215 global live clocks.'
        );
        return;
      }

      if (target === 'cables' || target === 'satellites') {
        setGlobeCollapsed(false);
        setGlobeLayerCommand({ id: Date.now(), target });
        window.setTimeout(() => {
          globeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
        triggerVoicePanel(
          target === 'cables' ? 'Submarine Cables & ISPs' : 'Live Satellites',
          target === 'cables'
            ? `Highlighting global submarine fiber-optic cables and national internet providers for ${focusedCountry.name}.`
            : 'Displaying live orbiting satellites and International Space Station telemetry on the 3D globe.'
        );
        return;
      }

      if (target === 'football') {
        handleOpenDetails(focusedCountry, 'football');
      }
    },
    [alarms, focusedCountry, handleOpenDetails, pinnedIsos.length, triggerVoicePanel]
  );

  // Inline Compare Bar handlers
  const handleInlineSlider = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    setCompareConfig((prev) => ({
      ...prev,
      timeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    }));
  };

  const handleInlineShift = (deltaHours: number) => {
    const shifted = new Date(displayDate.getTime() + deltaHours * 3600 * 1000);
    setCompareConfig((prev) => ({
      ...prev,
      dateStr: toDateInputValue(shifted, prev.refZone),
      timeStr: toTimeInputValue(shifted, prev.refZone),
    }));
  };

  const handleResetLive = () => {
    setCompareConfig((prev) => ({ ...prev, active: false }));
    showToast('Live mode restored', 'Clocks synchronized to real time');
    triggerVoicePanel('Live Clocks Restored', 'All global clocks are now synchronized back to live real time.');
  };

  const compareSliderMinutes = useMemo(() => {
    const [hh, mm] = compareConfig.timeStr.split(':').map(Number);
    const total = (Number.isNaN(hh) ? 12 : hh) * 60 + (Number.isNaN(mm) ? 0 : mm);
    return Math.min(1425, Math.round(total / 15) * 15);
  }, [compareConfig.timeStr]);

  const handleQuickSearchFocus = useCallback(() => {
    setActiveSection('globe');
    window.setTimeout(() => {
      searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      searchInputRef.current?.focus();
    }, 60);
  }, []);

  const activeAlarmsCount = alarms.filter((a) => a.enabled).length;

  const dashboardContent = (
    <div className="relative min-h-screen w-full overflow-x-hidden text-slate-900 dark:text-slate-100">
      {/* Subtle Cosmic Atmospheric Background */}
      <div className="ambient-canvas" aria-hidden="true" />

      {/* Clean, Minimal Sticky Top Header (Zero crowding on 360px phones through wide desktops) */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-white/[0.07] dark:bg-slate-950/85">
        <div className="mx-auto flex h-16 max-w-[1380px] items-center justify-between gap-3 px-3.5 sm:px-6 lg:px-8">
          {/* Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('globe');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex min-w-0 items-center gap-2.5 whitespace-nowrap rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm dark:bg-sky-500/20 dark:text-sky-400 dark:ring-1 dark:ring-sky-400/35">
              <Globe2 className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 leading-tight">
              <span className="block truncate text-base font-bold tracking-tight text-slate-950 sm:text-lg dark:text-white">
                Neon World Clock
              </span>
              <span className="hidden text-[11px] font-medium text-slate-500 sm:block dark:text-slate-400">
                Meridian · {COUNTRIES.length} Regions
              </span>
            </div>
          </a>

          {/* Center Quiet Live Local Clock (Tablet & Desktop) */}
          <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex dark:text-slate-400 whitespace-nowrap">
            <span>Local</span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
              ·
            </span>
            <span className="tabular-clock font-semibold text-slate-900 dark:text-slate-100">
              {liveLocalClock.hours}:{liveLocalClock.minutes}:{liveLocalClock.seconds}
              {!is24Hour && liveLocalClock.dayPeriod ? ` ${liveLocalClock.dayPeriod}` : ''}
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
              ·
            </span>
            <span className="tabular-clock">{liveLocalClock.utcOffset}</span>
          </div>

          {/* Right Minimal Actions: Quick Country Search + Menu (☰) Drawer Trigger */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleQuickSearchFocus}
              aria-label="Search countries"
              title="Search 215 countries & capitals"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-sky-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/12 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:border-sky-400/40 dark:hover:bg-white/[0.11] dark:hover:text-white"
            >
              <Search className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span className="hidden sm:inline">Search</span>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation and controls menu"
              aria-expanded={menuOpen}
              title="Open Menu: Display toggles, Tools, Crypto, Cables, Satellites, Football & vidushanawood Account"
              className={`relative inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                activeSection !== 'globe' || compareConfig.active || activeAlarmsCount > 0
                  ? 'border-sky-400/50 bg-sky-500/15 text-sky-800 dark:text-sky-200'
                  : 'border-slate-200/90 bg-white/90 text-slate-800 hover:border-slate-300 hover:bg-white dark:border-white/14 dark:bg-white/[0.07] dark:text-slate-100 dark:hover:bg-white/[0.12]'
              }`}
            >
              <Menu className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span>Menu</span>
              {(activeAlarmsCount > 0 || compareConfig.active) && (
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full bg-amber-400"
                />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main id="top" className="relative z-10 mx-auto max-w-[1380px] px-3.5 pt-6 pb-20 sm:px-6 lg:px-8">
        {/* Hero Title & Local Time Summary Row */}
        <section className="flex flex-col justify-between gap-4 pb-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white [text-wrap:balance]">
              World Clock &amp; Global Intelligence
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 sm:text-sm dark:text-slate-400">
              <span>{COUNTRIES.length} countries</span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                ·
              </span>
              <span>Live IANA time &amp; weather</span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                ·
              </span>
              <span>
                LKR &amp; USD {fxState.isLive ? 'live rates' : 'reference rates'}
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                ·
              </span>
              <span>{pinnedIsos.length} pinned</span>
              {authSession && (
                <>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600 2xl:hidden">
                    ·
                  </span>
                  <span className="truncate font-medium text-emerald-700 dark:text-emerald-300 2xl:hidden">
                    {authSession.email}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Mobile 12H/24H Quick Toggle + Local Clock */}
          <div className="flex items-center justify-between gap-4 border-t border-slate-200/80 pt-3 lg:flex-col lg:items-end lg:gap-0.5 lg:border-t-0 lg:pt-0 dark:border-white/[0.08]">
            <div className="flex items-baseline gap-1.5">
              <span className="tabular-clock text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl dark:text-white">
                {liveLocalClock.hours}:{liveLocalClock.minutes}
                <span className="text-base font-medium text-slate-400 dark:text-slate-500">
                  :{liveLocalClock.seconds}
                </span>
              </span>
              {!is24Hour && liveLocalClock.dayPeriod && (
                <span className="tabular-clock text-xs font-semibold text-sky-600 dark:text-sky-400">
                  {liveLocalClock.dayPeriod}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="hidden sm:inline">{liveLocalClock.fullDate} ·</span>
              <span className="tabular-clock truncate">{localTz}</span>
            </div>
          </div>
        </section>

        {/* Dashboard National Anthem Player Bar (visible when country clicked outside modal) */}
        {!inspectedCountry && (
          <NationalAnthemBar controller={anthemController} variant="dashboard" />
        )}

        {/* Dedicated User Dashboard or Crypto Live View (switched via Header / ☰ Menu) */}
        {activeSection === 'dashboard' ? (
          <UserDashboardSection
            session={authSession}
            pinnedCountries={pinnedCountriesOrdered}
            focusedCountry={focusedCountry}
            alarms={alarms}
            hourlyChimeEnabled={hourlyChimeEnabled}
            displayDate={displayDate}
            is24Hour={is24Hour}
            clockView={clockView}
            tempUnit={tempUnit}
            isDark={isDark}
            onBackToGlobe={() => handleNavigateMenu('globe')}
            onOpenCrypto={() => handleNavigateMenu('crypto')}
            onOpenCountry={(c) => handleOpenDetails(c, null)}
            onOpenAlarms={() => setAlarmModalOpen(true)}
            onOpenJetLag={() => setRouteModalOpen(true)}
            onOpenCompare={() => setCompareModalOpen(true)}
            onToggle24Hour={() => setIs24Hour((v) => !v)}
            onToggleClockView={() =>
              setClockView((v) => (v === 'digital' ? 'analog' : 'digital'))
            }
            onToggleTempUnit={() => setTempUnit((u) => (u === 'C' ? 'F' : 'C'))}
            onToggleTheme={() => setIsDark((d) => !d)}
            onToggleHourlyChime={() => setHourlyChimeEnabled((v) => !v)}
            onSwitchAccount={() => setEntryStage('auth')}
            onLogout={handleLogout}
          />
        ) : activeSection === 'crypto' ? (
          <CryptoLiveSection
            usdToLkrRate={fxState.rates['LKR'] || 296}
            onBackToGlobe={() => handleNavigateMenu('globe')}
            onSelectCoinSpeech={triggerVoicePanel}
          />
        ) : (
          <>
        {/* Interactive 3D Rotating Earth Globe Hero (with Cables, ISPs & Live Satellites) */}
        <div ref={globeSectionRef}>
          <EarthGlobe
            countries={COUNTRIES}
            focusedCountry={focusedCountry}
            issPosition={issPosition}
            satellites={liveSatellites}
            pinnedSet={pinnedSet}
            displayDate={displayDate}
            is24Hour={is24Hour}
            tempUnit={tempUnit}
            weatherMap={weatherMap}
            rates={fxState.rates}
            collapsed={globeCollapsed}
            onToggleCollapse={() => setGlobeCollapsed((c) => !c)}
            onSelectCountry={(country) => handleFocusGlobe(country, false)}
            onInspectCountry={(country) => handleOpenDetails(country, null)}
            onLayerEvent={triggerVoicePanel}
            layerCommand={globeLayerCommand}
          />
        </div>

        {/* Global Stock Market Open / Close Status Bar */}
        <MarketStatusBar
          displayDate={displayDate}
          onSelectCountryIso={(iso) => {
            const target = COUNTRIES.find((c) => c.iso === iso);
            if (target) handleFocusGlobe(target, true);
          }}
        />

        {/* Active Compare Time Inline Scrubber Bar */}
        {compareConfig.active && (
          <section
            aria-label="Active time comparison controls"
            className="mb-6 rounded-2xl border border-sky-200/90 bg-sky-50/85 p-4 backdrop-blur-xl dark:border-sky-400/25 dark:bg-sky-950/35"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Comparing Time</span>
                  <span aria-hidden="true" className="text-sky-400/60">
                    ·
                  </span>
                  <span className="truncate">{compareConfig.refLabel}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-slate-800 dark:text-slate-100">
                  <span className="tabular-clock font-bold">
                    {referenceClock.hours}:{referenceClock.minutes}
                    {!is24Hour && referenceClock.dayPeriod ? ` ${referenceClock.dayPeriod}` : ''}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {referenceClock.fullDate} ({referenceClock.utcOffset})
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-1.5 lg:max-w-md">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleInlineShift(-1)}
                    className="rounded-lg border border-sky-200 bg-white/80 px-2 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-white dark:border-sky-400/25 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    -1h
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1425}
                    step={15}
                    value={compareSliderMinutes}
                    onChange={(e) => handleInlineSlider(Number(e.target.value))}
                    aria-label="Adjust comparison time"
                    className="time-slider flex-1 bg-sky-200/80 dark:bg-sky-900/80"
                  />
                  <button
                    type="button"
                    onClick={() => handleInlineShift(1)}
                    className="rounded-lg border border-sky-200 bg-white/80 px-2 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-white dark:border-sky-400/25 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    +1h
                  </button>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCompareModalOpen(true)}
                  className="rounded-xl border border-sky-300/80 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-white whitespace-nowrap dark:border-sky-400/25 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  Change Zone / Date
                </button>
                <button
                  type="button"
                  onClick={handleResetLive}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Return to Live
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Search, Sort & Continent Filter Workspace Toolbar */}
        <section aria-label="Search and filter countries" className="mb-8 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country, capital, currency (LKR, USD, JPY), or timezone..."
                aria-label="Search countries, capitals, currencies, or timezones"
                className="h-12 w-full rounded-2xl border border-slate-200/90 bg-white/85 pr-11 pl-11 text-sm text-slate-900 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] backdrop-blur-xl placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/[0.1] dark:bg-slate-900/65 dark:text-white dark:shadow-none dark:placeholder:text-slate-500 dark:focus:border-sky-400"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-3 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.08] dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <kbd
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-3.5 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-400 sm:inline-block dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-500"
                >
                  /
                </kbd>
              )}
            </div>

            {/* Sort Selector */}
            <div className="relative shrink-0">
              <ArrowUpDown
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                aria-label="Sort countries"
                className="h-12 w-full appearance-none rounded-2xl border border-slate-200/90 bg-white/85 pr-9 pl-10 text-sm font-medium text-slate-700 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] backdrop-blur-xl focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:w-auto dark:border-white/[0.1] dark:bg-slate-900/65 dark:text-slate-200 dark:shadow-none dark:focus:border-sky-400"
              >
                <option value="name">Sort: A – Z</option>
                <option value="offset-asc">UTC: West to East</option>
                <option value="offset-desc">UTC: East to West</option>
              </select>
            </div>
          </div>

          {/* Continent Filter Tabs */}
          <div
            role="tablist"
            aria-label="Filter by continent"
            className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1"
          >
            {CONTINENTS.map((tab) => {
              const isActive = activeTab === tab;
              const count = tabCounts[tab];
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(tab);
                    triggerVoicePanel(
                      `Region Filter · ${tab}`,
                      `Switched world clock view to ${tab}, showing ${count} regions.`
                    );
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm dark:bg-sky-500 dark:text-slate-950'
                      : 'border border-slate-200/80 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900 dark:border-white/[0.08] dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-white/[0.16] dark:hover:bg-slate-900/80 dark:hover:text-white'
                  }`}
                >
                  {tab === 'Favorites' && (
                    <Star
                      className={`h-3.5 w-3.5 ${
                        isActive ? 'text-amber-300 dark:text-slate-950' : 'text-amber-500 dark:text-amber-400'
                      }`}
                      fill="currentColor"
                      aria-hidden="true"
                    />
                  )}
                  <span>{tab}</span>
                  <span
                    className={`tabular-clock text-[11px] font-medium ${
                      isActive
                        ? 'text-slate-300 dark:text-slate-900/75'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Empty State */}
        {totalMatched === 0 ? (
          <section className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white/75 px-6 py-16 text-center backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-900/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.06] dark:text-slate-500">
              {activeTab === 'Favorites' && !searchQuery ? (
                <Star className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Clock className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
              {activeTab === 'Favorites' && !searchQuery
                ? 'No pinned countries yet'
                : 'No matching countries found'}
            </h2>
            <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              {activeTab === 'Favorites' && !searchQuery
                ? 'Click the star icon on any country card to pin your go-to timezones to the top of the screen.'
                : `No country, capital, currency, or timezone matched "${searchQuery}".`}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveTab('All');
              }}
              className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
            >
              {activeTab === 'Favorites' && !searchQuery
                ? `Browse All ${COUNTRIES.length} Countries`
                : 'Reset Filters'}
            </button>
          </section>
        ) : (
          <div className="space-y-10">
            {/* Pinned Favorites Section */}
            {pinnedVisible.length > 0 && (
              <section aria-labelledby="pinned-heading">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Star
                      className="h-4 w-4 text-amber-500 dark:text-amber-400"
                      fill="currentColor"
                      aria-hidden="true"
                    />
                    <h2
                      id="pinned-heading"
                      className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200"
                    >
                      Pinned Favorites
                    </h2>
                    <span className="tabular-clock text-xs text-slate-400 dark:text-slate-500">
                      · {pinnedVisible.length}
                    </span>
                  </div>
                  <span className="hidden text-xs text-slate-400 sm:inline dark:text-slate-500">
                    Click any card for 3D character spotlight, ISPs, satellites &amp; FX
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pinnedVisible.map((country) => (
                    <ClockCard
                      key={country.iso}
                      country={country}
                      displayDate={displayDate}
                      is24Hour={is24Hour}
                      clockView={clockView}
                      tempUnit={tempUnit}
                      isPinned={true}
                      isFocusedOnGlobe={focusedIso === country.iso}
                      isCompareMode={compareConfig.active}
                      referenceDateKey={referenceClock.dateKey}
                      isCopied={copiedIso === country.iso}
                      weather={weatherMap[country.iso]}
                      rates={fxState.rates}
                      onTogglePin={handleTogglePin}
                      onCopy={handleCopyCard}
                      onFocusGlobe={(c) => handleFocusGlobe(c, true)}
                      onOpenDetails={handleOpenDetails}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Main Country Clocks Grid */}
            {regularVisible.length > 0 && (
              <section
                aria-labelledby="world-clocks-heading"
                className={
                  pinnedVisible.length > 0
                    ? 'border-t border-slate-200/80 pt-8 dark:border-white/[0.08]'
                    : ''
                }
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2
                    id="world-clocks-heading"
                    className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200"
                  >
                    {activeTab === 'All'
                      ? pinnedVisible.length > 0
                        ? 'All Other Countries'
                        : 'All Countries'
                      : activeTab === 'Favorites'
                        ? 'Pinned Favorites'
                        : activeTab}
                    <span className="tabular-clock ml-1.5 font-normal text-slate-400 dark:text-slate-500">
                      · {regularVisible.length}
                    </span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {regularVisible.map((country) => (
                    <ClockCard
                      key={country.iso}
                      country={country}
                      displayDate={displayDate}
                      is24Hour={is24Hour}
                      clockView={clockView}
                      tempUnit={tempUnit}
                      isPinned={pinnedSet.has(country.iso)}
                      isFocusedOnGlobe={focusedIso === country.iso}
                      isCompareMode={compareConfig.active}
                      referenceDateKey={referenceClock.dateKey}
                      isCopied={copiedIso === country.iso}
                      weather={weatherMap[country.iso]}
                      rates={fxState.rates}
                      onTogglePin={handleTogglePin}
                      onCopy={handleCopyCard}
                      onFocusGlobe={(c) => handleFocusGlobe(c, true)}
                      onOpenDetails={handleOpenDetails}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
          </>
        )}
      </main>

      {/* Professional Copyright Footer (Generous bottom clearance for floating On-Demand Voice badge) */}
      <footer className="relative z-10 border-t border-slate-200/70 pt-8 pb-28 sm:pb-24 dark:border-white/[0.07] dark:bg-[#050a16]/60">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-between gap-2 px-3.5 text-center text-xs text-slate-600 sm:flex-row sm:px-6 sm:text-left lg:px-8 dark:text-slate-400">
          <p className="font-medium text-slate-800 dark:text-slate-200">
            © 2026 Vidusha Nawood · Neon World Clock. All rights reserved.
          </p>
          <p className="tabular-clock text-slate-500 dark:text-slate-500">
            {COUNTRIES.length} countries indexed · Live IANA time, Crypto, Cables &amp; Satellites
          </p>
        </div>
      </footer>

      {/* Comprehensive Slide-Over Menu (☰) Drawer: Display Toggles, Tools, Sections & vidushanawood Account */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation, Controls and Account Menu"
        >
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <nav className="relative z-10 flex h-[100dvh] w-full max-w-sm flex-col border-l border-sky-400/20 bg-[#070f21] text-slate-100 shadow-2xl">
            {/* Drawer Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 ring-1 ring-sky-400/35">
                  <Globe2 className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Control Menu</p>
                  <p className="text-[11px] text-slate-400">Neon World Clock · Meridian</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-slate-300 hover:bg-white/[0.14] hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {/* 1. Time, Clock & Unit Toggles */}
              <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-slate-950/60 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                  Time &amp; Display Controls
                </p>

                {/* Digital / Analog */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-300">Clock Mode</span>
                  <div
                    role="group"
                    aria-label="Clock display mode"
                    className="grid grid-cols-2 rounded-xl border border-white/10 bg-slate-900 p-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => setClockView('digital')}
                      aria-pressed={clockView === 'digital'}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        clockView === 'digital'
                          ? 'bg-sky-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Digital
                    </button>
                    <button
                      type="button"
                      onClick={() => setClockView('analog')}
                      aria-pressed={clockView === 'analog'}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        clockView === 'analog'
                          ? 'bg-sky-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Analog
                    </button>
                  </div>
                </div>

                {/* 12H / 24H */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-300">Time Format</span>
                  <div
                    role="group"
                    aria-label="Time format"
                    className="grid grid-cols-2 rounded-xl border border-white/10 bg-slate-900 p-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => setIs24Hour(false)}
                      aria-pressed={!is24Hour}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        !is24Hour
                          ? 'bg-sky-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      12H
                    </button>
                    <button
                      type="button"
                      onClick={() => setIs24Hour(true)}
                      aria-pressed={is24Hour}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        is24Hour
                          ? 'bg-sky-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      24H
                    </button>
                  </div>
                </div>

                {/* °C / °F */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-300">Temperature</span>
                  <div
                    role="group"
                    aria-label="Temperature unit"
                    className="grid grid-cols-2 rounded-xl border border-white/10 bg-slate-900 p-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => setTempUnit('C')}
                      aria-pressed={tempUnit === 'C'}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        tempUnit === 'C'
                          ? 'bg-sky-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      °C
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempUnit('F')}
                      aria-pressed={tempUnit === 'F'}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        tempUnit === 'F'
                          ? 'bg-sky-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      °F
                    </button>
                  </div>
                </div>

                {/* Dark / Light Theme */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-xs font-medium text-slate-300">Theme</span>
                  <button
                    type="button"
                    onClick={() => setIsDark((d) => !d)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/[0.12]"
                  >
                    {isDark ? (
                      <>
                        <Sun className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                        <span>Switch to Light</span>
                      </>
                    ) : (
                      <>
                        <Moon className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
                        <span>Switch to Neon Dark</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 2. Tools: Alarms, Daylight / Timezone & Jet Lag */}
              <div className="space-y-2">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Alarms, Timezone &amp; Jet Lag Tools
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setAlarmModalOpen(true);
                      triggerVoicePanel(
                        'World Alarms & Chime',
                        `Opened World Alarms panel. You currently have ${activeAlarmsCount} active alarms scheduled.`
                      );
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition-colors ${
                      activeAlarmsCount > 0 || hourlyChimeEnabled
                        ? 'border-amber-400/40 bg-amber-400/12 text-amber-200'
                        : 'border-white/[0.09] bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]'
                    }`}
                  >
                    <Bell className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    <span>Alarms{activeAlarmsCount > 0 ? ` (${activeAlarmsCount})` : ''}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setCompareModalOpen(true);
                      triggerVoicePanel(
                        'Compare Global Time',
                        'Opened Timezone and Daylight comparison tool. Pick any reference timezone and hour to preview synchronized local times across all 215 regions.'
                      );
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition-colors ${
                      compareConfig.active
                        ? 'border-sky-400/45 bg-sky-500/20 text-sky-200'
                        : 'border-white/[0.09] bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]'
                    }`}
                  >
                    <CalendarClock className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                    <span>Timezone</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setRouteModalOpen(true);
                      triggerVoicePanel(
                        'Route & Jet Lag Calculator',
                        'Opened the multi-stop flight route, layover, and jet lag calculator. Select your origin and destination cities to estimate timezone shifts and recovery guidance.'
                      );
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.09] bg-white/[0.03] py-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.08]"
                  >
                    <Plane className="h-4 w-4 text-sky-400" aria-hidden="true" />
                    <span>Jet Lag</span>
                  </button>
                </div>
              </div>

              {/* 3. Global Views & Live Modules */}
              <div className="space-y-1.5">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Live Views &amp; Modules
                </p>

                <button
                  type="button"
                  onClick={() => handleNavigateMenu('globe')}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                    activeSection === 'globe'
                      ? 'border-sky-400/45 bg-sky-500/18 text-white'
                      : 'border-white/[0.07] bg-white/[0.03] text-slate-200 hover:border-sky-400/30 hover:bg-white/[0.07]'
                  }`}
                >
                  <Globe2 className="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <p>Globe &amp; Clocks</p>
                    <p className="text-[11px] font-normal text-slate-400">
                      3D Earth &amp; {COUNTRIES.length} live regions
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateMenu('crypto')}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                    activeSection === 'crypto'
                      ? 'border-sky-400/45 bg-sky-500/18 text-white'
                      : 'border-white/[0.07] bg-white/[0.03] text-slate-200 hover:border-sky-400/30 hover:bg-white/[0.07]'
                  }`}
                >
                  <Coins className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <p>Crypto Live</p>
                    <p className="text-[11px] font-normal text-slate-400">
                      BTC, ETH, SOL in USD &amp; LKR
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateMenu('cables')}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 text-left text-sm font-semibold text-slate-200 transition-colors hover:border-cyan-400/35 hover:bg-white/[0.07]"
                >
                  <Cable className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <p>Cables &amp; ISPs</p>
                    <p className="text-[11px] font-normal text-slate-400">
                      Submarine fiber &amp; country ISPs
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateMenu('satellites')}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 text-left text-sm font-semibold text-slate-200 transition-colors hover:border-emerald-400/35 hover:bg-white/[0.07]"
                >
                  <Orbit className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <p>Live Satellites</p>
                    <p className="text-[11px] font-normal text-slate-400">
                      ISS &amp; orbital fleet tracker
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateMenu('football')}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 text-left text-sm font-semibold text-slate-200 transition-colors hover:border-amber-400/35 hover:bg-white/[0.07]"
                >
                  <Trophy className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <p>Football</p>
                    <p className="truncate text-[11px] font-normal text-slate-400">
                      {focusedCountry.name} team &amp; players
                    </p>
                  </div>
                </button>
              </div>

              {/* 4. vidushanawood Account & User Dashboard */}
              <div className="space-y-2 border-t border-white/[0.08] pt-4">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                  vidushanawood Account
                </p>

                <button
                  type="button"
                  onClick={() => handleNavigateMenu('dashboard')}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                    activeSection === 'dashboard'
                      ? 'border-emerald-400/45 bg-emerald-500/15 text-white'
                      : 'border-white/[0.08] bg-white/[0.03] text-slate-200 hover:border-emerald-400/35 hover:bg-white/[0.07]'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p>User Dashboard</p>
                    <p className="truncate text-[11px] font-normal text-slate-400">
                      {authSession ? authSession.email : 'Manage profile, pins & alerts'}
                    </p>
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setEntryStage('auth');
                    }}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-sky-400/35 bg-sky-500/15 px-3 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/25 hover:text-white"
                  >
                    <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Sign In / Up</span>
                  </button>

                  {authSession ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-400/35 bg-rose-500/12 px-3 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/22 hover:text-white"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleNavigateMenu('dashboard')}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-xs font-semibold text-slate-200 hover:bg-white/[0.1]"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      <span>Profile</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-white/[0.08] px-5 py-3 text-center text-[11px] text-slate-500">
              © 2026 Vidusha Nawood · Neon World Clock
            </div>
          </nav>
        </div>
      )}

      {/* Compare Time Modal */}
      <CompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        countries={COUNTRIES}
        pinnedCountries={pinnedCountriesOrdered}
        is24Hour={is24Hour}
        currentConfig={compareConfig}
        onApply={(cfg) => {
          setCompareConfig(cfg);
          showToast('Comparison active', `Showing global times for ${cfg.refLabel}`);
        }}
        onResetLive={handleResetLive}
      />

      {/* Full-Screen Responsive Country View (Auto-Rotating Dual Character Stage + Telemetry + Football Players + Detailed Overview) */}
      <CountryModal
        country={inspectedCountry}
        displayDate={displayDate}
        satellites={liveSatellites}
        is24Hour={is24Hour}
        tempUnit={tempUnit}
        isPinned={inspectedCountry ? pinnedSet.has(inspectedCountry.iso) : false}
        weather={inspectedCountry ? weatherMap[inspectedCountry.iso] : undefined}
        rates={fxState.rates}
        ratesAreLive={fxState.isLive}
        anthemController={anthemController}
        scrollTarget={modalScrollTarget}
        onClose={() => {
          setInspectedCountry(null);
          setModalScrollTarget(null);
        }}
        onTogglePin={handleTogglePin}
        onFocusOnGlobe={(c) => handleFocusGlobe(c, true)}
        onCopySummary={handleCopyCard}
        onNarrateCountry={handleNarrateCountry}
        onReadOverview={handleReadOverview}
        onNarrateSection={triggerVoicePanel}
      />

      {/* Multi-Stop Route, Layover & Jet Lag Calculator Modal */}
      <RouteJetLagModal
        isOpen={routeModalOpen}
        onClose={() => setRouteModalOpen(false)}
        countries={COUNTRIES}
        is24Hour={is24Hour}
      />

      {/* World Alarms & Hourly Chime Modal */}
      <AlarmModal
        isOpen={alarmModalOpen}
        onClose={() => setAlarmModalOpen(false)}
        countries={COUNTRIES}
        now={now}
        is24Hour={is24Hour}
        alarms={alarms}
        hourlyChimeEnabled={hourlyChimeEnabled}
        onAddAlarm={handleAddAlarm}
        onToggleAlarm={handleToggleAlarm}
        onDeleteAlarm={handleDeleteAlarm}
        onToggleHourlyChime={setHourlyChimeEnabled}
      />

      {/* Active Ringing World Alarm Alert */}
      {ringingAlarm && (
        <div
          role="alertdialog"
          aria-live="assertive"
          aria-labelledby="ringing-alarm-title"
          className="fixed top-20 right-5 z-50 w-[min(360px,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-amber-300/90 bg-white/95 p-4 shadow-2xl backdrop-blur-2xl dark:border-amber-400/40 dark:bg-slate-900/95"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p
                id="ringing-alarm-title"
                className="truncate text-sm font-bold text-slate-950 dark:text-white"
              >
                {ringingAlarm.alarm.label}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <img
                  src={`https://flagcdn.com/w40/${ringingAlarm.country.iso}.png`}
                  alt=""
                  width={18}
                  height={12}
                  referrerPolicy="no-referrer"
                  className="h-3 w-4.5 rounded-[2px] object-cover"
                />
                <span className="truncate">{ringingAlarm.country.name}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-clock font-semibold text-sky-600 dark:text-sky-400">
                  {ringingAlarm.firedTimeLabel}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSnoozeAlarm}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/12 dark:text-slate-200 dark:hover:bg-white/[0.08]"
                >
                  Snooze 5m
                </button>
                <button
                  type="button"
                  onClick={() => setRingingAlarm(null)}
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sleek Floating Toast Notification */}
      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="fixed right-5 bottom-5 z-50 flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white/95 px-4 py-3 text-sm shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/95"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="font-semibold text-slate-900 dark:text-white">{toast.title}</p>
            {toast.detail && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{toast.detail}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {entryStage === 'landing' ? (
        <LandingPreview
          now={now}
          issPosition={issPosition}
          onLaunch={() => {
            setEntryStage('auth');
            triggerVoicePanel(
              'Operator Authentication',
              'Opening operator sign in and human verification gate.'
            );
          }}
        />
      ) : entryStage === 'auth' ? (
        <AuthGate
          onBack={() => setEntryStage(authSession ? 'dashboard' : 'landing')}
          backLabel={authSession ? 'Back to Dashboard' : 'Back to Preview'}
          onAuthenticated={handleAuthenticated}
        />
      ) : entryStage === 'booting' ? (
        <CinematicBootScreen
          operatorEmail={authSession?.email || 'operator@vidushanawood.local'}
          onComplete={handleBootComplete}
        />
      ) : (
        dashboardContent
      )}

      {/* On-Demand AI Voice Assistant (Zero continuous chattering; yields strictly to National Anthem) */}
      <ContinuousVoiceNarrator
        interruptSignal={voiceInterrupt}
        isAnthemPlaying={isAnthemPlaying}
        elevatedOffset={Boolean(inspectedCountry)}
      />
    </>
  );
}
