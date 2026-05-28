// Centralized environment loading. Read process.env in exactly one place so
// the rest of the app imports typed, defaulted config instead of touching
// process.env directly.
import dotenv from 'dotenv';

dotenv.config();

const required = (key, fallback) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const config = Object.freeze({
  env: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT ?? 5000),

  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/faq_platform',

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },

  ai: {
    apiKey: process.env.AI_API_KEY ?? '',
    chatModel: process.env.AI_CHAT_MODEL ?? 'gemini-2.5-flash',
    cheapModel: process.env.AI_CHEAP_MODEL ?? 'gemini-2.5-flash-lite',
    embedModel: process.env.AI_EMBED_MODEL ?? 'gemini-embedding-001',
    embedDims: Number(process.env.AI_EMBED_DIMS ?? 768),
    // When no key is set we run in mock mode: deterministic, offline, free.
    get mockMode() {
      return !this.apiKey;
    },
  },

  uploads: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxMb: Number(process.env.MAX_UPLOAD_MB ?? 5),
  },

  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
});
