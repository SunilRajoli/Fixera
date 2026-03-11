import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { useSocket } from '@/hooks/useSocket'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToastStore } from '@/store/toast.store'
import { format } from 'date-fns'
import { BookingStatus } from '@/types'
import type { Booking } from '@/types'
import { Phone, MapPin, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = ['Pending', 'Matching', 'Assigned', 'Accepted', 'On the way', 'In progress', 'Completed', 'Confirmed', 'Closed']
const STEP_MAP: Record<string, number> = {
  PENDING: 0,
  MATCHING: 1,
  ASSIGNED: 2,
  ACCEPTED: 3,
  ON_THE_WAY: 4,
  IN_PROGRESS: 5,
  COMPLETED: 6,
  PAYMENT_HELD: 6,
  CONFIRMED: 7,
  CLOSED: 8,
}

export default function CustomerBookingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const toast = useToastStore()
  const { socket, isConnected } = useSocket()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')

  const { data: booking, isLoading, error, refetch } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const res = await api.get<{ data: Booking }>(`/api/bookings/${id}`)
      return res.data.data
    },
    enabled: !!id,
    refetchInterval: 30000,
  })

  useEffect(() => {
    if (!socket || !id || !user) return
    socket.emit('booking:join', { bookingId: id })
    const onStatus = () => refetch()
    socket.on('booking:status-changed', onStatus)
    return () => {
      socket.off('booking:status-changed', onStatus)
      socket.emit('booking:leave', { bookingId: id })
    }
  }, [socket, id, user, refetch])

  const confirmMutation = useMutation({
    mutationFn: () => api.post(`/api/bookings/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      setConfirmOpen(false)
      toast.add('Booking confirmed. Payment released to technician.', 'success')
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.add(e.response?.data?.message ?? 'Failed to confirm', 'error')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => api.post(`/api/bookings/${id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      setCancelOpen(false)
      setCancelReason('')
      toast.add('Booking cancelled', 'info')
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.add(e.response?.data?.message ?? 'Failed to cancel', 'error')
    },
  })

  const reviewMutation = useMutation({
    mutationFn: (data: { rating: number; comment?: string }) =>
      api.post('/api/reviews', { bookingId: id, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      toast.add('Review submitted', 'success')
    },
  })

  const disputeMutation = useMutation({
    mutationFn: (reason: string) => api.post('/api/disputes', { bookingId: id, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      setDisputeOpen(false)
      setDisputeReason('')
      toast.add('Dispute raised', 'info')
    },
  })

  if (!id) return null
  if (isLoading || !booking) return <LoadingSpinner className="min-h-[40vh]" message="Loading..." />
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />

  const status = booking.status as BookingStatus
  const job = (booking as { job?: { technician?: { user?: { name?: string; phone?: string }; rating?: number } } })?.job
  const tech = job?.technician
  const canConfirm = status === BookingStatus.PAYMENT_HELD
  const canCancel = [BookingStatus.PENDING, BookingStatus.MATCHING, BookingStatus.ASSIGNED, BookingStatus.ACCEPTED, BookingStatus.ON_THE_WAY].includes(status)
  const currentStep = STEP_MAP[status] ?? 0
  const inspectionFee = Number(booking.inspectionFee ?? 0)
  const repairCost = Number(booking.repairCost ?? 0)
  const gst = repairCost * 0.18
  const total = inspectionFee + repairCost + gst
  const inDisputeWindow = booking.disputeWindowEnd && new Date(booking.disputeWindowEnd) > new Date()

  return (
    <div className="space-y-6 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Booking details</h1>
        {isConnected && <span className="text-xs text-green-600">Live</span>}
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {STEPS.slice(0, 9).map((label, i) => (
            <div
              key={label}
              className={cn(
                'flex shrink-0 flex-col items-center gap-1 rounded-lg px-2 py-2',
                i < currentStep && 'bg-green-100 text-green-800',
                i === currentStep && 'bg-primary/20 text-primary',
                i > currentStep && 'text-muted-foreground'
              )}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              <span className="text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <StatusBadge status={status} />
          <p className="font-medium">{booking.service?.name}</p>
          <p className="text-sm text-muted-foreground">{booking.description}</p>
          <p className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" />
            {booking.address}
          </p>
          <p className="text-sm">{format(new Date(booking.scheduledTime), 'dd MMM yyyy, hh:mm a')}</p>
        </CardHeader>
      </Card>

      {tech && status >= BookingStatus.ACCEPTED && (
        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-medium">Technician</h3>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 font-medium text-primary">
              {tech.user?.name?.slice(0, 2).toUpperCase() ?? 'T'}
            </div>
            <div>
              <p className="font-medium">{tech.user?.name}</p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4" />
                {Number(tech.rating ?? 0).toFixed(1)}
              </p>
              {tech.user?.phone && (
                <a href={`tel:${tech.user.phone}`} className="mt-1 flex items-center gap-1 text-sm text-primary">
                  <Phone className="h-4 w-4" /> Call
                </a>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/bookings/${id}/track`)}>
              Track
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <h3 className="font-medium">Pricing</h3>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Inspection fee</span>
            <span>₹{inspectionFee.toLocaleString('en-IN')}</span>
          </div>
          {repairCost > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Repair</span>
                <span>₹{repairCost.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST (18%)</span>
                <span>₹{gst.toLocaleString('en-IN')}</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>₹{total.toLocaleString('en-IN')}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {canConfirm && (
          <Button onClick={() => setConfirmOpen(true)}>
            Confirm completion
          </Button>
        )}
        {canCancel && (
          <Button variant="outline" className="border-red-500 text-red-600" onClick={() => setCancelOpen(true)}>
            Cancel booking
          </Button>
        )}
        {inDisputeWindow && status !== BookingStatus.DISPUTED && (
          <Button variant="ghost" onClick={() => setDisputeOpen(true)}>
            Raise a dispute
          </Button>
        )}
      </div>

      {status === BookingStatus.CLOSED && (
        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-medium">Leave a review</h3>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReviewRating(r)}
                  className="text-2xl text-muted-foreground hover:text-yellow-500"
                >
                  {r <= reviewRating ? '★' : '☆'}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Comment (optional)"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
            <Button
              size="sm"
              disabled={reviewRating === 0}
              onClick={() => reviewMutation.mutate({ rating: reviewRating, comment: reviewComment || undefined })}
            >
              Submit review
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm completion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Release ₹{repairCost.toLocaleString('en-IN')} to the technician? You won&apos;t be able to dispute after this.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => confirmMutation.mutate()}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel booking</DialogTitle>
          </DialogHeader>
          <Label>Reason</Label>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (min 5 characters)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Back</Button>
            <Button
              variant="destructive"
              disabled={cancelReason.length < 5}
              onClick={() => cancelMutation.mutate(cancelReason)}
            >
              Cancel booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise a dispute</DialogTitle>
          </DialogHeader>
          <Label>Reason</Label>
          <Textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Describe the issue (min 10 characters)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>Back</Button>
            <Button
              disabled={disputeReason.length < 10}
              onClick={() => disputeMutation.mutate(disputeReason)}
            >
              Submit dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
