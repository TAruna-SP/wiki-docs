// Seed. Starts the platform from a clean slate: a single admin account plus the
// curated FAQ set imported from JSON (offline-embedded so search / the RAG
// chatbot work with zero live AI calls). No demo users, points, or forum
// questions are created — those are left for real users to build up.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { ai } from '../config/ai.js';
import { User } from '../models/User.js';
import { FaqEntry } from '../models/FaqEntry.js';
import { hashPassword } from '../utils/password.js';
import { ROLES, FAQ_SOURCE } from '../config/constants.js';

const log = (msg) => {
  // eslint-disable-next-line no-console
  console.log(`[seed] ${msg}`);
};

// Only an admin account is provisioned; everyone else self-registers.
const USERS = [{ name: 'Admin', email: 'admin@example.com', password: 'admin12345', role: ROLES.ADMIN }];

async function seedUsers() {
  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) continue;
    await User.create({
      name: u.name,
      email: u.email,
      role: u.role,
      password_hash: await hashPassword(u.password),
    });
    log(`created ${u.role}: ${u.email}`);
  }
}

// Load the curated FAQ set from the bundled JSON, flattening each section's
// questions into individual entries keyed by the section title (category).
function loadFaqEntriesFromJson() {
  const raw = fs.readFileSync(new URL('./data/samagama_faqs.json', import.meta.url), 'utf8');
  const data = JSON.parse(raw);
  const entries = [];
  for (const section of data.sections ?? []) {
    const category = String(section.section_title ?? 'General').trim() || 'General';
    for (const item of section.questions ?? []) {
      const question = String(item.question ?? '').trim();
      const answer = String(item.answer ?? '').trim();
      if (question && answer) entries.push({ category, question, answer });
    }
  }
  return entries;
}

async function seedFaqs() {
  // Replace any existing FAQ entries with the curated set from the JSON source.
  const removed = await FaqEntry.deleteMany({});
  if (removed.deletedCount) log(`removed ${removed.deletedCount} existing FAQ entries`);

  const entries = loadFaqEntriesFromJson();
  const vectors = await ai.embedBatch(entries.map((e) => `${e.question}\n\n${e.answer}`));
  const docs = entries.map((e, i) => ({ ...e, source: FAQ_SOURCE.ADMIN, embedding: vectors[i] }));
  await FaqEntry.insertMany(docs);

  const categories = new Set(entries.map((e) => e.category)).size;
  log(`imported ${docs.length} FAQ entries across ${categories} categories from JSON`);
}

async function run() {
  await connectDB();
  await seedUsers();
  await seedFaqs();
  log('done');
  await disconnectDB();
}

// Run only when invoked directly (not when imported by other seeds/tests).
// pathToFileURL handles Windows paths correctly (file:///C:/… vs file://C:\…).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed] failed', err);
    process.exit(1);
  });
}

export { run };
