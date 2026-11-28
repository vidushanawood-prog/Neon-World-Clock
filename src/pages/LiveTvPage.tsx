import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  Layers,
  Lock,
  Maximize,
  Minimize,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Signal,
  Tv,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { Country } from '../data/countries';
import {
  FEATURED_LIVE_TV_ISOS,
  fetchCountryLiveTvChannels,
  getLiveTvChannelForCountry,
  type CountryTvChannelItem,
} from '../data/liveTvChannels';
import { FREE_LIMITS, isCountryLiveTvNewsChannel } from '../services/subscription';
import { formatClockForZone } from '../utils/time';

interface LiveTvPageProps {
  countries: readonly Country[];
  selectedCountry: Country;
  displayDate: Date;
  is24Hour: boolean;
  isProUser?: boolean;
  onRequireUpgrade?: (reason: string) => void;
  onSelectCountryCode: (iso: string) => void;
  onOpenCountryPage: (country: Country) => void;
}

type StreamStatus = 'connecting' | 'playing' | 'paused' | 'error';

export const LiveTvPage: React.FC<LiveTvPageProps> = ({
  countries,
  selectedCountry,
  displayDate,
  is24Hour,
  isProUser = false,
  onRequireUpgrade,
  onSelectCountryCode,
  onOpenCountryPage,
}) => {
  // Rule 1: Free users access the first 100 countries; remaining 115 countries are Pro-locked
  const freeCountryIsoSet = useMemo(
    () => new Set(countries.slice(0, FREE_LIMITS.COUNTRIES).map((c) => c.iso.toLowerCase())),
    [countries]
  );

  const isCountryLocked = useCallback(
    (iso: string) => !isProUser && !freeCountryIsoSet.has(iso.toLowerCase()),
    [isProUser, freeCountryIsoSet]
  );

  const handleSelectChannelCountry = useCallback(
    (c: Country) => {
      if (isCountryLocked(c.iso)) {
        onRequireUpgrade?.(
          `Unlock ${c.name} Live TV and all ${countries.length} countries with Neon Pro (Free plan includes the first ${FREE_LIMITS.COUNTRIES} countries).`
        );
        return;
      }
      onSelectCountryCode(c.iso);
    },
    [isCountryLocked, countries.length, onRequireUpgrade, onSelectCountryCode]
  );

  // If user is downgraded to Free while on a locked country (#101-215), snap back to first free country (Sri Lanka)
  useEffect(() => {
    if (isCountryLocked(selectedCountry.iso)) {
      onSelectCountryCode(FEATURED_LIVE_TV_ISOS[0] || countries[0]?.iso || 'lk');
    }
  }, [isCountryLocked, selectedCountry.iso, onSelectCountryCode, countries]);

  // Rule 2: Load all Live TV channels for selectedCountry (curated national broadcast + IPTV-Org country channels)
  const primaryCuratedChannel = useMemo<CountryTvChannelItem>(() => {
    const base = getLiveTvChannelForCountry(selectedCountry);
    return {
      ...base,
      id: `primary-${selectedCountry.iso.toLowerCase()}`,
      groupTitle: base.category,
      isPrimaryCurated: true,
    };
  }, [selectedCountry]);

  const [countryChannels, setCountryChannels] = useState<CountryTvChannelItem[]>(() => [
    primaryCuratedChannel,
  ]);
  const [loadingCountryChannels, setLoadingCountryChannels] = useState<boolean>(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string>(primaryCuratedChannel.id);
  const [channelCategoryFilter, setChannelCategoryFilter] = useState<string>('All');
  const [channelSearchQuery, setChannelSearchQuery] = useState<string>('');

  // Rule 2 check: For Free users inside a country's Live TV section, ONLY News channels play for free
  const isTvItemLocked = useCallback(
    (item: CountryTvChannelItem) => !isProUser && !isCountryLiveTvNewsChannel(item),
    [isProUser]
  );

  useEffect(() => {
    const controller = new AbortController();
    setCountryChannels([primaryCuratedChannel]);
    setSelectedChannelId(primaryCuratedChannel.id);
    setChannelCategoryFilter('All');
    setChannelSearchQuery('');
    setLoadingCountryChannels(true);

    void fetchCountryLiveTvChannels(selectedCountry, controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;
        setCountryChannels(items);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingCountryChannels(false);
        }
      });

    return () => controller.abort();
  }, [selectedCountry, primaryCuratedChannel]);

  const channel = useMemo(
    () => countryChannels.find((ch) => ch.id === selectedChannelId) || primaryCuratedChannel,
    [countryChannels, selectedChannelId, primaryCuratedChannel]
  );

  // If downgraded to Free while watching a non-News channel, automatically switch back to a News channel
  useEffect(() => {
    if (isTvItemLocked(channel)) {
      const firstFreeNews =
        countryChannels.find((ch) => isCountryLiveTvNewsChannel(ch)) || primaryCuratedChannel;
      setSelectedChannelId(firstFreeNews.id);
    }
  }, [isTvItemLocked, channel, countryChannels, primaryCuratedChannel]);

  const handleSelectCountryChannel = useCallback(
    (item: CountryTvChannelItem) => {
      if (isTvItemLocked(item)) {
        onRequireUpgrade?.(
          `Unlock "${item.channelName}" and all non-News ${selectedCountry.name} Live TV channels with Neon Pro (Free plan includes ${selectedCountry.name} News channels only).`
        );
        return;
      }
      setSelectedChannelId(item.id);
      setStreamMode('primary');
      setEmbedSource('primary');
      setEmbedLoaded(false);
      setEmbedError(false);
      setShowEmbedFallback(false);
      setStatus('connecting');
      setErrorReason(null);
      setAutoplayMutedNotice(false);
    },
    [isTvItemLocked, onRequireUpgrade, selectedCountry.name]
  );

  const countryChannelCategories = useMemo(() => {
    const counts = new Map<string, number>();
    let newsCount = 0;
    for (const item of countryChannels) {
      if (isCountryLiveTvNewsChannel(item)) {
        newsCount += 1;
      } else {
        const cat = item.category || 'General';
        counts.set(cat, (counts.get(cat) || 0) + 1);
      }
    }
    const others = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([cat]) => cat);
    const tabs = ['All'];
    if (newsCount > 0) tabs.push('News');
    for (const c of others) {
      if (!tabs.includes(c)) tabs.push(c);
    }
    return tabs;
  }, [countryChannels]);

  const filteredCountryChannels = useMemo(() => {
    const q = channelSearchQuery.trim().toLowerCase();
    return countryChannels.filter((item) => {
      if (channelCategoryFilter === 'News') {
        if (!isCountryLiveTvNewsChannel(item)) return false;
      } else if (channelCategoryFilter !== 'All') {
        if ((item.category || 'General').toLowerCase() !== channelCategoryFilter.toLowerCase()) {
          return false;
        }
      }
      if (!q) return true;
      return (
        item.channelName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.groupTitle.toLowerCase().includes(q)
      );
    });
  }, [countryChannels, channelCategoryFilter, channelSearchQuery]);

  const newsChannelsCount = useMemo(
    () => countryChannels.filter((item) => isCountryLiveTvNewsChannel(item)).length,
    [countryChannels]
  );

  const localClock = useMemo(
    () => formatClockForZone(displayDate, selectedCountry.timezone, is24Hour),
    [displayDate, selectedCountry.timezone, is24Hour]
  );

  const playerFrameRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const isEmbedChannel = Boolean(channel.preferEmbed && channel.embedUrl);

  const [streamMode, setStreamMode] = useState<'primary' | 'backup'>('primary');
  const [embedSource, setEmbedSource] = useState<'primary' | 'portal'>('primary');
  const [embedLoaded, setEmbedLoaded] = useState<boolean>(false);
  const [embedError, setEmbedError] = useState<boolean>(false);
  const [showEmbedFallback, setShowEmbedFallback] = useState<boolean>(false);
  const [retryNonce, setRetryNonce] = useState<number>(0);
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [autoplayMutedNotice, setAutoplayMutedNotice] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.9);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;
  const volumeRef = useRef<number>(volume);
  volumeRef.current = volume;

  // Reset player state whenever country changes
  useEffect(() => {
    setStreamMode('primary');
    setEmbedSource('primary');
    setEmbedLoaded(false);
    setEmbedError(false);
    setShowEmbedFallback(false);
    setStatus('connecting');
    setErrorReason(null);
    setAutoplayMutedNotice(false);
  }, [selectedCountry.iso]);

  const activeEmbedUrl =
    embedSource === 'portal' && channel.secondaryEmbedUrl
      ? channel.secondaryEmbedUrl
      : channel.embedUrl || channel.officialUrl;

  // Watchdog for embedded player: if an embed fails to signal load within 11s, offer graceful in-app recovery
  useEffect(() => {
    if (!isEmbedChannel || showEmbedFallback) return;
    setEmbedLoaded(false);
    setEmbedError(false);

    const timer = window.setTimeout(() => {
      setEmbedError(true);
    }, 11000);

    return () => window.clearTimeout(timer);
  }, [isEmbedChannel, activeEmbedUrl, retryNonce, showEmbedFallback]);

  const activeStreamUrl =
    streamMode === 'primary' ? channel.hlsUrl : channel.fallbackHlsUrl;

  const attemptVideoPlayback = useCallback(async (video: HTMLVideoElement) => {
    try {
      video.volume = volumeRef.current;
      video.muted = isMutedRef.current;
      await video.play();
      setStatus('playing');
      setAutoplayMutedNotice(false);
    } catch (err) {
      // Browser autoplay policy blocked unmuted playback -> retry muted immediately
      const isNotAllowed =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'AbortError');
      if (isNotAllowed && !video.muted) {
        try {
          video.muted = true;
          setIsMuted(true);
          setAutoplayMutedNotice(true);
          await video.play();
          setStatus('playing');
        } catch {
          setStatus('paused');
        }
      } else {
        setStatus('paused');
      }
    }
  }, []);

  // Attach HLS.js (or native Safari HLS) with automatic failover & strict cleanup
  useEffect(() => {
    if (isEmbedChannel || !activeStreamUrl) return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let failoverTriggered = false;
    setStatus('connecting');
    setErrorReason(null);

    const triggerFailoverOrError = (reason: string) => {
      if (cancelled || failoverTriggered) return;
      failoverTriggered = true;
      if (streamMode === 'primary' && channel.fallbackHlsUrl && channel.fallbackHlsUrl !== channel.hlsUrl) {
        setStreamMode('backup');
      } else {
        setStatus('error');
        setErrorReason(reason);
      }
    };

    // Clean any previous HLS instance & video buffers
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

    // Timeout guard: if stream does not start loading within 12s, switch to backup or show fallback
    const connectTimeout = window.setTimeout(() => {
      if (!cancelled && video.readyState < 2) {
        triggerFailoverOrError(
          'Live stream timed out or is temporarily geo-restricted in your region.'
        );
      }
    }, 12000);

    const onPlaying = () => {
      if (cancelled) return;
      window.clearTimeout(connectTimeout);
      setStatus('playing');
      setErrorReason(null);
    };

    const onPause = () => {
      if (cancelled) return;
      setStatus((prev) => (prev === 'error' ? prev : 'paused'));
    };

    const onWaiting = () => {
      if (cancelled) return;
      setStatus((prev) => (prev === 'error' ? prev : 'connecting'));
    };

    const onVideoError = () => {
      if (cancelled) return;
      window.clearTimeout(connectTimeout);
      triggerFailoverOrError(
        'This broadcast stream is currently unavailable or geo-restricted on this network.'
      );
    };

    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('error', onVideoError);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 20,
        manifestLoadingTimeOut: 10000,
        levelLoadingTimeOut: 10000,
        fragLoadingTimeOut: 10000,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        void attemptVideoPlayback(video);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (cancelled) return;
        if (!data.fatal) return;

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          try {
            hls.recoverMediaError();
            return;
          } catch {
            // Fall through to failover
          }
        }

        window.clearTimeout(connectTimeout);
        try {
          hls.destroy();
        } catch {
          // Ignore
        }
        hlsRef.current = null;
        triggerFailoverOrError(
          'Stream unavailable or restricted by broadcaster CORS/geo-policy.'
        );
      });

      hls.loadSource(activeStreamUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS native HLS playback
      video.src = activeStreamUrl;
      const onLoadedMeta = () => {
        if (cancelled) return;
        void attemptVideoPlayback(video);
      };
      video.addEventListener('loadedmetadata', onLoadedMeta, { once: true });
    } else {
      window.clearTimeout(connectTimeout);
      setStatus('error');
      setErrorReason('Your browser does not support HLS live video playback.');
    }

    return () => {
      cancelled = true;
      window.clearTimeout(connectTimeout);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
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
  }, [isEmbedChannel, activeStreamUrl, channel.fallbackHlsUrl, channel.hlsUrl, streamMode, retryNonce, attemptVideoPlayback]);

  // Keep fullscreen state synced with browser fullscreen events
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
        // Retry muted if blocked
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
      // Ignore unsupported fullscreen contexts (e.g. mobile Safari)
    }
  };

  const handleRetryPrimary = () => {
    if (isEmbedChannel) {
      setShowEmbedFallback(false);
      setEmbedError(false);
      setEmbedLoaded(false);
      setRetryNonce((n) => n + 1);
      return;
    }
    setStreamMode('primary');
    setErrorReason(null);
    setStatus('connecting');
    setRetryNonce((n) => n + 1);
  };

  const handleSwitchEmbedSource = (target?: 'primary' | 'portal') => {
    setShowEmbedFallback(false);
    setEmbedError(false);
    setEmbedLoaded(false);
    setEmbedSource((prev) => target ?? (prev === 'primary' ? 'portal' : 'primary'));
    setRetryNonce((n) => n + 1);
  };

  const handleToggleBackupFeed = () => {
    setStreamMode((prev) => (prev === 'primary' ? 'backup' : 'primary'));
    setErrorReason(null);
    setStatus('connecting');
  };

  const featuredCountries = useMemo(() => {
    const byIso = new Map(countries.map((c) => [c.iso.toLowerCase(), c]));
    return FEATURED_LIVE_TV_ISOS.map((iso) => byIso.get(iso)).filter(
      (c): c is Country => Boolean(c)
    );
  }, [countries]);

  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? countries.filter((c) => {
          const ch = getLiveTvChannelForCountry(c);
          return (
            c.name.toLowerCase().includes(q) ||
            c.capital.toLowerCase().includes(q) ||
            c.continent.toLowerCase().includes(q) ||
            c.iso.toLowerCase() === q ||
            ch.channelName.toLowerCase().includes(q) ||
            ch.network.toLowerCase().includes(q)
          );
        })
      : countries;
    return list.slice(0, q ? 48 : 24);
  }, [countries, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Broadcast Header Strip */}
      <section className="flex flex-col justify-between gap-4 rounded-3xl border border-sky-400/25 bg-[#071022]/90 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <img
            src={`https://flagcdn.com/w80/${selectedCountry.iso}.png`}
            alt={`Flag of ${selectedCountry.name}`}
            referrerPolicy="no-referrer"
            className="h-11 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/20"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/45 bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" aria-hidden="true" />
                LIVE TV
              </span>
              <span className="truncate text-xs font-semibold text-cyan-300">
                {selectedCountry.name} · {selectedCountry.capital}
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="tabular-clock text-xs font-medium text-slate-300">
                {localClock.hours}:{localClock.minutes}
                {!is24Hour && localClock.dayPeriod ? ` ${localClock.dayPeriod}` : ''}
              </span>
            </div>
            <h1 className="mt-1 truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
              {channel.channelName}
            </h1>
            <p className="mt-0.5 truncate text-xs text-slate-400 sm:text-sm">
              {channel.network} · {channel.category} · {channel.language}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenCountryPage(selectedCountry)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/14 bg-white/[0.06] px-3.5 text-xs font-semibold text-slate-100 transition-colors hover:border-sky-400/40 hover:bg-white/[0.12] hover:text-white whitespace-nowrap"
          >
            <span>Open {selectedCountry.name} Page</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
          </button>

          <a
            href={channel.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 whitespace-nowrap"
          >
            <span>Official Broadcast</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* 2. Responsive Neon-Framed 16:9 Live TV Player */}
      <section
        aria-label={`Live TV stream for ${selectedCountry.name}`}
        ref={playerFrameRef}
        className="overflow-hidden rounded-3xl border border-sky-400/35 bg-[#040814] shadow-[0_24px_64px_-22px_rgba(14,165,233,0.45)]"
      >
        <div className="relative aspect-video w-full bg-black">
          {isEmbedChannel ? (
            <>
              {!showEmbedFallback ? (
                <>
                  <iframe
                    key={`${selectedCountry.iso}-${embedSource}-${retryNonce}`}
                    src={activeEmbedUrl}
                    title={`${channel.channelName} Live Stream`}
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    onLoad={() => {
                      setEmbedLoaded(true);
                      setEmbedError(false);
                    }}
                    onError={() => {
                      setEmbedError(true);
                      setShowEmbedFallback(true);
                    }}
                    className="h-full w-full border-0 bg-black"
                  />

                  {/* Connecting Overlay until Embedded Player Loads */}
                  {!embedLoaded && !embedError && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[#040814]/85 px-4 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/35 bg-sky-500/15 text-sky-300">
                        <Radio className="h-7 w-7 animate-pulse" aria-hidden="true" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-white">
                        Loading {channel.channelName} Live Broadcast…
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {embedSource === 'portal'
                          ? 'Loading official itn.lk/live broadcast portal inside Neon World Clock'
                          : 'Connecting to official ITN Sri Lanka live player'}
                      </p>
                    </div>
                  )}

                  {/* Subtle Non-Intrusive Recovery Bar if Browser Security/Network Delays Embed */}
                  {embedError && !embedLoaded && (
                    <div className="absolute inset-x-3 bottom-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/40 bg-[#050a18]/95 px-4 py-3 text-xs text-slate-200 shadow-xl backdrop-blur-md">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                        <span>
                          Stream taking longer or blocked by browser frame headers?
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {channel.secondaryEmbedUrl && (
                          <button
                            type="button"
                            onClick={() => handleSwitchEmbedSource()}
                            className="rounded-lg border border-cyan-400/40 bg-cyan-500/18 px-3 py-1.5 font-semibold text-cyan-100 hover:bg-cyan-500/30"
                          >
                            {embedSource === 'primary' ? 'Try ITN.lk Portal View' : 'Try Direct Player'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowEmbedFallback(true)}
                          className="rounded-lg bg-sky-500 px-3 py-1.5 font-bold text-slate-950 hover:bg-sky-400"
                        >
                          Fallback Options
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Graceful In-App Fallback View (Never Blank, Never Switches to Foreign Channel) */
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#071126] via-[#050b19] to-[#040814] p-6 text-center">
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://flagcdn.com/w80/${selectedCountry.iso}.png`}
                      alt={`Flag of ${selectedCountry.name}`}
                      referrerPolicy="no-referrer"
                      className="h-9 w-13 rounded-lg object-cover ring-1 ring-white/20"
                    />
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/35 bg-cyan-500/15 text-cyan-300">
                      <Tv className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-white sm:text-xl">
                    {channel.channelName}
                  </h2>
                  <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-slate-300 sm:text-sm">
                    If your browser or network blocks embedded third-party broadcast frames, switch
                    to the alternate in-app view or launch the official{' '}
                    <span className="font-semibold text-cyan-300">itn.lk/live</span> broadcast page
                    directly.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSwitchEmbedSource('primary')}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/18 px-4 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/30 hover:text-white"
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      <span>Retry Direct Player</span>
                    </button>

                    {channel.secondaryEmbedUrl && (
                      <button
                        type="button"
                        onClick={() => handleSwitchEmbedSource('portal')}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-4 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/[0.14]"
                      >
                        <Layers className="h-4 w-4 text-sky-400" aria-hidden="true" />
                        <span>Open ITN.lk In-App Frame</span>
                      </button>
                    )}

                    <a
                      href={channel.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-500 px-4 text-xs font-bold text-slate-950 transition-colors hover:bg-sky-400"
                    >
                      <span>Open itn.lk/live</span>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                controls={false}
                onClick={handleTogglePlay}
                className="h-full w-full cursor-pointer object-contain bg-black"
              />

              {/* Top-Left Live HUD Overlay */}
              <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-start justify-between gap-2 sm:top-4 sm:left-4 sm:right-4">
                <div className="inline-flex max-w-[75%] items-center gap-2 rounded-xl border border-white/15 bg-[#050a18]/80 px-3 py-1.5 text-xs text-white backdrop-blur-md">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      status === 'playing'
                        ? 'animate-pulse bg-rose-500'
                        : status === 'connecting'
                          ? 'animate-pulse bg-amber-400'
                          : 'bg-slate-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate font-semibold">{channel.channelName}</span>
                  <span className="hidden text-[11px] text-cyan-300 sm:inline">
                    {streamMode === 'backup' ? '· Backup International Feed' : '· Live HLS'}
                  </span>
                </div>

                {autoplayMutedNotice && status === 'playing' && (
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/90 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-lg transition-colors hover:bg-amber-400"
                  >
                    <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Tap to Unmute</span>
                  </button>
                )}
              </div>

              {/* Connecting / Buffering State */}
              {status === 'connecting' && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[#040814]/70 px-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/35 bg-sky-500/15 text-sky-300">
                    <Radio className="h-7 w-7 animate-pulse" aria-hidden="true" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">
                    Connecting to {channel.channelName}…
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {streamMode === 'backup'
                      ? 'Switching to globally available international HLS backup feed'
                      : 'Establishing secure HTTPS live broadcast stream'}
                  </p>
                </div>
              )}

              {/* Clean Fallback Overlay if Stream is Geo-Restricted / Offline */}
              {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#071126] via-[#050b19] to-[#040814] p-6 text-center">
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://flagcdn.com/w80/${selectedCountry.iso}.png`}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-9 w-13 rounded-lg object-cover ring-1 ring-white/20"
                    />
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-400/35 bg-rose-500/15 text-rose-300">
                      <Tv className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-white sm:text-xl">
                    {channel.channelName}
                  </h2>
                  <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-300 sm:text-sm">
                    {errorReason ||
                      'This public stream is temporarily offline or geo-restricted on your current network.'}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleRetryPrimary}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/18 px-4 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/30 hover:text-white"
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      <span>Retry Live Stream</span>
                    </button>

                    <a
                      href={channel.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-500 px-4 text-xs font-bold text-slate-950 transition-colors hover:bg-sky-400"
                    >
                      <span>Watch on Official Broadcaster</span>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Player Controls Bar */}
        {isEmbedChannel ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-[#071022]/95 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" aria-hidden="true" />
                <span className="truncate">{channel.channelName}</span>
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="truncate text-cyan-300">
                {showEmbedFallback
                  ? 'Fallback View'
                  : embedSource === 'portal'
                    ? 'ITN.lk Portal Embed'
                    : 'Official In-App Player'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {channel.secondaryEmbedUrl && (
                <button
                  type="button"
                  onClick={() => handleSwitchEmbedSource()}
                  title="Switch between ITN Direct Stream Player and itn.lk/live portal view"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/12 px-3 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/22 hover:text-white"
                >
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {embedSource === 'primary' ? 'ITN.lk Portal View' : 'Direct Stream Player'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRetryPrimary}
                aria-label="Reload ITN Sri Lanka player"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/14 bg-white/[0.05] px-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.11] hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Reload</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEmbedFallback((v) => !v)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/14 bg-white/[0.05] px-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.11] hover:text-white"
              >
                <Signal className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                <span>{showEmbedFallback ? 'Back to Player' : 'Fallback'}</span>
              </button>

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
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-[#071022]/95 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePlay}
                aria-label={status === 'playing' ? 'Pause broadcast' : 'Play broadcast'}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 text-xs font-bold text-slate-950 transition-colors hover:bg-sky-400"
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
                aria-label={isMuted ? 'Unmute broadcast' : 'Mute broadcast'}
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
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

              <div className="hidden items-center gap-2 pl-1 md:flex">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  aria-label="Broadcast volume"
                  className="h-1.5 w-24 cursor-pointer accent-sky-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleBackupFeed}
                title="Switch between primary and backup international HLS feed"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/14 bg-white/[0.05] px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-400/40 hover:bg-white/[0.11] hover:text-white"
              >
                <Signal className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                <span>{streamMode === 'primary' ? 'Backup Feed' : 'Primary Feed'}</span>
              </button>

              <button
                type="button"
                onClick={handleRetryPrimary}
                aria-label="Reload live stream"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/14 bg-white/[0.05] px-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.11] hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Reload</span>
              </button>

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
        )}
      </section>

      {/* 3. Broadcast Description & Clean Audio Status */}
      <section className="flex flex-col justify-between gap-3 rounded-2xl border border-white/[0.08] bg-slate-900/60 px-5 py-4 sm:flex-row sm:items-center">
        <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
          {channel.description}
        </p>
        <span className="shrink-0 text-[11px] font-medium text-emerald-300">
          Anthem &amp; Voice Narrator auto-muted during Live TV
        </span>
      </section>

      {/* 3B. Selected Country Live TV Channel List (Free = News channels only, Pro = All channels) */}
      <section
        aria-label={`${selectedCountry.name} Live TV channels`}
        className="space-y-4 rounded-3xl border border-sky-400/20 bg-[#071022]/90 p-5 sm:p-6"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-sm font-bold text-white sm:text-base">
              <Tv className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <span>{selectedCountry.name} Live TV Channels</span>
              <span className="tabular-nums text-xs font-medium text-slate-400">
                ({countryChannels.length})
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {isProUser
                ? `Pro Plan: All ${countryChannels.length} ${selectedCountry.name} channels unlocked`
                : `Free Plan: ${newsChannelsCount} News ${newsChannelsCount === 1 ? 'channel' : 'channels'} unlocked · Upgrade to Neon Pro for all other TV channels`}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={channelSearchQuery}
              onChange={(e) => setChannelSearchQuery(e.target.value)}
              placeholder={`Filter ${selectedCountry.name} TV channels…`}
              aria-label={`Search ${selectedCountry.name} TV channels`}
              className="h-9 w-full rounded-xl border border-white/12 bg-slate-950/85 pr-8 pl-9 text-xs text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />
            {channelSearchQuery && (
              <button
                type="button"
                onClick={() => setChannelSearchQuery('')}
                aria-label="Clear channel filter"
                className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {countryChannelCategories.length > 1 && (
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {countryChannelCategories.map((cat) => {
              const active = channelCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setChannelCategoryFilter(cat)}
                  className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-sky-500 text-slate-950'
                      : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:border-sky-400/40 hover:text-white'
                  }`}
                >
                  {cat === 'News' && !isProUser ? 'News (Free)' : cat}
                </button>
              );
            })}
          </div>
        )}

        {loadingCountryChannels && countryChannels.length <= 1 && (
          <p className="text-xs text-cyan-300/80">
            Loading additional {selectedCountry.name} public TV broadcasts…
          </p>
        )}

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCountryChannels.map((item) => {
            const active = item.id === channel.id;
            const locked = isTvItemLocked(item);
            const isNews = isCountryLiveTvNewsChannel(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectCountryChannel(item)}
                className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-all ${
                  active
                    ? 'border-sky-400/65 bg-sky-500/18 text-white shadow-[0_0_24px_-10px_rgba(56,189,248,0.65)]'
                    : locked
                      ? 'border-white/[0.06] bg-slate-950/45 text-slate-400 hover:border-fuchsia-400/45 hover:bg-slate-900/80'
                      : 'border-white/[0.08] bg-slate-950/65 text-slate-200 hover:border-sky-400/40 hover:bg-slate-900/90 hover:text-white'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                    {item.logo ? (
                      <img
                        src={item.logo}
                        alt=""
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="h-7 w-7 object-contain"
                      />
                    ) : (
                      <Tv
                        className={`h-4 w-4 ${active ? 'text-sky-300' : isNews ? 'text-cyan-400' : 'text-slate-400'}`}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">{item.channelName}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {item.category}
                      {isNews ? ' · News' : ''}
                    </p>
                  </div>
                </div>

                {locked ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-fuchsia-400/45 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-fuchsia-200">
                    <Lock className="h-2.5 w-2.5 text-cyan-300" aria-hidden="true" />
                    Pro
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                    {active ? 'Watching' : 'Play'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Featured Global Live TV Channels Strip */}
      <section aria-label="Featured live TV channels" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white sm:text-base">
            <Tv className="h-4 w-4 text-sky-400" aria-hidden="true" />
            <span>Featured Global Broadcasts</span>
          </h2>
          <span className="text-xs text-slate-400">One-tap country switch</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {featuredCountries.map((c) => {
            const ch = getLiveTvChannelForCountry(c);
            const active = c.iso.toLowerCase() === selectedCountry.iso.toLowerCase();
            const locked = isCountryLocked(c.iso);
            return (
              <button
                key={c.iso}
                type="button"
                onClick={() => handleSelectChannelCountry(c)}
                className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-all ${
                  active
                    ? 'border-sky-400/60 bg-sky-500/18 text-white shadow-[0_0_24px_-10px_rgba(56,189,248,0.6)]'
                    : locked
                      ? 'border-white/[0.06] bg-slate-900/45 text-slate-400 hover:border-fuchsia-400/45 hover:bg-slate-900/80'
                      : 'border-white/[0.08] bg-slate-900/60 text-slate-200 hover:border-sky-400/35 hover:bg-slate-900/90 hover:text-white'
                }`}
              >
                <img
                  src={`https://flagcdn.com/w40/${c.iso}.png`}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-5 w-7 shrink-0 rounded-[4px] object-cover ring-1 ring-white/15"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{c.name}</p>
                  <p className="truncate text-[11px] text-slate-400">{ch.channelName}</p>
                </div>
                {locked && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-fuchsia-400/40 bg-fuchsia-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-fuchsia-200">
                    <Lock className="h-2.5 w-2.5 text-cyan-300" aria-hidden="true" />
                    Pro
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Quick Country Switcher Across All 215 Nations */}
      <section
        aria-label="Search all countries live TV"
        className="rounded-3xl border border-white/[0.09] bg-slate-900/60 p-5 sm:p-6"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-bold text-white sm:text-base">
              Browse All {countries.length} Countries Live TV
            </h2>
            <p className="text-xs text-slate-400">
              Search any country, capital, or channel network to tune in immediately
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country or channel (NHK, Sky, DW...)"
              aria-label="Search countries for Live TV"
              className="h-10 w-full rounded-xl border border-white/12 bg-slate-950/85 pr-9 pl-10 text-xs text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear TV search"
                className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCountries.map((c) => {
            const ch = getLiveTvChannelForCountry(c);
            const active = c.iso.toLowerCase() === selectedCountry.iso.toLowerCase();
            const locked = isCountryLocked(c.iso);
            return (
              <button
                key={c.iso}
                type="button"
                onClick={() => handleSelectChannelCountry(c)}
                className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${
                  active
                    ? 'border-sky-400/55 bg-sky-500/16 text-white'
                    : locked
                      ? 'border-white/[0.06] bg-slate-950/45 text-slate-400 hover:border-fuchsia-400/45 hover:bg-slate-900/80'
                      : 'border-white/[0.07] bg-slate-950/60 text-slate-200 hover:border-sky-400/35 hover:bg-slate-900/90'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={`https://flagcdn.com/w40/${c.iso}.png`}
                    alt=""
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="h-5 w-7 shrink-0 rounded-[4px] object-cover ring-1 ring-white/15"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">{c.name}</p>
                    <p className="truncate text-[11px] text-slate-400">{ch.channelName}</p>
                  </div>
                </div>
                {locked ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-fuchsia-400/40 bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-fuchsia-200">
                    <Lock className="h-2.5 w-2.5 text-cyan-300" aria-hidden="true" />
                    Pro
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                    {active ? 'Watching' : 'Tune'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {!searchQuery && countries.length > 24 && (
          <p className="mt-3 text-center text-xs text-slate-400">
            Showing 24 of {countries.length} countries — type above to filter any nation instantly.
          </p>
        )}
      </section>
    </div>
  );
};
