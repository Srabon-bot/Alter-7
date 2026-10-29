import { describe, expect, it } from 'vitest';
import {
  computeDayResult,
  dayScore,
  dayWon,
  higherRank,
  rankFromXp,
  recalculateStats,
  sevenDayStrip,
} from '../src/services/stats.js';
import { addDays, dateInTz, isOverdueForAutoClose, partsInTz, sleepHours } from '../src/lib/dates.js';

const habits = [
  { _id: 'phone', name: 'Phone away', type: 'boolean', weight: 5, core: true, window: 'night', active: true },
  { _id: 'lights', name: 'Lights out', type: 'boolean', weight: 5, core: true, window: 'night', active: true },
  { _id: 'wake', name: 'Wake up', type: 'boolean', weight: 5, core: true, window: 'night', active: true },
  { _id: 'work', name: 'Morning workout', type: 'boolean', weight: 5, core: true, window: 'day', active: true },
];

function allDone(ids = ['phone', 'lights', 'wake', 'work']) {
  return ids.map((habitId) => ({ habitId, done: true }));
}

function miss(id) {
  return allDone().map((e) => (e.habitId === id ? { ...e, done: false } : e));
}

describe('score and won', () => {
  it('scores 100 when every active habit is done', () => {
    expect(dayScore(habits, allDone())).toBe(100);
    expect(dayWon(habits, allDone())).toBe(true);
  });

  it('is lost if any core habit is missed, even at high score', () => {
    const result = computeDayResult(habits, miss('work'));
    expect(result.score).toBe(75);
    expect(result.won).toBe(false);
  });

  it('all-core-done edge: extra non-core miss still wins', () => {
    const withOptional = [
      ...habits,
      { _id: 'focus', name: 'Focus', type: 'numeric', target: 2, weight: 3, core: false, active: true },
    ];
    const entries = [...allDone(), { habitId: 'focus', done: false, value: 0 }];
    expect(dayWon(withOptional, entries)).toBe(true);
    expect(dayScore(withOptional, entries)).toBe(87);
  });

  it('numeric habit completes at value >= target', () => {
    const numeric = [{ _id: 'h', type: 'numeric', target: 2, weight: 1, core: true, active: true }];
    expect(dayWon(numeric, [{ habitId: 'h', value: 2 }])).toBe(true);
    expect(dayWon(numeric, [{ habitId: 'h', value: 1.9 }])).toBe(false);
  });
});

describe('streak, xp, rank', () => {
  it('builds a normal streak and adds daily score xp', () => {
    const days = [
      { date: '2026-10-01', entries: allDone() },
      { date: '2026-10-02', entries: allDone() },
      { date: '2026-10-03', entries: allDone() },
    ];
    const stats = recalculateStats(days, habits);
    expect(stats.currentStreak).toBe(3);
    expect(stats.longestStreak).toBe(3);
    expect(stats.totalXp).toBe(300);
    expect(stats.rank).toBe('I');
  });

  it('a lost day resets current streak', () => {
    const days = [
      { date: '2026-10-01', entries: allDone() },
      { date: '2026-10-02', entries: miss('phone') },
      { date: '2026-10-03', entries: allDone() },
    ];
    const stats = recalculateStats(days, habits);
    expect(stats.currentStreak).toBe(1);
    expect(stats.longestStreak).toBe(1);
    expect(days[1].won).toBe(false);
  });

  it('backfilled day recalculates the whole chain', () => {
    const days = [
      { date: '2026-10-01', entries: allDone() },
      { date: '2026-10-02', entries: miss('wake'), backfilled: true },
      { date: '2026-10-03', entries: allDone() },
    ];
    const lost = recalculateStats(days, habits);
    expect(lost.currentStreak).toBe(1);
    days[1].entries = allDone();
    const fixed = recalculateStats(days, habits);
    expect(fixed.currentStreak).toBe(3);
    expect(fixed.totalXp).toBe(300);
  });

  it('awards +50 xp at streak milestones 7 and 14', () => {
    const days = Array.from({ length: 14 }, (_, i) => ({
      date: addDays('2026-10-01', i),
      entries: allDone(),
    }));
    const stats = recalculateStats(days, habits);
    expect(stats.currentStreak).toBe(14);
    expect(stats.totalXp).toBe(14 * 100 + 50 + 50);
  });

  it('rank never decreases when previous rank is higher than derived xp', () => {
    const stats = recalculateStats([{ date: '2026-10-01', entries: miss('work') }], habits, 'III');
    expect(rankFromXp(stats.totalXp)).not.toBe('III');
    expect(stats.rank).toBe('III');
    expect(higherRank('I', 'II')).toBe('II');
  });

  it('crosses a month boundary without breaking a streak', () => {
    const days = [
      { date: '2026-01-30', entries: allDone() },
      { date: '2026-01-31', entries: allDone() },
      { date: '2026-02-01', entries: allDone() },
    ];
    const stats = recalculateStats(days, habits);
    expect(stats.currentStreak).toBe(3);
  });
});

describe('Asia/Dhaka dates and lazy auto-close', () => {
  it('formats YYYY-MM-DD in Asia/Dhaka', () => {
    const utc = new Date('2026-10-28T18:00:00.000Z');
    expect(dateInTz(utc, 'Asia/Dhaka')).toBe('2026-10-29');
  });

  it('rolls to the next Dhaka date before UTC midnight', () => {
    const justBefore = new Date('2026-10-28T17:59:00.000Z');
    const justAfter = new Date('2026-10-28T18:00:00.000Z');
    expect(dateInTz(justBefore, 'Asia/Dhaka')).toBe('2026-10-28');
    expect(dateInTz(justAfter, 'Asia/Dhaka')).toBe('2026-10-29');
  });

  it('does not auto-close ritual day D before noon on D+1', () => {
    const beforeNoon = new Date('2026-10-29T05:59:00.000Z');
    expect(partsInTz(beforeNoon, 'Asia/Dhaka').hour).toBe(11);
    expect(isOverdueForAutoClose('2026-10-28', beforeNoon, 'Asia/Dhaka')).toBe(false);
  });

  it('auto-closes ritual day D at 12:00 noon on D+1', () => {
    const noon = new Date('2026-10-29T06:00:00.000Z');
    expect(partsInTz(noon, 'Asia/Dhaka').hour).toBe(12);
    expect(isOverdueForAutoClose('2026-10-28', noon, 'Asia/Dhaka')).toBe(true);
  });

  it('auto-closes older days after a gap', () => {
    const now = new Date('2026-10-29T06:00:00.000Z');
    expect(isOverdueForAutoClose('2026-10-20', now, 'Asia/Dhaka')).toBe(true);
  });
});

describe('sleep window', () => {
  it('is 7.5 hours for 22:00 to 05:30', () => {
    expect(sleepHours('22:00', '05:30')).toBe(7.5);
  });

  it('warns below 7 hours', () => {
    expect(sleepHours('23:00', '05:30')).toBeLessThan(7);
  });
});

describe('seven-day strip', () => {
  it('aligns closed days to the last seven dates', () => {
    const closed = [
      { date: '2026-10-27', won: true, score: 100 },
      { date: '2026-10-28', won: false, score: 50 },
    ];
    const strip = sevenDayStrip(closed, '2026-10-29', 7);
    expect(strip).toHaveLength(7);
    expect(strip[0].date).toBe('2026-10-23');
    expect(strip[5].won).toBe(false);
    expect(strip[6].closed).toBe(false);
  });
});
