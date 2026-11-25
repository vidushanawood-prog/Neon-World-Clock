import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  ArrowUpRight,
  ExternalLink,
  Globe2,
  Loader2,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  SkipBack,
  SkipForward,
  Tv,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { Country } from '../data/countries';
import {
  FEATURED_RADIO_ISOS,
  fetchRadioStationsForCountry,
  type RadioStation,
} from '../services/radioBrowser';
import { formatClockForZone } from '../utils/time';

interface LiveRadioPageProps {
  countries: readonly Country[];
  selectedCountry: Country;
  displayDate: Date;
  is24Hour: boolean;
  onSelectCountryCode: (iso: string) => void;
  onOpenCountryPage: (country: Country) => void;
  onOpenLiveTvPage: (country: Country) => void;
}

type AudioStatus = 'idle' | 'connecting' | 'playing' | 'paused' | 'error';

const INITIAL_VISIBLE_STATIONS = 60;

export const LiveRadioPage: React.FC<LiveRadioPageProps> = ({
  countries,
  selectedCountry,
  displayDate,
  is24Hour,
  onSelectCountryCode,
  onOpenCountryPage,
  onOpenLiveTvPage,
}) => {
  const localClock = useMemo(
    () => formatClockForZone(displayDate, selectedCountry.timezone, is24Hour),
    [displayDate, selectedCountry.timezone, is24Hour]
  );

  // Station directory state
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loadingStations, setLoadingStations] = useState<boolean>(true);
  const [sourceNote, setSourceNote] = useState<string | null>(null);
  const [stationSearch, setStationSearch] = useState<string>('');
  const [activeGenre, setActiveGenre] = useState<string>('All');
  const [visibleLimit, setVisibleLimit] = useState<number>(INITIAL_VISIBLE_STATIONS);
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [failedIcons, setFailedIcons] = useState<Set<string>>(() => new Set());

  // Active playback state
  const [activeStation, setActiveStation] = useState<RadioStation | null>(null);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [playTriggerNonce, setPlayTriggerNonce] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const volumeRef = useRef<number>(volume);
  volumeRef.current = volume;
  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;

  const stopAudioEngine = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {
        // Ignore
      }
      hlsRef.current = null;
    }
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch {
        // Ignore
      }
    }
  }, []);

  // Cleanup completely on unmount (navigating away from #/live-radio)
  useEffect(() => {
    return () => {
      stopAudioEngine();
    };
  }, [stopAudioEngine]);

  // Fetch all online radio stations for selectedCountry
  const loadCountryStations = useCallback(
    async (forceRefresh = false) => {
      setLoadingStations(true);
      setSourceNote(null);
      setStationSearch('');
      setActiveGenre('All');
      setVisibleLimit(INITIAL_VISIBLE_STATIONS);

      const res = await fetchRadioStationsForCountry(selectedCountry, forceRefresh);
      return res;
    },
    [selectedCountry]
  );

  useEffect(() => {
    let cancelled = false;
    stopAudioEngine();
    setActiveStation(null);
    setAudioStatus('idle');
    setAudioError(null);

    loadCountryStations(false).then((res) => {
      if (cancelled) return;
      setStations(res.stations);
      setSourceNote(res.note || null);
      setLoadingStations(false);
    });

    return () => {
      cancelled = true;
    };
  }, [loadCountryStations, stopAudioEngine]);

  // Attach and play activeStation whenever activeStation or playTriggerNonce changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeStation) return;

    let cancelled = false;
    stopAudioEngine();
    setAudioStatus('connecting');
    setAudioError(null);

    const streamUrl = activeStation.streamUrl;
    const isHlsStream = /\.m3u8(\?|$)/i.test(streamUrl);

    const connectTimer = window.setTimeout(() => {
      if (!cancelled && audio.readyState < 2) {
        setAudioStatus('error');
        setAudioError('Station timed out or blocked by broadcaster. Try another channel.');
      }
    }, 12000);

    const onPlaying = () => {
      if (cancelled) return;
      window.clearTimeout(connectTimer);
      setAudioStatus('playing');
      setAudioError(null);
    };

    const onPause = () => {
      if (cancelled) return;
      setAudioStatus((prev) => (prev === 'error' ? prev : 'paused'));
    };

    const onWaiting = () => {
      if (cancelled) return;
      setAudioStatus((prev) => (prev === 'error' ? prev : 'connecting'));
    };

    const onError = () => {
      if (cancelled) return;
      window.clearTimeout(connectTimer);
      setAudioStatus('error');
      setAudioError('This radio stream is currently offline or unavailable on this network.');
    };

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('error', onError);

    const startPlayback = async () => {
      try {
        audio.volume = volumeRef.current;
        audio.muted = isMutedRef.current;
        await audio.play();
        if (!cancelled) {
          setAudioStatus('playing');
        }
      } catch {
        if (!cancelled) {
          setAudioStatus('error');
          setAudioError('Unable to start this stream automatically. Tap Play or try the next station.');
        }
      }
    };

    if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingTimeOut: 10000,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!cancelled) void startPlayback();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (cancelled || !data.fatal) return;
        window.clearTimeout(connectTimer);
        stopAudioEngine();
        setAudioStatus('error');
        setAudioError('HLS radio stream unavailable. Tap Next Station to continue listening.');
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(audio);
    } else {
      audio.src = streamUrl;
      audio.load();
      void startPlayback();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(connectTimer);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('error', onError);
    };
  }, [activeStation, playTriggerNonce, stopAudioEngine]);

  // Extract top genres dynamically from loaded stations
  const topGenres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const st of stations) {
      for (const tag of st.tags) {
        const clean = tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
        counts.set(clean, (counts.get(clean) || 0) + 1);
      }
    }
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([genre]) => genre);
    return ['All', ...sorted];
  }, [stations]);

  const filteredStations = useMemo(() => {
    const q = stationSearch.trim().toLowerCase();
    return stations.filter((st) => {
      const matchesGenre =
        activeGenre === 'All' ||
        st.tags.some((t) => t.toLowerCase() === activeGenre.toLowerCase());
      if (!matchesGenre) return false;
      if (!q) return true;
      return (
        st.name.toLowerCase().includes(q) ||
        st.language.toLowerCase().includes(q) ||
        st.state.toLowerCase().includes(q) ||
        st.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [stations, stationSearch, activeGenre]);

  const visibleStations = useMemo(
    () => filteredStations.slice(0, visibleLimit),
    [filteredStations, visibleLimit]
  );

  const handleSelectStation = useCallback(
    (station: RadioStation) => {
      if (activeStation?.id === station.id) {
        const audio = audioRef.current;
        if (!audio) return;
        if (audioStatus === 'playing') {
          audio.pause();
          setAudioStatus('paused');
        } else if (audioStatus === 'paused') {
          audio.play().catch(() => {
            setPlayTriggerNonce((n) => n + 1);
          });
        } else {
          setPlayTriggerNonce((n) => n + 1);
        }
        return;
      }
      setActiveStation(station);
      setPlayTriggerNonce((n) => n + 1);
    },
    [activeStation?.id, audioStatus]
  );

  const handleStepStation = useCallback(
    (delta: 1 | -1) => {
      const list = filteredStations.length > 0 ? filteredStations : stations;
      if (list.length === 0) return;
      if (!activeStation) {
        setActiveStation(list[0]);
        setPlayTriggerNonce((n) => n + 1);
        return;
      }
      const idx = list.findIndex((s) => s.id === activeStation.id);
      const nextIdx =
        idx === -1 ? 0 : (idx + delta + list.length) % list.length;
      setActiveStation(list[nextIdx]);
      setPlayTriggerNonce((n) => n + 1);
    },
    [activeStation, filteredStations, stations]
  );

  const handleTogglePlayPause = () => {
    if (!activeStation) {
      const first = filteredStations[0] || stations[0];
      if (first) {
        setActiveStation(first);
        setPlayTriggerNonce((n) => n + 1);
      }
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (audioStatus === 'playing') {
      audio.pause();
      setAudioStatus('paused');
    } else if (audioStatus === 'paused') {
      audio.play().catch(() => setPlayTriggerNonce((n) => n + 1));
    } else {
      setPlayTriggerNonce((n) => n + 1);
    }
  };

  const handleToggleMute = () => {
    const audio = audioRef.current;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audio) {
      audio.muted = nextMuted;
      if (!nextMuted && audio.volume === 0) {
        audio.volume = 0.85;
        setVolume(0.85);
      }
    }
  };

  const handleVolumeChange = (nextVol: number) => {
    setVolume(nextVol);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = nextVol;
      if (nextVol > 0 && isMuted) {
        audio.muted = false;
        setIsMuted(false);
      } else if (nextVol === 0 && !isMuted) {
        audio.muted = true;
        setIsMuted(true);
      }
    }
  };

  const handleRefreshDirectory = () => {
    loadCountryStations(true).then((res) => {
      setStations(res.stations);
      setSourceNote(res.note || null);
      setLoadingStations(false);
    });
  };

  const featuredCountries = useMemo(() => {
    const byIso = new Map(countries.map((c) => [c.iso.toLowerCase(), c]));
    return FEATURED_RADIO_ISOS.map((iso) => byIso.get(iso)).filter(
      (c): c is Country => Boolean(c)
    );
  }, [countries]);

  const filteredCountryMatches = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return [];
    return countries
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.capital.toLowerCase().includes(q) ||
          c.iso.toLowerCase() === q
      )
      .slice(0, 12);
  }, [countries, countrySearch]);

  const markIconFailed = (url: string) => {
    setFailedIcons((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Hidden HTML5 Audio Element managed strictly by lifecycle */}
      <audio ref={audioRef} preload="none" />

      {/* 1. Country Live Radio Header */}
      <section className="flex flex-col justify-between gap-4 rounded-3xl border border-emerald-400/25 bg-[#071022]/90 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <img
            src={`https://flagcdn.com/w80/${selectedCountry.iso}.png`}
            alt={`Flag of ${selectedCountry.name}`}
            referrerPolicy="no-referrer"
            className="h-11 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/20"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/45 bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
                LIVE RADIO
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
              {selectedCountry.name} Online Radio Stations
            </h1>
            <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
              {loadingStations
                ? 'Loading live public radio directory…'
                : `${stations.length} live HTTPS radio ${stations.length === 1 ? 'station' : 'stations'} ready to stream · Anthem & Voice auto-silenced`}
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

          <button
            type="button"
            onClick={() => onOpenLiveTvPage(selectedCountry)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-3.5 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 hover:text-white whitespace-nowrap"
          >
            <Tv className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Watch Live TV</span>
          </button>
        </div>
      </section>

      {/* 2. Persistent Top Neon Audio Player Bar */}
      <section
        aria-label="Live Radio Audio Player"
        className="sticky top-[68px] z-20 overflow-hidden rounded-3xl border border-emerald-400/35 bg-[#061022]/95 p-4 shadow-[0_20px_50px_-20px_rgba(16,185,129,0.45)] backdrop-blur-xl sm:p-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Active Station Info */}
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="relative flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-emerald-400/35 bg-slate-950/90">
              {activeStation?.favicon && !failedIcons.has(activeStation.favicon) ? (
                <img
                  src={activeStation.favicon}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => markIconFailed(activeStation.favicon!)}
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <Radio
                  className={`h-6 w-6 ${
                    audioStatus === 'playing' ? 'text-emerald-400 animate-pulse' : 'text-sky-400'
                  }`}
                  aria-hidden="true"
                />
              )}
              {audioStatus === 'playing' && (
                <span className="absolute right-1 bottom-1 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    audioStatus === 'playing'
                      ? 'text-emerald-300'
                      : audioStatus === 'connecting'
                        ? 'text-amber-300'
                        : audioStatus === 'error'
                          ? 'text-rose-300'
                          : 'text-slate-400'
                  }`}
                >
                  {audioStatus === 'playing'
                    ? 'On Air · Live Audio'
                    : audioStatus === 'connecting'
                      ? 'Connecting Stream…'
                      : audioStatus === 'paused'
                        ? 'Paused'
                        : audioStatus === 'error'
                          ? 'Stream Unavailable'
                          : 'Ready to Listen'}
                </span>
                {activeStation && (
                  <>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span className="tabular-clock text-[11px] font-medium text-cyan-300">
                      {activeStation.bitrate} kbps · {activeStation.codec}
                    </span>
                  </>
                )}
              </div>

              <p className="mt-0.5 truncate text-base font-bold text-white">
                {activeStation
                  ? activeStation.name
                  : stations.length > 0
                    ? `Tap any ${selectedCountry.name} station below or press Play`
                    : `Loading ${selectedCountry.name} radio stations…`}
              </p>

              <p className="truncate text-xs text-slate-400">
                {audioError ? (
                  <span className="text-rose-300">{audioError}</span>
                ) : activeStation ? (
                  [
                    activeStation.language,
                    activeStation.tags.slice(0, 3).join(' · '),
                    activeStation.state,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                ) : (
                  'Public HTTPS radio directory powered by Radio Browser'
                )}
              </p>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:justify-end">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleStepStation(-1)}
                disabled={stations.length === 0}
                aria-label="Previous radio station"
                title="Previous station"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-slate-200 transition-colors hover:border-emerald-400/40 hover:bg-white/[0.12] hover:text-white disabled:opacity-40"
              >
                <SkipBack className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={handleTogglePlayPause}
                disabled={stations.length === 0}
                aria-label={audioStatus === 'playing' ? 'Pause radio' : 'Play radio'}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 text-xs font-bold text-slate-950 shadow-[0_0_24px_-6px_rgba(16,185,129,0.75)] transition-all hover:brightness-110 disabled:opacity-40"
              >
                {audioStatus === 'connecting' ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : audioStatus === 'playing' ? (
                  <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
                ) : (
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                )}
                <span>
                  {audioStatus === 'connecting'
                    ? 'Tuning…'
                    : audioStatus === 'playing'
                      ? 'Pause'
                      : 'Play'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStepStation(1)}
                disabled={stations.length === 0}
                aria-label="Next radio station"
                title="Next station"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-slate-200 transition-colors hover:border-emerald-400/40 hover:bg-white/[0.12] hover:text-white disabled:opacity-40"
              >
                <SkipForward className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={isMuted ? 'Unmute radio' : 'Mute radio'}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                  isMuted
                    ? 'border-amber-400/45 bg-amber-500/18 text-amber-200'
                    : 'border-white/12 bg-white/[0.06] text-slate-200 hover:bg-white/[0.12]'
                }`}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                aria-label="Radio volume"
                className="hidden h-1.5 w-24 cursor-pointer accent-emerald-400 sm:block"
              />

              {activeStation?.homepage && (
                <a
                  href={activeStation.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit ${activeStation.name} website`}
                  title="Station Website"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-slate-300 transition-colors hover:border-sky-400/40 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Helpful 1-tap recovery row when a specific stream URL fails */}
        {audioStatus === 'error' && activeStation && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-rose-400/20 pt-3 text-xs">
            <span className="text-rose-200">
              Stream failed for <strong>{activeStation.name}</strong>. Public radio feeds occasionally go offline.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPlayTriggerNonce((n) => n + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.07] px-3 py-1.5 font-semibold text-white hover:bg-white/[0.14]"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={() => handleStepStation(1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 font-bold text-slate-950 hover:bg-emerald-300"
              >
                <span>Try Next Station</span>
                <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. Country Switcher & Station Filter Controls */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Search Stations in Selected Country */}
        <div className="rounded-3xl border border-white/[0.09] bg-slate-900/60 p-4 sm:p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="radio-station-search"
              className="text-xs font-bold uppercase tracking-wider text-emerald-300"
            >
              Filter {selectedCountry.name} Stations ({filteredStations.length})
            </label>
            <button
              type="button"
              onClick={handleRefreshDirectory}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loadingStations ? 'animate-spin text-emerald-400' : ''}`}
                aria-hidden="true"
              />
              <span>Refresh List</span>
            </button>
          </div>

          <div className="relative mt-2.5">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="radio-station-search"
              type="search"
              value={stationSearch}
              onChange={(e) => {
                setStationSearch(e.target.value);
                setVisibleLimit(INITIAL_VISIBLE_STATIONS);
              }}
              placeholder={`Search ${selectedCountry.name} station name, genre (news, pop, jazz), or language…`}
              className="h-11 w-full rounded-xl border border-white/12 bg-slate-950/85 pr-9 pl-10 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 sm:text-sm"
            />
            {stationSearch && (
              <button
                type="button"
                onClick={() => setStationSearch('')}
                aria-label="Clear station search"
                className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {topGenres.length > 1 && (
            <div className="no-scrollbar mt-3 flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {topGenres.map((genre) => {
                const active = activeGenre === genre;
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => {
                      setActiveGenre(genre);
                      setVisibleLimit(INITIAL_VISIBLE_STATIONS);
                    }}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-emerald-400 text-slate-950'
                        : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.1] hover:text-white'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Switch Country Across All 215 Nations */}
        <div className="rounded-3xl border border-white/[0.09] bg-slate-900/60 p-4 sm:p-5 lg:col-span-5">
          <label
            htmlFor="radio-country-search"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-300"
          >
            <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Switch Country ({countries.length} Nations)</span>
          </label>

          <div className="relative mt-2.5">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="radio-country-search"
              type="search"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder="Jump to any country (Sri Lanka, Japan, UK…)"
              className="h-11 w-full rounded-xl border border-white/12 bg-slate-950/85 pr-9 pl-10 text-xs text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 sm:text-sm"
            />
            {countrySearch && (
              <button
                type="button"
                onClick={() => setCountrySearch('')}
                aria-label="Clear country search"
                className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {filteredCountryMatches.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {filteredCountryMatches.map((c) => (
                <button
                  key={c.iso}
                  type="button"
                  onClick={() => {
                    setCountrySearch('');
                    onSelectCountryCode(c.iso);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    c.iso.toLowerCase() === selectedCountry.iso.toLowerCase()
                      ? 'border-sky-400/55 bg-sky-500/20 text-white'
                      : 'border-white/10 bg-slate-950/70 text-slate-200 hover:border-sky-400/40 hover:text-white'
                  }`}
                >
                  <img
                    src={`https://flagcdn.com/w40/${c.iso}.png`}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-3 w-4.5 rounded-[2px] object-cover"
                  />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="no-scrollbar mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {featuredCountries.map((c) => {
                const active = c.iso.toLowerCase() === selectedCountry.iso.toLowerCase();
                return (
                  <button
                    key={c.iso}
                    type="button"
                    onClick={() => onSelectCountryCode(c.iso)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'border-sky-400/55 bg-sky-500/20 text-white'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-sky-400/35 hover:text-white'
                    }`}
                  >
                    <img
                      src={`https://flagcdn.com/w40/${c.iso}.png`}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-3 w-4.5 rounded-[2px] object-cover"
                    />
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Optional Fallback Directory Notice */}
      {sourceNote && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          {sourceNote}
        </div>
      )}

      {/* 4. Complete Scrollable Station Directory */}
      <section aria-label={`${selectedCountry.name} radio channels list`} className="space-y-4">
        {loadingStations ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div
                key={idx}
                className="flex h-24 animate-pulse items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-slate-900/50 p-4"
              >
                <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 rounded bg-slate-800" />
                  <div className="h-3 w-1/2 rounded bg-slate-800/70" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleStations.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.08] bg-slate-900/55 px-6 py-12 text-center">
            <Radio className="mx-auto h-8 w-8 text-slate-500" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-white">No matching radio stations</h2>
            <p className="mt-1 text-xs text-slate-400">
              Try clearing your search or selecting a different genre tag.
            </p>
            <button
              type="button"
              onClick={() => {
                setStationSearch('');
                setActiveGenre('All');
              }}
              className="mt-4 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300"
            >
              Show All {stations.length} Stations
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleStations.map((station) => {
                const isSelected = activeStation?.id === station.id;
                const isPlayingNow = isSelected && audioStatus === 'playing';
                const isConnectingNow = isSelected && audioStatus === 'connecting';
                const hasIcon = Boolean(station.favicon && !failedIcons.has(station.favicon));

                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => handleSelectStation(station)}
                    className={`group flex items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      isSelected
                        ? 'border-emerald-400/60 bg-emerald-500/15 shadow-[0_0_28px_-12px_rgba(16,185,129,0.65)]'
                        : 'border-white/[0.08] bg-slate-900/60 hover:border-sky-400/40 hover:bg-slate-900/95'
                    }`}
                  >
                    {/* Station Favicon / Emblem */}
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-950/90">
                      {hasIcon && station.favicon ? (
                        <img
                          src={station.favicon}
                          alt=""
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={() => markIconFailed(station.favicon!)}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <Radio
                          className={`h-5 w-5 ${
                            isSelected ? 'text-emerald-300' : 'text-sky-400/80'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {/* Station Metadata */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{station.name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-300">
                        {station.tags.length > 0
                          ? station.tags.slice(0, 3).join(' · ')
                          : 'Live Radio Broadcast'}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="truncate">{station.language}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-clock shrink-0 text-cyan-300/90">
                          {station.bitrate}k {station.codec}
                        </span>
                      </div>
                    </div>

                    {/* Play / Playing Indicator */}
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                        isPlayingNow
                          ? 'border-emerald-400/60 bg-emerald-400 text-slate-950'
                          : isConnectingNow
                            ? 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                            : 'border-white/12 bg-white/[0.05] text-slate-200 group-hover:border-emerald-400/45 group-hover:bg-emerald-400/15 group-hover:text-emerald-300'
                      }`}
                    >
                      {isConnectingNow ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : isPlayingNow ? (
                        <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
                      ) : (
                        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredStations.length > visibleStations.length && (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVisibleLimit((n) => n + 60)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 hover:text-white"
                >
                  <span>
                    Load More Stations ({visibleStations.length} of {filteredStations.length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleLimit(filteredStations.length)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-4 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.12] hover:text-white"
                >
                  <span>Show All {filteredStations.length}</span>
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
