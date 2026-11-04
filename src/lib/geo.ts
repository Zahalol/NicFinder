// Geographic helpers. Distances in miles.

const EARTH_RADIUS_MI = 3958.7613;

export function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Bounding box for a radius search (pre-filter before exact haversine). */
export function boundingBox(lat: number, lon: number, radiusMiles: number) {
  const latDelta = radiusMiles / 69.0; // ~69 miles per degree latitude
  const lonDelta =
    radiusMiles / (69.172 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
}

export function metersBetween(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return haversineMiles(lat1, lon1, lat2, lon2) * 1609.344;
}
