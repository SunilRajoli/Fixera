import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { format } from 'date-fns'
import type { Booking } from '@/types'

interface BookingWithPayment extends Booking {
  payment?: { id: string; amount: number; status: string; paymentMethod: string }
}

function statusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case 'CAPTURED':
      return 'text-green-600'
    case 'PENDING':
      return 'text-yellow-600'
    case 'REFUNDED':
      return 'text-blue-600'
    case 'FAILED':
      return 'text-red-600'
    default:
      return 'text-muted-foreground'
  }
}

export default function PaymentHistoryPage() {
  const navigate = useNavigate()

  const { data: bookings = [], isLoading, error, refetch } = useQuery({
    queryKey: ['bookings', 'all'],
    queryFn: async () => {
      const res = await api.get<{ data: BookingWithPayment[] }>('/api/bookings')
      return res.data.data ?? []
    },
  })

  const withPayments = bookings.filter((b) => b.payment)
  const totalSpent = withPayments.reduce((sum, b) => sum + Number(b.payment?.amount ?? 0), 0)
  const sorted = [...withPayments].sort((a, b) => {
    const dateA = new Date(a.scheduledTime).getTime()
    const dateB = new Date(b.scheduledTime).getTime()
    return dateB - dateA
  })

  if (isLoading) return <LoadingSpinner className="min-h-[40vh]" message="Loading..." />
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Payment History</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-xl font-bold">₹{totalSpent.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Bookings</p>
            <p className="text-xl font-bold">{withPayments.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No payments yet</p>
        ) : (
          sorted.map((booking) => {
            const pay = booking.payment!
            const isInspection = Number(pay.amount) === Number(booking.inspectionFee)
            const label = isInspection ? 'Inspection Fee' : 'Repair Payment'
            const payDate = booking.scheduledTime
            return (
              <button
                key={booking.id}
                type="button"
                onClick={() => navigate(`/bookings/${booking.id}`)}
                className="w-full text-left"
              >
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="p-4">
                    <p className="font-medium">🔧 {booking.service?.name ?? 'Service'}</p>
                    <p className="text-sm text-muted-foreground">
                      {label} — ₹{Number(pay.amount).toLocaleString('en-IN')}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {format(new Date(payDate), 'dd MMM yyyy')} • {pay.paymentMethod}{' '}
                      <span className={statusColor(pay.status)}>
                        {pay.status?.toUpperCase() ?? '—'} ✓
                      </span>
                    </p>
                  </CardContent>
                </Card>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
