/**
 * OSRM public routing API (free, no API key).
 * Returns route geometry and duration. Coordinates are [lng, lat] in response; we swap to [lat, lng] for Leaflet.
 */
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

export interface OSRMRouteResult {
  coordinates: [number, number][] // [lat, lng] for Leaflet
  durationMinutes: number | null
}

export async function fetchRoute(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): Promise<OSRMRouteResult> {
  const url = `${OSRM_BASE}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`
  try {
    const res = await fetch(url)
    if (!res.ok) return { coordinates: [], durationMinutes: null }
    const data = await res.json()
    const route = data.routes?.[0]
    if (!route?.geometry?.coordinates?.length) return { coordinates: [], durationMinutes: null }
    // OSRM returns [lng, lat]; swap to [lat, lng] for Leaflet
    const coordinates = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number])
    const durationMinutes = typeof route.duration === 'number' ? Math.ceil(route.duration / 60) : null
    return { coordinates, durationMinutes }
  } catch {
    return { coordinates: [], durationMinutes: null }
  }
}
