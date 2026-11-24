import type { Country } from '../data/countries';
import type { IssPosition } from './iss';

export type SatelliteCategory = 'Space Station' | 'Communications' | 'Weather' | 'Earth Obs.' | 'Navigation' | 'Observatory';
export type OrbitType = 'LEO' | 'SSO-LEO' | 'MEO' | 'GEO';

export interface LiveSatellite {
  id: string;
  name: string;
  shortName: string;
  noradId: number;
  category: SatelliteCategory;
  orbitType: OrbitType;
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKmh: number;
  inclinationDeg: number;
  periodMin: number;
  /** Visual orbital shell radius above unit Earth sphere (r=1.0) */
  globeRadius: number;
  colorHex: string;
  colorInt: number;
  isLiveApi?: boolean;
}

export interface OverheadSatelliteMatch {
  satellite: LiveSatellite;
  distanceKm: number;
  statusLabel: 'Overhead Pass' | 'Regional Horizon' | 'In Orbit';
}

interface OrbitalSatelliteDef {
  id: string;
  name: string;
  shortName: string;
  noradId: number;
  category: SatelliteCategory;
  orbitType: OrbitType;
  altitudeKm: number;
  velocityKmh: number;
  inclinationDeg: number;
  periodSec: number;
  raanOffsetDeg: number; // Right ascension of ascending node anchor
  phaseOffsetRad: number;
  geoLngDeg?: number; // Fixed longitude for GEO satellites
  globeRadius: number;
  colorHex: string;
  colorInt: number;
}

/**
 * Real-world TLE-parameterized satellite constellation (LEO, SSO-LEO, MEO, GEO).
 * Propagated deterministically using Keplerian inclination, orbital period, and Earth sidereal rotation.
 */
const CONSTELLATION_DEFS: readonly OrbitalSatelliteDef[] = [
  {
    id: 'starlink-31420',
    name: 'STARLINK-31420',
    shortName: 'Starlink',
    noradId: 59124,
    category: 'Communications',
    orbitType: 'LEO',
    altitudeKm: 550,
    velocityKmh: 27310,
    inclinationDeg: 53.2,
    periodSec: 5736,
    raanOffsetDeg: 42,
    phaseOffsetRad: 1.15,
    globeRadius: 1.13,
    colorHex: '#38bdf8',
    colorInt: 0x38bdf8,
  },
  {
    id: 'hubble',
    name: 'HUBBLE (HST)',
    shortName: 'Hubble',
    noradId: 20580,
    category: 'Observatory',
    orbitType: 'LEO',
    altitudeKm: 535,
    velocityKmh: 27345,
    inclinationDeg: 28.47,
    periodSec: 5718,
    raanOffsetDeg: 138,
    phaseOffsetRad: 2.65,
    globeRadius: 1.125,
    colorHex: '#fbbf24',
    colorInt: 0xfbbf24,
  },
  {
    id: 'noaa-21',
    name: 'NOAA-21 (JPSS-2)',
    shortName: 'NOAA-21',
    noradId: 54234,
    category: 'Weather',
    orbitType: 'SSO-LEO',
    altitudeKm: 828,
    velocityKmh: 26760,
    inclinationDeg: 98.7,
    periodSec: 6084,
    raanOffsetDeg: -65,
    phaseOffsetRad: 4.1,
    globeRadius: 1.165,
    colorHex: '#0ea5e9',
    colorInt: 0x0ea5e9,
  },
  {
    id: 'sentinel-2a',
    name: 'SENTINEL-2A',
    shortName: 'Sentinel-2A',
    noradId: 40697,
    category: 'Earth Obs.',
    orbitType: 'SSO-LEO',
    altitudeKm: 786,
    velocityKmh: 26845,
    inclinationDeg: 98.62,
    periodSec: 6036,
    raanOffsetDeg: 85,
    phaseOffsetRad: 0.45,
    globeRadius: 1.158,
    colorHex: '#a78bfa',
    colorInt: 0xa78bfa,
  },
  {
    id: 'galileo-28',
    name: 'GALILEO-28 (FOC)',
    shortName: 'Galileo-28',
    noradId: 59598,
    category: 'Navigation',
    orbitType: 'MEO',
    altitudeKm: 23222,
    velocityKmh: 14015,
    inclinationDeg: 56.0,
    periodSec: 50680,
    raanOffsetDeg: 15,
    phaseOffsetRad: 2.1,
    globeRadius: 1.26,
    colorHex: '#f59e0b',
    colorInt: 0xf59e0b,
  },
  {
    id: 'meteosat-12',
    name: 'METEOSAT-12 (MTG)',
    shortName: 'Meteosat-12',
    noradId: 54743,
    category: 'Weather',
    orbitType: 'GEO',
    altitudeKm: 35786,
    velocityKmh: 11070,
    inclinationDeg: 0.8,
    periodSec: 86164,
    raanOffsetDeg: 0,
    phaseOffsetRad: 0,
    geoLngDeg: 0.0,
    globeRadius: 1.35,
    colorHex: '#2dd4bf',
    colorInt: 0x2dd4bf,
  },
  {
    id: 'intelsat-20',
    name: 'INTELSAT-20 (IO)',
    shortName: 'Intelsat-20',
    noradId: 38740,
    category: 'Communications',
    orbitType: 'GEO',
    altitudeKm: 35786,
    velocityKmh: 11070,
    inclinationDeg: 0.5,
    periodSec: 86164,
    raanOffsetDeg: 68.5,
    phaseOffsetRad: 1.4,
    geoLngDeg: 68.5, // Indian Ocean / South Asia / Europe coverage slot
    globeRadius: 1.35,
    colorHex: '#fb7185',
    colorInt: 0xfb7185,
  },
];

function wrapLongitude(lng: number): number {
  const wrapped = ((lng % 360) + 540) % 360 - 180;
  return Number.isNaN(wrapped) ? 0 : wrapped;
}

function computeLatLngAtPhase(def: OrbitalSatelliteDef, tSec: number): { lat: number; lng: number } {
  if (def.orbitType === 'GEO' && typeof def.geoLngDeg === 'number') {
    const dailyPhase = ((tSec % 86164.1) / 86164.1) * Math.PI * 2 + def.phaseOffsetRad;
    return {
      lat: Math.sin(dailyPhase) * def.inclinationDeg,
      lng: wrapLongitude(def.geoLngDeg + Math.cos(dailyPhase) * 0.35),
    };
  }

  const phase = ((tSec % def.periodSec) / def.periodSec) * Math.PI * 2 + def.phaseOffsetRad;
  const incRad = def.inclinationDeg * (Math.PI / 180);

  const sinLat = Math.sin(incRad) * Math.sin(phase);
  const lat = Math.asin(Math.max(-1, Math.min(1, sinLat))) * (180 / Math.PI);

  const orbitLonDeg =
    Math.atan2(Math.cos(incRad) * Math.sin(phase), Math.cos(phase)) * (180 / Math.PI);
  const earthRotDeg = (tSec * 360) / 86164.1;
  const lng = wrapLongitude(orbitLonDeg + def.raanOffsetDeg - earthRotDeg);
  return { lat, lng };
}

/**
 * Propagates all tracked satellites + merges the live ISS telemetry stream.
 */
export function propagateSatellites(nowMs: number, issPosition: IssPosition): LiveSatellite[] {
  const tSec = nowMs / 1000;

  const issSat: LiveSatellite = {
    id: 'iss',
    name: 'ISS (ZARYA)',
    shortName: 'ISS',
    noradId: 25544,
    category: 'Space Station',
    orbitType: 'LEO',
    latitude: issPosition.latitude,
    longitude: issPosition.longitude,
    altitudeKm: issPosition.altitudeKm,
    velocityKmh: issPosition.velocityKmh,
    inclinationDeg: 51.64,
    periodMin: 92.7,
    globeRadius: 1.095,
    colorHex: '#34d399',
    colorInt: 0x34d399,
    isLiveApi: issPosition.isLive,
  };

  const others: LiveSatellite[] = CONSTELLATION_DEFS.map((def) => {
    const { lat, lng } = computeLatLngAtPhase(def, tSec);
    return {
      id: def.id,
      name: def.name,
      shortName: def.shortName,
      noradId: def.noradId,
      category: def.category,
      orbitType: def.orbitType,
      latitude: lat,
      longitude: lng,
      altitudeKm: def.altitudeKm,
      velocityKmh: def.velocityKmh,
      inclinationDeg: def.inclinationDeg,
      periodMin: Math.round((def.periodSec / 60) * 10) / 10,
      globeRadius: def.globeRadius,
      colorHex: def.colorHex,
      colorInt: def.colorInt,
    };
  });

  return [issSat, ...others];
}

/**
 * Generates an instantaneous 3D orbital ring path (lat/lng samples around one full orbit)
 * for visualizing satellite orbital shells around the 3D Earth.
 */
export function buildSatelliteOrbitRing(
  sat: LiveSatellite,
  nowMs: number,
  segments = 72
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];

  if (sat.orbitType === 'GEO') {
    for (let i = 0; i <= segments; i++) {
      const lng = -180 + (i / segments) * 360;
      pts.push([0, lng]);
    }
    return pts;
  }

  const def = CONSTELLATION_DEFS.find((d) => d.id === sat.id);
  const incRad = sat.inclinationDeg * (Math.PI / 180);
  const tSec = nowMs / 1000;
  const earthRotDeg = (tSec * 360) / 86164.1;

  // Align the orbital ring plane with the satellite's current instantaneous longitude
  let ascendingNodeDeg = def ? def.raanOffsetDeg - earthRotDeg : 0;
  if (sat.id === 'iss') {
    // Derive instantaneous ascending node passing through current ISS (lat, lng)
    const sinLatRatio = Math.max(-1, Math.min(1, Math.sin(sat.latitude * (Math.PI / 180)) / Math.sin(incRad)));
    const phaseGuess = Math.asin(sinLatRatio);
    const orbitLonAtPhase =
      Math.atan2(Math.cos(incRad) * Math.sin(phaseGuess), Math.cos(phaseGuess)) * (180 / Math.PI);
    ascendingNodeDeg = sat.longitude - orbitLonAtPhase;
  }

  for (let i = 0; i <= segments; i++) {
    const u = (i / segments) * Math.PI * 2;
    const lat = Math.asin(Math.max(-1, Math.min(1, Math.sin(incRad) * Math.sin(u)))) * (180 / Math.PI);
    const orbitLon = Math.atan2(Math.cos(incRad) * Math.sin(u), Math.cos(u)) * (180 / Math.PI);
    const lng = wrapLongitude(orbitLon + ascendingNodeDeg);
    pts.push([lat, lng]);
  }

  return pts;
}

export function haversineGroundDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Ranks satellites nearest to a selected country and evaluates ISS overhead pass status.
 */
export function getOverheadSatellitesForCountry(
  country: Country,
  satellites: readonly LiveSatellite[]
): {
  issMatch: OverheadSatelliteMatch;
  nearest: OverheadSatelliteMatch[];
} {
  const evaluated: OverheadSatelliteMatch[] = satellites.map((sat) => {
    const distanceKm = Math.round(
      haversineGroundDistanceKm(country.lat, country.lng, sat.latitude, sat.longitude)
    );
    const overheadThreshold = sat.orbitType === 'GEO' ? 6800 : sat.orbitType === 'MEO' ? 5200 : 2400;
    const horizonThreshold = sat.orbitType === 'GEO' ? 9500 : 4800;

    const statusLabel: OverheadSatelliteMatch['statusLabel'] =
      distanceKm <= overheadThreshold
        ? 'Overhead Pass'
        : distanceKm <= horizonThreshold
          ? 'Regional Horizon'
          : 'In Orbit';

    return { satellite: sat, distanceKm, statusLabel };
  });

  const issMatch = evaluated.find((e) => e.satellite.id === 'iss') || evaluated[0];
  const nearest = [...evaluated]
    .filter((e) => e.satellite.id !== 'iss')
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 4);

  return { issMatch, nearest };
}
