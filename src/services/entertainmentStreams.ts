export type EntertainmentCategory = 'entertainment' | 'cartoons' | 'movies' | 'music';

export interface EntertainmentChannel {
  id: string;
  name: string;
  url: string;
  category: EntertainmentCategory;
  logo?: string;
  resolution?: string;
  sourceLabel: string;
  featured?: boolean;
}

export interface EntertainmentPlaylistResult {
  channels: EntertainmentChannel[];
  loadedPlaylists: number;
  totalPlaylists: number;
  usedFallbackOnly: boolean;
  fetchedAt: number;
}

interface PlaylistSource {
  category: EntertainmentCategory;
  label: string;
  url: string;
}

const PLAYLIST_SOURCES: readonly PlaylistSource[] = [
  {
    category: 'entertainment',
    label: 'IPTV-Org Entertainment',
    url: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u',
  },
  {
    category: 'movies',
    label: 'IPTV-Org Movies',
    url: 'https://iptv-org.github.io/iptv/categories/movies.m3u',
  },
  {
    category: 'cartoons',
    label: 'IPTV-Org Animation',
    url: 'https://iptv-org.github.io/iptv/categories/animation.m3u',
  },
  {
    category: 'music',
    label: 'IPTV-Org Music',
    url: 'https://iptv-org.github.io/iptv/categories/music.m3u',
  },
];

/**
 * Verified CORS-friendly HTTPS HLS (.m3u8) entertainment channels across all 4 genres
 * (entertainment, cartoons, movies, music) so playback starts reliably right away
 * and remains available even if a remote playlist endpoint is temporarily slow.
 */
export const VERIFIED_SPOTLIGHT_CHANNELS: readonly EntertainmentChannel[] = [
  {
    id: 'spotlight-redbull-tv',
    name: 'Red Bull TV',
    url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    category: 'entertainment',
    resolution: '1080p',
    sourceLabel: 'Spotlight · Entertainment',
    featured: true,
  },
  {
    id: 'spotlight-24h-free-movies',
    name: '24 Hour Free Movies',
    url: 'https://d1j2u714xk898n.cloudfront.net/scheduler/scheduleMaster/145.m3u8',
    category: 'movies',
    resolution: '720p',
    sourceLabel: 'Spotlight · Movies',
    featured: true,
  },
  {
    id: 'spotlight-cartoon-cartoons',
    name: 'Cartoon Cartoons',
    url: 'https://cartooncartoons.thatsoretro.com/hls/stream.m3u8',
    category: 'cartoons',
    resolution: '720p',
    sourceLabel: 'Spotlight · Cartoons',
    featured: true,
  },
  {
    id: 'spotlight-30a-tv',
    name: '30A Television Channel',
    url: 'https://30a-tv.com/feeds/masters/30atv.m3u8',
    category: 'entertainment',
    resolution: '720p',
    sourceLabel: 'Spotlight · Entertainment',
    featured: true,
  },
  {
    id: 'spotlight-30a-classic-movies',
    name: '30A TV Classic Movies',
    url: 'https://30a-tv.com/feeds/pzaz/30atvmovies.m3u8',
    category: 'movies',
    resolution: '720p',
    sourceLabel: 'Spotlight · Movies',
    featured: true,
  },
  {
    id: 'spotlight-botflix-tv',
    name: 'Botflix Animation TV',
    url: 'https://hls.botflix.tv/tv/index.m3u8',
    category: 'cartoons',
    resolution: '1080p',
    sourceLabel: 'Spotlight · Cartoons',
    featured: true,
  },
  {
    id: 'spotlight-3abn-kids',
    name: '3ABN Kids',
    url: 'https://3abn.bozztv.com/3abn2/Kids_live/smil:Kids_live.smil/playlist.m3u8',
    category: 'cartoons',
    resolution: '720p',
    sourceLabel: 'Spotlight · Cartoons',
    featured: true,
  },
  {
    id: 'spotlight-9xm',
    name: '9XM Music',
    url: 'https://wiselp.wiseplayout.com/9XM/master.m3u8',
    category: 'music',
    resolution: '1080p',
    sourceLabel: 'Spotlight · Music',
    featured: true,
  },
  {
    id: 'spotlight-9x-jalwa',
    name: '9X Jalwa Music',
    url: 'https://wiselp.wiseplayout.com/9X_Jalwa/master.m3u8',
    category: 'music',
    resolution: '1080p',
    sourceLabel: 'Spotlight · Music',
    featured: true,
  },
  {
    id: 'spotlight-4-music',
    name: '4 Music Live',
    url: 'https://musichls.persiana.live/hls/stream.m3u8',
    category: 'music',
    resolution: '720p',
    sourceLabel: 'Spotlight · Music',
    featured: true,
  },
  {
    id: 'spotlight-4u-tv',
    name: '4U TV Entertainment',
    url: 'https://hls.4utv.live/hls/stream.m3u8',
    category: 'entertainment',
    resolution: '720p',
    sourceLabel: 'Spotlight · Entertainment',
    featured: true,
  },
  {
    id: 'spotlight-adn-tv',
    name: 'ADN Anime TV+',
    url: 'https://d3b73b34o7cvkq.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-gz2sgqzp076kf/adn.m3u8',
    category: 'cartoons',
    resolution: '720p',
    sourceLabel: 'Spotlight · Cartoons',
    featured: true,
  },
];

/**
 * Strict news, politics, business-news, weather-news, and parliamentary channel exclusion regex.
 * Applied against channel name, group-title, tvg-id, and stream URL.
 */
const NEWS_EXCLUSION_REGEX =
  /\b(news|cnn|bbc\s*news|bbc\s*world|sky\s*news|fox\s*news|msnbc|cnbc|bloomberg|al\s*jazeera|aljazeera|euronews|france\s*24|france24|dw\s*english|dw\s*news|nhk\s*world|cgtn|wion|ndtv|aaj\s*tak|republic\s*tv|times\s*now|india\s*today|c-?span|parliament|legislative|weather\s*channel|accuweather|breaking|headlines|notic|noticias|telediario|actualit|nachrichten|tagesschau|novosti|vesti|khabar|akhbar|samachar|haber|informacion|24\s*horas|bfm\s*tv|cnews|lci|rt\s*news|trtworld|trt\s*world|arirang|cna\b|channel\s*news|business\s*tv|finance\s*news|politics|press\s*tv|abc\s*news|cbs\s*news|nbc\s*news|gb\s*news|talktv|newsmax|oann|tv5monde\s*info)\b/i;

const BLOCKED_TAGS_REGEX = /\[(geo-blocked|not\s*24\/7|offline)\]/i;

const CARTOON_HINT_REGEX =
  /\b(cartoon|anime|kids|toon|nick|disney|junior|boomer|pogo|animax|animation|manga|baby|peppa|looney|jetix|cbbc|cbeebies|pb[s]?\s*kids|pixar|super\s*rtl|kika|gulli)\b/i;

const MOVIE_HINT_REGEX =
  /\b(movie|movies|cinema|film|films|hollywood|bollywood|cine|action|thriller|horror|sci-?fi|western|classic\s*tv|hallmark|romcom|mystery|drama\s*movies|popcorn|flix|box\s*office)\b/i;

const MUSIC_HINT_REGEX =
  /\b(music|mtv|vh1|vevo|hits|pop|rock|jazz|hip\s*hop|rap|edm|dance|club|concert|melody|beats|audio|fm\s*tv|trace|kiss\s*tv|kerrang|box\s*hits|deluxe\s*music|mezz[o]?|stingray|jukebox|radio\s*vision)\b/i;

const ENGLISH_PRIORITY_HINT_REGEX =
  /\b(english|usa|uk|us|hollywood|classic|cartoon|anime|movies|cinema|music|hits|pop|rock|comedy|action|retro|thriller|drama|sci-?fi|kids|family|flix|30a|red\s*bull|pluto|plex|tastemade|failarmy|pet\s*collective|people\s*are\s*awesome)\b/i;

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
    if (!lowerPath.includes('.m3u8')) return false;
    // Skip redirector proxy URLs that frequently fail browser CORS in sandboxed/client HLS.js players
    if (parsed.hostname === 'jmp2.uk') return false;
    return true;
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

function resolveCategory(
  sourceCategory: EntertainmentCategory,
  name: string,
  groupTitle: string
): EntertainmentCategory {
  const combined = `${name} ${groupTitle}`;
  if (sourceCategory === 'cartoons' || CARTOON_HINT_REGEX.test(combined)) {
    return 'cartoons';
  }
  if (sourceCategory === 'movies' || MOVIE_HINT_REGEX.test(combined)) {
    return 'movies';
  }
  if (sourceCategory === 'music' || MUSIC_HINT_REGEX.test(combined)) {
    return 'music';
  }
  return 'entertainment';
}

function isLatinFriendlyName(name: string): boolean {
  const latinChars = (name.match(/[A-Za-z0-9]/g) || []).length;
  return latinChars >= Math.max(2, Math.floor(name.length * 0.45));
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

    // Scan forward past any #EXTVLCOPT or extra comment directives to the stream URL
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

    const groupTitle = extractAttr(line, 'group-title');
    const tvgId = extractAttr(line, 'tvg-id');
    const logo = isSafeHttpsImage(extractAttr(line, 'tvg-logo'));

    // Strictly reject any news-related channels across title, group, tvg-id, and URL
    const inspectionText = `${rawTitle} ${groupTitle} ${tvgId} ${urlLine}`;
    if (NEWS_EXCLUSION_REGEX.test(inspectionText)) continue;

    const { name, resolution } = cleanChannelTitle(rawTitle);
    if (!name || name.length < 2) continue;

    const category = resolveCategory(source.category, name, groupTitle);

    parsed.push({
      id: `iptv-${category}-${parsed.length}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28)}`,
      name,
      url: urlLine,
      category,
      logo,
      resolution,
      sourceLabel: source.label,
      featured: false,
    });
  }

  return parsed;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
let cachedResult: EntertainmentPlaylistResult | null = null;
let inflightPromise: Promise<EntertainmentPlaylistResult> | null = null;

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
    const seenUrls = new Set<string>();
    const seenNames = new Set<string>();
    const merged: EntertainmentChannel[] = [];

    // 1. Seed with verified spotlight channels first so playback works immediately on click/load
    for (const ch of VERIFIED_SPOTLIGHT_CHANNELS) {
      const normalizedUrl = ch.url.trim();
      const normalizedName = ch.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        seenNames.add(normalizedName);
        merged.push(ch);
      }
    }

    // 2. Fetch all 4 public iptv-org entertainment M3U playlists in parallel
    let loadedPlaylists = 0;
    const fetchedBatches = await Promise.all(
      PLAYLIST_SOURCES.map(async (source) => {
        try {
          const controller = new AbortController();
          const timer = window.setTimeout(() => controller.abort(), 9000);
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
      })
    );

    // 3. Score and deduplicate parsed channels, preferring English/international entertainment names & HD feeds
    const parsedPool: EntertainmentChannel[] = [];
    for (const batch of fetchedBatches) {
      for (const ch of batch) {
        const normUrl = ch.url.trim();
        const normName = ch.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
        if (seenUrls.has(normUrl) || seenNames.has(normName)) continue;
        seenUrls.add(normUrl);
        seenNames.add(normName);
        parsedPool.push(ch);
      }
    }

    const scoreChannel = (ch: EntertainmentChannel): number => {
      let score = 0;
      if (isLatinFriendlyName(ch.name)) score += 30;
      if (ENGLISH_PRIORITY_HINT_REGEX.test(ch.name)) score += 25;
      if (ch.resolution === '1080p') score += 12;
      else if (ch.resolution === '720p') score += 8;
      if (ch.logo) score += 5;
      if (ch.url.includes('cloudfront.net') || ch.url.includes('akamaized.net') || ch.url.includes('amagi.tv')) {
        score += 10;
      }
      return score;
    };

    parsedPool.sort((a, b) => {
      const diff = scoreChannel(b) - scoreChannel(a);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });

    // Cap per category so the channel directory stays ultra-snappy on mobile and desktop (~220 channels total)
    const perCategoryCap: Record<EntertainmentCategory, number> = {
      entertainment: 65,
      movies: 55,
      cartoons: 45,
      music: 55,
    };
    const perCategoryCount: Record<EntertainmentCategory, number> = {
      entertainment: 0,
      movies: 0,
      cartoons: 0,
      music: 0,
    };

    for (const ch of parsedPool) {
      if (perCategoryCount[ch.category] >= perCategoryCap[ch.category]) continue;
      perCategoryCount[ch.category] += 1;
      merged.push(ch);
    }

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
