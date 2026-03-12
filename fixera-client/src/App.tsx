import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'

const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))

const CustomerLayout = lazy(() => import('./components/layout/CustomerLayout'))
const CustomerHome = lazy(() => import('./pages/customer/HomePage'))
const NewBookingPage = lazy(() => import('./pages/customer/NewBookingPage'))
const BookingListPage = lazy(() => import('./pages/customer/BookingListPage'))
const CustomerBookingDetail = lazy(() => import('./pages/customer/BookingDetailPage'))
const TrackingPage = lazy(() => import('./pages/customer/TrackingPage'))
const PaymentHistoryPage = lazy(() => import('./pages/customer/PaymentHistoryPage'))
const CustomerProfile = lazy(() => import('./pages/customer/ProfilePage'))

const TechnicianLayout = lazy(() => import('./components/layout/TechnicianLayout'))
const TechnicianDashboard = lazy(() => import('./pages/technician/DashboardPage'))
const JobListPage = lazy(() => import('./pages/technician/JobListPage'))
const JobDetailPage = lazy(() => import('./pages/technician/JobDetailPage'))
const EarningsPage = lazy(() => import('./pages/technician/EarningsPage'))
const TechnicianProfile = lazy(() => import('./pages/technician/ProfilePage'))

const AdminLayout = lazy(() => import('./components/layout/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/DashboardPage'))
const AdminBookingList = lazy(() => import('./pages/admin/BookingListPage'))
const AdminBookingDetail = lazy(() => import('./pages/admin/BookingDetailPage'))
const TechnicianListPage = lazy(() => import('./pages/admin/TechnicianListPage'))
const TechnicianDetailPage = lazy(() => import('./pages/admin/TechnicianDetailPage'))
const DisputeListPage = lazy(() => import('./pages/admin/DisputeListPage'))
const DisputeDetailPage = lazy(() => import('./pages/admin/DisputeDetailPage'))
const PayoutListPage = lazy(() => import('./pages/admin/PayoutListPage'))
const CustomerListPage = lazy(() => import('./pages/admin/CustomerListPage'))

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

function RoleRedirect() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'CUSTOMER') return <Navigate to="/home" replace />
  if (user.role === 'TECHNICIAN') return <Navigate to="/dashboard" replace />
  if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<CustomerLayout />}>
        <Route path="/home" element={<CustomerHome />} />
        <Route path="/bookings" element={<BookingListPage />} />
        <Route path="/bookings/new" element={<NewBookingPage />} />
        <Route path="/bookings/:id" element={<CustomerBookingDetail />} />
        <Route path="/bookings/:id/track" element={<TrackingPage />} />
        <Route path="/payments" element={<PaymentHistoryPage />} />
        <Route path="/profile" element={<CustomerProfile />} />
      </Route>

      <Route element={<TechnicianLayout />}>
        <Route path="/dashboard" element={<TechnicianDashboard />} />
        <Route path="/jobs" element={<JobListPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/earnings" element={<EarningsPage />} />
        <Route path="/technician/profile" element={<TechnicianProfile />} />
      </Route>

      <Route element={<AdminLayout />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/bookings" element={<AdminBookingList />} />
        <Route path="/admin/bookings/:id" element={<AdminBookingDetail />} />
        <Route path="/admin/technicians" element={<TechnicianListPage />} />
        <Route path="/admin/technicians/:id" element={<TechnicianDetailPage />} />
        <Route path="/admin/disputes" element={<DisputeListPage />} />
        <Route path="/admin/disputes/:id" element={<DisputeDetailPage />} />
        <Route path="/admin/payouts" element={<PayoutListPage />} />
        <Route path="/admin/customers" element={<CustomerListPage />} />
      </Route>

      <Route path="*" element={<RoleRedirect />} />
    </Routes>
    </Suspense>
  )
}
