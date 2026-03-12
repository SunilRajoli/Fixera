import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Eye, EyeOff } from 'lucide-react'

const cardSchema = z.object({
  cardNumber: z
    .string()
    .min(1, 'Card number required')
    .transform((s) => s.replace(/\s/g, ''))
    .refine((s) => /^\d{16}$/.test(s), 'Enter 16 digits'),
  name: z.string().min(3, 'Name required (min 3 characters)'),
  expiry: z
    .string()
    .min(1, 'Expiry required')
    .refine((s) => /^\d{2}\/\d{2}$/.test(s), 'Use MM/YY')
    .refine((s) => {
      const [mm, yy] = s.split('/').map(Number)
      const y = 2000 + yy
      const m = mm - 1
      const exp = new Date(y, m + 1, 0)
      return exp >= new Date()
    }, 'Card expired'),
  cvv: z.string().refine((s) => /^\d{3}$/.test(s), 'Enter 3 digits'),
})

type CardForm = z.infer<typeof cardSchema>

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function formatExpiry(value: string): string {
  const v = value.replace(/\D/g, '').slice(0, 4)
  if (v.length >= 2) return v.slice(0, 2) + '/' + v.slice(2)
  return v
}

type CardPaymentProps = {
  amount: number
  onPay: () => void
  isProcessing?: boolean
}

export function CardPayment({ amount, onPay, isProcessing }: CardPaymentProps) {
  const [showCvv, setShowCvv] = useState(false)
  const [cardFlipped, setCardFlipped] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<CardForm>({
    resolver: zodResolver(cardSchema),
    mode: 'onChange',
    defaultValues: {
      cardNumber: '',
      name: '',
      expiry: '',
      cvv: '',
    },
  })

  const cardNumber = watch('cardNumber')
  const name = watch('name')
  const expiry = watch('expiry')
  const cvv = watch('cvv')
  const last4 = cardNumber.replace(/\s/g, '').slice(-4)
  const isVisa = cardNumber.replace(/\s/g, '').charAt(0) === '4'
  const isMastercard = cardNumber.replace(/\s/g, '').charAt(0) === '5'

  return (
    <div className="space-y-6">
      <div className="perspective-1000">
        <div
          className="relative h-44 w-full rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 p-4 text-white shadow-lg transition-transform duration-300"
          style={{ transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          <div className="absolute inset-0 flex flex-col justify-between rounded-xl p-4 [backface-visibility:hidden]">
            <div className="flex justify-between">
              <span className="text-xs font-bold tracking-widest">FIXERA</span>
              <div className="h-8 w-12 rounded bg-amber-400/80" />
            </div>
            <p className="font-mono text-lg tracking-wider">
              **** **** **** {last4 || '****'}
            </p>
            <div className="flex justify-between">
              <div>
                <p className="text-[10px] uppercase text-white/70">Cardholder</p>
                <p className="truncate font-medium">{name || 'AS ON CARD'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-white/70">Expires</p>
                <p>{expiry || 'MM/YY'}</p>
              </div>
              <div className="flex items-center gap-1">
                {isVisa && <span className="text-xs font-bold">VISA</span>}
                {isMastercard && <span className="text-xs font-bold">MC</span>}
              </div>
            </div>
          </div>
          <div
            className="absolute inset-0 flex flex-col justify-between rounded-xl p-4 [backface-visibility:hidden]"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <div className="h-8 w-full rounded bg-slate-800" />
            <div>
              <p className="text-[10px] text-white/70">CVV</p>
              <p className="font-mono">{showCvv ? cvv : '•••'}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onPay)} className="space-y-4">
        <div>
          <Label>Card Number</Label>
          <div className="relative mt-1">
            <Input
              placeholder="4444 4444 4444 4444"
              maxLength={19}
              className="pr-10"
              {...register('cardNumber', {
                onChange: (e) =>
                  setValue('cardNumber', formatCardNumber(e.target.value), {
                    shouldValidate: true,
                  }),
              })}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
              {isVisa ? 'VISA' : isMastercard ? 'MC' : ''}
            </span>
          </div>
          {errors.cardNumber && (
            <p className="mt-1 text-xs text-destructive">{errors.cardNumber.message}</p>
          )}
        </div>

        <div>
          <Label>Cardholder Name</Label>
          <Input
            placeholder="AS ON CARD"
            className="mt-1 uppercase"
            {...register('name', {
              setValueAs: (v: string) => v.toUpperCase(),
            })}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Expiry</Label>
            <Input
              placeholder="MM/YY"
              maxLength={5}
              className="mt-1"
              {...register('expiry', {
                onChange: (e) =>
                  setValue('expiry', formatExpiry(e.target.value), {
                    shouldValidate: true,
                  }),
              })}
            />
            {errors.expiry && (
              <p className="mt-1 text-xs text-destructive">{errors.expiry.message}</p>
            )}
          </div>
          <div>
            <Label>CVV</Label>
            <div className="relative mt-1">
              <Input
                type={showCvv ? 'text' : 'password'}
                placeholder="123"
                maxLength={3}
                {...register('cvv')}
                onFocus={() => setCardFlipped(true)}
                onBlur={() => setCardFlipped(false)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowCvv((v) => !v)}
              >
                {showCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.cvv && (
              <p className="mt-1 text-xs text-destructive">{errors.cvv.message}</p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!isValid || isProcessing}
        >
          <Lock className="mr-2 h-4 w-4" />
          Pay ₹{amount.toLocaleString('en-IN')} Securely
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Test: 4111 1111 1111 1111 | 12/26 | 123
        </p>
      </form>
    </div>
  )
}
