import { create } from 'zustand'

export interface IncomingJob {
  jobId: string
  bookingId: string
  service: string
  address: string
  scheduledTime: string
  inspectionFee: number
}

interface JobState {
  incomingJob: IncomingJob | null
  setIncomingJob: (job: IncomingJob) => void
  clearIncomingJob: () => void
}

export const useJobStore = create<JobState>((set) => ({
  incomingJob: null,
  setIncomingJob: (job) => set({ incomingJob: job }),
  clearIncomingJob: () => set({ incomingJob: null }),
}))
