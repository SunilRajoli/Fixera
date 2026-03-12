import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UPIPayment } from '@/components/payment/UPIPayment'
import { CardPayment } from '@/components/payment/CardPayment'
import { WalletPayment } from '@/components/payment/WalletPayment'
import { CashPayment } from '@/components/payment/CashPayment'
import { PaymentProcessing } from '@/components/payment/PaymentProcessing'
import { PaymentSuccess } from '@/components/payment/PaymentSuccess'
import { usePayment } from '@/hooks/usePayment'
import type { PaymentMethod } from '@/hooks/usePayment'

type TabId = 'UPI' | 'CARD' | 'WALLET' | 'CASH'

interface PaymentSheetProps {
  isOpen: boolean
  onClose: () => void
  amount: number
  gstAmount?: number
  baseAmount?: number
  type: 'inspection' | 'repair'
  bookingId: string
  onSuccess: () => void
}

export function PaymentSheet({
  isOpen,
  onClose,
  amount,
  gstAmount = 0,
  baseAmount,
  type,
  bookingId,
  onSuccess,
}: PaymentSheetProps) {
  const [activeTab, setActiveTab] = useState<TabId>('UPI')
  const {
    state,
    error,
    processPayment,
    setState,
    selectedMethod,
  } = usePayment(bookingId, type)

  useEffect(() => {
    if (isOpen) setState('idle' as const)
  }, [isOpen])

  const handlePay = () => {
    processPayment(activeTab as PaymentMethod)
  }

  const handleCashConfirm = () => {
    processPayment('CASH')
  }

  const handleDone = () => {
    onSuccess()
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={() => state === 'idle' && onClose()}
        aria-hidden
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-h-[90vh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-background shadow-xl">
        <div className="flex flex-col max-h-[90vh]">
          <div className="flex shrink-0 flex-col items-center gap-2 border-b px-4 pt-3 pb-2">
            <div className="h-1.5 w-12 rounded-full bg-muted" />
            <div className="flex w-full items-center justify-between">
              <h2 className="text-lg font-semibold">Complete Payment</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-2xl font-bold">₹{amount.toLocaleString('en-IN')}</p>
            {type === 'repair' && baseAmount != null && gstAmount != null && (
              <div className="w-full space-y-1 text-sm text-muted-foreground">
                <p className="flex justify-between">
                  <span>Service charge:</span> ₹{baseAmount.toLocaleString('en-IN')}
                </p>
                <p className="flex justify-between">
                  <span>GST (18%):</span> ₹{gstAmount.toLocaleString('en-IN')}
                </p>
                <p className="flex justify-between font-medium text-foreground">
                  <span>Total:</span> ₹{amount.toLocaleString('en-IN')}
                </p>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
            {state === 'processing' && (
              <PaymentProcessing amount={amount} />
            )}

            {state === 'success' && selectedMethod != null && (
              <PaymentSuccess
                amount={amount}
                type={type}
                bookingId={bookingId}
                paymentMethod={selectedMethod}
                onDone={handleDone}
              />
            )}

            {state === 'failed' && (
              <div className="space-y-4 py-6">
                <p className="text-center text-destructive">{error}</p>
                <Button
                  className="w-full"
                  onClick={() => setState('idle' as const)}
                >
                  Retry
                </Button>
              </div>
            )}

            {state === 'idle' && (
              <>
                <div className="flex gap-1 border-b">
                  {(['UPI', 'CARD', 'WALLET', 'CASH'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        activeTab === tab
                          ? 'border-b-2 border-primary text-primary'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  {activeTab === 'UPI' && (
                    <UPIPayment
                      amount={amount}
                      onPay={handlePay}
                      isProcessing={false}
                    />
                  )}
                  {activeTab === 'CARD' && (
                    <CardPayment
                      amount={amount}
                      onPay={handlePay}
                      isProcessing={false}
                    />
                  )}
                  {activeTab === 'WALLET' && (
                    <WalletPayment
                      amount={amount}
                      onPay={handlePay}
                      isProcessing={false}
                    />
                  )}
                  {activeTab === 'CASH' && (
                    <CashPayment
                      amount={amount}
                      type={type}
                      onConfirm={handleCashConfirm}
                      isProcessing={false}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
