import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Express app with no network binding, so tests (Supertest) can import it
// directly. server.js handles DB connection + listening.
export function createApp() {
  const app = express();

  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (!config.isTest) app.use(morgan('dev'));

  // Serve user uploads as static files (Multer writes here).
  app.use('/uploads', express.static(path.join(__dirname, config.uploads.dir)));

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
