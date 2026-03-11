import { useEffect, useState } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { cn } from '@/lib/utils'

interface AlertItem {
  id: string
  type: 'booking:new' | 'dispute:new' | 'booking:failed'
  message: string
  timestamp: Date
}

export function RealtimeAlerts() {
  const { socket } = useSocket()
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  useEffect(() => {
    if (!socket) return
    const onNew = (data: { bookingId?: string }) => {
      setAlerts((prev) => [
        { id: Math.random().toString(36), type: 'booking:new', message: `New booking #${(data.bookingId ?? '').slice(-8)}`, timestamp: new Date() },
        ...prev.slice(0, 19),
      ])
    }
    const onDispute = (data: { disputeId?: string; bookingId?: string }) => {
      setAlerts((prev) => [
        { id: Math.random().toString(36), type: 'dispute:new', message: `Dispute raised #${(data.bookingId ?? data.disputeId ?? '').slice(-8)}`, timestamp: new Date() },
        ...prev.slice(0, 19),
      ])
    }
    const onFailed = (data: { bookingId?: string }) => {
      setAlerts((prev) => [
        { id: Math.random().toString(36), type: 'booking:failed', message: `Matching failed #${(data.bookingId ?? '').slice(-8)}`, timestamp: new Date() },
        ...prev.slice(0, 19),
      ])
    }
    socket.on('booking:new', onNew)
    socket.on('dispute:new', onDispute)
    socket.on('booking:failed', onFailed)
    return () => {
      socket.off('booking:new', onNew)
      socket.off('dispute:new', onDispute)
      socket.off('booking:failed', onFailed)
    }
  }, [socket])

  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border bg-card p-2">
      <h3 className="mb-2 text-sm font-medium">Live events</h3>
      {alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground">No recent events.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={cn(
                'rounded px-2 py-1 text-xs',
                a.type === 'booking:new' && 'bg-blue-50 text-blue-800',
                a.type === 'dispute:new' && 'bg-red-50 text-red-800',
                a.type === 'booking:failed' && 'bg-orange-50 text-orange-800'
              )}
            >
              {a.message}
              <span className="ml-2 text-muted-foreground">
                {a.timestamp.toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
