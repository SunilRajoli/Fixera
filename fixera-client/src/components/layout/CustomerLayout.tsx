import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { CustomerSidebar } from '@/components/customer/CustomerSidebar'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { Toaster } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'CUSTOMER') {
    if (user.role === 'TECHNICIAN') return <Navigate to="/dashboard" replace />
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function CustomerLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const pageTitle = (() => {
    const path = location.pathname
    if (path === '/home') return 'Home'
    if (path === '/bookings') return 'Bookings'
    if (path === '/bookings/new') return 'New booking'
    if (path.match(/^\/bookings\/[^/]+$/)) return 'Booking detail'
    if (path.match(/^\/bookings\/[^/]+\/track$/)) return 'Track technician'
    if (path === '/payments') return 'Payment History'
    if (path === '/profile') return 'Profile'
    return 'Customer'
  })()

  return (
    <ProtectedRoute>
      <RoleGuard>
        <div className="flex min-h-screen bg-background">
          <CustomerSidebar />
          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-6">
              <h1 className="text-lg font-semibold">{pageTitle}</h1>
              <div className="flex items-center gap-4">
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
        <Toaster />
      </RoleGuard>
    </ProtectedRoute>
  )
}
