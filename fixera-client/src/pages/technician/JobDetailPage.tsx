import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useSocket } from '@/hooks/useSocket'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { JobStatusStepper } from '@/components/technician/JobStatusStepper'
import { LocationTracker } from '@/components/technician/LocationTracker'
import { MapView } from '@/components/shared/MapView'
import { useGeolocation } from '@/hooks/useGeolocation'
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
import { Input } from '@/components/ui/input'
import { useToastStore } from '@/store/toast.store'
import { BookingStatus } from '@/types'
import type { Job } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Phone, MapPin, AlertTriangle, ExternalLink } from 'lucide-react'
interface JobWithBooking extends Job {
  booking?: {
    id: string
    status: string
    scheduledTime: string
    address?: string
    latitude?: string | number
    longitude?: string | number
    repairCost?: number
    repairTypeId?: string
    service?: { id: string; name: string }
    customer?: { name?: string; phone?: string }
  }
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToastStore()
  const { socket } = useSocket()
  const [showPhone, setShowPhone] = useState(false)
  const [estimateOpen, setEstimateOpen] = useState(false)
  const [repairTypeId, setRepairTypeId] = useState('')
  const [repairCost, setRepairCost] = useState('')
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null)

  const { data: job, isLoading, error, refetch } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const res = await api.get<{ data: JobWithBooking }>(`/api/jobs/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })

  const booking = job?.booking
  const showMapForGeo =
    !!booking &&
    ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'].includes(booking.status)
  const geo = useGeolocation(!!id && showMapForGeo && !!booking?.id)

  const serviceId = booking?.service?.id
  const { data: repairTypesRaw = [] } = useQuery({
    queryKey: ['repair-types', serviceId],
    queryFn: async () => {
      const res = await api.get<{ data: Record<string, unknown>[] }>('/api/services/repair-types', { params: { serviceId } })
      return res.data.data ?? []
    },
    enabled: !!serviceId,
  })
  const repairTypes = repairTypesRaw.map((t) => ({
    id: String(t.id),
    name: String(t.name ?? ''),
    minPrice: Number(t.minPrice ?? t.min_price ?? 0),
    maxPrice: Number(t.maxPrice ?? t.max_price ?? 0),
  }))

  useEffect(() => {
    if (!socket || !booking?.id) return
    socket.emit('booking:join', { bookingId: booking.id })
    const onStatus = () => refetch()
    socket.on('booking:status-changed', onStatus)
    return () => {
      socket.off('booking:status-changed', onStatus)
      socket.emit('booking:leave', { bookingId: booking.id })
    }
  }, [socket, booking?.id, refetch])

  const acceptMutation = useMutation({
    mutationFn: () => api.post(`/api/jobs/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] })
      toast.add('Job accepted!', 'success')
    },
  })
  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/api/jobs/${id}/reject`),
    onSuccess: () => {
      navigate('/jobs')
      toast.add('Job rejected', 'info')
    },
  })
  const startTravelMutation = useMutation({
    mutationFn: () => api.post(`/api/jobs/${id}/start-travel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job', id] }),
  })
  const startJobMutation = useMutation({
    mutationFn: () => api.post(`/api/jobs/${id}/start-job`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job', id] }),
  })
  const completeMutation = useMutation({
    mutationFn: () => api.post(`/api/jobs/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job', id] }),
  })
  const estimateMutation = useMutation({
    mutationFn: (data: { repairTypeId: string; repairCost: number }) =>
      api.post(`/api/bookings/${booking?.id}/estimate`, data),
    onSuccess: () => {
      setEstimateOpen(false)
      refetch()
      toast.add('Estimate submitted', 'success')
    },
  })

  if (!id) return null
  if (isLoading || !job) return <LoadingSpinner className="min-h-[40vh]" message="Loading..." />
  if (error) return <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />

  const status = (booking?.status as BookingStatus) ?? BookingStatus.ASSIGNED
  const isOnTheWay = status === BookingStatus.ON_THE_WAY
  const showMap =
    status === BookingStatus.ACCEPTED ||
    status === BookingStatus.ON_THE_WAY ||
    status === BookingStatus.IN_PROGRESS
  const hasCustomerCoords =
    Number.isFinite(Number(booking?.latitude)) && Number.isFinite(Number(booking?.longitude))
  const repairCostNum = Number(booking?.repairCost ?? 0)
  const commission = repairCostNum * 0.15
  const payout = repairCostNum - commission
  const selectedType = repairTypes.find((t) => t.id === repairTypeId)

  return (
    <div className="space-y-6 p-4 pb-24">
      <Card>
        <CardHeader className="pb-2">
          <h3 className="font-medium">Customer</h3>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-medium">{booking?.customer?.name ?? 'Customer'}</p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {booking?.address ?? '—'}
          </p>
          {status >= BookingStatus.ACCEPTED ? (
            showPhone ? (
              <a href={`tel:${booking?.customer?.phone}`} className="flex items-center gap-2 text-sm text-primary">
                <Phone className="h-4 w-4" /> {booking?.customer?.phone ?? '—'}
              </a>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowPhone(true)}>
                Reveal phone
              </Button>
            )
          ) : null}
        </CardContent>
      </Card>

      <JobStatusStepper currentStatus={status} />

      {(status === BookingStatus.ACCEPTED || isOnTheWay) && booking?.id && (
        <LocationTracker bookingId={booking.id} active={isOnTheWay} />
      )}
      {showMap && hasCustomerCoords && (
        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-medium">📍 Customer Location</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <MapView
              technicianLocation={
                geo?.latitude != null && geo?.longitude != null
                  ? { latitude: geo.latitude, longitude: geo.longitude }
                  : null
              }
              customerLocation={{
                latitude: Number(booking!.latitude),
                longitude: Number(booking!.longitude),
              }}
              showRoute={true}
              height="200px"
              eta={etaMinutes}
              onEtaUpdate={setEtaMinutes}
            />
            {etaMinutes != null && (
              <p className="text-sm text-muted-foreground">ETA: ~{etaMinutes} min away</p>
            )}
            {geo?.latitude != null && geo?.longitude != null && (
              <a
                href={`https://www.google.com/maps/dir/${geo.latitude},${geo.longitude}/${Number(booking!.latitude)},${Number(booking!.longitude)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                Open in Google Maps <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {status === BookingStatus.ASSIGNED && (
          <>
            <Button className="w-full" onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>
              Accept job
            </Button>
            <Button variant="outline" className="w-full border-red-500 text-red-600" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>
              Reject job
            </Button>
          </>
        )}
        {status === BookingStatus.ACCEPTED && (
          <Button className="w-full" onClick={() => startTravelMutation.mutate()} disabled={startTravelMutation.isPending}>
            Start travel
          </Button>
        )}
        {status === BookingStatus.ON_THE_WAY && (
          <Button className="w-full" onClick={() => startJobMutation.mutate()} disabled={startJobMutation.isPending}>
            I&apos;ve arrived — Start job
          </Button>
        )}
        {status === BookingStatus.IN_PROGRESS && (
          <>
            {!booking?.repairCost ? (
              <>
                <Button className="w-full" onClick={() => setEstimateOpen(true)}>
                  Submit repair estimate
                </Button>
                <Dialog open={estimateOpen} onOpenChange={setEstimateOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Repair estimate</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Repair type</Label>
                        <Select value={repairTypeId} onValueChange={setRepairTypeId}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            {repairTypes.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name} (₹{Number(t.minPrice).toLocaleString('en-IN')}–₹{Number(t.maxPrice).toLocaleString('en-IN')})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Cost (₹)</Label>
                        <Input
                          type="number"
                          value={repairCost}
                          onChange={(e) => setRepairCost(e.target.value)}
                          placeholder={selectedType ? `Range: ₹${Number(selectedType.minPrice).toLocaleString('en-IN')}–₹${Number(selectedType.maxPrice).toLocaleString('en-IN')}` : ''}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => setEstimateOpen(false)}>Cancel</Button>
                      <Button
                        type="button"
                        onClick={() => estimateMutation.mutate({ repairTypeId, repairCost: Number(repairCost) })}
                        disabled={!repairTypeId || !repairCost.trim() || Number(repairCost) <= 0}
                      >
                        Submit
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <p className="text-center text-sm text-muted-foreground">Waiting for customer approval...</p>
            )}
            {booking?.repairCost && (
              <Button className="w-full" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
                Mark job complete
              </Button>
            )}
          </>
        )}
      </div>

      {repairCostNum > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-medium">Earnings</h3>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span>₹{repairCostNum.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform (15%)</span>
              <span>₹{commission.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Your payout</span>
              <span className="text-green-600">₹{payout.toLocaleString('en-IN')}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {status === BookingStatus.DISPUTED && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-50 p-4 text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">A dispute has been raised. Funds on hold.</p>
        </div>
      )}
    </div>
  )
}
