import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Film,
  Play,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import {
  discoverMovies,
  fetchMoviesHomeRows,
  GENRE_SELECT_OPTIONS,
  getBackdropUrl,
  getGenreNames,
  getMovieYear,
  getPosterUrl,
  MOVIE_CATEGORY_TABS,
  MOVIE_YEAR_OPTIONS,
  searchMovies,
  type MovieRow,
  type MovieSortOption,
  type TmdbMovie,
} from '../services/tmdb';
import {
  fetchArchiveMovieRows,
  findVerifiedOpenMovieByTmdbId,
  openMovieToTmdbShape,
  searchArchiveMovies,
  VERIFIED_OPEN_MOVIES,
} from '../services/archiveMovies';
import { watchlistItemToTmdbMovie, type WatchlistItem } from '../services/movieWatchlist';

export interface MovieNavigationTarget {
  id?: number;
  archiveId?: string;
}

interface MoviesPageProps {
  watchlist: WatchlistItem[];
  watchlistIds: Set<number>;
  isCloudSynced: boolean;
  onToggleWatchlist: (movie: TmdbMovie) => Promise<'added' | 'removed'>;
  onOpenMovie: (target: MovieNavigationTarget) => void;
  onOpenAccount: () => void;
}

function resolveMovieNavTarget(movie: TmdbMovie): MovieNavigationTarget {
  const builtin = findVerifiedOpenMovieByTmdbId(movie.id);
  if (builtin) {
    return { id: builtin.tmdbId, archiveId: builtin.archiveId };
  }
  if (movie.archiveId && movie.id >= 900_000_000) {
    return { archiveId: movie.archiveId };
  }
  if (movie.archiveId) {
    return { id: movie.id, archiveId: movie.archiveId };
  }
  return { id: movie.id };
}

interface PosterCardProps {
  movie: TmdbMovie;
  inWatchlist: boolean;
  onOpen: (movie: TmdbMovie) => void;
  onToggleWatchlist: (movie: TmdbMovie) => void;
  layout?: 'row' | 'grid';
}

const MoviePosterCard: React.FC<PosterCardProps> = React.memo(
  ({ movie, inWatchlist, onOpen, onToggleWatchlist, layout = 'row' }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const posterUrl = getPosterUrl(movie.poster_path, 'w342');
    const year = getMovieYear(movie.release_date);
    const rating =
      typeof movie.vote_average === 'number' && movie.vote_average > 0
        ? movie.vote_average.toFixed(1)
        : null;
    const isDirectFree = Boolean(
      movie.isFreeFullMovie || movie.archiveId || findVerifiedOpenMovieByTmdbId(movie.id)
    );

    return (
      <div
        className={`group relative flex flex-col [content-visibility:auto] ${
          layout === 'row'
            ? 'w-[146px] shrink-0 sm:w-[168px] md:w-[184px] [contain-intrinsic-size:290px]'
            : 'w-full [contain-intrinsic-size:320px]'
        }`}
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-white/[0.09] bg-[#081226] shadow-md transition-transform duration-200 ease-out will-change-transform group-hover:scale-[1.03] group-hover:border-sky-400/45">
          <button
            type="button"
            onClick={() => onOpen(movie)}
            aria-label={`Open ${movie.title} (${year})`}
            className="block h-full w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            {posterUrl && !imgFailed ? (
              <img
                src={posterUrl}
                alt={movie.title}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#0c1b36] via-[#071022] to-[#040814] p-4 text-center">
                <Film className="h-8 w-8 text-sky-400/60" aria-hidden="true" />
                <p className="mt-2.5 line-clamp-3 text-xs font-semibold text-slate-200">
                  {movie.title}
                </p>
              </div>
            )}

            {/* Hover Play Scrim */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-[#040814]/85 via-[#040814]/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500 text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.65)]">
                <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
              </span>
            </div>
          </button>

          {/* Quick + My List Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist(movie);
            }}
            aria-label={
              inWatchlist
                ? `Remove ${movie.title} from My List`
                : `Add ${movie.title} to My List`
            }
            title={inWatchlist ? 'In My List' : 'Add to My List'}
            className={`absolute top-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
              inWatchlist
                ? 'border-emerald-400/60 bg-emerald-500/90 text-slate-950 hover:bg-emerald-400'
                : 'border-white/20 bg-[#050b18]/80 text-white opacity-95 hover:border-sky-400/60 hover:bg-sky-500 hover:text-slate-950'
            }`}
          >
            {inWatchlist ? (
              <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4 stroke-[2.2]" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Clean Unboxed Title & Metadata (Zero-Pill Discipline) */}
        <button
          type="button"
          onClick={() => onOpen(movie)}
          className="mt-2.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <p className="truncate text-xs font-semibold text-white transition-colors group-hover:text-sky-300 sm:text-[13px]">
            {movie.title}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400 tabular-nums">
            <span>{year}</span>
            {rating && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-0.5 font-semibold text-amber-300">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                  {rating}
                </span>
              </>
            )}
            {isDirectFree && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate font-semibold text-emerald-300">Free HD</span>
              </>
            )}
          </div>
        </button>
      </div>
    );
  }
);
MoviePosterCard.displayName = 'MoviePosterCard';

interface HorizontalRowProps {
  title: string;
  subtitle?: string;
  movies: TmdbMovie[];
  watchlistIds: Set<number>;
  onOpenMovie: (movie: TmdbMovie) => void;
  onToggleWatchlist: (movie: TmdbMovie) => void;
}

const HorizontalMovieRow: React.FC<HorizontalRowProps> = React.memo(
  ({ title, subtitle, movies, watchlistIds, onOpenMovie, onToggleWatchlist }) => {
    const scrollerRef = useRef<HTMLDivElement | null>(null);

    const scrollRow = (direction: 'left' | 'right') => {
      const el = scrollerRef.current;
      if (!el) return;
      const distance = Math.max(320, Math.floor(el.clientWidth * 0.78));
      el.scrollBy({
        left: direction === 'left' ? -distance : distance,
        behavior: 'smooth',
      });
    };

    if (movies.length === 0) return null;

    return (
      <section className="space-y-3" aria-label={title}>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold tracking-tight text-white sm:text-lg">
              {title}
            </h2>
            {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
          </div>

          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            <button
              type="button"
              onClick={() => scrollRow('left')}
              aria-label={`Scroll ${title} left`}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-slate-300 transition-colors hover:border-sky-400/45 hover:bg-white/[0.1] hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollRow('right')}
              aria-label={`Scroll ${title} right`}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-slate-300 transition-colors hover:border-sky-400/45 hover:bg-white/[0.1] hover:text-white"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="no-scrollbar flex gap-3.5 overflow-x-auto pb-2 scroll-smooth sm:gap-4"
        >
          {movies.map((movie) => (
            <MoviePosterCard
              key={movie.archiveId ? `ia-${movie.archiveId}` : `tmdb-${movie.id}`}
              movie={movie}
              inWatchlist={watchlistIds.has(movie.id)}
              onOpen={onOpenMovie}
              onToggleWatchlist={onToggleWatchlist}
              layout="row"
            />
          ))}
        </div>
      </section>
    );
  }
);
HorizontalMovieRow.displayName = 'HorizontalMovieRow';

export const MoviesPage: React.FC<MoviesPageProps> = React.memo(
  ({
    watchlist,
    watchlistIds,
    isCloudSynced,
    onToggleWatchlist,
    onOpenMovie,
    onOpenAccount,
  }) => {
    const builtInOpenMovies = useMemo(
      () => VERIFIED_OPEN_MOVIES.map(openMovieToTmdbShape),
      []
    );

    const [heroMovies, setHeroMovies] = useState<TmdbMovie[]>(() => builtInOpenMovies.slice(0, 6));
    const [heroIndex, setHeroIndex] = useState<number>(0);
    const [tmdbRows, setTmdbRows] = useState<MovieRow[]>([]);
    const [archiveRows, setArchiveRows] = useState<{
      classics: TmdbMovie[];
      scifiHorror: TmdbMovie[];
      comedyAnimation: TmdbMovie[];
    }>({ classics: [], scifiHorror: [], comedyAnimation: [] });
    const [isLoadingHome, setIsLoadingHome] = useState<boolean>(true);
    const [homeError, setHomeError] = useState<string | null>(null);
    const [heroImgFailed, setHeroImgFailed] = useState<boolean>(false);

    // Interactive category, debounced live search & multi-filter state
    const [activeCategoryId, setActiveCategoryId] = useState<string>('browse');
    const [searchInput, setSearchInput] = useState<string>('');
    const [debouncedQuery, setDebouncedQuery] = useState<string>('');
    const [selectedGenre, setSelectedGenre] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [minRating, setMinRating] = useState<number>(0);
    const [sortBy, setSortBy] = useState<MovieSortOption>('popularity.desc');

    // Filtered / Search Grid Results
    const [gridMovies, setGridMovies] = useState<TmdbMovie[]>([]);
    const [gridPage, setGridPage] = useState<number>(1);
    const [gridTotalPages, setGridTotalPages] = useState<number>(1);
    const [gridTotalResults, setGridTotalResults] = useState<number>(0);
    const [isLoadingGrid, setIsLoadingGrid] = useState<boolean>(false);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [gridError, setGridError] = useState<string | null>(null);

    // 300ms Debounced Live Search
    useEffect(() => {
      const timer = window.setTimeout(() => {
        setDebouncedQuery(searchInput.trim());
      }, 300);
      return () => window.clearTimeout(timer);
    }, [searchInput]);

    // Fetch both Internet Archive public-domain movies AND TMDB category rows in parallel
    const loadHomeCatalog = useCallback(
      async (signal?: AbortSignal) => {
        setIsLoadingHome(true);
        setHomeError(null);
        try {
          const [archiveRes, tmdbRes] = await Promise.allSettled([
            fetchArchiveMovieRows(signal),
            fetchMoviesHomeRows(signal),
          ]);
          if (signal?.aborted) return;

          if (archiveRes.status === 'fulfilled') {
            setArchiveRows(archiveRes.value);
          }
          if (tmdbRes.status === 'fulfilled') {
            setTmdbRows(tmdbRes.value.rows);
            // Feature direct playable open-access movies first, followed by top TMDB trending
            const combinedHero = [
              ...builtInOpenMovies.slice(0, 3),
              ...tmdbRes.value.heroMovies.slice(0, 3),
            ];
            setHeroMovies(combinedHero);
          } else {
            setHeroMovies(builtInOpenMovies.slice(0, 6));
          }
          setHeroIndex(0);
          setHeroImgFailed(false);
        } catch (err) {
          if (signal?.aborted) return;
          setHomeError(err instanceof Error ? err.message : 'Unable to load catalog.');
        } finally {
          if (!signal?.aborted) setIsLoadingHome(false);
        }
      },
      [builtInOpenMovies]
    );

    useEffect(() => {
      const controller = new AbortController();
      void loadHomeCatalog(controller.signal);
      return () => controller.abort();
    }, [loadHomeCatalog]);

    const allFreeFullMovies = useMemo(() => {
      const seen = new Set<string>();
      const merged: TmdbMovie[] = [];
      const pushList = (list: TmdbMovie[]) => {
        for (const m of list) {
          const k = (m.archiveId || String(m.id)).toLowerCase();
          if (seen.has(k)) continue;
          seen.add(k);
          merged.push(m);
        }
      };
      pushList(builtInOpenMovies);
      pushList(archiveRows.classics);
      pushList(archiveRows.scifiHorror);
      pushList(archiveRows.comedyAnimation);
      return merged;
    }, [builtInOpenMovies, archiveRows]);

    const activeTabConfig = useMemo(
      () => MOVIE_CATEGORY_TABS.find((t) => t.id === activeCategoryId) || MOVIE_CATEGORY_TABS[0],
      [activeCategoryId]
    );

    const effectiveGenre = selectedGenre || activeTabConfig.genreParam || '';
    const isMyListMode = activeCategoryId === 'my-list' && !debouncedQuery;
    const isFreeFullMode = activeCategoryId === 'free-full' && !debouncedQuery;
    const isFilteredGridMode =
      !isMyListMode &&
      !isFreeFullMode &&
      (Boolean(debouncedQuery) ||
        Boolean(effectiveGenre) ||
        Boolean(selectedYear) ||
        minRating > 0 ||
        sortBy !== 'popularity.desc');

    // Filter Free Full Movies locally when the "Free Full Movies" tab is active
    const filteredFreeFullMovies = useMemo(() => {
      if (!isFreeFullMode) return [];
      const genreSet = effectiveGenre
        ? new Set(effectiveGenre.split(/[|,]/).map((g) => Number(g)))
        : null;
      const list = allFreeFullMovies.filter((m) => {
        if (genreSet && !(m.genre_ids || []).some((id) => genreSet.has(id))) return false;
        if (selectedYear && getMovieYear(m.release_date) !== selectedYear) return false;
        if (minRating > 0 && (m.vote_average || 0) < minRating) return false;
        return true;
      });

      if (sortBy === 'vote_average.desc') {
        return [...list].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      }
      if (sortBy === 'primary_release_date.desc') {
        return [...list].sort((a, b) =>
          (b.release_date || '').localeCompare(a.release_date || '')
        );
      }
      return list;
    }, [isFreeFullMode, allFreeFullMovies, effectiveGenre, selectedYear, minRating, sortBy]);

    // Fetch live search (Internet Archive + TMDB merged) or TMDB discover results
    useEffect(() => {
      if (!isFilteredGridMode) {
        setGridMovies([]);
        setGridError(null);
        setIsLoadingGrid(false);
        return;
      }

      const controller = new AbortController();
      setIsLoadingGrid(true);
      setGridError(null);

      const run = async () => {
        try {
          if (debouncedQuery) {
            const [archiveHits, tmdbHits] = await Promise.allSettled([
              searchArchiveMovies(debouncedQuery, 1, controller.signal),
              searchMovies(debouncedQuery, 1, controller.signal),
            ]);
            if (controller.signal.aborted) return;

            const freeMatches = archiveHits.status === 'fulfilled' ? archiveHits.value : [];
            const tmdbResult =
              tmdbHits.status === 'fulfilled'
                ? tmdbHits.value
                : { page: 1, totalPages: 1, totalResults: 0, results: [] };

            const seenIds = new Set<number>();
            const merged: TmdbMovie[] = [];
            for (const m of freeMatches) {
              seenIds.add(m.id);
              merged.push(m);
            }
            for (const m of tmdbResult.results) {
              if (seenIds.has(m.id)) continue;
              seenIds.add(m.id);
              merged.push(m);
            }

            setGridMovies(merged);
            setGridPage(tmdbResult.page);
            setGridTotalPages(tmdbResult.totalPages);
            setGridTotalResults(freeMatches.length + tmdbResult.totalResults);
          } else {
            const data = await discoverMovies(
              {
                genreId: effectiveGenre || undefined,
                year: selectedYear || undefined,
                minRating: minRating > 0 ? minRating : undefined,
                sortBy,
                page: 1,
              },
              controller.signal
            );
            if (controller.signal.aborted) return;
            setGridMovies(data.results);
            setGridPage(data.page);
            setGridTotalPages(data.totalPages);
            setGridTotalResults(data.totalResults);
          }
        } catch (err) {
          if (controller.signal.aborted) return;
          setGridError(err instanceof Error ? err.message : 'Could not fetch movie results.');
        } finally {
          if (!controller.signal.aborted) setIsLoadingGrid(false);
        }
      };

      void run();
      return () => controller.abort();
    }, [isFilteredGridMode, debouncedQuery, effectiveGenre, selectedYear, minRating, sortBy]);

    const handleLoadMore = useCallback(async () => {
      if (isLoadingMore || gridPage >= gridTotalPages) return;
      const nextPage = gridPage + 1;
      setIsLoadingMore(true);
      try {
        const data = debouncedQuery
          ? await searchMovies(debouncedQuery, nextPage)
          : await discoverMovies({
              genreId: effectiveGenre || undefined,
              year: selectedYear || undefined,
              minRating: minRating > 0 ? minRating : undefined,
              sortBy,
              page: nextPage,
            });
        setGridMovies((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const appended = data.results.filter((m) => !seen.has(m.id));
          return [...prev, ...appended];
        });
        setGridPage(data.page);
        setGridTotalPages(data.totalPages);
      } finally {
        setIsLoadingMore(false);
      }
    }, [
      isLoadingMore,
      gridPage,
      gridTotalPages,
      debouncedQuery,
      effectiveGenre,
      selectedYear,
      minRating,
      sortBy,
    ]);

    const handleResetFilters = useCallback(() => {
      setSearchInput('');
      setDebouncedQuery('');
      setActiveCategoryId('browse');
      setSelectedGenre('');
      setSelectedYear('');
      setMinRating(0);
      setSortBy('popularity.desc');
    }, []);

    const handleSelectCategoryTab = useCallback((tabId: string) => {
      setActiveCategoryId(tabId);
      setSelectedGenre('');
      if (tabId === 'browse') {
        setSelectedYear('');
        setMinRating(0);
        setSortBy('popularity.desc');
      }
    }, []);

    const handleOpenMovieCard = useCallback(
      (movie: TmdbMovie) => {
        onOpenMovie(resolveMovieNavTarget(movie));
      },
      [onOpenMovie]
    );

    const handleToggleCardWatchlist = useCallback(
      (movie: TmdbMovie) => {
        void onToggleWatchlist(movie);
      },
      [onToggleWatchlist]
    );

    const watchlistAsMovies = useMemo(
      () => watchlist.map(watchlistItemToTmdbMovie),
      [watchlist]
    );

    const featuredMovie = heroMovies[heroIndex] || heroMovies[0] || null;
    const featuredBackdrop = featuredMovie
      ? getBackdropUrl(featuredMovie.backdrop_path || featuredMovie.poster_path, 'w1280')
      : null;
    const featuredGenres = featuredMovie ? getGenreNames(featuredMovie, 3) : [];
    const featuredInList = featuredMovie ? watchlistIds.has(featuredMovie.id) : false;
    const featuredIsFreeDirect = Boolean(
      featuredMovie &&
        (featuredMovie.isFreeFullMovie ||
          featuredMovie.archiveId ||
          findVerifiedOpenMovieByTmdbId(featuredMovie.id))
    );

    useEffect(() => {
      setHeroImgFailed(false);
    }, [featuredMovie?.id]);

    return (
      <div className="space-y-8">
        {/* 1. Featured Ad-Free Cinema Hero Banner */}
        {!isFilteredGridMode && !isMyListMode && !isFreeFullMode && featuredMovie && (
          <section
            aria-label="Featured Movie"
            className="relative overflow-hidden rounded-3xl border border-sky-400/25 bg-[#060d1f] shadow-[0_24px_64px_-24px_rgba(14,165,233,0.35)]"
          >
            <div className="relative min-h-[380px] w-full sm:min-h-[450px] lg:min-h-[500px]">
              {featuredBackdrop && !heroImgFailed ? (
                <img
                  src={featuredBackdrop}
                  alt={featuredMovie.title}
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#0e2144] via-[#071022] to-[#040814]" />
              )}

              {/* Measured Multi-Stop Scrim for WCAG AA Contrast */}
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#040814] via-[#040814]/60 to-[#040814]/25"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#040814]/95 via-[#040814]/70 to-transparent"
                aria-hidden="true"
              />

              <div className="relative z-10 flex min-h-[380px] flex-col justify-end p-6 sm:min-h-[450px] sm:p-10 lg:min-h-[500px]">
                <div className="max-w-2xl space-y-3.5">
                  {/* Unboxed Metadata Line */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-300 tabular-nums">
                    <span
                      className={
                        featuredIsFreeDirect
                          ? 'font-semibold text-emerald-300'
                          : 'font-semibold text-sky-300'
                      }
                    >
                      {featuredIsFreeDirect
                        ? 'Ad-Free Full Movie · Direct HD'
                        : 'Trending Worldwide · TMDB'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{getMovieYear(featuredMovie.release_date)}</span>
                    {featuredMovie.vote_average > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                          <Star
                            className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                            aria-hidden="true"
                          />
                          {featuredMovie.vote_average.toFixed(1)}
                        </span>
                      </>
                    )}
                    {featuredGenres.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{featuredGenres.join(' / ')}</span>
                      </>
                    )}
                  </div>

                  <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl [text-wrap:balance]">
                    {featuredMovie.title}
                  </h1>

                  {featuredMovie.overview && (
                    <p className="line-clamp-3 max-w-xl text-sm leading-relaxed text-slate-200/90 sm:text-[15px]">
                      {featuredMovie.overview}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenMovieCard(featuredMovie)}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-sky-500 px-6 text-sm font-bold text-slate-950 shadow-[0_0_28px_-6px_rgba(56,189,248,0.85)] transition-colors hover:bg-sky-400 whitespace-nowrap"
                    >
                      <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                      <span>{featuredIsFreeDirect ? 'Watch Full Movie' : 'Explore & Trailer'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleCardWatchlist(featuredMovie)}
                      className={`inline-flex h-11 items-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-colors whitespace-nowrap ${
                        featuredInList
                          ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                          : 'border-white/20 bg-white/[0.08] text-white hover:border-sky-400/50 hover:bg-white/[0.15]'
                      }`}
                    >
                      {featuredInList ? (
                        <>
                          <Check className="h-4 w-4" aria-hidden="true" />
                          <span>In My List</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          <span>My List</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Subtle Featured Film Switcher */}
                {heroMovies.length > 1 && (
                  <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/[0.08] pt-4">
                    <div className="flex items-center gap-1.5">
                      {heroMovies.map((m, idx) => (
                        <button
                          key={m.archiveId || m.id}
                          type="button"
                          onClick={() => setHeroIndex(idx)}
                          aria-label={`Feature ${m.title}`}
                          className={`h-1.5 rounded-full transition-all ${
                            idx === heroIndex
                              ? 'w-7 bg-sky-400'
                              : 'w-2 bg-white/25 hover:bg-white/45'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setHeroIndex((i) => (i - 1 + heroMovies.length) % heroMovies.length)
                        }
                        aria-label="Previous featured movie"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/40 text-slate-200 transition-colors hover:border-sky-400/50 hover:text-white"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeroIndex((i) => (i + 1) % heroMovies.length)}
                        aria-label="Next featured movie"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/40 text-slate-200 transition-colors hover:border-sky-400/50 hover:text-white"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 2. Live Search Bar + Category Tabs + Multi-Filter Toolbar */}
        <section
          aria-label="Search and filter movies"
          className="space-y-4 rounded-3xl border border-white/[0.09] bg-[#071022]/90 p-4 sm:p-5"
        >
          {/* Live Search Input + Watchlist Cloud Status */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-sky-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search free Internet Archive full movies & TMDB catalog worldwide..."
                aria-label="Search movies worldwide"
                className="h-11 w-full rounded-xl border border-white/14 bg-slate-950/90 pr-10 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setDebouncedQuery('');
                  }}
                  aria-label="Clear movie search"
                  className="absolute top-1/2 right-2.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <button
                type="button"
                onClick={() => handleSelectCategoryTab(isMyListMode ? 'browse' : 'my-list')}
                className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 font-semibold transition-colors whitespace-nowrap ${
                  isMyListMode
                    ? 'border-emerald-400/55 bg-emerald-500/20 text-emerald-200'
                    : 'border-white/12 bg-white/[0.05] text-slate-200 hover:border-sky-400/45 hover:text-white'
                }`}
              >
                <Bookmark className="h-4 w-4 text-sky-400" aria-hidden="true" />
                <span>My List</span>
                <span className="tabular-nums text-slate-400">({watchlist.length})</span>
              </button>

              {isCloudSynced ? (
                <span className="inline-flex h-11 items-center gap-1.5 px-2 text-xs font-medium text-emerald-300 whitespace-nowrap">
                  <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Cloud Synced</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAccount}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-xs font-medium text-slate-300 transition-colors hover:border-sky-400/40 hover:text-white whitespace-nowrap"
                >
                  <Cloud className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span>Sign in to sync My List</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Category Selector Row */}
          <div
            role="tablist"
            aria-label="Movie categories"
            className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5"
          >
            {MOVIE_CATEGORY_TABS.map((tab) => {
              const isActive = activeCategoryId === tab.id && !debouncedQuery && !selectedGenre;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleSelectCategoryTab(tab.id)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    isActive
                      ? tab.id === 'free-full'
                        ? 'bg-emerald-400 text-slate-950 shadow-[0_0_18px_-6px_rgba(52,211,153,0.85)]'
                        : 'bg-sky-500 text-slate-950 shadow-[0_0_18px_-6px_rgba(56,189,248,0.85)]'
                      : 'border border-white/10 bg-slate-950/70 text-slate-300 hover:border-sky-400/40 hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.id === 'free-full' && (
                    <span className="tabular-nums opacity-80">· {allFreeFullMovies.length}</span>
                  )}
                  {tab.id === 'my-list' && watchlist.length > 0 && (
                    <span className="tabular-nums opacity-80">· {watchlist.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Genre / Year / Min Rating / Sort By Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5 border-t border-white/[0.07] pt-3.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              <span>Filters</span>
            </span>

            <select
              aria-label="Filter by genre"
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value);
                if (e.target.value && activeCategoryId !== 'free-full') {
                  setActiveCategoryId('browse');
                }
              }}
              className="h-9 rounded-xl border border-white/12 bg-slate-950 px-3 text-xs font-medium text-slate-200 focus:border-sky-400 focus:outline-none"
            >
              {GENRE_SELECT_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by release year"
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                if (activeCategoryId === 'my-list') setActiveCategoryId('browse');
              }}
              className="h-9 rounded-xl border border-white/12 bg-slate-950 px-3 text-xs font-medium text-slate-200 focus:border-sky-400 focus:outline-none tabular-nums"
            >
              <option value="">All Years</option>
              {MOVIE_YEAR_OPTIONS.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by minimum rating"
              value={minRating}
              onChange={(e) => {
                setMinRating(Number(e.target.value));
                if (activeCategoryId === 'my-list') setActiveCategoryId('browse');
              }}
              className="h-9 rounded-xl border border-white/12 bg-slate-950 px-3 text-xs font-medium text-slate-200 focus:border-sky-400 focus:outline-none tabular-nums"
            >
              <option value={0}>Any Rating</option>
              <option value={6}>6.0+ Rated</option>
              <option value={7}>7.0+ Rated</option>
              <option value={8}>8.0+ Acclaimed</option>
            </select>

            <select
              aria-label="Sort movies by"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as MovieSortOption);
                if (activeCategoryId === 'my-list') setActiveCategoryId('browse');
              }}
              className="h-9 rounded-xl border border-white/12 bg-slate-950 px-3 text-xs font-medium text-slate-200 focus:border-sky-400 focus:outline-none"
            >
              <option value="popularity.desc">Sort: Popularity</option>
              <option value="vote_average.desc">Sort: Highest Rated</option>
              <option value="primary_release_date.desc">Sort: Release Date</option>
            </select>

            {(isFilteredGridMode || isMyListMode || isFreeFullMode) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-xs font-semibold text-cyan-300 transition-colors hover:bg-white/[0.1] hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </section>

        {/* 3. Main Content: My List, Free Full Movies Grid, Search/Filtered Grid, OR Netflix-Style Rows */}
        {isMyListMode ? (
          <section aria-label="My List" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">My List</h2>
                <p className="text-xs text-slate-400">
                  {isCloudSynced
                    ? 'Synced live with your Firebase account across devices'
                    : 'Saved locally on this device · Sign in to sync with Firebase'}
                </p>
              </div>
              <span className="text-xs font-medium text-slate-400 tabular-nums">
                {watchlist.length} {watchlist.length === 1 ? 'movie' : 'movies'}
              </span>
            </div>

            {watchlistAsMovies.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-[#071022]/80 px-6 py-16 text-center">
                <Bookmark className="h-9 w-9 text-sky-400/70" aria-hidden="true" />
                <p className="mt-3 text-base font-bold text-white">Your My List is empty</p>
                <p className="mt-1 max-w-md text-xs text-slate-400">
                  Tap the + button on any movie poster or detail page to save films to watch later.
                </p>
                <button
                  type="button"
                  onClick={() => handleSelectCategoryTab('browse')}
                  className="mt-5 inline-flex h-10 items-center rounded-xl bg-sky-500 px-5 text-xs font-bold text-slate-950 transition-colors hover:bg-sky-400"
                >
                  Browse Movies
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {watchlistAsMovies.map((movie) => (
                  <MoviePosterCard
                    key={movie.archiveId ? `ml-ia-${movie.archiveId}` : `ml-${movie.id}`}
                    movie={movie}
                    inWatchlist={true}
                    onOpen={handleOpenMovieCard}
                    onToggleWatchlist={handleToggleCardWatchlist}
                    layout="grid"
                  />
                ))}
              </div>
            )}
          </section>
        ) : isFreeFullMode ? (
          <section aria-label="Free Full Movies" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Free Full-Length Open Cinema (Ad-Free Direct HD)
                </h2>
                <p className="text-xs text-slate-400">
                  Public-domain &amp; Creative Commons feature films playing directly in our native
                  HTML5 / HLS player — zero pop-up ads
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-300 tabular-nums">
                {filteredFreeFullMovies.length} playable films
              </span>
            </div>

            {filteredFreeFullMovies.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-[#071022]/80 px-6 py-14 text-center">
                <Film className="h-9 w-9 text-slate-500" aria-hidden="true" />
                <p className="mt-3 text-base font-bold text-white">
                  No free full movies match these filters
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 inline-flex h-10 items-center rounded-xl bg-sky-500 px-5 text-xs font-bold text-slate-950 hover:bg-sky-400"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filteredFreeFullMovies.map((movie) => (
                  <MoviePosterCard
                    key={movie.archiveId ? `ff-ia-${movie.archiveId}` : `ff-${movie.id}`}
                    movie={movie}
                    inWatchlist={watchlistIds.has(movie.id)}
                    onOpen={handleOpenMovieCard}
                    onToggleWatchlist={handleToggleCardWatchlist}
                    layout="grid"
                  />
                ))}
              </div>
            )}
          </section>
        ) : isFilteredGridMode ? (
          <section aria-label="Movie search and filter results" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {debouncedQuery
                    ? `Search results for “${debouncedQuery}”`
                    : activeCategoryId !== 'browse' && !selectedGenre
                      ? activeTabConfig.label
                      : 'Filtered Movies'}
                </h2>
                <p className="text-xs text-slate-400 tabular-nums">
                  {isLoadingGrid
                    ? 'Searching Internet Archive & TMDB worldwide catalog…'
                    : `${gridTotalResults.toLocaleString()} titles found (Free direct streams shown first)`}
                </p>
              </div>
            </div>

            {gridError ? (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-center">
                <p className="text-sm font-semibold text-rose-200">{gridError}</p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400"
                >
                  Back to Browse All
                </button>
              </div>
            ) : isLoadingGrid ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="aspect-[2/3] w-full animate-pulse rounded-2xl bg-white/[0.06]" />
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-white/[0.06]" />
                  </div>
                ))}
              </div>
            ) : gridMovies.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-[#071022]/80 px-6 py-16 text-center">
                <Film className="h-9 w-9 text-slate-500" aria-hidden="true" />
                <p className="mt-3 text-base font-bold text-white">No matching movies found</p>
                <p className="mt-1 text-xs text-slate-400">
                  Try another search title or relax your year and rating filters.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-5 inline-flex h-10 items-center rounded-xl bg-sky-500 px-5 text-xs font-bold text-slate-950 hover:bg-sky-400"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {gridMovies.map((movie) => (
                    <MoviePosterCard
                      key={movie.archiveId ? `g-ia-${movie.archiveId}` : `g-${movie.id}`}
                      movie={movie}
                      inWatchlist={watchlistIds.has(movie.id)}
                      onOpen={handleOpenMovieCard}
                      onToggleWatchlist={handleToggleCardWatchlist}
                      layout="grid"
                    />
                  ))}
                </div>

                {gridPage < gridTotalPages && (
                  <div className="flex justify-center pt-4">
                    <button
                      type="button"
                      onClick={() => void handleLoadMore()}
                      disabled={isLoadingMore}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/14 bg-white/[0.06] px-6 text-xs font-semibold text-white transition-colors hover:border-sky-400/45 hover:bg-white/[0.12] disabled:opacity-60"
                    >
                      {isLoadingMore && (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      )}
                      <span>{isLoadingMore ? 'Loading more…' : 'Load More Movies'}</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        ) : (
          /* Default Netflix-Style Horizontal Category Rows (Ad-Free Full Movies + Internet Archive + TMDB) */
          <div className="space-y-8">
            {homeError && tmdbRows.length === 0 && archiveRows.classics.length === 0 ? (
              <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-8 text-center">
                <p className="text-sm font-semibold text-rose-200">{homeError}</p>
                <button
                  type="button"
                  onClick={() => void loadHomeCatalog()}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-sky-500 px-5 text-xs font-bold text-slate-950 hover:bg-sky-400"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <span>Retry Loading Movies</span>
                </button>
              </div>
            ) : (
              <>
                {watchlistAsMovies.length > 0 && (
                  <HorizontalMovieRow
                    title="My List"
                    subtitle={
                      isCloudSynced
                        ? 'Synced live with your Firebase account'
                        : 'Saved on this device'
                    }
                    movies={watchlistAsMovies}
                    watchlistIds={watchlistIds}
                    onOpenMovie={handleOpenMovieCard}
                    onToggleWatchlist={handleToggleCardWatchlist}
                  />
                )}

                {/* Verified Direct MP4/HLS Ad-Free Catalog */}
                <HorizontalMovieRow
                  title="Free Full Movies · Direct HD"
                  subtitle="Verified ad-free MP4 & HLS open-access films playing natively with zero pop-ups"
                  movies={builtInOpenMovies}
                  watchlistIds={watchlistIds}
                  onOpenMovie={handleOpenMovieCard}
                  onToggleWatchlist={handleToggleCardWatchlist}
                />

                {/* Live Internet Archive Public-Domain Rows */}
                {archiveRows.classics.length > 0 && (
                  <HorizontalMovieRow
                    title="Internet Archive · Classic Feature Films"
                    subtitle="Live public-domain cinema directly from archive.org"
                    movies={archiveRows.classics}
                    watchlistIds={watchlistIds}
                    onOpenMovie={handleOpenMovieCard}
                    onToggleWatchlist={handleToggleCardWatchlist}
                  />
                )}

                {archiveRows.scifiHorror.length > 0 && (
                  <HorizontalMovieRow
                    title="Internet Archive · Sci-Fi & Horror"
                    subtitle="Cult science fiction & suspense features · Ad-free native stream"
                    movies={archiveRows.scifiHorror}
                    watchlistIds={watchlistIds}
                    onOpenMovie={handleOpenMovieCard}
                    onToggleWatchlist={handleToggleCardWatchlist}
                  />
                )}

                {archiveRows.comedyAnimation.length > 0 && (
                  <HorizontalMovieRow
                    title="Internet Archive · Comedy & Animation"
                    subtitle="Classic comedies & animated reels · Ad-free native stream"
                    movies={archiveRows.comedyAnimation}
                    watchlistIds={watchlistIds}
                    onOpenMovie={handleOpenMovieCard}
                    onToggleWatchlist={handleToggleCardWatchlist}
                  />
                )}

                {/* TMDB Worldwide Rows (Metadata, Cast, Official Trailers & Auto Archive Match) */}
                {isLoadingHome && tmdbRows.length === 0
                  ? Array.from({ length: 2 }).map((_, rowIdx) => (
                      <div key={rowIdx} className="space-y-3">
                        <div className="h-5 w-44 animate-pulse rounded bg-white/10" />
                        <div className="flex gap-4 overflow-hidden">
                          {Array.from({ length: 7 }).map((__, cardIdx) => (
                            <div
                              key={cardIdx}
                              className="aspect-[2/3] w-[160px] shrink-0 animate-pulse rounded-2xl bg-white/[0.06]"
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  : tmdbRows.map((row) => (
                      <HorizontalMovieRow
                        key={row.id}
                        title={row.title}
                        subtitle={row.subtitle}
                        movies={row.movies}
                        watchlistIds={watchlistIds}
                        onOpenMovie={handleOpenMovieCard}
                        onToggleWatchlist={handleToggleCardWatchlist}
                      />
                    ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);

MoviesPage.displayName = 'MoviesPage';
