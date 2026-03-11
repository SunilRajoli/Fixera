import { io, Socket } from 'socket.io-client'

let socketInstance: Socket | null = null

export const getSocket = (namespace: string): Socket => {
  if (socketInstance) socketInstance.disconnect()
  socketInstance = io(
    `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${namespace}`,
    {
      auth: { token: localStorage.getItem('fixera_token') },
      autoConnect: false,
    }
  )
  return socketInstance
}

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}
