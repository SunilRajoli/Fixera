import { useEffect } from 'react'
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useJobStore } from '@/store/job.store'
import { useSocket } from '@/hooks/useSocket'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { LayoutDashboard, Briefcase, Wallet, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/toaster'
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

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/earnings', label: 'Earnings', icon: Wallet },
  { path: '/technician/profile', label: 'Profile', icon: User },
]

export default function TechnicianLayout() {
  const location = useLocation()
  const navigate = useNavigate()
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

  return (
    <ProtectedRoute>
      <RoleGuard>
        <div className="flex min-h-screen flex-col bg-background">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card px-4">
            <span className="text-xl font-bold">
              <span className="text-primary">fix</span>
              <span className="text-slate-700">era</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" title="Online" />
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 overflow-auto pb-20">
            <Outlet />
          </main>
          <nav className="fixed bottom-0 left-0 right-0 flex border-t bg-card">
            {navItems.map(({ path, label, icon: Icon }) => (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-3 text-xs',
                  location.pathname === path
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </nav>
        </div>
        <IncomingJobAlert />
        <Toaster />
      </RoleGuard>
    </ProtectedRoute>
  )
}
