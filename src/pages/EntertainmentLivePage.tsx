import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  AlertTriangle,
  CheckCircle2,
  Clapperboard,
  Film,
  Maximize,
  Minimize,
  Music,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  SkipForward,
  Sparkles,
  Tv,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from 'lucide-react';
import {
  loadEntertainmentChannels,
  VERIFIED_SPOTLIGHT_CHANNELS,
  type EntertainmentCategory,
  type EntertainmentChannel,
} from '../services/entertainmentStreams';

type CategoryFilter = 'all' | EntertainmentCategory;
type StreamStatus = 'connecting' | 'playing' | 'buffering' | 'paused' | 'error';
type ChannelHealth = 'working' | 'offline';

const CATEGORY_TABS: readonly { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All Entertainment' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'cartoons', label: 'Cartoons & Anime' },
  { id: 'movies', label: 'Movies' },
  { id: 'music', label: 'Music' },
];

const CATEGORY_LABELS: Record<EntertainmentCategory, string> = {
  entertainment: 'Entertainment',
  cartoons: 'Cartoons',
  movies: 'Movies',
  music: 'Music',
};

function CategoryIcon({
  category,
  className = 'h-4 w-4',
}: {
  category: EntertainmentCategory;
  className?: string;
}) {
  switch (category) {
    case 'movies':
      return <Film className={className} aria-hidden="true" />;
    case 'cartoons':
      return <Sparkles className={className} aria-hidden="true" />;
    case 'music':
      return <Music className={className} aria-hidden="true" />;
    default:
      return <Clapperboard className={className} aria-hidden="true" />;
  }
}

export const EntertainmentLivePage: React.FC = () => {
  const [channels, setChannels] = useState<EntertainmentChannel[]>(() => [
    ...VERIFIED_SPOTLIGHT_CHANNELS,
  ]);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState<boolean>(true);
  const [loadedPlaylistsCount, setLoadedPlaylistsCount] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hideOffline, setHideOffline] = useState<boolean>(false);
  const [autoSkipEnabled, setAutoSkipEnabled] = useState<boolean>(true);

  const [selectedChannelId, setSelectedChannelId] = useState<string>(
    VERIFIED_SPOTLIGHT_CHANNELS[0]?.id || ''
  );
  const [channelHealth, setChannelHealth] = useState<Record<string, ChannelHealth>>({});
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

  // Fetch live iptv-org M3U playlists (entertainment, movies, animation, music) on mount
  const fetchPlaylists = useCallback(async (forceRefresh = false) => {
    setIsLoadingPlaylist(true);
    try {
      const result = await loadEntertainmentChannels(forceRefresh);
      setChannels(result.channels);
      setLoadedPlaylistsCount(result.loadedPlaylists);
      setSelectedChannelId((current) => {
        if (current && result.channels.some((c) => c.id === current)) {
          return current;
        }
        return result.channels[0]?.id || '';
      });
    } finally {
      setIsLoadingPlaylist(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlaylists(false);
  }, [fetchPlaylists]);

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId) || channels[0] || null,
    [channels, selectedChannelId]
  );

  // Category counts for segmented filter buttons
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: channels.length,
      entertainment: 0,
      cartoons: 0,
      movies: 0,
      music: 0,
    };
    for (const ch of channels) {
      counts[ch.category] += 1;
    }
    return counts;
  }, [channels]);

  // Filtered channel directory (never grouped by country)
  const visibleChannels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return channels.filter((ch) => {
      if (activeCategory !== 'all' && ch.category !== activeCategory) return false;
      if (hideOffline && channelHealth[ch.id] === 'offline') return false;
      if (q) {
        const hay = `${ch.name} ${CATEGORY_LABELS[ch.category]} ${ch.resolution || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [channels, activeCategory, hideOffline, channelHealth, searchQuery]);

  // Find next playable (non-offline) channel for quick switch & auto-skip
  const findNextWorkingChannel = useCallback(
    (excludeId: string, healthSnapshot: Record<string, ChannelHealth>): EntertainmentChannel | null => {
      const pool = visibleChannels.length > 1 ? visibleChannels : channels;
      if (pool.length === 0) return null;
      const currentIdx = pool.findIndex((c) => c.id === excludeId);
      const startIdx = currentIdx >= 0 ? currentIdx + 1 : 0;

      // 1st pass: prefer confirmed working or untested channels
      for (let offset = 0; offset < pool.length; offset++) {
        const candidate = pool[(startIdx + offset) % pool.length];
        if (candidate.id !== excludeId && healthSnapshot[candidate.id] !== 'offline') {
          return candidate;
        }
      }
      // 2nd pass: fallback across full channel list if current filter had no untested streams
      for (const candidate of channels) {
        if (candidate.id !== excludeId && healthSnapshot[candidate.id] !== 'offline') {
          return candidate;
        }
      }
      return null;
    },
    [channels, visibleChannels]
  );

  const selectChannel = useCallback((channel: EntertainmentChannel, isManual = true) => {
    if (autoSkipTimerRef.current) {
      window.clearTimeout(autoSkipTimerRef.current);
      autoSkipTimerRef.current = null;
    }
    if (isManual) {
      consecutiveSkipsRef.current = 0;
      setFailedBanner(null);
    }
    setErrorReason(null);
    setUnstableDetail(null);
    setSelectedChannelId((prevId) => {
      if (prevId === channel.id) {
        // Explicit re-tap on the same channel: trigger a deliberate reload
        setStatus('connecting');
        setRetryNonce((n) => n + 1);
      } else {
        setStatus('connecting');
      }
      return channel.id;
    });
  }, []);

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

  // Keep latest callbacks & metadata in refs so filtering/searching/health updates NEVER tear down active HLS playback
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

  // Attach HLS.js (or Safari native HLS) strictly keyed on activeChannelId + activeChannelUrl + retryNonce
  useEffect(() => {
    if (!activeChannelId || !activeChannelUrl) return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let failureFinalized = false;
    let hasStartedPlayback = false;
    let lastProgressTime = 0;

    // Cooldown-guarded recovery counters to prevent rapid stutter/reload glitch loops
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

    // Short 2.6-second stability check before declaring a channel failed or auto-skipping
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
      setChannelHealth((prev) =>
        prev[activeChannelId] === 'working' ? prev : { ...prev, [activeChannelId]: 'working' }
      );
    };

    // Clean up any previous HLS.js instance
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

    // Initial connection timeout -> enters short 2.6s stability check before failing
    connectTimeout = window.setTimeout(() => {
      connectTimeout = null;
      if (!cancelled && !failureFinalized && !hasStartedPlayback && video.readyState < 2) {
        beginStabilityCheck(
          'Stream slow to respond — checking stability…',
          'This entertainment stream timed out, is offline, or blocked by broadcaster CORS.'
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

        // First stall: gently request next fragments without resetting the entire player
        if (!stallRecoveryUsed && hlsRef.current) {
          stallRecoveryUsed = true;
          setUnstableDetail('Buffering / Stream unstable — recovering feed…');
          try {
            hlsRef.current.startLoad();
          } catch {
            // Fall through to stability check
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
        'Stream could not be decoded or is currently offline on this network.'
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
        // Disable aggressive LL-HLS edge chasing so standard public IPTV streams play smoothly
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

        // Handle non-fatal stalls & fragment hiccups gently without tearing down the stream
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

        // Fatal MEDIA_ERROR: recover gracefully with cooldown so it never enters a rapid glitch loop
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
              // Fall through to stability check
            }
          }

          beginStabilityCheck(
            'Media decoder unstable — checking recovery…',
            'Channel media stream encountered repeated decoding errors.'
          );
          return;
        }

        // Fatal NETWORK_ERROR: distinguish permanent 403/404 from transient drops
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
                  'Channel stream is offline or restricted by broadcaster CORS headers.'
                );
              }
            }, 1400);
            return;
          }

          beginStabilityCheck(
            'Stream connection lost — verifying availability…',
            'Channel stream is offline or restricted by broadcaster CORS headers.'
          );
          return;
        }

        // Any other fatal error -> run short stability check before failing/auto-skipping
        beginStabilityCheck(
          'Stream unstable — checking if feed recovers…',
          'Channel stream is offline or unavailable on this network.'
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
  }, [activeChannelId, activeChannelUrl, retryNonce]);

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

  return (
    <div className="space-y-6">
      {/* 1. Entertainment Live Top Summary Strip */}
      <section className="flex flex-col justify-between gap-4 rounded-3xl border border-fuchsia-400/25 bg-[#071022]/90 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-fuchsia-300">Entertainment Live</span>
            <span aria-hidden="true">·</span>
            <span>Movies, Cartoons, Music &amp; Shows</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums text-cyan-300">
              {channels.length} HTTPS HLS channels
            </span>
          </div>
          <h1 className="mt-1 truncate text-xl font-bold tracking-tight text-white sm:text-2xl [text-wrap:balance]">
            {selectedChannel ? selectedChannel.name : 'Entertainment Live Broadcast'}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400 sm:text-sm">
            {selectedChannel ? (
              <>
                <span>{CATEGORY_LABELS[selectedChannel.category]}</span>
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
              <span>Loading public HTTPS entertainment playlists…</span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleNextWorkingChannel}
            disabled={channels.length <= 1}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-500 px-4 text-xs font-bold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-50 whitespace-nowrap"
          >
            <SkipForward className="h-4 w-4" aria-hidden="true" />
            <span>Next Working Channel</span>
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
            <span>Refresh List</span>
          </button>
        </div>
      </section>

      {/* 2. Primary Workspace: 16:9 Live Video Player + Side-by-Side Channel Directory */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
        {/* Left: Live HLS Video Player */}
        <div className="space-y-4">
          <section
            aria-label="Entertainment live HLS video player"
            ref={playerFrameRef}
            className="overflow-hidden rounded-3xl border border-sky-400/35 bg-[#040814] shadow-[0_24px_64px_-22px_rgba(14,165,233,0.4)]"
          >
            <div className="relative aspect-video w-full bg-black">
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
                    Buffering secure HTTPS HLS live stream
                  </p>
                </div>
              )}

              {/* Non-Blocking Buffering / Stream Unstable Status Banner */}
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

              {/* Offline / CORS-Blocked Auto-Skip & Quick Switch Overlay */}
              {status === 'error' && selectedChannel && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#071126] via-[#050b19] to-[#040814] p-6 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-400/35 bg-rose-500/15 text-rose-300">
                    <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h2 className="mt-3 text-lg font-bold text-white">
                    {selectedChannel.name} is Offline or Blocked
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

                    <button
                      type="button"
                      onClick={handleRetryCurrent}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-4 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/[0.14]"
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      <span>Retry Channel</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Player Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-[#071022]/95 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
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

                <button
                  type="button"
                  onClick={handleRetryCurrent}
                  aria-label="Reload current stream"
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
          </section>

          {/* Compact Playback & Source Info Strip */}
          <section className="flex flex-col justify-between gap-2 rounded-2xl border border-white/[0.08] bg-slate-900/60 px-5 py-3.5 text-xs text-slate-300 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-white">Public Entertainment Feeds</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="tabular-nums text-slate-400">
                {loadedPlaylistsCount > 0
                  ? `${loadedPlaylistsCount} iptv-org playlists synced (News excluded)`
                  : 'Curated HTTPS HLS spotlight active'}
              </span>
              {workingCount > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="tabular-nums text-emerald-300">
                    {workingCount} verified playable
                  </span>
                </>
              )}
              {offlineCount > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="tabular-nums text-rose-300">
                    {offlineCount} marked offline
                  </span>
                </>
              )}
            </div>
            <span className="shrink-0 text-[11px] font-medium text-emerald-300">
              Anthem &amp; Voice Narrator auto-muted
            </span>
          </section>

          {/* Quick-Switch Instant Spotlight Strip */}
          <section aria-label="Quick switch spotlight entertainment channels" className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <Tv className="h-4 w-4 text-fuchsia-400" aria-hidden="true" />
                <span>Quick-Switch Spotlight</span>
              </h2>
              <span className="text-xs text-slate-400">Verified HTTPS HLS feeds</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
              {VERIFIED_SPOTLIGHT_CHANNELS.slice(0, 8).map((ch) => {
                const isActive = selectedChannel?.id === ch.id;
                const health = channelHealth[ch.id];
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => selectChannel(ch, true)}
                    className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-colors ${
                      isActive
                        ? 'border-fuchsia-400/60 bg-fuchsia-500/18 text-white'
                        : health === 'offline'
                          ? 'border-rose-400/20 bg-slate-950/60 text-slate-500 hover:border-rose-400/35'
                          : 'border-white/[0.08] bg-slate-900/65 text-slate-200 hover:border-sky-400/40 hover:bg-slate-900'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-cyan-300">
                      <CategoryIcon category={ch.category} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{ch.name}</p>
                      <p className="truncate text-[11px] text-slate-400">
                        {CATEGORY_LABELS[ch.category]}
                        {health === 'offline' ? ' · Offline' : ch.resolution ? ` · ${ch.resolution}` : ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right: Filterable, Searchable Entertainment Channel List (No Country Grouping) */}
        <aside
          aria-label="Entertainment channels directory"
          className="flex flex-col overflow-hidden rounded-3xl border border-white/[0.1] bg-[#071022]/90 xl:max-h-[760px]"
        >
          <div className="space-y-3 border-b border-white/[0.08] p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-white">
                Playable Channels
              </h2>
              <span className="tabular-nums text-xs text-slate-400">
                {visibleChannels.length} shown
              </span>
            </div>

            {/* Live Channel Search */}
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies, cartoons, music, shows..."
                aria-label="Search entertainment channels"
                className="h-10 w-full rounded-xl border border-white/12 bg-slate-950/90 pr-9 pl-10 text-xs text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear entertainment search"
                  className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Category Filter Buttons */}
            <div
              role="tablist"
              aria-label="Filter entertainment channels by genre"
              className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5"
            >
              {CATEGORY_TABS.map((tab) => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveCategory(tab.id)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-sky-500 text-slate-950'
                        : 'border border-white/10 bg-slate-950/70 text-slate-300 hover:border-sky-400/35 hover:text-white'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`tabular-nums text-[11px] ${
                        isActive ? 'text-slate-900/75' : 'text-slate-500'
                      }`}
                    >
                      {categoryCounts[tab.id]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Offline Filter Toggle */}
            {offlineCount > 0 && (
              <div className="flex items-center justify-between pt-0.5 text-[11px] text-slate-400">
                <span className="tabular-nums">
                  {offlineCount} channel{offlineCount === 1 ? '' : 's'} marked offline
                </span>
                <button
                  type="button"
                  onClick={() => setHideOffline((v) => !v)}
                  className="font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  {hideOffline ? 'Show offline channels' : 'Hide offline channels'}
                </button>
              </div>
            )}
          </div>

          {/* Scrollable Channel Rows */}
          <div className="flex-1 divide-y divide-white/[0.05] overflow-y-auto">
            {isLoadingPlaylist && channels.length <= VERIFIED_SPOTLIGHT_CHANNELS.length && (
              <div className="flex items-center justify-between gap-2 bg-sky-500/10 px-4 py-2.5 text-xs text-sky-200">
                <span>Loading live iptv-org playlists…</span>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              </div>
            )}

            {visibleChannels.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <Clapperboard className="h-7 w-7 text-slate-500" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-white">No channels match</p>
                <p className="mt-1 text-xs text-slate-400">
                  Try clearing your search or switching back to All Entertainment.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                    setHideOffline(false);
                  }}
                  className="mt-4 rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              visibleChannels.map((ch) => {
                const isSelected = selectedChannel?.id === ch.id;
                const health = channelHealth[ch.id];
                const showLogo = Boolean(ch.logo && !brokenLogos[ch.id]);

                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => selectChannel(ch, true)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'bg-sky-500/18 text-white'
                        : health === 'offline'
                          ? 'bg-transparent text-slate-500 hover:bg-white/[0.03]'
                          : 'bg-transparent text-slate-200 hover:bg-white/[0.05]'
                    }`}
                  >
                    {/* Channel Logo or Clean Fallback Icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-950/90">
                      {showLogo ? (
                        <img
                          src={ch.logo}
                          alt={ch.name}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={() =>
                            setBrokenLogos((prev) => ({ ...prev, [ch.id]: true }))
                          }
                          className="h-8 w-8 object-contain"
                        />
                      ) : (
                        <CategoryIcon
                          category={ch.category}
                          className={`h-4 w-4 ${
                            isSelected ? 'text-sky-300' : 'text-slate-400'
                          }`}
                        />
                      )}
                    </div>

                    {/* Title & Clean Unboxed Metadata */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-xs font-bold sm:text-[13px] ${
                          health === 'offline'
                            ? 'text-slate-500 line-through'
                            : 'text-white'
                        }`}
                      >
                        {ch.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span>{CATEGORY_LABELS[ch.category]}</span>
                        {ch.resolution && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{ch.resolution}</span>
                          </>
                        )}
                        {health === 'working' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              Live
                            </span>
                          </>
                        )}
                        {health === 'offline' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-rose-400">
                              <XCircle className="h-3 w-3" aria-hidden="true" />
                              Offline
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Affordance */}
                    <span
                      className={`shrink-0 text-[11px] font-semibold ${
                        isSelected
                          ? 'text-sky-300'
                          : health === 'offline'
                            ? 'text-slate-500'
                            : 'text-cyan-300'
                      }`}
                    >
                      {isSelected ? 'Playing' : 'Watch'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
