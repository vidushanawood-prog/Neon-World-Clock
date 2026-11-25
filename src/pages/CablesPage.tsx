import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Cable,
  Compass,
  Globe2,
  Search,
  Volume2,
  Wifi,
  X,
} from 'lucide-react';
import type { Country } from '../data/countries';
import { getCountryConnectivity, SUBMARINE_CABLES } from '../data/connectivity';

interface CablesPageProps {
  countries: readonly Country[];
  selectedCountry: Country;
  onSelectCountryCode: (iso: string) => void;
  onOpenCountryPage: (country: Country) => void;
  onViewCablesOnGlobe: (country: Country) => void;
  onNarrate: (topic: string, text: string) => void;
}

export const CablesPage: React.FC<CablesPageProps> = ({
  countries,
  selectedCountry,
  onSelectCountryCode,
  onOpenCountryPage,
  onViewCablesOnGlobe,
  onNarrate,
}) => {
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [cableSearch, setCableSearch] = useState('');

  const byIso = useMemo(() => new Map(countries.map((c) => [c.iso, c])), [countries]);

  const connectivity = useMemo(
    () => getCountryConnectivity(selectedCountry),
    [selectedCountry]
  );

  const activeCountryCables =
    connectivity.directCables.length > 0
      ? connectivity.directCables
      : connectivity.transitCables;

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return countries.slice(0, 48);
    return countries
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.capital.toLowerCase().includes(q) ||
          c.continent.toLowerCase().includes(q) ||
          c.iso.toLowerCase() === q
      )
      .slice(0, 48);
  }, [countries, countrySearch]);

  const filteredGlobalCables = useMemo(() => {
    const q = cableSearch.trim().toLowerCase();
    if (!q) return SUBMARINE_CABLES;
    return SUBMARINE_CABLES.filter((cable) => {
      if (
        cable.name.toLowerCase().includes(q) ||
        cable.regionLabel.toLowerCase().includes(q)
      ) {
        return true;
      }
      return cable.connectedIsos.some((iso) => {
        const c = byIso.get(iso);
        return c ? c.name.toLowerCase().includes(q) : iso.includes(q);
      });
    });
  }, [byIso, cableSearch]);

  const totalCapacityTbps = useMemo(
    () => SUBMARINE_CABLES.reduce((sum, c) => sum + c.capacityTbps, 0),
    []
  );
  const totalLengthKm = useMemo(
    () => SUBMARINE_CABLES.reduce((sum, c) => sum + c.lengthKm, 0),
    []
  );

  const handleNarrateNetwork = () => {
    const cableNames = activeCountryCables.map((c) => c.name).join(', ');
    const ispNames = connectivity.isps.join(', ');
    onNarrate(
      `Submarine Cables · ${selectedCountry.name}`,
      `${selectedCountry.name} connects to the global fiber backbone through ${cableNames}. Major national Internet Service Providers include ${ispNames}.`
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Selected Country Connectivity Hero */}
      <section className="rounded-3xl border border-cyan-400/25 bg-[#081226]/95 p-5 text-slate-100 shadow-[0_20px_56px_-22px_rgba(6,182,212,0.25)] sm:p-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <img
              src={`https://flagcdn.com/w160/${selectedCountry.iso}.png`}
              alt={`Flag of ${selectedCountry.name}`}
              width={64}
              height={42}
              referrerPolicy="no-referrer"
              className="h-11 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/20"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-cyan-300">
                Submarine Fiber Backbone &amp; National ISPs
              </p>
              <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {selectedCountry.name}
              </h1>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                {connectivity.gatewaySummary} · {selectedCountry.capital}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleNarrateNetwork}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3.5 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 hover:text-white whitespace-nowrap"
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              <span>Narrate Network</span>
            </button>

            <button
              type="button"
              onClick={() => onViewCablesOnGlobe(selectedCountry)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-sky-500 px-4 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 whitespace-nowrap"
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>View on 3D Globe</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenCountryPage(selectedCountry)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/14 bg-white/[0.06] px-3.5 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/[0.12] whitespace-nowrap"
            >
              <Globe2 className="h-4 w-4 text-sky-400" aria-hidden="true" />
              <span>Country Page</span>
            </button>
          </div>
        </div>

        {/* Country Picker */}
        <div className="mt-5 border-t border-white/[0.08] pt-4">
          <div className="relative max-w-md">
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
              placeholder="Inspect ISPs & cables for another country..."
              aria-label="Inspect another country's ISPs and submarine cables"
              className="h-10 w-full rounded-xl border border-white/12 bg-slate-950/75 pr-9 pl-10 text-xs text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            />
            {(countrySearch || showCountryPicker) && (
              <button
                type="button"
                onClick={() => {
                  setCountrySearch('');
                  setShowCountryPicker(false);
                }}
                aria-label="Close country picker"
                className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {showCountryPicker && (
            <div className="mt-2.5 max-h-56 overflow-y-auto rounded-2xl border border-white/12 bg-slate-950 p-2">
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
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                      c.iso === selectedCountry.iso
                        ? 'bg-cyan-500/20 font-semibold text-cyan-200'
                        : 'text-slate-200 hover:bg-white/[0.07]'
                    }`}
                  >
                    <img
                      src={`https://flagcdn.com/w40/${c.iso}.png`}
                      alt=""
                      width={20}
                      height={14}
                      referrerPolicy="no-referrer"
                      className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover"
                    />
                    <span className="truncate font-medium">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selected Country Major ISPs & Connected Cables Side-by-Side */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-slate-950/70 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-cyan-300">
              <Wifi className="h-4 w-4" aria-hidden="true" />
              <span>Major National ISPs — {selectedCountry.name}</span>
            </h2>
            <ul className="mt-3 divide-y divide-white/[0.07] text-sm">
              {connectivity.isps.map((isp, index) => (
                <li key={isp} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="font-semibold text-white">{isp}</span>
                  <span className="tabular-clock text-xs text-slate-400">
                    {index === 0 ? 'Tier-1 Backbone' : 'Fiber / 5G Carrier'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-slate-950/70 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-amber-300">
              <Cable className="h-4 w-4" aria-hidden="true" />
              <span>
                {connectivity.isLandlockedTransit
                  ? 'Regional Undersea Transit Gateways'
                  : 'Direct Submarine Fiber Landings'}
              </span>
            </h2>
            <ul className="mt-3 divide-y divide-white/[0.07]">
              {activeCountryCables.map((cable) => (
                <li key={cable.id} className="py-2.5 first:pt-1 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-bold ${
                        cable.color === 'cyan' ? 'text-cyan-300' : 'text-amber-300'
                      }`}
                    >
                      {cable.name}
                    </span>
                    <span className="tabular-clock text-xs font-semibold text-slate-300">
                      {cable.capacityTbps} Tbps · {cable.lengthKm.toLocaleString()} km
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{cable.regionLabel}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Complete Global Submarine Fiber Backbone Network Directory */}
      <section className="rounded-3xl border border-slate-200/90 bg-white/85 p-5 sm:p-6 dark:border-white/[0.09] dark:bg-[#081226]/90">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center dark:border-white/[0.08]">
          <div>
            <h2 className="text-base font-bold text-slate-950 sm:text-lg dark:text-white">
              Global Submarine Fiber-Optic Corridors
            </h2>
            <p className="tabular-clock mt-1 text-xs text-slate-500 dark:text-slate-400">
              {SUBMARINE_CABLES.length} major systems · {totalCapacityTbps.toLocaleString()} Tbps
              combined capacity · {totalLengthKm.toLocaleString()} km subsea span
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={cableSearch}
              onChange={(e) => setCableSearch(e.target.value)}
              placeholder="Filter cable, corridor, or country..."
              aria-label="Filter submarine cables"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-white/12 dark:bg-slate-950/75 dark:text-white"
            />
            {cableSearch && (
              <button
                type="button"
                onClick={() => setCableSearch('')}
                aria-label="Clear cable filter"
                className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredGlobalCables.map((cable) => {
            const isConnectedToSelected = cable.connectedIsos.includes(selectedCountry.iso);
            const connectedCountries = cable.connectedIsos
              .map((iso) => byIso.get(iso))
              .filter((c): c is Country => Boolean(c));

            return (
              <article
                key={cable.id}
                className={`rounded-2xl border p-4 transition-colors sm:p-5 ${
                  isConnectedToSelected
                    ? 'border-cyan-400/50 bg-cyan-500/[0.08] dark:bg-cyan-950/35'
                    : 'border-slate-200/85 bg-slate-50/80 dark:border-white/[0.08] dark:bg-slate-950/65'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3
                      className={`text-base font-bold ${
                        cable.color === 'cyan'
                          ? 'text-sky-700 dark:text-cyan-300'
                          : 'text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {cable.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {cable.regionLabel}
                    </p>
                  </div>
                  <div className="tabular-clock shrink-0 text-right">
                    <p className="text-sm font-bold text-slate-950 dark:text-white">
                      {cable.capacityTbps} Tbps
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {cable.lengthKm.toLocaleString()} km
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {connectedCountries.map((landing) => (
                    <button
                      key={`${cable.id}-${landing.iso}`}
                      type="button"
                      onClick={() => onOpenCountryPage(landing)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:border-sky-400 hover:text-sky-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400/50 dark:hover:text-white"
                    >
                      <img
                        src={`https://flagcdn.com/w40/${landing.iso}.png`}
                        alt=""
                        width={16}
                        height={11}
                        referrerPolicy="no-referrer"
                        className="h-2.5 w-4 rounded-[2px] object-cover"
                      />
                      <span>{landing.name}</span>
                      <ArrowUpRight className="h-2.5 w-2.5 opacity-60" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
