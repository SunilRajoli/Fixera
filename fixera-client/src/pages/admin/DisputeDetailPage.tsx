import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToastStore } from '@/store/toast.store'
import type { Dispute } from '@/types'
import { DisputeStatus, DisputeResolution } from '@/types'

export default function AdminDisputeDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const toast = useToastStore()
  const [statusOpen, setStatusOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<DisputeStatus>(DisputeStatus.OPEN)
  const [statusNote, setStatusNote] = useState('')
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolution, setResolution] = useState<DisputeResolution>(DisputeResolution.REFUND_CUSTOMER)
  const [resolveNote, setResolveNote] = useState('')
  const [customerRefund, setCustomerRefund] = useState('')
  const [technicianAmount, setTechnicianAmount] = useState('')

  const { data: dispute, isLoading, error, refetch } = useQuery({
    queryKey: ['dispute', id],
    queryFn: async () => {
      const res = await api.get<{ data: Dispute }>(`/api/disputes/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: () => api.patch(`/api/disputes/${id}/status`, { status: newStatus, note: statusNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', id] })
      setStatusOpen(false)
      toast.add('Status updated', 'success')
    },
  })

  const resolveMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/disputes/${id}/resolve`, {
        resolution,
        note: resolveNote,
        customerRefundAmount: resolution === DisputeResolution.PARTIAL_SPLIT ? Number(customerRefund) : undefined,
        technicianAmount: resolution === DisputeResolution.PARTIAL_SPLIT ? Number(technicianAmount) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', id] })
      setResolveOpen(false)
      toast.add('Dispute resolved', 'success')
    },
  })

  if (!id) return null
  if (isLoading || !dispute) return <LoadingSpinner className="min-h-[40vh]" message="Loading..." />
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />

  const booking = dispute.booking as { repairCost?: number } | undefined
  const repairCost = Number(booking?.repairCost ?? 0)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dispute {dispute.id.slice(-8)}</h1>
      <Card>
        <CardHeader className="pb-2">
          <p><strong>Status:</strong> {dispute.status}</p>
          <p><strong>Reason:</strong> {dispute.reason}</p>
          <p><strong>Raised:</strong> {new Date(dispute.createdAt).toLocaleString()}</p>
          {dispute.adminNote && <p><strong>Admin note:</strong> {dispute.adminNote}</p>}
        </CardHeader>
      </Card>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStatusOpen(true)}>Update status</Button>
        {(dispute.status === DisputeStatus.UNDER_REVIEW || dispute.status === DisputeStatus.ESCALATED) && (
          <Button onClick={() => setResolveOpen(true)}>Resolve dispute</Button>
        )}
      </div>
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as DisputeStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={DisputeStatus.OPEN}>Open</SelectItem>
                  <SelectItem value={DisputeStatus.UNDER_REVIEW}>Under review</SelectItem>
                  <SelectItem value={DisputeStatus.AWAITING_RESPONSE}>Awaiting response</SelectItem>
                  <SelectItem value={DisputeStatus.RESOLVED}>Resolved</SelectItem>
                  <SelectItem value={DisputeStatus.ESCALATED}>Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note</Label>
              <Textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)}>Cancel</Button>
            <Button onClick={() => statusMutation.mutate()}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve dispute</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Resolution</Label>
              <Select value={resolution} onValueChange={(v) => setResolution(v as DisputeResolution)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={DisputeResolution.REFUND_CUSTOMER}>Refund customer</SelectItem>
                  <SelectItem value={DisputeResolution.PAY_TECHNICIAN}>Pay technician</SelectItem>
                  <SelectItem value={DisputeResolution.PARTIAL_SPLIT}>Partial split</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {resolution === DisputeResolution.PARTIAL_SPLIT && (
              <>
                <div>
                  <Label>Customer refund (₹)</Label>
                  <Input type="number" value={customerRefund} onChange={(e) => setCustomerRefund(e.target.value)} />
                </div>
                <div>
                  <Label>Technician amount (₹)</Label>
                  <Input type="number" value={technicianAmount} onChange={(e) => setTechnicianAmount(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">Sum must equal repair cost: ₹{repairCost.toLocaleString('en-IN')}</p>
              </>
            )}
            <div>
              <Label>Note (required)</Label>
              <Textarea value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="Min 5 characters" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>Cancel</Button>
            <Button
              onClick={() => resolveMutation.mutate()}
              disabled={resolveNote.length < 5 || (resolution === DisputeResolution.PARTIAL_SPLIT && (Number(customerRefund) + Number(technicianAmount) !== repairCost))}
            >
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
