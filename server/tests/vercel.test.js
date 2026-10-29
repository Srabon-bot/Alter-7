import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;
let handler;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.CLIENT_ORIGIN = 'http://localhost:5173';
  process.env.ALLOW_REGISTRATION = 'true';

  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('alter7-vercel-test');
  ({ default: handler } = await import('../api/index.js'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

describe('Vercel handler', () => {
  it('serves the API through the serverless entrypoint', async () => {
    const health = await request(handler).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ ok: true, db: true });

    const agent = request.agent(handler);
    const registered = await agent.post('/api/auth/register').send({
      email: 'vercel@example.com',
      password: 'password123',
      name: 'Vercel',
      timezone: 'Asia/Dhaka',
    });
    expect(registered.status).toBe(201);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('vercel@example.com');
  });
});
