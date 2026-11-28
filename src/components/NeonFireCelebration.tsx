import React, { useEffect, useRef } from 'react';
import { Crown, Receipt, Sparkles, X } from 'lucide-react';
import type { ProActivationReceipt } from '../services/emailReceipt';

interface NeonFireCelebrationProps {
  isOpen: boolean;
  receipt?: ProActivationReceipt | null;
  onClose: () => void;
  onViewReceipt?: () => void;
}

interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  hue: number;
  kind: 'flame' | 'spark';
}

function playFuturisticIgnitionFanfare() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // 1. Sub-bass futuristic ignition whoosh
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(55, now);
    subOsc.frequency.exponentialRampToValueAtTime(220, now + 0.55);
    subOsc.frequency.exponentialRampToValueAtTime(110, now + 1.15);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.45);
    filter.frequency.exponentialRampToValueAtTime(600, now + 1.2);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.18, now + 0.25);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    subOsc.connect(filter);
    filter.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 1.3);

    // 2. Neon arpeggiated victory chord (C5 - E5 - G5 - B5 - C6)
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
    notes.forEach((freq, idx) => {
      const start = now + 0.12 + idx * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 1.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 1.2);
    });

    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 2200);
  } catch {
    // Ignore autoplay restriction or Web Audio unavailability
  }
}

export const NeonFireCelebration: React.FC<NeonFireCelebrationProps> = ({
  isOpen,
  receipt,
  onClose,
  onViewReceipt,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    playFuturisticIgnitionFanfare();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const particles: FireParticle[] = [];
    const neonHues = [190, 205, 220, 285, 315]; // cyan, electric blue, magenta

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initial radial neon explosion burst from center
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    for (let i = 0; i < 140; i++) {
      const angle = (Math.PI * 2 * i) / 140 + (Math.random() - 0.5) * 0.2;
      const speed = 2.5 + Math.random() * 9.5;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 3 + Math.random() * 7,
        life: 0,
        maxLife: 55 + Math.random() * 65,
        hue: neonHues[Math.floor(Math.random() * neonHues.length)],
        kind: 'spark',
      });
    }

    const spawnFlames = () => {
      const w = canvas.width;
      const h = canvas.height;
      for (let i = 0; i < 12; i++) {
        particles.push({
          x: Math.random() * w,
          y: h + 15,
          vx: (Math.random() - 0.5) * 1.8,
          vy: -(3.2 + Math.random() * 6.5),
          size: 14 + Math.random() * 26,
          life: 0,
          maxLife: 55 + Math.random() * 55,
          hue: neonHues[Math.floor(Math.random() * neonHues.length)],
          kind: 'flame',
        });
      }
    };

    const tick = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(2, 6, 23, 0.22)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      spawnFlames();
      ctx.globalCompositeOperation = 'lighter';

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        const progress = p.life / p.maxLife;
        const alpha = 1 - progress;

        p.x += p.vx;
        p.y += p.vy;

        if (p.kind === 'spark') {
          p.vy += 0.08;
          p.vx *= 0.985;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1, p.size * alpha), 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 100%, 68%, ${alpha})`;
          ctx.fill();
        } else {
          p.vx += Math.sin(p.life * 0.15 + p.x * 0.01) * 0.12;
          const radius = Math.max(2, p.size * (1 - progress * 0.72));
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
          grad.addColorStop(0, `hsla(${p.hue}, 100%, 82%, ${alpha * 0.9})`);
          grad.addColorStop(0.5, `hsla(${p.hue}, 100%, 55%, ${alpha * 0.45})`);
          grad.addColorStop(1, `hsla(${p.hue}, 100%, 40%, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = window.requestAnimationFrame(tick);
    };

    animId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-slate-950/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pro Plan Activated Celebration"
    >
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 h-full w-full" />

      <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-cyan-400/50 bg-slate-950/80 p-7 text-center shadow-[0_0_90px_rgba(34,211,238,0.45),0_0_120px_rgba(232,121,249,0.28)] backdrop-blur-md sm:p-10">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close celebration"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-slate-900/80 text-slate-300 transition hover:border-cyan-400/60 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-400/60 bg-gradient-to-br from-cyan-500/30 via-blue-600/30 to-fuchsia-500/35 text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.65)]">
          <Crown className="h-8 w-8 text-amber-300" />
        </div>

        <h2 className="bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 bg-clip-text text-2xl font-black tracking-tight text-transparent drop-shadow-[0_0_24px_rgba(34,211,238,0.65)] sm:text-4xl">
          🔥 YOUR PRO PLAN IS ACTIVATED! 🔥
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-relaxed text-cyan-100 sm:text-base">
          All 215 Countries, Live TV, Radio, Entertainment &amp; Movies Unlocked for 30 Days
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-fuchsia-500 px-6 py-3 text-sm font-black text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.55)] transition hover:scale-[1.02] hover:brightness-110"
          >
            <Sparkles className="h-4 w-4" />
            Explore Everything Unlocked
          </button>

          {receipt && onViewReceipt && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewReceipt();
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/45 bg-slate-900/90 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/15"
            >
              <Receipt className="h-4 w-4" />
              View Receipt
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
