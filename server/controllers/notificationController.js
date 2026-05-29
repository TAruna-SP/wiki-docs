import * as notificationService from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const items = await notificationService.listNotifications(req.userId, {
    unreadOnly: req.query.unread === 'true',
  });
  res.json({ items });
});

export const unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.unreadCount(req.userId);
  res.json({ count });
});

export const markRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markRead(req.userId, req.params.id);
  res.json(result);
});

export const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.userId);
  res.json(result);
});
