import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { OtpInput } from '@/components/shared/OtpInput'

const WALLETS = [
  { name: 'Paytm', icon: '🟣', color: 'bg-purple-500' },
  { name: 'PhonePe', icon: '💙', color: 'bg-blue-500' },
  { name: 'Amazon Pay', icon: '🟢', color: 'bg-amber-400' },
  { name: 'Mobikwik', icon: '⚪', color: 'bg-slate-400' },
]

type WalletPaymentProps = {
  amount: number
  onPay: () => void
  isProcessing?: boolean
}

export function WalletPayment({ amount, onPay, isProcessing }: WalletPaymentProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [resendCountdown, setResendCountdown] = useState(0)

  const handleWalletClick = (name: string) => {
    setSelected(name)
    setOtp('')
    setResendCountdown(30)
  }

  const handleVerifyPay = () => {
    onPay()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium">Select wallet</p>
        {WALLETS.map((w) => (
          <button
            key={w.name}
            type="button"
            onClick={() => handleWalletClick(w.name)}
            disabled={isProcessing}
            className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted"
          >
            <span className="flex items-center gap-3">
              <span className={`h-10 w-10 rounded-full ${w.color} flex items-center justify-center text-lg`}>
                {w.icon}
              </span>
              <span className="font-medium">{w.name}</span>
            </span>
            <span className="text-primary">Pay ₹{amount.toLocaleString('en-IN')}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Redirecting to {selected}...
          </p>
          <p className="text-sm text-muted-foreground">
            Enter OTP sent to +91 XXXXX
            {String(Math.floor(Math.random() * 100000)).padStart(5, '0')}
          </p>
          <div>
            <Label>OTP</Label>
            <OtpInput value={otp} onChange={setOtp} />
          </div>
          <Button
            className="w-full"
            onClick={handleVerifyPay}
            disabled={otp.length !== 6 || isProcessing}
          >
            Verify & Pay
          </Button>
          {resendCountdown > 0 ? (
            <p className="text-center text-xs text-muted-foreground">
              Resend OTP in {resendCountdown}s
            </p>
          ) : (
            <button
              type="button"
              className="w-full text-center text-xs text-primary"
              onClick={() => setResendCountdown(30)}
            >
              Resend OTP
            </button>
          )}
        </div>
      )}
    </div>
  )
}
