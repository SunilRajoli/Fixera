import { useRef } from 'react'
import { Input } from '@/components/ui/input'

interface OtpInputProps {
  value: string
  onChange: (code: string) => void
}

export function OtpInput({ value, onChange }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const digits = value.padEnd(6, ' ').slice(0, 6).split('')

  const setDigit = (i: number, d: string) => {
    const digit = d.replace(/\D/g, '').slice(-1) ?? ''
    const next = value.split('')
    next[i] = digit
    onChange(next.join('').slice(0, 6))
    if (digit && i < 5) {
      inputRefs.current[i + 1]?.focus()
    }
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const next = value.split('')
      next[i - 1] = ''
      onChange(next.join('').slice(0, 6))
      inputRefs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length > 0) {
      onChange(pasted)
      const focusIdx = pasted.length >= 6 ? 5 : pasted.length
      inputRefs.current[focusIdx]?.focus()
    }
  }

  return (
    <div className="mt-2 flex gap-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Input
          key={i}
          ref={(el) => { inputRefs.current[i] = el }}
          value={digits[i] === ' ' ? '' : digits[i]}
          maxLength={1}
          className="h-12 w-12 text-center text-lg"
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  )
}
