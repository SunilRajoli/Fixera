import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Star, MapPin } from 'lucide-react'
import type { Technician } from '@/types'
import { cn } from '@/lib/utils'

export default function TechnicianProfile() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const { data: me, isLoading: meLoading, isError: meError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<{ data: { id: string; name: string; phone: string; role: string; technicianProfile?: Technician } }>('/api/auth/me')
      return res.data.data
    },
    enabled: !!user,
  })

  const profile = me?.technicianProfile ?? (me as { technicianProfile?: Technician })?.technicianProfile
  const verificationStatus = (profile as Technician)?.verificationStatus ?? 'PENDING'

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const safeRating = (v: unknown): string => {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n.toFixed(1) : '0'
  }
  const safePercent = (v: unknown): number => {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? (n <= 1 ? n * 100 : n) : 0
  }

  if (!user) return <LoadingSpinner className="min-h-[40vh]" />
  if (meLoading) return <LoadingSpinner className="min-h-[40vh]" message="Loading profile..." />
  if (meError) {
    return (
      <div className="space-y-6 p-4">
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-muted-foreground">Could not load profile. You can still use the app.</p>
        <p className="text-sm text-muted-foreground">Name: {user.name} · {user.phone}</p>
        <Button variant="outline" className="w-full border-red-500 text-red-600" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-semibold">Profile</h1>
      <Card>
        <CardContent className="flex flex-col items-center pt-6">
          <Avatar className="h-20 w-20 rounded-full bg-green-500/20 text-xl font-medium text-green-700">
            <AvatarFallback>{(me?.name ?? user.name).slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <p className="mt-2 font-medium">{me?.name ?? user.name}</p>
          <p className="text-sm text-muted-foreground">{me?.phone ?? user.phone}</p>
          {(profile as Technician)?.city && (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {(profile as Technician).city}
            </p>
          )}
          <div className="mt-3">
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                verificationStatus === 'APPROVED' && 'bg-green-100 text-green-800',
                verificationStatus === 'PENDING' && 'bg-yellow-100 text-yellow-800',
                verificationStatus === 'REJECTED' && 'bg-red-100 text-red-800'
              )}
            >
              {verificationStatus === 'APPROVED' ? 'Verified ✓' : verificationStatus === 'PENDING' ? 'Pending verification' : 'Rejected'}
            </span>
          </div>
        </CardContent>
      </Card>
      {(profile as Technician) && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-center text-sm">
              <div>
                <p className="flex items-center justify-center gap-1 font-medium">
                  <Star className="h-4 w-4" />
                  {safeRating((profile as Technician).rating)}
                </p>
                <p className="text-muted-foreground">Rating</p>
              </div>
              <div>
                <p className="font-medium">{(profile as Technician).totalReviews ?? 0}</p>
                <p className="text-muted-foreground">Reviews</p>
              </div>
              <div>
                <p className="font-medium">{safePercent((profile as Technician).acceptanceRate)}%</p>
                <p className="text-muted-foreground">Acceptance rate</p>
              </div>
              <div>
                <p className="font-medium">{(profile as Technician).workingHoursStart ?? '—'} – {(profile as Technician).workingHoursEnd ?? '—'}</p>
                <p className="text-muted-foreground">Working hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <Button variant="outline" className="w-full border-red-500 text-red-600" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  )
}
