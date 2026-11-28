import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  Bell,
  Cable,
  CalendarClock,
  Check,
  Clapperboard,
  Clock,
  Coins,
  Crown,
  Film,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Orbit,
  Plane,
  Radio,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Sun,
  Trophy,
  Tv,
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
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  activateUserPro,
  auth,
  downgradeExpiredUserToFree,
  isFirebaseConfigured,
  markUserCelebrationShown,
  sanitizeDisplayName,
  subscribeToUserProfile,
  syncVerifiedUserProfile,
  type FirestoreUserProfile,
} from './lib/firebase';
import {
  clearActiveSession,
  getActiveSession,
  saveActiveSession,
  type AuthSession,
} from './utils/auth';
import { useHashRoute, type AppRoute } from './utils/router';
import { ClockCard } from './components/ClockCard';
import type { CompareConfig } from './components/CompareModal';
import { CountryModal } from './components/CountryModal';
import { EarthGlobe } from './components/EarthGlobe';
import { MarketStatusBar } from './components/MarketStatusBar';
import type { WorldAlarm } from './components/AlarmModal';
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
import { FootballPage } from './pages/FootballPage';
import { CablesPage } from './pages/CablesPage';
import { SatellitesPage } from './pages/SatellitesPage';
import { AlarmsPage } from './pages/AlarmsPage';
import { ToolsPage } from './pages/ToolsPage';
import { LiveTvPage } from './pages/LiveTvPage';
import { LiveRadioPage } from './pages/LiveRadioPage';
import { EntertainmentLivePage } from './pages/EntertainmentLivePage';
import { MoviesPage, type MovieNavigationTarget } from './pages/MoviesPage';
import { MovieDetailPage } from './pages/MovieDetailPage';
import { AccountPage } from './pages/AccountPage';
import { getLiveTvChannelForCountry } from './data/liveTvChannels';
import { useMovieWatchlist } from './services/movieWatchlist';
import type { TmdbMovie } from './services/tmdb';
import {
  FREE_LIMITS,
  getDaysRemaining,
  isProActive,
  isProExpired,
  PRO_DURATION_MS,
  readGuestSubscription,
  saveGuestProSubscription,
  type LocalGuestSubscription,
} from './services/subscription';
import {
  loadLastReceipt,
  sendProActivationReceipt,
  type ProActivationReceipt,
} from './services/emailReceipt';
import { AdminPinModal } from './components/AdminPinModal';
import { SecretAdminDashboard } from './components/SecretAdminDashboard';
import { UpgradeProModal } from './components/UpgradeProModal';
import { ReceiptModal } from './components/ReceiptModal';
import { NeonFireCelebration } from './components/NeonFireCelebration';
import { BannedAccountScreen } from './components/BannedAccountScreen';

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
  const { route, navigate, goBack } = useHashRoute();

  // Fast O(1) ISO lookup across all 215 countries & territories
  const countryByIso = useMemo(
    () => new Map(COUNTRIES.map((c) => [c.iso.toLowerCase(), c])),
    []
  );

  // Cinematic Entry Sequence & Firebase / Local Session State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => getActiveSession());
  const [entryStage, setEntryStage] = useState<EntryStage>(() => {
    if (typeof window !== 'undefined' && window.location.hash.toLowerCase().startsWith('#/account')) {
      return 'dashboard';
    }
    return getActiveSession() ? 'dashboard' : 'landing';
  });

  // Synchronized live clock driven by single rAF second-flip loop
  const [now, setNow] = useState<Date>(() => new Date());
  const [is24Hour, setIs24Hour] = useState<boolean>(loadFormat24h);
  const [isDark, setIsDark] = useState<boolean>(loadDarkMode);
  const [clockView, setClockView] = useState<ClockViewMode>(loadClockView);
  const [tempUnit, setTempUnit] = useState<TempUnit>(loadTempUnit);
  const [pinnedIsos, setPinnedIsos] = useState<string[]>(loadPinnedFromStorage);

  // Focused Country & 3D Globe State
  const [globeCollapsed, setGlobeCollapsed] = useState<boolean>(false);
  const [focusedIso, setFocusedIso] = useState<string>(() => {
    const initialPinned = loadPinnedFromStorage();
    return initialPinned[0] || 'lk';
  });

  // Live ISS Position (polled every 6s with Keplerian orbital fallback)
  const [issPosition, setIssPosition] = useState<IssPosition>(() => estimateIssPosition());

  // World Alarms & Hourly Chime
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

  // Home page filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [sortMode, setSortMode] = useState<SortMode>('name');

  // Compare time mode
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

  // Copy feedback, Toast, Slide-Over Menu (☰), Globe Layer Commands & On-Demand Voice / Anthem Coordination
  const [copiedIso, setCopiedIso] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; title: string; detail?: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [globeLayerCommand, setGlobeLayerCommand] = useState<{
    id: number;
    target: 'cables' | 'satellites';
  } | null>(null);
  const [isAnthemPlaying, setIsAnthemPlaying] = useState<boolean>(false);
  const [voiceInterrupt, setVoiceInterrupt] = useState<VoiceInterruptSignal | null>(null);
  const voiceInterruptSeqRef = useRef<number>(1);
  const voiceContextRef = useRef<VoiceNarratorContext | null>(null);
  const lastAnnouncedRouteKeyRef = useRef<string>('');
  const toastTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const globeSectionRef = useRef<HTMLDivElement | null>(null);

  // Singleton National Anthem player coordinated strictly with AI Voice Assistant
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

  // Resolve route-specific countries cleanly
  const focusedCountry = useMemo(
    () => countryByIso.get(focusedIso.toLowerCase()) || COUNTRIES[0],
    [countryByIso, focusedIso]
  );

  const activeCountryPageCountry = useMemo(() => {
    if (route.page !== 'country') return null;
    return countryByIso.get(route.code.toLowerCase()) || COUNTRIES[0];
  }, [countryByIso, route]);

  const activeFootballCountry = useMemo(() => {
    if (route.page === 'football' && route.code) {
      return countryByIso.get(route.code.toLowerCase()) || focusedCountry;
    }
    return focusedCountry;
  }, [countryByIso, focusedCountry, route]);

  const activeCablesCountry = useMemo(() => {
    if (route.page === 'cables' && route.code) {
      return countryByIso.get(route.code.toLowerCase()) || focusedCountry;
    }
    return focusedCountry;
  }, [countryByIso, focusedCountry, route]);

  const activeSatellitesCountry = useMemo(() => {
    if (route.page === 'satellites' && route.code) {
      return countryByIso.get(route.code.toLowerCase()) || focusedCountry;
    }
    return focusedCountry;
  }, [countryByIso, focusedCountry, route]);

  const activeLiveTvCountry = useMemo(() => {
    if (route.page === 'live-tv' && route.code) {
      return countryByIso.get(route.code.toLowerCase()) || focusedCountry;
    }
    return focusedCountry;
  }, [countryByIso, focusedCountry, route]);

  const activeLiveRadioCountry = useMemo(() => {
    if (route.page === 'live-radio' && route.code) {
      return countryByIso.get(route.code.toLowerCase()) || focusedCountry;
    }
    return focusedCountry;
  }, [countryByIso, focusedCountry, route]);

  // Drift-aligned 1-second clock timer (fires only on second boundaries instead of waking the main thread 60x/sec)
  useEffect(() => {
    let timerId = 0;

    const scheduleNextTick = () => {
      const msUntilNextSecond = 1005 - (Date.now() % 1000);
      timerId = window.setTimeout(() => {
        setNow(new Date());
        scheduleNextTick();
      }, msUntilNextSecond);
    };

    scheduleNextTick();
    return () => window.clearTimeout(timerId);
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

  // Freemium Subscription, Secret Admin Panel, Email Receipt & Neon Fire Celebration state
  const [userProfile, setUserProfile] = useState<FirestoreUserProfile | null>(null);
  const [guestSub, setGuestSub] = useState<LocalGuestSubscription>(() => readGuestSubscription());
  const [upgradeModalState, setUpgradeModalState] = useState<{ open: boolean; reason: string | null }>({
    open: false,
    reason: null,
  });
  const [adminPinOpen, setAdminPinOpen] = useState<boolean>(false);
  const [adminDashboardOpen, setAdminDashboardOpen] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [lastReceipt, setLastReceipt] = useState<ProActivationReceipt | null>(() => loadLastReceipt());
  const [activeReceiptModal, setActiveReceiptModal] = useState<ProActivationReceipt | null>(null);
  const [bannedNotice, setBannedNotice] = useState<{ email: string; reason?: string } | null>(null);

  const globeTapTimestampsRef = useRef<number[]>([]);
  const hadFirestoreProfileRef = useRef<boolean>(false);
  const celebrationTriggerLockRef = useRef<string | null>(null);

  const freeCountryIsoSet = useMemo(
    () => new Set(COUNTRIES.slice(0, FREE_LIMITS.COUNTRIES).map((c) => c.iso.toLowerCase())),
    []
  );

  const isProUser = useMemo(() => {
    if (firebaseUser && firebaseUser.emailVerified) {
      return isProActive(userProfile);
    }
    return guestSub.plan === 'pro' && Boolean(guestSub.proExpiresAt && Date.now() <= guestSub.proExpiresAt);
  }, [firebaseUser, userProfile, guestSub]);

  const isCountryLocked = useCallback(
    (iso: string) => !isProUser && !freeCountryIsoSet.has(iso.toLowerCase()),
    [isProUser, freeCountryIsoSet]
  );

  const openUpgradeModal = useCallback((reason?: string) => {
    setUpgradeModalState({ open: true, reason: reason || null });
  }, []);

  // Hidden 10 consecutive taps within 5 seconds on the top-left blue Globe icon
  const handleSecretGlobeTap = useCallback((e: React.MouseEvent) => {
    const nowMs = Date.now();
    const recent = globeTapTimestampsRef.current.filter((ts) => nowMs - ts <= 5000);
    recent.push(nowMs);
    globeTapTimestampsRef.current = recent;
    if (recent.length >= 10) {
      e.preventDefault();
      e.stopPropagation();
      globeTapTimestampsRef.current = [];
      setAdminPinOpen(true);
    }
  }, []);

  // Subscribe to Firebase Authentication state so verified accounts persist across refreshes
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserProfile(null);
        hadFirestoreProfileRef.current = false;
        celebrationTriggerLockRef.current = null;
        return;
      }
      if (user && user.emailVerified && user.email) {
        const displayName = sanitizeDisplayName(user.displayName, user.email);
        const syncedSession: AuthSession = {
          uid: user.uid,
          email: user.email.toLowerCase(),
          displayName,
          emailVerified: true,
          loggedInAt: new Date().toISOString(),
          provider: 'firebase',
        };
        saveActiveSession(syncedSession);
        setAuthSession(syncedSession);
        setEntryStage((prev) => (prev === 'landing' ? 'dashboard' : prev));
        // Merge verified profile into Firestore users/{uid} without blocking UI
        void syncVerifiedUserProfile(user, displayName)
          .then((profile) => {
            if (profile?.isBanned) {
              setBannedNotice({
                email: profile.email,
                reason: 'Your account has been suspended by Admin.',
              });
              clearActiveSession();
              setAuthSession(null);
              if (auth) void signOut(auth).catch(() => {});
            }
          })
          .catch(() => {
            // Handled via structured handleFirestoreError logger
          });
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore listener for current user's subscription, 30-day expiry, ban, deletion & Pro celebration
  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseUser?.uid || !firebaseUser.emailVerified) {
      return;
    }
    const uid = firebaseUser.uid;
    const userEmail = (firebaseUser.email || '').toLowerCase();
    hadFirestoreProfileRef.current = false;

    const unsubscribe = subscribeToUserProfile(uid, (profile, exists) => {
      if (!exists) {
        if (hadFirestoreProfileRef.current) {
          // Account document was deleted by Admin while user was online -> revoke access immediately
          setUserProfile(null);
          clearActiveSession();
          setAuthSession(null);
          setBannedNotice({
            email: userEmail,
            reason: 'Your account has been removed by Admin. Access has been revoked.',
          });
          if (auth) void signOut(auth).catch(() => {});
        }
        return;
      }

      hadFirestoreProfileRef.current = true;
      if (!profile) return;

      // 1. Immediate real-time Ban enforcement
      if (profile.isBanned) {
        setUserProfile(profile);
        clearActiveSession();
        setAuthSession(null);
        setBannedNotice({
          email: profile.email || userEmail,
          reason: 'Your account has been suspended by Admin.',
        });
        if (auth) void signOut(auth).catch(() => {});
        return;
      }

      // 2. Automatic 30-Day Pro Expiry check
      if (isProExpired(profile)) {
        setUserProfile({ ...profile, plan: 'free', proExpiresAt: null });
        void downgradeExpiredUserToFree(uid).catch(() => {});
        return;
      }

      setUserProfile(profile);

      // 3. Real-Time Neon Fire Celebration when Pro is active & celebrationShown === false
      if (isProActive(profile) && profile.celebrationShown === false) {
        const triggerKey = `${uid}:${profile.proActivatedAt || 'pro'}`;
        if (celebrationTriggerLockRef.current !== triggerKey) {
          celebrationTriggerLockRef.current = triggerKey;
          setShowCelebration(true);
          void markUserCelebrationShown(uid).catch(() => {});
        }
      }
    });

    return () => unsubscribe();
  }, [firebaseUser?.uid, firebaseUser?.emailVerified, firebaseUser?.email]);

  // Immediate & periodic expiry watchdog so 30-day Pro plans downgrade automatically on load, navigation, or while app stays open
  useEffect(() => {
    const checkExpiryNow = () => {
      if (firebaseUser?.uid && userProfile && isProExpired(userProfile)) {
        setUserProfile((prev) => (prev ? { ...prev, plan: 'free', proExpiresAt: null } : prev));
        void downgradeExpiredUserToFree(firebaseUser.uid).catch(() => {});
      }
      setGuestSub((prev) => {
        if (prev.plan === 'pro' && prev.proExpiresAt && Date.now() > prev.proExpiresAt) {
          return readGuestSubscription();
        }
        return prev;
      });
    };

    checkExpiryNow();
    const id = window.setInterval(checkExpiryNow, 60_000);
    return () => window.clearInterval(id);
  }, [firebaseUser?.uid, userProfile, route]);

  // Complete Pro activation (via Payment Gateway or Redeem Code "Vidusha5621") + Automated Email Receipt + Celebration
  const handleCompleteProActivation = useCallback(
    async ({
      method,
      localPriceDisplay,
      receiptEmail,
    }: {
      method: 'payment' | 'redeem';
      localPriceDisplay: string;
      receiptEmail: string;
    }) => {
      let activatedAtMs = Date.now();
      let expiresAtMs = activatedAtMs + PRO_DURATION_MS;

      if (firebaseUser?.uid && firebaseUser.emailVerified) {
        const res = await activateUserPro(firebaseUser.uid, method, PRO_DURATION_MS);
        activatedAtMs = res.proActivatedAt;
        expiresAtMs = res.proExpiresAt;
        celebrationTriggerLockRef.current = `${firebaseUser.uid}:${activatedAtMs}`;
        void markUserCelebrationShown(firebaseUser.uid).catch(() => {});
      } else {
        const updatedGuest = saveGuestProSubscription(method, PRO_DURATION_MS);
        setGuestSub(updatedGuest);
        activatedAtMs = updatedGuest.proActivatedAt || activatedAtMs;
        expiresAtMs = updatedGuest.proExpiresAt || expiresAtMs;
      }

      const receipt = await sendProActivationReceipt({
        uid: firebaseUser?.emailVerified ? firebaseUser.uid : null,
        userEmail: receiptEmail,
        userName:
          userProfile?.displayName ||
          authSession?.displayName ||
          firebaseUser?.displayName ||
          'Neon Pro Member',
        activationMethod: method,
        activatedAtMs,
        expiresAtMs,
        localPriceDisplay,
      });

      setLastReceipt(receipt);
      setUpgradeModalState({ open: false, reason: null });
      setShowCelebration(true);
    },
    [firebaseUser, userProfile?.displayName, authSession?.displayName]
  );

  // Only run live orbital polling & propagation on views that display the globe or satellite telemetry
  const isOrbitalViewActive =
    entryStage === 'landing' ||
    (entryStage === 'dashboard' &&
      (route.page === 'home' || route.page === 'satellites' || route.page === 'country'));

  // Poll live ISS position every 6 seconds on orbital views (graceful orbital fallback if offline)
  useEffect(() => {
    if (!isOrbitalViewActive) return;
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
  }, [isOrbitalViewActive]);

  // Persist user preferences
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

  // '/' keyboard shortcut focuses search input cleanly on Home page
  useEffect(() => {
    if (entryStage !== 'dashboard' || route.page !== 'home') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !menuOpen &&
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
  }, [entryStage, route.page, menuOpen]);

  const showToast = useCallback((title: string, detail?: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), title, detail });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 2400);
  }, []);

  // World Alarm & Hourly Chime live evaluation engine (active across all pages once authenticated)
  useEffect(() => {
    if (entryStage !== 'dashboard') return;

    for (const alarm of alarms) {
      if (!alarm.enabled) continue;
      const country = countryByIso.get(alarm.countryIso.toLowerCase());
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
  }, [entryStage, now, alarms, hourlyChimeEnabled, localTz, is24Hour, showToast, countryByIso]);

  // Live orbital satellite constellation (ISS + LEO/SSO/MEO/GEO fleet; paused on non-orbital pages)
  const liveSatellites = useMemo(
    () => (isOrbitalViewActive ? propagateSatellites(now.getTime(), issPosition) : []),
    [isOrbitalViewActive, now, issPosition]
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
    return pinnedIsos
      .map((iso) => countryByIso.get(iso.toLowerCase()))
      .filter((c): c is Country => Boolean(c));
  }, [countryByIso, pinnedIsos]);

  // Keep on-demand voice context ref fresh without forcing narrator re-renders
  voiceContextRef.current = {
    entryStage,
    focusedCountry,
    inspectedCountry: activeCountryPageCountry,
    pinnedCountries: pinnedCountriesOrdered,
    displayDate,
    is24Hour,
    tempUnit,
    weatherMap,
    rates: fxState.rates,
    issPosition,
    satellites: liveSatellites,
  };

  // Sync route changes with focusedCountry, weather fetch, National Anthem & on-demand voice narration
  useEffect(() => {
    if (entryStage !== 'dashboard') return;

    const routeKey = JSON.stringify(route);
    if (lastAnnouncedRouteKeyRef.current === routeKey) return;
    lastAnnouncedRouteKeyRef.current = routeKey;

    if (
      route.page === 'live-tv' ||
      route.page === 'live-radio' ||
      route.page === 'entertainment-live' ||
      route.page === 'movies' ||
      route.page === 'movie-detail'
    ) {
      if (
        (route.page === 'live-tv' || route.page === 'live-radio') &&
        route.code &&
        countryByIso.has(route.code.toLowerCase())
      ) {
        setFocusedIso(route.code.toLowerCase());
      }
      // Strictly stop any National Anthem & keep Voice Assistant completely silent during Live TV / Live Radio / Entertainment Live / Movies
      anthemController.stopAnthem();
      return;
    }

    if (route.page === 'country' && activeCountryPageCountry) {
      setFocusedIso(activeCountryPageCountry.iso);
      anthemController.selectCountryAnthem(activeCountryPageCountry, true);
      fetchWeatherBatch([activeCountryPageCountry]).then((updated) => setWeatherMap(updated));
      if (voiceContextRef.current) {
        triggerVoiceLines(buildCountryLines(activeCountryPageCountry, voiceContextRef.current, true));
      }
      return;
    }

    if (route.page === 'football') {
      if (route.code && countryByIso.has(route.code.toLowerCase())) {
        setFocusedIso(route.code.toLowerCase());
      }
      triggerVoicePanel(
        `Football · ${activeFootballCountry.name}`,
        `Opened the National Football page for ${activeFootballCountry.name}, displaying squad players, positions, and live portraits.`
      );
      return;
    }

    if (route.page === 'crypto') {
      triggerVoicePanel(
        'Crypto Live Market',
        'Opened Crypto Live page showing real-time Bitcoin, Ethereum, Solana, BNB, and top cryptocurrencies in US Dollars and Sri Lankan Rupees.'
      );
      return;
    }

    if (route.page === 'cables') {
      if (route.code && countryByIso.has(route.code.toLowerCase())) {
        setFocusedIso(route.code.toLowerCase());
      }
      triggerVoicePanel(
        `Submarine Cables · ${activeCablesCountry.name}`,
        `Opened Submarine Cables and ISPs directory for ${activeCablesCountry.name} and global undersea fiber corridors.`
      );
      return;
    }

    if (route.page === 'satellites') {
      if (route.code && countryByIso.has(route.code.toLowerCase())) {
        setFocusedIso(route.code.toLowerCase());
      }
      triggerVoicePanel(
        'Live Satellites & ISS',
        `Opened Live Satellites page tracking the International Space Station and ${liveSatellites.length} orbital spacecraft.`
      );
      return;
    }

    if (route.page === 'alarms') {
      triggerVoicePanel(
        'World Alarms & Hourly Chime',
        `Opened World Alarms page. You currently have ${alarms.filter((a) => a.enabled).length} active alarms scheduled.`
      );
      return;
    }

    if (route.page === 'tools') {
      triggerVoicePanel(
        'Tools & Settings',
        'Opened Tools and Settings page for Digital or Analog clock mode, 12-hour or 24-hour time, temperature units, Jet Lag calculator, and timezone comparison.'
      );
      return;
    }

    if (route.page === 'dashboard') {
      triggerVoicePanel(
        'vidushanawood Account & Dashboard',
        `Opened your vidushanawood Account Dashboard with ${pinnedIsos.length} pinned countries and ${alarms.filter((a) => a.enabled).length} active alarms.`
      );
    }
  }, [
    entryStage,
    route,
    activeCountryPageCountry,
    activeFootballCountry,
    activeCablesCountry,
    anthemController,
    countryByIso,
    liveSatellites.length,
    alarms,
    pinnedIsos.length,
    triggerVoiceLines,
    triggerVoicePanel,
  ]);

  const handleAddAlarm = useCallback(
    (input: Omit<WorldAlarm, 'id'>) => {
      const next: WorldAlarm = {
        ...input,
        id: `alarm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      };
      setAlarms((prev) => [next, ...prev]);
      const c = countryByIso.get(input.countryIso.toLowerCase());
      showToast('Alarm scheduled', `${input.time} in ${c?.name || input.countryIso.toUpperCase()}`);
    },
    [countryByIso, showToast]
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
        const country = countryByIso.get(iso.toLowerCase());
        if (exists) {
          if (country) showToast('Unpinned', `${country.name} removed from favorites`);
          return prev.filter((item) => item !== iso);
        } else {
          if (country) showToast('Pinned to top', `${country.name} added to favorites`);
          return [iso, ...prev];
        }
      });
    },
    [countryByIso, showToast]
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
    (country: Country, scrollToGlobe = true, layerTarget?: 'cables' | 'satellites') => {
      setFocusedIso(country.iso);
      setGlobeCollapsed(false);
      if (layerTarget) {
        setGlobeLayerCommand({ id: Date.now(), target: layerTarget });
      }
      if (route.page !== 'home') {
        navigate({ page: 'home' });
      }
      anthemController.selectCountryAnthem(country, true);
      if (voiceContextRef.current) {
        triggerVoiceLines(buildCountryLines(country, voiceContextRef.current, false));
      }
      fetchWeatherBatch([country]).then((updated) => setWeatherMap(updated));
      if (scrollToGlobe) {
        window.setTimeout(() => {
          globeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
      }
    },
    [anthemController, navigate, route.page, triggerVoiceLines]
  );

  const handleClockCardFocusGlobe = useCallback(
    (country: Country) => handleFocusGlobe(country, true),
    [handleFocusGlobe]
  );

  const handleOpenCountryPage = useCallback(
    (country: Country) => {
      if (isCountryLocked(country.iso)) {
        openUpgradeModal(
          `Unlock ${country.name} and all ${COUNTRIES.length} countries with Neon Pro (Free plan includes the first ${FREE_LIMITS.COUNTRIES} countries).`
        );
        return;
      }
      setMenuOpen(false);
      setFocusedIso(country.iso);
      navigate({ page: 'country', code: country.iso });
    },
    [isCountryLocked, openUpgradeModal, navigate]
  );

  // Guard direct hash URL navigation (#/country/:lockedIso) or Pro expiry while viewing a locked country
  useEffect(() => {
    if (entryStage !== 'dashboard' || route.page !== 'country' || !activeCountryPageCountry) return;
    if (isCountryLocked(activeCountryPageCountry.iso)) {
      navigate({ page: 'home' });
      openUpgradeModal(
        `Unlock ${activeCountryPageCountry.name} and all ${COUNTRIES.length} countries with Neon Pro (Free plan includes the first ${FREE_LIMITS.COUNTRIES} countries).`
      );
    }
  }, [entryStage, route.page, activeCountryPageCountry, isCountryLocked, navigate, openUpgradeModal]);

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

  const handleMenuNavigate = useCallback(
    (target: AppRoute) => {
      setMenuOpen(false);
      navigate(target);
    },
    [navigate]
  );

  // Synced My List / Watchlist (Firestore when signed in + verified, localStorage fallback)
  const {
    watchlist: movieWatchlist,
    watchlistIds: movieWatchlistIds,
    isCloudSynced: isMovieWatchlistCloudSynced,
    toggleWatchlist: toggleRawMovieWatchlist,
  } = useMovieWatchlist(firebaseUser);

  const handleToggleMovieWatchlist = useCallback(
    async (movie: TmdbMovie) => {
      const action = await toggleRawMovieWatchlist(movie);
      showToast(
        action === 'added' ? 'Added to My List' : 'Removed from My List',
        movie.title
      );
      return action;
    },
    [toggleRawMovieWatchlist, showToast]
  );

  const handleOpenMovieDetail = useCallback(
    (target: MovieNavigationTarget) => {
      anthemController.stopAnthem();
      navigate({
        page: 'movie-detail',
        id: target.id,
        archiveId: target.archiveId,
      });
    },
    [anthemController, navigate]
  );

  const handleBackToMovies = useCallback(() => {
    anthemController.stopAnthem();
    navigate({ page: 'movies' });
  }, [anthemController, navigate]);

  const handleOpenAccountFromMovies = useCallback(() => {
    navigate({ page: 'account' });
  }, [navigate]);

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

  // Progressive windowing for the 215-country Home grid so scrolling & per-second clock ticks stay smooth
  const HOME_GRID_BATCH_SIZE = 36;
  const [homeVisibleCount, setHomeVisibleCount] = useState<number>(HOME_GRID_BATCH_SIZE);
  const homeLoadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setHomeVisibleCount(HOME_GRID_BATCH_SIZE);
  }, [activeTab, searchQuery, sortMode]);

  const renderedRegularCountries = useMemo(
    () => regularVisible.slice(0, homeVisibleCount),
    [regularVisible, homeVisibleCount]
  );

  useEffect(() => {
    if (entryStage !== 'dashboard' || route.page !== 'home') return;
    const sentinel = homeLoadMoreRef.current;
    if (!sentinel || homeVisibleCount >= regularVisible.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setHomeVisibleCount((prev) =>
            Math.min(prev + HOME_GRID_BATCH_SIZE, regularVisible.length)
          );
        }
      },
      { rootMargin: '280px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [entryStage, route.page, homeVisibleCount, regularVisible.length]);

  // Smart batched Open-Meteo weather prefetching (only runs on Home / Booting so sub-pages stay crisp)
  useEffect(() => {
    if (entryStage !== 'booting' && (entryStage !== 'dashboard' || route.page !== 'home')) return;
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

    const timer = window.setTimeout(runBatches, searchQuery ? 300 : 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [entryStage, route.page, activeTab, searchQuery, focusedCountry, pinnedVisible, regularVisible]);

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

  const handleLogout = useCallback(async () => {
    anthemController.stopAnthem();
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch {
        // Continue local cleanup cleanly
      }
    }
    clearActiveSession();
    setFirebaseUser(null);
    setAuthSession(null);
    setMenuOpen(false);
    setRingingAlarm(null);
    navigate({ page: 'home' }, { replace: true });
    setEntryStage('landing');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [anthemController, navigate]);

  // Inline Compare Bar handlers (on Home page when comparison is active)
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
    if (route.page !== 'home') {
      navigate({ page: 'home' });
    }
    window.setTimeout(() => {
      searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      searchInputRef.current?.focus();
    }, 80);
  }, [navigate, route.page]);

  const activeAlarmsCount = alarms.filter((a) => a.enabled).length;

  // Helper to render a clean dedicated full-screen page shell for sub-pages (Football, Crypto, Cables, Satellites, Alarms, Tools, Dashboard)
  const renderDedicatedSubPage = (
    pageTitle: string,
    pageSubtitle: string,
    body: React.ReactNode
  ) => (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden text-slate-900 dark:text-slate-100">
      <div className="ambient-canvas" aria-hidden="true" />

      {/* Dedicated Full-Screen Page Sticky Header (← Back + Page Title + Menu ☰) */}
      <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-[1380px] items-center justify-between gap-3 px-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back to previous page"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/90 px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-sky-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/12 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.12] dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span>Back</span>
            </button>

            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold tracking-tight text-slate-950 sm:text-base dark:text-white">
                {pageTitle}
              </p>
              <p className="hidden truncate text-[11px] font-medium text-slate-500 sm:block dark:text-slate-400">
                {pageSubtitle}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate({ page: 'home' })}
              aria-label="Return to Home Globe & Clocks"
              className="hidden h-10 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/90 px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-sky-300 hover:text-slate-950 sm:inline-flex dark:border-white/12 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.12] dark:hover:text-white"
            >
              <Globe2 className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              className="relative inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-3.5 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-300 hover:bg-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/14 dark:bg-white/[0.07] dark:text-slate-100 dark:hover:bg-white/[0.12]"
            >
              <Menu className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span>Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Active Page Body */}
      <main className="relative z-10 mx-auto w-full max-w-[1380px] flex-1 px-3.5 pt-6 pb-12 sm:px-6 lg:px-8">
        {body}
      </main>

      {/* Clean Copyright Footer */}
      <footer className="relative z-10 shrink-0 border-t border-slate-200/70 pt-7 pb-28 sm:pb-24 dark:border-white/[0.07] dark:bg-[#050a16]/70">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-between gap-2 px-3.5 text-center text-xs text-slate-600 sm:flex-row sm:px-6 sm:text-left lg:px-8 dark:text-slate-400">
          <p className="font-medium text-slate-800 dark:text-slate-200">
            © 2026 Vidusha Nawood · Neon World Clock. All rights reserved.
          </p>
          <p className="tabular-clock text-slate-500 dark:text-slate-500">
            {COUNTRIES.length} regions · Meridian Multi-Page Edition
          </p>
        </div>
      </footer>
    </div>
  );

  // Render ONLY the active page (unmounts previous views & WebGL canvases cleanly!)
  const renderActivePage = () => {
    // 1. Dedicated Full-Screen Country Page (#/country/:code)
    if (route.page === 'country' && activeCountryPageCountry) {
      return (
        <CountryModal
          country={activeCountryPageCountry}
          displayDate={displayDate}
          satellites={liveSatellites}
          is24Hour={is24Hour}
          tempUnit={tempUnit}
          isPinned={pinnedSet.has(activeCountryPageCountry.iso)}
          weather={weatherMap[activeCountryPageCountry.iso]}
          rates={fxState.rates}
          ratesAreLive={fxState.isLive}
          anthemController={anthemController}
          onClose={goBack}
          onTogglePin={handleTogglePin}
          onFocusOnGlobe={(c) => handleFocusGlobe(c, true, 'cables')}
          onCopySummary={handleCopyCard}
          onNarrateCountry={handleNarrateCountry}
          onReadOverview={handleReadOverview}
          onNarrateSection={triggerVoicePanel}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenFootballPage={(c) => navigate({ page: 'football', code: c.iso })}
          onOpenCablesPage={(c) => navigate({ page: 'cables', code: c.iso })}
          onOpenSatellitesPage={(c) => navigate({ page: 'satellites', code: c.iso })}
          onOpenLiveTv={(c) => {
            anthemController.stopAnthem();
            navigate({ page: 'live-tv', code: c.iso });
          }}
          onOpenLiveRadio={(c) => {
            anthemController.stopAnthem();
            navigate({ page: 'live-radio', code: c.iso });
          }}
        />
      );
    }

    // 1B. Dedicated Full-Screen Live TV Page (#/live-tv & #/live-tv/:code)
    if (route.page === 'live-tv') {
      const activeChannel = getLiveTvChannelForCountry(activeLiveTvCountry);
      return renderDedicatedSubPage(
        `Live TV · ${activeLiveTvCountry.name}`,
        `${activeChannel.channelName} · Public Live Broadcast`,
        <LiveTvPage
          countries={COUNTRIES}
          selectedCountry={activeLiveTvCountry}
          displayDate={displayDate}
          is24Hour={is24Hour}
          isProUser={isProUser}
          onRequireUpgrade={openUpgradeModal}
          onSelectCountryCode={(iso) => navigate({ page: 'live-tv', code: iso })}
          onOpenCountryPage={handleOpenCountryPage}
        />
      );
    }

    // 1C. Dedicated Full-Screen Live Radio Page (#/live-radio & #/live-radio/:code)
    if (route.page === 'live-radio') {
      return renderDedicatedSubPage(
        `Live Radio · ${activeLiveRadioCountry.name}`,
        'Online FM & public internet radio stations worldwide',
        <LiveRadioPage
          countries={COUNTRIES}
          selectedCountry={activeLiveRadioCountry}
          displayDate={displayDate}
          is24Hour={is24Hour}
          isProUser={isProUser}
          onRequireUpgrade={openUpgradeModal}
          onSelectCountryCode={(iso) => navigate({ page: 'live-radio', code: iso })}
          onOpenCountryPage={handleOpenCountryPage}
          onOpenLiveTvPage={(c) => {
            anthemController.stopAnthem();
            navigate({ page: 'live-tv', code: c.iso });
          }}
        />
      );
    }

    // 1D. Dedicated Full-Screen Entertainment Live Page (#/entertainment-live)
    if (route.page === 'entertainment-live') {
      return renderDedicatedSubPage(
        'Entertainment Live',
        '10,000+ live HLS channels across Movies, Cartoons, Sports, News, Music & more',
        <EntertainmentLivePage
          isProUser={isProUser}
          onRequireUpgrade={openUpgradeModal}
        />
      );
    }

    // 1E. Dedicated Full-Screen Movies Page (#/movies)
    if (route.page === 'movies') {
      return renderDedicatedSubPage(
        'Movies',
        'Ad-free Internet Archive full cinema, TMDB search, genre filters & My List',
        <MoviesPage
          watchlist={movieWatchlist}
          watchlistIds={movieWatchlistIds}
          isCloudSynced={isMovieWatchlistCloudSynced}
          isProUser={isProUser}
          onRequireUpgrade={openUpgradeModal}
          onToggleWatchlist={handleToggleMovieWatchlist}
          onOpenMovie={handleOpenMovieDetail}
          onOpenAccount={handleOpenAccountFromMovies}
        />
      );
    }

    // 1F. Dedicated Full-Screen Movie Details & Watch Page (#/movies/:id & #/movies/archive/:archiveId)
    if (route.page === 'movie-detail') {
      return renderDedicatedSubPage(
        'Watch Movie',
        'Ad-free native HTML5 / HLS cinema player, captions, official trailer & cast',
        <MovieDetailPage
          movieId={route.id}
          archiveId={route.archiveId}
          watchlistIds={movieWatchlistIds}
          isCloudSynced={isMovieWatchlistCloudSynced}
          isProUser={isProUser}
          onRequireUpgrade={openUpgradeModal}
          onToggleWatchlist={handleToggleMovieWatchlist}
          onBackToMovies={handleBackToMovies}
          onOpenMovie={handleOpenMovieDetail}
        />
      );
    }

    // 2. Dedicated Full-Screen National Football Page (#/football & #/football/:code)
    if (route.page === 'football') {
      return renderDedicatedSubPage(
        `National Football · ${activeFootballCountry.name}`,
        'National team details, squad players, positions & live player portraits',
        <FootballPage
          countries={COUNTRIES}
          selectedCountry={activeFootballCountry}
          onSelectCountryCode={(iso) => navigate({ page: 'football', code: iso })}
          onOpenCountryPage={handleOpenCountryPage}
          onNarrate={triggerVoicePanel}
        />
      );
    }

    // 3. Dedicated Full-Screen Crypto Live Page (#/crypto)
    if (route.page === 'crypto') {
      return renderDedicatedSubPage(
        'Crypto Live Market',
        'Real-time cryptocurrency prices in USD & LKR, 24h changes & market cap',
        <CryptoLiveSection
          usdToLkrRate={fxState.rates['LKR'] || 296}
          onBackToGlobe={() => navigate({ page: 'home' })}
          onSelectCoinSpeech={triggerVoicePanel}
        />
      );
    }

    // 4. Dedicated Full-Screen Submarine Cables & ISPs Page (#/cables & #/cables/:code)
    if (route.page === 'cables') {
      return renderDedicatedSubPage(
        `Submarine Cables & ISPs · ${activeCablesCountry.name}`,
        'Global undersea fiber-optic corridors & national Internet Service Providers',
        <CablesPage
          countries={COUNTRIES}
          selectedCountry={activeCablesCountry}
          onSelectCountryCode={(iso) => navigate({ page: 'cables', code: iso })}
          onOpenCountryPage={handleOpenCountryPage}
          onViewCablesOnGlobe={(country) => handleFocusGlobe(country, true, 'cables')}
          onNarrate={triggerVoicePanel}
        />
      );
    }

    // 5. Dedicated Full-Screen Live Satellites & ISS Telemetry Page (#/satellites)
    if (route.page === 'satellites') {
      return renderDedicatedSubPage(
        'Live Satellites & ISS Telemetry',
        'Real-time International Space Station tracking & orbital constellation fleet',
        <SatellitesPage
          countries={COUNTRIES}
          selectedCountry={activeSatellitesCountry}
          issPosition={issPosition}
          satellites={liveSatellites}
          onSelectCountryCode={(iso) => navigate({ page: 'satellites', code: iso })}
          onTrackSatellitesOnGlobe={() => handleFocusGlobe(focusedCountry, true, 'satellites')}
          onNarrate={triggerVoicePanel}
        />
      );
    }

    // 6. Dedicated Full-Screen World Alarms & Hourly Chime Page (#/alarms)
    if (route.page === 'alarms') {
      return renderDedicatedSubPage(
        'World Alarms & Hourly Chime',
        'Schedule timezone alerts across all 215 regions with Web Audio chimes',
        <AlarmsPage
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
      );
    }

    // 7. Dedicated Full-Screen Tools & Settings Page (#/tools)
    if (route.page === 'tools') {
      return renderDedicatedSubPage(
        'Tools, Jet Lag & Display Settings',
        'Digital/Analog, 12H/24H, °C/°F, Flight Jet Lag Calculator & Timezone Compare',
        <ToolsPage
          key={route.tab || 'settings'}
          initialTab={route.tab || 'settings'}
          countries={COUNTRIES}
          pinnedCountries={pinnedCountriesOrdered}
          is24Hour={is24Hour}
          clockView={clockView}
          tempUnit={tempUnit}
          isDark={isDark}
          hourlyChimeEnabled={hourlyChimeEnabled}
          activeAlarmsCount={activeAlarmsCount}
          compareConfig={compareConfig}
          onSetClockView={setClockView}
          onSet24Hour={setIs24Hour}
          onSetTempUnit={setTempUnit}
          onSetDark={setIsDark}
          onSetHourlyChime={setHourlyChimeEnabled}
          onApplyCompare={(cfg) => {
            setCompareConfig(cfg);
            showToast('Comparison active', `Showing global times for ${cfg.refLabel}`);
            navigate({ page: 'home' });
          }}
          onResetLive={handleResetLive}
          onOpenAlarmsPage={() => navigate({ page: 'alarms' })}
        />
      );
    }

    // 8. Dedicated Full-Screen vidushanawood Account & User Dashboard Page (#/dashboard)
    if (route.page === 'dashboard') {
      return renderDedicatedSubPage(
        'vidushanawood Account & Dashboard',
        'Manage profile, pinned countries, active world alarms & preferences',
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
          onBackToGlobe={() => navigate({ page: 'home' })}
          onOpenCrypto={() => navigate({ page: 'crypto' })}
          onOpenCountry={handleOpenCountryPage}
          onOpenAlarms={() => navigate({ page: 'alarms' })}
          onOpenJetLag={() => navigate({ page: 'tools', tab: 'jetlag' })}
          onOpenCompare={() => navigate({ page: 'tools', tab: 'compare' })}
          onToggle24Hour={() => setIs24Hour((v) => !v)}
          onToggleClockView={() =>
            setClockView((v) => (v === 'digital' ? 'analog' : 'digital'))
          }
          onToggleTempUnit={() => setTempUnit((u) => (u === 'C' ? 'F' : 'C'))}
          onToggleTheme={() => setIsDark((d) => !d)}
          onToggleHourlyChime={() => setHourlyChimeEnabled((v) => !v)}
          onSwitchAccount={() => navigate({ page: 'account' })}
          onLogout={handleLogout}
        />
      );
    }

    // 8B. Dedicated Full-Screen Firebase Account Page (#/account)
    if (route.page === 'account') {
      return renderDedicatedSubPage(
        'Account · Sign Up & Sign In',
        'Firebase Email & Password authentication, email verification & Firestore profile',
        <AccountPage
          session={authSession}
          firebaseUser={firebaseUser}
          userProfile={userProfile}
          isProUser={isProUser}
          hasLastReceipt={Boolean(lastReceipt)}
          onOpenUpgrade={() => openUpgradeModal()}
          onViewLastReceipt={() => {
            if (lastReceipt) setActiveReceiptModal(lastReceipt);
          }}
          onAccountBanned={(bannedEmail) => {
            clearActiveSession();
            setAuthSession(null);
            setBannedNotice({
              email: bannedEmail,
              reason: 'Your account has been suspended by Admin.',
            });
          }}
          onSessionVerified={(verifiedSession) => {
            setAuthSession(verifiedSession);
            setEntryStage('dashboard');
            showToast(
              'Account Verified',
              `Signed in as ${verifiedSession.displayName || verifiedSession.email}`
            );
          }}
          onSignOut={handleLogout}
          onOpenDashboard={() => navigate({ page: 'dashboard' })}
          onBackToGlobe={() => navigate({ page: 'home' })}
        />
      );
    }

    // 9. Home Page (#/): Clean Header + Live Clock Strip + Interactive 3D Earth Globe + Quick Country Grid + Footer
    return (
      <div className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden text-slate-900 dark:text-slate-100">
        <div className="ambient-canvas" aria-hidden="true" />

        {/* Clean Minimal Sticky Home Header (Brand + Center Local Clock + Search + Menu ☰) */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-white/[0.07] dark:bg-slate-950/85">
          <div className="mx-auto flex h-16 max-w-[1380px] items-center justify-between gap-3 px-3.5 sm:px-6 lg:px-8">
            <a
              href="#/"
              onClick={(e) => {
                e.preventDefault();
                navigate({ page: 'home' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex min-w-0 items-center gap-2.5 whitespace-nowrap rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <span
                onClick={handleSecretGlobeTap}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm dark:bg-sky-500/20 dark:text-sky-400 dark:ring-1 dark:ring-sky-400/35"
              >
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

            {/* Quiet Live Local Clock on Tablet & Desktop */}
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

            {/* Top-Level Right Actions: Search + Menu (☰) */}
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
                className={`relative inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  compareConfig.active || activeAlarmsCount > 0
                    ? 'border-sky-400/50 bg-sky-500/15 text-sky-800 dark:text-sky-200'
                    : 'border-slate-200/90 bg-white/90 text-slate-800 hover:border-slate-300 hover:bg-white dark:border-white/14 dark:bg-white/[0.07] dark:text-slate-100 dark:hover:bg-white/[0.12]'
                }`}
              >
                <Menu className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                <span>Menu</span>
                {(activeAlarmsCount > 0 || compareConfig.active) && (
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-400" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Home Page Main Content */}
        <main id="top" className="relative z-10 mx-auto w-full max-w-[1380px] flex-1 px-3.5 pt-6 pb-16 sm:px-6 lg:px-8">
          {/* Hero Title & Local Clock Strip */}
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
              </p>
            </div>

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

          {/* Home National Anthem Player Bar */}
          <NationalAnthemBar controller={anthemController} variant="dashboard" />

          {/* Interactive 3D Rotating Earth Globe Hero */}
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
              onInspectCountry={handleOpenCountryPage}
              onLayerEvent={triggerVoicePanel}
              layerCommand={globeLayerCommand}
            />
          </div>

          {/* Global Stock Market Open / Close Status Bar */}
          <MarketStatusBar
            displayDate={displayDate}
            onSelectCountryIso={(iso) => {
              const target = countryByIso.get(iso.toLowerCase());
              if (target) handleOpenCountryPage(target);
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
                    onClick={() => navigate({ page: 'tools', tab: 'compare' })}
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

          {/* Country Clocks Grid */}
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
                      Click any card to open its dedicated full-screen country page
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
                        onFocusGlobe={handleClockCardFocusGlobe}
                        onOpenDetails={handleOpenCountryPage}
                        isLocked={isCountryLocked(country.iso)}
                      />
                    ))}
                  </div>
                </section>
              )}

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
                    {renderedRegularCountries.map((country) => (
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
                        onFocusGlobe={handleClockCardFocusGlobe}
                        onOpenDetails={handleOpenCountryPage}
                        isLocked={isCountryLocked(country.iso)}
                      />
                    ))}
                  </div>

                  {homeVisibleCount < regularVisible.length && (
                    <div ref={homeLoadMoreRef} className="mt-6 flex justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          setHomeVisibleCount((prev) =>
                            Math.min(prev + HOME_GRID_BATCH_SIZE, regularVisible.length)
                          )
                        }
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 transition-colors hover:border-sky-400/50 hover:text-sky-600 dark:border-white/12 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:border-sky-400/45 dark:hover:bg-white/[0.1] dark:hover:text-white tabular-nums"
                      >
                        Show more countries (
                        {(regularVisible.length - homeVisibleCount).toLocaleString()} remaining)
                      </button>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </main>

        {/* Home Copyright Footer */}
        <footer className="relative z-10 shrink-0 border-t border-slate-200/70 pt-8 pb-28 sm:pb-24 dark:border-white/[0.07] dark:bg-[#050a16]/60">
          <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-between gap-2 px-3.5 text-center text-xs text-slate-600 sm:flex-row sm:px-6 sm:text-left lg:px-8 dark:text-slate-400">
            <p className="font-medium text-slate-800 dark:text-slate-200">
              © 2026 Vidusha Nawood · Neon World Clock. All rights reserved.
            </p>
            <p className="tabular-clock text-slate-500 dark:text-slate-500">
              {COUNTRIES.length} countries indexed · Live IANA time, Crypto, Cables &amp; Satellites
            </p>
          </div>
        </footer>
      </div>
    );
  };

  // Global Slide-Over Menu (☰) Drawer accessible across EVERY dedicated page
  const navigationDrawer = menuOpen && entryStage === 'dashboard' && (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Page Navigation and Controls Menu"
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
              <p className="text-sm font-bold text-white">Navigation Menu</p>
              <p className="text-[11px] text-slate-400">Every option opens its own full page</p>
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

        {/* Scrollable Drawer Links & Quick Toggles */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Subscription Plan Status / Upgrade Entry */}
          <div
            className={`rounded-2xl border p-3.5 ${
              isProUser
                ? 'border-cyan-400/40 bg-gradient-to-r from-cyan-500/15 via-slate-900 to-fuchsia-500/15'
                : 'border-fuchsia-400/30 bg-slate-900/80'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Crown className={`h-4 w-4 ${isProUser ? 'text-amber-300' : 'text-fuchsia-300'}`} aria-hidden="true" />
                <span className="text-xs font-extrabold text-white">
                  {isProUser ? 'Neon Pro Active' : 'Free Plan'}
                </span>
              </div>
              {isProUser ? (
                <span className="rounded-md border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                  {getDaysRemaining(userProfile?.proExpiresAt ?? guestSub.proExpiresAt)}d left
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    openUpgradeModal();
                  }}
                  className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-2.5 py-1 text-[11px] font-extrabold text-slate-950 transition hover:brightness-110"
                >
                  Upgrade
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {isProUser
                ? 'All 215 countries, Live TV, Radio, Entertainment & Movies unlocked.'
                : 'Unlock all 215 countries, Live TV, Radio, Entertainment & Movies.'}
            </p>
            {isProUser && lastReceipt && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setActiveReceiptModal(lastReceipt);
                }}
                className="mt-2 text-[11px] font-semibold text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
              >
                View Latest Pro Receipt
              </button>
            )}
          </div>

          {/* 1. Dedicated Full-Screen Pages */}
          <div className="space-y-1.5">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
              Full-Screen Pages
            </p>

            <button
              type="button"
              onClick={() => handleMenuNavigate({ page: 'home' })}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                route.page === 'home'
                  ? 'border-sky-400/45 bg-sky-500/18 text-white'
                  : 'border-white/[0.07] bg-white/[0.03] text-slate-200 hover:border-sky-400/30 hover:bg-white/[0.07]'
              }`}
            >
              <Globe2 className="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
              <div className="min-w-0">
                <p>Home · Globe &amp; Clocks</p>
                <p className="text-[11px] font-normal text-slate-400">
                  3D Earth &amp; {COUNTRIES.length} live countries
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleOpenCountryPage(focusedCountry)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                route.page === 'country'
                  ? 'border-sky-400/45 bg-sky-500/18 text-white'
                  : 'border-white/[0.07] bg-white/[0.03] text-slate-200 hover:border-sky-400/30 hover:bg-white/[0.07]'
              }`}
            >
              <img
                src={`https://flagcdn.com/w40/${focusedCountry.iso}.png`}
                alt=""
                width={18}
                height={12}
                referrerPolicy="no-referrer"
                className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover ring-1 ring-white/20"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate">{focusedCountry.name} Page</p>
                <p className="text-[11px] font-normal text-slate-400">
                  3D characters, anthem, trade &amp; overview
                </p>
              </div>
              {isCountryLocked(focusedCountry.iso) && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-fuchsia-400/45 bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-fuchsia-200">
                  Pro
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleMenuNavigate({ page: 'live-tv', code: focusedCountry.iso })}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                route.page === 'live-tv'
                  ? 'border-rose-400/50 bg-rose-500/18 text-white'
                  : 'border-white/[0.07] bg-white/[0.03] text-slate-200 hover:border-rose-400/35 hover:bg-white/[0.07]'
              }`}
            >
              <Tv className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              <div className="min-w-0">
                <p>Live TV</p>
                <p className="truncate text-[11px] font-normal text-slate-400">
                  {focusedCountry.name} &amp; {COUNTRIES.length} global live channels
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleMenuNavigate({ page: 'live-radio', code: focusedCountry.iso })}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                route.page === 'live-radio'
                  ? 'border-emerald-400/50 bg-emerald-500/18 text-white'
                  : 'border-white/[0.07] bg-white/[0.03] text-slate-200 hover:border-emerald-400/35 hover:bg-white/[0.07]'
              }`}
            >
              <Radio className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              <div className="min-w-0">
                <p>Live Radio</p>
                <p className="truncate text-[11px] font-normal text-slate-400">
                  {focusedCountry.name} &amp; worldwide online radio stations
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                anthemController.stopAnthem();
                handleMenuNavigate({ page: 'entertainment-live' });
              }}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                route.page === 'entertainment-live'
                  ? 'border-fuchsia-400/50 bg-fuchsia-500/18 text-white'
                  : 'border-white/[0.07] bg-white/[0.03] text-slate-200 hover:border-fuchsia-400/35 hover:bg-white/[0.07]'
              }`}
            >
              <Clapperboard className="h-4 w-4 shrink-0 text-fuchsia-400" aria-hidden="true" />
              <div className="min-w-0">
                <p>Entertainment Live</p>
                <p className="truncate text-[11px] font-normal text-slate-400">
                  10,000+ channels · Movies, Cartoons, Sports, News &amp; Music
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                anthemController.stopAnthem();
                handleMenuNavigate({ page: 'movies' });
              }}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                route.page === 'movies' || route.page === 'movie-detail'
                  ? 'border-sky-400/55 bg-sky-500/20 text-white'
                  : 'border-white/[0.07] bg-white/[0.03] text-slate-200 hover:border-sky-400/40 hover:bg-white/[0.07]'
              }`}
            >
              <Film className="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
              <div className="min-w-0">
                <p>Movies</p>
                <p className="truncate text-[11px] font-normal text-slate-400">
                  Ad-free open cinema, TMDB search, native player &amp; My List
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleMenuNavigate({ page: 'football', code: focusedCountry.iso })}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                route.page === 'football'
                  ? 'border-amber-400/45 bg-amber-500/18 text-white'
                  : 'border-white/[0.07] bg-white/[0.03] text-slate-200 hover:border-amber-400/35 hover:bg-white/[0.07]'
              }`}
            >
              <Trophy className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <div className="min-w-0">
                <p>National Football</p>
                <p className="truncate text-[11px] font-normal text-slate-400">
                  {focusedCountry.name} squad, positions &amp; player photos
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleMenuNavigate({ page: 'crypto' })}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                route.page === 'crypto'
                  ? 'border-sky-400/45 bg-sky-500/18 text-white'
                  : 'border-white/[0.07] bg-white/[0.03] text-slate-200 hover:border-sky-400/30 hover:bg-white/[0.07]'
              }`}
            >
              <Coins className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <div className="min-w-0">
                <p>Crypto Live</p>
                <p className="text-[11px] font-normal text-slate-400">
                  Real-time USD &amp; LKR prices &amp; market cap
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleMenuNavigate({ page: 'cables', code: focusedCountry.iso })}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                route.page === 'cables'
                  ? 'border-cyan-400/45 bg-cyan-500/18 text-white'
                  : 'border-white/[0.07] bg-white/[0.03] text-slate-200 hover:border-cyan-400/35 hover:bg-white/[0.07]'
              }`}
            >
              <Cable className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
              <div className="min-w-0">
                <p>Submarine Cables &amp; ISPs</p>
                <p className="text-[11px] font-normal text-slate-400">
                  Global fiber corridors &amp; country ISPs
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleMenuNavigate({ page: 'satellites', code: focusedCountry.iso })}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                route.page === 'satellites'
                  ? 'border-emerald-400/45 bg-emerald-500/18 text-white'
                  : 'border-white/[0.07] bg-white/[0.03] text-slate-200 hover:border-emerald-400/35 hover:bg-white/[0.07]'
              }`}
            >
              <Orbit className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              <div className="min-w-0">
                <p>Live Satellites &amp; ISS</p>
                <p className="text-[11px] font-normal text-slate-400">
                  Orbital constellation &amp; ISS live telemetry
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleMenuNavigate({ page: 'alarms' })}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                route.page === 'alarms'
                  ? 'border-amber-400/45 bg-amber-500/18 text-white'
                  : 'border-white/[0.07] bg-white/[0.03] text-slate-200 hover:border-amber-400/35 hover:bg-white/[0.07]'
              }`}
            >
              <Bell className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <div className="min-w-0">
                <p>World Alarms{activeAlarmsCount > 0 ? ` (${activeAlarmsCount})` : ''}</p>
                <p className="text-[11px] font-normal text-slate-400">
                  Timezone alerts &amp; hourly chime
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleMenuNavigate({ page: 'tools', tab: 'settings' })}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                route.page === 'tools'
                  ? 'border-sky-400/45 bg-sky-500/18 text-white'
                  : 'border-white/[0.07] bg-white/[0.03] text-slate-200 hover:border-sky-400/35 hover:bg-white/[0.07]'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
              <div className="min-w-0">
                <p>Tools, Jet Lag &amp; Settings</p>
                <p className="text-[11px] font-normal text-slate-400">
                  Jet lag planner, compare zones &amp; units
                </p>
              </div>
            </button>
          </div>

          {/* 2. Quick Display Toggles */}
          <div className="space-y-2.5 rounded-2xl border border-white/[0.08] bg-slate-950/60 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Quick Display Controls
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setClockView((v) => (v === 'digital' ? 'analog' : 'digital'))}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
              >
                <span className="text-slate-400">Clock</span>
                <span className="text-sky-300">{clockView === 'digital' ? 'Digital' : 'Analog'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIs24Hour((v) => !v)}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
              >
                <span className="text-slate-400">Format</span>
                <span className="text-sky-300">{is24Hour ? '24H' : '12H'}</span>
              </button>
              <button
                type="button"
                onClick={() => setTempUnit((u) => (u === 'C' ? 'F' : 'C'))}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
              >
                <span className="text-slate-400">Temp</span>
                <span className="text-sky-300">°{tempUnit}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDark((d) => !d)}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
              >
                <span className="text-slate-400">Theme</span>
                <span className="inline-flex items-center gap-1 text-sky-300">
                  {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3 text-amber-300" />}
                  {isDark ? 'Dark' : 'Light'}
                </span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleMenuNavigate({ page: 'tools', tab: 'jetlag' })}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.09]"
              >
                <Plane className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                <span>Jet Lag</span>
              </button>
              <button
                type="button"
                onClick={() => handleMenuNavigate({ page: 'tools', tab: 'compare' })}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.09]"
              >
                <CalendarClock className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                <span>Compare</span>
              </button>
            </div>
          </div>

          {/* 3. vidushanawood Account & Dashboard */}
          <div className="space-y-2 border-t border-white/[0.08] pt-4">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
              vidushanawood Account
            </p>

            <button
              type="button"
              onClick={() => handleMenuNavigate({ page: 'dashboard' })}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                route.page === 'dashboard'
                  ? 'border-emerald-400/45 bg-emerald-500/15 text-white'
                  : 'border-white/[0.08] bg-white/[0.03] text-slate-200 hover:border-emerald-400/35 hover:bg-white/[0.07]'
              }`}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p>Account &amp; Dashboard</p>
                <p className="truncate text-[11px] font-normal text-slate-400">
                  {authSession ? authSession.email : 'Manage profile, pins & alerts'}
                </p>
              </div>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleMenuNavigate({ page: 'account' })}
                className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                  route.page === 'account'
                    ? 'border-cyan-400/55 bg-cyan-500/20 text-white'
                    : 'border-sky-400/35 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25 hover:text-white'
                }`}
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
                  onClick={() => handleMenuNavigate({ page: 'dashboard' })}
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
          backLabel={authSession ? 'Back to App' : 'Back to Preview'}
          onAuthenticated={handleAuthenticated}
        />
      ) : entryStage === 'booting' ? (
        <CinematicBootScreen
          operatorEmail={authSession?.email || 'operator@vidushanawood.local'}
          onComplete={handleBootComplete}
        />
      ) : (
        <>
          {renderActivePage()}
          {navigationDrawer}

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
        </>
      )}

      {/* On-Demand AI Voice Assistant (Speaks only on navigation/click; silent during National Anthem, Live TV, Live Radio, Entertainment Live & Movies) */}
      <ContinuousVoiceNarrator
        interruptSignal={voiceInterrupt}
        isAnthemPlaying={isAnthemPlaying}
        isLiveTvActive={
          route.page === 'live-tv' ||
          route.page === 'live-radio' ||
          route.page === 'entertainment-live' ||
          route.page === 'movies' ||
          route.page === 'movie-detail'
        }
      />

      {/* Secret Admin PIN Modal (Opened via 10 taps in 5s on top-left blue Globe icon) */}
      <AdminPinModal
        isOpen={adminPinOpen}
        onClose={() => setAdminPinOpen(false)}
        onUnlock={() => {
          setAdminPinOpen(false);
          setAdminDashboardOpen(true);
        }}
      />

      {/* Full-Screen Secret Admin Command Dashboard */}
      <SecretAdminDashboard
        isOpen={adminDashboardOpen}
        onClose={() => setAdminDashboardOpen(false)}
        currentUserEmail={firebaseUser?.email || authSession?.email || null}
        currentUserUid={firebaseUser?.uid || null}
        onSignOutAndSwitch={() => {
          void handleLogout();
          navigate({ page: 'account' });
        }}
      />

      {/* Upgrade to Neon Pro Modal (Auto Currency Detection + Checkout + Redeem Code) */}
      <UpgradeProModal
        isOpen={upgradeModalState.open}
        reason={upgradeModalState.reason}
        liveUsdRates={fxState.rates}
        userEmail={firebaseUser?.email || authSession?.email || null}
        isSignedIn={Boolean(firebaseUser && firebaseUser.emailVerified)}
        onClose={() => setUpgradeModalState({ open: false, reason: null })}
        onOpenAuth={() => navigate({ page: 'account' })}
        onCompleteActivation={handleCompleteProActivation}
      />

      {/* Digital Activation Receipt Modal */}
      <ReceiptModal
        receipt={activeReceiptModal}
        onClose={() => setActiveReceiptModal(null)}
      />

      {/* Full-Screen Neon Fire & Particle Explosion Celebration */}
      <NeonFireCelebration
        isOpen={showCelebration}
        receipt={lastReceipt}
        onClose={() => setShowCelebration(false)}
        onViewReceipt={() => {
          if (lastReceipt) setActiveReceiptModal(lastReceipt);
        }}
      />

      {/* Full-Screen Admin Suspension / Banned Account Blocker */}
      {bannedNotice && (
        <BannedAccountScreen
          email={bannedNotice.email}
          reason={bannedNotice.reason}
          onDismiss={() => {
            setBannedNotice(null);
            navigate({ page: 'account' });
          }}
        />
      )}
    </>
  );
}
