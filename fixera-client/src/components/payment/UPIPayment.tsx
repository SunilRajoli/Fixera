import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronUp } from 'lucide-react'

const upiSchema = z.object({
  upiId: z
    .string()
    .min(1, 'UPI ID required')
    .refine((v) => /^[\w.-]+@[\w.-]+$/.test(v), 'Enter a valid UPI ID (e.g. name@upi)'),
})

type UPIPaymentProps = {
  amount: number
  onPay: () => void
  isProcessing?: boolean
}

const UPI_APPS = [
  { name: 'Google Pay', icon: '🟢' },
  { name: 'PhonePe', icon: '💜' },
  { name: 'Paytm', icon: '🟡' },
  { name: 'BHIM', icon: '🔵' },
]

export function UPIPayment({ amount, onPay, isProcessing }: UPIPaymentProps) {
  const [showQr, setShowQr] = useState(false)
  const [openingApp, setOpeningApp] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof upiSchema>>({
    resolver: zodResolver(upiSchema),
    defaultValues: { upiId: '' },
  })

  const handleAppPay = (appName: string) => {
    setOpeningApp(appName)
    setTimeout(() => {
      setOpeningApp(null)
      onPay()
    }, 2000)
  }

  const onUpiSubmit = () => {
    onPay()
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium">Pay with UPI App</p>
        <div className="flex flex-wrap gap-2">
          {UPI_APPS.map((app) => (
            <button
              key={app.name}
              type="button"
              onClick={() => handleAppPay(app.name)}
              disabled={isProcessing || !!openingApp}
              className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <span>{app.icon}</span>
              {app.name}
            </button>
          ))}
        </div>
        {openingApp && (
          <p className="mt-2 text-xs text-muted-foreground">Opening {openingApp}...</p>
        )}
      </div>

      <div className="border-t pt-4">
        <p className="mb-2 text-sm text-muted-foreground">or enter UPI ID</p>
        <form onSubmit={handleSubmit(onUpiSubmit)} className="space-y-3">
          <div>
            <Label htmlFor="upi-id">UPI ID</Label>
            <Input
              id="upi-id"
              placeholder="yourname@upi"
              className="mt-1"
              {...register('upiId')}
            />
            {errors.upiId && (
              <p className="mt-1 text-xs text-destructive">{errors.upiId.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isProcessing}>
            Pay ₹{amount.toLocaleString('en-IN')}
          </Button>
        </form>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground"
        >
          Show QR Code {showQr ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showQr && (
          <div className="mt-3 flex flex-col items-center gap-2 rounded-lg border bg-muted/30 p-4">
            <div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg bg-muted text-center text-sm text-muted-foreground">
              Scan with any UPI app
            </div>
            <p className="font-mono text-sm">fixera@upi</p>
            <p className="font-semibold">₹{amount.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground">QR generated for this payment</p>
          </div>
        )}
      </div>
    </div>
  )
}
