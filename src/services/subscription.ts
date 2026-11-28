import type { ActivationMethod, FirestoreUserProfile, PaymentMethodType } from '../lib/firebase';

export const FREE_LIMITS = {
  COUNTRIES: 100,
  LIVE_TV: 4,
  LIVE_RADIO: 4,
  ENTERTAINMENT: 4,
  MOVIES: 4,
  CATEGORY_ITEMS: 4,
} as const;

/**
 * Returns true if a country Live TV channel is a News broadcast
 * (tagged as category "News" or containing "News" in channel name / metadata).
 */
export function isCountryLiveTvNewsChannel(channel: {
  channelName: string;
  category?: string;
  groupTitle?: string;
  network?: string;
}): boolean {
  const haystack = `${channel.category || ''} ${channel.groupTitle || ''} ${channel.channelName || ''} ${channel.network || ''}`.toLowerCase();
  return (
    haystack.includes('news') ||
    /\b(noticias|actualit[eé]s?|nachrichten|notizie|24\s*horas|24h\s*info)\b/i.test(haystack)
  );
}

export const PRO_BASE_PRICE_LKR = 500;
export const PRO_DURATION_DAYS = 30;
export const PRO_DURATION_MS = PRO_DURATION_DAYS * 24 * 60 * 60 * 1000;
export const PRO_REDEEM_CODE = 'Vidusha5621';
export const ADMIN_PIN_CODE = '5621';

export interface LocalGuestSubscription {
  plan: 'free' | 'pro';
  proActivatedAt: number | null;
  proExpiresAt: number | null;
  activationMethod: ActivationMethod;
  paymentMethod?: PaymentMethodType;
  lastOrderId?: string | null;
}

const GUEST_SUB_KEY = 'neon_world_clock_guest_sub_v1';

export function readGuestSubscription(): LocalGuestSubscription {
  try {
    const raw = localStorage.getItem(GUEST_SUB_KEY);
    if (!raw) {
      return {
        plan: 'free',
        proActivatedAt: null,
        proExpiresAt: null,
        activationMethod: 'none',
        paymentMethod: 'none',
        lastOrderId: null,
      };
    }
    const parsed = JSON.parse(raw) as Partial<LocalGuestSubscription>;
    const proExpiresAt = typeof parsed.proExpiresAt === 'number' ? parsed.proExpiresAt : null;
    if (parsed.plan === 'pro' && proExpiresAt && Date.now() <= proExpiresAt) {
      return {
        plan: 'pro',
        proActivatedAt: typeof parsed.proActivatedAt === 'number' ? parsed.proActivatedAt : Date.now(),
        proExpiresAt,
        activationMethod:
          parsed.activationMethod === 'payment' || parsed.activationMethod === 'redeem'
            ? parsed.activationMethod
            : 'payment',
        paymentMethod:
          parsed.paymentMethod === 'payhere_sandbox' ||
          parsed.paymentMethod === 'payhere_live' ||
          parsed.paymentMethod === 'redeem' ||
          parsed.paymentMethod === 'admin'
            ? parsed.paymentMethod
            : 'none',
        lastOrderId: typeof parsed.lastOrderId === 'string' ? parsed.lastOrderId : null,
      };
    }
    // Expired guest Pro — clean up
    localStorage.removeItem(GUEST_SUB_KEY);
  } catch {
    // ignore storage errors
  }
  return {
    plan: 'free',
    proActivatedAt: null,
    proExpiresAt: null,
    activationMethod: 'none',
    paymentMethod: 'none',
    lastOrderId: null,
  };
}

export function saveGuestProSubscription(
  method: 'payment' | 'redeem',
  durationMs: number = PRO_DURATION_MS,
  options?: {
    paymentMethod?: PaymentMethodType;
    lastOrderId?: string | null;
  }
): LocalGuestSubscription {
  const now = Date.now();
  const next: LocalGuestSubscription = {
    plan: 'pro',
    proActivatedAt: now,
    proExpiresAt: now + durationMs,
    activationMethod: method,
    paymentMethod: options?.paymentMethod || (method === 'redeem' ? 'redeem' : 'payhere_sandbox'),
    lastOrderId: options?.lastOrderId ?? null,
  };
  try {
    localStorage.setItem(GUEST_SUB_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  return next;
}

export function isProExpired(profile: Pick<FirestoreUserProfile, 'plan' | 'proExpiresAt'> | null | undefined): boolean {
  if (!profile || profile.plan !== 'pro') return false;
  if (typeof profile.proExpiresAt !== 'number') return false;
  return Date.now() > profile.proExpiresAt;
}

export function isProActive(
  profile: Pick<FirestoreUserProfile, 'plan' | 'proExpiresAt' | 'isBanned'> | null | undefined
): boolean {
  if (!profile) return false;
  if (profile.isBanned) return false;
  if (profile.plan !== 'pro') return false;
  if (typeof profile.proExpiresAt === 'number' && Date.now() > profile.proExpiresAt) {
    return false;
  }
  return true;
}

export function getDaysRemaining(proExpiresAt: number | null | undefined): number {
  if (typeof proExpiresAt !== 'number') return 0;
  const diff = proExpiresAt - Date.now();
  if (diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function formatShortDate(epochMs: number | null | undefined): string {
  if (typeof epochMs !== 'number') return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(new Date(epochMs));
  } catch {
    return new Date(epochMs).toISOString().slice(0, 10);
  }
}

export function formatReceiptDateTime(epochMs: number): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(epochMs));
  } catch {
    return new Date(epochMs).toUTCString();
  }
}
