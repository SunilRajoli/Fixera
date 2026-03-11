/**
 * Socket.io server — namespaces and event reference
 *
 * Client → Server:
 *   /customer:  booking:join, booking:leave, booking:confirm, ping
 *   /technician: booking:join, job:accept, job:reject, job:start-travel, job:start-job, job:complete, location:update, technician:go-online, technician:go-offline
 *   /admin:      admin:join-booking, ping
 *
 * Server → Client:
 *   booking:status-changed, booking:joined, technician:location, job:new-assignment, job:reassigned, wallet:updated,
 *   dispute:new, dispute:raised, notification:new, technician:status, booking:new, booking:failed, error, pong
 */

import { Server as HttpServer } from 'http';
import { Server, Namespace } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redis from '../config/redis';
import logger from '../utils/logger';
import { socketAuthMiddleware } from './socket.auth';
import { UserRole } from '../types';
import { registerCustomerHandlers } from './handlers/customer.handler';
import { registerTechnicianHandlers } from './handlers/technician.handler';
import { registerAdminHandlers } from './handlers/admin.handler';

export interface SocketData {
  userId: string;
  role: UserRole;
  phone: string;
}

let io: Server;
let customerNsp: Namespace;
let technicianNsp: Namespace;
let adminNsp: Namespace;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  io.adapter(createAdapter(pubClient as any, subClient as any));

  customerNsp = io.of('/customer');
  technicianNsp = io.of('/technician');
  adminNsp = io.of('/admin');

  customerNsp.use(socketAuthMiddleware);
  technicianNsp.use(socketAuthMiddleware);
  adminNsp.use(socketAuthMiddleware);

  customerNsp.use((socket, next) => {
    if ((socket.data as SocketData).role !== UserRole.CUSTOMER) {
      socket.disconnect(true);
      return;
    }
    next();
  });
  technicianNsp.use((socket, next) => {
    if ((socket.data as SocketData).role !== UserRole.TECHNICIAN) {
      socket.disconnect(true);
      return;
    }
    next();
  });
  adminNsp.use((socket, next) => {
    if ((socket.data as SocketData).role !== UserRole.ADMIN) {
      socket.disconnect(true);
      return;
    }
    next();
  });

  customerNsp.on('connection', (socket) => {
    registerCustomerHandlers(customerNsp, socket);
  });
  technicianNsp.on('connection', (socket) => {
    registerTechnicianHandlers(technicianNsp, socket);
  });
  adminNsp.on('connection', (socket) => {
    registerAdminHandlers(adminNsp, socket);
  });

  logger.info('Socket.io server initialized with namespaces /customer, /technician, /admin');
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket server not initialized');
  }
  return io;
}

export function getCustomerNsp(): Namespace {
  if (!customerNsp) throw new Error('Socket server not initialized');
  return customerNsp;
}
export function getTechnicianNsp(): Namespace {
  if (!technicianNsp) throw new Error('Socket server not initialized');
  return technicianNsp;
}
export function getAdminNsp(): Namespace {
  if (!adminNsp) throw new Error('Socket server not initialized');
  return adminNsp;
}
