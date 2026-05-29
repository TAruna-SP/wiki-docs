import { Router } from 'express';
import * as ctrl from '../controllers/jobController.js';
import { auth } from '../middleware/auth.js';
import { admin } from '../middleware/auth.js';

// Manual triggers for scheduled jobs (admin only). Milestone 6/7 build the UI.
const router = Router();

router.get('/', auth, admin, ctrl.list);
router.post('/:name/run', auth, admin, ctrl.run);

export default router;
