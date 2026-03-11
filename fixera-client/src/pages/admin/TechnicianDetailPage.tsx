import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { useToastStore } from '@/store/toast.store'
import { ArrowLeft } from 'lucide-react'

export default function AdminTechnicianDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToastStore()

  const { data: listData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'technicians', id],
    queryFn: async () => {
      const res = await api.get<{ data: { technicians: unknown[] } }>('/api/admin/technicians', { params: { limit: 500 } })
      return res.data.data
    },
    enabled: !!id,
  })
  const technician = (listData?.technicians as { id: string }[] | undefined)?.find((t) => t.id === id)

  const verifyMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      api.patch(`/api/admin/technicians/${id}/verify`, { status, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'technician', id] })
      toast.add('Technician updated', 'success')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (isActive: boolean) => api.patch(`/api/admin/technicians/${id}/toggle-status`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'technician', id] }),
  })

  if (!id) return null
  if (isLoading || !technician) return <LoadingSpinner className="min-h-[40vh]" message="Loading..." />
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />

  const t = technician as { id: string; user?: { name: string; phone: string }; city?: string; rating?: number; verificationStatus?: string; totalReviews?: number; acceptanceRate?: number }
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate(-1)} className="rounded p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold">{t.user?.name ?? 'Technician'}</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p><strong>Phone:</strong> {t.user?.phone}</p>
          <p><strong>City:</strong> {t.city}</p>
          <p><strong>Rating:</strong> {Number(t.rating ?? 0).toFixed(1)}</p>
          <p><strong>Verification:</strong> {t.verificationStatus}</p>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => verifyMutation.mutate({ status: 'APPROVED' })}>Approve</Button>
            <Button variant="destructive" size="sm" onClick={() => verifyMutation.mutate({ status: 'REJECTED' })}>Reject</Button>
            <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate(false)}>Deactivate</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
