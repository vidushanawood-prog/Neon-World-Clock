import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Music, Pause, Play, Volume2, VolumeX, X } from 'lucide-react';
import type { Country } from '../data/countries';
import {
  getBaselineAnthemInfo,
  resolveNationalAnthem,
  type NationalAnthemInfo,
} from '../services/nationalAnthem';

export type AnthemPlaybackStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'ready'
  | 'unavailable';

export interface NationalAnthemController {
  country: Country | null;
  anthem: NationalAnthemInfo | null;
  status: AnthemPlaybackStatus;
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  selectCountryAnthem: (country: Country, autoPlay?: boolean) => void;
  togglePlayPause: () => void;
  toggleMute: () => void;
  stopAnthem: () => void;
}

function formatAudioSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Single authoritative HTMLAudioElement controller for National Anthems.
 * Strictly emits onPlayingChange(true) on `play`/`playing` and
 * onPlayingChange(false) on `ended`, `pause`, `error`, or `stop`
 * so the Continuous AI Voice Assistant never speaks over an active anthem.
 */
export function useNationalAnthem(
  onPlayingChange: (playing: boolean) => void
): NationalAnthemController {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestSeqRef = useRef<number>(0);
  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;

  const [country, setCountry] = useState<Country | null>(null);
  const [anthem, setAnthem] = useState<NationalAnthemInfo | null>(null);
  const [status, setStatus] = useState<AnthemPlaybackStatus>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const emitPlaying = useCallback((nextPlaying: boolean) => {
    setIsPlaying(nextPlaying);
    onPlayingChangeRef.current(nextPlaying);
  }, []);

  // Initialize singleton HTMLAudioElement and bind lifecycle events
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const handlePlay = () => {
      setStatus('playing');
      emitPlaying(true);
    };

    const handlePause = () => {
      setStatus((prev) => (prev === 'loading' || prev === 'unavailable' ? prev : 'paused'));
      emitPlaying(false);
    };

    const handleEnded = () => {
      setStatus('paused');
      setCurrentTime(0);
      emitPlaying(false);
    };

    const handleError = () => {
      setStatus('unavailable');
      emitPlaying(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('playing', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('playing', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioRef.current = null;
      emitPlaying(false);
    };
  }, [emitPlaying]);

  const stopAnthem = useCallback(() => {
    requestSeqRef.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setCurrentTime(0);
    setStatus('idle');
    emitPlaying(false);
  }, [emitPlaying]);

  const selectCountryAnthem = useCallback(
    (nextCountry: Country, autoPlay = true) => {
      const seq = ++requestSeqRef.current;
      const audio = audioRef.current;

      // Immediately stop any previously playing anthem first
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      emitPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setCountry(nextCountry);

      const baseline = getBaselineAnthemInfo(nextCountry);
      setAnthem(baseline);
      setStatus('loading');

      void resolveNationalAnthem(nextCountry).then((resolved) => {
        if (requestSeqRef.current !== seq) return;
        setAnthem(resolved);

        if (!resolved.audioUrl || !audioRef.current) {
          setStatus('unavailable');
          emitPlaying(false);
          return;
        }

        const el = audioRef.current;
        el.src = resolved.audioUrl;
        el.currentTime = 0;
        el.muted = isMuted;

        if (!autoPlay) {
          setStatus('ready');
          return;
        }

        const playPromise = el.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => {
              if (requestSeqRef.current !== seq) {
                el.pause();
                return;
              }
              setStatus('playing');
              emitPlaying(true);
            })
            .catch(() => {
              if (requestSeqRef.current !== seq) return;
              // Browser autoplay or codec fallback: let user tap Play without leaving voice locked
              setStatus(el.error ? 'unavailable' : 'ready');
              emitPlaying(false);
            });
        }
      });
    },
    [emitPlaying, isMuted]
  );

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !anthem?.audioUrl) return;

    if (!audio.paused && !audio.ended) {
      audio.pause();
      setStatus('paused');
      emitPlaying(false);
      return;
    }

    if (audio.src !== anthem.audioUrl) {
      audio.src = anthem.audioUrl;
    }
    audio.muted = isMuted;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          setStatus('playing');
          emitPlaying(true);
        })
        .catch(() => {
          setStatus('unavailable');
          emitPlaying(false);
        });
    }
  }, [anthem?.audioUrl, emitPlaying, isMuted]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    setIsMuted((prev) => {
      const next = !prev;
      if (audio) audio.muted = next;
      return next;
    });
  }, []);

  return {
    country,
    anthem,
    status,
    isPlaying,
    isMuted,
    currentTime,
    duration,
    selectCountryAnthem,
    togglePlayPause,
    toggleMute,
    stopAnthem,
  };
}

interface NationalAnthemBarProps {
  controller: NationalAnthemController;
  variant?: 'modal' | 'dashboard';
}

export const NationalAnthemBar: React.FC<NationalAnthemBarProps> = ({
  controller,
  variant = 'modal',
}) => {
  const {
    country,
    anthem,
    status,
    isPlaying,
    isMuted,
    currentTime,
    duration,
    togglePlayPause,
    toggleMute,
    stopAnthem,
  } = controller;

  if (!country || !anthem) return null;
  if (variant === 'dashboard' && status === 'idle') return null;

  const progressPct =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const statusText =
    status === 'loading'
      ? 'Loading national anthem…'
      : status === 'playing'
        ? 'Playing · Voice assistant paused'
        : status === 'ready'
          ? 'Ready · Press Play'
          : status === 'paused'
            ? 'Paused'
            : 'Audio unavailable in this browser';

  const canControlAudio = Boolean(anthem.audioUrl) && status !== 'loading' && status !== 'unavailable';

  return (
    <div
      role="region"
      aria-label={`National Anthem Player for ${country.name}`}
      className={
        variant === 'modal'
          ? 'rounded-2xl border border-amber-400/25 bg-gradient-to-r from-[#0b162c] via-[#0a1326] to-[#081020] p-3.5 sm:p-4'
          : 'mb-6 rounded-2xl border border-amber-300/60 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-amber-400/30 dark:bg-[#081226]/92'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
              isPlaying
                ? 'border-amber-400/50 bg-amber-400/18 text-amber-300'
                : 'border-sky-400/25 bg-sky-500/12 text-sky-400'
            }`}
          >
            <Music className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-amber-600 dark:text-amber-300">
              <span>National Anthem</span>
              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>
              <span className="text-slate-500 dark:text-slate-400">{country.name}</span>
            </div>
            <p
              className={`truncate text-sm font-bold ${
                variant === 'modal' ? 'text-white' : 'text-slate-950 dark:text-white'
              }`}
            >
              {anthem.title}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {statusText}
              {duration > 0 && (
                <span className="tabular-clock ml-2 text-slate-400">
                  {formatAudioSeconds(currentTime)} / {formatAudioSeconds(duration)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Play / Pause / Mute Controls */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={togglePlayPause}
            disabled={!canControlAudio}
            aria-label={isPlaying ? 'Pause national anthem' : 'Play national anthem'}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              isPlaying
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={toggleMute}
            disabled={!canControlAudio}
            aria-label={isMuted ? 'Unmute national anthem' : 'Mute national anthem'}
            title={isMuted ? 'Unmute anthem' : 'Mute anthem'}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              variant === 'modal'
                ? 'border-white/12 bg-white/[0.06] text-slate-200 hover:bg-white/[0.12]'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/12 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.12]'
            }`}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 text-rose-400" aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {variant === 'dashboard' && (
            <button
              type="button"
              onClick={stopAnthem}
              aria-label="Stop and hide anthem bar"
              title="Stop anthem"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/12 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.12]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Subtle Playback Progress Track */}
      {duration > 0 && (
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
          <div
            style={{ width: `${progressPct}%` }}
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-sky-400 to-cyan-400 transition-[width] duration-200"
          />
        </div>
      )}
    </div>
  );
};
