import type { Country } from '../data/countries';

export type WeatherIconKind =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'rain'
  | 'snow'
  | 'storm';

export interface WeatherEntry {
  tempC: number;
  windKmh: number;
  weatherCode: number;
  label: string;
  icon: WeatherIconKind;
  isDay: boolean;
  fetchedAt: number;
  isFallback?: boolean;
}

export interface ExchangeRatesState {
  rates: Record<string, number>; // units per 1 USD
  updatedAt: number;
  isLive: boolean;
}

const WEATHER_STORAGE_KEY = 'meridian_weather_cache_v1';
const RATES_STORAGE_KEY = 'meridian_fx_rates_v1';
const WEATHER_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RATES_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Comprehensive fallback exchange rates (currency units per 1 USD)
 * covering every currency in the 197-country dataset.
 * Live rates from open.er-api.com merge on top of this baseline.
 */
export const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1,
  LKR: 295.5,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 153.5,
  AUD: 1.54,
  CAD: 1.4,
  CHF: 0.88,
  CNY: 7.24,
  INR: 84.4,
  SGD: 1.34,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  BHD: 0.376,
  OMR: 0.385,
  JOD: 0.709,
  KRW: 1395,
  MYR: 4.46,
  THB: 34.6,
  IDR: 15850,
  PHP: 58.8,
  VND: 25400,
  PKR: 278,
  BDT: 119.5,
  NPR: 135,
  MVR: 15.4,
  TWD: 32.5,
  TRY: 34.4,
  ILS: 3.72,
  RUB: 99,
  UAH: 41.3,
  PLN: 4.08,
  SEK: 10.9,
  NOK: 11.05,
  DKK: 6.88,
  CZK: 23.4,
  HUF: 382,
  RON: 4.6,
  BGN: 1.8,
  ISK: 138,
  BRL: 5.8,
  MXN: 20.3,
  ARS: 1005,
  CLP: 975,
  COP: 4410,
  PEN: 3.78,
  UYU: 42.5,
  NZD: 1.69,
  ZAR: 18.1,
  EGP: 49.4,
  NGN: 1660,
  KES: 129.5,
  GHS: 15.8,
  MAD: 9.95,
  TND: 3.12,
  DZD: 133.5,
  AOA: 912,
  XOF: 604,
  XAF: 604,
  BWP: 13.6,
  BIF: 2905,
  CVE: 101.5,
  KMF: 453,
  CDF: 2850,
  DJF: 177.7,
  ERN: 15,
  SZL: 18.1,
  ETB: 123,
  GMD: 70.5,
  GNF: 8620,
  LSL: 18.1,
  LRD: 192,
  LYD: 4.88,
  MGA: 4650,
  MWK: 1735,
  MRU: 39.8,
  MUR: 46.5,
  MZN: 63.9,
  NAD: 18.1,
  RWF: 1370,
  STN: 22.6,
  SCR: 13.7,
  SLE: 22.7,
  SOS: 571,
  SSP: 3300,
  SDG: 601,
  TZS: 2650,
  UGX: 3680,
  ZMW: 27.1,
  ZWG: 25.5,
  AFN: 68.2,
  AMD: 389,
  AZN: 1.7,
  BTN: 84.4,
  BND: 1.34,
  KHR: 4065,
  GEL: 2.73,
  IRR: 42000,
  IQD: 1310,
  KZT: 495,
  KGS: 86.4,
  LAK: 21900,
  LBP: 89500,
  MNT: 3410,
  MMK: 2100,
  KPW: 900,
  SYP: 13000,
  TJS: 10.65,
  TMT: 3.5,
  UZS: 12800,
  YER: 250,
  ALL: 92.5,
  BYN: 3.28,
  BAM: 1.8,
  MDL: 18.1,
  MKD: 56.8,
  RSD: 108,
  XCD: 2.7,
  BSD: 1,
  BBD: 2,
  BZD: 2,
  CRC: 510,
  CUP: 24,
  DOP: 60.2,
  GTQ: 7.72,
  HTG: 131,
  HNL: 25.2,
  JMD: 158,
  NIO: 36.8,
  PAB: 1,
  TTD: 6.78,
  BOB: 6.91,
  GYD: 209,
  PYG: 7810,
  SRD: 35.1,
  VES: 46,
  FJD: 2.27,
  PGK: 3.98,
  WST: 2.77,
  SBD: 8.45,
  TOP: 2.38,
  VUV: 119,
  HKD: 7.78,
  MOP: 8.01,
  BMD: 1.0,
  KYD: 0.833,
  AWG: 1.79,
  ANG: 1.79,
  GIP: 0.79,
  XPF: 110.2,
};

export function interpretWmoCode(
  code: number,
  isDay: boolean
): { label: string; icon: WeatherIconKind } {
  if (code === 0) {
    return { label: 'Clear', icon: isDay ? 'clear-day' : 'clear-night' };
  }
  if (code === 1 || code === 2) {
    return { label: 'Partly Cloudy', icon: 'partly-cloudy' };
  }
  if (code === 3) {
    return { label: 'Overcast', icon: 'cloudy' };
  }
  if (code === 45 || code === 48) {
    return { label: 'Foggy', icon: 'fog' };
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { label: code <= 57 ? 'Drizzle' : 'Rain', icon: 'rain' };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { label: 'Snow', icon: 'snow' };
  }
  if (code >= 95) {
    return { label: 'Storm', icon: 'storm' };
  }
  return { label: 'Cloudy', icon: 'cloudy' };
}

export function formatTemperature(tempC: number, unit: 'C' | 'F'): string {
  const value = unit === 'F' ? (tempC * 9) / 5 + 32 : tempC;
  return `${Math.round(value)}°${unit}`;
}

export function estimateFallbackWeather(country: Country, isDay: boolean): WeatherEntry {
  const absLat = Math.abs(country.lat);
  // Deterministic gentle baseline climate estimate by latitude band (used only if Open-Meteo is offline)
  const baseTemp =
    absLat < 15
      ? 28
      : absLat < 30
        ? 23
        : absLat < 45
          ? 15
          : absLat < 60
            ? 8
            : 1;
  const diurnalAdj = isDay ? 2 : -3;
  const tempC = Math.round(baseTemp + diurnalAdj);
  return {
    tempC,
    windKmh: 11,
    weatherCode: isDay ? 1 : 0,
    label: isDay ? 'Partly Cloudy' : 'Clear',
    icon: isDay ? 'partly-cloudy' : 'clear-night',
    isDay,
    fetchedAt: Date.now(),
    isFallback: true,
  };
}

// In-memory weather cache seeded from localStorage
const memoryWeatherCache = new Map<string, WeatherEntry>();
let weatherCacheHydrated = false;

export function hydrateWeatherCache(): Record<string, WeatherEntry> {
  if (!weatherCacheHydrated) {
    weatherCacheHydrated = true;
    try {
      const raw = localStorage.getItem(WEATHER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, WeatherEntry>;
        const now = Date.now();
        for (const [iso, entry] of Object.entries(parsed)) {
          if (entry && now - entry.fetchedAt < WEATHER_TTL_MS && !entry.isFallback) {
            memoryWeatherCache.set(iso, entry);
          }
        }
      }
    } catch {
      // Ignore storage errors
    }
  }
  return Object.fromEntries(memoryWeatherCache.entries());
}

function persistWeatherCache() {
  try {
    const obj: Record<string, WeatherEntry> = {};
    const now = Date.now();
    for (const [iso, entry] of memoryWeatherCache.entries()) {
      if (!entry.isFallback && now - entry.fetchedAt < WEATHER_TTL_MS) {
        obj[iso] = entry;
      }
    }
    localStorage.setItem(WEATHER_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Ignore quota errors
  }
}

const inFlightIsos = new Set<string>();

/**
 * Fetches live Open-Meteo weather for a batch of countries in a single HTTP request.
 * Skips recently cached or in-flight countries and handles 1-item vs multi-item JSON responses.
 */
export async function fetchWeatherBatch(
  targets: readonly Country[]
): Promise<Record<string, WeatherEntry>> {
  hydrateWeatherCache();
  const now = Date.now();

  const needed = targets.filter((c) => {
    if (inFlightIsos.has(c.iso)) return false;
    const cached = memoryWeatherCache.get(c.iso);
    if (cached && now - cached.fetchedAt < WEATHER_TTL_MS) return false;
    return true;
  });

  if (needed.length === 0) {
    return Object.fromEntries(memoryWeatherCache.entries());
  }

  // Cap single Open-Meteo batch to 25 locations for fast URL length & reliability
  const batch = needed.slice(0, 25);
  batch.forEach((c) => inFlightIsos.add(c.iso));

  try {
    const lats = batch.map((c) => c.lat.toFixed(2)).join(',');
    const lngs = batch.map((c) => c.lng.toFixed(2)).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,weather_code,wind_speed_10m,is_day&timezone=auto`;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, { signal: controller.signal });
    window.clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = await res.json();
    const list: Array<{
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
        is_day?: number;
      };
    }> = Array.isArray(data) ? data : [data];

    const fetchedAt = Date.now();
    batch.forEach((country, idx) => {
      const current = list[idx]?.current;
      if (current && typeof current.temperature_2m === 'number') {
        const isDay = current.is_day !== 0;
        const code = typeof current.weather_code === 'number' ? current.weather_code : 0;
        const { label, icon } = interpretWmoCode(code, isDay);
        memoryWeatherCache.set(country.iso, {
          tempC: current.temperature_2m,
          windKmh: typeof current.wind_speed_10m === 'number' ? Math.round(current.wind_speed_10m) : 0,
          weatherCode: code,
          label,
          icon,
          isDay,
          fetchedAt,
          isFallback: false,
        });
      }
    });

    persistWeatherCache();
  } catch {
    // Graceful fallback: store short-lived estimates (5 min) so cards stay informative without retry loops
    const retryAt = Date.now() - WEATHER_TTL_MS + 5 * 60 * 1000;
    batch.forEach((country) => {
      if (!memoryWeatherCache.has(country.iso)) {
        const est = estimateFallbackWeather(country, true);
        est.fetchedAt = retryAt;
        memoryWeatherCache.set(country.iso, est);
      }
    });
  } finally {
    batch.forEach((c) => inFlightIsos.delete(c.iso));
  }

  return Object.fromEntries(memoryWeatherCache.entries());
}

/**
 * Loads live exchange rates (base USD) with 6-hour localStorage caching
 * and complete built-in fallback rates.
 */
export function getInitialExchangeRates(): ExchangeRatesState {
  try {
    const raw = localStorage.getItem(RATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ExchangeRatesState;
      if (parsed && parsed.rates && parsed.rates.LKR) {
        return {
          rates: { ...FALLBACK_USD_RATES, ...parsed.rates },
          updatedAt: parsed.updatedAt || Date.now(),
          isLive: Boolean(parsed.isLive),
        };
      }
    }
  } catch {
    // Ignore storage errors
  }
  return {
    rates: { ...FALLBACK_USD_RATES },
    updatedAt: Date.now(),
    isLive: false,
  };
}

export async function fetchLiveExchangeRates(): Promise<ExchangeRatesState> {
  const initial = getInitialExchangeRates();
  if (initial.isLive && Date.now() - initial.updatedAt < RATES_TTL_MS) {
    return initial;
  }

  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 7000);
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
    const data = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };

    if (data && data.rates && typeof data.rates.LKR === 'number') {
      const merged: ExchangeRatesState = {
        rates: { ...FALLBACK_USD_RATES, ...data.rates },
        updatedAt: Date.now(),
        isLive: true,
      };
      try {
        localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // Ignore quota
      }
      return merged;
    }
  } catch {
    // Keep fallback baseline gracefully
  }

  return initial;
}

/**
 * Converts `amount` from `fromCurrency` to `toCurrency` via USD base rates.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  const fromRate = rates[fromCurrency] || FALLBACK_USD_RATES[fromCurrency] || 1;
  const toRate = rates[toCurrency] || FALLBACK_USD_RATES[toCurrency] || 1;
  if (!Number.isFinite(amount)) return 0;
  return (amount / fromRate) * toRate;
}

/**
 * Formats a concise LKR exchange rate string for card display.
 */
export function formatLkrRateShort(
  currencyCode: string,
  rates: Record<string, number>
): string {
  if (currencyCode === 'LKR') {
    const usdPer1000 = convertCurrency(1000, 'LKR', 'USD', rates);
    return `1K LKR ≈ $${usdPer1000.toFixed(2)}`;
  }
  const lkrPerUnit = convertCurrency(1, currencyCode, 'LKR', rates);
  if (lkrPerUnit >= 100) {
    return `1 ${currencyCode} ≈ ${Math.round(lkrPerUnit).toLocaleString()} LKR`;
  }
  if (lkrPerUnit >= 1) {
    return `1 ${currencyCode} ≈ ${lkrPerUnit.toFixed(2)} LKR`;
  }
  const lkrPer100 = lkrPerUnit * 100;
  if (lkrPer100 >= 1) {
    return `100 ${currencyCode} ≈ ${lkrPer100.toFixed(1)} LKR`;
  }
  return `1K ${currencyCode} ≈ ${(lkrPerUnit * 1000).toFixed(1)} LKR`;
}
