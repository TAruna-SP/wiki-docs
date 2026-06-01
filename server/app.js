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

  // Behind a reverse proxy/tunnel, derive the real client IP from X-Forwarded-For
  // (required so express-rate-limit keys per-user and doesn't throw on the header).
  if (config.trustProxy !== false) app.set('trust proxy', config.trustProxy);

  // Baseline security headers. (For production, `helmet` is the recommended
  // upgrade — this hand-rolled set keeps the MVP dependency-free while covering
  // the headers that matter for an API + user-uploaded static files.)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.removeHeader('X-Powered-By');
    next();
  });

  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  if (!config.isTest) app.use(morgan('dev'));

  // Serve user uploads as static files (Multer writes here). Uploads are
  // validated images stored with a MIME-derived extension, so we serve them
  // INLINE (viewable/zoomable in the browser) while keeping nosniff — the
  // combination means a maliciously-named upload still can't be rendered as
  // HTML/script in the API origin (defence-in-depth against stored XSS).
  app.use(
    '/uploads',
    express.static(path.join(__dirname, config.uploads.dir), {
      index: false,
      setHeaders: (res) => {
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
