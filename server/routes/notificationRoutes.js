import { Router } from 'express';
import * as ctrl from '../controllers/notificationController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.get('/', auth, ctrl.list);
router.get('/unread-count', auth, ctrl.unreadCount);
router.post('/read-all', auth, ctrl.markAllRead);
router.post('/:id/read', auth, ctrl.markRead);

export default router;
