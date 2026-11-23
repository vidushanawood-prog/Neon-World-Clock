import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, RotateCcw, ShieldCheck } from 'lucide-react';

interface HumanVerificationGateProps {
  verified: boolean;
  onVerifyChange: (verified: boolean) => void;
  resetSignal?: number;
}

/**
 * Interactive Neon "Human Verification" Gate:
 * Combines a tactile Neon Slide-to-Unlock rail with a synchronized Rotating Orbital Ring Alignment dial.
 * Supports desktop mouse drag, mobile touch (Pointer Events + touch-action: none), and keyboard access.
 */
export const HumanVerificationGate: React.FC<HumanVerificationGateProps> = ({
  verified,
  onVerifyChange,
  resetSignal = 0,
}) => {
  // Randomized initial angular misalignment so each challenge feels genuine (-215° to -140°)
  const [startAngle, setStartAngle] = useState<number>(() => -Math.round(145 + Math.random() * 65));
  const [progress, setProgress] = useState<number>(verified ? 1 : 0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [trackWidth, setTrackWidth] = useState<number>(0);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ startX: number; initialProgress: number } | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => setTrackWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleReset = useCallback(() => {
    setStartAngle(-Math.round(145 + Math.random() * 65));
    setProgress(0);
    setIsDragging(false);
    onVerifyChange(false);
  }, [onVerifyChange]);

  // Reset cleanly when parent signals a tab switch or form reset
  useEffect(() => {
    if (resetSignal > 0) {
      setStartAngle(-Math.round(145 + Math.random() * 65));
      setProgress(0);
      setIsDragging(false);
    }
  }, [resetSignal]);

  const completeVerification = useCallback(() => {
    setProgress(1);
    setIsDragging(false);
    onVerifyChange(true);
  }, [onVerifyChange]);

  const updateProgressFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || verified) return;

      const rect = track.getBoundingClientRect();
      const thumbSize = 44;
      const usableWidth = Math.max(1, rect.width - thumbSize - 8);
      const rawX = clientX - rect.left - thumbSize / 2 - 4;
      const clamped = Math.max(0, Math.min(1, rawX / usableWidth));

      if (clamped >= 0.94) {
        completeVerification();
      } else {
        setProgress(clamped);
      }
    },
    [verified, completeVerification]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (verified) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = { startX: e.clientX, initialProgress: progress };
    updateProgressFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || verified) return;
    updateProgressFromClientX(e.clientX);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
    dragStartRef.current = null;
    if (progress < 0.94 && !verified) {
      // Spring back cleanly if user released before orbital lock
      setProgress(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (verified) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(1, progress + 0.2);
      if (next >= 0.94) completeVerification();
      else setProgress(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setProgress((p) => Math.max(0, p - 0.2));
    } else if (e.key === 'End') {
      e.preventDefault();
      completeVerification();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setProgress(0);
    }
  };

  const currentAngle = verified ? 0 : startAngle * (1 - progress);
  const absDelta = Math.abs(Math.round(currentAngle));
  const isNearLock = !verified && progress > 0.78;

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors duration-300 ${
        verified
          ? 'border-emerald-400/45 bg-emerald-500/[0.08] shadow-[0_0_24px_-8px_rgba(16,185,129,0.5)]'
          : 'border-sky-400/20 bg-slate-950/75'
      }`}
    >
      {/* Top Row: Orbital Alignment Dial + Status Readout */}
      <div className="flex items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Interactive Rotating Orbital Alignment Ring SVG */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            <svg viewBox="0 0 64 64" className="h-14 w-14 overflow-visible" aria-hidden="true">
              {/* Outer static dashed telemetry ring */}
              <circle
                cx="32"
                cy="32"
                r="27"
                fill="none"
                stroke={verified ? 'rgba(52, 211, 153, 0.35)' : 'rgba(56, 189, 248, 0.22)'}
                strokeWidth="1.25"
                strokeDasharray="3 3"
              />
              {/* Top 12-o'clock Target Lock Reticle */}
              <path
                d="M27 3.5 L32 8 L37 3.5"
                fill="none"
                stroke={verified ? '#34d399' : '#38bdf8'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="32"
                cy="11"
                r="2.4"
                fill={verified ? '#34d399' : 'rgba(56, 189, 248, 0.25)'}
                stroke={verified ? '#34d399' : '#38bdf8'}
                strokeWidth="1.25"
              />

              {/* Rotating Inner Orbital Lock Ring */}
              <g
                style={{
                  transform: `rotate(${currentAngle}deg)`,
                  transformOrigin: '32px 32px',
                  transition: isDragging ? 'none' : 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <circle
                  cx="32"
                  cy="32"
                  r="20.5"
                  fill="none"
                  stroke={verified ? '#34d399' : isNearLock ? '#22d3ee' : '#38bdf8'}
                  strokeWidth="2"
                  strokeDasharray="92 38"
                  strokeLinecap="round"
                />
                {/* Orbital Beacon Node (aligns with 12-o'clock reticle at 0°) */}
                <circle
                  cx="32"
                  cy="11.5"
                  r="3.6"
                  fill={verified ? '#34d399' : '#38bdf8'}
                />
                <circle
                  cx="32"
                  cy="11.5"
                  r="6.2"
                  fill="none"
                  stroke={verified ? 'rgba(52, 211, 153, 0.5)' : 'rgba(56, 189, 248, 0.45)'}
                  strokeWidth="1.25"
                />
              </g>

              {/* Center Core */}
              <circle
                cx="32"
                cy="32"
                r="8.5"
                fill={verified ? 'rgba(16, 185, 129, 0.16)' : 'rgba(15, 23, 42, 0.9)'}
                stroke={verified ? '#34d399' : 'rgba(148, 163, 184, 0.28)'}
                strokeWidth="1.25"
              />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {verified ? (
                <Check className="h-3.5 w-3.5 text-emerald-300" strokeWidth={2.75} aria-hidden="true" />
              ) : (
                <span className="tabular-clock text-[9px] font-bold text-sky-300">
                  {absDelta}°
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <ShieldCheck
                className={`h-4 w-4 shrink-0 ${
                  verified ? 'text-emerald-400' : 'text-sky-400'
                }`}
                aria-hidden="true"
              />
              <span
                className={`text-xs font-semibold tracking-wide ${
                  verified ? 'text-emerald-300' : 'text-slate-100'
                }`}
              >
                {verified ? 'HUMAN VERIFIED ✓' : 'Human Verification Required'}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
              {verified
                ? 'Orbital lock aligned at 0°. Authentication controls unlocked.'
                : 'Slide right to rotate and align the orbital beacon with the top lock reticle.'}
            </p>
          </div>
        </div>

        {verified && (
          <button
            type="button"
            onClick={handleReset}
            title="Reset verification"
            aria-label="Reset human verification"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/25 text-emerald-300/80 transition-colors hover:bg-emerald-400/10 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Tactile Neon Slide-to-Unlock Rail */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={verified ? -1 : 0}
        aria-label="Slide to align orbital ring and verify you are human"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={verified ? 'Human Verified' : `${Math.round(progress * 100)}% aligned`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        onKeyDown={handleKeyDown}
        className={`relative mt-3.5 flex h-[52px] w-full select-none items-center overflow-hidden rounded-xl border p-1 touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
          verified
            ? 'cursor-default border-emerald-400/40 bg-emerald-950/45'
            : 'cursor-grab border-white/12 bg-slate-900/90 active:cursor-grabbing'
        }`}
      >
        {/* Dynamic Illuminated Trail Fill */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 ${
            verified
              ? 'bg-gradient-to-r from-emerald-500/25 via-emerald-400/25 to-emerald-400/35'
              : 'bg-gradient-to-r from-sky-500/15 via-cyan-400/25 to-sky-400/35'
          }`}
          style={{
            width: verified ? '100%' : `calc(${progress * 100}% + ${Math.round((1 - progress) * 26)}px)`,
            transition: isDragging ? 'none' : 'width 260ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />

        {/* Center Instruction / Verified Banner */}
        <div className="pointer-events-none relative z-10 flex w-full items-center justify-center px-12 text-center">
          {verified ? (
            <span className="tabular-clock text-xs font-bold tracking-wider text-emerald-300">
              HUMAN VERIFIED ✓
            </span>
          ) : (
            <span
              className="text-xs font-medium tracking-wide text-slate-300 transition-opacity"
              style={{ opacity: Math.max(0.2, 1 - progress * 0.9) }}
            >
              {isDragging ? `Aligning Orbital Ring (${absDelta}°)` : 'Slide to Align & Unlock'}
            </span>
          )}
        </div>

        {/* Draggable Handle Thumb */}
        <div
          aria-hidden="true"
          className={`relative z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border shadow-md ${
            verified
              ? 'border-emerald-300/60 bg-emerald-400 text-slate-950 shadow-[0_0_16px_rgba(52,211,153,0.65)]'
              : isDragging
                ? 'border-cyan-200/80 bg-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.65)]'
                : 'border-sky-400/50 bg-sky-500 text-slate-950 shadow-[0_0_14px_rgba(14,165,233,0.45)]'
          }`}
          style={{
            position: 'absolute',
            left: 4,
            transform: `translateX(${
              trackWidth > 0 ? Math.round(progress * Math.max(0, trackWidth - 44 - 8)) : 0
            }px)`,
            transition: isDragging ? 'none' : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {verified ? (
            <Check className="h-5 w-5" strokeWidth={2.75} />
          ) : (
            <ChevronRight className="h-5 w-5" strokeWidth={2.75} />
          )}
        </div>
      </div>
    </div>
  );
};
