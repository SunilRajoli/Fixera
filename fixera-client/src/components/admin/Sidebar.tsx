import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarCheck,
  Wrench,
  AlertTriangle,
  Wallet,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/admin/technicians', label: 'Technicians', icon: Wrench },
  { to: '/admin/disputes', label: 'Disputes', icon: AlertTriangle, badgeKey: 'disputes' },
  { to: '/admin/payouts', label: 'Payouts', icon: Wallet },
  { to: '/admin/customers', label: 'Customers', icon: Users },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="flex w-56 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-bold">
          <span className="text-primary">fix</span>
          <span className="text-slate-700">era</span>
        </span>
        <span className="ml-1 text-xs text-muted-foreground">Admin</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              location.pathname === to
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
