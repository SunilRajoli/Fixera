import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { StatsCard } from '@/components/admin/StatsCard'
import { RealtimeAlerts } from '@/components/admin/RealtimeAlerts'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { format } from 'date-fns'
import type { Booking } from '@/types'
import { BookingStatus } from '@/types'

interface DashboardStats {
  bookings: {
    total: number
    today: number
    pending: number
    inProgress: number
    completed: number
    cancelled: number
    failed: number
    disputed: number
  }
  revenue: {
    totalCollected: number
    totalCommission: number
    totalPayouts: number
    pendingPayouts: number
  }
  technicians: { total: number; active: number; pendingVerification: number; suspended: number }
  customers: { total: number; newToday: number }
  disputes: { open: number; underReview: number; resolved: number }
}

export default function AdminDashboard() {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const res = await api.get<{ data: DashboardStats }>('/api/admin/dashboard')
      return res.data.data
    },
    refetchInterval: 60000,
  })

  const { data: recentBookings = [] } = useQuery({
    queryKey: ['bookings', 'admin-recent'],
    queryFn: async () => {
      const res = await api.get<{ data: Booking[] }>('/api/bookings')
      return (res.data.data ?? []).slice(0, 10)
    },
  })

  if (isLoading || !stats) return <LoadingSpinner className="min-h-[40vh]" message="Loading dashboard..." />
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Bookings today" value={stats.bookings.today} />
        <StatsCard title="Active jobs" value={stats.bookings.inProgress + stats.bookings.pending} />
        <StatsCard title="Open disputes" value={stats.disputes.open} />
        <StatsCard title="Pending payouts (₹)" value={Number(stats.revenue.pendingPayouts).toLocaleString('en-IN')} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-medium">Recent bookings</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Service</th>
                  <th className="p-2 text-left">Customer</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Time</th>
                  <th className="p-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{b.id.slice(-8)}</td>
                    <td className="p-2">{(b as Booking).service?.name ?? '—'}</td>
                    <td className="p-2">{(b as Booking).customer?.name ?? '—'}</td>
                    <td className="p-2"><StatusBadge status={b.status as BookingStatus} /></td>
                    <td className="p-2">{format(new Date(b.scheduledTime), 'dd MMM, HH:mm')}</td>
                    <td className="p-2">
                      <Link to={`/admin/bookings/${b.id}`} className="text-primary hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <RealtimeAlerts />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <StatsCard title="Revenue collected (₹)" value={Number(stats.revenue.totalCollected).toLocaleString('en-IN')} />
        <StatsCard title="Commission (₹)" value={Number(stats.revenue.totalCommission).toLocaleString('en-IN')} />
        <StatsCard title="Technicians" value={`${stats.technicians.active} / ${stats.technicians.total} online`} />
        <StatsCard title="Customers" value={stats.customers.total} />
      </div>
    </div>
  )
}
