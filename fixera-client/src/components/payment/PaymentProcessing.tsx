import { useEffect, useState } from 'react'

const MESSAGES = [
  'Verifying payment...',
  'Connecting to bank...',
  'Securing transaction...',
  'Almost done...',
]

interface PaymentProcessingProps {
  amount: number
}

export function PaymentProcessing({ amount }: PaymentProcessingProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-center text-sm font-medium text-foreground">
        {MESSAGES[index]}
      </p>
      <p className="text-xl font-bold">₹{amount.toLocaleString('en-IN')}</p>
      <p className="text-xs text-muted-foreground">Do not close this window</p>
    </div>
  )
}
