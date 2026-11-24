import { COUNTRIES, type Country } from '../data/countries';
import { getCountryConnectivity } from '../data/connectivity';
import { getCulturalProfile } from '../data/culturalProfiles';
import { getBaselineCountryProfile } from './countryProfile';
import {
  convertCurrency,
  formatTemperature,
  type WeatherEntry,
} from './intelligence';
import type { IssPosition } from './iss';
import {
  getOverheadSatellitesForCountry,
  type LiveSatellite,
} from './satellites';
import { GLOBAL_EXCHANGES, getExchangeStatus } from '../utils/markets';
import { formatClockForZone } from '../utils/time';

export interface NarrationLine {
  topic: string;
  text: string;
}

export interface VoiceNarratorContext {
  entryStage: 'landing' | 'auth' | 'booting' | 'dashboard';
  focusedCountry: Country;
  inspectedCountry: Country | null;
  pinnedCountries: readonly Country[];
  displayDate: Date;
  is24Hour: boolean;
  tempUnit: 'C' | 'F';
  weatherMap: Record<string, WeatherEntry>;
  rates: Record<string, number>;
  issPosition: IssPosition;
  satellites: readonly LiveSatellite[];
}

const WORLD_HIGHLIGHT_ISOS = [
  'lk',
  'jp',
  'gb',
  'us',
  'au',
  'sg',
  'ae',
  'fr',
  'in',
  'de',
  'br',
  'eg',
  'ca',
  'kr',
  'nz',
  'za',
  'ch',
  'it',
] as const;

/**
 * Splits narration text into short, crisp, natural sentences (~max 165 chars)
 * so Chrome and Android Web Speech never drop or truncate long utterances.
 */
export function splitIntoNaturalSentences(raw: string): string[] {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const sentenceChunks = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const output: string[] = [];
  for (const sentence of sentenceChunks) {
    if (sentence.length <= 165) {
      output.push(sentence);
      continue;
    }

    // Split overly long sentences cleanly on natural clause boundaries
    const clauses = sentence.split(/(?<=[,;—])\s+/);
    let buffer = '';
    for (const clause of clauses) {
      const candidate = buffer ? `${buffer} ${clause}` : clause;
      if (candidate.length <= 165) {
        buffer = candidate;
      } else {
        if (buffer) output.push(buffer.trim());
        buffer = clause;
      }
    }
    if (buffer) output.push(buffer.trim());
  }

  return output;
}

function formatSpokenClock(date: Date, timezone: string, is24Hour: boolean): {
  timePhrase: string;
  datePhrase: string;
  isDaytime: boolean;
  callLabel: string;
  utcOffset: string;
} {
  const clock = formatClockForZone(date, timezone, is24Hour);
  const hourNum = Number(clock.hours);
  const minNum = Number(clock.minutes);
  const minStr = minNum === 0 ? "o'clock" : minNum < 10 ? `oh ${minNum}` : `${minNum}`;

  const timePhrase = is24Hour
    ? `${clock.hours}:${clock.minutes}`
    : `${hourNum} ${minStr}${clock.dayPeriod ? ` ${clock.dayPeriod}` : ''}`;

  return {
    timePhrase,
    datePhrase: clock.fullDate,
    isDaytime: clock.isDaytime,
    callLabel: clock.callStatus.label,
    utcOffset: clock.utcOffset,
  };
}

function formatSpokenTemp(weather: WeatherEntry | undefined, unit: 'C' | 'F'): string | null {
  if (!weather) return null;
  const formatted = formatTemperature(weather.tempC, unit).replace('°C', ' degrees Celsius').replace('°F', ' degrees Fahrenheit');
  return `${formatted} with ${weather.label.toLowerCase()}`;
}

export function buildCountryLines(
  country: Country,
  ctx: VoiceNarratorContext,
  detailed = true
): NarrationLine[] {
  const topic = `${country.name} · ${country.capital}`;
  const spoken = formatSpokenClock(ctx.displayDate, country.timezone, ctx.is24Hour);
  const weather = ctx.weatherMap[country.iso];
  const tempPhrase = formatSpokenTemp(weather, ctx.tempUnit);
  const profile = getBaselineCountryProfile(country);
  const connectivity = getCountryConnectivity(country);
  const cultural = getCulturalProfile(country);
  const overhead = getOverheadSatellitesForCountry(country, ctx.satellites);

  const lines: NarrationLine[] = [];

  const line1 = tempPhrase
    ? `${country.name}, capital ${country.capital}. Local time is ${spoken.timePhrase}, ${spoken.callLabel}. Current weather is ${tempPhrase}.`
    : `${country.name}, capital ${country.capital}. Local time is ${spoken.timePhrase} on ${spoken.datePhrase}, ${spoken.callLabel}.`;

  for (const s of splitIntoNaturalSentences(line1)) {
    lines.push({ topic, text: s });
  }

  if (!detailed) {
    const cableNames = (
      connectivity.directCables.length > 0 ? connectivity.directCables : connectivity.transitCables
    )
      .slice(0, 2)
      .map((c) => c.name)
      .join(' and ');
    const quickLine = `Major ISPs include ${connectivity.isps.slice(0, 2).join(' and ')}, connected via ${cableNames}.`;
    for (const s of splitIntoNaturalSentences(quickLine)) {
      lines.push({ topic: `Connectivity · ${country.name}`, text: s });
    }
    return lines;
  }

  // Leadership, Driving Side, Currency & Cultural Attire
  const oneToLkr = convertCurrency(1, country.currency, 'LKR', ctx.rates);
  const fxText =
    country.currency === 'LKR'
      ? `Local currency is Sri Lankan Rupee.`
      : `One ${country.currency} equals approximately ${oneToLkr >= 1 ? oneToLkr.toFixed(1) : oneToLkr.toFixed(3)} Sri Lankan Rupees.`;

  const leaderText =
    profile.leader.name !== 'Head of State'
      ? `Leadership profile: ${profile.leader.title}, ${profile.leader.name}. Traffic keeps to the ${profile.drivingSide.toLowerCase()} side. ${fxText}`
      : `Region: ${profile.subregion}, driving on the ${profile.drivingSide.toLowerCase()} side. ${fxText}`;

  for (const s of splitIntoNaturalSentences(leaderText)) {
    lines.push({ topic: `Profile · ${country.name}`, text: s });
  }

  // Cultural showcase note
  for (const s of splitIntoNaturalSentences(
    `Cultural showcase highlights ${cultural.attireSummary}.`
  )) {
    lines.push({ topic: `Culture · ${country.name}`, text: s });
  }

  // Submarine cables & ISPs
  const cables =
    connectivity.directCables.length > 0 ? connectivity.directCables : connectivity.transitCables;
  const cableSummary = cables
    .slice(0, 2)
    .map((c) => c.name)
    .join(' and ');
  const ispSummary = connectivity.isps.slice(0, 3).join(', ');
  const connText = `Major internet providers in ${country.name} include ${ispSummary}. Submarine fiber links include ${cableSummary}.`;
  for (const s of splitIntoNaturalSentences(connText)) {
    lines.push({ topic: `Cables & ISPs · ${country.name}`, text: s });
  }

  // Overhead satellites & ISS status
  const nearestSat = overhead.nearest[0];
  const satText = nearestSat
    ? `Orbital telemetry over ${country.name}: the International Space Station is ${overhead.issMatch.statusLabel.toLowerCase()} at ${overhead.issMatch.distanceKm.toLocaleString()} kilometers ground range, and ${nearestSat.satellite.name} is ${nearestSat.statusLabel.toLowerCase()}.`
    : `The International Space Station is currently ${overhead.issMatch.distanceKm.toLocaleString()} kilometers from ${country.capital}.`;
  for (const s of splitIntoNaturalSentences(satText)) {
    lines.push({ topic: `Satellites · ${country.name}`, text: s });
  }

  return lines;
}

export function buildIssAndOrbitLines(ctx: VoiceNarratorContext): NarrationLine[] {
  const topic = 'Live ISS & Orbital Fleet';
  const latDir = ctx.issPosition.latitude >= 0 ? 'North' : 'South';
  const lngDir = ctx.issPosition.longitude >= 0 ? 'East' : 'West';
  const issSentence = `Live International Space Station update. Current coordinates are ${Math.abs(ctx.issPosition.latitude).toFixed(1)} degrees ${latDir}, ${Math.abs(ctx.issPosition.longitude).toFixed(1)} degrees ${lngDir}, orbiting at ${Math.round(ctx.issPosition.altitudeKm)} kilometers altitude and ${Math.round(ctx.issPosition.velocityKmh).toLocaleString()} kilometers per hour.`;

  const otherSats = ctx.satellites.filter((s) => s.id !== 'iss').slice(0, 3);
  const fleetSentence =
    otherSats.length > 0
      ? `Active orbital fleet also tracks ${otherSats.map((s) => `${s.name} in ${s.orbitType} orbit`).join(', ')}.`
      : '';

  const combined = `${issSentence} ${fleetSentence}`;
  return splitIntoNaturalSentences(combined).map((text) => ({ topic, text }));
}

export function buildMarketsLines(date: Date): NarrationLine[] {
  const topic = 'Global Stock Markets';
  const statuses = GLOBAL_EXCHANGES.map((ex) => getExchangeStatus(ex, date));
  const openOnes = statuses.filter((s) => s.state === 'open');
  const preOrAfter = statuses.filter((s) => s.state === 'pre' || s.state === 'after');

  let summary = '';
  if (openOnes.length > 0) {
    summary = `Global stock markets update. Currently open for live trading: ${openOnes
      .map((s) => `${s.exchange.code} in ${s.exchange.city}`)
      .join(', ')}.`;
  } else if (preOrAfter.length > 0) {
    summary = `Global stock markets update. Extended session active for ${preOrAfter
      .map((s) => `${s.exchange.code} ${s.statusLabel}`)
      .join(', ')}.`;
  } else {
    const nextUp = statuses.slice(0, 3);
    summary = `Global stock markets update. Major exchanges including ${nextUp
      .map((s) => s.exchange.code)
      .join(', ')} are currently between regular sessions.`;
  }

  return splitIntoNaturalSentences(summary).map((text) => ({ topic, text }));
}

export function buildWorldHighlightLines(
  ctx: VoiceNarratorContext,
  rotationIndex: number
): NarrationLine[] {
  const pool: Country[] = [];
  const seen = new Set<string>();

  for (const c of ctx.pinnedCountries) {
    if (!seen.has(c.iso)) {
      seen.add(c.iso);
      pool.push(c);
    }
  }
  for (const iso of WORLD_HIGHLIGHT_ISOS) {
    if (!seen.has(iso)) {
      const found = COUNTRIES.find((c) => c.iso === iso);
      if (found) {
        seen.add(iso);
        pool.push(found);
      }
    }
  }

  const activeIso = (ctx.inspectedCountry ?? ctx.focusedCountry).iso;
  const filteredPool = pool.filter((c) => c.iso !== activeIso);
  const pickList = filteredPool.length > 0 ? filteredPool : pool;
  const target = pickList[rotationIndex % pickList.length] ?? COUNTRIES[0];

  const spoken = formatSpokenClock(ctx.displayDate, target.timezone, ctx.is24Hour);
  const tempPhrase = formatSpokenTemp(ctx.weatherMap[target.iso], ctx.tempUnit);
  const text = tempPhrase
    ? `World clock check-in for ${target.name}. In ${target.capital}, it is ${spoken.timePhrase}, ${spoken.utcOffset}, with ${tempPhrase}.`
    : `World clock check-in for ${target.name}. In ${target.capital}, it is currently ${spoken.timePhrase}, ${spoken.utcOffset}, ${spoken.isDaytime ? 'daytime' : 'nighttime'}.`;

  return splitIntoNaturalSentences(text).map((s) => ({
    topic: `World Clock · ${target.name}`,
    text: s,
  }));
}

export function buildPanelLines(topic: string, text: string): NarrationLine[] {
  return splitIntoNaturalSentences(text).map((s) => ({ topic, text: s }));
}

/**
 * Generates the next fresh batch of spoken lines for the endless narration cycle.
 */
export function buildNextContinuousCycleLines(
  ctx: VoiceNarratorContext,
  cycleStep: number
): NarrationLine[] {
  // On Landing / Auth / Boot screens, still provide live ambient telemetry narration
  if (ctx.entryStage !== 'dashboard') {
    const slot = cycleStep % 3;
    if (slot === 0) {
      const welcome =
        ctx.entryStage === 'booting'
          ? 'Initializing Meridian Command Center. Synchronizing 215 global timezones, submarine fiber cables, and orbital telemetry.'
          : 'Welcome to Meridian Neon World Clock. Live tracking is active across 215 countries, global markets, and the International Space Station.';
      return buildPanelLines('Meridian Voice Assistant', welcome);
    }
    if (slot === 1) {
      return buildIssAndOrbitLines(ctx);
    }
    return buildWorldHighlightLines(ctx, Math.floor(cycleStep / 3));
  }

  const activeCountry = ctx.inspectedCountry ?? ctx.focusedCountry;
  const slot = cycleStep % 6;

  switch (slot) {
    case 0: {
      // Active country live time & weather
      const spoken = formatSpokenClock(ctx.displayDate, activeCountry.timezone, ctx.is24Hour);
      const tempPhrase = formatSpokenTemp(ctx.weatherMap[activeCountry.iso], ctx.tempUnit);
      const line = tempPhrase
        ? `Live update for ${activeCountry.name}. Local time in ${activeCountry.capital} is ${spoken.timePhrase}, with ${tempPhrase}.`
        : `Live update for ${activeCountry.name}. Local time in ${activeCountry.capital} is ${spoken.timePhrase}, ${spoken.callLabel}.`;
      return buildPanelLines(`Live Clock · ${activeCountry.name}`, line);
    }
    case 1: {
      // Active country leadership, currency & driving side
      const profile = getBaselineCountryProfile(activeCountry);
      const oneToLkr = convertCurrency(1, activeCountry.currency, 'LKR', ctx.rates);
      const fxPhrase =
        activeCountry.currency === 'LKR'
          ? 'Currency is the Sri Lankan Rupee.'
          : `Exchange rate is approximately ${oneToLkr >= 1 ? oneToLkr.toFixed(1) : oneToLkr.toFixed(3)} Sri Lankan Rupees per ${activeCountry.currency}.`;
      const line =
        profile.leader.name !== 'Head of State'
          ? `Country brief for ${activeCountry.name}. ${profile.leader.title} is ${profile.leader.name}. Vehicles drive on the ${profile.drivingSide.toLowerCase()} side. ${fxPhrase}`
          : `Country brief for ${activeCountry.name} in ${profile.subregion}. Vehicles drive on the ${profile.drivingSide.toLowerCase()} side. ${fxPhrase}`;
      return buildPanelLines(`Country Profile · ${activeCountry.name}`, line);
    }
    case 2: {
      // Active country submarine cables & ISPs
      const conn = getCountryConnectivity(activeCountry);
      const cables = conn.directCables.length > 0 ? conn.directCables : conn.transitCables;
      const cableNames = cables
        .slice(0, 2)
        .map((c) => c.name)
        .join(' and ');
      const line = `Connectivity briefing for ${activeCountry.name}. Major ISPs include ${conn.isps
        .slice(0, 3)
        .join(', ')}, routed through submarine fiber cables including ${cableNames}.`;
      return buildPanelLines(`Cables & ISPs · ${activeCountry.name}`, line);
    }
    case 3: {
      // Live ISS & Orbiting Satellites
      return buildIssAndOrbitLines(ctx);
    }
    case 4: {
      // Global Stock Markets status
      return buildMarketsLines(ctx.displayDate);
    }
    case 5:
    default: {
      // Rotating World Clock highlights across pinned & global cities
      return buildWorldHighlightLines(ctx, Math.floor(cycleStep / 6));
    }
  }
}
