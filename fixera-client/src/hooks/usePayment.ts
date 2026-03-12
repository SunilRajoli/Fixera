import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export type PaymentType = 'inspection' | 'repair'
export type PaymentMethod = 'UPI' | 'CARD' | 'WALLET' | 'CASH'
export type PaymentState = 'idle' | 'processing' | 'success' | 'failed'

const MOCK_DELAY_MS = 2500
const MOCK_SUCCESS_RATE = 0.95

function friendlyMessage(err: { response?: { status?: number; data?: { message?: string } } }): string {
  const status = err.response?.status
  const msg = err.response?.data?.message
  if (status === 400 && (msg?.includes('already') || msg?.includes('Payment already')))
    return 'This payment has already been made.'
  if (status === 400 && msg?.includes('allowed only when booking status is PAYMENT_HELD')) {
    return 'Payment not available yet. Please try again after the job reaches the payment stage.'
  }
  if (status === 409) return 'This payment has already been made.'
  if (status === 400) return 'Payment could not be processed. Please retry.'
  return 'Something went wrong. Please try again.'
}

export function usePayment(bookingId: string, type: PaymentType) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<PaymentState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)

  const endpoint = type === 'inspection' ? '/api/payments/inspection' : '/api/payments/repair'

  const mutation = useMutation({
    mutationFn: (method: PaymentMethod) =>
      api.post(endpoint, { bookingId, paymentMethod: method }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] })
      setState('success')
      setError(null)
    },
    onError: (err: { response?: { status?: number; data?: { message?: string } } }) => {
      setState('failed')
      setError(friendlyMessage(err))
    },
  })

  const processPayment = async (method: PaymentMethod) => {
    setSelectedMethod(method)
    setState('processing')
    setError(null)
    if (method === 'CASH') {
      mutation.mutate(method)
      return
    }
    await new Promise((r) => setTimeout(r, MOCK_DELAY_MS))
    if (Math.random() > MOCK_SUCCESS_RATE) {
      setState('failed')
      setError('Payment failed. Please retry.')
      return
    }
    mutation.mutate(method)
  }

  return {
    state,
    error,
    processPayment,
    setState,
    setError,
    selectedMethod,
  }
}
