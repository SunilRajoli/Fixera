import { cn } from '@/lib/utils'
import { BookingStatus } from '@/types'

const STEPS = [
  { key: BookingStatus.ASSIGNED, label: 'Assigned' },
  { key: BookingStatus.ACCEPTED, label: 'Accepted' },
  { key: BookingStatus.ON_THE_WAY, label: 'On the way' },
  { key: BookingStatus.IN_PROGRESS, label: 'In progress' },
  { key: BookingStatus.COMPLETED, label: 'Completed' },
]

const ORDER: Record<string, number> = {
  [BookingStatus.ASSIGNED]: 0,
  [BookingStatus.ACCEPTED]: 1,
  [BookingStatus.ON_THE_WAY]: 2,
  [BookingStatus.IN_PROGRESS]: 3,
  [BookingStatus.COMPLETED]: 4,
}

interface JobStatusStepperProps {
  currentStatus: BookingStatus
}

export function JobStatusStepper({ currentStatus }: JobStatusStepperProps) {
  const currentIndex = ORDER[currentStatus] ?? 0

  return (
    <div className="flex items-center justify-between gap-1">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex
        const isCurrent = i === currentIndex
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center">
            <div
              className={cn(
                'h-3 w-3 rounded-full',
                isDone && 'bg-green-500',
                isCurrent && 'animate-pulse bg-primary',
                !isDone && !isCurrent && 'bg-muted'
              )}
            />
            <span
              className={cn(
                'mt-1 text-xs',
                isDone && 'text-green-600',
                isCurrent && 'font-medium text-primary',
                !isDone && !isCurrent && 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
