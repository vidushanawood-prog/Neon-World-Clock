import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Globe2,
  MapPin,
  Search,
  Shield,
  Trophy,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import type { Country } from '../data/countries';
import { getCountryFootballProfile } from '../data/tradeAndBrands';
import { fetchFootballPlayerPortraits } from '../services/countryProfile';

interface FootballPageProps {
  countries: readonly Country[];
  selectedCountry: Country;
  onSelectCountryCode: (iso: string) => void;
  onOpenCountryPage: (country: Country) => void;
  onNarrate: (topic: string, text: string) => void;
}

const FEATURED_FOOTBALL_ISOS = [
  'lk',
  'jp',
  'br',
  'ar',
  'fr',
  'gb-eng',
  'es',
  'de',
  'pt',
  'it',
  'ma',
  'kr',
  'us',
  'in',
  'au',
  'nl',
] as const;

function getInitials(name: string): string {
  const parts = name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'XI';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const FootballPage: React.FC<FootballPageProps> = ({
  countries,
  selectedCountry,
  onSelectCountryCode,
  onOpenCountryPage,
  onNarrate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [playerPortraits, setPlayerPortraits] = useState<Record<string, string>>({});
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());

  const markFailed = useCallback((url: string) => {
    setFailedUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);

  const footballProfile = useMemo(
    () => getCountryFootballProfile(selectedCountry),
    [selectedCountry]
  );

  const featuredNations = useMemo(() => {
    const byIso = new Map(countries.map((c) => [c.iso, c]));
    return FEATURED_FOOTBALL_ISOS.map((iso) => byIso.get(iso)).filter((c): c is Country =>
      Boolean(c)
    );
  }, [countries]);

  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
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
  }, [countries, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    setFailedUrls(new Set());
    setPlayerPortraits({});

    const slugs = footballProfile.keyPlayers
      .map((p) => p.wikiSlug)
      .filter((s): s is string => Boolean(s));

    if (slugs.length > 0) {
      void fetchFootballPlayerPortraits(slugs).then((map) => {
        if (!cancelled) {
          setPlayerPortraits(map);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [footballProfile]);

  const handleNarrateTeam = () => {
    const playerNames = footballProfile.keyPlayers
      .map((p) => `${p.name}, number ${p.number}, ${p.position} at ${p.club}`)
      .join('. ');
    onNarrate(
      `Football · ${selectedCountry.name}`,
      `${footballProfile.teamName}, nicknamed ${footballProfile.nickname}, competes in ${footballProfile.confederation} and plays home matches at ${footballProfile.homeStadium}. ${footballProfile.iconicMoment} Featured squad players: ${playerNames}.`
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Nation Search & Quick Team Selector Bar */}
      <section className="rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-xs backdrop-blur-xl dark:border-white/[0.09] dark:bg-[#081226]/90">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950 sm:text-lg dark:text-white">
              Global National Football Directory
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Select any of the {countries.length} nations to inspect its national squad, star
              players, and live player portraits.
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onFocus={() => setShowCountryPicker(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowCountryPicker(true);
              }}
              placeholder="Switch nation (Brazil, Japan, Sri Lanka...)"
              aria-label="Search national football team"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pr-9 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/12 dark:bg-slate-950/75 dark:text-white dark:placeholder:text-slate-500"
            />
            {(searchQuery || showCountryPicker) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowCountryPicker(false);
                }}
                aria-label="Close country picker"
                className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {showCountryPicker && (
          <div className="mt-3 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-white/12 dark:bg-slate-950">
            {filteredCountries.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">
                No nations matched &ldquo;{searchQuery}&rdquo;.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCountries.map((c) => {
                  const active = c.iso === selectedCountry.iso;
                  return (
                    <button
                      key={c.iso}
                      type="button"
                      onClick={() => {
                        onSelectCountryCode(c.iso);
                        setShowCountryPicker(false);
                        setSearchQuery('');
                      }}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                        active
                          ? 'bg-sky-500/18 font-semibold text-sky-900 dark:text-sky-200'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.07]'
                      }`}
                    >
                      <img
                        src={`https://flagcdn.com/w40/${c.iso}.png`}
                        alt=""
                        width={22}
                        height={15}
                        referrerPolicy="no-referrer"
                        className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover ring-1 ring-black/10 dark:ring-white/15"
                      />
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                        {c.continent}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Quick Featured Nations Strip */}
        <div className="no-scrollbar mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          {featuredNations.map((nation) => {
            const isSelected = nation.iso === selectedCountry.iso;
            return (
              <button
                key={nation.iso}
                type="button"
                onClick={() => onSelectCountryCode(nation.iso)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'border-amber-400/60 bg-amber-500/15 text-amber-900 dark:text-amber-200'
                    : 'border-slate-200/80 bg-slate-50/80 text-slate-700 hover:border-sky-400/40 hover:bg-white dark:border-white/[0.08] dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-900'
                }`}
              >
                <img
                  src={`https://flagcdn.com/w40/${nation.iso}.png`}
                  alt=""
                  width={18}
                  height={12}
                  referrerPolicy="no-referrer"
                  className="h-3 w-4.5 rounded-[2px] object-cover"
                />
                <span>{nation.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Full-Width National Team Hero Card */}
      <section className="rounded-3xl border border-amber-400/25 bg-[#081226]/95 p-6 text-slate-100 shadow-[0_20px_56px_-22px_rgba(245,158,11,0.22)] sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-start gap-4 sm:items-center">
            <img
              src={`https://flagcdn.com/w160/${selectedCountry.iso}.png`}
              alt={`Flag of ${selectedCountry.name}`}
              width={72}
              height={48}
              referrerPolicy="no-referrer"
              className="h-12 w-18 shrink-0 rounded-xl object-cover ring-1 ring-white/20 sm:h-14 sm:w-21"
            />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{footballProfile.confederation}</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-sky-300">{footballProfile.nickname}</span>
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {footballProfile.teamName}
              </h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300 sm:text-sm">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  {footballProfile.homeStadium}
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span>{selectedCountry.capital}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleNarrateTeam}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/18 px-4 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/28 hover:text-white whitespace-nowrap"
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              <span>Narrate Team</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenCountryPage(selectedCountry)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-sky-500 px-4 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 whitespace-nowrap"
            >
              <Globe2 className="h-4 w-4" aria-hidden="true" />
              <span>Open {selectedCountry.name} Page</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-slate-950/65 p-4 sm:p-5">
          <p className="text-xs font-semibold text-sky-300">Heritage &amp; Iconic Highlight</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-200 sm:text-[15px]">
            {footballProfile.iconicMoment}
          </p>
        </div>
      </section>

      {/* Spacious Full-Width Squad & Player Portraits Grid */}
      <section
        aria-label={`${footballProfile.teamName} star players`}
        className="rounded-3xl border border-slate-200/90 bg-white/85 p-5 sm:p-6 dark:border-white/[0.09] dark:bg-[#081226]/90"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-4 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <Users className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-950 sm:text-lg dark:text-white">
                National Squad &amp; Key Players
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any player card to hear their profile read aloud on demand
              </p>
            </div>
          </div>

          <span className="tabular-clock text-xs font-semibold text-slate-500 dark:text-slate-400">
            {footballProfile.keyPlayers.length} featured players
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {footballProfile.keyPlayers.map((player) => {
            const portraitUrl = player.wikiSlug ? playerPortraits[player.wikiSlug] : undefined;
            const portraitValid = Boolean(portraitUrl && !failedUrls.has(portraitUrl));

            return (
              <article
                key={`${selectedCountry.iso}-${player.name}-${player.number}`}
                onClick={() =>
                  onNarrate(
                    `${player.name} · ${footballProfile.teamName}`,
                    `${player.name} wears number ${player.number} for ${footballProfile.teamName}, playing as ${player.position} with ${player.club}.`
                  )
                }
                className="group cursor-pointer overflow-hidden rounded-3xl border border-slate-200/85 bg-slate-50/85 transition-all hover:border-sky-400/50 dark:border-white/[0.08] dark:bg-slate-950/70 dark:hover:border-sky-400/40"
              >
                <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-[#0e2040] via-[#0a152b] to-[#060c1a] sm:h-60">
                  {portraitValid && portraitUrl ? (
                    <img
                      src={portraitUrl}
                      alt={`${player.name} — ${footballProfile.teamName}`}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={() => markFailed(portraitUrl)}
                      className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-sky-300">
                      <Shield className="h-8 w-8 text-sky-400/40" aria-hidden="true" />
                      <span className="mt-2 text-3xl font-bold tracking-tight">
                        {getInitials(player.name)}
                      </span>
                      <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {selectedCountry.iso} National XI
                      </span>
                    </div>
                  )}
                  <span className="tabular-clock absolute top-3 right-3 rounded-xl bg-[#050a18]/90 px-2.5 py-1 text-xs font-bold text-amber-300 ring-1 ring-amber-400/40">
                    #{player.number}
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="truncate text-base font-bold text-slate-950 dark:text-white">
                    {player.name}
                  </h3>
                  <p className="mt-1 truncate text-xs font-semibold text-sky-600 dark:text-cyan-300">
                    {player.position}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    {player.club}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
