import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

// Factory so different routes can have appropriate budgets. Disabled in tests
// to keep them deterministic.
export function makeLimiter({ windowMs = 15 * 60 * 1000, max = 100, message } = {}) {
  return rateLimit({
    windowMs,
    max: config.isTest ? 1_000_000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message ?? 'Too many requests, please try again later.' },
  });
}

// Tight limiter for auth endpoints (brute-force protection).
export const authLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, max: 30, message: 'Too many auth attempts.' });

// Limiter for expensive AI-backed endpoints.
export const aiLimiter = makeLimiter({ windowMs: 60 * 1000, max: 20, message: 'Too many AI requests.' });

// Limiter for general content writes (answers, reports, likes) to curb spam.
export const writeLimiter = makeLimiter({ windowMs: 60 * 1000, max: 40, message: 'You are doing that too often.' });
