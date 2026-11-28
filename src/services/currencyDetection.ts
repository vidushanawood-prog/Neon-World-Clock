import { PRO_BASE_PRICE_LKR } from './subscription';

export interface LocalizedProPrice {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencySymbol: string;
  localAmount: number;
  formattedLocalAmount: string;
  formattedLocalPrice: string;
  basePriceLabel: string;
  isSriLanka: boolean;
  detectionSource: 'ip' | 'locale' | 'timezone' | 'fallback';
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
  QAR: { symbol: 'QAR ', decimals: 2, usdPerUnit: 3.64 },
  KWD: { symbol: 'KWD ', decimals: 2, usdPerUnit: 0.31 },
  OMR: { symbol: 'OMR ', decimals: 2, usdPerUnit: 0.38 },
  MYR: { symbol: 'RM', decimals: 2, usdPerUnit: 4.42 },
  PKR: { symbol: 'Rs ', decimals: 0, usdPerUnit: 278 },
  BDT: { symbol: '৳', decimals: 0, usdPerUnit: 119.5 },
  NPR: { symbol: 'Rs ', decimals: 0, usdPerUnit: 134.8 },
  PHP: { symbol: '₱', decimals: 0, usdPerUnit: 58.2 },
  IDR: { symbol: 'Rp ', decimals: 0, usdPerUnit: 15800 },
  THB: { symbol: '฿', decimals: 0, usdPerUnit: 34.5 },
  VND: { symbol: '₫', decimals: 0, usdPerUnit: 25300 },
  KRW: { symbol: '₩', decimals: 0, usdPerUnit: 1385 },
  CNY: { symbol: '¥', decimals: 2, usdPerUnit: 7.24 },
  HKD: { symbol: 'HK$', decimals: 2, usdPerUnit: 7.78 },
  TWD: { symbol: 'NT$', decimals: 0, usdPerUnit: 32.3 },
  BRL: { symbol: 'R$', decimals: 2, usdPerUnit: 5.75 },
  MXN: { symbol: 'MX$', decimals: 2, usdPerUnit: 20.1 },
  ZAR: { symbol: 'R', decimals: 2, usdPerUnit: 18.1 },
  NGN: { symbol: '₦', decimals: 0, usdPerUnit: 1640 },
  KES: { symbol: 'KSh ', decimals: 0, usdPerUnit: 129 },
  EGP: { symbol: 'E£', decimals: 0, usdPerUnit: 49.2 },
  TRY: { symbol: '₺', decimals: 2, usdPerUnit: 34.4 },
  CHF: { symbol: 'CHF ', decimals: 2, usdPerUnit: 0.88 },
  SEK: { symbol: 'kr ', decimals: 2, usdPerUnit: 10.8 },
  NOK: { symbol: 'kr ', decimals: 2, usdPerUnit: 11.0 },
  DKK: { symbol: 'kr ', decimals: 2, usdPerUnit: 6.9 },
  PLN: { symbol: 'zł ', decimals: 2, usdPerUnit: 4.05 },
  NZD: { symbol: 'NZ$', decimals: 2, usdPerUnit: 1.68 },
};

const REGION_TO_GEO: Record<string, { countryName: string; currencyCode: string }> = {
  LK: { countryName: 'Sri Lanka', currencyCode: 'LKR' },
  US: { countryName: 'United States', currencyCode: 'USD' },
  GB: { countryName: 'United Kingdom', currencyCode: 'GBP' },
  UK: { countryName: 'United Kingdom', currencyCode: 'GBP' },
  IN: { countryName: 'India', currencyCode: 'INR' },
  AU: { countryName: 'Australia', currencyCode: 'AUD' },
  CA: { countryName: 'Canada', currencyCode: 'CAD' },
  NZ: { countryName: 'New Zealand', currencyCode: 'NZD' },
  JP: { countryName: 'Japan', currencyCode: 'JPY' },
  SG: { countryName: 'Singapore', currencyCode: 'SGD' },
  AE: { countryName: 'United Arab Emirates', currencyCode: 'AED' },
  SA: { countryName: 'Saudi Arabia', currencyCode: 'SAR' },
  QA: { countryName: 'Qatar', currencyCode: 'QAR' },
  KW: { countryName: 'Kuwait', currencyCode: 'KWD' },
  OM: { countryName: 'Oman', currencyCode: 'OMR' },
  MY: { countryName: 'Malaysia', currencyCode: 'MYR' },
  PK: { countryName: 'Pakistan', currencyCode: 'PKR' },
  BD: { countryName: 'Bangladesh', currencyCode: 'BDT' },
  NP: { countryName: 'Nepal', currencyCode: 'NPR' },
  PH: { countryName: 'Philippines', currencyCode: 'PHP' },
  ID: { countryName: 'Indonesia', currencyCode: 'IDR' },
  TH: { countryName: 'Thailand', currencyCode: 'THB' },
  VN: { countryName: 'Vietnam', currencyCode: 'VND' },
  KR: { countryName: 'South Korea', currencyCode: 'KRW' },
  CN: { countryName: 'China', currencyCode: 'CNY' },
  HK: { countryName: 'Hong Kong', currencyCode: 'HKD' },
  TW: { countryName: 'Taiwan', currencyCode: 'TWD' },
  DE: { countryName: 'Germany', currencyCode: 'EUR' },
  FR: { countryName: 'France', currencyCode: 'EUR' },
  IT: { countryName: 'Italy', currencyCode: 'EUR' },
  ES: { countryName: 'Spain', currencyCode: 'EUR' },
  NL: { countryName: 'Netherlands', currencyCode: 'EUR' },
  BE: { countryName: 'Belgium', currencyCode: 'EUR' },
  AT: { countryName: 'Austria', currencyCode: 'EUR' },
  IE: { countryName: 'Ireland', currencyCode: 'EUR' },
  PT: { countryName: 'Portugal', currencyCode: 'EUR' },
  FI: { countryName: 'Finland', currencyCode: 'EUR' },
  GR: { countryName: 'Greece', currencyCode: 'EUR' },
  CH: { countryName: 'Switzerland', currencyCode: 'CHF' },
  SE: { countryName: 'Sweden', currencyCode: 'SEK' },
  NO: { countryName: 'Norway', currencyCode: 'NOK' },
  DK: { countryName: 'Denmark', currencyCode: 'DKK' },
  PL: { countryName: 'Poland', currencyCode: 'PLN' },
  BR: { countryName: 'Brazil', currencyCode: 'BRL' },
  MX: { countryName: 'Mexico', currencyCode: 'MXN' },
  ZA: { countryName: 'South Africa', currencyCode: 'ZAR' },
  NG: { countryName: 'Nigeria', currencyCode: 'NGN' },
  KE: { countryName: 'Kenya', currencyCode: 'KES' },
  EG: { countryName: 'Egypt', currencyCode: 'EGP' },
  TR: { countryName: 'Turkey', currencyCode: 'TRY' },
};

const TIMEZONE_TO_GEO: Record<string, { countryCode: string; countryName: string; currencyCode: string }> = {
  'Asia/Colombo': { countryCode: 'LK', countryName: 'Sri Lanka', currencyCode: 'LKR' },
  'Asia/Kolkata': { countryCode: 'IN', countryName: 'India', currencyCode: 'INR' },
  'Asia/Calcutta': { countryCode: 'IN', countryName: 'India', currencyCode: 'INR' },
  'Europe/London': { countryCode: 'GB', countryName: 'United Kingdom', currencyCode: 'GBP' },
  'Asia/Tokyo': { countryCode: 'JP', countryName: 'Japan', currencyCode: 'JPY' },
  'Asia/Singapore': { countryCode: 'SG', countryName: 'Singapore', currencyCode: 'SGD' },
  'Asia/Dubai': { countryCode: 'AE', countryName: 'United Arab Emirates', currencyCode: 'AED' },
  'Asia/Riyadh': { countryCode: 'SA', countryName: 'Saudi Arabia', currencyCode: 'SAR' },
  'Asia/Qatar': { countryCode: 'QA', countryName: 'Qatar', currencyCode: 'QAR' },
  'Asia/Kuwait': { countryCode: 'KW', countryName: 'Kuwait', currencyCode: 'KWD' },
  'Asia/Muscat': { countryCode: 'OM', countryName: 'Oman', currencyCode: 'OMR' },
  'Australia/Sydney': { countryCode: 'AU', countryName: 'Australia', currencyCode: 'AUD' },
  'Australia/Melbourne': { countryCode: 'AU', countryName: 'Australia', currencyCode: 'AUD' },
  'Australia/Brisbane': { countryCode: 'AU', countryName: 'Australia', currencyCode: 'AUD' },
  'Australia/Perth': { countryCode: 'AU', countryName: 'Australia', currencyCode: 'AUD' },
  'Pacific/Auckland': { countryCode: 'NZ', countryName: 'New Zealand', currencyCode: 'NZD' },
  'America/Toronto': { countryCode: 'CA', countryName: 'Canada', currencyCode: 'CAD' },
  'America/Vancouver': { countryCode: 'CA', countryName: 'Canada', currencyCode: 'CAD' },
  'America/Montreal': { countryCode: 'CA', countryName: 'Canada', currencyCode: 'CAD' },
  'America/New_York': { countryCode: 'US', countryName: 'United States', currencyCode: 'USD' },
  'America/Chicago': { countryCode: 'US', countryName: 'United States', currencyCode: 'USD' },
  'America/Denver': { countryCode: 'US', countryName: 'United States', currencyCode: 'USD' },
  'America/Los_Angeles': { countryCode: 'US', countryName: 'United States', currencyCode: 'USD' },
  'America/Phoenix': { countryCode: 'US', countryName: 'United States', currencyCode: 'USD' },
  'Asia/Kuala_Lumpur': { countryCode: 'MY', countryName: 'Malaysia', currencyCode: 'MYR' },
  'Asia/Karachi': { countryCode: 'PK', countryName: 'Pakistan', currencyCode: 'PKR' },
  'Asia/Dhaka': { countryCode: 'BD', countryName: 'Bangladesh', currencyCode: 'BDT' },
  'Asia/Kathmandu': { countryCode: 'NP', countryName: 'Nepal', currencyCode: 'NPR' },
  'Asia/Manila': { countryCode: 'PH', countryName: 'Philippines', currencyCode: 'PHP' },
  'Asia/Jakarta': { countryCode: 'ID', countryName: 'Indonesia', currencyCode: 'IDR' },
  'Asia/Bangkok': { countryCode: 'TH', countryName: 'Thailand', currencyCode: 'THB' },
  'Asia/Ho_Chi_Minh': { countryCode: 'VN', countryName: 'Vietnam', currencyCode: 'VND' },
  'Asia/Seoul': { countryCode: 'KR', countryName: 'South Korea', currencyCode: 'KRW' },
  'Asia/Shanghai': { countryCode: 'CN', countryName: 'China', currencyCode: 'CNY' },
  'Asia/Hong_Kong': { countryCode: 'HK', countryName: 'Hong Kong', currencyCode: 'HKD' },
  'Asia/Taipei': { countryCode: 'TW', countryName: 'Taiwan', currencyCode: 'TWD' },
  'Europe/Berlin': { countryCode: 'DE', countryName: 'Germany', currencyCode: 'EUR' },
  'Europe/Paris': { countryCode: 'FR', countryName: 'France', currencyCode: 'EUR' },
  'Europe/Rome': { countryCode: 'IT', countryName: 'Italy', currencyCode: 'EUR' },
  'Europe/Madrid': { countryCode: 'ES', countryName: 'Spain', currencyCode: 'EUR' },
  'Europe/Amsterdam': { countryCode: 'NL', countryName: 'Netherlands', currencyCode: 'EUR' },
  'Europe/Brussels': { countryCode: 'BE', countryName: 'Belgium', currencyCode: 'EUR' },
  'Europe/Vienna': { countryCode: 'AT', countryName: 'Austria', currencyCode: 'EUR' },
  'Europe/Dublin': { countryCode: 'IE', countryName: 'Ireland', currencyCode: 'EUR' },
  'Europe/Lisbon': { countryCode: 'PT', countryName: 'Portugal', currencyCode: 'EUR' },
  'Europe/Zurich': { countryCode: 'CH', countryName: 'Switzerland', currencyCode: 'CHF' },
  'Europe/Stockholm': { countryCode: 'SE', countryName: 'Sweden', currencyCode: 'SEK' },
  'Europe/Oslo': { countryCode: 'NO', countryName: 'Norway', currencyCode: 'NOK' },
  'Europe/Copenhagen': { countryCode: 'DK', countryName: 'Denmark', currencyCode: 'DKK' },
  'Europe/Warsaw': { countryCode: 'PL', countryName: 'Poland', currencyCode: 'PLN' },
  'Europe/Istanbul': { countryCode: 'TR', countryName: 'Turkey', currencyCode: 'TRY' },
  'America/Sao_Paulo': { countryCode: 'BR', countryName: 'Brazil', currencyCode: 'BRL' },
  'America/Mexico_City': { countryCode: 'MX', countryName: 'Mexico', currencyCode: 'MXN' },
  'Africa/Johannesburg': { countryCode: 'ZA', countryName: 'South Africa', currencyCode: 'ZAR' },
  'Africa/Lagos': { countryCode: 'NG', countryName: 'Nigeria', currencyCode: 'NGN' },
  'Africa/Nairobi': { countryCode: 'KE', countryName: 'Kenya', currencyCode: 'KES' },
  'Africa/Cairo': { countryCode: 'EG', countryName: 'Egypt', currencyCode: 'EGP' },
};

interface DetectedGeo {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  source: 'ip' | 'locale' | 'timezone' | 'fallback';
}

let cachedGeo: DetectedGeo | null = null;

function resolveRegionDisplayName(regionCode: string): string {
  const mapped = REGION_TO_GEO[regionCode];
  if (mapped) return mapped.countryName;
  try {
    const DisplayNamesCtor = (Intl as unknown as {
      DisplayNames?: new (locales: string[], options: { type: 'region' }) => { of: (code: string) => string | undefined };
    }).DisplayNames;
    if (DisplayNamesCtor) {
      const displayNames = new DisplayNamesCtor(['en'], { type: 'region' });
      const resolved = displayNames.of(regionCode);
      if (resolved && resolved.toUpperCase() !== regionCode) {
        return resolved;
      }
    }
  } catch {
    // ignore Intl.DisplayNames errors
  }
  return regionCode;
}

function inferGeoFromLocale(): DetectedGeo | null {
  try {
    const candidates: string[] = [];
    if (typeof navigator !== 'undefined') {
      if (Array.isArray(navigator.languages)) {
        candidates.push(...navigator.languages);
      }
      if (navigator.language) {
        candidates.push(navigator.language);
      }
    }
    const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (intlLocale) candidates.push(intlLocale);

    for (const rawLocale of candidates) {
      if (!rawLocale || typeof rawLocale !== 'string') continue;
      // Extract ISO 3166-1 alpha-2 region subtag (e.g. en-LK, si-LK, en-GB, pt-BR)
      const parts = rawLocale.replace(/_/g, '-').split('-');
      const regionPart = parts.slice(1).find((p) => /^[A-Za-z]{2}$/.test(p));
      if (!regionPart) continue;
      const code = regionPart.toUpperCase();
      const mapped = REGION_TO_GEO[code];
      if (mapped) {
        return {
          countryCode: code === 'UK' ? 'GB' : code,
          countryName: mapped.countryName,
          currencyCode: mapped.currencyCode,
          source: 'locale',
        };
      }
      // Valid 2-letter region not in REGION_TO_GEO: resolve country name safely & fall back to USD
      const name = resolveRegionDisplayName(code);
      if (name && name.length >= 2) {
        return {
          countryCode: code,
          countryName: name,
          currencyCode: 'USD',
          source: 'locale',
        };
      }
    }
  } catch {
    // ignore locale inspection errors
  }
  return null;
}

function inferGeoFromBrowser(): DetectedGeo {
  // 1. Prefer exact browser timezone match (reflects physical location better than en-US browser default)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (TIMEZONE_TO_GEO[tz]) {
      return { ...TIMEZONE_TO_GEO[tz], source: 'timezone' };
    }

    // 2. Try browser locale region tag before broad continent fallback
    const localeGeo = inferGeoFromLocale();
    if (localeGeo) {
      return localeGeo;
    }

    if (tz.startsWith('Europe/')) {
      return { countryCode: 'EU', countryName: 'Europe', currencyCode: 'EUR', source: 'timezone' };
    }
    if (tz.startsWith('Australia/')) {
      return { countryCode: 'AU', countryName: 'Australia', currencyCode: 'AUD', source: 'timezone' };
    }
    if (tz.startsWith('America/')) {
      return { countryCode: 'US', countryName: 'United States', currencyCode: 'USD', source: 'timezone' };
    }
  } catch {
    // ignore Intl error
  }

  const localeFallback = inferGeoFromLocale();
  if (localeFallback) return localeFallback;

  // Safe fallback
  return { countryCode: 'LK', countryName: 'Sri Lanka', currencyCode: 'LKR', source: 'fallback' };
}

export function buildLocalizedPrice(
  geo: DetectedGeo,
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
      formattedLocalAmount: `LKR ${PRO_BASE_PRICE_LKR}`,
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
    formattedLocalAmount: formattedAmount,
    formattedLocalPrice: `${formattedAmount} / month`,
    basePriceLabel: `(Base: LKR ${PRO_BASE_PRICE_LKR} / 30 Days)`,
    isSriLanka: false,
    detectionSource: geo.source,
  };
}

/**
 * Synchronous instant detection using browser timezone + locale with safe fallback
 * so the Upgrade modal displays country, local currency, and total with zero delay.
 */
export function getInstantLocalizedProPrice(
  liveUsdRates?: Record<string, number>
): LocalizedProPrice {
  if (cachedGeo) {
    return buildLocalizedPrice(cachedGeo, liveUsdRates);
  }
  const browserGeo = inferGeoFromBrowser();
  return buildLocalizedPrice(browserGeo, liveUsdRates);
}

export async function detectLocalizedProPrice(
  liveUsdRates?: Record<string, number>
): Promise<LocalizedProPrice> {
  if (cachedGeo && cachedGeo.source === 'ip') {
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
    // Fallback cleanly to browser timezone/locale detection
  } finally {
    window.clearTimeout(timeout);
  }

  const fallback = inferGeoFromBrowser();
  cachedGeo = fallback;
  return buildLocalizedPrice(cachedGeo, liveUsdRates);
}
