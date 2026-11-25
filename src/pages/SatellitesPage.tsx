import React, { useMemo, useState } from 'react';
import {
  Compass,
  Globe2,
  Orbit,
  Radio,
  Satellite,
  Search,
  Volume2,
  X,
} from 'lucide-react';
import type { Country } from '../data/countries';
import type { IssPosition } from '../services/iss';
import {
  getOverheadSatellitesForCountry,
  type LiveSatellite,
  type OrbitType,
} from '../services/satellites';

interface SatellitesPageProps {
  countries: readonly Country[];
  selectedCountry: Country;
  issPosition: IssPosition;
  satellites: readonly LiveSatellite[];
  onSelectCountryCode: (iso: string) => void;
  onTrackSatellitesOnGlobe: () => void;
  onNarrate: (topic: string, text: string) => void;
}

type OrbitFilter = 'ALL' | OrbitType;

export const SatellitesPage: React.FC<SatellitesPageProps> = ({
  countries,
  selectedCountry,
  issPosition,
  satellites,
  onSelectCountryCode,
  onTrackSatellitesOnGlobe,
  onNarrate,
}) => {
  const [orbitFilter, setOrbitFilter] = useState<OrbitFilter>('ALL');
  const [query, setQuery] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const overheadData = useMemo(
    () => getOverheadSatellitesForCountry(selectedCountry, satellites),
    [selectedCountry, satellites]
  );

  const distanceById = useMemo(() => {
    const map = new Map<string, { distanceKm: number; statusLabel: string }>();
    map.set(overheadData.issMatch.satellite.id, {
      distanceKm: overheadData.issMatch.distanceKm,
      statusLabel: overheadData.issMatch.statusLabel,
    });
    for (const item of overheadData.nearest) {
      map.set(item.satellite.id, {
        distanceKm: item.distanceKm,
        statusLabel: item.statusLabel,
      });
    }
    return map;
  }, [overheadData]);

  const filteredSatellites = useMemo(() => {
    const q = query.trim().toLowerCase();
    return satellites.filter((sat) => {
      if (orbitFilter !== 'ALL' && sat.orbitType !== orbitFilter) return false;
      if (!q) return true;
      return (
        sat.name.toLowerCase().includes(q) ||
        sat.category.toLowerCase().includes(q) ||
        sat.orbitType.toLowerCase().includes(q) ||
        String(sat.noradId).includes(q)
      );
    });
  }, [orbitFilter, query, satellites]);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return countries.slice(0, 40);
    return countries
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.capital.toLowerCase().includes(q) ||
          c.iso.toLowerCase() === q
      )
      .slice(0, 40);
  }, [countries, countrySearch]);

  const handleNarrateOrbit = () => {
    const latStr = `${Math.abs(issPosition.latitude).toFixed(1)} degrees ${issPosition.latitude >= 0 ? 'North' : 'South'}`;
    const lngStr = `${Math.abs(issPosition.longitude).toFixed(1)} degrees ${issPosition.longitude >= 0 ? 'East' : 'West'}`;
    onNarrate(
      'Live Satellites & ISS Telemetry',
      `The International Space Station is orbiting at ${Math.round(issPosition.altitudeKm)} kilometers altitude, moving at ${Math.round(issPosition.velocityKmh).toLocaleString()} kilometers per hour over ${latStr}, ${lngStr}. It is currently ${overheadData.issMatch.distanceKm.toLocaleString()} kilometers from ${selectedCountry.name}. Tracking ${satellites.length} active orbital spacecraft.`
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Live ISS Telemetry Hero Card */}
      <section className="rounded-3xl border border-emerald-400/25 bg-[#081226]/95 p-5 text-slate-100 shadow-[0_20px_56px_-22px_rgba(16,185,129,0.22)] sm:p-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <Radio className="h-4 w-4" aria-hidden="true" />
              <span>
                {issPosition.isLive ? 'Live ISS Orbital Telemetry Feed' : 'Keplerian Orbital Tracker'}
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="tabular-clock text-slate-400">NORAD 25544</span>
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              International Space Station &amp; Live Satellites
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Real-time orbital telemetry across {satellites.length} tracked LEO, SSO, MEO, and
              geostationary spacecraft.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleNarrateOrbit}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 hover:text-white whitespace-nowrap"
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              <span>Narrate Orbit</span>
            </button>

            <button
              type="button"
              onClick={onTrackSatellitesOnGlobe}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-sky-500 px-4 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 whitespace-nowrap"
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>Track on 3D Globe</span>
            </button>
          </div>
        </div>

        {/* ISS 4-Metric Telemetry Strip */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.08] bg-slate-950/75 p-4">
            <p className="text-xs text-slate-400">Latitude / Longitude</p>
            <p className="tabular-clock mt-1.5 text-base font-bold text-white sm:text-lg">
              {Math.abs(issPosition.latitude).toFixed(2)}°{issPosition.latitude >= 0 ? 'N' : 'S'},{' '}
              {Math.abs(issPosition.longitude).toFixed(2)}°{issPosition.longitude >= 0 ? 'E' : 'W'}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-300">Sub-satellite ground track</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-slate-950/75 p-4">
            <p className="text-xs text-slate-400">Orbital Altitude</p>
            <p className="tabular-clock mt-1.5 text-base font-bold text-white sm:text-lg">
              {issPosition.altitudeKm.toFixed(1)} km
            </p>
            <p className="mt-0.5 text-[11px] text-sky-300">Low Earth Orbit (LEO)</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-slate-950/75 p-4">
            <p className="text-xs text-slate-400">Orbital Velocity</p>
            <p className="tabular-clock mt-1.5 text-base font-bold text-white sm:text-lg">
              {Math.round(issPosition.velocityKmh).toLocaleString()} km/h
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">~92.9 min per orbit</p>
          </div>

          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.08] p-4">
            <p className="text-xs text-slate-300">Range to {selectedCountry.name}</p>
            <p className="tabular-clock mt-1.5 text-base font-bold text-emerald-300 sm:text-lg">
              {overheadData.issMatch.distanceKm.toLocaleString()} km
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-200">
              {overheadData.issMatch.statusLabel}
            </p>
          </div>
        </div>

        {/* Ground Observer Country Selector */}
        <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.08] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <Globe2 className="h-4 w-4 text-sky-400" aria-hidden="true" />
            <span>Ground Pass Observer:</span>
            <span className="font-semibold text-white">
              {selectedCountry.name} ({selectedCountry.capital})
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={countrySearch}
              onFocus={() => setShowCountryPicker(true)}
              onChange={(e) => {
                setCountrySearch(e.target.value);
                setShowCountryPicker(true);
              }}
              placeholder="Change observer country..."
              aria-label="Change ground observer country"
              className="h-10 w-full rounded-xl border border-white/12 bg-slate-950/75 pr-9 pl-10 text-xs text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none"
            />
            {(countrySearch || showCountryPicker) && (
              <button
                type="button"
                onClick={() => {
                  setCountrySearch('');
                  setShowCountryPicker(false);
                }}
                aria-label="Close country picker"
                className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {showCountryPicker && (
          <div className="mt-2.5 max-h-52 overflow-y-auto rounded-2xl border border-white/12 bg-slate-950 p-2">
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCountries.map((c) => (
                <button
                  key={c.iso}
                  type="button"
                  onClick={() => {
                    onSelectCountryCode(c.iso);
                    setShowCountryPicker(false);
                    setCountrySearch('');
                  }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/[0.07]"
                >
                  <img
                    src={`https://flagcdn.com/w40/${c.iso}.png`}
                    alt=""
                    width={18}
                    height={12}
                    referrerPolicy="no-referrer"
                    className="h-3 w-4.5 rounded-[2px] object-cover"
                  />
                  <span className="truncate font-medium">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Filterable Orbital Fleet Directory */}
      <section className="rounded-3xl border border-slate-200/90 bg-white/85 p-5 sm:p-6 dark:border-white/[0.09] dark:bg-[#081226]/90">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200/80 pb-4 lg:flex-row lg:items-center dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Orbit className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-950 sm:text-lg dark:text-white">
                Active Orbital Fleet Telemetry
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any satellite card to hear its live orbital coordinates and altitude
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:w-60">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search satellite or NORAD..."
                aria-label="Search satellites"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-8 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-white/12 dark:bg-slate-950/75 dark:text-white"
              />
            </div>

            <div
              role="group"
              aria-label="Filter by orbit shell"
              className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200/90 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-slate-900/80"
            >
              {(['ALL', 'LEO', 'SSO-LEO', 'MEO', 'GEO'] as const).map((shell) => (
                <button
                  key={shell}
                  type="button"
                  onClick={() => setOrbitFilter(shell)}
                  aria-pressed={orbitFilter === shell}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    orbitFilter === shell
                      ? 'bg-white text-slate-950 shadow-xs dark:bg-sky-500 dark:text-slate-950'
                      : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {shell}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSatellites.map((sat) => {
            const match = distanceById.get(sat.id);
            return (
              <article
                key={sat.id}
                onClick={() =>
                  onNarrate(
                    `Satellite · ${sat.name}`,
                    `${sat.name}, a ${sat.category} spacecraft in ${sat.orbitType} orbit, is at ${Math.round(sat.altitudeKm).toLocaleString()} kilometers altitude moving at ${Math.round(sat.velocityKmh).toLocaleString()} kilometers per hour.`
                  )
                }
                className="cursor-pointer rounded-2xl border border-slate-200/85 bg-slate-50/85 p-4 transition-colors hover:border-sky-400/50 dark:border-white/[0.08] dark:bg-slate-950/70 dark:hover:border-sky-400/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-900"
                      style={{ color: sat.colorHex }}
                    >
                      <Satellite className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-950 dark:text-white">
                        {sat.name}
                      </h3>
                      <p className="tabular-clock text-[11px] text-slate-500 dark:text-slate-400">
                        {sat.category} · NORAD {sat.noradId}
                      </p>
                    </div>
                  </div>
                  <span className="tabular-clock shrink-0 text-xs font-semibold text-sky-600 dark:text-sky-300">
                    {sat.orbitType}
                  </span>
                </div>

                <div className="tabular-clock mt-4 grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-white/[0.06] dark:bg-slate-900/70">
                    <p className="text-[10px] text-slate-400">Position</p>
                    <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                      {Math.abs(sat.latitude).toFixed(1)}°{sat.latitude >= 0 ? 'N' : 'S'},{' '}
                      {Math.abs(sat.longitude).toFixed(1)}°{sat.longitude >= 0 ? 'E' : 'W'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-white/[0.06] dark:bg-slate-900/70">
                    <p className="text-[10px] text-slate-400">Altitude</p>
                    <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                      {Math.round(sat.altitudeKm).toLocaleString()} km
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-white/[0.06] dark:bg-slate-900/70">
                    <p className="text-[10px] text-slate-400">Velocity</p>
                    <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                      {Math.round(sat.velocityKmh).toLocaleString()} km/h
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-white/[0.06] dark:bg-slate-900/70">
                    <p className="text-[10px] text-slate-400">Inclination / Period</p>
                    <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                      {sat.inclinationDeg.toFixed(1)}° · {Math.round(sat.periodMin)}m
                    </p>
                  </div>
                </div>

                {match && (
                  <div className="tabular-clock mt-3 flex items-center justify-between border-t border-slate-200/70 pt-2.5 text-[11px] dark:border-white/[0.06]">
                    <span className="text-slate-500 dark:text-slate-400">
                      {selectedCountry.name} range: {match.distanceKm.toLocaleString()} km
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                      {match.statusLabel}
                    </span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
