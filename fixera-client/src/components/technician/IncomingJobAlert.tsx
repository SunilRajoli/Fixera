import { useEffect, useState } from 'react'
import { useJobStore } from '@/store/job.store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import api from '@/lib/api'
import { useToastStore } from '@/store/toast.store'
import { useQueryClient } from '@tanstack/react-query'

const COUNTDOWN_SECONDS = 30

export function IncomingJobAlert() {
  const { incomingJob, clearIncomingJob } = useJobStore()
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS)
  const toast = useToastStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!incomingJob) return
    setSecondsLeft(COUNTDOWN_SECONDS)
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval)
          clearIncomingJob()
          toast.add('Job request expired', 'info')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [incomingJob?.jobId])

  if (!incomingJob) return null

  const handleAccept = async () => {
    try {
      await api.post(`/api/jobs/${incomingJob.jobId}/accept`)
      clearIncomingJob()
      toast.add('Job accepted!', 'success')
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    } catch (e) {
      toast.add((e as Error).message || 'Failed to accept', 'error')
    }
  }

  const handleReject = async () => {
    try {
      await api.post(`/api/jobs/${incomingJob.jobId}/reject`)
      clearIncomingJob()
      toast.add('Job rejected', 'info')
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    } catch (e) {
      toast.add((e as Error).message || 'Failed to reject', 'error')
    }
  }

  const radius = 36
  const circumference = 2 * Math.PI * radius
  const progress = secondsLeft / COUNTDOWN_SECONDS
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <span className="text-2xl">🔔</span>
          </div>
          <h2 className="text-lg font-semibold">New Job Request</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Service:</span> {incomingJob.service}</p>
            <p><span className="font-medium">Address:</span> {incomingJob.address}</p>
            <p><span className="font-medium">Time:</span> {new Date(incomingJob.scheduledTime).toLocaleString()}</p>
            <p><span className="font-medium">Inspection fee:</span> ₹{Number(incomingJob.inspectionFee || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="flex justify-center">
            <div className="relative inline-flex h-20 w-20 items-center justify-center">
              <svg className="-rotate-90 h-20 w-20">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-muted"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-primary transition-all duration-1000"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-lg font-bold">{secondsLeft}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleAccept}>
              Accept
            </Button>
            <Button variant="outline" className="flex-1 border-red-500 text-red-600 hover:bg-red-50" onClick={handleReject}>
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
