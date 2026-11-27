import React, { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  AlertTriangle,
  Captions,
  FastForward,
  Film,
  Maximize,
  Minimize,
  Pause,
  Play,
  RefreshCw,
  Rewind,
  Volume2,
  VolumeX,
} from 'lucide-react';

export interface DirectMovieSource {
  id: string;
  label: string;
  url: string;
  format: 'mp4' | 'hls';
  qualityLabel?: string;
}

export interface MovieCaptionTrack {
  label: string;
  lang: string;
  url: string;
  format: 'vtt' | 'srt';
}

interface NativeMoviePlayerProps {
  title: string;
  posterUrl?: string | null;
  sources: DirectMovieSource[];
  captions?: MovieCaptionTrack[];
  autoPlay?: boolean;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

function formatClockTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  }
  return `${m}:${ss}`;
}

function srtToWebVtt(srtText: string): string {
  const normalized = srtText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return `WEBVTT\n\n${normalized}`;
}

export const NativeMoviePlayer: React.FC<NativeMoviePlayerProps> = React.memo(
  ({ title, posterUrl, sources, captions = [], autoPlay = false }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);

    const [activeSourceIdx, setActiveSourceIdx] = useState<number>(0);
    const [reloadNonce, setReloadNonce] = useState<number>(0);

    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isBuffering, setIsBuffering] = useState<boolean>(false);
    const [hasStarted, setHasStarted] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [bufferedEnd, setBufferedEnd] = useState<number>(0);
    const [isSeeking, setIsSeeking] = useState<boolean>(false);

    const [volume, setVolume] = useState<number>(0.9);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [playbackRate, setPlaybackRate] = useState<number>(1);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(false);
    const [captionBlobUrl, setCaptionBlobUrl] = useState<string | null>(null);
    const [captionsAvailable, setCaptionsAvailable] = useState<boolean>(false);

    const activeSource = sources[activeSourceIdx] || sources[0] || null;
    const sourcesKey = sources.map((s) => s.url).join('|');

    // Reset active source index when the movie's source list changes
    useEffect(() => {
      setActiveSourceIdx(0);
      setReloadNonce(0);
      setCurrentTime(0);
      setDuration(0);
      setBufferedEnd(0);
      setHasStarted(false);
      setIsPlaying(false);
      setErrorMessage(null);
    }, [sourcesKey]);

    // Optionally prepare WebVTT Blob URL for captions (fails silently if CORS-blocked, never breaking video playback)
    useEffect(() => {
      let cancelled = false;
      let createdBlobUrl: string | null = null;
      setCaptionBlobUrl(null);
      setCaptionsAvailable(false);
      setCaptionsEnabled(false);

      const primaryTrack = captions[0];
      if (!primaryTrack?.url) return;

      const loadCaption = async () => {
        try {
          const res = await fetch(primaryTrack.url);
          if (!res.ok || cancelled) return;
          const raw = await res.text();
          if (cancelled || !raw.trim()) return;
          const vttText =
            primaryTrack.format === 'srt' || !raw.trimStart().startsWith('WEBVTT')
              ? srtToWebVtt(raw)
              : raw;
          const blob = new Blob([vttText], { type: 'text/vtt' });
          createdBlobUrl = URL.createObjectURL(blob);
          setCaptionBlobUrl(createdBlobUrl);
          setCaptionsAvailable(true);
        } catch {
          // Caption host didn't allow CORS text fetch; keep video playback 100% unaffected
        }
      };

      void loadCaption();
      return () => {
        cancelled = true;
        if (createdBlobUrl) {
          URL.revokeObjectURL(createdBlobUrl);
        }
      };
    }, [captions]);

    // Toggle HTML5 textTrack visibility when user clicks CC
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !video.textTracks) return;
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = captionsEnabled ? 'showing' : 'hidden';
      }
    }, [captionsEnabled, captionBlobUrl]);

    // Sync fullscreen state with browser events
    useEffect(() => {
      const onFsChange = () => {
        setIsFullscreen(Boolean(document.fullscreenElement));
      };
      document.addEventListener('fullscreenchange', onFsChange);
      return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    // Attach direct MP4 or HLS.js stream cleanly without third-party iframes
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !activeSource?.url) return;

      let cancelled = false;
      let hlsInstance: Hls | null = null;
      let networkRetries = 0;
      let mediaRetries = 0;

      setErrorMessage(null);
      setIsBuffering(true);

      const cleanupVideo = () => {
        if (hlsInstance) {
          hlsInstance.destroy();
          hlsInstance = null;
        }
        hlsRef.current = null;
        video.pause();
        video.removeAttribute('src');
        video.load();
      };

      const isHls =
        activeSource.format === 'hls' || /\.m3u8(\?|$)/i.test(activeSource.url);

      if (isHls) {
        if (Hls.isSupported()) {
          hlsInstance = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: 60,
            maxMaxBufferLength: 120,
            backBufferLength: 60,
            fragLoadingTimeOut: 20000,
            manifestLoadingTimeOut: 15000,
            fragLoadingMaxRetry: 3,
            manifestLoadingMaxRetry: 2,
          });
          hlsRef.current = hlsInstance;
          hlsInstance.loadSource(activeSource.url);
          hlsInstance.attachMedia(video);

          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            if (cancelled) return;
            setIsBuffering(false);
            if (autoPlay) {
              void video.play().catch(() => {
                // Browser autoplay policy; user can click Play
              });
            }
          });

          hlsInstance.on(Hls.Events.ERROR, (_evt, data) => {
            if (cancelled || !data.fatal) return;
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 2) {
              networkRetries += 1;
              hlsInstance?.startLoad();
              return;
            }
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetries < 2) {
              mediaRetries += 1;
              hlsInstance?.recoverMediaError();
              return;
            }
            setIsBuffering(false);
            setErrorMessage(
              'This HLS stream could not be loaded right now. Try switching to another stream source or reloading.'
            );
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = activeSource.url;
          video.load();
        } else {
          setIsBuffering(false);
          setErrorMessage('Your browser does not support HLS playback for this stream.');
        }
      } else {
        video.src = activeSource.url;
        video.load();
        if (autoPlay) {
          void video.play().catch(() => {
            // Autoplay blocked; wait for tap
          });
        }
      }

      return () => {
        cancelled = true;
        cleanupVideo();
      };
    }, [activeSource?.url, activeSource?.format, reloadNonce, autoPlay]);

    // Keep volume, muted, and playbackRate applied to the video element
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      video.volume = volume;
      video.muted = isMuted;
      video.playbackRate = playbackRate;
    }, [volume, isMuted, playbackRate]);

    const handleTogglePlay = useCallback(async () => {
      const video = videoRef.current;
      if (!video || !activeSource) return;
      if (video.paused || video.ended) {
        try {
          setErrorMessage(null);
          await video.play();
          setHasStarted(true);
        } catch {
          // If unmuted autoplay failed, retry muted gracefully
          try {
            video.muted = true;
            setIsMuted(true);
            await video.play();
            setHasStarted(true);
          } catch {
            setErrorMessage('Playback could not start. Click Reload or switch source.');
          }
        }
      } else {
        video.pause();
      }
    }, [activeSource]);

    const handleSkip = useCallback((deltaSeconds: number) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration)) return;
      const target = Math.max(0, Math.min(video.duration, video.currentTime + deltaSeconds));
      video.currentTime = target;
      setCurrentTime(target);
    }, []);

    const handleSeekChange = useCallback((value: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = value;
      setCurrentTime(value);
    }, []);

    const handleVolumeChange = useCallback((nextVal: number) => {
      setVolume(nextVal);
      if (nextVal > 0) setIsMuted(false);
    }, []);

    const handleToggleMute = useCallback(() => {
      setIsMuted((m) => !m);
    }, []);

    const handleCycleSpeed = useCallback(() => {
      setPlaybackRate((current) => {
        const idx = PLAYBACK_RATES.indexOf(current as (typeof PLAYBACK_RATES)[number]);
        return PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
      });
    }, []);

    const handleToggleFullscreen = useCallback(async () => {
      const target = containerRef.current;
      if (!target) return;
      try {
        if (!document.fullscreenElement) {
          await target.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch {
        // Ignore fullscreen API rejections
      }
    }, []);

    const handleVideoTimeUpdate = useCallback(() => {
      const video = videoRef.current;
      if (!video || isSeeking) return;
      setCurrentTime(video.currentTime);
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
      if (video.buffered && video.buffered.length > 0) {
        setBufferedEnd(video.buffered.end(video.buffered.length - 1));
      }
    }, [isSeeking]);

    const handleVideoError = useCallback(() => {
      // Try failing over automatically to the next direct source if available
      if (activeSourceIdx + 1 < sources.length) {
        setActiveSourceIdx((idx) => idx + 1);
        return;
      }
      setIsBuffering(false);
      setIsPlaying(false);
      setErrorMessage(
        'Could not load the direct video file from the archive host. Click Reload or try another source.'
      );
    }, [activeSourceIdx, sources.length]);

    // Keyboard shortcuts when player container is focused
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
        if (e.key === ' ' || e.key.toLowerCase() === 'k') {
          e.preventDefault();
          void handleTogglePlay();
        } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'j') {
          e.preventDefault();
          handleSkip(-10);
        } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'l') {
          e.preventDefault();
          handleSkip(10);
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          handleToggleMute();
        } else if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          void handleToggleFullscreen();
        }
      },
      [handleTogglePlay, handleSkip, handleToggleMute, handleToggleFullscreen]
    );

    const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
    const bufferedPercent = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;

    return (
      <div className="space-y-3">
        {/* Source Switcher & Ad-Free Direct Playback Header */}
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-white/[0.09] bg-[#071022]/90 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/18 text-sky-400">
              <Film className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-white">
                Ad-Free Native Cinema Player
              </h2>
              <p className="truncate text-xs text-slate-400">
                Direct {activeSource?.format === 'hls' ? 'HLS (.m3u8)' : 'MP4'} playback · Zero
                pop-up ads or third-party embed walls
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sources.length > 1 &&
              sources.map((src, idx) => {
                const isActive = idx === activeSourceIdx;
                return (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => {
                      setActiveSourceIdx(idx);
                      setReloadNonce((n) => n + 1);
                    }}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-sky-500 text-slate-950 shadow-[0_0_16px_-4px_rgba(56,189,248,0.8)]'
                        : 'border border-white/12 bg-white/[0.05] text-slate-200 hover:border-sky-400/45 hover:text-white'
                    }`}
                  >
                    <span>{src.label}</span>
                    {src.qualityLabel && (
                      <span className={isActive ? 'text-slate-900/75' : 'text-slate-400'}>
                        · {src.qualityLabel}
                      </span>
                    )}
                  </button>
                );
              })}

            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setReloadNonce((n) => n + 1);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-400/45 hover:text-white whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
              <span>Reload</span>
            </button>
          </div>
        </div>

        {/* Dark Neon Native HTML5 / HLS Video Stage */}
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="overflow-hidden rounded-3xl border border-sky-400/35 bg-[#040814] shadow-[0_24px_64px_-22px_rgba(14,165,233,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <div className="relative aspect-video w-full bg-black">
            <video
              ref={videoRef}
              playsInline
              preload="metadata"
              poster={posterUrl || undefined}
              onClick={() => void handleTogglePlay()}
              onPlay={() => {
                setIsPlaying(true);
                setHasStarted(true);
                setIsBuffering(false);
              }}
              onPause={() => setIsPlaying(false)}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => {
                setIsBuffering(false);
                setErrorMessage(null);
              }}
              onCanPlay={() => setIsBuffering(false)}
              onLoadedMetadata={() => {
                const v = videoRef.current;
                if (v && Number.isFinite(v.duration) && v.duration > 0) {
                  setDuration(v.duration);
                }
                setIsBuffering(false);
              }}
              onTimeUpdate={handleVideoTimeUpdate}
              onProgress={handleVideoTimeUpdate}
              onError={handleVideoError}
              className="h-full w-full cursor-pointer bg-black object-contain"
            >
              {captionBlobUrl && (
                <track
                  kind="subtitles"
                  label="English"
                  srcLang="en"
                  src={captionBlobUrl}
                  default={captionsEnabled}
                />
              )}
            </video>

            {/* Center Play Button Overlay Before Playback Starts */}
            {!isPlaying && !isBuffering && !errorMessage && (
              <button
                type="button"
                onClick={() => void handleTogglePlay()}
                aria-label={`Play ${title}`}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 transition-colors hover:bg-black/25"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-500 text-slate-950 shadow-[0_0_36px_rgba(56,189,248,0.8)] transition-transform duration-200 hover:scale-105">
                  <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
                </span>
                {!hasStarted && (
                  <span className="mt-3 rounded-xl bg-[#040814]/80 px-3.5 py-1.5 text-xs font-semibold text-white">
                    Click to play {title}
                  </span>
                )}
              </button>
            )}

            {/* Buffering Spinner */}
            {isBuffering && !errorMessage && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="inline-flex items-center gap-2.5 rounded-2xl border border-sky-400/35 bg-[#050b19]/90 px-4 py-2.5 text-xs font-semibold text-sky-200 shadow-xl">
                  <RefreshCw className="h-4 w-4 animate-spin text-sky-400" aria-hidden="true" />
                  <span>Buffering stream…</span>
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {errorMessage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#040814]/90 p-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-400/35 bg-rose-500/15 text-rose-300">
                  <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="mt-3 max-w-md text-sm font-semibold text-white">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setReloadNonce((n) => n + 1);
                  }}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-sky-500 px-4 text-xs font-bold text-slate-950 hover:bg-sky-400"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <span>Retry Direct Stream</span>
                </button>
              </div>
            )}
          </div>

          {/* Custom Dark-Neon Controls Deck */}
          <div className="space-y-3 border-t border-white/[0.08] bg-[#071022]/95 px-4 py-3.5 sm:px-5">
            {/* Seek Timeline Bar */}
            <div className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-right text-[11px] font-semibold text-slate-300 tabular-nums">
                {formatClockTime(currentTime)}
              </span>

              <div className="relative flex flex-1 items-center">
                <div className="pointer-events-none h-1.5 w-full overflow-hidden rounded-full bg-white/12">
                  <div
                    className="h-full bg-white/25 transition-all"
                    style={{ width: `${bufferedPercent}%` }}
                  />
                </div>
                <div
                  className="pointer-events-none absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.85)]"
                  style={{ width: `${progressPercent}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.5}
                  value={currentTime}
                  disabled={duration <= 0}
                  onMouseDown={() => setIsSeeking(true)}
                  onMouseUp={() => setIsSeeking(false)}
                  onTouchStart={() => setIsSeeking(true)}
                  onTouchEnd={() => setIsSeeking(false)}
                  onChange={(e) => handleSeekChange(Number(e.target.value))}
                  aria-label="Seek timeline"
                  className="absolute inset-0 h-5 w-full cursor-pointer opacity-0 disabled:cursor-default"
                />
              </div>

              <span className="w-12 shrink-0 text-[11px] font-medium text-slate-400 tabular-nums">
                {duration > 0 ? formatClockTime(duration) : '--:--'}
              </span>
            </div>

            {/* Control Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Left: Play/Pause, -10s, +10s, Volume */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleTogglePlay()}
                  aria-label={isPlaying ? 'Pause movie' : 'Play movie'}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 text-xs font-bold text-slate-950 transition-colors hover:bg-sky-400 whitespace-nowrap"
                >
                  {isPlaying ? (
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
                  onClick={() => handleSkip(-10)}
                  aria-label="Rewind 10 seconds"
                  title="Rewind 10s"
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-white/12 bg-white/[0.05] px-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-400/45 hover:text-white"
                >
                  <Rewind className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  <span className="hidden sm:inline tabular-nums">10s</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSkip(10)}
                  aria-label="Forward 10 seconds"
                  title="Forward 10s"
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-white/12 bg-white/[0.05] px-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-400/45 hover:text-white"
                >
                  <FastForward className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  <span className="hidden sm:inline tabular-nums">10s</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleMute}
                  aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                  className={`inline-flex h-9 items-center justify-center rounded-xl border px-2.5 text-xs font-semibold transition-colors ${
                    isMuted
                      ? 'border-amber-400/45 bg-amber-500/18 text-amber-200'
                      : 'border-white/12 bg-white/[0.05] text-slate-200 hover:border-sky-400/45 hover:text-white'
                  }`}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-sky-400" aria-hidden="true" />
                  )}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  aria-label="Audio volume"
                  className="hidden h-1.5 w-20 cursor-pointer accent-sky-400 sm:block"
                />
              </div>

              {/* Right: Speed, Captions, Fullscreen */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCycleSpeed}
                  aria-label={`Playback speed ${playbackRate}x`}
                  title="Change playback speed"
                  className="inline-flex h-9 items-center rounded-xl border border-white/12 bg-white/[0.05] px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-400/45 hover:text-white tabular-nums whitespace-nowrap"
                >
                  {playbackRate}x
                </button>

                {captionsAvailable && (
                  <button
                    type="button"
                    onClick={() => setCaptionsEnabled((v) => !v)}
                    aria-label={captionsEnabled ? 'Disable captions' : 'Enable captions'}
                    aria-pressed={captionsEnabled}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                      captionsEnabled
                        ? 'border-sky-400/55 bg-sky-500/20 text-sky-200'
                        : 'border-white/12 bg-white/[0.05] text-slate-300 hover:border-sky-400/45 hover:text-white'
                    }`}
                  >
                    <Captions className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">CC</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void handleToggleFullscreen()}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-400/45 hover:text-white whitespace-nowrap"
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
          </div>
        </div>
      </div>
    );
  }
);

NativeMoviePlayer.displayName = 'NativeMoviePlayer';
