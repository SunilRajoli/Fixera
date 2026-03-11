import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TechItem {
  id: string
  name: string
  phone: string
  rating: number
  totalJobs: number
  completedJobs: number
  acceptanceRate: number
  totalEarned: number
  city: string
  verificationStatus: string
}

export default function AdminTechnicianList() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'technicians'],
    queryFn: async () => {
      const res = await api.get<{ data: { technicians: TechItem[]; total: number } }>('/api/admin/technicians')
      return res.data.data
    },
  })

  if (isLoading || !data) return <LoadingSpinner className="min-h-[40vh]" message="Loading..." />
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />

  const technicians = data.technicians ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Technicians</h1>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Phone</th>
              <th className="p-2 text-left">City</th>
              <th className="p-2 text-left">Rating</th>
              <th className="p-2 text-left">Jobs</th>
              <th className="p-2 text-left">Acceptance</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {technicians.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="p-2 font-medium">{t.name}</td>
                <td className="p-2">{t.phone}</td>
                <td className="p-2">{t.city}</td>
                <td className="p-2">{Number(t.rating).toFixed(1)}</td>
                <td className="p-2">{t.completedJobs} / {t.totalJobs}</td>
                <td className="p-2">{(Number(t.acceptanceRate) * 100).toFixed(0)}%</td>
                <td className="p-2">
                  <span className={cn(
                    'rounded px-2 py-0.5 text-xs',
                    t.verificationStatus === 'APPROVED' && 'bg-green-100 text-green-800',
                    t.verificationStatus === 'PENDING' && 'bg-yellow-100 text-yellow-800',
                    t.verificationStatus === 'REJECTED' && 'bg-red-100 text-red-800'
                  )}>
                    {t.verificationStatus}
                  </span>
                </td>
                <td className="p-2">
                  <Link to={`/admin/technicians/${t.id}`}><Button variant="outline" size="sm">View</Button></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
