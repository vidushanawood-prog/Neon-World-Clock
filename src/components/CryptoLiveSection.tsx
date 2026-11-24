import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  fetchLiveCryptoMarket,
  formatCryptoLkrPrice,
  formatCryptoUsdPrice,
  formatUsdCompact,
  getInitialCryptoFeed,
  type CryptoFeedState,
} from '../services/crypto';

interface CryptoLiveSectionProps {
  usdToLkrRate: number;
  onBackToGlobe?: () => void;
  onSelectCoinSpeech?: (topic: string, text: string) => void;
}

type CryptoFilter = 'all' | 'top5' | 'gainers' | 'losers';

export const CryptoLiveSection: React.FC<CryptoLiveSectionProps> = ({
  usdToLkrRate,
  onBackToGlobe,
  onSelectCoinSpeech,
}) => {
  const [feed, setFeed] = useState<CryptoFeedState>(() => getInitialCryptoFeed());
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CryptoFilter>('all');
  const [failedIcons, setFailedIcons] = useState<Set<string>>(() => new Set());

  const loadFeed = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const next = await fetchLiveCryptoMarket(force);
      setFeed(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed(false);
    const interval = window.setInterval(() => {
      void loadFeed(true);
    }, 90_000);
    return () => window.clearInterval(interval);
  }, [loadFeed]);

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feed.assets.filter((coin) => {
      if (filter === 'top5' && coin.marketCapRank > 5) return false;
      if (filter === 'gainers' && coin.priceChangePct24h <= 0) return false;
      if (filter === 'losers' && coin.priceChangePct24h >= 0) return false;
      if (!q) return true;
      return (
        coin.name.toLowerCase().includes(q) ||
        coin.symbol.toLowerCase().includes(q) ||
        coin.id.toLowerCase().includes(q)
      );
    });
  }, [feed.assets, filter, query]);

  const featuredTickers = useMemo(() => {
    const priority = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'];
    return priority
      .map((sym) => feed.assets.find((a) => a.symbol === sym))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
  }, [feed.assets]);

  const updatedStr = useMemo(() => {
    return new Date(feed.updatedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [feed.updatedAt]);

  return (
    <section
      id="crypto-live-section"
      aria-labelledby="crypto-live-heading"
      className="mb-10 rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-[0_10px_36px_-14px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-6 dark:border-sky-400/20 dark:bg-[#071022]/90 dark:shadow-[0_18px_56px_-18px_rgba(14,165,233,0.22)]"
    >
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center dark:border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
              <Coins className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2
              id="crypto-live-heading"
              className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl dark:text-white"
            >
              Crypto Live Market
            </h2>
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{feed.isLive ? 'Live CoinGecko Feed' : 'Reference Market Feed'}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-clock">1 USD ≈ {usdToLkrRate.toFixed(2)} LKR</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-clock">Updated {updatedStr}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadFeed(true)}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/12 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.12]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          {onBackToGlobe && (
            <button
              type="button"
              onClick={onBackToGlobe}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
            >
              <span>Globe &amp; Clocks</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Top-5 Ticker Highlights (BTC, ETH, SOL, BNB, XRP) */}
      {featuredTickers.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {featuredTickers.map((coin) => {
            const up = coin.priceChangePct24h >= 0;
            return (
              <button
                key={coin.id}
                type="button"
                onClick={() =>
                  onSelectCoinSpeech?.(
                    `Crypto Live · ${coin.symbol}`,
                    `${coin.name} is trading at ${formatCryptoUsdPrice(coin.currentPriceUsd)}, or ${formatCryptoLkrPrice(
                      coin.currentPriceUsd,
                      usdToLkrRate
                    )}, ${up ? 'up' : 'down'} ${Math.abs(coin.priceChangePct24h).toFixed(2)} percent in the last 24 hours.`
                  )
                }
                className="flex flex-col rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 text-left transition-colors hover:border-sky-400/50 dark:border-white/[0.08] dark:bg-slate-900/65 dark:hover:border-sky-400/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {coin.symbol}
                  </span>
                  <span
                    className={`tabular-clock inline-flex items-center gap-0.5 text-[11px] font-semibold ${
                      up
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {up ? (
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
                    )}
                    {Math.abs(coin.priceChangePct24h).toFixed(2)}%
                  </span>
                </div>
                <p className="tabular-clock mt-1.5 text-sm font-bold text-slate-950 dark:text-white">
                  {formatCryptoUsdPrice(coin.currentPriceUsd)}
                </p>
                <p className="tabular-clock mt-0.5 truncate text-[11px] text-sky-700 dark:text-sky-300">
                  {formatCryptoLkrPrice(coin.currentPriceUsd, usdToLkrRate)}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter coin (BTC, ETH, SOL, XRP)..."
            aria-label="Search cryptocurrencies"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-white/12 dark:bg-slate-950/75 dark:text-white dark:placeholder:text-slate-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear crypto search"
              className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Filter cryptocurrencies"
          className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200/90 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-slate-900/80"
        >
          {(
            [
              ['all', 'All Coins'],
              ['top5', 'Top 5'],
              ['gainers', 'Gainers'],
              ['losers', 'Losers'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                filter === id
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-sky-500 dark:text-slate-950'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Market Cards Grid */}
      {filteredAssets.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-slate-200/70 bg-slate-50/70 py-10 text-center text-xs text-slate-500 dark:border-white/[0.07] dark:bg-slate-950/50 dark:text-slate-400">
          No cryptocurrencies matched &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAssets.map((coin) => {
            const up = coin.priceChangePct24h >= 0;
            const rangeSpan = Math.max(coin.high24hUsd - coin.low24hUsd, 0.0000001);
            const rangePct = Math.max(
              0,
              Math.min(100, ((coin.currentPriceUsd - coin.low24hUsd) / rangeSpan) * 100)
            );
            const iconOk = Boolean(coin.image && !failedIcons.has(coin.id));

            return (
              <article
                key={coin.id}
                onClick={() =>
                  onSelectCoinSpeech?.(
                    `Crypto Live · ${coin.name}`,
                    `${coin.name}, ranked number ${coin.marketCapRank}, is currently ${formatCryptoUsdPrice(
                      coin.currentPriceUsd
                    )}, equivalent to ${formatCryptoLkrPrice(
                      coin.currentPriceUsd,
                      usdToLkrRate
                    )}, with a market cap of ${formatUsdCompact(coin.marketCapUsd)}.`
                  )
                }
                className="cursor-pointer rounded-2xl border border-slate-200/85 bg-white/90 p-4 transition-all hover:border-sky-400/50 dark:border-white/[0.08] dark:bg-slate-900/60 dark:hover:border-sky-400/35"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {iconOk && coin.image ? (
                      <img
                        src={coin.image}
                        alt={coin.name}
                        width={32}
                        height={32}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={() =>
                          setFailedIcons((prev) => new Set(prev).add(coin.id))
                        }
                        className="h-8 w-8 shrink-0 rounded-full bg-slate-950/20 object-cover ring-1 ring-white/10"
                      />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[11px] font-bold text-sky-600 dark:text-sky-300">
                        {coin.symbol.slice(0, 3)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-950 dark:text-white">
                        {coin.name}
                      </h3>
                      <p className="tabular-clock text-[11px] text-slate-500 dark:text-slate-400">
                        #{coin.marketCapRank} · {coin.symbol}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`tabular-clock inline-flex shrink-0 items-center gap-0.5 text-xs font-bold ${
                      up
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {up ? (
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {up ? '+' : ''}
                    {coin.priceChangePct24h.toFixed(2)}%
                  </span>
                </div>

                {/* Live USD & LKR Prices */}
                <div className="mt-3.5 flex items-baseline justify-between gap-2">
                  <span className="tabular-clock text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                    {formatCryptoUsdPrice(coin.currentPriceUsd)}
                  </span>
                  <span className="tabular-clock truncate text-xs font-semibold text-sky-700 dark:text-sky-300">
                    {formatCryptoLkrPrice(coin.currentPriceUsd, usdToLkrRate)}
                  </span>
                </div>

                {/* 24h High / Low Range Bar */}
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      style={{ width: `${rangePct}%` }}
                      className={`h-full rounded-full ${
                        up
                          ? 'bg-gradient-to-r from-sky-500 to-emerald-400'
                          : 'bg-gradient-to-r from-rose-500 to-amber-400'
                      }`}
                    />
                  </div>
                  <div className="tabular-clock mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>L {formatCryptoUsdPrice(coin.low24hUsd)}</span>
                    <span>H {formatCryptoUsdPrice(coin.high24hUsd)}</span>
                  </div>
                </div>

                {/* Market Cap & Volume */}
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/70 pt-2 text-[11px] text-slate-500 dark:border-white/[0.06] dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-sky-500 dark:text-sky-400" aria-hidden="true" />
                    Cap {formatUsdCompact(coin.marketCapUsd)}
                  </span>
                  <span className="tabular-clock">
                    Vol {formatUsdCompact(coin.totalVolumeUsd)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
