import { useEffect } from 'react'
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useJobStore } from '@/store/job.store'
import { useSocket } from '@/hooks/useSocket'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { TechnicianSidebar } from '@/components/technician/TechnicianSidebar'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { Toaster } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { IncomingJobAlert } from '@/components/technician/IncomingJobAlert'

function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'TECHNICIAN') {
    if (user.role === 'CUSTOMER') return <Navigate to="/home" replace />
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function TechnicianLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const { socket } = useSocket()
  const setIncomingJob = useJobStore((s) => s.setIncomingJob)

  useEffect(() => {
    if (!socket) return
    const onAssignment = (data: { jobId: string; bookingId: string; service?: string; address?: string; scheduledTime?: string; inspectionFee?: number }) => {
      setIncomingJob({
        jobId: data.jobId,
        bookingId: data.bookingId,
        service: data.service ?? 'Service',
        address: data.address ?? '',
        scheduledTime: data.scheduledTime ?? new Date().toISOString(),
        inspectionFee: data.inspectionFee ?? 0,
      })
    }
    socket.on('job:new-assignment', onAssignment)
    return () => { socket.off('job:new-assignment', onAssignment) }
  }, [socket, setIncomingJob])

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const pageTitle = (() => {
    const path = location.pathname
    if (path === '/dashboard') return 'Dashboard'
    if (path === '/jobs') return 'Jobs'
    if (path.startsWith('/jobs/')) return 'Job detail'
    if (path === '/earnings') return 'Earnings'
    if (path === '/technician/profile') return 'Profile'
    return 'Technician'
  })()

  return (
    <ProtectedRoute>
      <RoleGuard>
        <div className="flex min-h-screen bg-background">
          <TechnicianSidebar />
          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-6">
              <h1 className="text-lg font-semibold">{pageTitle}</h1>
              <div className="flex items-center gap-4">
                <span className="h-2 w-2 rounded-full bg-green-500" title="Status" />
                <NotificationBell />
                <span className="text-sm text-muted-foreground">{user?.name}</span>
                <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </header>
            <main className="flex-1 overflow-auto p-6">
              <Outlet />
            </main>
          </div>
        </div>
        <IncomingJobAlert />
        <Toaster />
      </RoleGuard>
    </ProtectedRoute>
  )
}
