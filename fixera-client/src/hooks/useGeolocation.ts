import { useEffect, useState } from 'react'

export interface GeolocationState {
  latitude: number
  longitude: number
  error: string | null
}

/**
 * Watch technician's current position (for JobDetailPage map).
 * Updates when position changes.
 */
export function useGeolocation(enabled: boolean): GeolocationState | null {
  const [state, setState] = useState<GeolocationState | null>(null)

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) {
      setState(null)
      return
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          error: null,
        })
      },
      () => {
        setState((prev) =>
          prev ? { ...prev, error: 'Enable location to see your position on map' } : null
        )
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enabled])

  return state
}
