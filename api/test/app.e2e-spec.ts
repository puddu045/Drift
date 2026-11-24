import { createHmac, randomUUID } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types.js';

// Forced, not `??=`: a real .env (pointing at a live Supabase project with
// JWKS signing keys) would otherwise take precedence and these HS256 test
// tokens would fail verification against a JWKS instead of a shared secret.
process.env.DATABASE_URL = 'postgresql://drift:drift_dev_password@localhost:5432/drift_test';
process.env.SUPABASE_URL = 'http://localhost:9999';
process.env.SUPABASE_JWT_SECRET = 'e2e-test-secret-not-for-production-use';
// Empty, not deleted: dotenv only fills in *missing* keys, so an empty
// string here (still "set") stops it refilling this from a real .env.
process.env.SUPABASE_JWKS_URL = '';

function signTestToken(sub: string, options?: { role?: 'admin' }) {
  const b64url = (input: string) => Buffer.from(input).toString('base64url');
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: `${process.env.SUPABASE_URL}/auth/v1`,
    sub,
    aud: 'authenticated',
    iat: now,
    exp: now + 3600,
    ...(options?.role ? { app_metadata: { role: options.role } } : {}),
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = createHmac('sha256', process.env.SUPABASE_JWT_SECRET!)
    .update(unsigned)
    .digest('base64url');
  return `${unsigned}.${signature}`;
}

describe('Thoughts (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects requests with no token', async () => {
    await request(app.getHttpServer()).get('/thoughts').expect(401);
  });

  it('rejects a malformed token', async () => {
    await request(app.getHttpServer())
      .get('/thoughts')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('rejects an invalid body', async () => {
    const token = signTestToken(randomUUID());
    await request(app.getHttpServer())
      .post('/thoughts')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: '', mood: 'deep' })
      .expect(400);
  });

  it('creates a thought that a different viewer finds in discovery', async () => {
    const author = signTestToken(randomUUID());
    const viewer = signTestToken(randomUUID());

    const created = await request(app.getHttpServer())
      .post('/thoughts')
      .set('Authorization', `Bearer ${author}`)
      .send({ text: 'A thought from the e2e suite.', mood: 'curious' })
      .expect(201);

    const discovered = await request(app.getHttpServer())
      .get('/thoughts')
      .set('Authorization', `Bearer ${viewer}`)
      .expect(200);

    expect(discovered.body.thoughts.map((t: { id: string }) => t.id)).toContain(created.body.id);
  });

  it('never shows the viewer their own thoughts in discovery', async () => {
    const token = signTestToken(randomUUID());

    const created = await request(app.getHttpServer())
      .post('/thoughts')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Mine, not for my own Universe feed.', mood: 'curious' })
      .expect(201);

    const discovered = await request(app.getHttpServer())
      .get('/thoughts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(discovered.body.thoughts.map((t: { id: string }) => t.id)).not.toContain(created.body.id);
  });

  it('lists a user\'s own thoughts via /thoughts/mine', async () => {
    const token = signTestToken(randomUUID());

    const created = await request(app.getHttpServer())
      .post('/thoughts')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Findable in My Thoughts.', mood: 'happy' })
      .expect(201);

    const mine = await request(app.getHttpServer())
      .get('/thoughts/mine')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(mine.body.map((t: { id: string }) => t.id)).toContain(created.body.id);
  });

  it('forbids deleting a thought that belongs to someone else', async () => {
    const owner = signTestToken(randomUUID());
    const stranger = signTestToken(randomUUID());

    const created = await request(app.getHttpServer())
      .post('/thoughts')
      .set('Authorization', `Bearer ${owner}`)
      .send({ text: 'Only I can delete this.', mood: 'reflective' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/thoughts/${created.body.id}`)
      .set('Authorization', `Bearer ${stranger}`)
      .expect(403);
  });
});

describe('Interests (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists the curated interests', async () => {
    const token = signTestToken(randomUUID());
    const { body } = await request(app.getHttpServer())
      .get('/interests')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('name');
  });

  it('saves and returns a user\'s chosen interests', async () => {
    const token = signTestToken(randomUUID());

    const { body: all } = await request(app.getHttpServer())
      .get('/interests')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const chosenIds = all.slice(0, 2).map((i: { id: string }) => i.id);

    await request(app.getHttpServer())
      .put('/profiles/me/interests')
      .set('Authorization', `Bearer ${token}`)
      .send({ interestIds: chosenIds })
      .expect(200);

    const { body: mine } = await request(app.getHttpServer())
      .get('/profiles/me/interests')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(new Set(mine)).toEqual(new Set(chosenIds));
  });

  it('rejects an interest id that does not exist', async () => {
    const token = signTestToken(randomUUID());
    await request(app.getHttpServer())
      .put('/profiles/me/interests')
      .set('Authorization', `Bearer ${token}`)
      .send({ interestIds: [randomUUID()] })
      .expect(400);
  });
});

describe('Mutes (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('hides a muted author\'s public thought from discovery, and un-hides it after unmuting', async () => {
    const viewerId = randomUUID();
    const mutedAuthorId = randomUUID();
    const viewer = signTestToken(viewerId);
    const mutedAuthor = signTestToken(mutedAuthorId);

    const created = await request(app.getHttpServer())
      .post('/thoughts')
      .set('Authorization', `Bearer ${mutedAuthor}`)
      .send({ text: 'Should disappear once muted.', mood: 'curious' })
      .expect(201);

    const beforeMute = await request(app.getHttpServer())
      .get('/thoughts')
      .set('Authorization', `Bearer ${viewer}`)
      .expect(200);
    expect(beforeMute.body.thoughts.map((t: { id: string }) => t.id)).toContain(created.body.id);

    await request(app.getHttpServer())
      .post('/mutes')
      .set('Authorization', `Bearer ${viewer}`)
      .send({ userId: mutedAuthorId })
      .expect(200);

    const whileMuted = await request(app.getHttpServer())
      .get('/thoughts')
      .set('Authorization', `Bearer ${viewer}`)
      .expect(200);
    expect(whileMuted.body.thoughts.map((t: { id: string }) => t.id)).not.toContain(created.body.id);

    await request(app.getHttpServer())
      .delete(`/mutes/${mutedAuthorId}`)
      .set('Authorization', `Bearer ${viewer}`)
      .expect(204);

    const afterUnmute = await request(app.getHttpServer())
      .get('/thoughts')
      .set('Authorization', `Bearer ${viewer}`)
      .expect(200);
    expect(afterUnmute.body.thoughts.map((t: { id: string }) => t.id)).toContain(created.body.id);
  });

  it('rejects muting yourself', async () => {
    const userId = randomUUID();
    const token = signTestToken(userId);
    await request(app.getHttpServer())
      .post('/mutes')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId })
      .expect(400);
  });
});

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('forbids a regular signed-in user from every admin route', async () => {
    const token = signTestToken(randomUUID());
    await request(app.getHttpServer()).get('/admin/users').set('Authorization', `Bearer ${token}`).expect(403);
    await request(app.getHttpServer()).get('/admin/reports').set('Authorization', `Bearer ${token}`).expect(403);
    await request(app.getHttpServer()).get('/admin/audit-log').set('Authorization', `Bearer ${token}`).expect(403);
    await request(app.getHttpServer()).get('/admin/feature-flags').set('Authorization', `Bearer ${token}`).expect(403);
  });

  it('401s a guest on every admin route', async () => {
    await request(app.getHttpServer()).get('/admin/users').expect(401);
  });

  it('lets an admin list and search users', async () => {
    const admin = signTestToken(randomUUID(), { role: 'admin' });
    const targetId = randomUUID();
    const targetToken = signTestToken(targetId);
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${targetToken}`)
      .send({ displayName: 'Admin Target', username: `admintarget${targetId.slice(0, 8)}` })
      .expect(200);

    const { body } = await request(app.getHttpServer())
      .get('/admin/users')
      .query({ search: 'Admin Target' })
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);

    expect(body.users.map((u: { id: string }) => u.id)).toContain(targetId);
  });

  it('lets an admin suspend a user, and writes an audit log entry', async () => {
    const admin = signTestToken(randomUUID(), { role: 'admin' });
    const targetId = randomUUID();
    await request(app.getHttpServer())
      .post('/thoughts')
      .set('Authorization', `Bearer ${signTestToken(targetId)}`)
      .send({ text: 'A thought from a soon-to-be-suspended user.', mood: 'curious' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/admin/users/${targetId}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'suspended' })
      .expect(200);

    const { body: auditLog } = await request(app.getHttpServer())
      .get('/admin/audit-log')
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    expect(
      auditLog.entries.some(
        (e: { action: string; targetId: string | null }) => e.action === 'user.status_changed' && e.targetId === targetId,
      ),
    ).toBe(true);
  });

  it('lets an admin resolve a report by dismissing it', async () => {
    const admin = signTestToken(randomUUID(), { role: 'admin' });
    const reporter = signTestToken(randomUUID());
    const author = signTestToken(randomUUID());

    const thought = await request(app.getHttpServer())
      .post('/thoughts')
      .set('Authorization', `Bearer ${author}`)
      .send({ text: 'Reported, then dismissed.', mood: 'curious' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', `Bearer ${reporter}`)
      .send({ targetType: 'thought', targetId: thought.body.id, reason: 'Not actually a problem' })
      .expect(201);

    const { body: openReports } = await request(app.getHttpServer())
      .get('/admin/reports')
      .query({ status: 'open' })
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    const report = openReports.reports.find((r: { thoughtId: string | null }) => r.thoughtId === thought.body.id);
    expect(report).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/admin/reports/${report.id}/resolve`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ action: 'dismissed' })
      .expect(200);

    const { body: dismissedReports } = await request(app.getHttpServer())
      .get('/admin/reports')
      .query({ status: 'dismissed' })
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    expect(dismissedReports.reports.map((r: { id: string }) => r.id)).toContain(report.id);
  });

  it('lets an admin create, list and delete a feature flag', async () => {
    const admin = signTestToken(randomUUID(), { role: 'admin' });
    const key = `test_flag_${randomUUID().slice(0, 8)}`;

    await request(app.getHttpServer())
      .put(`/admin/feature-flags/${key}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ enabled: true })
      .expect(200);

    const { body: flags } = await request(app.getHttpServer())
      .get('/admin/feature-flags')
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    expect(flags.some((f: { key: string; enabled: boolean }) => f.key === key && f.enabled)).toBe(true);

    await request(app.getHttpServer())
      .delete(`/admin/feature-flags/${key}`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(204);
  });
});
