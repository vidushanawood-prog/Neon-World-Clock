export type MarketSessionState = 'open' | 'pre' | 'after' | 'break' | 'closed';

export interface StockExchangeDef {
  id: string;
  code: string;
  name: string;
  city: string;
  countryIso: string;
  timezone: string;
  preStartMin?: number; // minutes from 00:00 local
  openMin: number;
  lunchStartMin?: number;
  lunchEndMin?: number;
  closeMin: number;
  afterEndMin?: number;
}

export interface ExchangeLiveStatus {
  exchange: StockExchangeDef;
  state: MarketSessionState;
  statusLabel: string;
  localTimeStr: string;
  detailText: string;
}

export const GLOBAL_EXCHANGES: readonly StockExchangeDef[] = [
  {
    id: 'nyse',
    code: 'NYSE',
    name: 'New York Stock Exchange',
    city: 'New York',
    countryIso: 'us',
    timezone: 'America/New_York',
    preStartMin: 4 * 60,
    openMin: 9 * 60 + 30,
    closeMin: 16 * 60,
    afterEndMin: 20 * 60,
  },
  {
    id: 'nasdaq',
    code: 'NASDAQ',
    name: 'Nasdaq Stock Market',
    city: 'New York',
    countryIso: 'us',
    timezone: 'America/New_York',
    preStartMin: 4 * 60,
    openMin: 9 * 60 + 30,
    closeMin: 16 * 60,
    afterEndMin: 20 * 60,
  },
  {
    id: 'lse',
    code: 'LSE',
    name: 'London Stock Exchange',
    city: 'London',
    countryIso: 'gb',
    timezone: 'Europe/London',
    preStartMin: 7 * 60 + 50,
    openMin: 8 * 60,
    closeMin: 16 * 60 + 30,
    afterEndMin: 17 * 60,
  },
  {
    id: 'tse',
    code: 'TSE',
    name: 'Tokyo Stock Exchange',
    city: 'Tokyo',
    countryIso: 'jp',
    timezone: 'Asia/Tokyo',
    preStartMin: 8 * 60,
    openMin: 9 * 60,
    lunchStartMin: 11 * 60 + 30,
    lunchEndMin: 12 * 60 + 30,
    closeMin: 15 * 60 + 30,
  },
  {
    id: 'nse',
    code: 'NSE',
    name: 'National Stock Exchange of India',
    city: 'Mumbai',
    countryIso: 'in',
    timezone: 'Asia/Kolkata',
    preStartMin: 9 * 60,
    openMin: 9 * 60 + 15,
    closeMin: 15 * 60 + 30,
    afterEndMin: 16 * 60,
  },
  {
    id: 'cse',
    code: 'CSE',
    name: 'Colombo Stock Exchange',
    city: 'Colombo',
    countryIso: 'lk',
    timezone: 'Asia/Colombo',
    preStartMin: 9 * 60,
    openMin: 9 * 60 + 30,
    closeMin: 14 * 60 + 30,
  },
  {
    id: 'asx',
    code: 'ASX',
    name: 'Australian Securities Exchange',
    city: 'Sydney',
    countryIso: 'au',
    timezone: 'Australia/Sydney',
    preStartMin: 7 * 60,
    openMin: 10 * 60,
    closeMin: 16 * 60,
  },
];

const exchangeFmtCache = new Map<string, Intl.DateTimeFormat>();

function getExchangeFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = exchangeFmtCache.get(timeZone);
  if (fmt) return fmt;
  fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  exchangeFmtCache.set(timeZone, fmt);
  return fmt;
}

function formatDurationMinutes(totalMins: number): string {
  const safe = Math.max(1, Math.round(totalMins));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatHm(totalMins: number): string {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getExchangeStatus(
  exchange: StockExchangeDef,
  date: Date
): ExchangeLiveStatus {
  const parts = getExchangeFormatter(exchange.timezone).formatToParts(date);
  let weekday = 'Mon';
  let hour = 0;
  let minute = 0;

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.type === 'weekday') weekday = p.value;
    else if (p.type === 'hour') hour = Number(p.value) % 24;
    else if (p.type === 'minute') minute = Number(p.value);
  }

  const localTimeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const nowMin = hour * 60 + minute;

  if (isWeekend) {
    return {
      exchange,
      state: 'closed',
      statusLabel: 'Closed',
      localTimeStr,
      detailText: `Opens Mon ${formatHm(exchange.openMin)}`,
    };
  }

  // Lunch break (e.g., TSE)
  if (
    exchange.lunchStartMin !== undefined &&
    exchange.lunchEndMin !== undefined &&
    nowMin >= exchange.lunchStartMin &&
    nowMin < exchange.lunchEndMin
  ) {
    return {
      exchange,
      state: 'break',
      statusLabel: 'Break',
      localTimeStr,
      detailText: `Resumes in ${formatDurationMinutes(exchange.lunchEndMin - nowMin)}`,
    };
  }

  // Regular Open Session
  if (nowMin >= exchange.openMin && nowMin < exchange.closeMin) {
    const nextEventMin =
      exchange.lunchStartMin !== undefined && nowMin < exchange.lunchStartMin
        ? exchange.lunchStartMin
        : exchange.closeMin;
    const verb =
      exchange.lunchStartMin !== undefined && nowMin < exchange.lunchStartMin
        ? 'Break'
        : 'Closes';
    return {
      exchange,
      state: 'open',
      statusLabel: 'Open',
      localTimeStr,
      detailText: `${verb} in ${formatDurationMinutes(nextEventMin - nowMin)}`,
    };
  }

  // Pre-market
  if (
    exchange.preStartMin !== undefined &&
    nowMin >= exchange.preStartMin &&
    nowMin < exchange.openMin
  ) {
    return {
      exchange,
      state: 'pre',
      statusLabel: 'Pre-Mkt',
      localTimeStr,
      detailText: `Opens in ${formatDurationMinutes(exchange.openMin - nowMin)}`,
    };
  }

  // After-hours
  if (
    exchange.afterEndMin !== undefined &&
    nowMin >= exchange.closeMin &&
    nowMin < exchange.afterEndMin
  ) {
    return {
      exchange,
      state: 'after',
      statusLabel: 'After-Hrs',
      localTimeStr,
      detailText: `Ends in ${formatDurationMinutes(exchange.afterEndMin - nowMin)}`,
    };
  }

  // Closed on weekday
  if (nowMin < exchange.openMin) {
    return {
      exchange,
      state: 'closed',
      statusLabel: 'Closed',
      localTimeStr,
      detailText: `Opens in ${formatDurationMinutes(exchange.openMin - nowMin)}`,
    };
  }

  const nextDayLabel = weekday === 'Fri' ? 'Mon' : 'Tomorrow';
  return {
    exchange,
    state: 'closed',
    statusLabel: 'Closed',
    localTimeStr,
    detailText: `Opens ${nextDayLabel} ${formatHm(exchange.openMin)}`,
  };
}
