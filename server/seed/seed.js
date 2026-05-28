// Seed script skeleton. Milestones add demo data here; the structure and the
// offline-embedding hook are in place now so later content is embedded once,
// offline (zero live AI calls on browse — PLANNING §8).
import { connectDB, disconnectDB } from '../config/db.js';
import { ai } from '../config/ai.js';
import { User } from '../models/User.js';
import { hashPassword } from '../utils/password.js';
import { ROLES } from '../config/constants.js';

// Embed a batch of {text} items offline and attach .embedding. Used by later
// seeds for queries / faq_entries so search & RAG work with no live calls.
export async function embedSeedItems(items) {
  const vectors = await ai.embedBatch(items.map((i) => i.text));
  return items.map((item, idx) => ({ ...item, embedding: vectors[idx] }));
}

async function seedUsers() {
  const seedData = [
    { name: 'Admin', email: 'admin@example.com', password: 'admin12345', role: ROLES.ADMIN },
    { name: 'Demo User', email: 'demo@example.com', password: 'demo12345', role: ROLES.USER },
  ];

  for (const u of seedData) {
    const exists = await User.findOne({ email: u.email });
    if (exists) continue;
    await User.create({
      name: u.name,
      email: u.email,
      role: u.role,
      password_hash: await hashPassword(u.password),
    });
    // eslint-disable-next-line no-console
    console.log(`[seed] created ${u.role}: ${u.email}`);
  }
}

async function run() {
  await connectDB();
  await seedUsers();
  // Later milestones: seed categories, queries, answers, faq_entries (with
  // embedSeedItems), notifications, etc.
  // eslint-disable-next-line no-console
  console.log('[seed] done');
  await disconnectDB();
}

// Run only when invoked directly (not when imported by other seeds/tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed] failed', err);
    process.exit(1);
  });
}

export { run };
