export type EntertainmentCategory =
  | 'animation'
  | 'movies'
  | 'family'
  | 'sports'
  | 'news'
  | 'entertainment'
  | 'music'
  | 'comedy'
  | 'documentary'
  | 'lifestyle'
  | 'kids'
  | 'series';

export type CategoryFilter = 'all' | EntertainmentCategory;

export type ChannelHealth = 'working' | 'offline';

export interface EntertainmentChannel {
  id: string;
  name: string;
  url: string;
  /** Primary category for display */
  category: EntertainmentCategory;
  /** All category playlists that include this stream URL (preserved during URL deduplication) */
  categories: EntertainmentCategory[];
  logo?: string;
  resolution?: string;
  sourceLabel: string;
  featured?: boolean;
  qualityScore: number;
}

export interface EntertainmentPlaylistResult {
  channels: EntertainmentChannel[];
  loadedPlaylists: number;
  totalPlaylists: number;
  usedFallbackOnly: boolean;
  fetchedAt: number;
}

export const CATEGORY_TABS: readonly { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'animation', label: 'Cartoons & Anime' },
  { id: 'movies', label: 'Movies' },
  { id: 'sports', label: 'Sports' },
  { id: 'news', label: 'News' },
  { id: 'family', label: 'Family' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'music', label: 'Music' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'documentary', label: 'Documentary' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'kids', label: 'Kids' },
  { id: 'series', label: 'Series' },
];

export const CATEGORY_LABELS: Record<EntertainmentCategory, string> = {
  animation: 'Cartoons & Anime',
  movies: 'Movies',
  family: 'Family',
  sports: 'Sports',
  news: 'News',
  entertainment: 'Entertainment',
  music: 'Music',
  comedy: 'Comedy',
  documentary: 'Documentary',
  lifestyle: 'Lifestyle',
  kids: 'Kids',
  series: 'Series',
};

interface PlaylistSource {
  category: EntertainmentCategory;
  label: string;
  url: string;
}

const PLAYLIST_SOURCES: readonly PlaylistSource[] = [
  {
    category: 'animation',
    label: 'Cartoons & Anime',
    url: 'https://iptv-org.github.io/iptv/categories/animation.m3u',
  },
  {
    category: 'movies',
    label: 'Movies',
    url: 'https://iptv-org.github.io/iptv/categories/movies.m3u',
  },
  {
    category: 'family',
    label: 'Family',
    url: 'https://iptv-org.github.io/iptv/categories/family.m3u',
  },
  {
    category: 'sports',
    label: 'Sports',
    url: 'https://iptv-org.github.io/iptv/categories/sports.m3u',
  },
  {
    category: 'news',
    label: 'News',
    url: 'https://iptv-org.github.io/iptv/categories/news.m3u',
  },
  {
    category: 'entertainment',
    label: 'Entertainment',
    url: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u',
  },
  {
    category: 'music',
    label: 'Music',
    url: 'https://iptv-org.github.io/iptv/categories/music.m3u',
  },
  {
    category: 'comedy',
    label: 'Comedy',
    url: 'https://iptv-org.github.io/iptv/categories/comedy.m3u',
  },
  {
    category: 'documentary',
    label: 'Documentary',
    url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u',
  },
  {
    category: 'lifestyle',
    label: 'Lifestyle',
    url: 'https://iptv-org.github.io/iptv/categories/lifestyle.m3u',
  },
  {
    category: 'kids',
    label: 'Kids',
    url: 'https://iptv-org.github.io/iptv/categories/kids.m3u',
  },
  {
    category: 'series',
    label: 'Series',
    url: 'https://iptv-org.github.io/iptv/categories/series.m3u',
  },
];

/**
 * Verified CORS-friendly HTTPS HLS (.m3u8) spotlight channels seeded first so playback
 * starts instantaneously while all 12 iptv-org playlists download and background verification runs.
 */
export const VERIFIED_SPOTLIGHT_CHANNELS: readonly EntertainmentChannel[] = [
  {
    id: 'spotlight-redbull-tv',
    name: 'Red Bull TV',
    url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    category: 'sports',
    categories: ['sports', 'entertainment'],
    resolution: '1080p',
    sourceLabel: 'Spotlight · Sports & Entertainment',
    featured: true,
    qualityScore: 100,
  },
  {
    id: 'spotlight-24h-free-movies',
    name: '24 Hour Free Movies',
    url: 'https://d1j2u714xk898n.cloudfront.net/scheduler/scheduleMaster/145.m3u8',
    category: 'movies',
    categories: ['movies', 'entertainment'],
    resolution: '720p',
    sourceLabel: 'Spotlight · Movies',
    featured: true,
    qualityScore: 99,
  },
  {
    id: 'spotlight-cartoon-cartoons',
    name: 'Cartoon Cartoons',
    url: 'https://cartooncartoons.thatsoretro.com/hls/stream.m3u8',
    category: 'animation',
    categories: ['animation', 'kids', 'family'],
    resolution: '720p',
    sourceLabel: 'Spotlight · Cartoons & Anime',
    featured: true,
    qualityScore: 98,
  },
  {
    id: 'spotlight-30a-tv',
    name: '30A Television Channel',
    url: 'https://30a-tv.com/feeds/masters/30atv.m3u8',
    category: 'entertainment',
    categories: ['entertainment', 'lifestyle'],
    resolution: '720p',
    sourceLabel: 'Spotlight · Entertainment',
    featured: true,
    qualityScore: 97,
  },
  {
    id: 'spotlight-30a-classic-movies',
    name: '30A TV Classic Movies',
    url: 'https://30a-tv.com/feeds/pzaz/30atvmovies.m3u8',
    category: 'movies',
    categories: ['movies', 'family'],
    resolution: '720p',
    sourceLabel: 'Spotlight · Movies',
    featured: true,
    qualityScore: 96,
  },
  {
    id: 'spotlight-botflix-tv',
    name: 'Botflix Animation TV',
    url: 'https://hls.botflix.tv/tv/index.m3u8',
    category: 'animation',
    categories: ['animation', 'comedy'],
    resolution: '1080p',
    sourceLabel: 'Spotlight · Cartoons & Anime',
    featured: true,
    qualityScore: 95,
  },
  {
    id: 'spotlight-3abn-kids',
    name: '3ABN Kids',
    url: 'https://3abn.bozztv.com/3abn2/Kids_live/smil:Kids_live.smil/playlist.m3u8',
    category: 'kids',
    categories: ['kids', 'family', 'animation'],
    resolution: '720p',
    sourceLabel: 'Spotlight · Kids & Family',
    featured: true,
    qualityScore: 94,
  },
  {
    id: 'spotlight-9xm',
    name: '9XM Music',
    url: 'https://wiselp.wiseplayout.com/9XM/master.m3u8',
    category: 'music',
    categories: ['music', 'entertainment'],
    resolution: '1080p',
    sourceLabel: 'Spotlight · Music',
    featured: true,
    qualityScore: 93,
  },
  {
    id: 'spotlight-9x-jalwa',
    name: '9X Jalwa Music',
    url: 'https://wiselp.wiseplayout.com/9X_Jalwa/master.m3u8',
    category: 'music',
    categories: ['music'],
    resolution: '1080p',
    sourceLabel: 'Spotlight · Music',
    featured: true,
    qualityScore: 92,
  },
  {
    id: 'spotlight-4-music',
    name: '4 Music Live',
    url: 'https://musichls.persiana.live/hls/stream.m3u8',
    category: 'music',
    categories: ['music'],
    resolution: '720p',
    sourceLabel: 'Spotlight · Music',
    featured: true,
    qualityScore: 91,
  },
  {
    id: 'spotlight-4u-tv',
    name: '4U TV Entertainment',
    url: 'https://hls.4utv.live/hls/stream.m3u8',
    category: 'entertainment',
    categories: ['entertainment', 'series'],
    resolution: '720p',
    sourceLabel: 'Spotlight · Entertainment',
    featured: true,
    qualityScore: 90,
  },
  {
    id: 'spotlight-adn-tv',
    name: 'ADN Anime TV+',
    url: 'https://d3b73b34o7cvkq.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-gz2sgqzp076kf/adn.m3u8',
    category: 'animation',
    categories: ['animation', 'series'],
    resolution: '720p',
    sourceLabel: 'Spotlight · Cartoons & Anime',
    featured: true,
    qualityScore: 89,
  },
];

const BLOCKED_TAGS_REGEX = /\[(geo-blocked|not\s*24\/7|offline)\]/i;

const PRIORITY_BRAND_REGEX =
  /\b(english|usa|uk|hollywood|classic|cartoon|anime|movies|cinema|music|hits|comedy|action|retro|thriller|drama|sci-?fi|kids|family|flix|sports|espn|nfl|nba|fifa|documentary|history|nature|science|lifestyle|food|travel|series|dw|france\s*24|nhk|euronews|al\s*jazeera|sky|abc|cbs|nbc|pluto|plex|30a|red\s*bull)\b/i;

function extractAttr(line: string, attrName: string): string {
  const match = line.match(new RegExp(`${attrName}="([^"]*)"`, 'i'));
  return match ? match[1].trim() : '';
}

function cleanChannelTitle(rawTitle: string): { name: string; resolution?: string } {
  const resMatch = rawTitle.match(/\((\d{3,4}p)\)/i);
  const resolution = resMatch ? resMatch[1].toLowerCase() : undefined;
  const cleaned = rawTitle
    .replace(/\(\d{3,4}p\)/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { name: cleaned, resolution };
}

function isStrictHttpsHlsUrl(rawUrl: string): boolean {
  if (!rawUrl || !rawUrl.startsWith('https://')) return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const lowerPath = `${parsed.pathname}${parsed.search}`.toLowerCase();
    return lowerPath.includes('.m3u8');
  } catch {
    return false;
  }
}

function isSafeHttpsImage(rawUrl: string): string | undefined {
  if (!rawUrl || !rawUrl.startsWith('https://')) return undefined;
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' ? rawUrl : undefined;
  } catch {
    return undefined;
  }
}

function isLatinFriendlyName(name: string): boolean {
  const latinChars = (name.match(/[A-Za-z0-9]/g) || []).length;
  return latinChars >= Math.max(2, Math.floor(name.length * 0.45));
}

function computeQualityScore(
  name: string,
  url: string,
  resolution?: string,
  logo?: string
): number {
  let score = 0;
  if (isLatinFriendlyName(name)) score += 25;
  if (PRIORITY_BRAND_REGEX.test(name)) score += 20;
  if (resolution === '1080p') score += 14;
  else if (resolution === '720p') score += 10;
  else if (resolution === '576p' || resolution === '480p') score += 4;
  if (logo) score += 5;

  const lowerUrl = url.toLowerCase();
  if (
    lowerUrl.includes('cloudfront.net') ||
    lowerUrl.includes('akamaized.net') ||
    lowerUrl.includes('amagi.tv') ||
    lowerUrl.includes('fastly.net') ||
    lowerUrl.includes('wurl.com')
  ) {
    score += 12;
  }
  // Deprioritize redirect proxies that frequently fail browser CORS while still keeping them discoverable
  if (lowerUrl.includes('jmp2.uk')) {
    score -= 18;
  }
  return score;
}

function parseM3uPlaylist(
  rawText: string,
  source: PlaylistSource
): EntertainmentChannel[] {
  const lines = rawText.split(/\r?\n/);
  const parsed: EntertainmentChannel[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXTINF:')) continue;

    let urlLine = '';
    let j = i + 1;
    while (j < lines.length) {
      const candidate = lines[j].trim();
      if (!candidate) {
        j++;
        continue;
      }
      if (candidate.startsWith('#EXTINF:')) {
        break;
      }
      if (!candidate.startsWith('#')) {
        urlLine = candidate;
        break;
      }
      j++;
    }

    if (!isStrictHttpsHlsUrl(urlLine)) continue;

    const commaIndex = line.lastIndexOf(',');
    const rawTitle = commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : '';
    if (!rawTitle || BLOCKED_TAGS_REGEX.test(rawTitle)) continue;

    const logo = isSafeHttpsImage(extractAttr(line, 'tvg-logo'));
    const { name, resolution } = cleanChannelTitle(rawTitle);
    if (!name || name.length < 2) continue;

    const qualityScore = computeQualityScore(name, urlLine, resolution, logo);

    parsed.push({
      id: `iptv-${source.category}-${parsed.length}-${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 24)}`,
      name,
      url: urlLine,
      category: source.category,
      categories: [source.category],
      logo,
      resolution,
      sourceLabel: `IPTV-Org · ${source.label}`,
      featured: false,
      qualityScore,
    });
  }

  return parsed;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
let cachedResult: EntertainmentPlaylistResult | null = null;
let inflightPromise: Promise<EntertainmentPlaylistResult> | null = null;

/**
 * Session-scoped health cache so verified Live / Offline streams stay remembered
 * across tab/page navigation without hammering broadcasters repeatedly.
 */
const HEALTH_CACHE_TTL_MS = 10 * 60 * 1000;
const channelHealthCache = new Map<string, { status: ChannelHealth; checkedAt: number }>();

export function getCachedHealthSnapshot(): Record<string, ChannelHealth> {
  const now = Date.now();
  const snapshot: Record<string, ChannelHealth> = {};
  for (const [id, entry] of channelHealthCache.entries()) {
    if (now - entry.checkedAt < HEALTH_CACHE_TTL_MS) {
      snapshot[id] = entry.status;
    }
  }
  return snapshot;
}

export function setCachedChannelHealth(channelId: string, status: ChannelHealth): void {
  channelHealthCache.set(channelId, { status, checkedAt: Date.now() });
}

export function clearCachedChannelHealth(channelId?: string): void {
  if (channelId) {
    channelHealthCache.delete(channelId);
  } else {
    channelHealthCache.clear();
  }
}

/**
 * Lightweight, browser-CORS-accurate HTTPS HLS (.m3u8) health probe.
 * Reads only the initial manifest chunk (aborts immediately after verifying #EXTM3U)
 * with a short timeout so mobile browsers remain smooth and lag-free.
 */
export async function probeHlsStream(
  url: string,
  timeoutMs = 3000,
  externalSignal?: AbortSignal
): Promise<ChannelHealth> {
  if (externalSignal?.aborted) return 'offline';

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      return 'offline';
    }

    // Read only the first chunk to confirm valid HLS (#EXTM3U) without downloading large bodies
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      try {
        const { value } = await reader.read();
        void reader.cancel().catch(() => {});
        if (!value || value.length === 0) return 'offline';
        const snippet = new TextDecoder().decode(value.slice(0, 512));
        return snippet.includes('#EXTM3U') ? 'working' : 'offline';
      } catch {
        void reader.cancel().catch(() => {});
        return 'offline';
      }
    }

    const text = await response.text();
    return text.slice(0, 512).includes('#EXTM3U') ? 'working' : 'offline';
  } catch {
    return 'offline';
  } finally {
    window.clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

export async function loadEntertainmentChannels(
  forceRefresh = false
): Promise<EntertainmentPlaylistResult> {
  if (!forceRefresh && cachedResult && Date.now() - cachedResult.fetchedAt < CACHE_TTL_MS) {
    return cachedResult;
  }
  if (!forceRefresh && inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = (async () => {
    const byUrl = new Map<string, EntertainmentChannel>();
    const merged: EntertainmentChannel[] = [];

    // 1. Seed verified instant-play spotlight channels first
    for (const ch of VERIFIED_SPOTLIGHT_CHANNELS) {
      const copy: EntertainmentChannel = { ...ch, categories: [...ch.categories] };
      byUrl.set(copy.url, copy);
      merged.push(copy);
    }

    // 2. Fetch all 12 public iptv-org category playlists in two smooth waves of 6
    let loadedPlaylists = 0;
    const fetchOne = async (source: PlaylistSource): Promise<EntertainmentChannel[]> => {
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 10000);
        const response = await fetch(source.url, {
          signal: controller.signal,
          mode: 'cors',
        });
        window.clearTimeout(timer);
        if (!response.ok) return [];
        const text = await response.text();
        loadedPlaylists += 1;
        return parseM3uPlaylist(text, source);
      } catch {
        return [];
      }
    };

    const wave1 = await Promise.all(PLAYLIST_SOURCES.slice(0, 6).map(fetchOne));
    const wave2 = await Promise.all(PLAYLIST_SOURCES.slice(6).map(fetchOne));
    const allBatches = [...wave1, ...wave2];

    // 3. Deduplicate strictly by HTTPS stream URL while preserving multi-category membership
    const parsedPool: EntertainmentChannel[] = [];
    for (const batch of allBatches) {
      for (const ch of batch) {
        const existing = byUrl.get(ch.url);
        if (existing) {
          if (!existing.categories.includes(ch.category)) {
            existing.categories.push(ch.category);
          }
          if (!existing.logo && ch.logo) {
            existing.logo = ch.logo;
          }
          continue;
        }
        byUrl.set(ch.url, ch);
        parsedPool.push(ch);
      }
    }

    // Sort parsed pool cleanly by quality score then alphabetical name (NO cap so total easily exceeds 1,000+)
    parsedPool.sort((a, b) => {
      const diff = b.qualityScore - a.qualityScore;
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });

    merged.push(...parsedPool);

    const result: EntertainmentPlaylistResult = {
      channels: merged,
      loadedPlaylists,
      totalPlaylists: PLAYLIST_SOURCES.length,
      usedFallbackOnly: loadedPlaylists === 0,
      fetchedAt: Date.now(),
    };

    cachedResult = result;
    inflightPromise = null;
    return result;
  })();

  return inflightPromise;
}
