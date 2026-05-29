import * as solutionService from '../services/solutionService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const leaderboard = asyncHandler(async (req, res) => {
  const users = await solutionService.getLeaderboard(req.query.limit);
  res.json({ users });
});
