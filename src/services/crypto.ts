export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  currentPriceUsd: number;
  marketCapUsd: number;
  marketCapRank: number;
  high24hUsd: number;
  low24hUsd: number;
  priceChangePct24h: number;
  totalVolumeUsd: number;
}

export interface CryptoFeedState {
  assets: CryptoAsset[];
  isLive: boolean;
  updatedAt: number;
}

const CRYPTO_CACHE_KEY = 'meridian_crypto_cache_v1';
const CRYPTO_CACHE_TTL_MS = 90_000;

/**
 * Curated realistic fallback market snapshot used instantaneously on frame 1
 * and whenever CoinGecko public API rate-limits or the user is offline.
 */
const FALLBACK_CRYPTO_ASSETS: CryptoAsset[] = [
  {
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    currentPriceUsd: 91850,
    marketCapUsd: 1819000000000,
    marketCapRank: 1,
    high24hUsd: 93420,
    low24hUsd: 89910,
    priceChangePct24h: 2.14,
    totalVolumeUsd: 48200000000,
  },
  {
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    currentPriceUsd: 3180,
    marketCapUsd: 383000000000,
    marketCapRank: 2,
    high24hUsd: 3260,
    low24hUsd: 3095,
    priceChangePct24h: 1.82,
    totalVolumeUsd: 21400000000,
  },
  {
    id: 'tether',
    symbol: 'USDT',
    name: 'Tether',
    currentPriceUsd: 1.0,
    marketCapUsd: 138000000000,
    marketCapRank: 3,
    high24hUsd: 1.001,
    low24hUsd: 0.999,
    priceChangePct24h: 0.01,
    totalVolumeUsd: 78500000000,
  },
  {
    id: 'ripple',
    symbol: 'XRP',
    name: 'XRP',
    currentPriceUsd: 2.34,
    marketCapUsd: 134500000000,
    marketCapRank: 4,
    high24hUsd: 2.46,
    low24hUsd: 2.21,
    priceChangePct24h: 3.45,
    totalVolumeUsd: 8900000000,
  },
  {
    id: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    currentPriceUsd: 198.4,
    marketCapUsd: 96400000000,
    marketCapRank: 5,
    high24hUsd: 205.2,
    low24hUsd: 191.0,
    priceChangePct24h: 2.91,
    totalVolumeUsd: 5400000000,
  },
  {
    id: 'binancecoin',
    symbol: 'BNB',
    name: 'BNB',
    currentPriceUsd: 685.2,
    marketCapUsd: 98800000000,
    marketCapRank: 6,
    high24hUsd: 699.0,
    low24hUsd: 672.5,
    priceChangePct24h: 1.15,
    totalVolumeUsd: 2100000000,
  },
  {
    id: 'dogecoin',
    symbol: 'DOGE',
    name: 'Dogecoin',
    currentPriceUsd: 0.342,
    marketCapUsd: 50400000000,
    marketCapRank: 7,
    high24hUsd: 0.358,
    low24hUsd: 0.329,
    priceChangePct24h: -1.28,
    totalVolumeUsd: 3800000000,
  },
  {
    id: 'cardano',
    symbol: 'ADA',
    name: 'Cardano',
    currentPriceUsd: 0.94,
    marketCapUsd: 33100000000,
    marketCapRank: 8,
    high24hUsd: 0.98,
    low24hUsd: 0.9,
    priceChangePct24h: 2.62,
    totalVolumeUsd: 1250000000,
  },
  {
    id: 'tron',
    symbol: 'TRX',
    name: 'TRON',
    currentPriceUsd: 0.245,
    marketCapUsd: 21100000000,
    marketCapRank: 9,
    high24hUsd: 0.252,
    low24hUsd: 0.239,
    priceChangePct24h: 0.88,
    totalVolumeUsd: 920000000,
  },
  {
    id: 'avalanche-2',
    symbol: 'AVAX',
    name: 'Avalanche',
    currentPriceUsd: 37.8,
    marketCapUsd: 15500000000,
    marketCapRank: 10,
    high24hUsd: 39.4,
    low24hUsd: 36.2,
    priceChangePct24h: -0.94,
    totalVolumeUsd: 680000000,
  },
  {
    id: 'chainlink',
    symbol: 'LINK',
    name: 'Chainlink',
    currentPriceUsd: 22.4,
    marketCapUsd: 14100000000,
    marketCapRank: 11,
    high24hUsd: 23.5,
    low24hUsd: 21.3,
    priceChangePct24h: 4.12,
    totalVolumeUsd: 890000000,
  },
  {
    id: 'the-open-network',
    symbol: 'TON',
    name: 'Toncoin',
    currentPriceUsd: 5.42,
    marketCapUsd: 13800000000,
    marketCapRank: 12,
    high24hUsd: 5.61,
    low24hUsd: 5.28,
    priceChangePct24h: 1.04,
    totalVolumeUsd: 320000000,
  },
  {
    id: 'sui',
    symbol: 'SUI',
    name: 'Sui',
    currentPriceUsd: 4.18,
    marketCapUsd: 12400000000,
    marketCapRank: 13,
    high24hUsd: 4.35,
    low24hUsd: 3.96,
    priceChangePct24h: 3.75,
    totalVolumeUsd: 1420000000,
  },
  {
    id: 'polkadot',
    symbol: 'DOT',
    name: 'Polkadot',
    currentPriceUsd: 6.95,
    marketCapUsd: 10500000000,
    marketCapRank: 14,
    high24hUsd: 7.22,
    low24hUsd: 6.78,
    priceChangePct24h: -0.62,
    totalVolumeUsd: 310000000,
  },
  {
    id: 'litecoin',
    symbol: 'LTC',
    name: 'Litecoin',
    currentPriceUsd: 106.5,
    marketCapUsd: 8020000000,
    marketCapRank: 15,
    high24hUsd: 109.8,
    low24hUsd: 103.1,
    priceChangePct24h: 1.47,
    totalVolumeUsd: 740000000,
  },
  {
    id: 'polygon-ecosystem-token',
    symbol: 'POL',
    name: 'Polygon',
    currentPriceUsd: 0.485,
    marketCapUsd: 4100000000,
    marketCapRank: 16,
    high24hUsd: 0.504,
    low24hUsd: 0.471,
    priceChangePct24h: -1.52,
    totalVolumeUsd: 265000000,
  },
];

let memoryCache: CryptoFeedState | null = null;

function readStorageCache(): CryptoFeedState | null {
  try {
    const raw = localStorage.getItem(CRYPTO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CryptoFeedState;
    if (!parsed || !Array.isArray(parsed.assets) || parsed.assets.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getInitialCryptoFeed(): CryptoFeedState {
  if (memoryCache) return memoryCache;
  const cached = readStorageCache();
  if (cached) {
    memoryCache = cached;
    return cached;
  }
  return {
    assets: FALLBACK_CRYPTO_ASSETS,
    isLive: false,
    updatedAt: Date.now(),
  };
}

interface CoinGeckoMarketRow {
  id?: string;
  symbol?: string;
  name?: string;
  image?: string;
  current_price?: number;
  market_cap?: number;
  market_cap_rank?: number;
  high_24h?: number;
  low_24h?: number;
  price_change_percentage_24h?: number;
  total_volume?: number;
}

/**
 * Fetches live cryptocurrency market updates via CoinGecko public HTTPS API
 * with 90s response caching and graceful fallback on rate-limit or network errors.
 */
export async function fetchLiveCryptoMarket(forceRefresh = false): Promise<CryptoFeedState> {
  const now = Date.now();
  if (
    !forceRefresh &&
    memoryCache &&
    memoryCache.isLive &&
    now - memoryCache.updatedAt < CRYPTO_CACHE_TTL_MS
  ) {
    return memoryCache;
  }

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5500);
    const url =
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h';
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    window.clearTimeout(timer);

    if (!res.ok) {
      return getInitialCryptoFeed();
    }

    const rows = (await res.json()) as CoinGeckoMarketRow[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return getInitialCryptoFeed();
    }

    const assets: CryptoAsset[] = rows
      .filter(
        (r): r is Required<Pick<CoinGeckoMarketRow, 'id' | 'symbol' | 'name' | 'current_price'>> &
          CoinGeckoMarketRow =>
          typeof r.id === 'string' &&
          typeof r.symbol === 'string' &&
          typeof r.name === 'string' &&
          typeof r.current_price === 'number' &&
          Number.isFinite(r.current_price)
      )
      .map((r, idx) => ({
        id: r.id,
        symbol: r.symbol.toUpperCase(),
        name: r.name,
        image: typeof r.image === 'string' && r.image.startsWith('https://') ? r.image : undefined,
        currentPriceUsd: r.current_price,
        marketCapUsd: typeof r.market_cap === 'number' ? r.market_cap : 0,
        marketCapRank: typeof r.market_cap_rank === 'number' ? r.market_cap_rank : idx + 1,
        high24hUsd: typeof r.high_24h === 'number' ? r.high_24h : r.current_price,
        low24hUsd: typeof r.low_24h === 'number' ? r.low_24h : r.current_price,
        priceChangePct24h:
          typeof r.price_change_percentage_24h === 'number' &&
          Number.isFinite(r.price_change_percentage_24h)
            ? r.price_change_percentage_24h
            : 0,
        totalVolumeUsd: typeof r.total_volume === 'number' ? r.total_volume : 0,
      }));

    if (assets.length === 0) {
      return getInitialCryptoFeed();
    }

    const state: CryptoFeedState = {
      assets,
      isLive: true,
      updatedAt: now,
    };
    memoryCache = state;
    try {
      localStorage.setItem(CRYPTO_CACHE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
    return state;
  } catch {
    return getInitialCryptoFeed();
  }
}

export function formatUsdCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatCryptoUsdPrice(price: number): string {
  if (!Number.isFinite(price)) return '$0.00';
  if (price >= 1000) {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (price >= 1) {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;
  }
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 5 })}`;
}

export function formatCryptoLkrPrice(priceUsd: number, usdToLkrRate: number): string {
  const safeRate = Number.isFinite(usdToLkrRate) && usdToLkrRate > 0 ? usdToLkrRate : 296;
  const lkr = priceUsd * safeRate;
  if (lkr >= 1000) {
    return `Rs ${Math.round(lkr).toLocaleString()}`;
  }
  if (lkr >= 1) {
    return `Rs ${lkr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `Rs ${lkr.toFixed(4)}`;
}
