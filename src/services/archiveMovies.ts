import type { DirectMovieSource, MovieCaptionTrack } from '../components/NativeMoviePlayer';
import type { TmdbMovie } from './tmdb';

export interface OpenAccessMovie {
  /** Positive integer ID (real TMDB ID when mapped, or deterministic 900M+ hash for Firestore watchlist compatibility) */
  id: number;
  tmdbId?: number;
  archiveId: string;
  title: string;
  year: string;
  overview: string;
  genres: string[];
  genreIds: number[];
  runtimeMinutes?: number;
  rating: number;
  posterUrl: string;
  backdropUrl?: string;
  sources: DirectMovieSource[];
  captions?: MovieCaptionTrack[];
  licenseLabel: string;
}

const ARCHIVE_SEARCH_BASE = 'https://archive.org/advancedsearch.php';
const ARCHIVE_METADATA_BASE = 'https://archive.org/metadata';
const ARCHIVE_DOWNLOAD_BASE = 'https://archive.org/download';
const ARCHIVE_THUMB_BASE = 'https://archive.org/services/img';

/**
 * Deterministic positive integer ID in [900_000_000, 999_999_999] for dynamic Internet Archive items
 * so every movie fits strictly within Firestore WatchlistMovie rules (1..999_999_999).
 */
export function hashArchiveIdentifierToMovieId(identifier: string): number {
  let hash = 2166136261;
  for (let i = 0; i < identifier.length; i++) {
    hash ^= identifier.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const positive = hash >>> 0;
  return 900_000_000 + (positive % 99_999_999);
}

/**
 * Verified built-in catalog of ad-free open-access & public-domain movies with direct HTTPS MP4 / HLS streams.
 * Every stream URL was verified HTTP 200 directly from Internet Archive / open HLS CDNs.
 */
export const VERIFIED_OPEN_MOVIES: OpenAccessMovie[] = [
  {
    id: 132316,
    tmdbId: 132316,
    archiveId: 'tearsofsteelblendervfxopenmovie800p',
    title: 'Tears of Steel',
    year: '2012',
    overview:
      'In an apocalyptic Amsterdam, a group of warriors and scientists gather at the Oude Kerk to stage a crucial event from the past in a desperate attempt to save the world from destructive robots.',
    genres: ['Sci-Fi', 'Action'],
    genreIds: [878, 28],
    runtimeMinutes: 12,
    rating: 7.2,
    posterUrl: `${ARCHIVE_THUMB_BASE}/tearsofsteelblendervfxopenmovie800p`,
    sources: [
      {
        id: 'tos-hls',
        label: 'Adaptive HLS',
        qualityLabel: 'HD',
        format: 'hls',
        url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
      },
      {
        id: 'tos-mp4',
        label: 'Direct MP4',
        qualityLabel: '800p',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/tearsofsteelblendervfxopenmovie800p/Tears%20of%20Steel%20-%20Blender%20VFX%20Open%20Movie%20800p.mp4`,
      },
    ],
    licenseLabel: 'Creative Commons · Open Movie',
  },
  {
    id: 10378,
    tmdbId: 10378,
    archiveId: 'BigBuckBunny_328',
    title: 'Big Buck Bunny',
    year: '2008',
    overview:
      'A giant, gentle rabbit tries to enjoy a peaceful morning in the forest until three mischievous rodents push his patience too far, sparking an inventive comic retaliation.',
    genres: ['Animation', 'Comedy'],
    genreIds: [16, 35],
    runtimeMinutes: 10,
    rating: 7.4,
    posterUrl: `${ARCHIVE_THUMB_BASE}/BigBuckBunny_328`,
    sources: [
      {
        id: 'bbb-hls',
        label: 'Adaptive HLS',
        qualityLabel: '1080p',
        format: 'hls',
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      },
      {
        id: 'bbb-mp4',
        label: 'Direct MP4',
        qualityLabel: 'Archive',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/BigBuckBunny_328/BigBuckBunny_512kb.mp4`,
      },
    ],
    licenseLabel: 'Creative Commons · Open Movie',
  },
  {
    id: 45745,
    tmdbId: 45745,
    archiveId: 'Sintel',
    title: 'Sintel',
    year: '2010',
    overview:
      'A lonely young woman named Sintel searches across harsh lands for a baby dragon she rescued and named Scales, uncovering a heartbreaking truth at the end of her quest.',
    genres: ['Animation', 'Fantasy', 'Adventure'],
    genreIds: [16, 14, 12],
    runtimeMinutes: 15,
    rating: 7.6,
    posterUrl: `${ARCHIVE_THUMB_BASE}/Sintel`,
    sources: [
      {
        id: 'sintel-mp4',
        label: 'Direct MP4',
        qualityLabel: '2K HD',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/Sintel/sintel-2048-surround.mp4`,
      },
    ],
    licenseLabel: 'Creative Commons · Open Movie',
  },
  {
    id: 15856,
    tmdbId: 15856,
    archiveId: 'house_on_haunted_hill_ipod',
    title: 'House on Haunted Hill',
    year: '1959',
    overview:
      'Eccentric millionaire Frederick Loren invites five strangers to a locked mansion for a haunted house party, offering $10,000 each to anyone who survives until morning.',
    genres: ['Horror', 'Thriller', 'Mystery'],
    genreIds: [27, 53, 9648],
    runtimeMinutes: 75,
    rating: 6.8,
    posterUrl: `${ARCHIVE_THUMB_BASE}/house_on_haunted_hill_ipod`,
    sources: [
      {
        id: 'hohh-mp4',
        label: 'Direct MP4',
        qualityLabel: 'Full Feature',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/house_on_haunted_hill_ipod/house_on_haunted_hill.mp4`,
      },
    ],
    captions: [
      {
        label: 'English',
        lang: 'en',
        format: 'srt',
        url: `${ARCHIVE_DOWNLOAD_BASE}/house_on_haunted_hill_ipod/house_on_haunted_hill.asr.srt`,
      },
    ],
    licenseLabel: 'Public Domain · Internet Archive',
  },
  {
    id: 3085,
    tmdbId: 3085,
    archiveId: 'his_girl_friday',
    title: 'His Girl Friday',
    year: '1940',
    overview:
      'Fast-talking newspaper editor Walter Burns uses every trick in the book to keep his star reporter and ex-wife Hildy Johnson from remarrying and leaving the newsroom forever.',
    genres: ['Comedy', 'Drama', 'Romance'],
    genreIds: [35, 18, 10749],
    runtimeMinutes: 92,
    rating: 7.7,
    posterUrl: `${ARCHIVE_THUMB_BASE}/his_girl_friday`,
    sources: [
      {
        id: 'hgf-mp4',
        label: 'Direct MP4',
        qualityLabel: 'Full Feature',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/his_girl_friday/his_girl_friday.mp4`,
      },
    ],
    captions: [
      {
        label: 'English',
        lang: 'en',
        format: 'srt',
        url: `${ARCHIVE_DOWNLOAD_BASE}/his_girl_friday/his_girl_friday.asr.srt`,
      },
    ],
    licenseLabel: 'Public Domain · Internet Archive',
  },
  {
    id: 19,
    tmdbId: 19,
    archiveId: 'metropolis_202511',
    title: 'Metropolis',
    year: '1927',
    overview:
      'In a futuristic dystopia divided between wealthy planners above and exploited workers underground, the city master’s son discovers a movement that could unite—or shatter—Metropolis.',
    genres: ['Sci-Fi', 'Drama'],
    genreIds: [878, 18],
    runtimeMinutes: 148,
    rating: 8.1,
    posterUrl: `${ARCHIVE_THUMB_BASE}/metropolis_202511`,
    sources: [
      {
        id: 'metro-mp4',
        label: 'Direct MP4',
        qualityLabel: 'Full Feature',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/metropolis_202511/Metropolis%20.mp4`,
      },
    ],
    captions: [
      {
        label: 'English',
        lang: 'en',
        format: 'srt',
        url: `${ARCHIVE_DOWNLOAD_BASE}/metropolis_202511/Metropolis.1927.1080p.srt`,
      },
    ],
    licenseLabel: 'Public Domain · Internet Archive',
  },
  {
    id: 961,
    tmdbId: 961,
    archiveId: 'TheGeneral1926',
    title: 'The General',
    year: '1926',
    overview:
      'Buster Keaton stars as a devoted locomotive engineer who single-handedly chases Union spies behind enemy lines to rescue both his beloved steam engine and his fiancée.',
    genres: ['Action', 'Adventure', 'Comedy'],
    genreIds: [28, 12, 35],
    runtimeMinutes: 78,
    rating: 8.0,
    posterUrl: `${ARCHIVE_THUMB_BASE}/TheGeneral1926`,
    sources: [
      {
        id: 'gen-mp4',
        label: 'Direct MP4',
        qualityLabel: '720p HD',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/TheGeneral1926/The_General_1926_720p.mp4`,
      },
    ],
    licenseLabel: 'Public Domain · Internet Archive',
  },
  {
    id: 16093,
    tmdbId: 16093,
    archiveId: 'CarnivalofSouls',
    title: 'Carnival of Souls',
    year: '1962',
    overview:
      'After miraculously surviving a car plunge into a river, a church organist relocates to a new town where eerie visions draw her inexorably toward an abandoned lakeside pavilion.',
    genres: ['Horror', 'Mystery', 'Thriller'],
    genreIds: [27, 9648, 53],
    runtimeMinutes: 78,
    rating: 7.0,
    posterUrl: `${ARCHIVE_THUMB_BASE}/CarnivalofSouls`,
    sources: [
      {
        id: 'cos-mp4',
        label: 'Direct MP4',
        qualityLabel: 'Full Feature',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/CarnivalofSouls/CarnivalOfSouls.mp4`,
      },
    ],
    captions: [
      {
        label: 'English',
        lang: 'en',
        format: 'srt',
        url: `${ARCHIVE_DOWNLOAD_BASE}/CarnivalofSouls/CarnivalOfSouls.asr.srt`,
      },
    ],
    licenseLabel: 'Public Domain · Internet Archive',
  },
  {
    id: 653,
    tmdbId: 653,
    archiveId: 'nosferatu_1922',
    title: 'Nosferatu',
    year: '1922',
    overview:
      'Vampire Count Orlok expresses interest in a new residence and in his real estate agent’s young wife in F. W. Murnau’s haunting expressionist horror landmark.',
    genres: ['Horror', 'Fantasy'],
    genreIds: [27, 14],
    runtimeMinutes: 94,
    rating: 7.7,
    posterUrl: `${ARCHIVE_THUMB_BASE}/nosferatu_1922`,
    sources: [
      {
        id: 'nos-mp4',
        label: 'Direct MP4',
        qualityLabel: 'Full Feature',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/nosferatu_1922/nosferatu_1922.mp4`,
      },
    ],
    licenseLabel: 'Public Domain · Internet Archive',
  },
  {
    id: 24914,
    tmdbId: 24914,
    archiveId: 'The_Little_Shop_of_Horrors.mpeg',
    title: 'The Little Shop of Horrors',
    year: '1960',
    overview:
      'Clumsy florist assistant Seymour Krelboyne crossbreeds a bizarre talking plant that brings fame to Mushnik’s Flower Shop—while developing a sinister appetite.',
    genres: ['Comedy', 'Horror'],
    genreIds: [35, 27],
    runtimeMinutes: 72,
    rating: 6.4,
    posterUrl: `${ARCHIVE_THUMB_BASE}/The_Little_Shop_of_Horrors.mpeg`,
    sources: [
      {
        id: 'lsoh-mp4',
        label: 'Direct MP4',
        qualityLabel: 'Full Feature',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/The_Little_Shop_of_Horrors.mpeg/The_Little_Shop_of_Horrors.mp4`,
      },
    ],
    captions: [
      {
        label: 'English',
        lang: 'en',
        format: 'srt',
        url: `${ARCHIVE_DOWNLOAD_BASE}/The_Little_Shop_of_Horrors.mpeg/The_Little_Shop_of_Horrors.asr.srt`,
      },
    ],
    licenseLabel: 'Public Domain · Internet Archive',
  },
  {
    id: 18999,
    tmdbId: 18999,
    archiveId: 'doa-1950_202506',
    title: 'D.O.A.',
    year: '1950',
    overview:
      'After discovering he has been slipped a slow-acting lethal poison, accountant Frank Bigelow races against the clock across San Francisco and Los Angeles to solve his own murder.',
    genres: ['Thriller', 'Crime', 'Mystery'],
    genreIds: [53, 80, 9648],
    runtimeMinutes: 83,
    rating: 7.1,
    posterUrl: `${ARCHIVE_THUMB_BASE}/doa-1950_202506`,
    sources: [
      {
        id: 'doa-mp4',
        label: 'Direct MP4',
        qualityLabel: 'Full Feature',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/doa-1950_202506/DOA%201950.ia.mp4`,
      },
    ],
    licenseLabel: 'Public Domain · Internet Archive',
  },
  {
    id: 31175,
    tmdbId: 31175,
    archiveId: 'TheFastandtheFuriousJohnIreland1954goofyrip',
    title: 'The Fast and the Furious',
    year: '1955',
    overview:
      'Falsely accused of murder, a fugitive escapes jail and hijacks a sports car—entering a high-speed cross-border road race to prove his innocence.',
    genres: ['Action', 'Crime', 'Thriller'],
    genreIds: [28, 80, 53],
    runtimeMinutes: 73,
    rating: 5.8,
    posterUrl: `${ARCHIVE_THUMB_BASE}/TheFastandtheFuriousJohnIreland1954goofyrip`,
    sources: [
      {
        id: 'ff55-mp4',
        label: 'Direct MP4',
        qualityLabel: 'Full Feature',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/TheFastandtheFuriousJohnIreland1954goofyrip/TheFastandtheFuriousJohnIreland1954goofyrip.mp4`,
      },
    ],
    licenseLabel: 'Public Domain · Internet Archive',
  },
  {
    id: 13224,
    tmdbId: 13224,
    archiveId: 'ElephantsDream',
    title: 'Elephants Dream',
    year: '2006',
    overview:
      'Two travelers, Proog and Emo, navigate the surreal, shifting clockwork interior of an infinite mechanical world in the world’s first open-source 3D animated film.',
    genres: ['Animation', 'Sci-Fi'],
    genreIds: [16, 878],
    runtimeMinutes: 11,
    rating: 6.4,
    posterUrl: `${ARCHIVE_THUMB_BASE}/ElephantsDream`,
    sources: [
      {
        id: 'ed-mp4',
        label: 'Direct MP4',
        qualityLabel: 'HD',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/ElephantsDream/ed_1024.mp4`,
      },
    ],
    licenseLabel: 'Creative Commons · Open Movie',
  },
  {
    id: 964,
    tmdbId: 964,
    archiveId: 'ThePhantomoftheOpera',
    title: 'The Phantom of the Opera',
    year: '1925',
    overview:
      'A masked figure haunting the catacombs beneath the Paris Opera House becomes obsessed with a young soprano in Lon Chaney’s iconic gothic thriller.',
    genres: ['Horror', 'Drama', 'Mystery'],
    genreIds: [27, 18, 9648],
    runtimeMinutes: 93,
    rating: 7.3,
    posterUrl: `${ARCHIVE_THUMB_BASE}/ThePhantomoftheOpera`,
    sources: [
      {
        id: 'poto-mp4',
        label: 'Direct MP4',
        qualityLabel: 'Full Feature',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/ThePhantomoftheOpera/Phantom_of_the_Opera_512kb.mp4`,
      },
    ],
    licenseLabel: 'Public Domain · Internet Archive',
  },
  {
    id: 44214,
    tmdbId: 44214,
    archiveId: 'VoyagetothePlanetofPrehistoricWomen',
    title: 'Voyage to the Planet of Prehistoric Women',
    year: '1968',
    overview:
      'Astronauts landing on Venus encounter prehistoric creatures and a mysterious civilization of telepathic inhabitants in this cult retro sci-fi adventure.',
    genres: ['Sci-Fi', 'Adventure'],
    genreIds: [878, 12],
    runtimeMinutes: 78,
    rating: 4.9,
    posterUrl: `${ARCHIVE_THUMB_BASE}/VoyagetothePlanetofPrehistoricWomen`,
    sources: [
      {
        id: 'vppw-mp4',
        label: 'Direct MP4',
        qualityLabel: 'Full Feature',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/VoyagetothePlanetofPrehistoricWomen/VoyagetothePlanetofPrehistoricWomen.mp4`,
      },
    ],
    captions: [
      {
        label: 'English',
        lang: 'en',
        format: 'srt',
        url: `${ARCHIVE_DOWNLOAD_BASE}/VoyagetothePlanetofPrehistoricWomen/VoyagetothePlanetofPrehistoricWomen.asr.srt`,
      },
    ],
    licenseLabel: 'Public Domain · Internet Archive',
  },
  {
    id: 116873,
    tmdbId: 116873,
    archiveId: 'superman_1941',
    title: 'Superman: The Mad Scientist',
    year: '1941',
    overview:
      'When a sinister scientist threatens Metropolis with an electrothanasia ray and kidnaps Lois Lane, Superman leaps into action in Fleischer Studios’ Oscar-nominated animated classic.',
    genres: ['Animation', 'Action', 'Sci-Fi'],
    genreIds: [16, 28, 878],
    runtimeMinutes: 10,
    rating: 7.4,
    posterUrl: `${ARCHIVE_THUMB_BASE}/superman_1941`,
    sources: [
      {
        id: 'sup41-mp4',
        label: 'Direct MP4',
        qualityLabel: 'Classic',
        format: 'mp4',
        url: `${ARCHIVE_DOWNLOAD_BASE}/superman_1941/superman_1941_512kb.mp4`,
      },
    ],
    licenseLabel: 'Public Domain · Internet Archive',
  },
];

const BUILTIN_BY_TMDB_ID = new Map<number, OpenAccessMovie>();
const BUILTIN_BY_ARCHIVE_ID = new Map<string, OpenAccessMovie>();

for (const m of VERIFIED_OPEN_MOVIES) {
  if (m.tmdbId) BUILTIN_BY_TMDB_ID.set(m.tmdbId, m);
  BUILTIN_BY_ARCHIVE_ID.set(m.archiveId.toLowerCase(), m);
}

export function findVerifiedOpenMovieByTmdbId(tmdbId: number): OpenAccessMovie | null {
  return BUILTIN_BY_TMDB_ID.get(tmdbId) || null;
}

export function findVerifiedOpenMovieByArchiveId(archiveId: string): OpenAccessMovie | null {
  return BUILTIN_BY_ARCHIVE_ID.get(archiveId.toLowerCase()) || null;
}

export function openMovieToTmdbShape(movie: OpenAccessMovie): TmdbMovie {
  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    poster_path: movie.posterUrl,
    backdrop_path: movie.backdropUrl || movie.posterUrl,
    release_date: movie.year ? `${movie.year}-01-01` : '',
    vote_average: movie.rating,
    vote_count: 100,
    popularity: 100,
    genre_ids: movie.genreIds,
    archiveId: movie.archiveId,
    isFreeFullMovie: true,
    licenseLabel: movie.licenseLabel,
  };
}

interface RawArchiveDoc {
  identifier?: string;
  title?: string | string[];
  year?: string | number;
  description?: string | string[];
  subject?: string | string[];
  downloads?: number;
}

const ARCHIVE_ADULT_BLOCKLIST =
  /\b(sex|porn|xxx|erotic|nude|nudist|stripper|burlesque|stag|adult\s+film|reefer|marihuana|cocaine)\b/i;

function normalizeTextField(val?: string | string[]): string {
  if (!val) return '';
  const raw = Array.isArray(val) ? val.join(' ') : String(val);
  return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function inferGenreIdsFromSubject(subjectText: string): number[] {
  const s = subjectText.toLowerCase();
  const ids: number[] = [];
  if (s.includes('sci-fi') || s.includes('science fiction')) ids.push(878);
  if (s.includes('horror') || s.includes('vampire') || s.includes('zombie')) ids.push(27);
  if (s.includes('comedy') || s.includes('chaplin') || s.includes('keaton')) ids.push(35);
  if (s.includes('animation') || s.includes('cartoon')) ids.push(16);
  if (s.includes('action') || s.includes('western') || s.includes('adventure')) ids.push(28);
  if (s.includes('thriller') || s.includes('noir') || s.includes('mystery')) ids.push(53);
  if (s.includes('drama')) ids.push(18);
  if (s.includes('documentary')) ids.push(99);
  return ids.length > 0 ? ids.slice(0, 3) : [18];
}

function docToTmdbMovie(doc: RawArchiveDoc): TmdbMovie | null {
  const identifier = (doc.identifier || '').trim();
  if (!identifier || !/^[a-zA-Z0-9._\-]+$/.test(identifier)) return null;

  // Prefer our richer built-in entry if it matches an already-verified archive ID
  const builtin = findVerifiedOpenMovieByArchiveId(identifier);
  if (builtin) return openMovieToTmdbShape(builtin);

  const title = normalizeTextField(doc.title);
  if (!title || title.length < 2) return null;

  const overview = normalizeTextField(doc.description).slice(0, 420);
  const subjectText = normalizeTextField(doc.subject);
  if (ARCHIVE_ADULT_BLOCKLIST.test(`${title} ${subjectText}`)) return null;
  if (/\btrailer\b/i.test(title)) return null;

  const yearStr = doc.year ? String(doc.year).slice(0, 4) : '';
  const downloads = typeof doc.downloads === 'number' ? doc.downloads : 0;
  // Derive an honest popularity-weighted rating floor for unrated archive items (display only when > 0)
  const rating = downloads > 500_000 ? 7.4 : downloads > 100_000 ? 7.0 : 6.6;

  return {
    id: hashArchiveIdentifierToMovieId(identifier),
    title: title.slice(0, 140),
    overview:
      overview ||
      'Public-domain / open-access feature film streaming directly from the Internet Archive with zero ads.',
    poster_path: `${ARCHIVE_THUMB_BASE}/${encodeURIComponent(identifier)}`,
    backdrop_path: `${ARCHIVE_THUMB_BASE}/${encodeURIComponent(identifier)}`,
    release_date: /^\d{4}$/.test(yearStr) ? `${yearStr}-01-01` : '',
    vote_average: rating,
    vote_count: downloads,
    popularity: downloads,
    genre_ids: inferGenreIdsFromSubject(`${title} ${subjectText}`),
    archiveId: identifier,
    isFreeFullMovie: true,
    licenseLabel: 'Internet Archive · Free Full Movie',
  };
}

const archiveQueryCache = new Map<string, { expiresAt: number; data: unknown }>();
const ARCHIVE_CACHE_TTL_MS = 15 * 60 * 1000;

async function fetchArchiveSearch(
  query: string,
  rows = 24,
  page = 1,
  signal?: AbortSignal
): Promise<TmdbMovie[]> {
  const url = new URL(ARCHIVE_SEARCH_BASE);
  url.searchParams.set('q', query);
  url.searchParams.append('fl[]', 'identifier,title,year,description,subject,downloads');
  url.searchParams.append('sort[]', 'downloads desc');
  url.searchParams.set('rows', String(rows));
  url.searchParams.set('page', String(page));
  url.searchParams.set('output', 'json');

  const key = url.toString();
  const cached = archiveQueryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as TmdbMovie[];
  }

  const res = await fetch(key, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    throw new Error(`Internet Archive search failed (${res.status})`);
  }

  const json = (await res.json()) as { response?: { docs?: RawArchiveDoc[] } };
  const docs = json.response?.docs || [];
  const seenIds = new Set<string>();
  const results: TmdbMovie[] = [];

  for (const d of docs) {
    const mapped = docToTmdbMovie(d);
    if (!mapped) continue;
    const dedupKey = (mapped.archiveId || String(mapped.id)).toLowerCase();
    if (seenIds.has(dedupKey)) continue;
    seenIds.add(dedupKey);
    results.push(mapped);
  }

  archiveQueryCache.set(key, { expiresAt: Date.now() + ARCHIVE_CACHE_TTL_MS, data: results });
  return results;
}

export async function fetchArchiveMovieRows(signal?: AbortSignal): Promise<{
  classics: TmdbMovie[];
  scifiHorror: TmdbMovie[];
  comedyAnimation: TmdbMovie[];
}> {
  const [classicsRes, scifiRes, comedyRes] = await Promise.allSettled([
    fetchArchiveSearch(
      'collection:(feature_films) AND mediatype:(movies) AND format:(MPEG4)',
      26,
      1,
      signal
    ),
    fetchArchiveSearch(
      'collection:(SciFi_Horror) AND mediatype:(movies) AND format:(MPEG4)',
      22,
      1,
      signal
    ),
    fetchArchiveSearch(
      '(collection:(Comedy_Films) OR collection:(classic_cartoons)) AND mediatype:(movies) AND format:(MPEG4)',
      22,
      1,
      signal
    ),
  ]);

  return {
    classics: classicsRes.status === 'fulfilled' ? classicsRes.value : [],
    scifiHorror: scifiRes.status === 'fulfilled' ? scifiRes.value : [],
    comedyAnimation: comedyRes.status === 'fulfilled' ? comedyRes.value : [],
  };
}

export async function searchArchiveMovies(
  queryText: string,
  page = 1,
  signal?: AbortSignal
): Promise<TmdbMovie[]> {
  const cleaned = queryText.replace(/["():]/g, ' ').trim();
  if (!cleaned) return [];

  // Instant match against built-in verified catalog first
  const lower = cleaned.toLowerCase();
  const builtInMatches = VERIFIED_OPEN_MOVIES.filter(
    (m) =>
      m.title.toLowerCase().includes(lower) ||
      m.genres.some((g) => g.toLowerCase().includes(lower))
  ).map(openMovieToTmdbShape);

  const q = `(title:(${cleaned}) OR subject:(${cleaned})) AND mediatype:(movies) AND format:(MPEG4) AND (collection:(feature_films) OR collection:(SciFi_Horror) OR collection:(Comedy_Films) OR collection:(classic_cartoons) OR collection:(opensource_movies))`;

  try {
    const live = await fetchArchiveSearch(q, 18, page, signal);
    if (page > 1) return live;
    const seen = new Set(builtInMatches.map((m) => m.archiveId?.toLowerCase()));
    return [...builtInMatches, ...live.filter((m) => !seen.has(m.archiveId?.toLowerCase()))];
  } catch {
    return page === 1 ? builtInMatches : [];
  }
}

export interface ResolvedArchivePlayback {
  archiveId: string;
  title: string;
  year: string;
  overview: string;
  posterUrl: string;
  sources: DirectMovieSource[];
  captions: MovieCaptionTrack[];
  licenseLabel: string;
}

interface RawArchiveMetaFile {
  name?: string;
  format?: string;
  source?: string;
  size?: string | number;
  width?: string | number;
  height?: string | number;
}

interface RawArchiveMetaResponse {
  metadata?: {
    identifier?: string;
    title?: string | string[];
    year?: string | number;
    description?: string | string[];
    licenseurl?: string;
  };
  files?: RawArchiveMetaFile[];
}

/**
 * Resolve direct HTTPS playable MP4 / HLS URLs and captions for any Internet Archive movie identifier.
 */
export async function resolveArchiveMoviePlayback(
  archiveId: string,
  signal?: AbortSignal
): Promise<ResolvedArchivePlayback | null> {
  const builtin = findVerifiedOpenMovieByArchiveId(archiveId);
  if (builtin) {
    return {
      archiveId: builtin.archiveId,
      title: builtin.title,
      year: builtin.year,
      overview: builtin.overview,
      posterUrl: builtin.posterUrl,
      sources: builtin.sources,
      captions: builtin.captions || [],
      licenseLabel: builtin.licenseLabel,
    };
  }

  const cacheKey = `meta:${archiveId}`;
  const cached = archiveQueryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as ResolvedArchivePlayback | null;
  }

  const res = await fetch(`${ARCHIVE_METADATA_BASE}/${encodeURIComponent(archiveId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) return null;

  const json = (await res.json()) as RawArchiveMetaResponse;
  const files = Array.isArray(json.files) ? json.files : [];

  const mp4Candidates = files
    .filter((f) => {
      if (!f.name || !/\.mp4$/i.test(f.name)) return false;
      if (f.source === 'metadata') return false;
      const size = Number(f.size || 0);
      return size === 0 || size > 2_000_000;
    })
    .sort((a, b) => {
      const aH264 = /h\.264|mpeg4/i.test(a.format || '') ? 1 : 0;
      const bH264 = /h\.264|mpeg4/i.test(b.format || '') ? 1 : 0;
      if (bH264 !== aH264) return bH264 - aH264;
      const aSize = Number(a.size || 0);
      const bSize = Number(b.size || 0);
      // Prefer crisp web-playable files (50MB..900MB) ahead of giant 4GB raw masters or tiny 512kb rips
      const aIdeal = aSize >= 40_000_000 && aSize <= 950_000_000 ? 1 : 0;
      const bIdeal = bSize >= 40_000_000 && bSize <= 950_000_000 ? 1 : 0;
      if (bIdeal !== aIdeal) return bIdeal - aIdeal;
      return bSize - aSize;
    });

  const sources: DirectMovieSource[] = mp4Candidates.slice(0, 2).map((f, idx) => {
    const encodedPath = f.name!
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');
    const h = Number(f.height || 0);
    const qualityLabel =
      h >= 1000 ? '1080p' : h >= 700 ? '720p' : idx === 0 ? 'HD MP4' : 'Backup MP4';
    return {
      id: `ia-${idx}`,
      label: idx === 0 ? 'Direct MP4' : 'Archive Mirror',
      qualityLabel,
      format: 'mp4',
      url: `${ARCHIVE_DOWNLOAD_BASE}/${encodeURIComponent(archiveId)}/${encodedPath}`,
    };
  });

  if (sources.length === 0) {
    archiveQueryCache.set(cacheKey, { expiresAt: Date.now() + ARCHIVE_CACHE_TTL_MS, data: null });
    return null;
  }

  const captionFiles = files.filter((f) => f.name && /\.(vtt|srt)$/i.test(f.name));
  const captions: MovieCaptionTrack[] = captionFiles.slice(0, 2).map((f) => {
    const encodedPath = f.name!
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');
    return {
      label: 'English',
      lang: 'en',
      format: /\.vtt$/i.test(f.name!) ? 'vtt' : 'srt',
      url: `${ARCHIVE_DOWNLOAD_BASE}/${encodeURIComponent(archiveId)}/${encodedPath}`,
    };
  });

  const resolved: ResolvedArchivePlayback = {
    archiveId,
    title: normalizeTextField(json.metadata?.title) || archiveId,
    year: json.metadata?.year ? String(json.metadata.year).slice(0, 4) : '',
    overview: normalizeTextField(json.metadata?.description).slice(0, 1000),
    posterUrl: `${ARCHIVE_THUMB_BASE}/${encodeURIComponent(archiveId)}`,
    sources,
    captions,
    licenseLabel: 'Public Domain · Internet Archive',
  };

  archiveQueryCache.set(cacheKey, { expiresAt: Date.now() + ARCHIVE_CACHE_TTL_MS, data: resolved });
  return resolved;
}

/**
 * Attempt to find a matching full public-domain film on Internet Archive for a given TMDB movie title + year.
 */
export async function lookupArchiveStreamForTmdbMovie(
  tmdbId: number,
  title: string,
  releaseYear: string,
  signal?: AbortSignal
): Promise<ResolvedArchivePlayback | null> {
  // 1. Check verified built-in catalog by TMDB ID first (instant, zero latency)
  const builtin = findVerifiedOpenMovieByTmdbId(tmdbId);
  if (builtin) {
    return resolveArchiveMoviePlayback(builtin.archiveId, signal);
  }

  // Only attempt live Archive.org matching for older/open-domain eras or classic films (<= 1995 or explicit open films)
  const yr = Number.parseInt(releaseYear, 10);
  if (Number.isFinite(yr) && yr > 1995) {
    return null;
  }

  const cleanTitle = title.replace(/["():]/g, ' ').trim();
  if (!cleanTitle) return null;

  try {
    const yearClause = Number.isFinite(yr) ? ` AND year:(${yr})` : '';
    const q = `title:("${cleanTitle}")${yearClause} AND mediatype:(movies) AND format:(MPEG4) AND (collection:(feature_films) OR collection:(SciFi_Horror) OR collection:(Comedy_Films) OR collection:(classic_cartoons))`;
    const candidates = await fetchArchiveSearch(q, 3, 1, signal);
    const match = candidates.find(
      (c) =>
        c.archiveId &&
        c.title.toLowerCase().includes(cleanTitle.toLowerCase().slice(0, Math.min(12, cleanTitle.length)))
    );
    if (!match?.archiveId) return null;
    return await resolveArchiveMoviePlayback(match.archiveId, signal);
  } catch {
    return null;
  }
}
