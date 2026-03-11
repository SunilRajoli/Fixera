import { useToastStore } from '@/store/toast.store'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

export function Toaster() {
  const { toasts, remove } = useToastStore()
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg',
            t.type === 'success' && 'border-green-500/50 bg-green-50 text-green-900',
            t.type === 'error' && 'border-destructive/50 bg-destructive/10 text-destructive',
            t.type === 'info' && 'border-primary/30 bg-primary/5'
          )}
        >
          <span className="text-sm">{t.message}</span>
          <button
            type="button"
            onClick={() => remove(t.id)}
            className="rounded p-1 hover:bg-black/10"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
