import { useCallback, useEffect, useRef, useState } from 'react';

export type AppRoute =
  | { page: 'home' }
  | { page: 'country'; code: string }
  | { page: 'football'; code?: string }
  | { page: 'crypto' }
  | { page: 'cables'; code?: string }
  | { page: 'satellites'; code?: string }
  | { page: 'alarms' }
  | { page: 'tools'; tab?: 'settings' | 'jetlag' | 'compare' }
  | { page: 'dashboard' }
  | { page: 'live-tv'; code?: string }
  | { page: 'live-radio'; code?: string };

export function parseHashRoute(rawHash: string): AppRoute {
  const cleaned = rawHash.replace(/^#/, '').trim();
  const [pathPart, queryPart] = cleaned.split('?');
  const normalized = (pathPart || '/').replace(/^\/+|\/+$/g, '');
  const segments = normalized ? normalized.split('/').map((s) => decodeURIComponent(s.toLowerCase())) : [];

  if (segments.length === 0) {
    return { page: 'home' };
  }

  const head = segments[0];
  const param = segments[1];

  switch (head) {
    case 'country':
      return param ? { page: 'country', code: param } : { page: 'home' };
    case 'football':
      return { page: 'football', code: param || undefined };
    case 'crypto':
      return { page: 'crypto' };
    case 'cables':
      return { page: 'cables', code: param || undefined };
    case 'satellites':
      return { page: 'satellites', code: param || undefined };
    case 'alarms':
      return { page: 'alarms' };
    case 'tools': {
      let tab: 'settings' | 'jetlag' | 'compare' | undefined;
      if (queryPart) {
        const params = new URLSearchParams(queryPart);
        const t = params.get('tab');
        if (t === 'settings' || t === 'jetlag' || t === 'compare') {
          tab = t;
        }
      } else if (param === 'settings' || param === 'jetlag' || param === 'compare') {
        tab = param;
      }
      return { page: 'tools', tab };
    }
    case 'dashboard':
      return { page: 'dashboard' };
    case 'live-tv':
      return { page: 'live-tv', code: param || undefined };
    case 'live-radio':
      return { page: 'live-radio', code: param || undefined };
    default:
      return { page: 'home' };
  }
}

export function routeToHash(route: AppRoute): string {
  switch (route.page) {
    case 'home':
      return '#/';
    case 'country':
      return `#/country/${encodeURIComponent(route.code.toLowerCase())}`;
    case 'football':
      return route.code
        ? `#/football/${encodeURIComponent(route.code.toLowerCase())}`
        : '#/football';
    case 'crypto':
      return '#/crypto';
    case 'cables':
      return route.code
        ? `#/cables/${encodeURIComponent(route.code.toLowerCase())}`
        : '#/cables';
    case 'satellites':
      return route.code
        ? `#/satellites/${encodeURIComponent(route.code.toLowerCase())}`
        : '#/satellites';
    case 'alarms':
      return '#/alarms';
    case 'tools':
      return route.tab ? `#/tools?tab=${route.tab}` : '#/tools';
    case 'dashboard':
      return '#/dashboard';
    case 'live-tv':
      return route.code
        ? `#/live-tv/${encodeURIComponent(route.code.toLowerCase())}`
        : '#/live-tv';
    case 'live-radio':
      return route.code
        ? `#/live-radio/${encodeURIComponent(route.code.toLowerCase())}`
        : '#/live-radio';
  }
}

/**
 * Lightweight, zero-dependency Hash Router hook synced with browser & mobile Back/Forward buttons.
 */
export function useHashRoute() {
  const [route, setRoute] = useState<AppRoute>(() => {
    if (typeof window === 'undefined') return { page: 'home' };
    return parseHashRoute(window.location.hash);
  });

  // Track internal navigation depth so on-screen "← Back" safely pops browser history
  // or falls back to Home (#/) if the user arrived via a direct deep link.
  const historyDepthRef = useRef<number>(0);

  useEffect(() => {
    const syncFromHash = () => {
      const next = parseHashRoute(window.location.hash);
      setRoute(next);
      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const navigate = useCallback((nextRoute: AppRoute, options?: { replace?: boolean }) => {
    const targetHash = routeToHash(nextRoute);
    const currentHash = window.location.hash || '#/';

    if (currentHash === targetHash) {
      setRoute(nextRoute);
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    if (options?.replace) {
      window.history.replaceState(null, '', targetHash);
      setRoute(nextRoute);
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      historyDepthRef.current += 1;
      window.location.hash = targetHash;
    }
  }, []);

  const goBack = useCallback(() => {
    if (historyDepthRef.current > 0) {
      historyDepthRef.current = Math.max(0, historyDepthRef.current - 1);
      window.history.back();
    } else {
      navigate({ page: 'home' });
    }
  }, [navigate]);

  return { route, navigate, goBack };
}
