import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  Cloud,
  Film,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  RefreshCw,
  Server,
  Star,
  User,
  X,
  Youtube,
} from 'lucide-react';
import {
  fetchMovieDetails,
  formatRuntime,
  getBackdropUrl,
  getMovieYear,
  getPosterUrl,
  getProfileUrl,
  MOVIE_STREAM_SERVERS,
  pickOfficialTrailer,
  type TmdbMovie,
  type TmdbMovieDetails,
} from '../services/tmdb';

interface MovieDetailPageProps {
  movieId: number;
  watchlistIds: Set<number>;
  isCloudSynced: boolean;
  onToggleWatchlist: (movie: TmdbMovie) => Promise<'added' | 'removed'>;
  onBackToMovies: () => void;
  onOpenMovie: (movieId: number) => void;
}

export const MovieDetailPage: React.FC<MovieDetailPageProps> = React.memo(
  ({
    movieId,
    watchlistIds,
    isCloudSynced,
    onToggleWatchlist,
    onBackToMovies,
    onOpenMovie,
  }) => {
    const [details, setDetails] = useState<TmdbMovieDetails | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [activeServerIdx, setActiveServerIdx] = useState<number>(0);
    const [playerReloadNonce, setPlayerReloadNonce] = useState<number>(0);
    const [isCinemaWide, setIsCinemaWide] = useState<boolean>(false);
    const [showTrailerModal, setShowTrailerModal] = useState<boolean>(false);
    const [posterFailed, setPosterFailed] = useState<boolean>(false);
    const [backdropFailed, setBackdropFailed] = useState<boolean>(false);
    const [brokenProfiles, setBrokenProfiles] = useState<Record<number, boolean>>({});
    const [brokenSimilarPosters, setBrokenSimilarPosters] = useState<Record<number, boolean>>({});

    const playerSectionRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
      const controller = new AbortController();
      setIsLoading(true);
      setError(null);
      setActiveServerIdx(0);
      setPlayerReloadNonce(0);
      setShowTrailerModal(false);
      setPosterFailed(false);
      setBackdropFailed(false);
      setBrokenProfiles({});
      setBrokenSimilarPosters({});

      fetchMovieDetails(movieId, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          setDetails(data);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : 'Unable to load movie details.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });

      return () => controller.abort();
    }, [movieId]);

    // Close trailer modal on Escape key
    useEffect(() => {
      if (!showTrailerModal) return;
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setShowTrailerModal(false);
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [showTrailerModal]);

    const activeServer = MOVIE_STREAM_SERVERS[activeServerIdx] || MOVIE_STREAM_SERVERS[0];
    const embedStreamUrl = useMemo(
      () => activeServer.buildUrl(movieId),
      [activeServer, movieId]
    );

    const trailer = useMemo(
      () => pickOfficialTrailer(details?.videos?.results),
      [details?.videos?.results]
    );

    const castMembers = useMemo(
      () => (details?.credits?.cast || []).slice(0, 14),
      [details?.credits?.cast]
    );

    const similarMovies = useMemo(
      () => (details?.similar?.results || []).slice(0, 14),
      [details?.similar?.results]
    );

    const inWatchlist = watchlistIds.has(movieId);

    const handleScrollToPlayer = useCallback(() => {
      playerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const handleToggleList = useCallback(() => {
      if (!details) return;
      void onToggleWatchlist(details);
    }, [details, onToggleWatchlist]);

    const backdropUrl = details ? getBackdropUrl(details.backdrop_path, 'w1280') : null;
    const posterUrl = details ? getPosterUrl(details.poster_path, 'w500') : null;
    const year = getMovieYear(details?.release_date);
    const runtimeLabel = formatRuntime(details?.runtime);
    const ratingLabel =
      details && details.vote_average > 0 ? details.vote_average.toFixed(1) : null;

    return (
      <div className="space-y-8">
        {/* Top Action Strip: Dedicated Back to Movies Button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToMovies}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-sky-400/35 bg-sky-500/12 px-4 text-xs font-semibold text-sky-200 transition-colors hover:border-sky-400/65 hover:bg-sky-500/20 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 text-sky-400" aria-hidden="true" />
            <span>Back to Movies</span>
          </button>

          {isCloudSynced && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
              <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
              <span>My List synced with Firebase</span>
            </span>
          )}
        </div>

        {/* Loading / Error State */}
        {isLoading && !details ? (
          <div className="space-y-6">
            <div className="h-[340px] w-full animate-pulse rounded-3xl bg-white/[0.05]" />
            <div className="aspect-video w-full animate-pulse rounded-3xl bg-white/[0.05]" />
          </div>
        ) : error && !details ? (
          <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-8 text-center">
            <p className="text-sm font-semibold text-rose-200">{error}</p>
            <button
              type="button"
              onClick={onBackToMovies}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-sky-500 px-5 text-xs font-bold text-slate-950 hover:bg-sky-400"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Back to Movies</span>
            </button>
          </div>
        ) : details ? (
          <>
            {/* 1. Netflix-Style Movie Details Hero Header */}
            <section
              aria-label="Movie metadata"
              className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-[#060d1f] shadow-[0_24px_64px_-24px_rgba(14,165,233,0.3)]"
            >
              {backdropUrl && !backdropFailed ? (
                <img
                  src={backdropUrl}
                  alt={details.title}
                  referrerPolicy="no-referrer"
                  onError={() => setBackdropFailed(true)}
                  className="absolute inset-0 h-full w-full object-cover object-center opacity-40"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#0e2144] via-[#071022] to-[#040814]" />
              )}

              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050b19] via-[#050b19]/80 to-[#050b19]/45"
                aria-hidden="true"
              />

              <div className="relative z-10 grid grid-cols-1 gap-6 p-6 sm:p-8 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
                {/* Movie Poster */}
                <div className="mx-auto w-[180px] shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-[#071022] shadow-2xl md:mx-0 md:w-full">
                  <div className="aspect-[2/3] w-full">
                    {posterUrl && !posterFailed ? (
                      <img
                        src={posterUrl}
                        alt={details.title}
                        referrerPolicy="no-referrer"
                        onError={() => setPosterFailed(true)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                        <Film className="h-10 w-10 text-sky-400/60" aria-hidden="true" />
                        <p className="mt-2 text-xs font-semibold text-slate-300">{details.title}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title, Tagline, Metadata, Overview & Primary Actions */}
                <div className="flex flex-col justify-center space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl [text-wrap:balance]">
                      {details.title}
                    </h1>
                    {details.tagline && (
                      <p className="mt-1.5 text-sm italic text-sky-200/85">{details.tagline}</p>
                    )}
                  </div>

                  {/* Clean Unboxed Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-300 sm:text-sm tabular-nums">
                    <span>{year}</span>
                    {runtimeLabel && (
                      <>
                        <span aria-hidden="true" className="text-slate-500">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                          {runtimeLabel}
                        </span>
                      </>
                    )}
                    {ratingLabel && (
                      <>
                        <span aria-hidden="true" className="text-slate-500">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                          <Star
                            className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                            aria-hidden="true"
                          />
                          {ratingLabel} / 10
                        </span>
                      </>
                    )}
                    {details.genres.length > 0 && (
                      <>
                        <span aria-hidden="true" className="text-slate-500">
                          ·
                        </span>
                        <span className="text-cyan-200">
                          {details.genres.map((g) => g.name).join(' / ')}
                        </span>
                      </>
                    )}
                  </div>

                  {details.overview && (
                    <p className="max-w-3xl text-sm leading-relaxed text-slate-200/90 sm:text-[15px]">
                      {details.overview}
                    </p>
                  )}

                  {/* Primary Action Row */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleScrollToPlayer}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-sky-500 px-6 text-sm font-bold text-slate-950 shadow-[0_0_24px_-6px_rgba(56,189,248,0.8)] transition-colors hover:bg-sky-400 whitespace-nowrap"
                    >
                      <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                      <span>Watch Movie</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowTrailerModal(true)}
                      disabled={!trailer}
                      title={
                        trailer
                          ? `Play ${trailer.name}`
                          : 'No official YouTube trailer available on TMDB'
                      }
                      className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-5 text-sm font-semibold text-rose-100 transition-colors hover:border-rose-400/70 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
                    >
                      <Youtube className="h-4 w-4 text-rose-400" aria-hidden="true" />
                      <span>
                        {trailer ? 'Watch Official Trailer' : 'Trailer Unavailable'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleList}
                      className={`inline-flex h-11 items-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-colors whitespace-nowrap ${
                        inWatchlist
                          ? 'border-emerald-400/55 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                          : 'border-white/18 bg-white/[0.07] text-white hover:border-sky-400/50 hover:bg-white/[0.14]'
                      }`}
                    >
                      {inWatchlist ? (
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
              </div>
            </section>

            {/* 2. Full Movie Stream Player with 1-Click Server Switcher */}
            <section
              ref={playerSectionRef}
              aria-label="Full movie stream player"
              className="space-y-3 scroll-mt-20"
            >
              <div className="flex flex-col justify-between gap-3 rounded-2xl border border-white/[0.09] bg-[#071022]/90 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/18 text-sky-400">
                    <Server className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-white">Stream Server Switcher</h2>
                    <p className="text-xs text-slate-400">
                      Switch servers with one click if playback is slow or blocked
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPlayerReloadNonce((n) => n + 1)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-400/45 hover:text-white whitespace-nowrap"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
                    <span>Reload</span>
                  </button>

                  <a
                    href={embedStreamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-400/35 bg-sky-500/12 px-3 text-xs font-semibold text-sky-200 transition-colors hover:border-sky-400/65 hover:bg-sky-500/20 hover:text-white whitespace-nowrap"
                  >
                    <span>Open Stream in New Tab ↗</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setIsCinemaWide((w) => !w)}
                    className="hidden h-9 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-400/45 hover:text-white whitespace-nowrap md:inline-flex"
                  >
                    {isCinemaWide ? (
                      <>
                        <Minimize2 className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                        <span>Standard View</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                        <span>Cinema Wide</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Server Selection Buttons */}
              <div
                role="tablist"
                aria-label="Select movie streaming server"
                className="flex flex-wrap items-center gap-2"
              >
                {MOVIE_STREAM_SERVERS.map((server, idx) => {
                  const isActive = idx === activeServerIdx;
                  return (
                    <button
                      key={server.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => {
                        setActiveServerIdx(idx);
                        setPlayerReloadNonce((n) => n + 1);
                      }}
                      className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-sky-500 text-slate-950 shadow-[0_0_20px_-6px_rgba(56,189,248,0.85)]'
                          : 'border border-white/12 bg-[#071022]/90 text-slate-200 hover:border-sky-400/45 hover:text-white'
                      }`}
                    >
                      <span>{server.name}</span>
                      <span
                        className={`text-[11px] font-medium ${
                          isActive ? 'text-slate-900/80' : 'text-slate-400'
                        }`}
                      >
                        · {server.qualityLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Embedded Full-Movie Player Stage */}
              <div
                className={`overflow-hidden rounded-3xl border border-sky-400/35 bg-black shadow-[0_24px_64px_-22px_rgba(14,165,233,0.4)] transition-all ${
                  isCinemaWide ? 'w-full' : 'mx-auto max-w-5xl'
                }`}
              >
                <div className="relative aspect-video w-full bg-black">
                  <iframe
                    key={`${movieId}-${activeServer.id}-${playerReloadNonce}`}
                    src={embedStreamUrl}
                    title={`${details.title} — ${activeServer.name}`}
                    className="h-full w-full border-0"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="origin"
                  />
                </div>
              </div>
            </section>

            {/* 3. Top Billed Cast */}
            {castMembers.length > 0 && (
              <section aria-label="Top billed cast" className="space-y-3">
                <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                  Top Billed Cast
                </h2>
                <div className="no-scrollbar flex gap-3.5 overflow-x-auto pb-2">
                  {castMembers.map((actor) => {
                    const photoUrl = getProfileUrl(actor.profile_path, 'w185');
                    const showPhoto = Boolean(photoUrl && !brokenProfiles[actor.id]);
                    return (
                      <div
                        key={actor.id}
                        className="w-[126px] shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#071022]/90 [content-visibility:auto]"
                      >
                        <div className="aspect-[3/4] w-full bg-[#0b1730]">
                          {showPhoto ? (
                            <img
                              src={photoUrl!}
                              alt={actor.name}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setBrokenProfiles((prev) => ({ ...prev, [actor.id]: true }))
                              }
                              className="h-full w-full object-cover object-top"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-500">
                              <User className="h-8 w-8" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="truncate text-xs font-bold text-white">{actor.name}</p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {actor.character || 'Cast'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 4. Similar Movies Row */}
            {similarMovies.length > 0 && (
              <section aria-label="Similar movies" className="space-y-3">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                    More Like This
                  </h2>
                  <p className="text-xs text-slate-400">
                    Click any title to open its stream player and cast details
                  </p>
                </div>

                <div className="no-scrollbar flex gap-3.5 overflow-x-auto pb-2 sm:gap-4">
                  {similarMovies.map((sim) => {
                    const simPoster = getPosterUrl(sim.poster_path, 'w342');
                    const showSimPoster = Boolean(simPoster && !brokenSimilarPosters[sim.id]);
                    const simYear = getMovieYear(sim.release_date);
                    return (
                      <button
                        key={sim.id}
                        type="button"
                        onClick={() => onOpenMovie(sim.id)}
                        className="group w-[144px] shrink-0 text-left sm:w-[164px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-2xl"
                      >
                        <div className="aspect-[2/3] w-full overflow-hidden rounded-2xl border border-white/[0.09] bg-[#081226] transition-transform duration-200 ease-out will-change-transform group-hover:scale-[1.03] group-hover:border-sky-400/45">
                          {showSimPoster ? (
                            <img
                              src={simPoster!}
                              alt={sim.title}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setBrokenSimilarPosters((prev) => ({ ...prev, [sim.id]: true }))
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center">
                              <Film className="h-7 w-7 text-sky-400/60" aria-hidden="true" />
                              <p className="mt-2 line-clamp-3 text-xs font-semibold text-slate-200">
                                {sim.title}
                              </p>
                            </div>
                          )}
                        </div>
                        <p className="mt-2 truncate text-xs font-semibold text-white group-hover:text-sky-300">
                          {sim.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400 tabular-nums">
                          <span>{simYear}</span>
                          {sim.vote_average > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-0.5 font-semibold text-amber-300">
                                <Star
                                  className="h-3 w-3 fill-amber-400 text-amber-400"
                                  aria-hidden="true"
                                />
                                {sim.vote_average.toFixed(1)}
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        ) : null}

        {/* Official YouTube Trailer Lightbox Modal */}
        {showTrailerModal && trailer && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${details?.title || 'Movie'} official trailer`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
            onClick={() => setShowTrailerModal(false)}
          >
            <div
              className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/15 bg-[#050b19] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {details?.title} — Official Trailer
                  </p>
                  <p className="truncate text-xs text-slate-400">{trailer.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTrailerModal(false)}
                  aria-label="Close trailer"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/14 bg-white/[0.06] text-slate-200 hover:bg-white/[0.15] hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="aspect-video w-full bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${encodeURIComponent(trailer.key)}?autoplay=1&rel=0`}
                  title={trailer.name}
                  className="h-full w-full border-0"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

MovieDetailPage.displayName = 'MovieDetailPage';
