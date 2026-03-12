import { useState, useCallback } from 'react'

/**
 * One-shot geolocation for booking form (customer address).
 * Call getCurrentPosition() to fetch; latitude/longitude and loading reflect state.
 */
export function useBookingGeolocation() {
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const getCurrentPosition = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setLoading(false)
      },
      () => setLoading(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  return { latitude, longitude, getCurrentPosition, loading }
}
