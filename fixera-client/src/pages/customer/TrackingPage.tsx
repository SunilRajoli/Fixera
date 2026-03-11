import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { format } from 'date-fns'
import type { Booking } from '@/types'
import { BookingStatus } from '@/types'
import { ArrowLeft, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

interface LocationData {
  latitude: number
  longitude: number
  updatedAt?: string
  trackingActive?: boolean
}

export default function TrackingPage() {
  const { id } = useParams<{ id: string }>()
  const [location, setLocation] = useState<LocationData | null>(null)
  const { socket } = useSocket()

  const { data: booking, isLoading, error, refetch } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const res = await api.get<{ data: Booking }>(`/api/bookings/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })

  const { data: locData } = useQuery({
    queryKey: ['technician-location', id],
    queryFn: async () => {
      const res = await api.get<{ data: LocationData }>(`/api/bookings/${id}/technician-location`)
      return res.data.data
    },
    enabled: !!id,
    refetchInterval: 15000,
  })

  useEffect(() => {
    if (locData) setLocation(locData)
  }, [locData])

  useEffect(() => {
    if (!socket || !id) return
    socket.emit('booking:join', { bookingId: id })
    socket.on('technician:location', (data: { latitude: number; longitude: number }) => {
      setLocation((prev) => ({
        ...prev,
        ...data,
        updatedAt: new Date().toISOString(),
        trackingActive: true,
      }))
    })
    return () => {
      socket.off('technician:location')
      socket.emit('booking:leave', { bookingId: id })
    }
  }, [socket, id])

  if (!id) return null
  if (isLoading || !booking) return <LoadingSpinner className="min-h-[40vh]" message="Loading..." />
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />

  const status = booking.status as BookingStatus
  const job = (booking as { job?: { technician?: { user?: { name?: string; phone?: string } } } })?.job

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-4">
        <Link to={`/bookings/${id}`} className="rounded-full p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Track technician</h1>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{job?.technician?.user?.name ?? 'Technician'}</p>
              <StatusBadge status={status} className="mt-1" />
              {job?.technician?.user?.phone && (
                <a href={`tel:${job.technician.user.phone}`} className="mt-2 block text-sm text-primary">
                  Call
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center">
        {location?.latitude != null && location?.longitude != null ? (
          <>
            <MapPin className="mx-auto h-12 w-12 text-primary" />
            <p className="mt-2 font-mono text-sm">
              Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Last updated: {location.updatedAt ? format(new Date(location.updatedAt), 'dd MMM, hh:mm a') : '—'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Map view can be integrated with Google Maps.</p>
          </>
        ) : (
          <LoadingSpinner message="Waiting for technician location..." />
        )}
      </div>
    </div>
  )
}
