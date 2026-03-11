import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../store/auth.store'
import { getSocket, disconnectSocket } from '../lib/socket'
import type { Socket } from 'socket.io-client'

export function useSocket() {
  const { user, isAuthenticated } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const namespace =
      user.role === 'CUSTOMER'
        ? '/customer'
        : user.role === 'TECHNICIAN'
          ? '/technician'
          : '/admin'

    const socket = getSocket(namespace)
    socketRef.current = socket
    socket.connect()
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))

    return () => {
      disconnectSocket()
    }
  }, [isAuthenticated, user?.role])

  return { socket: socketRef.current, isConnected }
}
