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
  /** All category tabs this stream belongs to (preserved during URL deduplication) */
  categories: EntertainmentCategory[];
  logo?: string;
  resolution?: string;
  sourceLabel: string;
  featured?: boolean;
  /** True when parsed from one of the 10 custom M3U8 playlist sources */
  isCustomPlaylist?: boolean;
  /** Source playlist URL for custom M3U8 entries */
  playlistSourceUrl?: string;
  qualityScore: number;
  /** Pre-computed lowercase search haystack for lag-free filtering across 10,000+ channels */
  searchText: string;
}

export interface EntertainmentPlaylistResult {
  channels: EntertainmentChannel[];
  loadedPlaylists: number;
  totalPlaylists: number;
  customChannelsCount: number;
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

interface MasterPlaylistSource {
  id: 'iptv-org' | 'free-tv' | 'pluto' | 'tubi';
  label: string;
  url: string;
  timeoutMs: number;
}

/**
 * 4 verified HTTP-200 CORS-open GitHub master playlists delivering 10,000+ unique HTTPS HLS (.m3u8) channels
 * across Movies, Cartoons & Anime, Kids, Entertainment, Sports, News, Music, Comedy, Documentary, Family, Lifestyle & Series.
 */
const MASTER_PLAYLIST_SOURCES: readonly MasterPlaylistSource[] = [
  {
    id: 'iptv-org',
    label: 'IPTV-Org Global',
    url: 'https://iptv-org.github.io/iptv/index.category.m3u',
    timeoutMs: 15000,
  },
  {
    id: 'free-tv',
    label: 'Free-TV IPTV',
    url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8',
    timeoutMs: 14000,
  },
  {
    id: 'pluto',
    label: 'Pluto TV Live',
    url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/plutotv_all.m3u',
    timeoutMs: 14000,
  },
  {
    id: 'tubi',
    label: 'Tubi Live TV',
    url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/tubi_all.m3u',
    timeoutMs: 12000,
  },
];

const HBO_FILTER_REGEX = /\bhbo\b/i;

function buildSearchText(
  name: string,
  categories: readonly EntertainmentCategory[],
  sourceLabel: string,
  resolution?: string,
  extraTokens?: string
): string {
  const catNames = categories.map((c) => CATEGORY_LABELS[c]).join(' ');
  return `${name} ${catNames} ${sourceLabel} ${resolution || ''} ${extraTokens || ''}`.toLowerCase();
}

/**
 * Verified CORS-friendly HTTPS HLS (.m3u8) spotlight channels seeded first so playback
 * starts instantaneously while the 10,000+ channel master playlists load in parallel.
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
    searchText: buildSearchText('Red Bull TV', ['sports', 'entertainment'], 'Spotlight', '1080p'),
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
    searchText: buildSearchText('24 Hour Free Movies', ['movies', 'entertainment'], 'Spotlight', '720p'),
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
    searchText: buildSearchText('Cartoon Cartoons', ['animation', 'kids', 'family'], 'Spotlight', '720p'),
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
    searchText: buildSearchText('30A Television Channel', ['entertainment', 'lifestyle'], 'Spotlight', '720p'),
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
    searchText: buildSearchText('30A TV Classic Movies', ['movies', 'family'], 'Spotlight', '720p'),
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
    searchText: buildSearchText('Botflix Animation TV', ['animation', 'comedy'], 'Spotlight', '1080p'),
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
    searchText: buildSearchText('3ABN Kids', ['kids', 'family', 'animation'], 'Spotlight', '720p'),
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
    searchText: buildSearchText('9XM Music', ['music', 'entertainment'], 'Spotlight', '1080p'),
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
    searchText: buildSearchText('9X Jalwa Music', ['music'], 'Spotlight', '1080p'),
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
    searchText: buildSearchText('4 Music Live', ['music'], 'Spotlight', '720p'),
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
    searchText: buildSearchText('4U TV Entertainment', ['entertainment', 'series'], 'Spotlight', '720p'),
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
    searchText: buildSearchText('ADN Anime TV+', ['animation', 'series'], 'Spotlight', '720p'),
  },
];

const BLOCKED_TAGS_REGEX = /\[(geo-blocked|not\s*24\/7|offline)\]/i;
const FREE_TV_GEO_MARKER_REGEX = /Ⓖ/;

const GROUP_TITLE_TO_CATEGORY: Record<string, EntertainmentCategory> = {
  animation: 'animation',
  anime: 'animation',
  cartoons: 'animation',
  movies: 'movies',
  movie: 'movies',
  cinema: 'movies',
  family: 'family',
  sports: 'sports',
  sport: 'sports',
  news: 'news',
  business: 'news',
  weather: 'news',
  legislative: 'news',
  entertainment: 'entertainment',
  general: 'entertainment',
  music: 'music',
  comedy: 'comedy',
  documentary: 'documentary',
  science: 'documentary',
  education: 'documentary',
  culture: 'documentary',
  lifestyle: 'lifestyle',
  cooking: 'lifestyle',
  travel: 'lifestyle',
  auto: 'lifestyle',
  outdoor: 'lifestyle',
  relax: 'lifestyle',
  kids: 'kids',
  series: 'series',
  classic: 'series',
};

const CATEGORY_INFERENCE_RULES: readonly {
  category: EntertainmentCategory;
  pattern: RegExp;
}[] = [
  {
    category: 'animation',
    pattern:
      /\b(anime|cartoon|toon|animax|animation|manga|looney|boomer|pokemon|yu-gi-oh|naruto|one\s*piece|dragon\s*ball|lupin|transformers|ninja\s*turtles|tmnt|spongebob|garfield|smurfs|sonic|peppa|avatar)\b/i,
  },
  {
    category: 'movies',
    pattern:
      /\b(movie|movies|cinema|film|films|hollywood|bollywood|cine|action|thriller|horror|sci-?fi|western|hallmark|flix|box\s*office|slasher|grindhouse|noir|romcom|blockbuster|drive-?in|spotlight|70s\s*cinema|80s\s*rewind|90s\s*throwback|00s\s*replay)\b/i,
  },
  {
    category: 'kids',
    pattern:
      /\b(kids|kid|junior|nick|disney|cbbc|cbeebies|baby|pogo|kika|gulli|pakapaka|clan|boing|super\s*rtl|children|toddler|kartoon|teletubbies|ryan|sesame|barney)\b/i,
  },
  {
    category: 'sports',
    pattern:
      /\b(sport|sports|espn|nfl|nba|mlb|nhl|fifa|uefa|golf|tennis|racing|motorsport|f1|boxing|mma|ufc|wrestling|wwe|cricket|soccer|football|futebol|futbol|eurosport|bein|dazn|red\s*bull|fight|nascar|pga|poker|billiards|surf|skate)\b/i,
  },
  {
    category: 'news',
    pattern:
      /\b(news|cnn|bbc\s*news|bbc\s*world|sky\s*news|fox\s*news|msnbc|cnbc|bloomberg|al\s*jazeera|aljazeera|euronews|france\s*24|france24|dw\b|nhk\s*world|cgtn|wion|ndtv|notic|noticias|telediario|actualit|nachrichten|tagesschau|novosti|vesti|khabar|akhbar|haber|inform|bfm|cnews|lci|trt\s*world|arirang|cna\b|press\s*tv|newsmax|24h|info\s*tv|weather)\b/i,
  },
  {
    category: 'music',
    pattern:
      /\b(music|mtv|vh1|vevo|hits|pop|rock|jazz|hip\s*hop|rap|edm|dance|club|concert|melody|beats|trace|kiss\s*tv|deluxe\s*music|mezzo|stingray|jukebox|radio\s*vision|fm\s*tv|viva|muzik|musica|musique|karaoke|k-?pop|country\s*music)\b/i,
  },
  {
    category: 'comedy',
    pattern:
      /\b(comedy|humor|humour|funny|laugh|stand-?up|sitcom|gag|failarmy|pet\s*collective|just\s*for\s*laughs|rifftrax|mst3k|improv|prank)\b/i,
  },
  {
    category: 'documentary',
    pattern:
      /\b(docu|documentary|history|nature|science|discovery|nat\s*geo|national\s*geographic|planet|earth|wildlife|space|nasa|arte|curiosity|smithsonian|biography|true\s*crime|forensic|unsolved|cold\s*case|48\s*hours|alien|ufo|ancient)\b/i,
  },
  {
    category: 'lifestyle',
    pattern:
      /\b(lifestyle|food|cooking|kitchen|chef|travel|fashion|home|garden|design|health|fitness|wellness|beauty|auto|motor|tastemade|hgtv|diy|antique|real\s*estate|fishing|hunting|car|gear)\b/i,
  },
  {
    category: 'family',
    pattern: /\b(family|familia|famille|classic\s*tv|retro|game\s*show|price\s*is\s*right|jeopardy|wheel\s*of\s*fortune|deal\s*or\s*no\s*deal)\b/i,
  },
  {
    category: 'series',
    pattern:
      /\b(series|drama|novela|telenovela|crime|mystery|soap|star\s*trek|doctor\s*who|baywatch|csi|ncis|law\s*&\s*order|walker|cop|cops|rescue|walking\s*dead|stargate|sherlock|detective)\b/i,
  },
];

const PRIORITY_BRAND_REGEX =
  /\b(english|usa|uk|hollywood|classic|cartoon|anime|movies|cinema|music|hits|comedy|action|retro|thriller|drama|sci-?fi|kids|family|flix|sports|espn|nfl|nba|fifa|documentary|history|nature|science|lifestyle|food|travel|series|dw|france\s*24|nhk|euronews|al\s*jazeera|sky|abc|cbs|nbc|pluto|plex|tubi|30a|red\s*bull|vevo|mtv|nick|disney)\b/i;

function extractAttrFast(line: string, keyWithEqQuote: string): string {
  const idx = line.indexOf(keyWithEqQuote);
  if (idx === -1) return '';
  const start = idx + keyWithEqQuote.length;
  const end = line.indexOf('"', start);
  return end > start ? line.slice(start, end).trim() : '';
}

function cleanChannelTitle(rawTitle: string): { name: string; resolution?: string } {
  let resolution: string | undefined;
  const pIdx = rawTitle.indexOf('p)');
  if (pIdx > 2) {
    const resMatch = rawTitle.match(/\((\d{3,4}p)\)/i);
    if (resMatch) resolution = resMatch[1].toLowerCase();
  }
  const cleaned = rawTitle
    .replace(/\(\d{3,4}p\)/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[ⓈⒼⓎⓉ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { name: cleaned, resolution };
}

function isStrictHttpsHlsUrl(rawUrl: string): boolean {
  if (rawUrl.length < 16 || !rawUrl.startsWith('https://')) return false;
  const lower = rawUrl.toLowerCase();
  if (!lower.includes('.m3u8')) return false;
  if (lower.includes(' ')) return false;
  return true;
}

function isSafeHttpsImage(rawUrl: string): string | undefined {
  if (!rawUrl || !rawUrl.startsWith('https://')) return undefined;
  return rawUrl;
}

function isLatinFriendlyName(name: string): boolean {
  let latin = 0;
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57)) {
      latin++;
    }
  }
  return latin >= Math.max(2, Math.floor(name.length * 0.45));
}

function computeQualityScore(
  name: string,
  url: string,
  resolution?: string,
  logo?: string,
  sourceId?: MasterPlaylistSource['id']
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
    lowerUrl.includes('wurl.com') ||
    lowerUrl.includes('tubi.io')
  ) {
    score += 12;
  }
  if (sourceId === 'tubi') score += 8;
  if (sourceId === 'free-tv') score += 4;
  if (lowerUrl.includes('jmp2.uk')) {
    score -= 16;
  }
  return score;
}

function resolveCategoriesFromGroupAndTitle(
  groupTitle: string,
  name: string,
  tvgId: string,
  sourceId: MasterPlaylistSource['id']
): EntertainmentCategory[] {
  const matched: EntertainmentCategory[] = [];

  // 1. Direct group-title mapping for iptv-org category master playlist
  if (sourceId === 'iptv-org' && groupTitle) {
    const parts = groupTitle.split(';');
    for (const part of parts) {
      const mapped = GROUP_TITLE_TO_CATEGORY[part.trim().toLowerCase()];
      if (mapped && !matched.includes(mapped)) {
        matched.push(mapped);
      }
    }
  }

  // 2. Smart genre keyword inference (always run for Free-TV, Pluto, Tubi, or generic/untagged iptv-org entries)
  if (
    matched.length === 0 ||
    (matched.length === 1 && matched[0] === 'entertainment')
  ) {
    const haystack = `${name} ${tvgId}`;
    for (const rule of CATEGORY_INFERENCE_RULES) {
      if (rule.pattern.test(haystack) && !matched.includes(rule.category)) {
        matched.push(rule.category);
      }
    }
  }

  return matched.length > 0 ? matched : ['entertainment'];
}

function parseMasterPlaylist(
  rawText: string,
  source: MasterPlaylistSource
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
    const tvgName = rawTitle ? '' : extractAttrFast(line, 'tvg-name="');
    const titleSource = rawTitle || tvgName;
    if (!titleSource || BLOCKED_TAGS_REGEX.test(titleSource) || HBO_FILTER_REGEX.test(titleSource)) {
      continue;
    }

    const groupTitle = extractAttrFast(line, 'group-title="');
    const tvgId = extractAttrFast(line, 'tvg-id="');
    const logo = isSafeHttpsImage(extractAttrFast(line, 'tvg-logo="'));
    const isGeoMarked = FREE_TV_GEO_MARKER_REGEX.test(titleSource);
    const { name, resolution } = cleanChannelTitle(titleSource);
    if (!name || name.length < 2 || HBO_FILTER_REGEX.test(name) || HBO_FILTER_REGEX.test(urlLine)) {
      continue;
    }

    const categories = resolveCategoriesFromGroupAndTitle(groupTitle, name, tvgId, source.id);
    const primaryCategory = categories[0];
    const baseScore = computeQualityScore(name, urlLine, resolution, logo, source.id);
    const qualityScore = isGeoMarked ? baseScore - 15 : baseScore;
    const sourceLabel = `${source.label} · ${CATEGORY_LABELS[primaryCategory]}`;

    parsed.push({
      id: `${source.id}-${primaryCategory}-${parsed.length}`,
      name,
      url: urlLine,
      category: primaryCategory,
      categories,
      logo,
      resolution,
      sourceLabel,
      featured: false,
      qualityScore,
      searchText: buildSearchText(name, categories, source.label, resolution),
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
  timeoutMs = 2800,
  externalSignal?: AbortSignal
): Promise<ChannelHealth> {
  if (externalSignal?.aborted) return 'offline';
  // Avoid mixed-content console noise when probing HTTP custom streams from an HTTPS origin
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    url.startsWith('http://')
  ) {
    return 'offline';
  }

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

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
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

    // 2. Fetch all 4 master GitHub playlists concurrently (no custom/HBO playlist injection)
    let loadedPlaylists = 0;

    const masterSettled = await Promise.allSettled(
      MASTER_PLAYLIST_SOURCES.map(async (source) => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), source.timeoutMs);
        try {
          const response = await fetch(source.url, {
            signal: controller.signal,
            mode: 'cors',
          });
          if (!response.ok) return { source, text: '' };
          const text = await response.text();
          loadedPlaylists += 1;
          return { source, text };
        } catch {
          return { source, text: '' };
        } finally {
          window.clearTimeout(timer);
        }
      })
    );

    const customChannelsCount = 0;

    // 4. Parse each master playlist with main-thread yields so video playback & scrolling stay 60fps
    const parsedPool: EntertainmentChannel[] = [];
    for (const settled of masterSettled) {
      if (settled.status !== 'fulfilled') continue;
      const { source, text } = settled.value;
      if (!text) continue;
      const batch = parseMasterPlaylist(text, source);
      for (const ch of batch) {
        const existing = byUrl.get(ch.url);
        if (existing) {
          for (const cat of ch.categories) {
            if (!existing.categories.includes(cat)) {
              existing.categories.push(cat);
            }
          }
          if (!existing.logo && ch.logo) {
            existing.logo = ch.logo;
          }
          continue;
        }
        byUrl.set(ch.url, ch);
        parsedPool.push(ch);
      }
      await yieldToMainThread();
    }

    // 5. Sort parsed pool cleanly by quality score then alphabetical name
    parsedPool.sort((a, b) => {
      const diff = b.qualityScore - a.qualityScore;
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });

    merged.push(...parsedPool);

    const result: EntertainmentPlaylistResult = {
      channels: merged,
      loadedPlaylists,
      totalPlaylists: MASTER_PLAYLIST_SOURCES.length,
      customChannelsCount,
      usedFallbackOnly: loadedPlaylists === 0,
      fetchedAt: Date.now(),
    };

    cachedResult = result;
    inflightPromise = null;
    return result;
  })();

  return inflightPromise;
}
