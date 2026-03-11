import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { Home, Calendar, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/toaster'

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

const navItems = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/bookings', label: 'Bookings', icon: Calendar },
  { path: '/profile', label: 'Profile', icon: User },
]

export default function CustomerLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <ProtectedRoute>
      <RoleGuard>
        <div className="flex min-h-screen flex-col bg-background">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card px-4">
            <span className="text-xl font-bold">
              <span className="text-primary">fix</span>
              <span className="text-slate-700">era</span>
            </span>
            <NotificationBell />
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
        <Toaster />
      </RoleGuard>
    </ProtectedRoute>
  )
}
