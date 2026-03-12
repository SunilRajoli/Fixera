import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const technicianIcon = L.divIcon({
  className: 'technician-marker',
  html: '<div style="background:#22c55e;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const destinationIcon = L.divIcon({
  className: 'destination-marker',
  html: '<div style="background:#3b82f6;width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
})

function FitBounds({ dest, tech }: { dest: [number, number]; tech: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    const bounds = L.latLngBounds([dest, tech])
    map.fitBounds(bounds.pad(0.3))
  }, [map, dest, tech])
  return null
}

interface TrackingMapProps {
  destination: { lat: number; lng: number }
  technician: { lat: number; lng: number } | null
}

export function TrackingMap({ destination, technician }: TrackingMapProps) {
  const destPos: [number, number] = [destination.lat, destination.lng]
  const techPos: [number, number] | null = technician
    ? [technician.lat, technician.lng]
    : null
  const center = techPos ?? destPos
  const zoom = techPos ? 13 : 14
  const routeLine = techPos ? [techPos, destPos] as [number, number][] : []

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-500" /> Start: Technician
        </span>
        <span className="text-muted-foreground">→</span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-blue-500" style={{ transform: 'rotate(-45deg)' }} /> End: Your address
        </span>
      </div>
      <div className="h-[360px] w-full overflow-hidden rounded-lg border bg-muted/30">
        <MapContainer
          center={center}
          zoom={zoom}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={destPos} icon={destinationIcon}>
            <Popup>End: Your address (destination)</Popup>
          </Marker>
          {techPos && (
            <>
              <Marker position={techPos} icon={technicianIcon}>
                <Popup>Start: Technician (live location)</Popup>
              </Marker>
              <Polyline positions={routeLine} color="#3b82f6" weight={4} opacity={0.8} />
              <FitBounds dest={destPos} tech={techPos} />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  )
}
