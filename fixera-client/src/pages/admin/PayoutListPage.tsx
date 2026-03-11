import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import type { Payout } from '@/types'
import { cn } from '@/lib/utils'

interface PayoutsResponse {
  payouts: Payout[]
  total: number
  pages: number
}

export default function AdminPayoutList() {
  const { data: pendingData } = useQuery({
    queryKey: ['admin', 'payouts', 'PENDING'],
    queryFn: async () => {
      const res = await api.get<{ data: PayoutsResponse }>('/api/admin/payouts', { params: { status: 'PENDING' } })
      return res.data.data
    },
  })
  const { data: allData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'payouts'],
    queryFn: async () => {
      const res = await api.get<{ data: PayoutsResponse }>('/api/admin/payouts')
      return res.data.data
    },
  })

  if (isLoading) return <LoadingSpinner className="min-h-[40vh]" message="Loading payouts..." />
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />

  const payouts = allData?.payouts ?? []
  const pendingTotal = (pendingData?.payouts ?? []).reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Payouts</h1>
        <p className="text-sm font-medium text-muted-foreground">
          Pending total: ₹{pendingTotal.toLocaleString('en-IN')}
        </p>
      </div>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left">Technician</th>
                  <th className="p-2 text-left">Amount</th>
                  <th className="p-2 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {(pendingData?.payouts ?? []).map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-2">{p.technician?.user?.name ?? '—'}</td>
                    <td className="p-2">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                    <td className="p-2">{format(new Date(p.createdAt), 'dd MMM yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left">Technician</th>
                  <th className="p-2 text-left">Amount</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Retries</th>
                  <th className="p-2 text-left">Created</th>
                  <th className="p-2 text-left">Processed</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className={cn(p.status === 'FAILED' && 'bg-red-50')}>
                    <td className="p-2">{p.technician?.user?.name ?? '—'}</td>
                    <td className="p-2">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                    <td className="p-2">{p.status}</td>
                    <td className="p-2">{p.retryCount}</td>
                    <td className="p-2">{format(new Date(p.createdAt), 'dd MMM yyyy')}</td>
                    <td className="p-2">{p.processedAt ? format(new Date(p.processedAt), 'dd MMM yyyy') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
