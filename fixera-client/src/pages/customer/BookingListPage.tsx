import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { BookingCard } from '@/components/customer/BookingCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { EmptyState } from '@/components/shared/EmptyState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Booking } from '@/types'
import { BookingStatus } from '@/types'

const ACTIVE = [
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
const TERMINAL = [
  BookingStatus.CLOSED,
  BookingStatus.CANCELLED,
  BookingStatus.FAILED,
  BookingStatus.DISPUTED,
  BookingStatus.CONFIRMED,
]

export default function BookingListPage() {
  const { data: list = [], isLoading, error, refetch } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get<{ data: Booking[] }>('/api/bookings')
      return res.data.data ?? []
    },
  })

  const active = list.filter((b) => ACTIVE.includes(b.status as BookingStatus))
  const past = list.filter((b) => TERMINAL.includes(b.status as BookingStatus))

  if (isLoading) return <LoadingSpinner className="min-h-[40vh]" message="Loading bookings..." />
  if (error) return <ErrorMessage className="min-h-[40vh]" message={(error as Error).message} onRetry={() => refetch()} />

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Bookings</h1>
      <Tabs defaultValue="active">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4 space-y-3">
          {active.length === 0 ? (
            <EmptyState title="No active bookings" description="Your active bookings will appear here." />
          ) : (
            active.map((b) => <BookingCard key={b.id} booking={b} showTrack />)
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-4 space-y-3">
          {past.length === 0 ? (
            <EmptyState title="No past bookings" description="Completed or cancelled bookings appear here." />
          ) : (
            past.map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
