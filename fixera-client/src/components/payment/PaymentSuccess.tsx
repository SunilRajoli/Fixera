import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { PaymentMethod } from '@/hooks/usePayment'

interface PaymentSuccessProps {
  amount: number
  type: 'inspection' | 'repair'
  bookingId: string
  paymentMethod: PaymentMethod
  onDone: () => void
}

function generateTransactionId(): string {
  return 'FXR' + Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('')
}

export function PaymentSuccess({
  amount,
  type,
  bookingId,
  paymentMethod,
  onDone,
}: PaymentSuccessProps) {
  const navigate = useNavigate()
  const [txId] = useState(() => generateTransactionId())
  const [checkDone, setCheckDone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setCheckDone(true), 600)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <svg
          className="h-full w-full -rotate-90"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-green-500"
            strokeDasharray={264}
            strokeDashoffset={checkDone ? 0 : 264}
            style={{
              transition: 'stroke-dashoffset 0.5s ease-out',
            }}
          />
        </svg>
        <svg
          className="absolute h-10 w-10 text-green-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity: checkDone ? 1 : 0,
            transition: 'opacity 0.3s ease-out 0.2s',
          }}
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <p className="text-xl font-bold text-green-600">Payment Successful!</p>
      <p className="text-2xl font-bold">₹{amount.toLocaleString('en-IN')}</p>

      <div className="w-full space-y-2 rounded-lg border bg-muted/30 p-4 text-left text-sm">
        <p>
          <span className="text-muted-foreground">Transaction ID:</span>{' '}
          {txId}
        </p>
        <p>
          <span className="text-muted-foreground">Date:</span>{' '}
          {new Date().toLocaleString('en-IN')}
        </p>
        <p>
          <span className="text-muted-foreground">Payment method:</span>{' '}
          {paymentMethod}
        </p>
        <p>
          <span className="text-muted-foreground">Booking ID:</span> #
          {bookingId.slice(-8)}
        </p>
      </div>

      {type === 'inspection' && (
        <p className="text-center text-sm text-muted-foreground">
          Technician will arrive at your scheduled time.
        </p>
      )}
      {type === 'repair' && (
        <p className="text-center text-sm text-muted-foreground">
          Confirm job completion to release payment to technician.
        </p>
      )}

      <div className="flex w-full gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            onDone()
            navigate(`/bookings/${bookingId}`)
          }}
        >
          View Booking
        </Button>
        <Button className="flex-1" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}
