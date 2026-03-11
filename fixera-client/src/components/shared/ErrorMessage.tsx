import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

interface ErrorMessageProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorMessage({ message = 'Something went wrong.', onRetry, className }: ErrorMessageProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center',
        className
      )}
    >
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90"
        >
          Try again
        </button>
      )}
    </div>
  )
}
