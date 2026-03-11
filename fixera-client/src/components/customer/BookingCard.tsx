import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { MapPin, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import type { Booking } from '@/types'
import { BookingStatus } from '@/types'
interface BookingCardProps {
  booking: Booking
  showTrack?: boolean
}

export function BookingCard({ booking, showTrack }: BookingCardProps) {
  const status = (booking.status as BookingStatus) ?? BookingStatus.PENDING
  const canTrack = showTrack && (status === BookingStatus.ON_THE_WAY || status === BookingStatus.IN_PROGRESS)

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{booking.service?.name ?? 'Service'}</p>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              {format(new Date(booking.scheduledTime), 'dd MMM yyyy, hh:mm a')}
            </div>
            {booking.address && (
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{booking.address}</span>
              </div>
            )}
            {(booking as { job?: { technician?: { user?: { name?: string } } } })?.job?.technician?.user?.name && (
              <p className="mt-1 text-sm">Technician: {(booking as { job?: { technician?: { user?: { name?: string } } } }).job?.technician?.user?.name}</p>
            )}
          </div>
          <StatusBadge status={status} />
        </div>
        <div className="mt-3 flex gap-2">
          {canTrack && (
            <Link to={`/bookings/${booking.id}/track`}>
              <Button variant="outline" size="sm">Track</Button>
            </Link>
          )}
          <Link to={`/bookings/${booking.id}`}>
            <Button size="sm">View</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
