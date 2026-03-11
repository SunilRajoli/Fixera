import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { JobCard } from '@/components/technician/JobCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { EmptyState } from '@/components/shared/EmptyState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Job } from '@/types'

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

export default function JobListPage() {
  const { data: todayJobs = [], isLoading: todayLoading, error: todayError, refetch: refetchToday } = useQuery({
    queryKey: ['jobs', 'today'],
    queryFn: async () => {
      const res = await api.get<{ data: JobWithBooking[] }>('/api/jobs', { params: { filter: 'today' } })
      return res.data.data ?? []
    },
  })

  const { data: upcomingJobs = [], isLoading: upcomingLoading, refetch: refetchUpcoming } = useQuery({
    queryKey: ['jobs', 'upcoming'],
    queryFn: async () => {
      const res = await api.get<{ data: JobWithBooking[] }>('/api/jobs', { params: { filter: 'upcoming' } })
      return res.data.data ?? []
    },
  })

  const { data: completedJobs = [], isLoading: completedLoading, refetch: refetchCompleted } = useQuery({
    queryKey: ['jobs', 'completed'],
    queryFn: async () => {
      const res = await api.get<{ data: JobWithBooking[] }>('/api/jobs', { params: { filter: 'completed' } })
      return res.data.data ?? []
    },
  })

  const isLoading = todayLoading || upcomingLoading || completedLoading
  const error = todayError

  if (isLoading) return <LoadingSpinner className="min-h-[40vh]" message="Loading jobs..." />
  if (error) return <ErrorMessage className="min-h-[40vh]" message={(error as Error).message} onRetry={() => { refetchToday(); refetchUpcoming(); refetchCompleted(); }} />

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Jobs</h1>
      <Tabs defaultValue="today">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="mt-4 space-y-3">
          {todayJobs.length === 0 ? (
            <EmptyState title="No jobs today" />
          ) : (
            todayJobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </TabsContent>
        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcomingJobs.length === 0 ? (
            <EmptyState title="No upcoming jobs" />
          ) : (
            upcomingJobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </TabsContent>
        <TabsContent value="completed" className="mt-4 space-y-3">
          {completedJobs.length === 0 ? (
            <EmptyState title="No completed jobs" />
          ) : (
            completedJobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
