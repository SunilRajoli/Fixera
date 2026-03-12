import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { useSocket } from '@/hooks/useSocket'
import api from '@/lib/api'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { JobCard } from '@/components/technician/JobCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { EmptyState } from '@/components/shared/EmptyState'
import { format } from 'date-fns'
import type { Job } from '@/types'
import { BookingStatus } from '@/types'

interface JobWithBooking extends Job {
  booking?: {
    id: string
    status: string
    scheduledTime: string
    address?: string
    repairCost?: number
    service?: { name: string }
    customer?: { name?: string }
  }
}

export default function TechnicianDashboard() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { socket, isConnected } = useSocket()

  const { data: me, refetch: refetchMe } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<{ data: { technicianProfile?: { isOnline?: boolean } } }>('/api/auth/me')
      return res.data.data
    },
    enabled: !!user,
    refetchOnMount: 'always',
    staleTime: 0,
  })

  const isOnline = !!me?.technicianProfile?.isOnline

  useEffect(() => {
    if (!socket) return
    const onStatus = (payload: { isOnline?: boolean }) => {
      queryClient.setQueryData(['me'], (old: { technicianProfile?: { isOnline?: boolean } } | undefined) =>
        old
          ? { ...old, technicianProfile: { ...old.technicianProfile, isOnline: payload.isOnline } }
          : old
      )
    }
    socket.on('technician:status', onStatus)
    return () => { socket.off('technician:status', onStatus) }
  }, [socket, queryClient])

  useEffect(() => {
    if (isConnected) void refetchMe()
  }, [isConnected, refetchMe])

  useEffect(() => {
    if (!isConnected) {
      queryClient.setQueryData(['me'], (old: { technicianProfile?: { isOnline?: boolean } } | undefined) =>
        old ? { ...old, technicianProfile: { ...old.technicianProfile, isOnline: false } } : old
      )
    }
  }, [isConnected, queryClient])

  const { data: jobs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['jobs', 'today'],
    queryFn: async () => {
      const res = await api.get<{ data: JobWithBooking[] }>('/api/jobs', { params: { filter: 'today' } })
      return res.data.data ?? []
    },
  })

  const handleOnlineToggle = (on: boolean) => {
    queryClient.setQueryData(['me'], (old: { technicianProfile?: { isOnline?: boolean } } | undefined) =>
      old ? { ...old, technicianProfile: { ...old.technicianProfile, isOnline: on } } : old
    )
    if (socket) socket.emit(on ? 'technician:go-online' : 'technician:go-offline')
    queryClient.invalidateQueries({ queryKey: ['me'] })
  }

  const completedToday = jobs.filter(
    (j) => (j.booking?.status as string) === BookingStatus.COMPLETED || (j.booking?.status as string) === BookingStatus.CLOSED || (j.booking?.status as string) === BookingStatus.CONFIRMED
  )
  const earningsToday = completedToday.reduce((sum, j) => sum + Number(j.booking?.repairCost ?? 0) * 0.85, 0)

  if (isLoading) return <LoadingSpinner className="min-h-[40vh]" message="Loading..." />
  if (error) return <ErrorMessage className="min-h-[40vh]" message={(error as Error).message} onRetry={() => refetch()} />

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-xl font-semibold">
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, d MMM yyyy')}</p>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="font-medium">You are {isOnline ? 'Online' : 'Offline'}</p>
            <p className="text-sm text-muted-foreground">Toggle to receive job requests</p>
          </div>
          <Switch checked={isOnline} onCheckedChange={handleOnlineToggle} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-semibold">{jobs.length}</p>
            <p className="text-xs text-muted-foreground">Today&apos;s jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-semibold">{completedToday.length}</p>
            <p className="text-xs text-muted-foreground">Completed today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-semibold text-green-600">
              ₹{earningsToday.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-muted-foreground">Today&apos;s earnings</p>
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 font-medium">Today&apos;s jobs</h2>
        {jobs.length === 0 ? (
          <EmptyState title="No jobs today" description="You're all set. New requests will appear here." />
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
