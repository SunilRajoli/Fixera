import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
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

interface JobCardProps {
  job: JobWithBooking
}

export function JobCard({ job }: JobCardProps) {
  const status = (job.booking?.status as BookingStatus) ?? BookingStatus.ASSIGNED
  const payout = job.booking?.repairCost != null ? Number(job.booking.repairCost) * 0.85 : 0

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{job.booking?.service?.name ?? 'Job'}</p>
            <p className="text-sm text-muted-foreground">
              {job.booking?.customer?.name ?? 'Customer'} · {job.booking?.address?.slice(0, 30) ?? ''}…
            </p>
            <p className="mt-1 text-sm">{format(new Date(job.booking?.scheduledTime ?? job.assignedAt), 'dd MMM, hh:mm a')}</p>
            {payout > 0 && (
              <p className="mt-1 text-sm font-medium text-green-600">
                Earnings: ₹{payout.toLocaleString('en-IN')}
              </p>
            )}
          </div>
          <StatusBadge status={status} />
        </div>
        <Link to={`/jobs/${job.id}`}>
          <Button size="sm" className="mt-3 w-full">View</Button>
        </Link>
      </CardContent>
    </Card>
  )
}
