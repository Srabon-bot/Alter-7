import DayLog from '../models/DayLog.js';
import Habit from '../models/Habit.js';
import User from '../models/User.js';
import Verdict from '../models/Verdict.js';
import { cannedLine, cannedVerdict } from './canned.js';
import { computeDayResult, recalculateStats } from './stats.js';
import { addDays, isOverdueForAutoClose } from '../lib/dates.js';

export async function activeHabits(userId) {
  return Habit.find({ userId, active: true, archivedAt: null }).sort({ order: 1 });
}

export async function persistUserStats(userId, previousRank) {
  const habits = await Habit.find({ userId, archivedAt: null }).sort({ order: 1 });
  const closed = await DayLog.find({ userId, status: 'closed' }).sort({ date: 1 });
  const stats = recalculateStats(closed, habits, previousRank);
  for (const day of closed) {
    if (day.isModified?.() || day.score !== undefined) {
      await DayLog.updateOne({ _id: day._id }, { score: day.score, won: day.won });
    }
  }
  await User.updateOne(
    { _id: userId },
    {
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      totalXp: stats.totalXp,
      rank: stats.rank,
    },
  );
  return stats;
}

function mergeEntries(existing, incoming, habitIds) {
  const map = new Map((existing || []).map((e) => [String(e.habitId), { ...e.toObject?.() || e }]));
  for (const entry of incoming || []) {
    const id = String(entry.habitId);
    if (habitIds && !habitIds.has(id)) continue;
    map.set(id, {
      habitId: entry.habitId,
      done: Boolean(entry.done),
      value: entry.value ?? null,
    });
  }
  return [...map.values()];
}

export async function getOrCreateDay(userId, date) {
  let day = await DayLog.findOne({ userId, date });
  if (!day) {
    day = await DayLog.create({ userId, date, entries: [], status: 'open' });
  }
  return day;
}

export async function closeDay({
  userId,
  date,
  closedBy,
  markEveningMissed = false,
  backfilled = false,
  skipStats = false,
}) {
  const user = await User.findById(userId);
  const habits = await activeHabits(userId);
  const day = await getOrCreateDay(userId, date);

  if (markEveningMissed) {
    const eveningIds = new Set(habits.filter((h) => h.window === 'evening').map((h) => String(h._id)));
    const map = new Map((day.entries || []).map((e) => [String(e.habitId), e.toObject?.() || e]));
    for (const habit of habits) {
      const id = String(habit._id);
      if (!map.has(id)) {
        map.set(id, { habitId: habit._id, done: false, value: null });
      } else if (eveningIds.has(id) && map.get(id).done !== true) {
        map.set(id, { ...map.get(id), done: false });
      }
    }
    day.entries = [...map.values()];
  }

  const result = computeDayResult(habits, day.entries);
  day.status = 'closed';
  day.closedBy = closedBy;
  day.score = result.score;
  day.won = result.won;
  if (backfilled) day.backfilled = true;
  if (closedBy === 'morning' && !day.morningAt) day.morningAt = new Date();
  if (closedBy === 'evening' && !day.eveningAt) day.eveningAt = new Date();
  await day.save();

  const canned = cannedVerdict({
    won: result.won,
    score: result.score,
    streak: result.won ? (user.currentStreak || 0) + 1 : 0,
    closedBy,
  });

  const verdict = await Verdict.findOneAndUpdate(
    { userId, date },
    {
      userId,
      date,
      verdict: canned.verdict,
      evidence: canned.evidence,
      question: canned.question,
      modelUsed: 'canned',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const stats = skipStats ? null : await persistUserStats(userId, user.rank);

  return {
    day,
    stats,
    verdict,
    line: cannedLine(verdict),
  };
}

export async function autoCloseOverdue(userId, now = new Date(), tz = 'Asia/Dhaka') {
  const user = await User.findById(userId);
  if (!user) return [];
  const zone = tz || user.timezone || 'Asia/Dhaka';
  const closed = await DayLog.find({ userId, status: 'closed' }).sort({ date: 1 }).select('date');
  const open = await DayLog.find({ userId, status: 'open' }).sort({ date: 1 });

  const firstPossible = closed.length ? addDays(closed[closed.length - 1].date, 1) : null;
  const overdueDates = new Set();

  for (const day of open) {
    if (isOverdueForAutoClose(day.date, now, zone)) overdueDates.add(day.date);
  }

  if (firstPossible) {
    const probe = [];
    let cursor = firstPossible;
    for (let i = 0; i < 400; i += 1) {
      if (!isOverdueForAutoClose(cursor, now, zone)) break;
      probe.push(cursor);
      cursor = addDays(cursor, 1);
    }
    for (const date of probe) overdueDates.add(date);
  }

  const closedNow = [];
  const ordered = [...overdueDates].sort();
  try {
    for (const date of ordered) {
      const result = await closeDay({
        userId,
        date,
        closedBy: 'auto',
        markEveningMissed: true,
        skipStats: true,
      });
      closedNow.push(result.day);
    }
  } finally {
    if (closedNow.length) await persistUserStats(userId, user.rank);
  }
  return closedNow;
}

export function mergeWindowEntries(day, incoming, habits, window) {
  const ids = new Set(habits.filter((h) => h.window === window).map((h) => String(h._id)));
  day.entries = mergeEntries(day.entries, incoming, ids);
}
