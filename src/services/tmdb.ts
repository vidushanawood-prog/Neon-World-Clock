const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const DEFAULT_TMDB_KEY = '5fd8b818f77104da1ec5e4675d391230';

export const TMDB_API_KEY: string =
  ((import.meta.env.VITE_TMDB_API_KEY as string | undefined) || '').trim() || DEFAULT_TMDB_KEY;

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovie {
  id: number;
  title: string;
  original_title?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: TmdbGenre[];
  adult?: boolean;
  original_language?: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at?: string;
}

export interface TmdbMovieDetails extends TmdbMovie {
  tagline: string;
  runtime: number | null;
  status: string;
  budget: number;
  revenue: number;
  genres: TmdbGenre[];
  spoken_languages?: { english_name: string; iso_639_1: string; name: string }[];
  production_countries?: { iso_3166_1: string; name: string }[];
  credits?: {
    cast: TmdbCastMember[];
  };
  videos?: {
    results: TmdbVideo[];
  };
  similar?: {
    results: TmdbMovie[];
  };
}

export interface MovieRow {
  id: string;
  title: string;
  subtitle: string;
  movies: TmdbMovie[];
}

export type MovieSortOption =
  | 'popularity.desc'
  | 'vote_average.desc'
  | 'primary_release_date.desc';

export interface MovieDiscoverFilters {
  genreId?: string; // e.g. '28' or '878,14'
  year?: string; // e.g. '2025'
  minRating?: number; // e.g. 6, 7, 8
  sortBy?: MovieSortOption;
  page?: number;
}

export interface TmdbPagedResult {
  page: number;
  totalPages: number;
  totalResults: number;
  results: TmdbMovie[];
}

export interface MovieStreamServer {
  id: string;
  name: string;
  qualityLabel: string;
  buildUrl: (tmdbId: number) => string;
}

export const MOVIE_STREAM_SERVERS: MovieStreamServer[] = [
  {
    id: 'vidsrc-cc',
    name: 'Server 1 · VidSrc CC',
    qualityLabel: 'Fast HD',
    buildUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
  },
  {
    id: 'vidsrc-xyz',
    name: 'Server 2 · VidSrc XYZ',
    qualityLabel: 'Mirror HD',
    buildUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`,
  },
  {
    id: 'multiembed',
    name: 'Server 3 · MultiEmbed',
    qualityLabel: 'Global',
    buildUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
  },
  {
    id: 'autoembed',
    name: 'Server 4 · AutoEmbed',
    qualityLabel: 'Backup',
    buildUrl: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
  },
];

export const MOVIE_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

export interface CategoryQuickChip {
  id: string;
  label: string;
  genreParam?: string;
}

export const MOVIE_CATEGORY_TABS: CategoryQuickChip[] = [
  { id: 'browse', label: 'Browse All' },
  { id: 'my-list', label: 'My List' },
  { id: 'action', label: 'Action', genreParam: '28' },
  { id: 'scifi-fantasy', label: 'Sci-Fi & Fantasy', genreParam: '878|14' },
  { id: 'horror-thriller', label: 'Horror & Thriller', genreParam: '27|53' },
  { id: 'animation', label: 'Animation', genreParam: '16' },
  { id: 'comedy', label: 'Comedy', genreParam: '35' },
  { id: 'drama', label: 'Drama', genreParam: '18' },
  { id: 'adventure', label: 'Adventure', genreParam: '12' },
  { id: 'crime', label: 'Crime', genreParam: '80' },
  { id: 'romance', label: 'Romance', genreParam: '10749' },
  { id: 'documentary', label: 'Documentary', genreParam: '99' },
];

export const GENRE_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Genres' },
  { value: '28', label: 'Action' },
  { value: '12', label: 'Adventure' },
  { value: '16', label: 'Animation' },
  { value: '35', label: 'Comedy' },
  { value: '80', label: 'Crime' },
  { value: '99', label: 'Documentary' },
  { value: '18', label: 'Drama' },
  { value: '10751', label: 'Family' },
  { value: '14', label: 'Fantasy' },
  { value: '27', label: 'Horror' },
  { value: '9648', label: 'Mystery' },
  { value: '10749', label: 'Romance' },
  { value: '878', label: 'Sci-Fi' },
  { value: '53', label: 'Thriller' },
  { value: '10752', label: 'War' },
];

export const MOVIE_YEAR_OPTIONS: string[] = (() => {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let y = currentYear; y >= 1980; y--) {
    years.push(String(y));
  }
  return years;
})();

const CACHE_TTL_MS = 10 * 60 * 1000;
const responseCache = new Map<string, { expiresAt: number; data: unknown }>();

async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {},
  signal?: AbortSignal
): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', 'en-US');

  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== '') {
      url.searchParams.set(key, String(val));
    }
  }

  const cacheKey = url.toString();
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }

  const res = await fetch(cacheKey, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!res.ok) {
    throw new Error(`TMDB request failed (${res.status})`);
  }

  const data = (await res.json()) as T;
  responseCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data });

  // Prevent unbounded cache growth over long sessions
  if (responseCache.size > 160) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }

  return data;
}

export function getPosterUrl(
  path: string | null | undefined,
  size: 'w185' | 'w342' | 'w500' = 'w342'
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getBackdropUrl(
  path: string | null | undefined,
  size: 'w780' | 'w1280' | 'original' = 'w1280'
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getProfileUrl(
  path: string | null | undefined,
  size: 'w185' | 'h632' = 'w185'
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getMovieYear(releaseDate?: string | null): string {
  if (!releaseDate || releaseDate.length < 4) return 'TBA';
  return releaseDate.slice(0, 4);
}

export function formatRuntime(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getGenreNames(movie: Pick<TmdbMovie, 'genres' | 'genre_ids'>, limit = 3): string[] {
  if (movie.genres && movie.genres.length > 0) {
    return movie.genres.slice(0, limit).map((g) => g.name);
  }
  if (movie.genre_ids && movie.genre_ids.length > 0) {
    return movie.genre_ids
      .map((id) => MOVIE_GENRE_MAP[id])
      .filter((n): n is string => Boolean(n))
      .slice(0, limit);
  }
  return [];
}

export function pickOfficialTrailer(videos?: TmdbVideo[]): TmdbVideo | null {
  if (!videos || videos.length === 0) return null;
  const yt = videos.filter((v) => v.site === 'YouTube' && Boolean(v.key));
  if (yt.length === 0) return null;
  return (
    yt.find((v) => v.type === 'Trailer' && v.official) ||
    yt.find((v) => v.type === 'Trailer') ||
    yt.find((v) => v.type === 'Teaser' && v.official) ||
    yt.find((v) => v.type === 'Teaser') ||
    yt[0]
  );
}

function sanitizeMovies(raw: TmdbMovie[] | undefined): TmdbMovie[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const clean: TmdbMovie[] = [];
  for (const m of raw) {
    if (!m || typeof m.id !== 'number' || !m.title || m.adult) continue;
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    clean.push(m);
  }
  return clean;
}

interface RawTmdbListResponse {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbMovie[];
}

export async function fetchMoviesHomeRows(signal?: AbortSignal): Promise<{
  heroMovies: TmdbMovie[];
  rows: MovieRow[];
}> {
  const rowSpecs: {
    id: string;
    title: string;
    subtitle: string;
    endpoint: string;
    params?: Record<string, string | number | boolean>;
  }[] = [
    {
      id: 'trending',
      title: 'Trending Worldwide',
      subtitle: 'Most watched globally this week',
      endpoint: '/trending/movie/week',
    },
    {
      id: 'popular',
      title: 'Popular Now',
      subtitle: 'Top box office & streaming hits',
      endpoint: '/movie/popular',
    },
    {
      id: 'action',
      title: 'Action',
      subtitle: 'High-octane blockbusters & stunts',
      endpoint: '/discover/movie',
      params: { with_genres: '28', sort_by: 'popularity.desc', include_adult: false },
    },
    {
      id: 'scifi-fantasy',
      title: 'Sci-Fi & Fantasy',
      subtitle: 'Galactic epics & otherworldly cinema',
      endpoint: '/discover/movie',
      params: { with_genres: '878|14', sort_by: 'popularity.desc', include_adult: false },
    },
    {
      id: 'horror-thriller',
      title: 'Horror & Thriller',
      subtitle: 'Edge-of-your-seat suspense',
      endpoint: '/discover/movie',
      params: { with_genres: '27|53', sort_by: 'popularity.desc', include_adult: false },
    },
    {
      id: 'animation',
      title: 'Animation',
      subtitle: 'Acclaimed animated features & anime films',
      endpoint: '/discover/movie',
      params: { with_genres: '16', sort_by: 'popularity.desc', include_adult: false },
    },
    {
      id: 'comedy',
      title: 'Comedy',
      subtitle: 'Crowd-pleasing laughs & feel-good classics',
      endpoint: '/discover/movie',
      params: { with_genres: '35', sort_by: 'popularity.desc', include_adult: false },
    },
    {
      id: 'top-rated',
      title: 'Top Rated',
      subtitle: 'Highest-rated cinema of all time',
      endpoint: '/movie/top_rated',
    },
  ];

  const settled = await Promise.allSettled(
    rowSpecs.map((spec) => tmdbFetch<RawTmdbListResponse>(spec.endpoint, spec.params, signal))
  );

  const rows: MovieRow[] = [];
  settled.forEach((res, idx) => {
    if (res.status === 'fulfilled') {
      const movies = sanitizeMovies(res.value.results);
      if (movies.length > 0) {
        rows.push({
          id: rowSpecs[idx].id,
          title: rowSpecs[idx].title,
          subtitle: rowSpecs[idx].subtitle,
          movies,
        });
      }
    }
  });

  const trendingMovies = rows.find((r) => r.id === 'trending')?.movies || rows[0]?.movies || [];
  const heroMovies = trendingMovies.filter((m) => Boolean(m.backdrop_path)).slice(0, 6);

  return {
    heroMovies: heroMovies.length > 0 ? heroMovies : trendingMovies.slice(0, 5),
    rows,
  };
}

export async function searchMovies(
  query: string,
  page = 1,
  signal?: AbortSignal
): Promise<TmdbPagedResult> {
  const cleaned = query.trim();
  if (!cleaned) {
    return { page: 1, totalPages: 1, totalResults: 0, results: [] };
  }
  const data = await tmdbFetch<RawTmdbListResponse>(
    '/search/movie',
    {
      query: cleaned,
      include_adult: false,
      page,
    },
    signal
  );

  return {
    page: data.page || page,
    totalPages: Math.min(data.total_pages || 1, 50),
    totalResults: data.total_results || 0,
    results: sanitizeMovies(data.results),
  };
}

export async function discoverMovies(
  filters: MovieDiscoverFilters,
  signal?: AbortSignal
): Promise<TmdbPagedResult> {
  const sortBy = filters.sortBy || 'popularity.desc';
  const params: Record<string, string | number | boolean | undefined> = {
    include_adult: false,
    sort_by: sortBy,
    page: filters.page || 1,
    with_genres: filters.genreId || undefined,
    primary_release_year: filters.year || undefined,
    'vote_average.gte': filters.minRating && filters.minRating > 0 ? filters.minRating : undefined,
    'vote_count.gte':
      sortBy === 'vote_average.desc' || (filters.minRating && filters.minRating >= 6) ? 120 : 20,
  };

  if (sortBy === 'primary_release_date.desc' && !filters.year) {
    params['primary_release_date.lte'] = new Date().toISOString().slice(0, 10);
  }

  const data = await tmdbFetch<RawTmdbListResponse>('/discover/movie', params, signal);
  return {
    page: data.page || 1,
    totalPages: Math.min(data.total_pages || 1, 50),
    totalResults: data.total_results || 0,
    results: sanitizeMovies(data.results),
  };
}

export async function fetchMovieDetails(
  movieId: number,
  signal?: AbortSignal
): Promise<TmdbMovieDetails> {
  const data = await tmdbFetch<TmdbMovieDetails>(
    `/movie/${movieId}`,
    { append_to_response: 'credits,videos,similar' },
    signal
  );

  return {
    ...data,
    similar: data.similar
      ? { results: sanitizeMovies(data.similar.results) }
      : { results: [] },
  };
}
