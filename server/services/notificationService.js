import { Notification } from '../models/Notification.js';

/**
 * Create a notification. No-op (returns null) when there's no recipient — keeps
 * call sites simple (e.g. anonymous authors, self-actions filtered upstream).
 */
export async function notify({
  recipientId,
  type,
  title,
  message = '',
  link = null,
  queryId = null,
  answerId = null,
}) {
  if (!recipientId) return null;
  return Notification.create({
    recipient_id: recipientId,
    type,
    title,
    message,
    link,
    related_query_id: queryId,
    related_answer_id: answerId,
  });
}

export async function listNotifications(userId, { unreadOnly = false } = {}) {
  const filter = { recipient_id: userId };
  if (unreadOnly) filter.is_read = false;
  return Notification.find(filter).sort({ createdAt: -1 }).limit(50).lean();
}

export async function unreadCount(userId) {
  return Notification.countDocuments({ recipient_id: userId, is_read: false });
}

export async function markRead(userId, id) {
  await Notification.updateOne({ _id: id, recipient_id: userId }, { is_read: true });
  return { ok: true };
}

export async function markAllRead(userId) {
  await Notification.updateMany({ recipient_id: userId, is_read: false }, { is_read: true });
  return { ok: true };
}
