import { Button } from '@/components/ui/button'
import { Banknote, AlertTriangle } from 'lucide-react'

type CashPaymentProps = {
  amount: number
  type: 'inspection' | 'repair'
  onConfirm: () => void
  isProcessing?: boolean
}

export function CashPayment({
  amount,
  type,
  onConfirm,
  isProcessing,
}: CashPaymentProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-6 text-center">
        <Banknote className="h-14 w-14 text-muted-foreground" />
        <p className="font-semibold">Pay with Cash</p>
        <p className="text-sm text-muted-foreground">
          Pay ₹{amount.toLocaleString('en-IN')} directly to the technician after the
          service is completed.
        </p>
      </div>

      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">✓ No advance payment needed</li>
        <li className="flex items-center gap-2">✓ Pay only after you&apos;re satisfied</li>
        <li className="flex items-center gap-2">✓ Exact change appreciated</li>
        {type === 'inspection' && (
          <li className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            Inspection fee must be paid before work begins
          </li>
        )}
      </ul>

      {type === 'inspection' && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Inspection fee ₹{amount.toLocaleString('en-IN')}</p>
          <p>
            is collected by the technician in cash before starting the inspection.
          </p>
        </div>
      )}

      <Button
        className="w-full bg-green-600 hover:bg-green-700"
        onClick={onConfirm}
        disabled={isProcessing}
      >
        Confirm Cash Payment
      </Button>
    </div>
  )
}
