export interface IssPosition {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKmh: number;
  visibility: 'daylight' | 'eclipsed' | string;
  timestamp: number; // ms
  isLive: boolean;
}

/**
 * Deterministic orbital fallback propagator using real ISS Keplerian parameters
 * (inclination ~51.64°, period ~92.68 min, altitude ~420 km, velocity ~27,580 km/h)
 * used gracefully whenever wheretheiss.at is unreachable or rate-limited.
 */
export function estimateIssPosition(nowMs = Date.now()): IssPosition {
  const periodSec = 5560.8; // ~92.68 min
  const tSec = nowMs / 1000;
  // Continuous orbital phase
  const phase = ((tSec % periodSec) / periodSec) * Math.PI * 2;
  const inclinationDeg = 51.64;

  // Approximate latitude oscillation
  const latitude = Math.asin(Math.sin(inclinationDeg * (Math.PI / 180)) * Math.sin(phase)) * (180 / Math.PI);

  // Earth rotation westward drift (-0.004178 deg/sec) + orbital eastward advance
  const earthRotDeg = (tSec * 360) / 86164.1;
  const orbitLonDeg = Math.atan2(
    Math.cos(inclinationDeg * (Math.PI / 180)) * Math.sin(phase),
    Math.cos(phase)
  ) * (180 / Math.PI);

  let longitude = ((orbitLonDeg - earthRotDeg) % 360 + 540) % 360 - 180;
  if (Number.isNaN(longitude)) longitude = 0;

  return {
    latitude,
    longitude,
    altitudeKm: 420.4 + Math.sin(phase) * 3.2,
    velocityKmh: 27585 + Math.cos(phase) * 18,
    visibility: Math.cos(phase) > 0 ? 'daylight' : 'eclipsed',
    timestamp: nowMs,
    isLive: false,
  };
}

export async function fetchIssPosition(): Promise<IssPosition> {
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544', {
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`ISS API HTTP ${res.status}`);
    const data = (await res.json()) as {
      latitude?: number;
      longitude?: number;
      altitude?: number;
      velocity?: number;
      visibility?: string;
      timestamp?: number;
    };

    if (
      typeof data.latitude === 'number' &&
      typeof data.longitude === 'number' &&
      typeof data.altitude === 'number' &&
      typeof data.velocity === 'number'
    ) {
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        altitudeKm: data.altitude,
        velocityKmh: data.velocity,
        visibility: data.visibility || 'daylight',
        timestamp: (data.timestamp ? data.timestamp * 1000 : Date.now()),
        isLive: true,
      };
    }
  } catch {
    // Graceful orbital propagation fallback
  }

  return estimateIssPosition(Date.now());
}
