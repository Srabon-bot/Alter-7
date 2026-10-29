import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { addDays, dateInTz } from '../src/lib/dates.js';

let mongod;
let app;
let sequence = 0;

const today = () => dateInTz(new Date(), 'Asia/Dhaka');

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.ALLOW_REGISTRATION = 'true';
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('alter7-test'));
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

async function register() {
  const agent = request.agent(app);
  const email = `agent-${++sequence}@example.com`;
  const res = await agent.post('/api/auth/register').send({
    email,
    password: 'password123',
    name: 'Test',
    timezone: 'Asia/Dhaka',
  });
  expect(res.status).toBe(201);
  return { agent, user: res.body.user };
}

async function habitsOf(agent) {
  const res = await agent.get('/api/habits');
  expect(res.status).toBe(200);
  return res.body.habits;
}

async function reportDay(agent, date, habits, { missPhone = false } = {}) {
  const dayHabits = habits.filter((h) => h.window === 'day');
  const nightHabits = habits.filter((h) => h.window === 'night');

  const evening = await agent.put(`/api/days/${date}/evening`).send({
    entries: dayHabits.map((h) => ({ habitId: h.id, done: true })),
    mood: 4,
    energy: 3,
  });
  expect(evening.status).toBe(200);

  const eveningMorning = await agent.put(`/api/days/${date}/morning`).send({
    entries: nightHabits.map((h) => ({
      habitId: h.id,
      done: missPhone ? h.name !== 'Phone away' : true,
    })),
  });
  expect(eveningMorning.status).toBe(200);
  return eveningMorning;
}

describe('phase 1 API', () => {
  it('registers the first user and seeds four core habits', async () => {
    const { agent } = await register();

    const status = await agent.get('/api/auth/status');
    expect(status.body.hasUser).toBe(true);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toContain('agent-');

    const habits = await habitsOf(agent);
    expect(habits).toHaveLength(4);
    expect(habits.every((habit) => habit.core)).toBe(true);
  });

  it('closes a day through evening and morning reports', async () => {
    const { agent } = await register();
    const habits = await habitsOf(agent);

    const morning = await reportDay(agent, today(), habits);
    expect(morning.body.day.status).toBe('closed');
    expect(morning.body.day.won).toBe(true);
    expect(morning.body.day.score).toBe(100);
    expect(morning.body.stats.currentStreak).toBe(1);
    expect(morning.body.verdict.line).toBeTruthy();

    const summary = await agent.get('/api/stats/summary');
    expect(summary.body.user.totalXp).toBe(100);
    expect(summary.body.user.currentStreak).toBe(1);
  });

  it('auto-closes an overdue open day on the next authenticated request', async () => {
    const { agent } = await register();
    const habits = await habitsOf(agent);
    const date = addDays(today(), -5);
    const workout = habits.find((h) => h.window === 'day');

    const evening = await agent.put(`/api/days/${date}/evening`).send({
      entries: [{ habitId: workout.id, done: true }],
    });
    expect(evening.status).toBe(200);
    expect(evening.body.day.status).toBe('open');

    const summary = await agent.get('/api/stats/summary');
    expect(summary.status).toBe(200);
    expect(summary.body.user.totalXp).toBe(25);
    expect(summary.body.user.currentStreak).toBe(0);

    const day = await agent.get(`/api/days/${date}`);
    expect(day.body.day.status).toBe('closed');
    expect(day.body.day.closedBy).toBe('auto');
    expect(day.body.day.won).toBe(false);
  });

  it('recalculates stats after a habit is archived', async () => {
    const { agent } = await register();
    const habits = await habitsOf(agent);
    const phone = habits.find((habit) => habit.name === 'Phone away');

    const morning = await reportDay(agent, today(), habits, { missPhone: true });
    expect(morning.body.stats.totalXp).toBe(75);
    expect(morning.body.stats.currentStreak).toBe(0);

    const archived = await agent.patch(`/api/habits/${phone.id}`).send({ archived: true });
    expect(archived.status).toBe(200);
    expect(archived.body.stats.currentStreak).toBe(1);
    expect(archived.body.stats.totalXp).toBe(100);

    const summary = await agent.get('/api/stats/summary');
    expect(summary.body.user.currentStreak).toBe(1);
    expect(summary.body.user.totalXp).toBe(100);
  });

  it('allows a closed day to be backfilled within three days', async () => {
    const { agent } = await register();
    const habits = await habitsOf(agent);
    const date = today();
    const nightHabits = habits.filter((h) => h.window === 'night');

    const morning = await reportDay(agent, date, habits, { missPhone: true });
    expect(morning.body.stats.totalXp).toBe(75);

    const backfilled = await agent.put(`/api/days/${date}/morning`).send({
      entries: nightHabits.map((h) => ({ habitId: h.id, done: true })),
    });
    expect(backfilled.status).toBe(200);
    expect(backfilled.body.day.backfilled).toBe(true);
    expect(backfilled.body.stats.currentStreak).toBe(1);
    expect(backfilled.body.stats.totalXp).toBe(100);
  });

  it('locks backfills older than three days', async () => {
    const { agent } = await register();
    const habits = await habitsOf(agent);
    const date = addDays(today(), -5);
    const workout = habits.find((h) => h.window === 'day');

    await agent.put(`/api/days/${date}/evening`).send({
      entries: [{ habitId: workout.id, done: true }],
    });
    await agent.get('/api/stats/summary');

    const locked = await agent.put(`/api/days/${date}/evening`).send({
      entries: [{ habitId: workout.id, done: true }],
    });
    expect(locked.status).toBe(403);
    expect(locked.body.error.code).toBe('LOCKED');
  });

  it('deletes a day log and recalculates user stats', async () => {
    const { agent } = await register();
    const habits = await habitsOf(agent);
    const date = today();

    const morning = await reportDay(agent, date, habits);
    expect(morning.body.stats.totalXp).toBe(100);

    const removed = await agent.delete(`/api/days/${date}`);
    expect(removed.status).toBe(200);

    const summary = await agent.get('/api/stats/summary');
    expect(summary.body.user.totalXp).toBe(0);
    expect(summary.body.user.currentStreak).toBe(0);
  });
});
