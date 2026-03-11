import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ServiceSelector } from '@/components/customer/ServiceSelector'
import { SlotPicker } from '@/components/customer/SlotPicker'
import { Progress } from '@/components/ui/progress'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useToastStore } from '@/store/toast.store'
import { PaymentMethod } from '@/types'
import type { Service } from '@/types'
import { format, addDays } from 'date-fns'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = ['Service', 'Details', 'Schedule', 'Payment']
const schema = z.object({
  description: z.string().min(10, 'Describe the issue (min 10 characters)'),
  address: z.string().min(5, 'Address required'),
  paymentMethod: z.nativeEnum(PaymentMethod),
})
type FormData = z.infer<typeof schema>

export default function NewBookingPage() {
  const [searchParams] = useSearchParams()
  const serviceIdParam = searchParams.get('service')
  const [step, setStep] = useState(0)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const navigate = useNavigate()
  const toast = useToastStore()
  const { latitude, longitude, getCurrentPosition, loading: geoLoading } = useGeolocation()

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get<{ data: Service[] }>('/api/services')
      return res.data.data ?? []
    },
  })

  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
  const { data: slotForBooking, isLoading: slotLoading, isError: slotError } = useQuery({
    queryKey: ['slot-for-booking', dateStr, selectedSlot],
    queryFn: async () => {
      const res = await api.get<{ data: { slotId: string } }>(
        `/api/slots/for-booking?date=${encodeURIComponent(dateStr)}&startTime=${encodeURIComponent(selectedSlot!)}`
      )
      return res.data
    },
    enabled: !!dateStr && !!selectedSlot,
    retry: false,
  })
  const resolvedSlotId = slotForBooking?.data?.slotId ?? null

  useEffect(() => {
    if (serviceIdParam && services.length) {
      const s = services.find((s) => s.id === serviceIdParam)
      if (s) setSelectedService(s)
    }
  }, [serviceIdParam, services])

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { description: '', address: '', paymentMethod: PaymentMethod.UPI },
  })

  const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i))

  const handleLocation = () => {
    getCurrentPosition()
  }

  const buildScheduledTime = () => {
    if (!selectedDate || !selectedSlot) return null
    const [hours, mins] = selectedSlot.split(':').map(Number)
    const d = new Date(selectedDate)
    d.setHours(hours, mins, 0, 0)
    return d.toISOString()
  }

  const onSubmit = async () => {
    if (!selectedService) return
    const scheduledTime = buildScheduledTime()
    if (!scheduledTime) {
      toast.add('Please select date and time slot', 'error')
      return
    }
    const scheduledDate = new Date(scheduledTime)
    const minFuture = new Date(Date.now() + 5 * 60 * 1000)
    if (scheduledDate <= minFuture) {
      toast.add('Please select a date and time at least a few minutes from now', 'error')
      return
    }
    if (!resolvedSlotId) {
      toast.add('No slot available for the selected time. Please pick another date or time.', 'error')
      return
    }
    const payload = {
      serviceId: selectedService.id,
      description: form.getValues('description'),
      address: form.getValues('address'),
      latitude: latitude ?? 0,
      longitude: longitude ?? 0,
      scheduledTime,
      slotId: resolvedSlotId,
      paymentMethod: form.getValues('paymentMethod'),
    }
    try {
      const res = await api.post<{ data: { id: string } }>('/api/bookings', payload)
      const id = res.data.data?.id
      if (id) {
        toast.add('Booking placed! Finding a technician...', 'success')
        navigate(`/bookings/${id}`)
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create booking'
      toast.add(msg, 'error')
    }
  }

  const inspectionFee = selectedService ? Number(selectedService.inspectionFee ?? 0) : 0

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-2">
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-2 flex-1" />
        <span className="text-sm text-muted-foreground">{step + 1} / {STEPS.length}</span>
      </div>

      {step === 0 && (
        <>
          <h2 className="font-semibold">Select service</h2>
          <ServiceSelector
            services={services}
            selectedId={selectedService?.id ?? null}
            onSelect={setSelectedService}
          />
          <Button
            type="button"
            className="w-full"
            disabled={!selectedService}
            onClick={() => setStep(1)}
          >
            Next
          </Button>
        </>
      )}

      {step === 1 && (
        <>
          <h2 className="font-semibold">Problem & address</h2>
          <form className="space-y-4">
            <div>
              <Label htmlFor="description">Describe the issue</Label>
              <textarea
                id="description"
                className="mt-1 min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
                {...form.register('description')}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...form.register('address')} />
              {form.formState.errors.address && (
                <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
              )}
            </div>
            <div>
              <Button type="button" variant="outline" onClick={handleLocation} disabled={geoLoading}>
                {geoLoading ? 'Getting location…' : 'Use my location'}
              </Button>
              {(latitude != null && longitude != null) && (
                <p className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <MapPin className="h-4 w-4" /> Location captured
                </p>
              )}
            </div>
          </form>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button
              onClick={() => form.handleSubmit(() => setStep(2))()}
              disabled={!form.formState.isValid}
            >
              Next
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="font-semibold">Select date & time</h2>
          <p className="text-sm text-muted-foreground">Next 7 days</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dates.map((d) => (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={cn(
                  'shrink-0 rounded-lg border-2 px-4 py-2 text-sm',
                  selectedDate?.toDateString() === d.toDateString()
                    ? 'border-primary bg-primary/10'
                    : 'border-muted'
                )}
              >
                {format(d, 'EEE d')}
              </button>
            ))}
          </div>
          <SlotPicker selectedSlot={selectedSlot} onSelect={setSelectedSlot} />
          {selectedDate && selectedSlot && slotError && (
            <p className="text-sm text-destructive">No slots available for this date and time. Try another.</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!selectedDate || !selectedSlot || !!slotError || slotLoading || !resolvedSlotId}
            >
              {slotLoading ? 'Checking…' : 'Next'}
            </Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2 className="font-semibold">Payment & confirm</h2>
          <div className="space-y-2">
            {[PaymentMethod.UPI, PaymentMethod.CARD, PaymentMethod.CASH].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => form.setValue('paymentMethod', method)}
                className={cn(
                  'w-full rounded-lg border-2 p-3 text-left text-sm',
                  form.watch('paymentMethod') === method ? 'border-primary bg-primary/10' : 'border-muted'
                )}
              >
                {method}
              </button>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-2">
              <h3 className="font-medium">Summary</h3>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Service:</span> {selectedService?.name}</p>
              <p><span className="text-muted-foreground">Inspection fee:</span> ₹{inspectionFee.toLocaleString('en-IN')}</p>
              <p><span className="text-muted-foreground">Address:</span> {form.watch('address')}</p>
              <p><span className="text-muted-foreground">Date & time:</span> {selectedDate && selectedSlot && `${format(selectedDate, 'dd MMM')} ${selectedSlot}`}</p>
              <p><span className="text-muted-foreground">Payment:</span> {form.watch('paymentMethod')}</p>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={form.handleSubmit(onSubmit)}>
              Confirm Booking ₹{inspectionFee.toLocaleString('en-IN')}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
