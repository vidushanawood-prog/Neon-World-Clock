export type CallStatusLevel = 'good' | 'window' | 'sleeping';

export interface CallStatusInfo {
  level: CallStatusLevel;
  label: string;
  detail: string;
}

export interface FormattedClockData {
  hours: string;
  minutes: string;
  seconds: string;
  dayPeriod: string; // 'AM' | 'PM' | ''
  hour24: number;
  minuteNum: number;
  secondNum: number;
  fullDate: string; // e.g., "Monday, Nov 23, 2026"
  shortDate: string; // e.g., "Mon, Nov 23"
  utcOffset: string; // e.g., "UTC+05:30"
  offsetMinutes: number;
  isDaytime: boolean; // 6:00 AM - 5:59 PM
  callStatus: CallStatusInfo;
  dayDeltaLabel: string; // 'Today' | 'Tomorrow' | 'Yesterday' | ''
  copyText: string;
  dateKey: string; // YYYY-MM-DD in target tz
}

interface TimeZoneFormatterBundle {
  parts12: Intl.DateTimeFormat;
  parts24: Intl.DateTimeFormat;
  dateFull: Intl.DateTimeFormat;
  dateShort: Intl.DateTimeFormat;
  offsetFmt: Intl.DateTimeFormat;
  resolvedTz: string;
}

const formatterCache = new Map<string, TimeZoneFormatterBundle>();

const TZ_FALLBACKS: Record<string, string> = {
  'Europe/Kyiv': 'Europe/Kiev',
  'Asia/Yangon': 'Asia/Rangoon',
  'Asia/Kolkata': 'Asia/Calcutta',
  'Asia/Ho_Chi_Minh': 'Asia/Saigon',
};

function resolveValidTimeZone(tz: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    const fallback = TZ_FALLBACKS[tz];
    if (fallback) {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: fallback });
        return fallback;
      } catch {
        return 'UTC';
      }
    }
    return 'UTC';
  }
}

function getBundle(timeZone: string): TimeZoneFormatterBundle {
  let bundle = formatterCache.get(timeZone);
  if (bundle) return bundle;

  const resolvedTz = resolveValidTimeZone(timeZone);

  bundle = {
    resolvedTz,
    parts12: new Intl.DateTimeFormat('en-US', {
      timeZone: resolvedTz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
    parts24: new Intl.DateTimeFormat('en-US', {
      timeZone: resolvedTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }),
    dateFull: new Intl.DateTimeFormat('en-US', {
      timeZone: resolvedTz,
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    dateShort: new Intl.DateTimeFormat('en-US', {
      timeZone: resolvedTz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    offsetFmt: new Intl.DateTimeFormat('en-US', {
      timeZone: resolvedTz,
      timeZoneName: 'longOffset',
    }),
  };

  formatterCache.set(timeZone, bundle);
  return bundle;
}

export function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getCallStatus(hour24: number, minute: number): CallStatusInfo {
  const totalMinutes = hour24 * 60 + minute;
  // 8:00 AM (480) to 9:30 PM (1290) -> Good to Call
  if (totalMinutes >= 480 && totalMinutes < 1290) {
    return {
      level: 'good',
      label: 'Good to Call',
      detail: 'Awake hours (8:00 AM – 9:30 PM)',
    };
  }
  // 6:00 AM - 8:00 AM (360..480) or 9:30 PM - 11:00 PM (1290..1380) -> Early / Late Window
  if ((totalMinutes >= 360 && totalMinutes < 480) || (totalMinutes >= 1290 && totalMinutes < 1380)) {
    return {
      level: 'window',
      label: 'Early / Late',
      detail: totalMinutes < 480 ? 'Early morning (6:00 – 8:00 AM)' : 'Late evening (9:30 – 11:00 PM)',
    };
  }
  // 11:00 PM - 6:00 AM -> Sleeping Hours
  return {
    level: 'sleeping',
    label: 'Sleeping',
    detail: 'Sleeping hours (11:00 PM – 6:00 AM)',
  };
}

export function getDatePartsInZone(date: Date, timeZone: string) {
  const bundle = getBundle(timeZone);
  const parts = bundle.parts24.formatToParts(date);

  let year = 1970;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.type === 'year') year = Number(p.value);
    else if (p.type === 'month') month = Number(p.value);
    else if (p.type === 'day') day = Number(p.value);
    else if (p.type === 'hour') hour = Number(p.value) % 24;
    else if (p.type === 'minute') minute = Number(p.value);
    else if (p.type === 'second') second = Number(p.value);
  }

  return { year, month, day, hour, minute, second };
}

function extractUtcOffset(bundle: TimeZoneFormatterBundle, date: Date): { label: string; minutes: number } {
  const parts = bundle.offsetFmt.formatToParts(date);
  let raw = 'GMT';
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].type === 'timeZoneName') {
      raw = parts[i].value;
      break;
    }
  }

  if (raw === 'GMT' || raw === 'UTC') {
    return { label: 'UTC+00:00', minutes: 0 };
  }

  const match = raw.match(/([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) {
    return { label: raw.replace('GMT', 'UTC'), minutes: 0 };
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hrs = parseInt(match[2], 10);
  const mins = match[3] ? parseInt(match[3], 10) : 0;
  const totalMinutes = sign * (hrs * 60 + mins);
  const padH = String(hrs).padStart(2, '0');
  const padM = String(mins).padStart(2, '0');

  return {
    label: `UTC${match[1]}${padH}:${padM}`,
    minutes: totalMinutes,
  };
}

export function formatClockForZone(
  date: Date,
  timeZone: string,
  is24Hour: boolean,
  referenceDateKey?: string
): FormattedClockData {
  const bundle = getBundle(timeZone);
  const p24 = getDatePartsInZone(date, timeZone);

  let hours = String(p24.hour).padStart(2, '0');
  let minutes = String(p24.minute).padStart(2, '0');
  let seconds = String(p24.second).padStart(2, '0');
  let dayPeriod = '';

  if (!is24Hour) {
    const parts12 = bundle.parts12.formatToParts(date);
    for (let i = 0; i < parts12.length; i++) {
      const p = parts12[i];
      if (p.type === 'hour') hours = p.value;
      else if (p.type === 'minute') minutes = p.value;
      else if (p.type === 'second') seconds = p.value;
      else if (p.type === 'dayPeriod') dayPeriod = p.value.toUpperCase();
    }
  }

  const fullDate = bundle.dateFull.format(date);
  const shortDate = bundle.dateShort.format(date);
  const { label: utcOffset, minutes: offsetMinutes } = extractUtcOffset(bundle, date);
  const isDaytime = p24.hour >= 6 && p24.hour < 18;
  const callStatus = getCallStatus(p24.hour, p24.minute);

  const dateKey = `${p24.year}-${String(p24.month).padStart(2, '0')}-${String(p24.day).padStart(2, '0')}`;

  let dayDeltaLabel = '';
  if (referenceDateKey) {
    if (dateKey === referenceDateKey) {
      dayDeltaLabel = 'Today';
    } else if (dateKey > referenceDateKey) {
      dayDeltaLabel = 'Tomorrow';
    } else {
      dayDeltaLabel = 'Yesterday';
    }
  }

  const timeString = is24Hour
    ? `${hours}:${minutes}:${seconds}`
    : `${hours}:${minutes}:${seconds} ${dayPeriod}`;

  return {
    hours,
    minutes,
    seconds,
    dayPeriod,
    hour24: p24.hour,
    minuteNum: p24.minute,
    secondNum: p24.second,
    fullDate,
    shortDate,
    utcOffset,
    offsetMinutes,
    isDaytime,
    callStatus,
    dayDeltaLabel,
    copyText: `${timeString} · ${fullDate} (${utcOffset})`,
    dateKey,
  };
}

export function zonedWallTimeToUtcDate(
  dateStr: string,
  timeStr: string,
  timeZone: string
): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);

  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) {
    return new Date();
  }

  const targetAsUtc = Date.UTC(y, m - 1, d, hh, mm, 0);
  let guess = targetAsUtc;

  for (let i = 0; i < 3; i++) {
    const parts = getDatePartsInZone(new Date(guess), timeZone);
    const guessAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    const diff = targetAsUtc - guessAsUtc;
    guess += diff;
    if (diff === 0) break;
  }

  return new Date(guess);
}

export function toDateInputValue(date: Date, timeZone: string): string {
  const p = getDatePartsInZone(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function toTimeInputValue(date: Date, timeZone: string): string {
  const p = getDatePartsInZone(date, timeZone);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

export function formatPopulation(pop: number): string {
  if (pop >= 1_000_000_000) return `${(pop / 1_000_000_000).toFixed(2)}B`;
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(0)}K`;
  return String(pop);
}
