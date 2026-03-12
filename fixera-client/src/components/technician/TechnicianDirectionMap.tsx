import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { distanceKm, estimatedMinutes } from '@/lib/geo'

const myPositionIcon = L.divIcon({
  className: 'technician-marker',
  html: '<div style="background:#22c55e;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const destinationIcon = L.divIcon({
  className: 'destination-marker',
  html: '<div style="background:#3b82f6;width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
})

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds.pad(0.25))
  }, [map, points])
  return null
}

interface TechnicianDirectionMapProps {
  destination: { lat: number; lng: number }
}

export function TechnicianDirectionMap({ destination }: TechnicianDirectionMapProps) {
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }
    const updatePosition = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMyPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setError(null)
        },
        () => setError('Could not get your location')
      )
    }
    updatePosition()
    const id = setInterval(updatePosition, 15000)
    return () => clearInterval(id)
  }, [])

  const destPos: [number, number] = [destination.lat, destination.lng]
  const myPos: [number, number] | null = myPosition ? [myPosition.lat, myPosition.lng] : null
  const center = myPos ?? destPos
  const zoom = 13
  const routeLine = myPos ? [myPos, destPos] as [number, number][] : []
  const distKm = myPosition ? distanceKm(myPosition.lat, myPosition.lng, destination.lat, destination.lng) : 0
  const etaMin = estimatedMinutes(distKm)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-500" /> Start (you)
        </span>
        <span className="text-muted-foreground">→</span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-500" style={{ transform: 'rotate(-45deg)' }} /> End (customer)
        </span>
        {myPosition && (
          <span className="ml-auto font-medium text-primary">~{etaMin} min to reach</span>
        )}
      </div>
      <div className="h-[320px] w-full overflow-hidden rounded-lg border bg-muted/30">
        {error ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{error}</div>
        ) : (
          <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={destPos} icon={destinationIcon}>
              <Popup>Customer address (destination)</Popup>
            </Marker>
            {myPos && (
              <>
                <Marker position={myPos} icon={myPositionIcon}>
                  <Popup>Your location</Popup>
                </Marker>
                <Polyline positions={routeLine} color="#3b82f6" weight={4} opacity={0.8} />
                <FitBounds points={routeLine} />
              </>
            )}
          </MapContainer>
        )}
      </div>
    </div>
  )
}
