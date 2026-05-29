// Central registry of scheduled jobs. Every job is a plain async function so it
// can run on a cron schedule AND be triggered manually by an admin (PLANNING §10
// / Milestone 7). New maintenance crons register here in later milestones.
import cron from 'node-cron';
import { finalizeSolutions } from './finalizeSolutions.js';
import { expireBans } from './expireBans.js';
import { lruEviction } from './lruEviction.js';
import { stalenessCheck } from './stalenessCheck.js';
import { orphanCleanup } from './orphanCleanup.js';
import { embeddingRefresh } from './embeddingRefresh.js';
import { softDeletePurge } from './softDeletePurge.js';
import { recalcAllBadges } from '../services/badgeService.js';

export const jobs = {
  'finalize-solutions': {
    schedule: '0 3 * * *', // daily at 03:00
    description: 'Resolve queries past their solution grace period (Path A/B).',
    handler: finalizeSolutions,
  },
  'expire-bans': {
    schedule: '0 * * * *', // hourly
    description: 'Lift time-limited bans whose deadline has passed.',
    handler: expireBans,
  },
  'badge-recalc': {
    schedule: '0 2 * * *', // daily at 02:00
    description: 'Resync every user\'s positive badges to their points.',
    handler: recalcAllBadges,
  },
  'lru-eviction': {
    schedule: '0 4 * * *', // daily at 04:00
    description: 'Archive resolved queries unaccessed for 90+ days.',
    handler: lruEviction,
  },
  'staleness-check': {
    schedule: '0 5 * * 1', // weekly, Monday 05:00
    description: 'Flag answers older than the staleness window as outdated.',
    handler: stalenessCheck,
  },
  'orphan-cleanup': {
    schedule: '0 5 * * 2', // weekly, Tuesday 05:00
    description: 'Remove likes/chatbot sessions referencing deleted records.',
    handler: orphanCleanup,
  },
  'embedding-refresh': {
    schedule: '0 5 * * 3', // weekly, Wednesday 05:00
    description: 'Re-embed queries whose text changed since last embedding.',
    handler: embeddingRefresh,
  },
  'soft-delete-purge': {
    schedule: '0 6 1 * *', // monthly, 1st at 06:00
    description: 'Hard-delete content soft-deleted beyond the retention window (audited).',
    handler: softDeletePurge,
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
