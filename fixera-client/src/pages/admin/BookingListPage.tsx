import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import type { Booking } from '@/types'
import { BookingStatus } from '@/types'

export default function AdminBookingList() {
  const { data: list = [], isLoading, error, refetch } = useQuery({
    queryKey: ['bookings', 'admin'],
    queryFn: async () => {
      const res = await api.get<{ data: Booking[] }>('/api/bookings')
      return res.data.data ?? []
    },
  })

  if (isLoading) return <LoadingSpinner className="min-h-[40vh]" message="Loading bookings..." />
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Bookings</h1>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Service</th>
              <th className="p-2 text-left">Technician</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id} className="border-b">
                <td className="p-2 font-mono text-xs">{b.id.slice(-8)}</td>
                <td className="p-2">{(b as Booking).customer?.name ?? '—'}</td>
                <td className="p-2">{(b as Booking).service?.name ?? '—'}</td>
                <td className="p-2">{(b as Booking).job?.technician?.user?.name ?? '—'}</td>
                <td className="p-2"><StatusBadge status={b.status as BookingStatus} /></td>
                <td className="p-2">{format(new Date(b.scheduledTime), 'dd MMM yyyy, HH:mm')}</td>
                <td className="p-2">
                  <Link to={`/admin/bookings/${b.id}`}><Button variant="outline" size="sm">View</Button></Link>
                  {(b.status === BookingStatus.FAILED) && (
                    <Link to={`/admin/bookings/${b.id}`} className="ml-1"><Button size="sm">Assign</Button></Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
