import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { GLOBAL_EXCHANGES, getExchangeStatus, type MarketSessionState } from '../utils/markets';

interface MarketStatusBarProps {
  displayDate: Date;
  onSelectCountryIso: (iso: string) => void;
}

function getStateStyles(state: MarketSessionState): { dot: string; text: string } {
  switch (state) {
    case 'open':
      return {
        dot: 'bg-emerald-500 dark:bg-emerald-400',
        text: 'text-emerald-700 dark:text-emerald-300',
      };
    case 'pre':
    case 'after':
    case 'break':
      return {
        dot: 'bg-amber-500 dark:bg-amber-400',
        text: 'text-amber-700 dark:text-amber-300',
      };
    default:
      return {
        dot: 'bg-slate-400 dark:bg-slate-500',
        text: 'text-slate-500 dark:text-slate-400',
      };
  }
}

export const MarketStatusBar: React.FC<MarketStatusBarProps> = React.memo(
  ({ displayDate, onSelectCountryIso }) => {
    // Recompute only when the minute changes so it stays blazing fast
    const minuteBucket = Math.floor(displayDate.getTime() / 60000);

    const statuses = useMemo(() => {
      const sample = new Date(minuteBucket * 60000);
      return GLOBAL_EXCHANGES.map((ex) => getExchangeStatus(ex, sample));
    }, [minuteBucket]);

    const openCount = statuses.filter((s) => s.state === 'open').length;

    return (
      <section
        aria-label="Global stock markets status"
        className="mb-7 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-900/55 dark:shadow-none"
      >
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Global Exchanges
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
              ·
            </span>
            <span className="tabular-clock text-slate-500 dark:text-slate-400">
              {openCount} of {statuses.length} open now
            </span>
          </div>
          <span className="hidden text-[11px] text-slate-400 sm:inline dark:text-slate-500">
            Click an exchange to focus on globe
          </span>
        </div>

        <div className="no-scrollbar flex items-stretch gap-2 overflow-x-auto pb-0.5">
          {statuses.map(({ exchange, state, statusLabel, localTimeStr, detailText }) => {
            const styles = getStateStyles(state);
            return (
              <button
                key={exchange.id}
                type="button"
                onClick={() => onSelectCountryIso(exchange.countryIso)}
                title={`${exchange.name} (${exchange.city}) — ${detailText}`}
                className="group flex min-w-[152px] shrink-0 flex-col justify-between rounded-xl border border-slate-200/75 bg-slate-50/75 px-3 py-2 text-left transition-colors hover:border-sky-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/[0.07] dark:bg-slate-950/45 dark:hover:border-sky-400/35 dark:hover:bg-slate-950/75"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <img
                      src={`https://flagcdn.com/w40/${exchange.countryIso}.png`}
                      alt=""
                      width={16}
                      height={11}
                      referrerPolicy="no-referrer"
                      className="h-3 w-4 shrink-0 rounded-[2px] object-cover ring-1 ring-black/10 dark:ring-white/15"
                    />
                    <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">
                      {exchange.code}
                    </span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap ${styles.text}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} aria-hidden="true" />
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-1.5 flex items-baseline justify-between gap-2 text-[11px]">
                  <span className="tabular-clock font-medium text-slate-700 dark:text-slate-300">
                    {localTimeStr}
                  </span>
                  <span className="truncate text-slate-500 dark:text-slate-400">
                    {detailText}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    );
  }
);

MarketStatusBar.displayName = 'MarketStatusBar';
