import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import type { Dispute } from '@/types'
import { DisputeStatus } from '@/types'

interface DisputesResponse {
  disputes: Dispute[]
  total: number
  pages: number
}

export default function AdminDisputeList() {
  const { data: openData, isLoading: openLoading } = useQuery({
    queryKey: ['admin', 'disputes', 'OPEN'],
    queryFn: async () => {
      const res = await api.get<{ data: DisputesResponse }>('/api/disputes', { params: { status: DisputeStatus.OPEN } })
      return res.data.data
    },
  })
  const { data: allData, isLoading: allLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'disputes'],
    queryFn: async () => {
      const res = await api.get<{ data: DisputesResponse }>('/api/disputes')
      return res.data.data
    },
  })

  const isLoading = openLoading || allLoading
  const openCount = openData?.disputes?.length ?? 0

  if (isLoading) return <LoadingSpinner className="min-h-[40vh]" message="Loading disputes..." />
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />

  const disputes = allData?.disputes ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Disputes</h1>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="open">Open ({openCount})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="mt-4">
          <div className="space-y-2">
            {(openData?.disputes ?? []).map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{d.id.slice(-8)}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{d.reason}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(d.createdAt), 'dd MMM yyyy')}</p>
                  </div>
                  <Link to={`/admin/disputes/${d.id}`}><Button size="sm">View</Button></Link>
                </div>
              </Card>
            ))}
            {openCount === 0 && <p className="text-sm text-muted-foreground">No open disputes.</p>}
          </div>
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Booking</th>
                  <th className="p-2 text-left">Reason</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => (
                  <tr key={d.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{d.id.slice(-8)}</td>
                    <td className="p-2">{(d.booking as { id?: string })?.id?.slice(-8) ?? '—'}</td>
                    <td className="p-2 max-w-[200px] truncate">{d.reason}</td>
                    <td className="p-2">{d.status}</td>
                    <td className="p-2">{format(new Date(d.createdAt), 'dd MMM yyyy')}</td>
                    <td className="p-2"><Link to={`/admin/disputes/${d.id}`}><Button size="sm" variant="outline">View</Button></Link></td>
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
