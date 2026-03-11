import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { Sidebar } from '@/components/admin/Sidebar'
import { Toaster } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') {
    if (user.role === 'CUSTOMER') return <Navigate to="/home" replace />
    if (user.role === 'TECHNICIAN') return <Navigate to="/dashboard" replace />
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function AdminLayout() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const pageTitle = (() => {
    const path = location.pathname
    if (path.includes('/admin/bookings') && path.match(/\/admin\/bookings\/[^/]+$/)) return 'Booking detail'
    if (path.includes('/admin/technicians') && path.match(/\/admin\/technicians\/[^/]+$/)) return 'Technician detail'
    if (path.includes('/admin/disputes') && path.match(/\/admin\/disputes\/[^/]+$/)) return 'Dispute detail'
    if (path === '/admin/dashboard') return 'Dashboard'
    if (path === '/admin/bookings') return 'Bookings'
    if (path === '/admin/technicians') return 'Technicians'
    if (path === '/admin/disputes') return 'Disputes'
    if (path === '/admin/payouts') return 'Payouts'
    if (path === '/admin/customers') return 'Customers'
    return 'Admin'
  })()

  return (
    <ProtectedRoute>
      <RoleGuard>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-6">
              <h1 className="text-lg font-semibold">{pageTitle}</h1>
              <div className="flex items-center gap-4">
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
