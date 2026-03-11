import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Notification } from '../types'

interface NotificationsResponse {
  success: boolean
  data: {
    notifications: Notification[]
    total: number
    unreadCount: number
  }
}

export function useNotifications(page = 1, limit = 20) {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications', page, limit],
    queryFn: async () => {
      const res = await api.get<NotificationsResponse>('/api/notifications', {
        params: { page, limit },
      })
      return res.data.data
    },
  })

  const markRead = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/api/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  return {
    notifications: data?.notifications ?? [],
    total: data?.total ?? 0,
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    error,
    markRead: markRead.mutate,
    markAllRead: markAllRead.mutate,
  }
}
