import { Notification } from '../models';
import { NotificationType } from '../types';

export async function createNotification(data: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  meta?: object;
}): Promise<Notification> {
  const notification = await Notification.create({
    user_id: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    meta: data.meta ?? null,
  });
  try {
    const emitter = require('../socket/socket.emitter');
    emitter.emitToUser(data.userId, 'notification:new', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: (notification as any).created_at ?? notification.get('created_at'),
    });
  } catch (_) {}
  return notification;
}

export async function getNotifications(
  userId: string,
  page = 1,
  limit = 20
): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
  const offset = (page - 1) * limit;

  const [rows, count, unreadCount] = await Promise.all([
    Notification.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      offset,
      limit,
    }),
    Notification.count({ where: { user_id: userId } }),
    Notification.count({ where: { user_id: userId, read_status: false } }),
  ]);

  return { notifications: rows, total: count, unreadCount };
}

export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  const notification = await Notification.findByPk(notificationId);
  if (!notification || notification.user_id !== userId) {
    throw new Error('Forbidden');
  }
  if (!notification.read_status) {
    notification.read_status = true;
    await notification.save();
  }
}

export async function markAllAsRead(userId: string): Promise<void> {
  await Notification.update(
    { read_status: true },
    { where: { user_id: userId, read_status: false } }
  );
}

