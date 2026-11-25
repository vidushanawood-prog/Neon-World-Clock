import type { Country } from '../data/countries';

export interface RadioStation {
  id: string;
  name: string;
  streamUrl: string;
  favicon: string | null;
  tags: string[];
  language: string;
  bitrate: number;
  codec: string;
  countryCode: string;
  state: string;
  homepage: string | null;
  votes: number;
  clickcount: number;
  isFallback?: boolean;
}

interface RawRadioBrowserStation {
  stationuuid?: string;
  name?: string;
  url?: string;
  url_resolved?: string;
  favicon?: string;
  tags?: string;
  language?: string;
  bitrate?: number;
  codec?: string;
  countrycode?: string;
  state?: string;
  homepage?: string;
  votes?: number;
  clickcount?: number;
  hls?: number;
  lastcheckok?: number;
}

export interface RadioFetchResult {
  stations: RadioStation[];
  source: 'radio-browser' | 'fallback';
  note?: string;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const stationCache = new Map<string, { timestamp: number; result: RadioFetchResult }>();

function sanitizeHttpsUrl(raw?: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith('https://')) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeTags(raw?: string): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const clean = part.trim();
    if (!clean || clean.length > 26) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= 4) break;
  }
  return out;
}

function formatLanguage(raw?: string, countryFallback?: string): string {
  if (!raw || !raw.trim()) return countryFallback || 'International';
  const first = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  return first.length > 0 ? first.join(' / ') : countryFallback || 'International';
}

function mapRawStations(rawList: RawRadioBrowserStation[], country: Country): RadioStation[] {
  const seenStreams = new Set<string>();
  const seenNames = new Set<string>();
  const stations: RadioStation[] = [];

  for (const item of rawList) {
    // Only allow verified HTTPS streams so playback never fails mixed-content on HTTPS sites
    const streamUrl =
      sanitizeHttpsUrl(item.url_resolved) || sanitizeHttpsUrl(item.url);
    if (!streamUrl) continue;

    // Skip broken playlist wrapper extensions that browsers cannot decode directly
    const lowerUrl = streamUrl.toLowerCase().split('?')[0];
    if (lowerUrl.endsWith('.pls') || lowerUrl.endsWith('.asx') || lowerUrl.endsWith('.ram')) {
      continue;
    }

    const name = (item.name || '').replace(/\s+/g, ' ').trim();
    if (!name || name.length < 2) continue;

    const streamKey = streamUrl.toLowerCase();
    const nameKey = name.toLowerCase();
    if (seenStreams.has(streamKey) || seenNames.has(nameKey)) continue;
    seenStreams.add(streamKey);
    seenNames.add(nameKey);

    stations.push({
      id: item.stationuuid || `${country.iso}-${stations.length}-${nameKey}`,
      name,
      streamUrl,
      favicon: sanitizeHttpsUrl(item.favicon),
      tags: normalizeTags(item.tags),
      language: formatLanguage(item.language, country.language),
      bitrate: typeof item.bitrate === 'number' && item.bitrate > 0 ? item.bitrate : 128,
      codec: (item.codec || 'MP3').toUpperCase().slice(0, 10),
      countryCode: (item.countrycode || country.iso.split('-')[0]).toUpperCase(),
      state: (item.state || '').trim(),
      homepage: sanitizeHttpsUrl(item.homepage),
      votes: typeof item.votes === 'number' ? item.votes : 0,
      clickcount: typeof item.clickcount === 'number' ? item.clickcount : 0,
    });
  }

  return stations;
}

/**
 * Reliable public HTTPS fallback stations used only if Radio Browser API is unreachable
 * or returns zero HTTPS streams for a small territory.
 */
export function getOfflineFallbackStations(country: Country): RadioStation[] {
  const iso = country.iso.toLowerCase();
  const baseCode = iso.split('-')[0].toUpperCase();

  const globalReliable: RadioStation[] = [
    {
      id: `fallback-${iso}-bbc-world`,
      name: 'BBC World Service · Global Live',
      streamUrl: 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service',
      favicon: null,
      tags: ['News', 'World', 'Talk'],
      language: 'English',
      bitrate: 128,
      codec: 'MP3',
      countryCode: 'GB',
      state: 'London',
      homepage: 'https://www.bbc.co.uk/worldserviceradio',
      votes: 980,
      clickcount: 15000,
      isFallback: true,
    },
    {
      id: `fallback-${iso}-somafm-groove`,
      name: 'SomaFM Groove Salad · Ambient & Chill',
      streamUrl: 'https://ice2.somafm.com/groovesalad-128-mp3',
      favicon: null,
      tags: ['Ambient', 'Downtempo', 'Electronic'],
      language: 'English',
      bitrate: 128,
      codec: 'MP3',
      countryCode: 'US',
      state: 'San Francisco',
      homepage: 'https://somafm.com/groovesalad/',
      votes: 920,
      clickcount: 14200,
      isFallback: true,
    },
    {
      id: `fallback-${iso}-radio-paradise`,
      name: 'Radio Paradise · Main Eclectic Mix',
      streamUrl: 'https://stream.radioparadise.com/aac-128',
      favicon: null,
      tags: ['Eclectic', 'Rock', 'World Music'],
      language: 'English',
      bitrate: 128,
      codec: 'AAC',
      countryCode: 'US',
      state: 'California',
      homepage: 'https://radioparadise.com/',
      votes: 890,
      clickcount: 12800,
      isFallback: true,
    },
    {
      id: `fallback-${iso}-swiss-jazz`,
      name: 'Radio Swiss Jazz · International',
      streamUrl: 'https://stream.srg-ssr.ch/m/rsj/mp3_128',
      favicon: null,
      tags: ['Jazz', 'Soul', 'Blues'],
      language: 'English / German',
      bitrate: 128,
      codec: 'MP3',
      countryCode: 'CH',
      state: 'Basel',
      homepage: 'https://www.radioswissjazz.ch/en',
      votes: 760,
      clickcount: 10900,
      isFallback: true,
    },
    {
      id: `fallback-${iso}-swiss-classic`,
      name: 'Radio Swiss Classic · Symphony',
      streamUrl: 'https://stream.srg-ssr.ch/m/rsc_de/mp3_128',
      favicon: null,
      tags: ['Classical', 'Instrumental', 'Orchestra'],
      language: 'Instrumental',
      bitrate: 128,
      codec: 'MP3',
      countryCode: 'CH',
      state: 'Basel',
      homepage: 'https://www.radioswissclassic.ch/en',
      votes: 740,
      clickcount: 9800,
      isFallback: true,
    },
    {
      id: `fallback-${iso}-fip`,
      name: 'FIP Radio France · Eclectic Paris',
      streamUrl: 'https://icecast.radiofrance.fr/fip-midfi.mp3',
      favicon: null,
      tags: ['Eclectic', 'Jazz', 'World'],
      language: 'French',
      bitrate: 128,
      codec: 'MP3',
      countryCode: 'FR',
      state: 'Paris',
      homepage: 'https://www.radiofrance.fr/fip',
      votes: 710,
      clickcount: 9400,
      isFallback: true,
    },
    {
      id: `fallback-${iso}-somafm-drone`,
      name: 'SomaFM Drone Zone · Space Telemetry',
      streamUrl: 'https://ice2.somafm.com/dronezone-128-mp3',
      favicon: null,
      tags: ['Space', 'Ambient', 'Chillout'],
      language: 'Instrumental',
      bitrate: 128,
      codec: 'MP3',
      countryCode: 'US',
      state: 'San Francisco',
      homepage: 'https://somafm.com/dronezone/',
      votes: 680,
      clickcount: 8900,
      isFallback: true,
    },
    {
      id: `fallback-${iso}-radio-paradise-global`,
      name: 'Radio Paradise · Global & World Mix',
      streamUrl: 'https://stream.radioparadise.com/global-128',
      favicon: null,
      tags: ['World', 'Global', 'Acoustic'],
      language: country.language || 'International',
      bitrate: 128,
      codec: 'AAC',
      countryCode: baseCode,
      state: country.capital,
      homepage: 'https://radioparadise.com/',
      votes: 650,
      clickcount: 8200,
      isFallback: true,
    },
  ];

  return globalReliable;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 8000): Promise<RawRadioBrowserStation[]> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? (data as RawRadioBrowserStation[]) : [];
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchRadioStationsForCountry(
  country: Country,
  forceRefresh = false
): Promise<RadioFetchResult> {
  const cacheKey = country.iso.toLowerCase();
  const cached = stationCache.get(cacheKey);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // Normalize sub-region codes like gb-eng -> GB for Radio Browser ISO-3166-1 alpha-2 queries
  const iso2 = country.iso.split('-')[0].toUpperCase();
  const encodedCountryName = encodeURIComponent(country.name);

  const endpoints = [
    `https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/${encodeURIComponent(iso2)}?hidebroken=true&order=clickcount&reverse=true&limit=250`,
    `https://de2.api.radio-browser.info/json/stations/bycountrycodeexact/${encodeURIComponent(iso2)}?hidebroken=true&order=clickcount&reverse=true&limit=250`,
    `https://all.api.radio-browser.info/json/stations/bycountry/${encodedCountryName}?hidebroken=true&order=clickcount&reverse=true&limit=250`,
  ];

  for (const url of endpoints) {
    try {
      const raw = await fetchJsonWithTimeout(url, 8500);
      const mapped = mapRawStations(raw, country);
      if (mapped.length > 0) {
        const result: RadioFetchResult = {
          stations: mapped,
          source: 'radio-browser',
        };
        stationCache.set(cacheKey, { timestamp: Date.now(), result });
        return result;
      }
    } catch {
      // Try next mirror endpoint gracefully
    }
  }

  // Fallback to verified HTTPS international radio stations so playback always succeeds
  const fallbackResult: RadioFetchResult = {
    stations: getOfflineFallbackStations(country),
    source: 'fallback',
    note: `No direct HTTPS stations returned for ${country.name} right now — showing curated global live radio broadcasts.`,
  };
  stationCache.set(cacheKey, { timestamp: Date.now(), result: fallbackResult });
  return fallbackResult;
}

export const FEATURED_RADIO_ISOS = [
  'lk',
  'gb',
  'us',
  'jp',
  'in',
  'de',
  'fr',
  'au',
  'kr',
  'br',
  'ca',
  'za',
] as const;
