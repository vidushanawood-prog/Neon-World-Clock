import { getDatePartsInZone } from './time';

export type SeasonName = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

export interface SeasonInfo {
  season: SeasonName;
  hemisphere: 'Northern' | 'Southern';
}

export interface DaylightInfo {
  sunriseStr: string;
  sunsetStr: string;
  daylightHoursStr: string;
  daylightMinutes: number;
  progressPercent: number; // 0..100 across daylight window (0 before sunrise, 100 after sunset)
  isPolarDay: boolean;
  isPolarNight: boolean;
  isAfterSunriseBeforeSunset: boolean;
}

/**
 * Determines astronomical season from local month/day and latitude hemisphere.
 */
export function getSeasonInfo(
  lat: number,
  date: Date,
  timeZone: string
): SeasonInfo {
  const { month, day } = getDatePartsInZone(date, timeZone);
  const md = month * 100 + day; // e.g., Mar 20 => 320
  const isNorthern = lat >= 0;

  let northSeason: SeasonName;
  if (md >= 320 && md < 621) northSeason = 'Spring';
  else if (md >= 621 && md < 922) northSeason = 'Summer';
  else if (md >= 922 && md < 1221) northSeason = 'Autumn';
  else northSeason = 'Winter';

  if (isNorthern) {
    return { season: northSeason, hemisphere: 'Northern' };
  }

  const opposite: Record<SeasonName, SeasonName> = {
    Spring: 'Autumn',
    Summer: 'Winter',
    Autumn: 'Spring',
    Winter: 'Summer',
  };

  return { season: opposite[northSeason], hemisphere: 'Southern' };
}

function getDayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 0);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86_400_000);
}

function formatMinutesAsClock(totalMins: number, is24Hour: boolean): string {
  const normalized = ((Math.round(totalMins) % 1440) + 1440) % 1440;
  const h24 = Math.floor(normalized / 60);
  const m = normalized % 60;
  const mm = String(m).padStart(2, '0');
  if (is24Hour) {
    return `${String(h24).padStart(2, '0')}:${mm}`;
  }
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${mm} ${period}`;
}

/**
 * Computes accurate local sunrise, sunset, daylight duration, and solar progress
 * using NOAA solar declination & equation-of-time approximations.
 */
export function getDaylightInfo(
  lat: number,
  lng: number,
  date: Date,
  timeZone: string,
  offsetMinutes: number,
  is24Hour: boolean
): DaylightInfo {
  const parts = getDatePartsInZone(date, timeZone);
  const doy = getDayOfYear(parts.year, parts.month, parts.day);
  const currentLocalMin = parts.hour * 60 + parts.minute + parts.second / 60;

  // Fractional year (radians)
  const gamma = ((2 * Math.PI) / 365) * (doy - 1);

  // Equation of time (minutes)
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar declination angle (radians)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const latRad = (lat * Math.PI) / 180;
  // Standard atmospheric refraction zenith = 90.833 deg
  const zenithRad = (90.833 * Math.PI) / 180;

  const cosHa =
    Math.cos(zenithRad) / (Math.cos(latRad) * Math.cos(decl)) -
    Math.tan(latRad) * Math.tan(decl);

  // Handle extreme polar day / polar night gracefully
  if (cosHa <= -1) {
    return {
      sunriseStr: '24h Sun',
      sunsetStr: 'Polar Day',
      daylightHoursStr: '24h 00m',
      daylightMinutes: 1440,
      progressPercent: Math.round((currentLocalMin / 1440) * 100),
      isPolarDay: true,
      isPolarNight: false,
      isAfterSunriseBeforeSunset: true,
    };
  }
  if (cosHa >= 1) {
    return {
      sunriseStr: 'Polar Night',
      sunsetStr: '0h Sun',
      daylightHoursStr: '0h 00m',
      daylightMinutes: 0,
      progressPercent: 0,
      isPolarDay: false,
      isPolarNight: true,
      isAfterSunriseBeforeSunset: false,
    };
  }

  const haDeg = (Math.acos(cosHa) * 180) / Math.PI;
  const solarNoonMin = 720 - 4 * lng - eqTime + offsetMinutes;
  const sunriseMin = solarNoonMin - 4 * haDeg;
  const sunsetMin = solarNoonMin + 4 * haDeg;
  const daylightMinutes = Math.max(0, Math.round(sunsetMin - sunriseMin));

  const hrs = Math.floor(daylightMinutes / 60);
  const mins = daylightMinutes % 60;
  const daylightHoursStr = `${hrs}h ${String(mins).padStart(2, '0')}m`;

  let progressPercent = 0;
  let isAfterSunriseBeforeSunset = false;
  if (currentLocalMin <= sunriseMin) {
    progressPercent = 0;
  } else if (currentLocalMin >= sunsetMin) {
    progressPercent = 100;
  } else {
    progressPercent = Math.round(
      ((currentLocalMin - sunriseMin) / (sunsetMin - sunriseMin)) * 100
    );
    isAfterSunriseBeforeSunset = true;
  }

  return {
    sunriseStr: formatMinutesAsClock(sunriseMin, is24Hour),
    sunsetStr: formatMinutesAsClock(sunsetMin, is24Hour),
    daylightHoursStr,
    daylightMinutes,
    progressPercent,
    isPolarDay: false,
    isPolarNight: false,
    isAfterSunriseBeforeSunset,
  };
}
