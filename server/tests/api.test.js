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

function windowHabits(habits, window) {
  return habits.filter((h) => h.window === window);
}

function entriesFor(habits, { missPhone = false } = {}) {
  return habits.map((h) => ({
    habitId: h.id,
    done: missPhone ? h.name !== 'Phone away' : true,
  }));
}

async function openingCheck(agent, date, habits) {
  const res = await agent
    .put(`/api/days/${date}/morning`)
    .send({ entries: entriesFor(windowHabits(habits, 'morning')) });
  expect(res.status).toBe(200);
  return res;
}

async function eveningConfirm(agent, date, habits, options = {}) {
  const res = await agent.put(`/api/days/${date}/evening`).send({
    entries: entriesFor(windowHabits(habits, 'evening'), options),
    mood: 4,
    energy: 3,
  });
  expect(res.status).toBe(200);
  return res;
}

async function closeDay(agent, date) {
  return agent.post(`/api/days/${date}/close`);
}

async function reportDay(agent, date, habits, options = {}) {
  await openingCheck(agent, date, habits);
  await eveningConfirm(agent, date, habits, options);
  return closeDay(agent, date);
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
    expect(windowHabits(habits, 'morning').map((h) => h.name)).toEqual(['Wake up']);
    expect(windowHabits(habits, 'evening')).toHaveLength(3);
  });

  it('keeps the day open through the opening check and the evening confirm', async () => {
    const { agent } = await register();
    const habits = await habitsOf(agent);
    const date = today();

    const opening = await openingCheck(agent, date, habits);
    expect(opening.body.day.status).toBe('open');
    expect(opening.body.day.morningAt).toBeTruthy();
    expect(opening.body.verdict).toBeUndefined();

    const evening = await eveningConfirm(agent, date, habits);
    expect(evening.body.day.status).toBe('open');
    expect(evening.body.day.eveningAt).toBeTruthy();
    expect(evening.body.day.mood).toBe(4);

    const summary = await agent.get('/api/stats/summary');
    expect(summary.body.user.totalXp).toBe(0);
    expect(summary.body.openingDue).toBe(false);
    expect(summary.body.eveningDue).toBe(false);
    expect(summary.body.closingDue).toBe(true);
  });

  it('closes the day when lights out is confirmed', async () => {
    const { agent } = await register();
    const habits = await habitsOf(agent);

    const closed = await reportDay(agent, today(), habits);
    expect(closed.status).toBe(200);
    expect(closed.body.day.status).toBe('closed');
    expect(closed.body.day.closedBy).toBe('evening');
    expect(closed.body.day.won).toBe(true);
    expect(closed.body.day.score).toBe(100);
    expect(closed.body.stats.currentStreak).toBe(1);
    expect(closed.body.verdict.line).toBeTruthy();

    const summary = await agent.get('/api/stats/summary');
    expect(summary.body.user.totalXp).toBe(100);
    expect(summary.body.user.currentStreak).toBe(1);
    expect(summary.body.user.rank).toBe('Unranked');
  });

  it('closes an unfinished day as lost', async () => {
    const { agent } = await register();
    const habits = await habitsOf(agent);
    const date = today();

    await openingCheck(agent, date, habits);
    await eveningConfirm(agent, date, habits, { missPhone: true });
    const closed = await closeDay(agent, date);

    expect(closed.status).toBe(200);
    expect(closed.body.day.status).toBe('closed');
    expect(closed.body.day.won).toBe(false);
    expect(closed.body.day.score).toBe(75);
    expect(closed.body.stats.currentStreak).toBe(0);
    expect(closed.body.verdict.verdict).toBe('Lost.');
  });

  it('reports 404 when closing a day that was never filed', async () => {
    const { agent } = await register();
    const closed = await closeDay(agent, today());
    expect(closed.status).toBe(404);
    expect(closed.body.error.code).toBe('NOT_FOUND');
  });

  it('auto-closes an overdue open day on the next authenticated request', async () => {
    const { agent } = await register();
    const habits = await habitsOf(agent);
    const date = addDays(today(), -5);
    const workout = habits.find((h) => h.name === 'Morning workout');

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

    const closed = await reportDay(agent, today(), habits, { missPhone: true });
    expect(closed.body.stats.totalXp).toBe(75);
    expect(closed.body.stats.currentStreak).toBe(0);

    const archived = await agent.patch(`/api/habits/${phone.id}`).send({ archived: true });
    expect(archived.status).toBe(200);
    expect(archived.body.stats.currentStreak).toBe(0);
    expect(archived.body.stats.totalXp).toBe(75);

    const summary = await agent.get('/api/stats/summary');
    expect(summary.body.user.currentStreak).toBe(0);
    expect(summary.body.user.totalXp).toBe(75);
  });

  it('returns the existing result when a closed day is closed again', async () => {
    const { agent } = await register();
    const habits = await habitsOf(agent);
    const date = today();

    const first = await reportDay(agent, date, habits);
    const second = await closeDay(agent, date);

    expect(first.body.day.id).toBe(second.body.day.id);
    expect(second.body.day.status).toBe('closed');
    expect(second.body.verdict.line).toBeTruthy();
  });

  it('allows a closed day to be backfilled within three days', async () => {
    const { agent } = await register();
    const habits = await habitsOf(agent);
    const date = today();

    const closed = await reportDay(agent, date, habits, { missPhone: true });
    expect(closed.body.stats.totalXp).toBe(75);

    const backfilled = await eveningConfirm(agent, date, habits);
    expect(backfilled.body.day.backfilled).toBe(true);
    expect(backfilled.body.day.status).toBe('closed');

    const summary = await agent.get('/api/stats/summary');
    expect(summary.body.user.currentStreak).toBe(1);
    expect(summary.body.user.totalXp).toBe(100);

    const verdict = await agent.get('/api/verdict/latest');
    expect(verdict.body.verdict.verdict).toBe('Noted.');
  });

  it('locks backfills older than three days', async () => {
    const { agent } = await register();
    const habits = await habitsOf(agent);
    const date = addDays(today(), -5);
    const workout = habits.find((h) => h.name === 'Morning workout');

    await agent.put(`/api/days/${date}/evening`).send({
      entries: [{ habitId: workout.id, done: true }],
    });
    await agent.get('/api/stats/summary');

    const lockedEvening = await agent.put(`/api/days/${date}/evening`).send({
      entries: [{ habitId: workout.id, done: true }],
    });
    expect(lockedEvening.status).toBe(403);
    expect(lockedEvening.body.error.code).toBe('LOCKED');

    const lockedClose = await closeDay(agent, date);
    expect(lockedClose.status).toBe(403);
    expect(lockedClose.body.error.code).toBe('LOCKED');
  });

  it('deletes a day log and recalculates user stats', async () => {
    const { agent } = await register();
    const habits = await habitsOf(agent);
    const date = today();

    const closed = await reportDay(agent, date, habits);
    expect(closed.body.stats.totalXp).toBe(100);

    const removed = await agent.delete(`/api/days/${date}`);
    expect(removed.status).toBe(200);

    const summary = await agent.get('/api/stats/summary');
    expect(summary.body.user.totalXp).toBe(0);
    expect(summary.body.user.currentStreak).toBe(0);
  });
});
