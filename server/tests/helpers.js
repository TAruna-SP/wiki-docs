import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDB, disconnectDB, mongoose } from '../config/db.js';

let mongod;

// Spin up an in-memory MongoDB and connect. Call in beforeAll.
export async function setupTestDB() {
  mongod = await MongoMemoryServer.create();
  await connectDB(mongod.getUri());
}

// Disconnect and stop the in-memory server. Call in afterAll.
export async function teardownTestDB() {
  await disconnectDB();
  if (mongod) await mongod.stop();
}

// Wipe all collections between tests for isolation.
export async function clearDB() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}
