import { PRO_BASE_PRICE_LKR } from './subscription';

export interface LocalizedProPrice {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencySymbol: string;
  localAmount: number;
  formattedLocalPrice: string;
  basePriceLabel: string;
  isSriLanka: boolean;
  detectionSource: 'ip' | 'timezone';
}

interface CurrencyMeta {
  symbol: string;
  decimals: number;
  usdPerUnit: number; // fallback USD -> currency rate (units of currency per 1 USD)
}

const CURRENCY_FALLBACK_PER_USD: Record<string, CurrencyMeta> = {
  LKR: { symbol: 'LKR ', decimals: 0, usdPerUnit: 298.5 },
  USD: { symbol: '$', decimals: 2, usdPerUnit: 1 },
  EUR: { symbol: '€', decimals: 2, usdPerUnit: 0.92 },
  GBP: { symbol: '£', decimals: 2, usdPerUnit: 0.79 },
  INR: { symbol: '₹', decimals: 0, usdPerUnit: 84.2 },
  AUD: { symbol: 'A$', decimals: 2, usdPerUnit: 1.54 },
  CAD: { symbol: 'C$', decimals: 2, usdPerUnit: 1.39 },
  JPY: { symbol: '¥', decimals: 0, usdPerUnit: 152 },
  SGD: { symbol: 'S$', decimals: 2, usdPerUnit: 1.34 },
  AED: { symbol: 'AED ', decimals: 2, usdPerUnit: 3.67 },
  SAR: { symbol: 'SAR ', decimals: 2, usdPerUnit: 3.75 },
  MYR: { symbol: 'RM', decimals: 2, usdPerUnit: 4.42 },
  PKR: { symbol: 'Rs ', decimals: 0, usdPerUnit: 278 },
  BDT: { symbol: '৳', decimals: 0, usdPerUnit: 119.5 },
  NPR: { symbol: 'Rs ', decimals: 0, usdPerUnit: 134.8 },
  PHP: { symbol: '₱', decimals: 0, usdPerUnit: 58.2 },
  IDR: { symbol: 'Rp ', decimals: 0, usdPerUnit: 15800 },
  THB: { symbol: '฿', decimals: 0, usdPerUnit: 34.5 },
  KRW: { symbol: '₩', decimals: 0, usdPerUnit: 1385 },
  CNY: { symbol: '¥', decimals: 2, usdPerUnit: 7.24 },
  BRL: { symbol: 'R$', decimals: 2, usdPerUnit: 5.75 },
  MXN: { symbol: 'MX$', decimals: 2, usdPerUnit: 20.1 },
  ZAR: { symbol: 'R', decimals: 2, usdPerUnit: 18.1 },
  NGN: { symbol: '₦', decimals: 0, usdPerUnit: 1640 },
  TRY: { symbol: '₺', decimals: 2, usdPerUnit: 34.4 },
  CHF: { symbol: 'CHF ', decimals: 2, usdPerUnit: 0.88 },
  NZD: { symbol: 'NZ$', decimals: 2, usdPerUnit: 1.68 },
};

const TIMEZONE_TO_GEO: Record<string, { countryCode: string; countryName: string; currencyCode: string }> = {
  'Asia/Colombo': { countryCode: 'LK', countryName: 'Sri Lanka', currencyCode: 'LKR' },
  'Asia/Kolkata': { countryCode: 'IN', countryName: 'India', currencyCode: 'INR' },
  'Asia/Calcutta': { countryCode: 'IN', countryName: 'India', currencyCode: 'INR' },
  'Europe/London': { countryCode: 'GB', countryName: 'United Kingdom', currencyCode: 'GBP' },
  'Asia/Tokyo': { countryCode: 'JP', countryName: 'Japan', currencyCode: 'JPY' },
  'Asia/Singapore': { countryCode: 'SG', countryName: 'Singapore', currencyCode: 'SGD' },
  'Asia/Dubai': { countryCode: 'AE', countryName: 'United Arab Emirates', currencyCode: 'AED' },
  'Australia/Sydney': { countryCode: 'AU', countryName: 'Australia', currencyCode: 'AUD' },
  'Australia/Melbourne': { countryCode: 'AU', countryName: 'Australia', currencyCode: 'AUD' },
  'America/Toronto': { countryCode: 'CA', countryName: 'Canada', currencyCode: 'CAD' },
  'America/Vancouver': { countryCode: 'CA', countryName: 'Canada', currencyCode: 'CAD' },
  'Asia/Kuala_Lumpur': { countryCode: 'MY', countryName: 'Malaysia', currencyCode: 'MYR' },
  'Asia/Karachi': { countryCode: 'PK', countryName: 'Pakistan', currencyCode: 'PKR' },
  'Asia/Dhaka': { countryCode: 'BD', countryName: 'Bangladesh', currencyCode: 'BDT' },
  'Asia/Kathmandu': { countryCode: 'NP', countryName: 'Nepal', currencyCode: 'NPR' },
  'Asia/Manila': { countryCode: 'PH', countryName: 'Philippines', currencyCode: 'PHP' },
  'Asia/Seoul': { countryCode: 'KR', countryName: 'South Korea', currencyCode: 'KRW' },
  'Europe/Berlin': { countryCode: 'DE', countryName: 'Germany', currencyCode: 'EUR' },
  'Europe/Paris': { countryCode: 'FR', countryName: 'France', currencyCode: 'EUR' },
  'Europe/Rome': { countryCode: 'IT', countryName: 'Italy', currencyCode: 'EUR' },
  'Europe/Madrid': { countryCode: 'ES', countryName: 'Spain', currencyCode: 'EUR' },
  'Europe/Amsterdam': { countryCode: 'NL', countryName: 'Netherlands', currencyCode: 'EUR' },
};

let cachedGeo: {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  source: 'ip' | 'timezone';
} | null = null;

function inferGeoFromBrowser(): { countryCode: string; countryName: string; currencyCode: string } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (TIMEZONE_TO_GEO[tz]) {
      return TIMEZONE_TO_GEO[tz];
    }
    if (tz.startsWith('Europe/')) {
      return { countryCode: 'EU', countryName: 'Europe', currencyCode: 'EUR' };
    }
    if (tz.startsWith('America/')) {
      return { countryCode: 'US', countryName: 'United States', currencyCode: 'USD' };
    }
  } catch {
    // ignore Intl error
  }
  return { countryCode: 'US', countryName: 'United States', currencyCode: 'USD' };
}

export function buildLocalizedPrice(
  geo: { countryCode: string; countryName: string; currencyCode: string; source: 'ip' | 'timezone' },
  liveUsdRates?: Record<string, number>
): LocalizedProPrice {
  const code = (geo.currencyCode || 'USD').toUpperCase();
  const isSriLanka = geo.countryCode.toUpperCase() === 'LK' || code === 'LKR';

  if (isSriLanka) {
    return {
      countryCode: 'LK',
      countryName: 'Sri Lanka',
      currencyCode: 'LKR',
      currencySymbol: 'LKR ',
      localAmount: PRO_BASE_PRICE_LKR,
      formattedLocalPrice: `LKR ${PRO_BASE_PRICE_LKR} / month`,
      basePriceLabel: 'LKR 500 / 30 Days',
      isSriLanka: true,
      detectionSource: geo.source,
    };
  }

  const lkrPerUsd =
    liveUsdRates && typeof liveUsdRates.LKR === 'number' && liveUsdRates.LKR > 0
      ? liveUsdRates.LKR
      : CURRENCY_FALLBACK_PER_USD.LKR.usdPerUnit;

  const targetMeta = CURRENCY_FALLBACK_PER_USD[code];
  const targetPerUsd =
    liveUsdRates && typeof liveUsdRates[code] === 'number' && liveUsdRates[code] > 0
      ? liveUsdRates[code]
      : targetMeta?.usdPerUnit;

  const effectiveCode = targetPerUsd ? code : 'USD';
  const effectiveMeta = CURRENCY_FALLBACK_PER_USD[effectiveCode] || CURRENCY_FALLBACK_PER_USD.USD;
  const effectivePerUsd = targetPerUsd || 1;

  // Convert LKR 500 -> USD -> local currency
  const usdEquivalent = PRO_BASE_PRICE_LKR / lkrPerUsd;
  const rawLocal = usdEquivalent * effectivePerUsd;
  const rounded =
    effectiveMeta.decimals === 0
      ? Math.max(1, Math.round(rawLocal))
      : Math.max(0.01, Math.round(rawLocal * 100) / 100);

  let formattedAmount = `${effectiveMeta.symbol}${rounded.toFixed(effectiveMeta.decimals)}`;
  try {
    formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: effectiveCode,
      minimumFractionDigits: effectiveMeta.decimals,
      maximumFractionDigits: effectiveMeta.decimals,
    }).format(rounded);
  } catch {
    // use fallback formattedAmount
  }

  return {
    countryCode: geo.countryCode.toUpperCase(),
    countryName: geo.countryName,
    currencyCode: effectiveCode,
    currencySymbol: effectiveMeta.symbol,
    localAmount: rounded,
    formattedLocalPrice: `${formattedAmount} / month`,
    basePriceLabel: `(Base: LKR ${PRO_BASE_PRICE_LKR} / 30 Days)`,
    isSriLanka: false,
    detectionSource: geo.source,
  };
}

export async function detectLocalizedProPrice(
  liveUsdRates?: Record<string, number>
): Promise<LocalizedProPrice> {
  if (cachedGeo) {
    return buildLocalizedPrice(cachedGeo, liveUsdRates);
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        country_code?: string;
        country_name?: string;
        currency?: string;
      };
      if (data.country_code && data.currency) {
        cachedGeo = {
          countryCode: String(data.country_code).slice(0, 4).toUpperCase(),
          countryName: String(data.country_name || data.country_code).slice(0, 60),
          currencyCode: String(data.currency).slice(0, 6).toUpperCase(),
          source: 'ip',
        };
        return buildLocalizedPrice(cachedGeo, liveUsdRates);
      }
    }
  } catch {
    // Fallback cleanly to browser timezone detection
  } finally {
    window.clearTimeout(timeout);
  }

  const fallback = inferGeoFromBrowser();
  cachedGeo = { ...fallback, source: 'timezone' };
  return buildLocalizedPrice(cachedGeo, liveUsdRates);
}
