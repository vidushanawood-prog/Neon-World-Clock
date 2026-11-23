import React, { useEffect, useRef, useState } from 'react';
import { Check, Globe2, Loader2 } from 'lucide-react';

interface CinematicBootScreenProps {
  operatorEmail: string;
  onComplete: () => void;
}

const TOTAL_DURATION_MS = 10_000;

interface BootStep {
  id: number;
  startSec: number;
  endSec: number;
  message: string;
}

const BOOT_STEPS: readonly BootStep[] = [
  {
    id: 0,
    startSec: 0,
    endSec: 2.5,
    message: 'Verifying encrypted operator session...',
  },
  {
    id: 1,
    startSec: 2.5,
    endSec: 5.0,
    message: 'Synchronizing 195+ IANA atomic clocks & DST offsets...',
  },
  {
    id: 2,
    startSec: 5.0,
    endSec: 7.5,
    message: 'Acquiring live ISS orbital coordinates & Open-Meteo telemetry...',
  },
  {
    id: 3,
    startSec: 7.5,
    endSec: 10.0,
    message: 'Rendering photorealistic 3D Earth & Neon HUD... ACCESS GRANTED',
  },
];

/**
 * Full-Screen 10-Second Animated Cinematic Loading / Boot Screen
 * Runs 0% -> 100% over 10.0s with orbital radar rings, ambient starfield particles,
 * tabular-nums progress readout, step-by-step boot logs, and smooth fade/zoom exit.
 */
export const CinematicBootScreen: React.FC<CinematicBootScreenProps> = ({
  operatorEmail,
  onComplete,
}) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [exiting, setExiting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const completedRef = useRef(false);

  // Precise 10-second requestAnimationFrame progress clock
  useEffect(() => {
    let rafId = 0;
    let exitTimeout = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = Math.min(TOTAL_DURATION_MS, now - startTime);
      setElapsedMs(elapsed);

      if (elapsed >= TOTAL_DURATION_MS) {
        if (!completedRef.current) {
          completedRef.current = true;
          setExiting(true);
          exitTimeout = window.setTimeout(() => {
            onComplete();
          }, 520);
        }
        return;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      if (exitTimeout) window.clearTimeout(exitTimeout);
    };
  }, [onComplete]);

  // Subtle ambient telemetry particle starfield canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 58 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.8 + Math.random() * 1.6,
      vx: (Math.random() - 0.5) * 0.28,
      vy: -0.14 - Math.random() * 0.25,
      alpha: 0.2 + Math.random() * 0.5,
      cyan: Math.random() > 0.35,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -8) p.y = height + 8;
          if (p.x < -8) p.x = width + 8;
          if (p.x > width + 8) p.x = -8;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.cyan
          ? `rgba(56, 189, 248, ${p.alpha})`
          : `rgba(129, 140, 248, ${p.alpha})`;
        ctx.fill();
      }
      if (!prefersReducedMotion) {
        rafId = window.requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const progressRatio = Math.min(1, elapsedMs / TOTAL_DURATION_MS);
  const progressPercent = Math.round(progressRatio * 100);
  const elapsedSec = elapsedMs / 1000;
  const remainingSec = Math.max(0, (TOTAL_DURATION_MS - elapsedMs) / 1000);
  const isAccessGranted = elapsedSec >= 9.1 || progressPercent >= 100;

  // Radial progress circumference for SVG ring (r = 86)
  const ringRadius = 86;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progressRatio);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Initializing Meridian Command Center"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#050914] px-4 text-slate-100 transition-all duration-500 ease-out ${
        exiting ? 'scale-105 opacity-0' : 'scale-100 opacity-100'
      }`}
    >
      {/* Grid + Atmospheric Glow + Particle Starfield */}
      <div className="telemetry-grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: isAccessGranted
            ? 'radial-gradient(circle at 50% 44%, rgba(16, 185, 129, 0.2), transparent 58%), radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.14), transparent 70%)'
            : 'radial-gradient(circle at 50% 44%, rgba(14, 165, 233, 0.2), transparent 58%), radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.14), transparent 72%)',
        }}
      />

      {/* Main Boot Stage */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
        {/* Operator Identity Header */}
        <div className="mb-7 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5 font-semibold text-white">
            <Globe2 className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
            Meridian Command Center
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="tabular-clock text-sky-300">{operatorEmail}</span>
        </div>

        {/* Centerpiece Radar & Orbital Progress Ring */}
        <div className="relative flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64">
          {/* Outer Rotating Dashed Telemetry Ring */}
          <svg
            viewBox="0 0 240 240"
            className="animate-orbit-slow absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <circle
              cx="120"
              cy="120"
              r="112"
              fill="none"
              stroke="rgba(56, 189, 248, 0.22)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
            <circle cx="120" cy="8" r="3" fill="#38bdf8" />
            <circle cx="232" cy="120" r="2.2" fill="#818cf8" />
          </svg>

          {/* Counter-Rotating Inner Radar Sweep Ring */}
          <svg
            viewBox="0 0 240 240"
            className="animate-orbit-reverse absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <circle
              cx="120"
              cy="120"
              r="98"
              fill="none"
              stroke="rgba(129, 140, 248, 0.2)"
              strokeWidth="1.25"
              strokeDasharray="36 22 10 22"
            />
          </svg>

          {/* Rotating Radar Scanner Beam */}
          <div
            aria-hidden="true"
            className="animate-orbit-medium pointer-events-none absolute inset-7 rounded-full"
            style={{
              background: isAccessGranted
                ? 'conic-gradient(from 0deg, rgba(52, 211, 153, 0.28) 0deg, transparent 70deg, transparent 360deg)'
                : 'conic-gradient(from 0deg, rgba(56, 189, 248, 0.28) 0deg, transparent 70deg, transparent 360deg)',
            }}
          />

          {/* Main Determinate SVG Progress Arc */}
          <svg
            viewBox="0 0 200 200"
            className="relative z-10 h-[84%] w-[84%] -rotate-90"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="bootArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="65%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            <circle
              cx="100"
              cy="100"
              r={ringRadius}
              fill="rgba(6, 10, 20, 0.78)"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="5"
            />
            <circle
              cx="100"
              cy="100"
              r={ringRadius}
              fill="none"
              stroke={isAccessGranted ? '#34d399' : 'url(#bootArcGrad)'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
            />
          </svg>

          {/* Center Numeric Counter */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center">
            <span
              className={`tabular-clock text-4xl font-bold tracking-tight sm:text-5xl ${
                isAccessGranted ? 'text-emerald-300' : 'text-white'
              }`}
            >
              {progressPercent}
              <span className="text-xl font-semibold text-sky-400">%</span>
            </span>
            <span className="tabular-clock mt-1 text-[11px] font-medium text-slate-400">
              {isAccessGranted ? 'ACCESS GRANTED' : `T-${remainingSec.toFixed(1)}s`}
            </span>
          </div>
        </div>

        {/* Horizontal Progress Rail */}
        <div className="mt-7 w-full max-w-xl">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900 ring-1 ring-white/[0.08]">
            <div
              className={`h-full rounded-full transition-colors duration-300 ${
                isAccessGranted
                  ? 'bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.8)]'
                  : 'bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 shadow-[0_0_16px_rgba(34,211,238,0.75)]'
              }`}
              style={{ width: `${(progressRatio * 100).toFixed(2)}%` }}
            />
          </div>
        </div>

        {/* Live Step-by-Step System Boot Logs (0-2.5s, 2.5-5.0s, 5.0-7.5s, 7.5-10.0s) */}
        <div className="mt-6 w-full max-w-xl rounded-2xl border border-white/[0.09] bg-slate-950/80 p-4 backdrop-blur-xl sm:p-5">
          <div className="space-y-2.5">
            {BOOT_STEPS.map((step) => {
              const isCompleted =
                elapsedSec >= step.endSec || (step.id === 3 && progressPercent >= 100);
              const isActive = elapsedSec >= step.startSec && !isCompleted;
              const isPending = elapsedSec < step.startSec;

              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 rounded-xl px-3 py-2 text-xs transition-opacity duration-300 sm:text-[13px] ${
                    isActive
                      ? 'bg-sky-500/[0.09] text-white'
                      : isCompleted
                        ? 'text-slate-300'
                        : 'text-slate-500 opacity-50'
                  }`}
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    {isCompleted ? (
                      <Check
                        className="h-4 w-4 text-emerald-400"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                    ) : isActive ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin text-sky-400"
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-600" aria-hidden="true" />
                    )}
                  </span>

                  <span className="flex-1 leading-snug">
                    {step.id === 3 && isAccessGranted ? (
                      <>
                        Rendering photorealistic 3D Earth &amp; Neon HUD...{' '}
                        <span className="font-bold text-emerald-300">ACCESS GRANTED</span>
                      </>
                    ) : (
                      step.message
                    )}
                  </span>

                  <span className="tabular-clock shrink-0 text-[11px] text-slate-500">
                    {isCompleted
                      ? 'OK'
                      : isActive
                        ? `${elapsedSec.toFixed(1)}s`
                        : `${step.startSec.toFixed(1)}s`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
