import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'CUSTOMER' | 'TECHNICIAN' | 'ADMIN'

export interface AuthUser {
  id: string
  name: string
  phone: string
  role: UserRole
  email?: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem('fixera_token', token)
        set({ user, token, isAuthenticated: true })
      },
      clearAuth: () => {
        localStorage.removeItem('fixera_token')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    { name: 'fixera_auth' }
  )
)
