import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  isFirebaseConfigured,
  OperationType,
  syncVerifiedUserProfile,
} from '../lib/firebase';
import type { TmdbMovie } from './tmdb';

const LOCAL_WATCHLIST_KEY = 'neon_world_clock_movie_watchlist_v1';

export interface WatchlistItem {
  movieId: number;
  title: string;
  posterPath: string;
  backdropPath: string;
  releaseDate: string;
  voteAverage: number;
  overview: string;
  addedAtMs: number;
}

interface FirestoreWatchlistDoc {
  uid: string;
  movieId: number;
  title: string;
  posterPath: string;
  backdropPath: string;
  releaseDate: string;
  voteAverage: number;
  overview: string;
  addedAt?: Timestamp | null;
}

function loadLocalWatchlist(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is WatchlistItem =>
          Boolean(item) && typeof item.movieId === 'number' && typeof item.title === 'string'
      )
      .sort((a, b) => (b.addedAtMs || 0) - (a.addedAtMs || 0));
  } catch {
    return [];
  }
}

function saveLocalWatchlist(items: WatchlistItem[]): void {
  try {
    localStorage.setItem(LOCAL_WATCHLIST_KEY, JSON.stringify(items.slice(0, 200)));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Clamp and sanitize movie payload strictly to firebase-blueprint.json WatchlistMovie constraints.
 */
function buildBlueprintWatchlistPayload(uid: string, movie: TmdbMovie) {
  const safeId = Math.max(1, Math.min(999999999, Math.trunc(movie.id)));
  const safeTitle = (movie.title || 'Untitled Movie').trim().slice(0, 200) || 'Untitled Movie';
  const safePoster = (movie.poster_path || '').trim().slice(0, 300);
  const safeBackdrop = (movie.backdrop_path || '').trim().slice(0, 300);
  const safeRelease = (movie.release_date || '').trim().slice(0, 20);
  const rawVote = typeof movie.vote_average === 'number' && Number.isFinite(movie.vote_average)
    ? movie.vote_average
    : 0;
  const safeVote = Math.round(Math.max(0, Math.min(10, rawVote)) * 10) / 10;
  const safeOverview = (movie.overview || '').trim().slice(0, 1200);

  return {
    uid: uid.trim().slice(0, 128),
    movieId: safeId,
    title: safeTitle,
    posterPath: safePoster,
    backdropPath: safeBackdrop,
    releaseDate: safeRelease,
    voteAverage: safeVote,
    overview: safeOverview,
    addedAt: serverTimestamp(),
  };
}

export function watchlistItemToTmdbMovie(item: WatchlistItem): TmdbMovie {
  return {
    id: item.movieId,
    title: item.title,
    overview: item.overview,
    poster_path: item.posterPath || null,
    backdrop_path: item.backdropPath || null,
    release_date: item.releaseDate,
    vote_average: item.voteAverage,
    vote_count: 0,
    popularity: 0,
  };
}

export interface UseMovieWatchlistResult {
  watchlist: WatchlistItem[];
  watchlistIds: Set<number>;
  isCloudSynced: boolean;
  isSyncing: boolean;
  toggleWatchlist: (movie: TmdbMovie) => Promise<'added' | 'removed'>;
  removeFromWatchlist: (movieId: number) => Promise<void>;
}

/**
 * Real-time My List / Watchlist hook:
 * - When a verified Firebase user is signed in, syncs live with Firestore at /users/{uid}/watchlist/{movieId}.
 * - When signed out, persists seamlessly in localStorage with zero lag.
 */
export function useMovieWatchlist(firebaseUser: User | null): UseMovieWatchlistResult {
  const isCloudEligible = Boolean(
    isFirebaseConfigured && db && firebaseUser && firebaseUser.uid && firebaseUser.emailVerified
  );

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => loadLocalWatchlist());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Subscribe to Firestore /users/{uid}/watchlist when verified user is signed in
  useEffect(() => {
    if (!isCloudEligible || !db || !firebaseUser) {
      setWatchlist(loadLocalWatchlist());
      setIsSyncing(false);
      return;
    }

    const uid = firebaseUser.uid;
    const collectionPath = `users/${uid}/watchlist`;
    setIsSyncing(true);

    const q = query(collection(db, 'users', uid, 'watchlist'), where('uid', '==', uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: WatchlistItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as FirestoreWatchlistDoc;
          if (typeof data.movieId === 'number' && typeof data.title === 'string') {
            items.push({
              movieId: data.movieId,
              title: data.title,
              posterPath: data.posterPath || '',
              backdropPath: data.backdropPath || '',
              releaseDate: data.releaseDate || '',
              voteAverage: typeof data.voteAverage === 'number' ? data.voteAverage : 0,
              overview: data.overview || '',
              addedAtMs: data.addedAt?.toMillis ? data.addedAt.toMillis() : Date.now(),
            });
          }
        });
        items.sort((a, b) => b.addedAtMs - a.addedAtMs);
        setWatchlist(items);
        saveLocalWatchlist(items);
        setIsSyncing(false);
      },
      (error) => {
        setIsSyncing(false);
        try {
          handleFirestoreError(error, OperationType.LIST, collectionPath);
        } catch {
          // Keep local fallback intact without crashing the UI
        }
      }
    );

    return () => unsubscribe();
  }, [isCloudEligible, firebaseUser]);

  const watchlistIds = useMemo(
    () => new Set<number>(watchlist.map((item) => item.movieId)),
    [watchlist]
  );

  const removeFromWatchlist = useCallback(
    async (movieId: number) => {
      // Optimistic local update for instant UI feedback
      setWatchlist((prev) => {
        const next = prev.filter((item) => item.movieId !== movieId);
        saveLocalWatchlist(next);
        return next;
      });

      if (!isCloudEligible || !db || !firebaseUser) return;

      const path = `users/${firebaseUser.uid}/watchlist/${movieId}`;
      try {
        await deleteDoc(doc(db, 'users', firebaseUser.uid, 'watchlist', String(movieId)));
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.DELETE, path);
        } catch {
          // Logged via structured Firestore error handler
        }
      }
    },
    [isCloudEligible, firebaseUser]
  );

  const toggleWatchlist = useCallback(
    async (movie: TmdbMovie): Promise<'added' | 'removed'> => {
      const exists = watchlistIds.has(movie.id);
      if (exists) {
        await removeFromWatchlist(movie.id);
        return 'removed';
      }

      const nextItem: WatchlistItem = {
        movieId: Math.trunc(movie.id),
        title: (movie.title || 'Untitled Movie').trim().slice(0, 200),
        posterPath: (movie.poster_path || '').trim().slice(0, 300),
        backdropPath: (movie.backdrop_path || '').trim().slice(0, 300),
        releaseDate: (movie.release_date || '').trim().slice(0, 20),
        voteAverage:
          typeof movie.vote_average === 'number' && Number.isFinite(movie.vote_average)
            ? Math.round(Math.max(0, Math.min(10, movie.vote_average)) * 10) / 10
            : 0,
        overview: (movie.overview || '').trim().slice(0, 1200),
        addedAtMs: Date.now(),
      };

      // Optimistic update so button flips in <16ms
      setWatchlist((prev) => {
        const next = [nextItem, ...prev.filter((i) => i.movieId !== nextItem.movieId)];
        saveLocalWatchlist(next);
        return next;
      });

      if (isCloudEligible && db && firebaseUser) {
        const uid = firebaseUser.uid;
        const path = `users/${uid}/watchlist/${nextItem.movieId}`;
        try {
          // Ensure parent /users/{uid} exists so Firestore Master Gate passes reliably
          await syncVerifiedUserProfile(firebaseUser).catch(() => null);
          const payload = buildBlueprintWatchlistPayload(uid, movie);
          await setDoc(doc(db, 'users', uid, 'watchlist', String(nextItem.movieId)), payload);
        } catch (error) {
          try {
            handleFirestoreError(error, OperationType.CREATE, path);
          } catch {
            // Logged via structured Firestore error handler; local state remains intact
          }
        }
      }

      return 'added';
    },
    [watchlistIds, removeFromWatchlist, isCloudEligible, firebaseUser]
  );

  return {
    watchlist,
    watchlistIds,
    isCloudSynced: isCloudEligible,
    isSyncing,
    toggleWatchlist,
    removeFromWatchlist,
  };
}
