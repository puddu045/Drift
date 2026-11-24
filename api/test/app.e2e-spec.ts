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

function signTestToken(sub: string) {
  const b64url = (input: string) => Buffer.from(input).toString('base64url');
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: `${process.env.SUPABASE_URL}/auth/v1`,
    sub,
    aud: 'authenticated',
    iat: now,
    exp: now + 3600,
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

  it('creates a thought then finds it in discovery, as the authenticated caller', async () => {
    const token = signTestToken(randomUUID());

    const created = await request(app.getHttpServer())
      .post('/thoughts')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'A thought from the e2e suite.', mood: 'curious' })
      .expect(201);

    const discovered = await request(app.getHttpServer())
      .get('/thoughts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(discovered.body.thoughts.map((t: { id: string }) => t.id)).toContain(created.body.id);
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
