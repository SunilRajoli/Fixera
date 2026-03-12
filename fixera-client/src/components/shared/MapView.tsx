import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import { fetchRoute } from '@/lib/osrm'
import { getDistanceMeters } from '@/hooks/useHaversine'

const THROTTLE_METERS = 200

const technicianIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:40px;height:40px">
      <div style="
        position:absolute;inset:0;
        background:#16a34a;border-radius:50%;
        animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
        opacity:0.4;
      "></div>
      <div style="
        position:absolute;inset:4px;
        background:#16a34a;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        color:white;font-size:16px;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
      ">🔧</div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

const customerIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width:36px;height:36px;
      background:#2563eb;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    ">
      <div style="transform:rotate(45deg);font-size:16px">🏠</div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
})

export interface MapViewProps {
  technicianLocation: { latitude: number; longitude: number } | null
  customerLocation: { latitude: number; longitude: number }
  showRoute?: boolean
  height?: string
  eta?: number | null
  onEtaUpdate?: (minutes: number) => void
}

export function MapView({
  technicianLocation,
  customerLocation,
  showRoute = true,
  height = '400px',
  eta = null,
  onEtaUpdate,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const techMarkerRef = useRef<L.Marker | null>(null)
  const customerMarkerRef = useRef<L.Marker | null>(null)
  const routeLayerRef = useRef<L.Polyline | null>(null)
  const lastRouteFetchRef = useRef<{ lat: number; lng: number } | null>(null)

  const fetchAndDrawRoute = useCallback(
    (techLat: number, techLng: number) => {
      if (!mapRef.current || !showRoute) return
      const from = { latitude: techLat, longitude: techLng }
      const to = { latitude: customerLocation.latitude, longitude: customerLocation.longitude }
      fetchRoute(from, to).then(({ coordinates, durationMinutes }) => {
        if (!mapRef.current) return
        if (routeLayerRef.current) {
          mapRef.current.removeLayer(routeLayerRef.current)
          routeLayerRef.current = null
        }
        if (coordinates.length > 0) {
          routeLayerRef.current = L.polyline(coordinates, {
            color: '#2563eb',
            weight: 4,
            opacity: 0.8,
            dashArray: '8, 4',
          }).addTo(mapRef.current)
        }
        if (durationMinutes != null && onEtaUpdate) {
          onEtaUpdate(durationMinutes)
        }
      })
    },
    [customerLocation.latitude, customerLocation.longitude, showRoute, onEtaUpdate]
  )

  // Initialize map once
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return
    if (mapRef.current) return // already initialized (e.g. StrictMode)
    const map = L.map(containerRef.current).setView(
      [customerLocation.latitude, customerLocation.longitude],
      13
    )
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)
    const customerMarker = L.marker([customerLocation.latitude, customerLocation.longitude], {
      icon: customerIcon,
    })
      .addTo(map)
      .bindPopup('Your location')
    customerMarkerRef.current = customerMarker
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      techMarkerRef.current = null
      customerMarkerRef.current = null
      routeLayerRef.current = null
      lastRouteFetchRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- init once

  // Update technician marker and route when location changes
  useEffect(() => {
    if (!mapRef.current) return
    const { latitude: custLat, longitude: custLng } = customerLocation

    if (!technicianLocation) {
      mapRef.current.setView([custLat, custLng], 13)
      return
    }

    const { latitude: techLat, longitude: techLng } = technicianLocation

    if (!techMarkerRef.current) {
      techMarkerRef.current = L.marker([techLat, techLng], { icon: technicianIcon })
        .addTo(mapRef.current)
        .bindPopup('Technician')
    } else {
      techMarkerRef.current.setLatLng([techLat, techLng])
    }

    const bounds = L.latLngBounds(
      [techLat, techLng],
      [custLat, custLng]
    )
    mapRef.current.fitBounds(bounds, { padding: [60, 60] })

    if (showRoute) {
      const last = lastRouteFetchRef.current
      const shouldFetch =
        !last ||
        getDistanceMeters(techLat, techLng, last.lat, last.lng) > THROTTLE_METERS
      if (shouldFetch) {
        lastRouteFetchRef.current = { lat: techLat, lng: techLng }
        fetchAndDrawRoute(techLat, techLng)
      }
    }
  }, [technicianLocation, customerLocation, showRoute, fetchAndDrawRoute])

  if (typeof window === 'undefined') return null

  return (
    <div style={{ position: 'relative', height, zIndex: 0 }} className="map-view-container">
      <div
        ref={containerRef}
        style={{ height: '100%', borderRadius: '12px' }}
        className="min-h-[200px]"
      />
      {eta != null && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 1000,
            background: 'white',
            borderRadius: 12,
            padding: '12px 16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <span style={{ fontSize: 12, color: '#64748b' }}>Estimated arrival</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>
            {eta} min
          </span>
        </div>
      )}
      {technicianLocation && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1000,
            background: 'white',
            borderRadius: 20,
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#16a34a',
              animation: 'ping 1.5s infinite',
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Live</span>
        </div>
      )}
    </div>
  )
}
