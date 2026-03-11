import { cn } from '@/lib/utils'
import { BookingStatus } from '@/types'

const statusStyles: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [BookingStatus.MATCHING]: 'bg-yellow-100 text-yellow-800',
  [BookingStatus.REASSIGNING]: 'bg-yellow-100 text-yellow-800',
  [BookingStatus.ASSIGNED]: 'bg-blue-100 text-blue-800',
  [BookingStatus.ACCEPTED]: 'bg-blue-100 text-blue-800',
  [BookingStatus.ON_THE_WAY]: 'bg-purple-100 text-purple-800',
  [BookingStatus.IN_PROGRESS]: 'bg-purple-100 text-purple-800',
  [BookingStatus.COMPLETED]: 'bg-orange-100 text-orange-800',
  [BookingStatus.PAYMENT_HELD]: 'bg-orange-100 text-orange-800',
  [BookingStatus.CONFIRMED]: 'bg-green-100 text-green-800',
  [BookingStatus.CLOSED]: 'bg-green-100 text-green-800',
  [BookingStatus.CANCELLED]: 'bg-red-100 text-red-800',
  [BookingStatus.FAILED]: 'bg-red-100 text-red-800',
  [BookingStatus.DISPUTED]: 'bg-red-600 text-white',
}

interface StatusBadgeProps {
  status: BookingStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] ?? 'bg-gray-100 text-gray-800'
  const label = status.replace(/_/g, ' ')
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        style,
        className
      )}
    >
      {label}
    </span>
  )
}
