// Central registry of scheduled jobs. Every job is a plain async function so it
// can run on a cron schedule AND be triggered manually by an admin (PLANNING §10
// / Milestone 7). New maintenance crons register here in later milestones.
import cron from 'node-cron';
import { finalizeSolutions } from './finalizeSolutions.js';

export const jobs = {
  'finalize-solutions': {
    schedule: '0 3 * * *', // daily at 03:00
    description: 'Resolve queries past their solution grace period (Path A/B).',
    handler: finalizeSolutions,
  },
};

/** Run a registered job by name. Throws if unknown. */
export async function runJob(name, opts = {}) {
  const job = jobs[name];
  if (!job) {
    const err = new Error(`Unknown job: ${name}`);
    err.statusCode = 404;
    throw err;
  }
  return job.handler(opts);
}

/** Register all cron schedules. Called from server.js (never during tests). */
export function scheduleJobs() {
  for (const [name, job] of Object.entries(jobs)) {
    cron.schedule(job.schedule, () => {
      job.handler().catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`[cron] ${name} failed`, err);
      });
    });
  }
  // eslint-disable-next-line no-console
  console.log(`[cron] scheduled ${Object.keys(jobs).length} job(s)`);
}
