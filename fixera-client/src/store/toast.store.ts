import { create } from 'zustand'

interface Toast {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
}

interface ToastState {
  toasts: Toast[]
  add: (message: string, type?: Toast['type']) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = 'info') =>
    set((s) => {
      const id = Math.random().toString(36).slice(2)
      setTimeout(() => set((s2) => ({ toasts: s2.toasts.filter((t) => t.id !== id) })), 4000)
      return { toasts: [...s.toasts, { id, message, type }] }
    }),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
