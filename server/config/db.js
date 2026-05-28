// ─── Swappable boundary: DATABASE ────────────────────────────────────────────
// This is the ONLY module that knows how to open a database connection.
// To move to the company's managed MongoDB (or another Mongoose-compatible
// store), change this file and nothing else.
import mongoose from 'mongoose';
import { config } from './env.js';

mongoose.set('strictQuery', true);

let connected = false;

/**
 * Connect to MongoDB. Idempotent — safe to call once at startup.
 * @param {string} [uri] override (used by tests with an in-memory server).
 */
export async function connectDB(uri = config.mongoUri) {
  if (connected) return mongoose.connection;
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  });
  connected = true;
  if (!config.isTest) {
    // eslint-disable-next-line no-console
    console.log(`[db] connected to ${mongoose.connection.name}`);
  }
  return mongoose.connection;
}

export async function disconnectDB() {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

export { mongoose };
