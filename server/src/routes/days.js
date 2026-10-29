import { Router } from 'express';
import DayLog from '../models/DayLog.js';
import { validate } from '../middleware/validate.js';
import { dayDateSchema, daysQuerySchema, eveningSchema, morningSchema } from '../schemas.js';
import { httpError } from '../middleware/errorHandler.js';
import { addDays, compareDates, dateInTz } from '../lib/dates.js';
import {
  activeHabits,
  closeDay,
  getOrCreateDay,
  mergeWindowEntries,
  persistUserStats,
} from '../services/closeDay.js';
import { cannedLine } from '../services/canned.js';
import Verdict from '../models/Verdict.js';

const router = Router();

function serializeDay(day) {
  if (!day) return null;
  return {
    id: String(day._id),
    date: day.date,
    entries: (day.entries || []).map((e) => ({
      habitId: String(e.habitId),
      done: e.done,
      value: e.value,
    })),
    mood: day.mood,
    energy: day.energy,
    note: day.note,
    eveningAt: day.eveningAt,
    morningAt: day.morningAt,
    status: day.status,
    closedBy: day.closedBy,
    score: day.score,
    won: day.won,
    backfilled: day.backfilled,
  };
}

function assertEditable(day, tz) {
  if (day.status !== 'closed') return { backfilled: false };
  const today = dateInTz(new Date(), tz);
  const limit = addDays(day.date, 3);
  if (compareDates(today, limit) > 0) {
    throw httpError(403, 'LOCKED', 'Closed days can be edited for three days only.');
  }
  return { backfilled: true };
}

router.get('/', validate(daysQuerySchema), async (req, res, next) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = req.query.from;
      if (req.query.to) filter.date.$lte = req.query.to;
    }
    const days = await DayLog.find(filter).sort({ date: -1 }).limit(90);
    res.json({ days: days.map(serializeDay) });
  } catch (err) {
    next(err);
  }
});

router.get('/:date', validate(dayDateSchema), async (req, res, next) => {
  try {
    const day = await DayLog.findOne({ userId: req.user._id, date: req.params.date });
    const habits = await activeHabits(req.user._id);
    res.json({
      day: serializeDay(day),
      habits: habits.map((h) => ({
        id: String(h._id),
        name: h.name,
        type: h.type,
        target: h.target,
        unit: h.unit,
        weight: h.weight,
        targetTime: h.targetTime,
        window: h.window,
        core: h.core,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:date/evening', validate(eveningSchema), async (req, res, next) => {
  try {
    const date = req.params.date;
    const day = await getOrCreateDay(req.user._id, date);
    const { backfilled } = assertEditable(day, req.user.timezone);
    const habits = await activeHabits(req.user._id);
    mergeWindowEntries(day, req.body.entries, habits, 'day');
    if (req.body.mood !== undefined) day.mood = req.body.mood;
    if (req.body.energy !== undefined) day.energy = req.body.energy;
    if (req.body.note !== undefined) day.note = req.body.note;
    day.eveningAt = new Date();
    if (backfilled) day.backfilled = true;
    await day.save();

    if (day.status === 'closed') {
      await persistUserStats(req.user._id, req.user.rank);
    }

    res.json({ day: serializeDay(day) });
  } catch (err) {
    next(err);
  }
});

router.put('/:date/morning', validate(morningSchema), async (req, res, next) => {
  try {
    const date = req.params.date;
    const existing = await DayLog.findOne({ userId: req.user._id, date });
    const wasClosed = existing?.status === 'closed';
    if (existing) assertEditable(existing, req.user.timezone);

    const day = await getOrCreateDay(req.user._id, date);
    const habits = await activeHabits(req.user._id);
    mergeWindowEntries(day, req.body.entries, habits, 'night');
    day.morningAt = new Date();
    await day.save();

    const result = await closeDay({
      userId: req.user._id,
      date,
      closedBy: 'morning',
      backfilled: wasClosed || req.body.backfilled === true,
    });

    const user = {
      currentStreak: result.stats.currentStreak,
      longestStreak: result.stats.longestStreak,
      totalXp: result.stats.totalXp,
      rank: result.stats.rank,
    };

    res.json({
      day: serializeDay(result.day),
      stats: user,
      verdict: {
        date,
        verdict: result.verdict.verdict,
        evidence: result.verdict.evidence,
        question: result.verdict.question,
        line: cannedLine(result.verdict),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:date', validate(dayDateSchema), async (req, res, next) => {
  try {
    const day = await DayLog.findOneAndDelete({ userId: req.user._id, date: req.params.date });
    if (!day) throw httpError(404, 'NOT_FOUND', 'Nothing logged. Noted.');
    await Verdict.deleteOne({ userId: req.user._id, date: req.params.date });
    await persistUserStats(req.user._id, req.user.rank);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
