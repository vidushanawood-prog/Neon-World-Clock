import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  Cloud,
  Film,
  Lock,
  Play,
  Plus,
  RefreshCw,
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
  pickOfficialTrailer,
  searchMovies,
  type TmdbMovie,
  type TmdbMovieDetails,
} from '../services/tmdb';
import {
  findVerifiedOpenMovieByArchiveId,
  findVerifiedOpenMovieByTmdbId,
  hashArchiveIdentifierToMovieId,
  lookupArchiveStreamForTmdbMovie,
  openMovieToTmdbShape,
  resolveArchiveMoviePlayback,
  VERIFIED_OPEN_MOVIES,
  type ResolvedArchivePlayback,
} from '../services/archiveMovies';
import { NativeMoviePlayer } from '../components/NativeMoviePlayer';
import { FREE_LIMITS } from '../services/subscription';
import type { MovieNavigationTarget } from './MoviesPage';

interface MovieDetailPageProps {
  movieId?: number;
  archiveId?: string;
  watchlistIds: Set<number>;
  isCloudSynced: boolean;
  isProUser?: boolean;
  onRequireUpgrade?: (reason: string) => void;
  onToggleWatchlist: (movie: TmdbMovie) => Promise<'added' | 'removed'>;
  onBackToMovies: () => void;
  onOpenMovie: (target: MovieNavigationTarget) => void;
}

export const MovieDetailPage: React.FC<MovieDetailPageProps> = React.memo(
  ({
    movieId,
    archiveId,
    watchlistIds,
    isCloudSynced,
    isProUser = false,
    onRequireUpgrade,
    onToggleWatchlist,
    onBackToMovies,
    onOpenMovie,
  }) => {
    const [tmdbDetails, setTmdbDetails] = useState<TmdbMovieDetails | null>(null);
    const [archivePlayback, setArchivePlayback] = useState<ResolvedArchivePlayback | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSearchingArchive, setIsSearchingArchive] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [showTrailerModal, setShowTrailerModal] = useState<boolean>(false);
    const [posterFailed, setPosterFailed] = useState<boolean>(false);
    const [backdropFailed, setBackdropFailed] = useState<boolean>(false);
    const [brokenProfiles, setBrokenProfiles] = useState<Record<number, boolean>>({});
    const [brokenSimilarPosters, setBrokenSimilarPosters] = useState<Record<number, boolean>>({});

    const playerSectionRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
      const controller = new AbortController();
      setIsLoading(true);
      setIsSearchingArchive(false);
      setError(null);
      setTmdbDetails(null);
      setArchivePlayback(null);
      setShowTrailerModal(false);
      setPosterFailed(false);
      setBackdropFailed(false);
      setBrokenProfiles({});
      setBrokenSimilarPosters({});

      const loadAll = async () => {
        try {
          const builtinByArchive = archiveId
            ? findVerifiedOpenMovieByArchiveId(archiveId)
            : null;
          const builtinByTmdb = movieId ? findVerifiedOpenMovieByTmdbId(movieId) : null;
          const matchedBuiltin = builtinByArchive || builtinByTmdb;

          const effectiveArchiveId = archiveId || matchedBuiltin?.archiveId;
          const effectiveTmdbId = movieId || matchedBuiltin?.tmdbId;

          // 1. Resolve Archive.org / built-in direct MP4/HLS streams in parallel with TMDB metadata
          const archivePromise = effectiveArchiveId
            ? resolveArchiveMoviePlayback(effectiveArchiveId, controller.signal)
            : Promise.resolve(null);
          const tmdbPromise = effectiveTmdbId
            ? fetchMovieDetails(effectiveTmdbId, controller.signal).catch(() => null)
            : Promise.resolve(null);

          const [resolvedArchive, resolvedTmdb] = await Promise.all([archivePromise, tmdbPromise]);
          if (controller.signal.aborted) return;

          if (resolvedArchive) setArchivePlayback(resolvedArchive);
          if (resolvedTmdb) setTmdbDetails(resolvedTmdb);

          if (!resolvedArchive && !resolvedTmdb) {
            setError('Could not load movie metadata or stream details.');
            return;
          }

          setIsLoading(false);

          // 2A. If opened as a dynamic Internet Archive film without TMDB ID, enrich metadata from TMDB in the background
          if (resolvedArchive && !resolvedTmdb && resolvedArchive.title) {
            searchMovies(resolvedArchive.title, 1, controller.signal)
              .then(async (searchRes) => {
                if (controller.signal.aborted || searchRes.results.length === 0) return;
                const best =
                  searchRes.results.find(
                    (m) =>
                      resolvedArchive.year &&
                      getMovieYear(m.release_date) === resolvedArchive.year
                  ) || searchRes.results[0];
                if (!best) return;
                const full = await fetchMovieDetails(best.id, controller.signal);
                if (!controller.signal.aborted) setTmdbDetails(full);
              })
              .catch(() => {
                // Keep Archive.org metadata intact
              });
          }

          // 2B. If opened as a TMDB film without a known Archive ID, check Internet Archive for a matching public-domain full stream
          if (resolvedTmdb && !resolvedArchive) {
            setIsSearchingArchive(true);
            lookupArchiveStreamForTmdbMovie(
              resolvedTmdb.id,
              resolvedTmdb.title,
              getMovieYear(resolvedTmdb.release_date),
              controller.signal
            )
              .then((found) => {
                if (!controller.signal.aborted && found) {
                  setArchivePlayback(found);
                }
              })
              .finally(() => {
                if (!controller.signal.aborted) setIsSearchingArchive(false);
              });
          }
        } catch (err) {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : 'Unable to load movie details.');
        } finally {
          if (!controller.signal.aborted) setIsLoading(false);
        }
      };

      void loadAll();
      return () => controller.abort();
    }, [movieId, archiveId]);

    // Close trailer modal on Escape key
    useEffect(() => {
      if (!showTrailerModal) return;
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setShowTrailerModal(false);
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [showTrailerModal]);

    const trailer = useMemo(
      () => pickOfficialTrailer(tmdbDetails?.videos?.results),
      [tmdbDetails?.videos?.results]
    );

    const castMembers = useMemo(
      () => (tmdbDetails?.credits?.cast || []).slice(0, 14),
      [tmdbDetails?.credits?.cast]
    );

    const similarMovies = useMemo(
      () => (tmdbDetails?.similar?.results || []).slice(0, 14),
      [tmdbDetails?.similar?.results]
    );

    const freeSpotlightMovies = useMemo(
      () =>
        VERIFIED_OPEN_MOVIES.filter((m) => m.archiveId !== archivePlayback?.archiveId)
          .slice(0, 10)
          .map(openMovieToTmdbShape),
      [archivePlayback?.archiveId]
    );

    // Unified movie object for My List / Watchlist sync (always has valid numeric ID 1..999_999_999)
    const effectiveNumericId = useMemo(() => {
      if (tmdbDetails?.id) return tmdbDetails.id;
      if (movieId) return movieId;
      if (archivePlayback?.archiveId) {
        const builtin = findVerifiedOpenMovieByArchiveId(archivePlayback.archiveId);
        return builtin?.id || hashArchiveIdentifierToMovieId(archivePlayback.archiveId);
      }
      if (archiveId) return hashArchiveIdentifierToMovieId(archiveId);
      return 0;
    }, [tmdbDetails?.id, movieId, archivePlayback?.archiveId, archiveId]);

    const displayTitle = tmdbDetails?.title || archivePlayback?.title || 'Movie';
    const displayTagline = tmdbDetails?.tagline || '';
    const displayYear =
      (tmdbDetails?.release_date && getMovieYear(tmdbDetails.release_date)) ||
      archivePlayback?.year ||
      'TBA';
    const displayRuntime = formatRuntime(tmdbDetails?.runtime);
    const displayRating =
      tmdbDetails && tmdbDetails.vote_average > 0 ? tmdbDetails.vote_average.toFixed(1) : null;
    const displayOverview = tmdbDetails?.overview || archivePlayback?.overview || '';
    const displayGenres = tmdbDetails?.genres?.map((g) => g.name) || [];

    const backdropUrl =
      getBackdropUrl(tmdbDetails?.backdrop_path, 'w1280') || archivePlayback?.posterUrl || null;
    const posterUrl =
      getPosterUrl(tmdbDetails?.poster_path, 'w500') || archivePlayback?.posterUrl || null;

    const inWatchlist = effectiveNumericId > 0 && watchlistIds.has(effectiveNumericId);

    const handleScrollToPlayer = useCallback(() => {
      playerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const handleToggleList = useCallback(() => {
      if (!effectiveNumericId) return;
      const moviePayload: TmdbMovie = {
        id: effectiveNumericId,
        title: displayTitle,
        overview: displayOverview,
        poster_path: tmdbDetails?.poster_path || archivePlayback?.posterUrl || null,
        backdrop_path: tmdbDetails?.backdrop_path || archivePlayback?.posterUrl || null,
        release_date:
          tmdbDetails?.release_date || (archivePlayback?.year ? `${archivePlayback.year}-01-01` : ''),
        vote_average: tmdbDetails?.vote_average || 7.0,
        vote_count: tmdbDetails?.vote_count || 0,
        popularity: tmdbDetails?.popularity || 0,
        archiveId: archivePlayback?.archiveId,
        isFreeFullMovie: Boolean(archivePlayback),
      };
      void onToggleWatchlist(moviePayload);
    }, [
      effectiveNumericId,
      displayTitle,
      displayOverview,
      tmdbDetails,
      archivePlayback,
      onToggleWatchlist,
    ]);

    const hasDirectFullStream = Boolean(archivePlayback && archivePlayback.sources.length > 0);

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
        {isLoading && !tmdbDetails && !archivePlayback ? (
          <div className="space-y-6">
            <div className="h-[340px] w-full animate-pulse rounded-3xl bg-white/[0.05]" />
            <div className="aspect-video w-full animate-pulse rounded-3xl bg-white/[0.05]" />
          </div>
        ) : error && !tmdbDetails && !archivePlayback ? (
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
        ) : (
          <>
            {/* 1. Netflix-Style Movie Details Hero Header */}
            <section
              aria-label="Movie metadata"
              className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-[#060d1f] shadow-[0_24px_64px_-24px_rgba(14,165,233,0.3)]"
            >
              {backdropUrl && !backdropFailed ? (
                <img
                  src={backdropUrl}
                  alt={displayTitle}
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
                        alt={displayTitle}
                        referrerPolicy="no-referrer"
                        onError={() => setPosterFailed(true)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                        <Film className="h-10 w-10 text-sky-400/60" aria-hidden="true" />
                        <p className="mt-2 text-xs font-semibold text-slate-300">{displayTitle}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title, Tagline, Metadata, Overview & Primary Actions */}
                <div className="flex flex-col justify-center space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl [text-wrap:balance]">
                      {displayTitle}
                    </h1>
                    {displayTagline && (
                      <p className="mt-1.5 text-sm italic text-sky-200/85">{displayTagline}</p>
                    )}
                  </div>

                  {/* Clean Unboxed Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-300 sm:text-sm tabular-nums">
                    <span>{displayYear}</span>
                    {displayRuntime && (
                      <>
                        <span aria-hidden="true" className="text-slate-500">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                          {displayRuntime}
                        </span>
                      </>
                    )}
                    {displayRating && (
                      <>
                        <span aria-hidden="true" className="text-slate-500">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                          <Star
                            className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                            aria-hidden="true"
                          />
                          {displayRating} / 10
                        </span>
                      </>
                    )}
                    {displayGenres.length > 0 && (
                      <>
                        <span aria-hidden="true" className="text-slate-500">
                          ·
                        </span>
                        <span className="text-cyan-200">{displayGenres.join(' / ')}</span>
                      </>
                    )}
                    {archivePlayback?.licenseLabel && (
                      <>
                        <span aria-hidden="true" className="text-slate-500">
                          ·
                        </span>
                        <span className="font-semibold text-emerald-300">
                          {archivePlayback.licenseLabel}
                        </span>
                      </>
                    )}
                  </div>

                  {displayOverview && (
                    <p className="max-w-3xl text-sm leading-relaxed text-slate-200/90 sm:text-[15px]">
                      {displayOverview}
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
                      <span>
                        {hasDirectFullStream ? 'Watch Full Movie (Ad-Free)' : 'Watch Preview'}
                      </span>
                    </button>

                    {trailer && (
                      <button
                        type="button"
                        onClick={() => setShowTrailerModal(true)}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-5 text-sm font-semibold text-rose-100 transition-colors hover:border-rose-400/70 hover:bg-rose-500/25 whitespace-nowrap"
                      >
                        <Youtube className="h-4 w-4 text-rose-400" aria-hidden="true" />
                        <span>Watch Official Trailer</span>
                      </button>
                    )}

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

            {/* 2. Ad-Free Cinema Player Section (Native HTML5/HLS Full Movie OR Official HD Trailer) */}
            <section
              ref={playerSectionRef}
              aria-label="Ad-free movie player"
              className="scroll-mt-20 space-y-4"
            >
              {hasDirectFullStream && archivePlayback ? (
                <NativeMoviePlayer
                  title={displayTitle}
                  posterUrl={backdropUrl}
                  sources={archivePlayback.sources}
                  captions={archivePlayback.captions}
                  autoPlay={false}
                />
              ) : isSearchingArchive ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-sky-400/25 bg-[#071022]/90 px-6 py-16 text-center">
                  <RefreshCw className="h-7 w-7 animate-spin text-sky-400" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-white">
                    Checking Internet Archive for a direct ad-free full stream…
                  </p>
                </div>
              ) : trailer ? (
                <div className="space-y-3">
                  <div className="flex flex-col justify-between gap-2 rounded-2xl border border-white/[0.09] bg-[#071022]/90 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-white">
                        Official HD Trailer · {displayTitle}
                      </h2>
                      <p className="text-xs text-slate-400">
                        This theatrical release is not in the public domain — enjoy its ad-free
                        official trailer here, or watch full open-access movies below.
                      </p>
                    </div>
                  </div>

                  <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-sky-400/35 bg-black shadow-[0_24px_64px_-22px_rgba(14,165,233,0.4)]">
                    <div className="aspect-video w-full bg-black">
                      <iframe
                        src={`https://www.youtube.com/embed/${encodeURIComponent(trailer.key)}?rel=0`}
                        title={`${displayTitle} — Official Trailer`}
                        className="h-full w-full border-0"
                        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-white/[0.09] bg-[#071022]/90 p-8 text-center">
                  <Film className="mx-auto h-9 w-9 text-sky-400/70" aria-hidden="true" />
                  <h2 className="mt-3 text-base font-bold text-white">
                    No Free Public-Domain Full Stream Available
                  </h2>
                  <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-slate-400">
                    To keep Neon World Clock 100% free of pop-up ads and robot walls, full playback
                    uses direct MP4/HLS streams from Internet Archive and open-access cinema. Pick
                    any full-length ad-free movie below to watch immediately.
                  </p>
                </div>
              )}
            </section>

            {/* 3. Ad-Free Full Movies Quick Switcher (shown prominently when viewing a trailer-only TMDB title) */}
            {!hasDirectFullStream && freeSpotlightMovies.length > 0 && (
              <section aria-label="Ad-free full movies ready to watch now" className="space-y-3">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                    Watch Full-Length Ad-Free Movies Right Now
                  </h2>
                  <p className="text-xs text-slate-400">
                    Verified direct MP4 &amp; HLS open-access films playing natively with zero ads
                  </p>
                </div>

                <div className="no-scrollbar flex gap-3.5 overflow-x-auto pb-2 sm:gap-4">
                  {freeSpotlightMovies.map((fm, idx) => {
                    const fmPoster = getPosterUrl(fm.poster_path, 'w342');
                    const showPoster = Boolean(fmPoster && !brokenSimilarPosters[fm.id]);
                    const locked = !isProUser && idx >= FREE_LIMITS.CATEGORY_ITEMS;
                    return (
                      <button
                        key={fm.archiveId || fm.id}
                        type="button"
                        onClick={() => {
                          if (locked) {
                            onRequireUpgrade?.(
                              `Unlock "${fm.title}" and all full-length movies with Neon Pro (Free plan includes the first ${FREE_LIMITS.CATEGORY_ITEMS} movies per category).`
                            );
                            return;
                          }
                          onOpenMovie({ id: fm.id, archiveId: fm.archiveId });
                        }}
                        className="group w-[144px] shrink-0 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:w-[164px]"
                      >
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-emerald-400/25 bg-[#081226] transition-transform duration-200 ease-out will-change-transform group-hover:scale-[1.03] group-hover:border-emerald-400/60">
                          {locked && (
                            <span className="pointer-events-none absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-lg border border-fuchsia-400/50 bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-200 shadow-[0_0_12px_rgba(232,121,249,0.35)]">
                              <Lock className="h-2.5 w-2.5 text-cyan-300" aria-hidden="true" />
                              Pro
                            </span>
                          )}
                          {showPoster ? (
                            <img
                              src={fmPoster!}
                              alt={fm.title}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setBrokenSimilarPosters((prev) => ({ ...prev, [fm.id]: true }))
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center">
                              <Film className="h-7 w-7 text-emerald-400/70" aria-hidden="true" />
                              <p className="mt-2 line-clamp-3 text-xs font-semibold text-slate-200">
                                {fm.title}
                              </p>
                            </div>
                          )}
                        </div>
                        <p className="mt-2 truncate text-xs font-semibold text-white group-hover:text-emerald-300">
                          {fm.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400 tabular-nums">
                          <span>{getMovieYear(fm.release_date)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-emerald-300">Free HD</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 4. Top Billed Cast */}
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

            {/* 5. Similar Movies Row */}
            {similarMovies.length > 0 && (
              <section aria-label="Similar movies" className="space-y-3">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                    More Like This
                  </h2>
                  <p className="text-xs text-slate-400">
                    Click any title to explore details, cast, and playback
                  </p>
                </div>

                <div className="no-scrollbar flex gap-3.5 overflow-x-auto pb-2 sm:gap-4">
                  {similarMovies.map((sim, idx) => {
                    const simPoster = getPosterUrl(sim.poster_path, 'w342');
                    const showSimPoster = Boolean(simPoster && !brokenSimilarPosters[sim.id]);
                    const simYear = getMovieYear(sim.release_date);
                    const locked = !isProUser && idx >= FREE_LIMITS.CATEGORY_ITEMS;
                    return (
                      <button
                        key={sim.id}
                        type="button"
                        onClick={() => {
                          if (locked) {
                            onRequireUpgrade?.(
                              `Unlock "${sim.title}" and all related titles with Neon Pro (Free plan includes the first ${FREE_LIMITS.CATEGORY_ITEMS} movies per category).`
                            );
                            return;
                          }
                          onOpenMovie({ id: sim.id });
                        }}
                        className="group w-[144px] shrink-0 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:w-[164px]"
                      >
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-white/[0.09] bg-[#081226] transition-transform duration-200 ease-out will-change-transform group-hover:scale-[1.03] group-hover:border-sky-400/45">
                          {locked && (
                            <span className="pointer-events-none absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-lg border border-fuchsia-400/50 bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-200 shadow-[0_0_12px_rgba(232,121,249,0.35)]">
                              <Lock className="h-2.5 w-2.5 text-cyan-300" aria-hidden="true" />
                              Pro
                            </span>
                          )}
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
        )}

        {/* Official YouTube Trailer Lightbox Modal */}
        {showTrailerModal && trailer && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${displayTitle} official trailer`}
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
                    {displayTitle} — Official Trailer
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
