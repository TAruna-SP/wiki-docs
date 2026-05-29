import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { config } from './config/env.js';
import { scheduleJobs } from './jobs/index.js';

async function start() {
  await connectDB();
  const app = createApp();
  scheduleJobs();
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on :${config.port} (${config.env}, AI ${config.ai.mockMode ? 'mock' : 'live'})`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] failed to start', err);
  process.exit(1);
});
