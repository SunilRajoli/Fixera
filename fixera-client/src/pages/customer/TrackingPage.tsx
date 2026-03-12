import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import api from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'
import { useInterval } from '@/hooks/useInterval'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { MapView } from '@/components/shared/MapView'
import type { Booking } from '@/types'
import { BookingStatus } from '@/types'
import { ArrowLeft, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

interface LocationData {
  latitude: number
  longitude: number
  updatedAt?: string
  trackingActive?: boolean
}

export default function TrackingPage() {
  const { id } = useParams<{ id: string }>()
  const [technicianLocation, setTechnicianLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null)
  const { socket } = useSocket()

  const { data: booking, isLoading, error, refetch } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const res = await api.get<{ data: Booking }>(`/api/bookings/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })

  const { data: locData, refetch: refetchLocation } = useQuery({
    queryKey: ['technician-location', id],
    queryFn: async () => {
      const res = await api.get<{ data: LocationData }>(`/api/bookings/${id}/technician-location`)
      return res.data.data
    },
    enabled: !!id,
    refetchInterval: 15000,
  })

  useInterval(
    () => {
      refetchLocation()
    },
    socket?.connected ? null : 15000
  )

  useEffect(() => {
    if (locData?.latitude != null && locData?.longitude != null) {
      setTechnicianLocation({ latitude: locData.latitude, longitude: locData.longitude })
      setLastUpdated(locData.updatedAt ? new Date(locData.updatedAt) : new Date())
    }
  }, [locData])

  useEffect(() => {
    if (!socket || !id) return
    socket.emit('booking:join', { bookingId: id })
    socket.on('technician:location', (data: { latitude: number; longitude: number }) => {
      setTechnicianLocation({ latitude: data.latitude, longitude: data.longitude })
      setLastUpdated(new Date())
    })
    return () => {
      socket.off('technician:location')
      socket.emit('booking:leave', { bookingId: id })
    }
  }, [socket, id])

  const handleEtaUpdate = useCallback((minutes: number) => {
    setEtaMinutes(minutes)
  }, [])

  if (!id) return null
  if (isLoading || !booking) return <LoadingSpinner className="min-h-[40vh]" message="Loading..." />
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />

  const status = booking.status as BookingStatus
  const job = (booking as { job?: { technician?: { user?: { name?: string; phone?: string } } } })?.job
  const custLat = Number(booking.latitude)
  const custLng = Number(booking.longitude)
  const hasCustomerLocation = Number.isFinite(custLat) && Number.isFinite(custLng)

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-4 border-b bg-card px-4 py-3">
        <Link to={`/bookings/${id}`} className="rounded-full p-2 hover:bg-muted" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Tracking Job</h1>
      </div>

      {hasCustomerLocation ? (
        <div style={{ height: '60vh', minHeight: 320 }}>
          <MapView
            technicianLocation={technicianLocation}
            customerLocation={{ latitude: custLat, longitude: custLng }}
            showRoute={true}
            height="100%"
            eta={etaMinutes}
            onEtaUpdate={handleEtaUpdate}
          />
        </div>
      ) : (
        <div className="flex min-h-[60vh] items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 p-8">
          <p className="text-sm text-muted-foreground">Booking address location not available for map.</p>
        </div>
      )}

      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">🔧 {job?.technician?.user?.name ?? 'Technician'}</p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={status} />
                </div>
                {job?.technician?.user?.phone && (
                  <a
                    href={`tel:${job.technician.user.phone}`}
                    className="mt-2 flex items-center gap-2 text-sm text-primary"
                  >
                    <Phone className="h-4 w-4" /> {job.technician.user.phone}
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-sm text-muted-foreground">
          <p>Status: {status?.replace(/_/g, ' ') ?? '—'}</p>
          {technicianLocation ? (
            <p>
              Last updated: {lastUpdated ? formatDistanceToNow(lastUpdated, { addSuffix: true }) : '—'}
            </p>
          ) : (
            <p>Waiting for technician location...</p>
          )}
          {etaMinutes != null && (
            <p className="mt-1 font-medium text-primary">Estimated arrival: {etaMinutes} min</p>
          )}
        </div>

        {status !== BookingStatus.COMPLETED && status !== BookingStatus.CANCELLED && (
          <Link to={`/bookings/${id}`}>
            <Button variant="outline" className="w-full border-red-500 text-red-600">
              Cancel Booking
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
