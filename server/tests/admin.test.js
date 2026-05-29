import request from 'supertest';
import { createApp } from '../app.js';
import { setupTestDB, teardownTestDB, clearDB } from './helpers.js';
import { User } from '../models/User.js';
import { Query } from '../models/Query.js';
import { Answer } from '../models/Answer.js';

const app = createApp();

beforeAll(async () => {
  await setupTestDB();
});
afterAll(async () => {
  await teardownTestDB();
});
afterEach(async () => {
  await clearDB();
});

async function makeUser(overrides = {}) {
  const payload = {
    name: 'User',
    email: `u${Math.random().toString(36).slice(2)}@example.com`,
    password: 'supersecret1',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(payload);
  return { token: res.body.accessToken, user: res.body.user };
}

async function makeAdmin() {
  const { token, user } = await makeUser({ name: 'Admin' });
  await User.updateOne({ _id: user.id }, { role: 'admin' });
  return { token, user };
}

const authed = (req, token) => req.set('Authorization', `Bearer ${token}`);

const baseQuery = {
  title: 'How do I configure the database connection?',
  body: 'My Express server cannot connect to MongoDB in production and keeps timing out badly.',
};
const createQuery = (token, overrides = {}) =>
  authed(request(app).post('/api/queries'), token).send({ ...baseQuery, ...overrides });

describe('admin dashboard + governance', () => {
  test('metrics require admin', async () => {
    const user = await makeUser();
    expect((await authed(request(app).get('/api/admin/metrics'), user.token)).status).toBe(403);

    const admin = await makeAdmin();
    const res = await authed(request(app).get('/api/admin/metrics'), admin.token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(res.body).toHaveProperty('pending_moderation');
  });

  test('user management: list, search, and role change (audited)', async () => {
    const admin = await makeAdmin();
    const target = await makeUser({ name: 'Grace Hopper' });

    const list = await authed(request(app).get('/api/admin/users').query({ q: 'Grace' }), admin.token);
    expect(list.status).toBe(200);
    expect(list.body.items.some((u) => u.name === 'Grace Hopper')).toBe(true);

    const role = await authed(request(app).post(`/api/admin/users/${target.user.id}/role`), admin.token).send({
      role: 'admin',
    });
    expect(role.status).toBe(200);
    expect((await User.findById(target.user.id)).role).toBe('admin');

    const audit = await authed(request(app).get('/api/admin/audit'), admin.token);
    expect(audit.body.items.some((a) => a.action === 'user.set_role')).toBe(true);
  });

  test('moderation queue lists reports and can resolve them', async () => {
    const admin = await makeAdmin();
    const asker = await makeUser();
    const reporter = await makeUser();
    const query = (await createQuery(asker.token)).body.query;
    await authed(request(app).post(`/api/queries/${query.id}/report`), reporter.token).send({ reason: 'spam' });

    const queue = await authed(request(app).get('/api/admin/moderation').query({ type: 'report' }), admin.token);
    expect(queue.body.items).toHaveLength(1);

    const resolved = await authed(
      request(app).post(`/api/admin/moderation/${queue.body.items[0]._id}/resolve`),
      admin.token,
    ).send({ note: 'handled' });
    expect(resolved.status).toBe(200);

    const after = await authed(request(app).get('/api/admin/moderation').query({ type: 'report' }), admin.token);
    expect(after.body.items).toHaveLength(0); // default filter is pending
  });

  test('merging a duplicate archives it and moves its answers', async () => {
    const admin = await makeAdmin();
    const asker = await makeUser();
    const answerer = await makeUser();

    const canonical = (await createQuery(asker.token)).body.query;
    const dup = (await createQuery(asker.token, { post_anyway: true })).body.query;
    const posted = await authed(
      request(app).post(`/api/queries/${dup.id}/answers`),
      answerer.token,
    ).send({ body: 'Reuse a pooled connection and raise the selection timeout.' });

    const merge = await authed(request(app).post('/api/admin/queries/merge'), admin.token).send({
      canonicalId: canonical.id,
      duplicateId: dup.id,
    });
    expect(merge.status).toBe(200);

    const dupDoc = await Query.findById(dup.id);
    expect(dupDoc.merge_status).toBe('merged');
    expect(dupDoc.status).toBe('archived');
    const canonicalDoc = await Query.findById(canonical.id);
    expect(canonicalDoc.merged_from.map(String)).toContain(dup.id);

    const movedAnswer = await Answer.findById(posted.body.answer.id);
    expect(String(movedAnswer.query_id)).toBe(canonical.id);
  });

  test('amalgamation clusters similar queries', async () => {
    const admin = await makeAdmin();
    const asker = await makeUser();
    await createQuery(asker.token);
    await createQuery(asker.token, { post_anyway: true });

    const res = await authed(request(app).get('/api/admin/queries/clusters'), admin.token);
    expect(res.status).toBe(200);
    expect(res.body.clusters.length).toBeGreaterThanOrEqual(1);
    expect(res.body.clusters[0].length).toBeGreaterThanOrEqual(2);
  });
});

describe('admin FAQ manager', () => {
  test('create, update (re-embed), mark outdated, and delete', async () => {
    const admin = await makeAdmin();

    const created = await authed(request(app).post('/api/faq'), admin.token).send({
      category: 'Account',
      question: 'How do I reset my password?',
      answer: 'Use the forgot password link.',
    });
    expect(created.status).toBe(201);
    const id = created.body.entry.id;

    const updated = await authed(request(app).patch(`/api/faq/${id}`), admin.token).send({
      answer: 'Use the forgot password link; the email is valid for one hour.',
    });
    expect(updated.body.entry.answer).toMatch(/one hour/);

    const outdated = await authed(request(app).post(`/api/faq/${id}/outdated`), admin.token).send({
      is_outdated: true,
    });
    expect(outdated.body.entry.is_outdated).toBe(true);

    const removed = await authed(request(app).delete(`/api/faq/${id}`), admin.token).send();
    expect(removed.status).toBe(200);

    const list = await request(app).get('/api/faq');
    const stillThere = list.body.groups.some((g) => g.items.some((i) => i.id === id));
    expect(stillThere).toBe(false);
  });

  test('FAQ management is admin-only', async () => {
    const user = await makeUser();
    const res = await authed(request(app).post('/api/faq'), user.token).send({
      category: 'X',
      question: 'Q?',
      answer: 'A',
    });
    expect(res.status).toBe(403);
  });
});
