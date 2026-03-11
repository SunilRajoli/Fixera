import { cn } from '@/lib/utils'
import type { Service } from '@/types'

interface ServiceSelectorProps {
  services: Service[]
  selectedId: string | null
  onSelect: (service: Service) => void
}

const serviceIcons: Record<string, string> = {
  'AC Repair': '❄️',
  'Plumbing': '🔧',
  'Electrical': '⚡',
  'Appliance Repair': '🔌',
  'Refrigerator': '🧊',
  'Washing Machine': '🧺',
}

export function ServiceSelector({ services, selectedId, onSelect }: ServiceSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {services.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s)}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors',
            selectedId === s.id ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/50'
          )}
        >
          <span className="text-2xl">{serviceIcons[s.name] ?? '🔧'}</span>
          <span className="text-center text-sm font-medium">{s.name}</span>
          <span className="text-xs text-muted-foreground">
            From ₹{Number(s.inspectionFee ?? 0).toLocaleString('en-IN')}
          </span>
        </button>
      ))}
    </div>
  )
}
