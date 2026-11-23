import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  CloudSun,
  Globe2,
  Layers,
  Moon,
  Plane,
  Satellite,
  Sun,
  TrendingUp,
  X,
} from 'lucide-react';
import { COUNTRIES } from '../data/countries';
import { formatClockForZone } from '../utils/time';
import { GLOBAL_EXCHANGES, getExchangeStatus } from '../utils/markets';
import type { IssPosition } from '../services/iss';

interface LandingPreviewProps {
  now: Date;
  issPosition: IssPosition;
  onLaunch: () => void;
}

const PREVIEW_HUBS = [
  { iso: 'lk', label: 'Colombo', country: 'Sri Lanka', tz: 'Asia/Colombo' },
  { iso: 'gb', label: 'London', country: 'United Kingdom', tz: 'Europe/London' },
  { iso: 'us', label: 'New York', country: 'United States', tz: 'America/New_York' },
  { iso: 'jp', label: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo' },
] as const;

const FEATURE_MODULES = [
  {
    id: 'earth',
    title: 'Photorealistic 3D Earth & 215 Regions',
    description:
      'Rotate and zoom a high-definition satellite globe with real-time day/night city lights, Fresnel atmospheric scattering, and instant country focus pins across all 215 countries and UK constituent nations.',
    metric: '215 IANA Timezones',
    icon: Globe2,
  },
  {
    id: 'iss',
    title: 'Live International Space Station Telemetry',
    description:
      'Streams real-time ISS latitude, longitude, orbital altitude, and velocity every 6 seconds with an interactive 3D orbital beacon and nadir ground-track tether.',
    metric: '~27,600 km/h LEO',
    icon: Satellite,
  },
  {
    id: 'markets',
    title: 'Global Stock Market Session Monitor',
    description:
      'Live Open, Pre-Market, After-Hours, and Closed session tracking across NYSE, NASDAQ, LSE, TSE, NSE, CSE, and ASX synchronized to exchange local schedules.',
    metric: '7 Major Exchanges',
    icon: TrendingUp,
  },
  {
    id: 'weather',
    title: 'Real-Time Capital Weather & FX Intelligence',
    description:
      'Live capital temperature (°C/°F), weather conditions, hemisphere season detection, solar daylight progress curves, and live LKR & USD currency conversion.',
    metric: 'Open-Meteo + Live FX',
    icon: CloudSun,
  },
  {
    id: 'jetlag',
    title: 'Multi-Stop Route, Layover & Jet Lag Planner',
    description:
      'Calculate exact local arrival timestamps across origin, layover, and destination legs with net timezone shift analysis and tailored circadian recovery guidance.',
    metric: 'Multi-Leg Precision',
    icon: Plane,
  },
  {
    id: 'alarms',
    title: 'World Timezone Alarms & Hourly Chime',
    description:
      'Schedule persistent alarms pinned to any country’s local clock with synthesized Web Audio API chimes, snooze controls, and an optional local hourly chime.',
    metric: 'Web Audio Synth',
    icon: Bell,
  },
] as const;

export const LandingPreview: React.FC<LandingPreviewProps> = ({
  now,
  issPosition,
  onLaunch,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const utcClock = useMemo(() => formatClockForZone(now, 'UTC', true), [now]);
  const markets = useMemo(
    () => GLOBAL_EXCHANGES.map((ex) => getExchangeStatus(ex, now)),
    [now]
  );
  const openMarketCount = useMemo(
    () => markets.filter((m) => m.state === 'open').length,
    [markets]
  );

  // Close drawer cleanly on Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#060a14] text-slate-100">
      {/* Deep Cosmic Atmosphere + Precision Telemetry Grid */}
      <div className="telemetry-grid-bg pointer-events-none absolute inset-0 opacity-65" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 68% 52% at 50% 10%, rgba(14, 165, 233, 0.2), transparent 65%), radial-gradient(ellipse 52% 45% at 85% 78%, rgba(99, 102, 241, 0.16), transparent 62%), radial-gradient(ellipse 46% 40% at 12% 85%, rgba(6, 182, 212, 0.14), transparent 60%)',
        }}
      />

      {/* Subtle Blurred Ambient 3D Earth Sphere Preview Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        {/* Outer Orbital Rings */}
        <div className="relative flex h-[620px] w-[620px] items-center justify-center sm:h-[760px] sm:w-[760px]">
          <div className="animate-orbit-slow absolute inset-4 rounded-full border border-sky-400/15" />
          <div className="animate-orbit-reverse absolute inset-12 rounded-full border border-dashed border-cyan-300/15" />

          {/* Blurred High-Resolution Earth Sphere */}
          <div
            className="animate-earth-drift relative h-[430px] w-[430px] rounded-full opacity-55 blur-[2.5px] sm:h-[540px] sm:w-[540px]"
            style={{
              backgroundImage:
                'url(https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg), radial-gradient(circle at 32% 30%, #1d4ed8 0%, #0f172a 58%, #020617 100%)',
              backgroundSize: '210% 100%, 100% 100%',
              boxShadow:
                'inset -75px -40px 110px rgba(2, 6, 23, 0.92), inset 24px 18px 65px rgba(56, 189, 248, 0.32), 0 0 110px rgba(14, 165, 233, 0.26)',
            }}
          />

          {/* Soft Atmospheric Contrast Scrim */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle at center, rgba(6, 10, 20, 0.28) 0%, rgba(6, 10, 20, 0.72) 66%, #060a14 100%)',
            }}
          />
        </div>
      </div>

      {/* Top Navigation Bar (Clean 3-Zone Contract) */}
      <header className="relative z-20 border-b border-white/[0.07] bg-slate-950/55 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 ring-1 ring-sky-400/35">
              <Globe2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">Meridian</span>
          </div>

          <div className="hidden items-center gap-6 text-xs text-slate-400 md:flex whitespace-nowrap">
            <span className="tabular-clock text-slate-200">
              UTC {utcClock.hours}:{utcClock.minutes}:{utcClock.seconds}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="tabular-clock">
              ISS {issPosition.latitude.toFixed(1)}°, {issPosition.longitude.toFixed(1)}°
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>{openMarketCount} of {markets.length} exchanges open</span>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="shrink-0 whitespace-nowrap text-xs font-semibold text-sky-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-lg px-2.5 py-1.5"
          >
            Preview Features
          </button>
        </div>
      </header>

      {/* Center Hero Content */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Live Global Telemetry Summary Strip (Clean unboxed metadata) */}
          <p className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs font-medium tracking-wide text-sky-300/95 sm:text-sm">
            <span>{COUNTRIES.length} Countries &amp; Regions</span>
            <span aria-hidden="true" className="text-sky-500/50">
              •
            </span>
            <span>Live ISS Tracking</span>
            <span aria-hidden="true" className="text-sky-500/50">
              •
            </span>
            <span>Global Markets</span>
            <span aria-hidden="true" className="text-sky-500/50">
              •
            </span>
            <span>Real-Time Weather</span>
          </p>

          <h1
            className="mt-5 font-bold tracking-tight text-white [text-wrap:balance]"
            style={{ fontSize: 'clamp(2.25rem, 4.8vw, 3.75rem)', lineHeight: 1.08 }}
          >
            Global Time &amp; Orbital Telemetry Command Center
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Monitor precision IANA atomic clocks across every recognized nation and UK constituent
            region, explore a photorealistic interactive 3D Earth, track the ISS in real time, and
            plan international schedules with live market, weather, and currency intelligence.
          </p>

          {/* Primary Glowing CTA + Secondary Preview Action */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <button
              type="button"
              onClick={onLaunch}
              className="group inline-flex h-12 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-400 to-sky-500 px-7 text-sm font-bold text-slate-950 shadow-[0_0_32px_-4px_rgba(56,189,248,0.75)] transition-all duration-200 hover:scale-[1.015] hover:shadow-[0_0_44px_-2px_rgba(34,211,238,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 whitespace-nowrap"
            >
              <span>Launch Command Center</span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-slate-900/65 px-6 text-sm font-semibold text-slate-100 backdrop-blur-xl transition-colors hover:border-sky-400/40 hover:bg-slate-900/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 whitespace-nowrap"
            >
              <Layers className="h-4 w-4 text-sky-400" aria-hidden="true" />
              <span>Preview Features</span>
            </button>
          </div>
        </div>

        {/* Live Telemetry Snapshot Row (4 Real-Time Global Clocks) */}
        <section
          aria-label="Live global time preview"
          className="mx-auto mt-14 w-full max-w-4xl border-t border-white/[0.08] pt-8"
        >
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {PREVIEW_HUBS.map((hub) => {
              const clock = formatClockForZone(now, hub.tz, false);
              return (
                <div
                  key={hub.iso}
                  className="rounded-2xl border border-white/[0.09] bg-slate-950/60 p-4 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <img
                        src={`https://flagcdn.com/w40/${hub.iso}.png`}
                        alt={`${hub.country} flag`}
                        width={20}
                        height={14}
                        referrerPolicy="no-referrer"
                        className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover ring-1 ring-white/15"
                      />
                      <span className="truncate text-xs font-semibold text-slate-200">
                        {hub.label}
                      </span>
                    </div>
                    {clock.isDaytime ? (
                      <Sun className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-label="Daytime" />
                    ) : (
                      <Moon className="h-3.5 w-3.5 shrink-0 text-indigo-300" aria-label="Nighttime" />
                    )}
                  </div>
                  <div className="tabular-clock mt-2.5 flex items-baseline gap-1 text-lg font-bold text-white sm:text-xl">
                    <span>
                      {clock.hours}:{clock.minutes}
                    </span>
                    <span className="text-xs font-medium text-slate-400">:{clock.seconds}</span>
                    {clock.dayPeriod && (
                      <span className="ml-0.5 text-[11px] font-semibold text-sky-400">
                        {clock.dayPeriod}
                      </span>
                    )}
                  </div>
                  <p className="tabular-clock mt-1 text-[11px] text-slate-400">
                    {clock.utcOffset} · {clock.shortDate}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Interactive Feature Preview Drawer / Modal */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-features-title"
        >
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-white/12 bg-[#080d1a]/95 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
              <div>
                <h2
                  id="preview-features-title"
                  className="text-lg font-bold tracking-tight text-white"
                >
                  Inside Meridian Command Center
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  All modules run live in your browser with zero external server keys.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close feature preview"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3.5">
              {/* Live Telemetry Feed Card */}
              <div className="rounded-2xl border border-sky-400/25 bg-sky-500/[0.08] p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-sky-300">
                  <span>Live Orbital Telemetry Snapshot</span>
                  <span className="tabular-clock">
                    {issPosition.isLive ? 'Live Stream' : 'Orbital Model'}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-3 text-left">
                  <div>
                    <div className="text-[11px] text-slate-400">Latitude</div>
                    <div className="tabular-clock text-sm font-bold text-white">
                      {issPosition.latitude.toFixed(2)}°
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Longitude</div>
                    <div className="tabular-clock text-sm font-bold text-white">
                      {issPosition.longitude.toFixed(2)}°
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Velocity</div>
                    <div className="tabular-clock text-sm font-bold text-white">
                      {Math.round(issPosition.velocityKmh).toLocaleString()} km/h
                    </div>
                  </div>
                </div>
              </div>

              {/* Core Modules List */}
              {FEATURE_MODULES.map((mod) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.id}
                    className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 ring-1 ring-sky-400/25">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-sm font-semibold text-white">{mod.title}</h3>
                          <span className="tabular-clock shrink-0 text-[11px] font-medium text-sky-300/90">
                            {mod.metric}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          {mod.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] bg-slate-950/75 px-6 py-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onLaunch();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_24px_-4px_rgba(56,189,248,0.65)] transition-transform hover:scale-[1.015]"
              >
                <span>Launch Command Center</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
