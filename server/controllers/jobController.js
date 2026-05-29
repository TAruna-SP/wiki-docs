import { runJob, jobs } from '../jobs/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const list = asyncHandler(async (_req, res) => {
  res.json({
    jobs: Object.entries(jobs).map(([name, j]) => ({
      name,
      schedule: j.schedule,
      description: j.description,
    })),
  });
});

export const run = asyncHandler(async (req, res) => {
  const { name } = req.params;
  if (!jobs[name]) throw ApiError.notFound(`Unknown job: ${name}`);
  const result = await runJob(name, { force: true });
  res.json({ name, result });
});
