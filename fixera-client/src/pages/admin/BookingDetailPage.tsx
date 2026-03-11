import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useDeferredValue } from 'react'
import api from '@/lib/api'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToastStore } from '@/store/toast.store'
import { format } from 'date-fns'
import type { Booking } from '@/types'
import { BookingStatus } from '@/types'
import { Link } from 'react-router-dom'

interface TechnicianOption {
  id: string
  name: string
  phone: string
  city?: string
}

export default function AdminBookingDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const toast = useToastStore()
  const [assignSearch, setAssignSearch] = useState('')
  const [selectedTech, setSelectedTech] = useState<TechnicianOption | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const assignSearchDeferred = useDeferredValue(assignSearch)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [refundOpen, setRefundOpen] = useState(false)

  const { data: booking, isLoading, error, refetch } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const res = await api.get<{ data: Booking }>(`/api/bookings/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })

  const { data: techniciansData } = useQuery({
    queryKey: ['admin', 'technicians', 'assign', assignSearchDeferred],
    queryFn: async () => {
      const res = await api.get<{ data: { technicians: TechnicianOption[] } }>(
        '/api/admin/technicians',
        { params: { limit: 5, search: assignSearchDeferred || undefined } }
      )
      return res.data.data
    },
    enabled: assignOpen,
  })
  const assignOptions = techniciansData?.technicians ?? []

  const assignMutation = useMutation({
    mutationFn: (technicianId: string) => api.post(`/api/admin/bookings/${id}/assign`, { technicianId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      setAssignOpen(false)
      setSelectedTech(null)
      setAssignSearch('')
      toast.add('Technician assigned', 'success')
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.add(e.response?.data?.message ?? 'Assign failed', 'error')
    },
  })

  const refundMutation = useMutation({
    mutationFn: () => api.post(`/api/admin/bookings/${id}/refund`, { amount: Number(refundAmount), reason: refundReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      setRefundOpen(false)
      setRefundAmount('')
      setRefundReason('')
      toast.add('Refund initiated', 'success')
    },
  })

  if (!id) return null
  if (isLoading || !booking) return <LoadingSpinner className="min-h-[40vh]" message="Loading..." />
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />

  const status = booking.status as BookingStatus
  const canAssign = status === BookingStatus.FAILED || status === BookingStatus.MATCHING

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Booking {booking.id.slice(-8)}</h1>
        <StatusBadge status={status} />
      </div>
      <Card>
        <CardHeader className="pb-2">
          <p><strong>Service:</strong> {booking.service?.name}</p>
          <p><strong>Description:</strong> {booking.description}</p>
          <p><strong>Address:</strong> {booking.address}</p>
          <p><strong>Scheduled:</strong> {format(new Date(booking.scheduledTime), 'dd MMM yyyy, hh:mm a')}</p>
          <p><strong>Customer:</strong> {booking.customer?.name} — {booking.customer?.phone}</p>
          {booking.job?.technician && (
            <p><strong>Technician:</strong> {booking.job.technician.user?.name}</p>
          )}
        </CardHeader>
      </Card>
      <div className="flex gap-2">
        {canAssign && (
          <Button onClick={() => setAssignOpen(true)}>Assign technician</Button>
        )}
        <Button variant="outline" onClick={() => setRefundOpen(true)}>Refund</Button>
        {booking.status === BookingStatus.DISPUTED && (
          <Link to={`/admin/disputes/${(booking as { dispute?: { id: string } })?.dispute?.id ?? ''}`}>
            <Button>View dispute</Button>
          </Link>
        )}
      </div>
      <Dialog open={assignOpen} onOpenChange={(open) => {
        setAssignOpen(open)
        if (!open) { setAssignSearch(''); setSelectedTech(null) }
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign technician</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Search by name or phone</Label>
            <Input
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              placeholder="Type to search..."
            />
            <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/30">
              {assignOptions.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">No technicians found. Try a different search.</p>
              )}
              {assignOptions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTech(t)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${selectedTech?.id === t.id ? 'bg-primary/10 font-medium' : ''}`}
                >
                  {t.name} — {t.phone}{t.city ? ` · ${t.city}` : ''}
                </button>
              ))}
            </div>
            {selectedTech && (
              <p className="text-sm text-muted-foreground">Selected: <strong>{selectedTech.name}</strong></p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedTech && assignMutation.mutate(selectedTech.id)}
              disabled={!selectedTech || assignMutation.isPending}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Process refund</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount</Label>
              <Input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
            </div>
            <div>
              <Label>Reason</Label>
              <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Min 5 characters" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>Cancel</Button>
            <Button onClick={() => refundMutation.mutate()} disabled={!refundAmount || refundReason.length < 5}>Refund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
