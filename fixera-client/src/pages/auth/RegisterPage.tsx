import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import type { AuthUser } from '@/store/auth.store'
import { User, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Valid phone required'),
  role: z.enum(['CUSTOMER', 'TECHNICIAN']),
})
const codeSchema = z.object({ code: z.string().min(6, 'Enter 6 digits').max(6, 'Enter 6 digits') })

type RegisterForm = z.infer<typeof registerSchema>
type CodeForm = z.infer<typeof codeSchema>

function normalizeUser(d: Record<string, unknown>): AuthUser {
  return {
    id: (d.id ?? d.user_id) as string,
    name: (d.name as string) ?? '',
    phone: (d.phone as string) ?? '',
    role: (d.role as AuthUser['role']) ?? 'CUSTOMER',
    email: d.email as string | undefined,
  }
}

function OtpInput({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const digits = value.padEnd(6, ' ').slice(0, 6).split('')
  const setDigit = (i: number, d: string) => {
    const next = value.split('')
    next[i] = d.replace(/\D/g, '').slice(-1) ?? ''
    onChange(next.join('').slice(0, 6))
  }
  return (
    <div className="mt-2 flex gap-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Input
          key={i}
          value={digits[i] === ' ' ? '' : digits[i]}
          maxLength={1}
          className="h-12 w-12 text-center text-lg"
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => e.key === 'Backspace' && !digits[i] && i > 0 && setDigit(i - 1, '')}
        />
      ))}
    </div>
  )
}

export default function RegisterPage() {
  const [step, setStep] = useState<'form' | 'code'>('form')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', phone: '', role: 'CUSTOMER' },
  })
  const codeForm = useForm<CodeForm>({ defaultValues: { code: '' } })

  const onRegister = async (data: RegisterForm) => {
    setLoading(true)
    try {
      const p = data.phone.startsWith('+') ? data.phone : `+91${data.phone.replace(/\D/g, '').slice(-10)}`
      await api.post('/api/auth/register', { name: data.name, phone: p, role: data.role })
      setPhone(p)
      await api.post('/api/auth/send-otp', { phone: p })
      setStep('code')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Registration failed'
      registerForm.setError('root', { message: msg })
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
      codeForm.setError('code', { message: 'Invalid OTP' })
    } finally {
      setLoading(false)
    }
  }

  const role = registerForm.watch('role')

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <p className="text-2xl font-bold">
            <span className="text-primary">fix</span>
            <span className="text-slate-700">era</span>
          </p>
          <p className="text-sm text-muted-foreground">Create your account</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'form' ? (
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" className="mt-1" {...registerForm.register('name')} />
                {registerForm.formState.errors.name && (
                  <p className="mt-1 text-sm text-destructive">{registerForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <div className="mt-1 flex rounded-md border">
                  <span className="inline-flex items-center rounded-l-md border-r bg-muted px-3 text-sm">+91</span>
                  <Input id="phone" placeholder="9876543210" className="border-0" {...registerForm.register('phone')} />
                </div>
                {registerForm.formState.errors.phone && (
                  <p className="mt-1 text-sm text-destructive">{registerForm.formState.errors.phone.message}</p>
                )}
              </div>
              <div>
                <Label>I am a</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => registerForm.setValue('role', 'CUSTOMER')}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                      role === 'CUSTOMER' ? 'border-primary bg-primary/10' : 'border-muted'
                    )}
                  >
                    <User className="h-8 w-8" />
                    <span className="text-sm font-medium">Customer</span>
                    <span className="text-xs text-muted-foreground">I need services</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => registerForm.setValue('role', 'TECHNICIAN')}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                      role === 'TECHNICIAN' ? 'border-primary bg-primary/10' : 'border-muted'
                    )}
                  >
                    <Wrench className="h-8 w-8" />
                    <span className="text-sm font-medium">Technician</span>
                    <span className="text-xs text-muted-foreground">I provide services</span>
                  </button>
                </div>
              </div>
              {registerForm.formState.errors.root && (
                <p className="text-sm text-destructive">{registerForm.formState.errors.root.message}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Registering…' : 'Register & Get OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={codeForm.handleSubmit(onVerify)} className="space-y-4">
              <div>
                <Label>Enter 6-digit OTP</Label>
                <OtpInput value={codeForm.watch('code') ?? ''} onChange={(c) => codeForm.setValue('code', c)} />
                {codeForm.formState.errors.code && (
                  <p className="mt-1 text-sm text-destructive">{codeForm.formState.errors.code.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify & Login'}
              </Button>
            </form>
          )}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
