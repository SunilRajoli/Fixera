import { useEffect, useRef } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { MapPin } from 'lucide-react'

interface LocationTrackerProps {
  bookingId: string
  active: boolean
}

export function LocationTracker({ bookingId, active }: LocationTrackerProps) {
  const { socket } = useSocket()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!active || !socket || !bookingId) return
    const sendLocation = () => {
      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          socket.emit('location:update', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            bookingId,
          })
        },
        () => {}
      )
    }
    sendLocation()
    intervalRef.current = setInterval(sendLocation, 15000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [active, socket, bookingId])

  if (!active) return null

  return (
    <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <MapPin className="h-4 w-4" />
      Sharing location
    </div>
  )
}
