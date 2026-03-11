import { cn } from '@/lib/utils'

const SLOTS = [
  { id: '09:00', label: '09:00 – 11:00' },
  { id: '11:00', label: '11:00 – 13:00' },
  { id: '13:00', label: '13:00 – 15:00' },
  { id: '15:00', label: '15:00 – 17:00' },
]

interface SlotPickerProps {
  selectedSlot: string | null
  onSelect: (slotId: string) => void
}

export function SlotPicker({ selectedSlot, onSelect }: SlotPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SLOTS.map((slot) => (
        <button
          key={slot.id}
          type="button"
          onClick={() => onSelect(slot.id)}
          className={cn(
            'rounded-lg border-2 p-3 text-left text-sm font-medium transition-colors',
            selectedSlot === slot.id ? 'border-primary bg-primary/10' : 'border-muted'
          )}
        >
          {slot.label}
        </button>
      ))}
    </div>
  )
}
