import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { OtpInput } from '@/components/shared/OtpInput'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import type { AuthUser } from '@/store/auth.store'

const phoneSchema = z.object({ phone: z.string().min(10, 'Valid phone required') })
const codeSchema = z.object({ code: z.string().min(6, 'Enter 6 digits').max(6, 'Enter 6 digits') })

type PhoneForm = z.infer<typeof phoneSchema>
type CodeForm = z.infer<typeof codeSchema>

function normalizeUser(d: { id?: string; user_id?: string; name?: string; phone?: string; role?: string; email?: string }): AuthUser {
  return {
    id: (d.id ?? d.user_id) ?? '',
    name: d.name ?? '',
    phone: d.phone ?? '',
    role: (d.role as AuthUser['role']) ?? 'CUSTOMER',
    email: d.email,
  }
}

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  })
  const codeForm = useForm<CodeForm>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  })

  const onSendOtp = async (data: PhoneForm) => {
    setLoading(true)
    try {
      const p = data.phone.startsWith('+') ? data.phone : `+91${data.phone.replace(/\D/g, '').slice(-10)}`
      await api.post('/api/auth/send-otp', { phone: p })
      setPhone(p)
      setStep('code')
      setResendCooldown(30)
      const t = setInterval(() => setResendCooldown((c) => (c <= 0 ? (clearInterval(t), 0) : c - 1)), 1000)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to send OTP'
      phoneForm.setError('phone', { message: msg })
    } finally {
      setLoading(false)
    }
  }

  const onVerify = async (data: CodeForm) => {
    setLoading(true)
    try {
      const res = await api.post<{ data: { user: unknown; token: string } }>('/api/auth/verify-login', {
        phone,
        code: data.code,
      })
      const { user: u, token } = res.data.data ?? {}
      if (!u || !token) throw new Error('Invalid response')
      const user = normalizeUser(u as Record<string, unknown>)
      setAuth(user, token)
      if (user.role === 'CUSTOMER') navigate('/home', { replace: true })
      else if (user.role === 'TECHNICIAN') navigate('/dashboard', { replace: true })
      else if (user.role === 'ADMIN') navigate('/admin/dashboard', { replace: true })
      else navigate('/home', { replace: true })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Invalid OTP'
      codeForm.setError('code', { message: msg })
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    if (resendCooldown > 0) return
    setLoading(true)
    try {
      await api.post('/api/auth/send-otp', { phone })
      setResendCooldown(30)
      const t = setInterval(() => setResendCooldown((c) => (c <= 0 ? (clearInterval(t), 0) : c - 1)), 1000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <p className="text-2xl font-bold">
            <span className="text-primary">fix</span>
            <span className="text-slate-700">era</span>
          </p>
          <p className="text-sm text-muted-foreground">Home services, sorted.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'phone' ? (
            <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <div className="mt-1 flex rounded-md border">
                  <span className="inline-flex items-center rounded-l-md border-r bg-muted px-3 text-sm">+91</span>
                  <Input
                    id="phone"
                    placeholder="9876543210"
                    className="border-0 focus-visible:ring-0"
                    {...phoneForm.register('phone')}
                  />
                </div>
                {phoneForm.formState.errors.phone && (
                  <p className="mt-1 text-sm text-destructive">{phoneForm.formState.errors.phone.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={codeForm.handleSubmit(onVerify)} className="space-y-4">
              <div>
                <Label>Enter 6-digit OTP</Label>
                <OtpInput value={codeForm.watch('code') ?? ''} onChange={(code) => codeForm.setValue('code', code)} />
                {codeForm.formState.errors.code && (
                  <p className="mt-1 text-sm text-destructive">{codeForm.formState.errors.code.message}</p>
                )}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Resend OTP {resendCooldown > 0 ? `in ${resendCooldown}s` : <button type="button" onClick={resendOtp} className="text-primary hover:underline">Resend</button>}
              </p>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify & Login'}
              </Button>
            </form>
          )}
          <p className="text-center text-sm text-muted-foreground">
            New customer? <Link to="/register" className="text-primary hover:underline">Register here</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
