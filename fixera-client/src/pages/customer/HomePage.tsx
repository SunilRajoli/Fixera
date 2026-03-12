import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { BookingCard } from '@/components/customer/BookingCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { EmptyState } from '@/components/shared/EmptyState'
import { Search } from 'lucide-react'
import type { Service, Booking } from '@/types'
import { BookingStatus } from '@/types'

const ACTIVE_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.MATCHING,
  BookingStatus.ASSIGNED,
  BookingStatus.ACCEPTED,
  BookingStatus.ON_THE_WAY,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
  BookingStatus.PAYMENT_HELD,
  BookingStatus.REASSIGNING,
]

export default function CustomerHome() {
  const { user } = useAuthStore()

  const { data: services = [], isLoading: servicesLoading, error: servicesError } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get<{ data: Service[] }>('/api/services')
      return res.data.data ?? []
    },
  })

  const { data: bookingsData, isLoading: bookingsLoading, error: bookingsError } = useQuery({
    queryKey: ['bookings', 'active'],
    queryFn: async () => {
      const res = await api.get<{ data: Booking[] }>('/api/bookings')
      const list = (res.data.data ?? []) as Booking[]
      return list.filter((b) => ACTIVE_STATUSES.includes(b.status as BookingStatus))
    },
  })

  const activeBookings = (bookingsData ?? []).slice(0, 3)

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-semibold">
        Hey {user?.name ?? 'there'} 👋
      </h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search services..."
          className="w-full rounded-lg border bg-muted/30 py-2 pl-10 pr-4 text-sm"
          readOnly
        />
      </div>
      <section>
        <h2 className="mb-3 font-medium">Services</h2>
        {servicesLoading ? (
          <LoadingSpinner message="Loading services..." />
        ) : servicesError ? (
          <ErrorMessage message={(servicesError as Error).message} />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {services.map((s) => (
              <Link
                key={s.id}
                to={`/bookings/new?service=${s.id}`}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-muted p-4 transition-colors hover:border-primary/50"
              >
                <span className="text-2xl">🔧</span>
                <span className="text-center text-sm font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground">
                  From ₹{Number(s.inspectionFee ?? 0).toLocaleString('en-IN')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Your Active Bookings</h2>
          <Link to="/bookings" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {bookingsLoading ? (
          <LoadingSpinner message="Loading bookings..." />
        ) : bookingsError ? (
          <ErrorMessage message={(bookingsError as Error).message} />
        ) : activeBookings.length === 0 ? (
          <EmptyState
            title="No active bookings"
            description="Create a booking to get started."
            action={
              <Link
                to="/bookings/new"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                New booking
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {activeBookings.map((b) => (
              <BookingCard key={b.id} booking={b} showTrack />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
