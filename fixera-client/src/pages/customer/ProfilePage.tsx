import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
export default function CustomerProfile() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(user?.name ?? '')

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<{ data: { id: string; name: string; phone: string; role: string } }>('/api/auth/me')
      return res.data.data
    },
    enabled: !!user,
  })

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get<{ data: unknown[] }>('/api/bookings')
      return res.data.data ?? []
    },
    enabled: !!user,
  })

  const total = bookings.length
  const list = bookings as { status?: string }[]
  const completed = list.filter((b) => b.status === 'CLOSED' || b.status === 'CONFIRMED').length
  const cancelled = list.filter((b) => b.status === 'CANCELLED').length

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  if (isLoading || !user) return <LoadingSpinner className="min-h-[40vh]" />

  const displayName = me?.name ?? user.name ?? ''

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-semibold">Profile</h1>
      <Card>
        <CardContent className="flex flex-col items-center pt-6">
          <Avatar className="h-20 w-20 rounded-full bg-primary/20 text-xl font-medium text-primary">
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <p className="mt-2 font-medium">{displayName}</p>
          <p className="text-sm text-muted-foreground">{me?.phone ?? user.phone}</p>
          {editingName ? (
            <div className="mt-4 flex w-full max-w-xs gap-2">
              <Label htmlFor="name" className="sr-only">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" onClick={() => setEditingName(false)}>Save</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEditingName(true)}>
              Edit name
            </Button>
          )}
        </CardContent>
      </Card>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-semibold">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-semibold">{completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-semibold">{cancelled}</p>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>
      </div>
      <Button variant="outline" className="w-full border-red-500 text-red-600" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  )
}
