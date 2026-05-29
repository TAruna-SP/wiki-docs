import { Router } from 'express';
import * as ctrl from '../controllers/userController.js';

const router = Router();

router.get('/leaderboard', ctrl.leaderboard);

export default router;
