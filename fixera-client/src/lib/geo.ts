/**
 * Haversine distance in km between two points.
 */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/** Estimated minutes to reach destination at ~25 km/h average (city). */
export function estimatedMinutes(distanceKm: number, speedKmh = 25): number {
  if (distanceKm <= 0) return 0
  return Math.max(1, Math.ceil((distanceKm / speedKmh) * 60))
}
