import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  message?: string
}

export function LoadingSpinner({ className, message }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 p-8', className)}>
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
