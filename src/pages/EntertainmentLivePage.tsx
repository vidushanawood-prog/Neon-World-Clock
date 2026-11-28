import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Hls from 'hls.js';
import {
  AlertTriangle,
  ArrowUp,
  Baby,
  BookOpen,
  CheckCircle2,
  Clapperboard,
  Compass,
  ExternalLink,
  Film,
  Globe2,
  Heart,
  Layers,
  Lock,
  MapPin,
  Maximize,
  Minimize,
  Music,
  Newspaper,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  SkipForward,
  Smile,
  Sparkles,
  Trophy,
  Tv,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  CATEGORY_TABS,
  clearCachedChannelHealth,
  getCachedHealthSnapshot,
  INITIAL_SEED_CHANNELS,
  loadEntertainmentChannels,
  probeHlsStream,
  setCachedChannelHealth,
  SRI_LANKA_CURATED_CHANNELS,
  TARGET_CHANNEL_BADGE_TEXT,
  VERIFIED_SPOTLIGHT_CHANNELS,
  type CategoryFilter,
  type ChannelHealth,
  type EntertainmentCategory,
  type EntertainmentChannel,
} from '../services/entertainmentStreams';
import { FREE_LIMITS } from '../services/subscription';

const ENTERTAINMENT_CATEGORY_IDS: EntertainmentCategory[] = [
  'sri-lanka',
  'sports',
  'news',
  'movies',
  'animation',
  'kids',
  'music',
  'documentary',
  'entertainment',
  'comedy',
  'family',
  'lifestyle',
  'series',
];

type StreamStatus = 'connecting' | 'playing' | 'buffering' | 'paused' | 'error';

/** Virtual scroll geometry constants (keeps DOM under ~24 rows even for 25,000+ channels) */
const VIRTUAL_ROW_HEIGHT = 72;
const VIRTUAL_OVERSCAN = 6;

/** Non-blocking background stream verification constants */
const PROBE_CONCURRENCY = 5;
const PROBE_TIMEOUT_MS = 2600;
const PROBE_BATCH_PAUSE_MS = 160;
const MAX_AUTO_PROBES_PER_PASS = 260;

function CategoryIcon({
  category,
  className = 'h-4 w-4',
}: {
  category: CategoryFilter;
  className?: string;
}) {
  switch (category) {
    case 'all':
      return <Globe2 className={className} aria-hidden="true" />;
    case 'sri-lanka':
      return <MapPin className={className} aria-hidden="true" />;
    case 'animation':
      return <Sparkles className={className} aria-hidden="true" />;
    case 'movies':
      return <Film className={className} aria-hidden="true" />;
    case 'sports':
      return <Trophy className={className} aria-hidden="true" />;
    case 'news':
      return <Newspaper className={className} aria-hidden="true" />;
    case 'family':
      return <Heart className={className} aria-hidden="true" />;
    case 'music':
      return <Music className={className} aria-hidden="true" />;
    case 'comedy':
      return <Smile className={className} aria-hidden="true" />;
    case 'documentary':
      return <BookOpen className={className} aria-hidden="true" />;
    case 'lifestyle':
      return <Compass className={className} aria-hidden="true" />;
    case 'kids':
      return <Baby className={className} aria-hidden="true" />;
    case 'series':
      return <Layers className={className} aria-hidden="true" />;
    default:
      return <Clapperboard className={className} aria-hidden="true" />;
  }
}

const ChannelLogoBadge = React.memo(
  ({
    channel,
    isBroken,
    isSelected,
    onBroken,
    size = 'md',
  }: {
    channel: EntertainmentChannel;
    isBroken: boolean;
    isSelected: boolean;
    onBroken: (channelId: string) => void;
    size?: 'sm' | 'md';
  }) => {
    const showLogo = Boolean(channel.logo && !isBroken);
    const boxClass = size === 'sm' ? 'h-9 w-9 rounded-xl' : 'h-10 w-10 rounded-xl';
    const imgClass = size === 'sm' ? 'h-7 w-7 object-contain' : 'h-8 w-8 object-contain';

    return (
      <div
        className={`flex ${boxClass} shrink-0 items-center justify-center overflow-hidden border ${
          isSelected
            ? 'border-sky-400/55 bg-sky-500/15'
            : channel.category === 'sri-lanka'
              ? 'border-amber-400/30 bg-amber-500/10'
              : 'border-white/10 bg-slate-950/90'
        }`}
      >
        {showLogo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => onBroken(channel.id)}
            className={imgClass}
          />
        ) : (
          <CategoryIcon
            category={channel.category}
            className={`h-4 w-4 ${
              isSelected
                ? 'text-sky-300'
                : channel.category === 'sri-lanka'
                  ? 'text-amber-300'
                  : 'text-slate-400'
            }`}
          />
        )}
      </div>
    );
  }
);
ChannelLogoBadge.displayName = 'ChannelLogoBadge';

interface VirtualChannelListProps {
  channels: EntertainmentChannel[];
  selectedChannelId: string;
  channelHealth: Record<string, ChannelHealth>;
  brokenLogos: Record<string, boolean>;
  isChannelLocked: (channelId: string) => boolean;
  onSelectChannel: (channel: EntertainmentChannel) => void;
  onBrokenLogo: (channelId: string) => void;
  resetScrollKey: string;
}

/**
 * High-Performance Zero-Dependency Virtualized List
 * Only mounts ~18-24 visible channel rows in the DOM regardless of whether
 * `channels.length` is 50 or 25,000+, keeping scroll & filter at 60fps.
 */
const VirtualChannelList: React.FC<VirtualChannelListProps> = React.memo(
  ({
    channels,
    selectedChannelId,
    channelHealth,
    brokenLogos,
    isChannelLocked,
    onSelectChannel,
    onBrokenLogo,
    resetScrollKey,
  }) => {
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(580);

    // Measure scroll viewport height cleanly with ResizeObserver
    useEffect(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const updateHeight = () => {
        if (el.clientHeight > 0) {
          setViewportHeight(el.clientHeight);
        }
      };
      updateHeight();

      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(updateHeight);
        observer.observe(el);
        return () => observer.disconnect();
      }
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }, []);

    // Reset scroll position to top when category or search filter changes
    useEffect(() => {
      const el = scrollContainerRef.current;
      if (el) {
        el.scrollTop = 0;
      }
      setScrollTop(0);
    }, [resetScrollKey]);

    useEffect(() => {
      return () => {
        if (rafRef.current !== null) {
          window.cancelAnimationFrame(rafRef.current);
        }
      };
    }, []);

    const handleScroll = useCallback(() => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const el = scrollContainerRef.current;
        if (el) {
          setScrollTop(el.scrollTop);
        }
      });
    }, []);

    const totalCount = channels.length;
    const totalHeight = totalCount * VIRTUAL_ROW_HEIGHT;
    const startIndex = Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_OVERSCAN);
    const visibleCount = Math.ceil(viewportHeight / VIRTUAL_ROW_HEIGHT) + VIRTUAL_OVERSCAN * 2;
    const endIndex = Math.min(totalCount, startIndex + visibleCount);
    const offsetY = startIndex * VIRTUAL_ROW_HEIGHT;

    const visibleSlice = useMemo(
      () => channels.slice(startIndex, endIndex),
      [channels, startIndex, endIndex]
    );

    const showScrollTopBtn = scrollTop > VIRTUAL_ROW_HEIGHT * 10;

    return (
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-[520px] overflow-y-auto overscroll-contain xl:h-[650px]"
          role="list"
          aria-label="Virtualized live TV channel list"
        >
          <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
            <div
              style={{
                transform: `translate3d(0, ${offsetY}px, 0)`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
              }}
              className="divide-y divide-white/[0.05]"
            >
              {visibleSlice.map((ch) => {
                const isSelected = selectedChannelId === ch.id;
                const health = channelHealth[ch.id];
                const isUnavailable = health === 'offline';
                const isVerifiedLive = health === 'working' || Boolean(ch.preVerified);
                const locked = isChannelLocked(ch.id);

                return (
                  <button
                    key={ch.id}
                    type="button"
                    role="listitem"
                    onClick={() => onSelectChannel(ch)}
                    style={{ height: `${VIRTUAL_ROW_HEIGHT}px` }}
                    className={`flex w-full items-center gap-3 px-4 text-left transition-colors ${
                      isSelected
                        ? 'bg-sky-500/18 text-white'
                        : isUnavailable
                          ? 'bg-transparent text-slate-500 hover:bg-white/[0.03]'
                          : 'bg-transparent text-slate-200 hover:bg-white/[0.05]'
                    }`}
                  >
                    <ChannelLogoBadge
                      channel={ch}
                      isBroken={Boolean(brokenLogos[ch.id])}
                      isSelected={isSelected}
                      onBroken={onBrokenLogo}
                      size="md"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`truncate text-xs font-bold sm:text-[13px] ${
                            isUnavailable ? 'text-slate-500 line-through' : 'text-white'
                          }`}
                        >
                          {ch.name}
                        </p>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span
                          className={`truncate font-medium ${
                            ch.category === 'sri-lanka' ? 'text-amber-300/90' : 'text-slate-400'
                          }`}
                        >
                          {CATEGORY_LABELS[ch.category]}
                        </span>
                        {ch.resolution && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="shrink-0 tabular-nums">{ch.resolution}</span>
                          </>
                        )}
                        {isUnavailable ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-rose-400">
                              <XCircle className="h-3 w-3" aria-hidden="true" />
                              Unavailable
                            </span>
                          </>
                        ) : isVerifiedLive ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              {ch.officialEmbedUrl || (!ch.url && ch.officialWatchUrl)
                                ? 'Official'
                                : 'Live'}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {locked ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-fuchsia-300">
                        <Lock className="h-3 w-3 text-cyan-300" aria-hidden="true" />
                        <span>Pro</span>
                      </span>
                    ) : (
                      <span
                        className={`shrink-0 text-[11px] font-semibold ${
                          isSelected
                            ? 'text-sky-300'
                            : isUnavailable
                              ? 'text-slate-500'
                              : 'text-cyan-300'
                        }`}
                      >
                        {isSelected ? 'Playing' : 'Watch'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {showScrollTopBtn && (
          <button
            type="button"
            onClick={() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            aria-label="Scroll channel list back to top"
            className="absolute right-4 bottom-4 inline-flex h-9 items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-slate-950/92 px-3 text-xs font-semibold text-cyan-200 shadow-lg backdrop-blur-md transition-colors hover:bg-slate-900 hover:text-white"
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Top</span>
          </button>
        )}
      </div>
    );
  }
);
VirtualChannelList.displayName = 'VirtualChannelList';

interface EntertainmentLivePageProps {
  isProUser?: boolean;
  onRequireUpgrade?: (reason: string) => void;
}

export const EntertainmentLivePage: React.FC<EntertainmentLivePageProps> = React.memo(
  ({ isProUser = false, onRequireUpgrade }) => {
    const [channels, setChannels] = useState<EntertainmentChannel[]>(() => [
      ...INITIAL_SEED_CHANNELS,
    ]);
    const [isLoadingPlaylist, setIsLoadingPlaylist] = useState<boolean>(true);
    const [loadedPlaylistsCount, setLoadedPlaylistsCount] = useState<number>(0);
    const [totalPlaylistsCount, setTotalPlaylistsCount] = useState<number>(9);
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [hideOffline, setHideOffline] = useState<boolean>(false);
    const [liveOnly, setLiveOnly] = useState<boolean>(false);
    const [autoSkipEnabled, setAutoSkipEnabled] = useState<boolean>(true);

    const [selectedChannelId, setSelectedChannelId] = useState<string>(
      VERIFIED_SPOTLIGHT_CHANNELS[0]?.id || INITIAL_SEED_CHANNELS[0]?.id || ''
    );
    const [channelHealth, setChannelHealth] = useState<Record<string, ChannelHealth>>(() =>
      getCachedHealthSnapshot()
    );
    const [isScanningHealth, setIsScanningHealth] = useState<boolean>(false);
    const [probeTrigger, setProbeTrigger] = useState<number>(0);

    const [failedBanner, setFailedBanner] = useState<{
      failedName: string;
      nextName?: string;
      autoSkipping: boolean;
    } | null>(null);

    const [status, setStatus] = useState<StreamStatus>('connecting');
    const [unstableDetail, setUnstableDetail] = useState<string | null>(null);
    const [errorReason, setErrorReason] = useState<string | null>(null);
    const [retryNonce, setRetryNonce] = useState<number>(0);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [autoplayMutedNotice, setAutoplayMutedNotice] = useState<boolean>(false);
    const [volume, setVolume] = useState<number>(0.9);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [brokenLogos, setBrokenLogos] = useState<Record<string, boolean>>({});

    const playerFrameRef = useRef<HTMLDivElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const autoSkipTimerRef = useRef<number | null>(null);
    const consecutiveSkipsRef = useRef<number>(0);

    const isMutedRef = useRef<boolean>(isMuted);
    isMutedRef.current = isMuted;
    const volumeRef = useRef<number>(volume);
    volumeRef.current = volume;
    const autoSkipEnabledRef = useRef<boolean>(autoSkipEnabled);
    autoSkipEnabledRef.current = autoSkipEnabled;
    const channelHealthRef = useRef<Record<string, ChannelHealth>>(channelHealth);
    channelHealthRef.current = channelHealth;
    const activeCategoryRef = useRef<CategoryFilter>(activeCategory);
    activeCategoryRef.current = activeCategory;

    // Progressively fetch & aggregate all 9 public IPTV GitHub playlists (20,000+ live channels)
    const fetchPlaylists = useCallback(async (forceRefresh = false) => {
      setIsLoadingPlaylist(true);
      if (forceRefresh) {
        clearCachedChannelHealth();
        setChannelHealth(getCachedHealthSnapshot());
      }
      try {
        const result = await loadEntertainmentChannels(forceRefresh, (partial) => {
          setChannels(partial.channels);
          setLoadedPlaylistsCount(partial.loadedPlaylists);
          setTotalPlaylistsCount(partial.totalPlaylists);
        });
        setChannels(result.channels);
        setLoadedPlaylistsCount(result.loadedPlaylists);
        setTotalPlaylistsCount(result.totalPlaylists);
        setSelectedChannelId((current) => {
          if (current && result.channels.some((c) => c.id === current)) {
            return current;
          }
          return result.channels[0]?.id || '';
        });
        setProbeTrigger((n) => n + 1);
      } finally {
        setIsLoadingPlaylist(false);
      }
    }, []);

    useEffect(() => {
      void fetchPlaylists(false);
    }, [fetchPlaylists]);

    // Non-blocking background HLS stream health checker:
    // Prioritizes Sri Lanka, Spotlight, and active category first, then round-robins all categories.
    useEffect(() => {
      if (channels.length === 0) return;

      const abortController = new AbortController();
      let cancelled = false;

      const buildProbeQueue = (): EntertainmentChannel[] => {
        const health = channelHealthRef.current;
        const queuedIds = new Set<string>();
        const queue: EntertainmentChannel[] = [];

        const pushIfUntested = (ch: EntertainmentChannel) => {
          if (!ch.url || queuedIds.has(ch.id) || health[ch.id]) return;
          queuedIds.add(ch.id);
          queue.push(ch);
        };

        // 1. Prioritize Sri Lanka & Spotlight channels first
        for (const ch of channels) {
          if (ch.featured || ch.categories.includes('sri-lanka')) {
            pushIfUntested(ch);
          }
        }

        // 2. Prioritize currently selected category
        const currentCat = activeCategoryRef.current;
        if (currentCat !== 'all') {
          let catCount = 0;
          for (const ch of channels) {
            if (ch.categories.includes(currentCat)) {
              pushIfUntested(ch);
              catCount += 1;
              if (catCount >= 40) break;
            }
          }
        }

        // 3. Round-robin across all categories so every tab gets verified working streams at top
        const buckets: EntertainmentChannel[][] = CATEGORY_TABS.filter((t) => t.id !== 'all').map(
          (t) =>
            channels
              .filter(
                (ch) =>
                  Boolean(ch.url) &&
                  ch.categories.includes(t.id as EntertainmentCategory) &&
                  !queuedIds.has(ch.id) &&
                  !health[ch.id]
              )
              .slice(0, 22)
        );

        let depth = 0;
        while (queue.length < MAX_AUTO_PROBES_PER_PASS) {
          let addedAny = false;
          for (const bucket of buckets) {
            if (depth < bucket.length) {
              pushIfUntested(bucket[depth]);
              addedAny = true;
              if (queue.length >= MAX_AUTO_PROBES_PER_PASS) break;
            }
          }
          if (!addedAny) break;
          depth += 1;
        }

        return queue;
      };

      const runBackgroundProbes = async () => {
        const queue = buildProbeQueue();
        if (queue.length === 0) {
          setIsScanningHealth(false);
          return;
        }

        setIsScanningHealth(true);

        for (let i = 0; i < queue.length; i += PROBE_CONCURRENCY) {
          if (cancelled || abortController.signal.aborted) break;

          const batch = queue.slice(i, i + PROBE_CONCURRENCY);
          const batchResults = await Promise.all(
            batch.map(async (ch) => {
              if (channelHealthRef.current[ch.id]) {
                return null;
              }
              const res = await probeHlsStream(ch.url, PROBE_TIMEOUT_MS, abortController.signal);
              return { id: ch.id, status: res };
            })
          );

          if (cancelled || abortController.signal.aborted) break;

          const updates: Record<string, ChannelHealth> = {};
          let hasNewUpdate = false;
          for (const item of batchResults) {
            if (!item) continue;
            if (channelHealthRef.current[item.id] === 'working') continue;
            updates[item.id] = item.status;
            setCachedChannelHealth(item.id, item.status);
            hasNewUpdate = true;
          }

          if (hasNewUpdate) {
            setChannelHealth((prev) => ({ ...prev, ...updates }));
          }

          if (i + PROBE_CONCURRENCY < queue.length) {
            await new Promise<void>((resolve) => {
              const t = window.setTimeout(resolve, PROBE_BATCH_PAUSE_MS);
              abortController.signal.addEventListener(
                'abort',
                () => {
                  window.clearTimeout(t);
                  resolve();
                },
                { once: true }
              );
            });
          }
        }

        if (!cancelled) {
          setIsScanningHealth(false);
        }
      };

      const startDelay = window.setTimeout(() => {
        if (!cancelled) {
          void runBackgroundProbes();
        }
      }, 650);

      return () => {
        cancelled = true;
        window.clearTimeout(startDelay);
        abortController.abort();
      };
    }, [channels, activeCategory, probeTrigger]);

    const channelById = useMemo(() => {
      const map = new Map<string, EntertainmentChannel>();
      for (let i = 0; i < channels.length; i++) {
        map.set(channels[i].id, channels[i]);
      }
      return map;
    }, [channels]);

    const selectedChannel = useMemo(
      () => channelById.get(selectedChannelId) || channels[0] || null,
      [channelById, channels, selectedChannelId]
    );

    // Category totals computed in O(N) once per catalog update
    const categoryCounts = useMemo(() => {
      const counts: Record<CategoryFilter, number> = {
        all: channels.length,
        'sri-lanka': 0,
        sports: 0,
        news: 0,
        movies: 0,
        animation: 0,
        kids: 0,
        music: 0,
        documentary: 0,
        entertainment: 0,
        comedy: 0,
        family: 0,
        lifestyle: 0,
        series: 0,
      };

      for (let i = 0; i < channels.length; i++) {
        const cats = channels[i].categories;
        for (let j = 0; j < cats.length; j++) {
          counts[cats[j]] += 1;
        }
      }
      return counts;
    }, [channels]);

    // Verified-live counts per category in O(probed)
    const categoryLiveCounts = useMemo(() => {
      const liveCounts: Record<CategoryFilter, number> = {
        all: 0,
        'sri-lanka': 0,
        sports: 0,
        news: 0,
        movies: 0,
        animation: 0,
        kids: 0,
        music: 0,
        documentary: 0,
        entertainment: 0,
        comedy: 0,
        family: 0,
        lifestyle: 0,
        series: 0,
      };

      for (const [id, healthState] of Object.entries(channelHealth)) {
        if (healthState !== 'working') continue;
        const ch = channelById.get(id);
        if (!ch) continue;
        liveCounts.all += 1;
        const cats = ch.categories;
        for (let j = 0; j < cats.length; j++) {
          liveCounts[cats[j]] += 1;
        }
      }
      return liveCounts;
    }, [channelById, channelHealth]);

    // O(N) 3-bucket auto-sorting: Working/Live at top -> Untested middle -> Unavailable at very bottom
    const sortedFilteredChannels = useMemo(() => {
      const q = deferredSearchQuery.trim().toLowerCase();
      const working: EntertainmentChannel[] = [];
      const untested: EntertainmentChannel[] = [];
      const offline: EntertainmentChannel[] = [];

      for (let i = 0; i < channels.length; i++) {
        const ch = channels[i];
        if (activeCategory !== 'all' && !ch.categories.includes(activeCategory)) continue;
        const health = channelHealth[ch.id];
        const isWorking = health === 'working' || (ch.preVerified && health !== 'offline');
        const isOffline = health === 'offline';

        if (liveOnly && !isWorking) continue;
        if (hideOffline && isOffline) continue;
        if (q && !ch.searchText.includes(q)) continue;

        if (isWorking) {
          working.push(ch);
        } else if (isOffline) {
          offline.push(ch);
        } else {
          untested.push(ch);
        }
      }

      return working.concat(untested, offline);
    }, [channels, activeCategory, hideOffline, liveOnly, channelHealth, deferredSearchQuery]);

    // Independent 4-free-channels-per-category gating (preserving existing Freemium/Pro rules)
    const { freeIdsByCategory, allFreeIdsAcrossCategories } = useMemo(() => {
      const byCat = {} as Record<EntertainmentCategory, Set<string>>;
      const union = new Set<string>();

      for (const cat of ENTERTAINMENT_CATEGORY_IDS) {
        const working: string[] = [];
        const untested: string[] = [];
        const offline: string[] = [];

        for (let i = 0; i < channels.length; i++) {
          const ch = channels[i];
          if (!ch.categories.includes(cat)) continue;
          const health = channelHealth[ch.id];
          if (health === 'working' || (ch.preVerified && health !== 'offline')) working.push(ch.id);
          else if (health === 'offline') offline.push(ch.id);
          else untested.push(ch.id);
        }

        const ordered = working.concat(untested, offline);
        const topIds = ordered.slice(0, FREE_LIMITS.CATEGORY_ITEMS);
        byCat[cat] = new Set(topIds);
        for (const id of topIds) union.add(id);
      }

      return { freeIdsByCategory: byCat, allFreeIdsAcrossCategories: union };
    }, [channels, channelHealth]);

    const isChannelLocked = useCallback(
      (channelId: string) => {
        if (isProUser) return false;
        if (activeCategory !== 'all') {
          return !freeIdsByCategory[activeCategory]?.has(channelId);
        }
        return !allFreeIdsAcrossCategories.has(channelId);
      },
      [isProUser, activeCategory, freeIdsByCategory, allFreeIdsAcrossCategories]
    );

    // If a Pro user downgrades to Free while watching a locked channel, switch to an unlocked channel
    const prevIsProRef = useRef<boolean>(isProUser);
    useEffect(() => {
      const downgraded = prevIsProRef.current && !isProUser;
      prevIsProRef.current = isProUser;
      if (!downgraded) return;
      if (selectedChannelId && !allFreeIdsAcrossCategories.has(selectedChannelId)) {
        const firstUnlocked =
          channels.find((ch) => allFreeIdsAcrossCategories.has(ch.id)) || channels[0];
        if (firstUnlocked) {
          setSelectedChannelId(firstUnlocked.id);
          setStatus('connecting');
        }
      }
    }, [isProUser, selectedChannelId, allFreeIdsAcrossCategories, channels]);

    // Quick-switch spotlight cards below the player (shows verified Sri Lanka channels when SL tab is active, otherwise verified working streams)
    const quickSwitchChannels = useMemo(() => {
      if (activeCategory === 'sri-lanka') {
        return sortedFilteredChannels.slice(0, 8);
      }
      const verified = sortedFilteredChannels.filter(
        (c) => (channelHealth[c.id] === 'working' || c.preVerified) && channelHealth[c.id] !== 'offline'
      );
      if (verified.length >= 8) return verified.slice(0, 8);
      const seen = new Set(verified.map((c) => c.id));
      const merged = [...verified];
      for (const spot of INITIAL_SEED_CHANNELS) {
        if (!seen.has(spot.id) && channelHealth[spot.id] !== 'offline') {
          seen.add(spot.id);
          merged.push(spot);
        }
        if (merged.length >= 8) break;
      }
      return merged.slice(0, 8);
    }, [activeCategory, sortedFilteredChannels, channelHealth]);

    const markLogoBroken = useCallback((channelId: string) => {
      setBrokenLogos((prev) => (prev[channelId] ? prev : { ...prev, [channelId]: true }));
    }, []);

    // Find next working channel (respecting Free 4-per-category limits)
    const findNextWorkingChannel = useCallback(
      (
        excludeId: string,
        healthSnapshot: Record<string, ChannelHealth>
      ): EntertainmentChannel | null => {
        const basePool = sortedFilteredChannels.length > 1 ? sortedFilteredChannels : channels;
        const pool = isProUser ? basePool : basePool.filter((c) => !isChannelLocked(c.id));
        const fallbackPool = isProUser
          ? channels
          : channels.filter((c) => allFreeIdsAcrossCategories.has(c.id));

        if (pool.length === 0 && fallbackPool.length === 0) return null;
        const currentIdx = pool.findIndex((c) => c.id === excludeId);
        const startIdx = currentIdx >= 0 ? currentIdx + 1 : 0;

        // 1st pass: verified working HLS channels in current view
        for (let offset = 0; offset < pool.length; offset++) {
          const candidate = pool[(startIdx + offset) % pool.length];
          if (
            candidate.id !== excludeId &&
            Boolean(candidate.url) &&
            healthSnapshot[candidate.id] === 'working'
          ) {
            return candidate;
          }
        }
        // 2nd pass: verified working channels across eligible catalog
        for (const candidate of fallbackPool) {
          if (
            candidate.id !== excludeId &&
            Boolean(candidate.url) &&
            healthSnapshot[candidate.id] === 'working'
          ) {
            return candidate;
          }
        }
        // 3rd pass: untested channels in current view
        for (let offset = 0; offset < pool.length; offset++) {
          const candidate = pool[(startIdx + offset) % pool.length];
          if (
            candidate.id !== excludeId &&
            Boolean(candidate.url) &&
            healthSnapshot[candidate.id] !== 'offline'
          ) {
            return candidate;
          }
        }
        return null;
      },
      [channels, sortedFilteredChannels, isProUser, isChannelLocked, allFreeIdsAcrossCategories]
    );

    const selectChannel = useCallback(
      (channel: EntertainmentChannel, isManual = true) => {
        if (autoSkipTimerRef.current) {
          window.clearTimeout(autoSkipTimerRef.current);
          autoSkipTimerRef.current = null;
        }
        if (isManual) {
          consecutiveSkipsRef.current = 0;
          setFailedBanner(null);
        }
        if (isChannelLocked(channel.id)) {
          if (isManual) {
            onRequireUpgrade?.(
              `Unlock "${channel.name}" and all 20,000+ live entertainment channels with Neon Pro (Free plan includes the first ${FREE_LIMITS.CATEGORY_ITEMS} channels per category).`
            );
          }
          return;
        }
        setErrorReason(null);
        setUnstableDetail(null);
        setSelectedChannelId((prevId) => {
          if (prevId === channel.id) {
            setStatus('connecting');
            setRetryNonce((n) => n + 1);
          } else {
            setStatus(channel.url ? 'connecting' : 'playing');
          }
          return channel.id;
        });
      },
      [isChannelLocked, onRequireUpgrade]
    );

    const handleVirtualRowSelect = useCallback(
      (channel: EntertainmentChannel) => {
        selectChannel(channel, true);
      },
      [selectChannel]
    );

    const handleNextWorkingChannel = useCallback(() => {
      if (!selectedChannel) return;
      const next = findNextWorkingChannel(selectedChannel.id, channelHealth);
      if (next) {
        selectChannel(next, true);
      }
    }, [selectedChannel, findNextWorkingChannel, channelHealth, selectChannel]);

    const attemptVideoPlayback = useCallback(async (video: HTMLVideoElement) => {
      try {
        video.volume = volumeRef.current;
        video.muted = isMutedRef.current;
        await video.play();
        setAutoplayMutedNotice(false);
      } catch (err) {
        const isNotAllowed =
          err instanceof DOMException &&
          (err.name === 'NotAllowedError' || err.name === 'AbortError');
        if (isNotAllowed && !video.muted) {
          try {
            video.muted = true;
            setIsMuted(true);
            setAutoplayMutedNotice(true);
            await video.play();
          } catch {
            setStatus('paused');
          }
        } else {
          setStatus('paused');
        }
      }
    }, []);

    // Keep latest callbacks in refs so background probe sorting NEVER restarts active HLS playback
    const findNextWorkingChannelRef = useRef(findNextWorkingChannel);
    findNextWorkingChannelRef.current = findNextWorkingChannel;
    const selectChannelRef = useRef(selectChannel);
    selectChannelRef.current = selectChannel;
    const attemptVideoPlaybackRef = useRef(attemptVideoPlayback);
    attemptVideoPlaybackRef.current = attemptVideoPlayback;
    const selectedChannelNameRef = useRef<string>(selectedChannel?.name || '');
    selectedChannelNameRef.current = selectedChannel?.name || '';

    const activeChannelId = selectedChannel?.id || '';
    const activeChannelUrl = selectedChannel?.url || '';
    const isEmbedMode = Boolean(!activeChannelUrl && selectedChannel?.officialEmbedUrl);
    const isOfficialPortalMode = Boolean(
      !activeChannelUrl && !selectedChannel?.officialEmbedUrl && selectedChannel?.officialWatchUrl
    );

    // Stable HLS.js Player Effect — keyed ONLY on activeChannelId, activeChannelUrl, retryNonce
    useEffect(() => {
      if (!activeChannelId || !activeChannelUrl) {
        if (hlsRef.current) {
          try {
            hlsRef.current.destroy();
          } catch {
            // Ignore cleanup error
          }
          hlsRef.current = null;
        }
        if (isEmbedMode || isOfficialPortalMode) {
          setStatus('playing');
          setErrorReason(null);
          setUnstableDetail(null);
        }
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      let cancelled = false;
      let failureFinalized = false;
      let hasStartedPlayback = false;
      let lastProgressTime = 0;

      let mediaRecoveryAttempts = 0;
      let lastMediaRecoveryAt = 0;
      let networkRecoveryAttempts = 0;
      let stallRecoveryUsed = false;

      let connectTimeout: number | null = null;
      let stabilityTimer: number | null = null;
      let stallTimer: number | null = null;
      let networkRetryTimer: number | null = null;

      const STABILITY_CHECK_MS = 2600;
      const INITIAL_CONNECT_TIMEOUT_MS = 12000;
      const STALL_GRACE_MS = 4500;

      setStatus('connecting');
      setUnstableDetail(null);
      setErrorReason(null);

      if (autoSkipTimerRef.current) {
        window.clearTimeout(autoSkipTimerRef.current);
        autoSkipTimerRef.current = null;
      }

      const clearAllTimers = () => {
        if (connectTimeout !== null) {
          window.clearTimeout(connectTimeout);
          connectTimeout = null;
        }
        if (stabilityTimer !== null) {
          window.clearTimeout(stabilityTimer);
          stabilityTimer = null;
        }
        if (stallTimer !== null) {
          window.clearTimeout(stallTimer);
          stallTimer = null;
        }
        if (networkRetryTimer !== null) {
          window.clearTimeout(networkRetryTimer);
          networkRetryTimer = null;
        }
      };

      const finalizeStreamFailure = (reason: string) => {
        if (cancelled || failureFinalized) return;
        failureFinalized = true;
        clearAllTimers();

        if (hlsRef.current) {
          try {
            hlsRef.current.destroy();
          } catch {
            // Ignore cleanup errors
          }
          hlsRef.current = null;
        }

        setStatus('error');
        setUnstableDetail(null);
        setErrorReason(reason);
        setCachedChannelHealth(activeChannelId, 'offline');

        const channelName = selectedChannelNameRef.current || 'Channel';
        setChannelHealth((prev) => {
          const updated: Record<string, ChannelHealth> = {
            ...prev,
            [activeChannelId]: 'offline',
          };

          const nextCandidate = findNextWorkingChannelRef.current(activeChannelId, updated);
          const shouldAutoSkip =
            autoSkipEnabledRef.current &&
            Boolean(nextCandidate) &&
            consecutiveSkipsRef.current < 4;

          setFailedBanner({
            failedName: channelName,
            nextName: nextCandidate?.name,
            autoSkipping: shouldAutoSkip,
          });

          if (shouldAutoSkip && nextCandidate) {
            consecutiveSkipsRef.current += 1;
            autoSkipTimerRef.current = window.setTimeout(() => {
              if (!cancelled) {
                selectChannelRef.current(nextCandidate, false);
              }
            }, 1800);
          }

          return updated;
        });
      };

      const beginStabilityCheck = (detail: string, finalReason: string) => {
        if (cancelled || failureFinalized) return;
        setStatus('buffering');
        setUnstableDetail(detail);

        if (stabilityTimer !== null) return;
        stabilityTimer = window.setTimeout(() => {
          stabilityTimer = null;
          if (cancelled || failureFinalized) return;
          finalizeStreamFailure(finalReason);
        }, STABILITY_CHECK_MS);
      };

      const markStreamHealthy = () => {
        if (cancelled || failureFinalized) return;
        if (connectTimeout !== null) {
          window.clearTimeout(connectTimeout);
          connectTimeout = null;
        }
        if (stabilityTimer !== null) {
          window.clearTimeout(stabilityTimer);
          stabilityTimer = null;
        }
        if (stallTimer !== null) {
          window.clearTimeout(stallTimer);
          stallTimer = null;
        }
        hasStartedPlayback = true;
        stallRecoveryUsed = false;
        consecutiveSkipsRef.current = 0;
        setStatus('playing');
        setUnstableDetail(null);
        setErrorReason(null);
        setFailedBanner(null);
        setCachedChannelHealth(activeChannelId, 'working');
        setChannelHealth((prev) =>
          prev[activeChannelId] === 'working' ? prev : { ...prev, [activeChannelId]: 'working' }
        );
      };

      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {
          // Ignore cleanup errors
        }
        hlsRef.current = null;
      }

      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch {
        // Ignore
      }

      connectTimeout = window.setTimeout(() => {
        connectTimeout = null;
        if (!cancelled && !failureFinalized && !hasStartedPlayback && video.readyState < 2) {
          beginStabilityCheck(
            'Stream slow to respond — checking stability…',
            'This live stream timed out, is unavailable, or blocked by broadcaster CORS.'
          );
        }
      }, INITIAL_CONNECT_TIMEOUT_MS);

      const onPlaying = () => {
        if (cancelled || failureFinalized) return;
        lastProgressTime = video.currentTime;
        markStreamHealthy();
      };

      const onTimeUpdate = () => {
        if (cancelled || failureFinalized || video.paused) return;
        if (Math.abs(video.currentTime - lastProgressTime) >= 0.18) {
          lastProgressTime = video.currentTime;
          markStreamHealthy();
        }
      };

      const onPause = () => {
        if (cancelled || failureFinalized) return;
        if (stallTimer !== null) {
          window.clearTimeout(stallTimer);
          stallTimer = null;
        }
        setStatus((prev) => (prev === 'error' ? prev : 'paused'));
      };

      const onWaitingOrStalled = () => {
        if (cancelled || failureFinalized || video.paused) return;
        if (!hasStartedPlayback) {
          setStatus((prev) => (prev === 'error' ? prev : 'connecting'));
          return;
        }

        setStatus('buffering');
        setUnstableDetail('Buffering / Stream unstable — holding buffer…');

        if (stallTimer !== null) return;
        stallTimer = window.setTimeout(() => {
          stallTimer = null;
          if (cancelled || failureFinalized || video.paused) return;

          if (!stallRecoveryUsed && hlsRef.current) {
            stallRecoveryUsed = true;
            setUnstableDetail('Buffering / Stream unstable — recovering feed…');
            try {
              hlsRef.current.startLoad();
            } catch {
              // Fall through
            }
            stallTimer = window.setTimeout(() => {
              stallTimer = null;
              if (!cancelled && !failureFinalized && !video.paused) {
                beginStabilityCheck(
                  'Stream remained stalled — verifying connection…',
                  'This broadcast stream stalled continuously and could not recover.'
                );
              }
            }, STALL_GRACE_MS);
            return;
          }

          beginStabilityCheck(
            'Stream unstable — checking if playback resumes…',
            'This broadcast stream stalled continuously and could not recover.'
          );
        }, STALL_GRACE_MS);
      };

      const onVideoError = () => {
        if (cancelled || failureFinalized) return;
        beginStabilityCheck(
          'Playback interrupted — checking stream stability…',
          'Stream could not be decoded or is currently unavailable on this network.'
        );
      };

      video.addEventListener('playing', onPlaying);
      video.addEventListener('timeupdate', onTimeUpdate);
      video.addEventListener('pause', onPause);
      video.addEventListener('waiting', onWaitingOrStalled);
      video.addEventListener('stalled', onWaitingOrStalled);
      video.addEventListener('error', onVideoError);

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 60,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.8,
          liveSyncDurationCount: 4,
          liveMaxLatencyDurationCount: 10,
          nudgeOffset: 0.2,
          nudgeMaxRetry: 5,
          startLevel: -1,
          manifestLoadingTimeOut: 12000,
          manifestLoadingMaxRetry: 3,
          manifestLoadingRetryDelay: 1000,
          levelLoadingTimeOut: 12000,
          levelLoadingMaxRetry: 3,
          levelLoadingRetryDelay: 1000,
          fragLoadingTimeOut: 15000,
          fragLoadingMaxRetry: 4,
          fragLoadingRetryDelay: 1000,
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (cancelled || failureFinalized) return;
          void attemptVideoPlaybackRef.current(video);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (cancelled || failureFinalized) return;

          if (!data.fatal) {
            if (
              data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
              data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR ||
              data.details === Hls.ErrorDetails.FRAG_LOAD_TIMEOUT
            ) {
              if (hasStartedPlayback) {
                setStatus('buffering');
                setUnstableDetail('Buffering / Stream unstable — smoothing playback…');
              }
            }
            return;
          }

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            const nowMs = Date.now();
            if (mediaRecoveryAttempts < 2 && nowMs - lastMediaRecoveryAt >= 4000) {
              mediaRecoveryAttempts += 1;
              lastMediaRecoveryAt = nowMs;
              setStatus('buffering');
              setUnstableDetail('Buffering / Stream unstable — recovering media decoder…');
              try {
                if (mediaRecoveryAttempts === 2) {
                  hls.swapAudioCodec();
                }
                hls.recoverMediaError();
                return;
              } catch {
                // Fall through
              }
            }

            beginStabilityCheck(
              'Media decoder unstable — checking recovery…',
              'Channel media stream encountered repeated decoding errors.'
            );
            return;
          }

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            const httpStatus = data.response?.code;
            const isHardBlocked = httpStatus === 403 || httpStatus === 404 || httpStatus === 410;

            if (!isHardBlocked && networkRecoveryAttempts < 2) {
              networkRecoveryAttempts += 1;
              setStatus('buffering');
              setUnstableDetail(
                `Buffering / Stream unstable — reconnecting (${networkRecoveryAttempts}/2)…`
              );
              if (networkRetryTimer !== null) {
                window.clearTimeout(networkRetryTimer);
              }
              networkRetryTimer = window.setTimeout(() => {
                networkRetryTimer = null;
                if (cancelled || failureFinalized || !hlsRef.current) return;
                try {
                  hlsRef.current.startLoad();
                } catch {
                  beginStabilityCheck(
                    'Network connection unstable — verifying stream…',
                    'Channel stream is unavailable or restricted by broadcaster CORS headers.'
                  );
                }
              }, 1400);
              return;
            }

            beginStabilityCheck(
              'Stream connection lost — verifying availability…',
              'Channel stream is currently unavailable or restricted by broadcaster CORS headers.'
            );
            return;
          }

          beginStabilityCheck(
            'Stream unstable — checking if feed recovers…',
            'Channel stream is currently unavailable on this network.'
          );
        });

        hls.loadSource(activeChannelUrl);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = activeChannelUrl;
        const onLoadedMeta = () => {
          if (cancelled || failureFinalized) return;
          void attemptVideoPlaybackRef.current(video);
        };
        video.addEventListener('loadedmetadata', onLoadedMeta, { once: true });
      } else {
        clearAllTimers();
        setStatus('error');
        setErrorReason('Your browser does not support HLS live video playback.');
      }

      return () => {
        cancelled = true;
        clearAllTimers();
        if (autoSkipTimerRef.current) {
          window.clearTimeout(autoSkipTimerRef.current);
          autoSkipTimerRef.current = null;
        }
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('pause', onPause);
        video.removeEventListener('waiting', onWaitingOrStalled);
        video.removeEventListener('stalled', onWaitingOrStalled);
        video.removeEventListener('error', onVideoError);

        if (hlsRef.current) {
          try {
            hlsRef.current.destroy();
          } catch {
            // Ignore
          }
          hlsRef.current = null;
        }

        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {
          // Ignore
        }
      };
    }, [activeChannelId, activeChannelUrl, retryNonce, isEmbedMode, isOfficialPortalMode]);

    useEffect(() => {
      const onFsChange = () => {
        setIsFullscreen(Boolean(document.fullscreenElement));
      };
      document.addEventListener('fullscreenchange', onFsChange);
      return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    const handleTogglePlay = async () => {
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) {
        try {
          await video.play();
          setStatus('playing');
        } catch {
          video.muted = true;
          setIsMuted(true);
          setAutoplayMutedNotice(true);
          try {
            await video.play();
            setStatus('playing');
          } catch {
            setStatus('paused');
          }
        }
      } else {
        video.pause();
        setStatus('paused');
      }
    };

    const handleToggleMute = () => {
      const video = videoRef.current;
      if (!video) return;
      const nextMuted = !isMuted;
      video.muted = nextMuted;
      setIsMuted(nextMuted);
      if (!nextMuted) {
        setAutoplayMutedNotice(false);
        if (video.volume === 0) {
          video.volume = 0.85;
          setVolume(0.85);
        }
      }
    };

    const handleVolumeChange = (nextVol: number) => {
      setVolume(nextVol);
      const video = videoRef.current;
      if (!video) return;
      video.volume = nextVol;
      if (nextVol > 0 && isMuted) {
        video.muted = false;
        setIsMuted(false);
        setAutoplayMutedNotice(false);
      } else if (nextVol === 0 && !isMuted) {
        video.muted = true;
        setIsMuted(true);
      }
    };

    const handleToggleFullscreen = async () => {
      const target = playerFrameRef.current || videoRef.current;
      if (!target) return;
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else if (target.requestFullscreen) {
          await target.requestFullscreen();
        }
      } catch {
        // Ignore unsupported fullscreen contexts
      }
    };

    const handleRetryCurrent = () => {
      if (!selectedChannel) return;
      consecutiveSkipsRef.current = 0;
      setFailedBanner(null);
      setUnstableDetail(null);
      setErrorReason(null);
      setStatus('connecting');
      clearCachedChannelHealth(selectedChannel.id);
      setChannelHealth((prev) => {
        const next = { ...prev };
        delete next[selectedChannel.id];
        return next;
      });
      setRetryNonce((n) => n + 1);
    };

    const offlineCount = useMemo(
      () => Object.values(channelHealth).filter((s) => s === 'offline').length,
      [channelHealth]
    );

    const workingCount = useMemo(
      () => Object.values(channelHealth).filter((s) => s === 'working').length,
      [channelHealth]
    );

    const checkedCount = workingCount + offlineCount;
    const resetScrollKey = `${activeCategory}|${deferredSearchQuery}|${hideOffline}|${liveOnly}`;

    return (
      <div className="space-y-5">
        {/* 1. Entertainment Live Top Header Strip — Immediately displays "20,000+ LIVE CHANNELS" */}
        <section className="flex flex-col justify-between gap-4 rounded-3xl border border-fuchsia-400/25 bg-[#071022]/90 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="inline-flex items-center rounded-lg border border-cyan-400/45 bg-cyan-500/15 px-2.5 py-1 font-mono text-[11px] font-extrabold tracking-wider text-cyan-200 tabular-nums shadow-[0_0_20px_-6px_rgba(34,211,238,0.65)]">
                {TARGET_CHANNEL_BADGE_TEXT}
              </span>
              <span className="font-semibold text-fuchsia-300">Entertainment Live TV</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="tabular-nums text-emerald-300">
                {workingCount.toLocaleString()} Working Live
              </span>
              {channels.length > INITIAL_SEED_CHANNELS.length && (
                <>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="tabular-nums text-slate-400">
                    {channels.length.toLocaleString()} indexed
                  </span>
                </>
              )}
              {isScanningHealth && (
                <>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="tabular-nums text-amber-300">
                    Verifying ({checkedCount})
                  </span>
                </>
              )}
            </div>

            <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-white sm:text-2xl [text-wrap:balance]">
              {selectedChannel ? selectedChannel.name : 'Entertainment Live Broadcast'}
            </h1>

            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400 sm:text-sm">
              {selectedChannel ? (
                <>
                  <span
                    className={
                      selectedChannel.category === 'sri-lanka'
                        ? 'font-semibold text-amber-300'
                        : 'text-slate-300'
                    }
                  >
                    {selectedChannel.categories
                      .slice(0, 3)
                      .map((c) => CATEGORY_LABELS[c])
                      .join(' / ')}
                  </span>
                  {selectedChannel.resolution && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{selectedChannel.resolution}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>{selectedChannel.sourceLabel}</span>
                </>
              ) : (
                <span>Global &amp; Sri Lanka live broadcasts ready</span>
              )}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory('sri-lanka')}
              className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition-colors whitespace-nowrap ${
                activeCategory === 'sri-lanka'
                  ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                  : 'border-amber-400/35 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
              }`}
            >
              <MapPin className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              <span>Sri Lanka ({categoryCounts['sri-lanka']})</span>
            </button>

            <button
              type="button"
              onClick={handleNextWorkingChannel}
              disabled={channels.length <= 1}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-500 px-4 text-xs font-bold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-50 whitespace-nowrap"
            >
              <SkipForward className="h-4 w-4" aria-hidden="true" />
              <span>Next Working</span>
            </button>

            <button
              type="button"
              onClick={() => void fetchPlaylists(true)}
              disabled={isLoadingPlaylist}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/14 bg-white/[0.06] px-3.5 text-xs font-semibold text-slate-100 transition-colors hover:border-sky-400/40 hover:bg-white/[0.12] hover:text-white disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-cyan-300 ${isLoadingPlaylist ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Refresh</span>
            </button>
          </div>
        </section>

        {/* Mobile / Tablet Compact Category Rail (Hidden on xl+ where Left Sidebar renders) */}
        <section aria-label="Broadcast categories mobile" className="xl:hidden">
          <div
            role="tablist"
            aria-label="Filter live channels by category"
            className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1"
          >
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeCategory === tab.id;
              const totalInTab = categoryCounts[tab.id];
              const isSl = tab.id === 'sri-lanka';
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    isActive
                      ? isSl
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-sky-500 text-slate-950 shadow-[0_0_18px_-6px_rgba(56,189,248,0.8)]'
                      : isSl
                        ? 'border border-amber-400/35 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                        : 'border border-white/10 bg-[#071022]/85 text-slate-200 hover:border-sky-400/45 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <CategoryIcon
                    category={tab.id}
                    className={`h-3.5 w-3.5 ${
                      isActive ? 'text-slate-950' : isSl ? 'text-amber-300' : 'text-cyan-300'
                    }`}
                  />
                  <span>{tab.label}</span>
                  <span
                    className={`tabular-nums text-[11px] font-medium ${
                      isActive ? 'text-slate-900/80' : 'text-slate-400'
                    }`}
                  >
                    {tab.id === 'all' && channels.length < 20000
                      ? '20,000+'
                      : totalInTab.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Primary 3-Zone Workspace: [Category Sidebar] + [Live Player & Spotlight] + [Virtualized 20,000+ Directory] */}
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[224px_minmax(0,1fr)_395px]">
          {/* Left: Sleek Category Filter Sidebar (Desktop xl+) */}
          <aside
            aria-label="Category filter sidebar"
            className="hidden flex-col overflow-hidden rounded-3xl border border-white/[0.1] bg-[#071022]/90 xl:flex"
          >
            <div className="border-b border-white/[0.08] px-4 py-3.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Categories
              </h2>
              <p className="mt-0.5 tabular-nums text-[11px] text-slate-400">
                {loadedPlaylistsCount > 0
                  ? `${loadedPlaylistsCount}/${totalPlaylistsCount} global IPTV feeds`
                  : 'Syncing 9 IPTV networks…'}
              </p>
            </div>

            <nav
              aria-label="Channel categories"
              className="flex-1 space-y-1 overflow-y-auto p-2.5"
            >
              {CATEGORY_TABS.map((tab) => {
                const isActive = activeCategory === tab.id;
                const count = categoryCounts[tab.id];
                const liveCount = categoryLiveCounts[tab.id];
                const isSl = tab.id === 'sri-lanka';
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      isActive
                        ? isSl
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-sky-500 text-slate-950 shadow-[0_0_20px_-8px_rgba(56,189,248,0.85)]'
                        : isSl
                          ? 'border border-amber-400/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                          : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <CategoryIcon
                        category={tab.id}
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isActive ? 'text-slate-950' : isSl ? 'text-amber-300' : 'text-cyan-300'
                        }`}
                      />
                      <span className="truncate">{tab.label}</span>
                    </span>
                    <span
                      className={`shrink-0 tabular-nums text-[11px] ${
                        isActive
                          ? 'font-bold text-slate-950/85'
                          : liveCount > 0
                            ? 'text-emerald-300'
                            : 'text-slate-500'
                      }`}
                    >
                      {tab.id === 'all' && channels.length < 20000
                        ? '20k+'
                        : count.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="space-y-2 border-t border-white/[0.08] p-3">
              <button
                type="button"
                onClick={() => setLiveOnly((v) => !v)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors ${
                  liveOnly
                    ? 'border-emerald-400/50 bg-emerald-500/18 text-emerald-200'
                    : 'border-white/10 bg-slate-900/70 text-slate-300 hover:border-emerald-400/35 hover:text-white'
                }`}
              >
                <span>Working Live Only</span>
                <span className="tabular-nums">{workingCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setHideOffline((v) => !v)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors ${
                  hideOffline
                    ? 'border-cyan-400/50 bg-cyan-500/18 text-cyan-200'
                    : 'border-white/10 bg-slate-900/70 text-slate-300 hover:border-cyan-400/35 hover:text-white'
                }`}
              >
                <span>Hide Unavailable</span>
                <span className="tabular-nums">{offlineCount}</span>
              </button>
            </div>
          </aside>

          {/* Center: Live HLS / Official Broadcast 16:9 Player + Spotlight Grid */}
          <div className="min-w-0 space-y-4">
            <section
              aria-label="Live HLS video player"
              ref={playerFrameRef}
              className="overflow-hidden rounded-3xl border border-sky-400/35 bg-[#040814] shadow-[0_24px_64px_-22px_rgba(14,165,233,0.4)]"
            >
              <div className="relative aspect-video w-full bg-black">
                {isEmbedMode && selectedChannel?.officialEmbedUrl ? (
                  <iframe
                    key={selectedChannel.id}
                    src={selectedChannel.officialEmbedUrl}
                    title={`${selectedChannel.name} Official Live Stream`}
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-full w-full border-0 bg-black"
                  />
                ) : isOfficialPortalMode && selectedChannel?.officialWatchUrl ? (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#08132a] via-[#050c1d] to-[#040814] p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/15 text-amber-300">
                      <Tv className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h2 className="mt-3 text-lg font-bold text-white sm:text-xl">
                      {selectedChannel.name} · Official Sri Lanka Broadcast
                    </h2>
                    <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-300 sm:text-sm">
                      This Sri Lankan network streams directly through its official broadcaster portal.
                      Launch the official live feed below or switch to an instant in-app Sri Lanka HLS feed.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                      <a
                        href={selectedChannel.officialWatchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-extrabold text-slate-950 transition-colors hover:bg-amber-300"
                      >
                        <span>Watch {selectedChannel.name} Live</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          const directSl = SRI_LANKA_CURATED_CHANNELS.find((c) => Boolean(c.url));
                          if (directSl) selectChannel(directSl, true);
                        }}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-4 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/[0.14]"
                      >
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Play Rupavahini / Hiru In-App</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      controls={false}
                      onClick={handleTogglePlay}
                      className="h-full w-full cursor-pointer bg-black object-contain"
                    />

                    {/* Top HUD Scrim Overlay */}
                    <div className="pointer-events-none absolute top-3 right-3 left-3 flex items-start justify-between gap-2 sm:top-4 sm:right-4 sm:left-4">
                      {selectedChannel && (
                        <div className="inline-flex max-w-[74%] items-center gap-2 rounded-xl border border-white/15 bg-[#050a18]/85 px-3 py-1.5 text-xs text-white backdrop-blur-md">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              status === 'playing'
                                ? 'bg-emerald-400'
                                : status === 'connecting' || status === 'buffering'
                                  ? 'animate-pulse bg-amber-400'
                                  : status === 'error'
                                    ? 'bg-rose-500'
                                    : 'bg-slate-400'
                            }`}
                            aria-hidden="true"
                          />
                          <span className="truncate font-semibold">{selectedChannel.name}</span>
                          <span className="hidden text-[11px] text-fuchsia-300 sm:inline">
                            {status === 'buffering'
                              ? '· Buffering / Stream unstable'
                              : `· ${CATEGORY_LABELS[selectedChannel.category]}`}
                          </span>
                        </div>
                      )}

                      {autoplayMutedNotice && (status === 'playing' || status === 'buffering') && (
                        <button
                          type="button"
                          onClick={handleToggleMute}
                          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/95 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-lg transition-colors hover:bg-amber-400 whitespace-nowrap"
                        >
                          <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Tap to Unmute</span>
                        </button>
                      )}
                    </div>

                    {/* Connecting State */}
                    {status === 'connecting' && selectedChannel && (
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[#040814]/75 px-4 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-300">
                          <Radio className="h-7 w-7 animate-pulse" aria-hidden="true" />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-white">
                          Tuning into {selectedChannel.name}…
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Connecting to live HLS broadcast
                        </p>
                      </div>
                    )}

                    {/* Non-Blocking Buffering / Stream Unstable Banner */}
                    {status === 'buffering' && selectedChannel && (
                      <div className="absolute right-3 bottom-3 left-3 z-10 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-amber-400/40 bg-[#050a18]/92 px-4 py-3 text-xs text-slate-100 shadow-xl backdrop-blur-md">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <RefreshCw
                            className="h-4 w-4 shrink-0 animate-spin text-amber-400"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-amber-200">
                              Buffering / Stream unstable
                            </p>
                            <p className="truncate text-[11px] text-slate-300">
                              {unstableDetail || 'Holding buffer and checking stream stability…'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleNextWorkingChannel}
                          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-sky-500 px-3 text-xs font-bold text-slate-950 transition-colors hover:bg-sky-400 whitespace-nowrap"
                        >
                          <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Next Channel</span>
                        </button>
                      </div>
                    )}

                    {/* Unavailable / CORS-Blocked Auto-Skip Overlay */}
                    {status === 'error' && selectedChannel && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#071126] via-[#050b19] to-[#040814] p-6 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-400/35 bg-rose-500/15 text-rose-300">
                          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <h2 className="mt-3 text-lg font-bold text-white">
                          {selectedChannel.name} is Unavailable
                        </h2>
                        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-300 sm:text-sm">
                          {errorReason ||
                            'This public stream failed to load or is blocked by broadcaster CORS.'}
                        </p>

                        {failedBanner?.autoSkipping && failedBanner.nextName && (
                          <p className="mt-2.5 text-xs font-semibold text-cyan-300">
                            Auto-switching to {failedBanner.nextName}…
                          </p>
                        )}

                        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                          <button
                            type="button"
                            onClick={handleNextWorkingChannel}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-500 px-4 text-xs font-bold text-slate-950 transition-colors hover:bg-sky-400"
                          >
                            <SkipForward className="h-4 w-4" aria-hidden="true" />
                            <span>Switch to Next Working Channel</span>
                          </button>

                          {selectedChannel.officialWatchUrl && (
                            <a
                              href={selectedChannel.officialWatchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/25"
                            >
                              <span>Official Site</span>
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={handleRetryCurrent}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-4 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/[0.14]"
                          >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            <span>Retry</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Player Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-[#071022]/95 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  {!isEmbedMode && !isOfficialPortalMode ? (
                    <>
                      <button
                        type="button"
                        onClick={handleTogglePlay}
                        aria-label={status === 'playing' ? 'Pause stream' : 'Play stream'}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 text-xs font-bold text-slate-950 transition-colors hover:bg-sky-400 whitespace-nowrap"
                      >
                        {status === 'playing' ? (
                          <>
                            <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                            <span>Play</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleMute}
                        aria-label={isMuted ? 'Unmute stream' : 'Mute stream'}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                          isMuted
                            ? 'border-amber-400/45 bg-amber-500/18 text-amber-200 hover:bg-amber-500/28'
                            : 'border-white/14 bg-white/[0.06] text-slate-200 hover:bg-white/[0.12] hover:text-white'
                        }`}
                      >
                        {isMuted ? (
                          <>
                            <VolumeX className="h-4 w-4" aria-hidden="true" />
                            <span>Unmute</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-4 w-4 text-sky-400" aria-hidden="true" />
                            <span className="hidden sm:inline">Mute</span>
                          </>
                        )}
                      </button>

                      <div className="hidden items-center pl-1 sm:flex">
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={(e) => handleVolumeChange(Number(e.target.value))}
                          aria-label="Stream volume"
                          className="h-1.5 w-24 cursor-pointer accent-sky-400"
                        />
                      </div>
                    </>
                  ) : (
                    selectedChannel?.officialWatchUrl && (
                      <a
                        href={selectedChannel.officialWatchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-300 whitespace-nowrap"
                      >
                        <span>Open Official Broadcast</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoSkipEnabled((v) => !v)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                      autoSkipEnabled
                        ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
                        : 'border-white/14 bg-white/[0.05] text-slate-300 hover:bg-white/[0.11]'
                    }`}
                  >
                    <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Auto-Skip: {autoSkipEnabled ? 'On' : 'Off'}</span>
                  </button>

                  {!isOfficialPortalMode && (
                    <button
                      type="button"
                      onClick={handleRetryCurrent}
                      aria-label="Reload current stream"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/14 bg-white/[0.05] px-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.11] hover:text-white"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">Reload</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/14 bg-white/[0.05] px-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.11] hover:text-white"
                  >
                    {isFullscreen ? (
                      <Minimize className="h-4 w-4 text-sky-400" aria-hidden="true" />
                    ) : (
                      <Maximize className="h-4 w-4 text-sky-400" aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">
                      {isFullscreen ? 'Exit Full' : 'Fullscreen'}
                    </span>
                  </button>
                </div>
              </div>
            </section>

            {/* Compact Aggregator & Auto-Sort Summary Strip */}
            <section className="flex flex-col justify-between gap-2 rounded-2xl border border-white/[0.08] bg-slate-900/60 px-4 py-3 text-xs text-slate-300 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">Priority Live Sorting</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="tabular-nums text-slate-400">
                  {loadedPlaylistsCount > 0
                    ? `${loadedPlaylistsCount}/${totalPlaylistsCount} repositories merged (IPTV-Org, Free-TV, Pluto, Samsung, Plex, Roku, Tubi, SL)`
                    : 'Verified Sri Lanka & Global spotlights ready'}
                </span>
              </div>
              <span className="shrink-0 tabular-nums text-[11px] font-medium text-emerald-300">
                Working streams prioritized · Dead feeds marked Unavailable
              </span>
            </section>

            {/* Quick-Switch Working Spotlight Grid */}
            <section aria-label="Quick switch verified live channels" className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Tv className="h-4 w-4 text-fuchsia-400" aria-hidden="true" />
                  <span>
                    {activeCategory === 'all'
                      ? 'Featured Working Channels'
                      : `Top Working · ${CATEGORY_LABELS[activeCategory]}`}
                  </span>
                </h2>
                {activeCategory !== 'sri-lanka' && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory('sri-lanka')}
                    className="text-xs font-semibold text-amber-300 transition-colors hover:text-amber-200"
                  >
                    Browse Sri Lanka (SL) →
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                {quickSwitchChannels.map((ch) => {
                  const isActive = selectedChannel?.id === ch.id;
                  const health = channelHealth[ch.id];
                  const locked = isChannelLocked(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => selectChannel(ch, true)}
                      className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-colors ${
                        isActive
                          ? 'border-fuchsia-400/60 bg-fuchsia-500/18 text-white'
                          : locked
                            ? 'border-white/[0.06] bg-slate-900/45 text-slate-400 hover:border-fuchsia-400/45 hover:bg-slate-900/80'
                            : 'border-white/[0.08] bg-slate-900/65 text-slate-200 hover:border-sky-400/40 hover:bg-slate-900'
                      }`}
                    >
                      <ChannelLogoBadge
                        channel={ch}
                        isBroken={Boolean(brokenLogos[ch.id])}
                        isSelected={isActive}
                        onBroken={markLogoBroken}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-xs font-bold">{ch.name}</p>
                          {locked && (
                            <Lock
                              className="h-3 w-3 shrink-0 text-fuchsia-300"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <p className="truncate text-[11px] text-slate-400">
                          {CATEGORY_LABELS[ch.category]}
                          {locked
                            ? ' · Pro'
                            : health === 'working' || ch.preVerified
                              ? ' · Live'
                              : ch.resolution
                                ? ` · ${ch.resolution}`
                                : ''}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right: Virtualized 20,000+ Channel Directory with Real-Time Instant Search */}
          <aside
            aria-label="Live channels directory"
            className="flex flex-col overflow-hidden rounded-3xl border border-white/[0.1] bg-[#071022]/90"
          >
            <div className="space-y-3 border-b border-white/[0.08] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-white">
                    {activeCategory === 'all'
                      ? 'All Global & SL Channels'
                      : `${CATEGORY_LABELS[activeCategory]} Channels`}
                  </h2>
                  <p className="tabular-nums text-[11px] text-slate-400">
                    {sortedFilteredChannels.length.toLocaleString()} shown · Virtualized 60fps
                  </p>
                </div>
                {isScanningHealth && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-cyan-300">
                    <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                    <span>Checking</span>
                  </span>
                )}
              </div>

              {/* Instant Lag-Free Search Bar across 20,000+ Channels */}
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 20,000+ channels (Sri Lanka, Derana, Hiru, Sports, News...)"
                  aria-label="Search 20,000+ live channels"
                  className="h-10 w-full rounded-xl border border-white/12 bg-slate-950/90 pr-9 pl-10 text-xs text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear channel search"
                    className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Compact Filter & Re-Scan Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span className="tabular-nums">
                  {categoryLiveCounts[activeCategory]} Live
                  {offlineCount > 0 ? ` · ${offlineCount} Unavailable` : ''}
                </span>
                <div className="flex items-center gap-3">
                  {workingCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setLiveOnly((v) => !v)}
                      className={`font-semibold transition-colors ${
                        liveOnly
                          ? 'text-emerald-300 underline decoration-emerald-400/60 underline-offset-2'
                          : 'text-emerald-400/90 hover:text-emerald-300'
                      }`}
                    >
                      {liveOnly ? 'Show all' : 'Live only'}
                    </button>
                  )}
                  {offlineCount > 0 && !liveOnly && (
                    <button
                      type="button"
                      onClick={() => setHideOffline((v) => !v)}
                      className="font-semibold text-cyan-300 hover:text-cyan-200"
                    >
                      {hideOffline ? 'Show unavailable' : 'Hide unavailable'}
                    </button>
                  )}
                  {!isScanningHealth && channels.length > checkedCount && (
                    <button
                      type="button"
                      onClick={() => setProbeTrigger((n) => n + 1)}
                      className="font-semibold text-sky-300 hover:text-sky-200"
                    >
                      Scan more
                    </button>
                  )}
                </div>
              </div>
            </div>

            {isLoadingPlaylist && (
              <div className="flex items-center justify-between gap-2 border-b border-sky-400/20 bg-sky-500/10 px-4 py-2 text-[11px] text-sky-200">
                <span className="tabular-nums">
                  Syncing {loadedPlaylistsCount}/{totalPlaylistsCount} IPTV networks (
                  {channels.length.toLocaleString()} ready)…
                </span>
                <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
              </div>
            )}

            {sortedFilteredChannels.length === 0 ? (
              <div className="flex h-[520px] flex-col items-center justify-center px-6 py-12 text-center xl:h-[650px]">
                <Clapperboard className="h-7 w-7 text-slate-500" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-white">No channels match</p>
                <p className="mt-1 text-xs text-slate-400">
                  Try clearing your search or switching back to All Channels.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                    setHideOffline(false);
                    setLiveOnly(false);
                  }}
                  className="mt-4 rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <VirtualChannelList
                channels={sortedFilteredChannels}
                selectedChannelId={selectedChannel?.id || ''}
                channelHealth={channelHealth}
                brokenLogos={brokenLogos}
                isChannelLocked={isChannelLocked}
                onSelectChannel={handleVirtualRowSelect}
                onBrokenLogo={markLogoBroken}
                resetScrollKey={resetScrollKey}
              />
            )}
          </aside>
        </div>
      </div>
    );
  }
);

EntertainmentLivePage.displayName = 'EntertainmentLivePage';
