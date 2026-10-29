const MILESTONES = [7, 14, 30, 60, 100];
const MILESTONE_XP = 50;

export const RANK_THRESHOLDS = [
  { rank: 'Unranked', xp: 0 },
  { rank: 'I', xp: 300 },
  { rank: 'II', xp: 900 },
  { rank: 'III', xp: 2000 },
  { rank: 'IV', xp: 3600 },
  { rank: 'V', xp: 5500 },
  { rank: 'VI', xp: 8000 },
  { rank: 'VII', xp: 12000 },
];

export function rankFromXp(xp) {
  let current = 'Unranked';
  for (const row of RANK_THRESHOLDS) {
    if (xp >= row.xp) current = row.rank;
  }
  return current;
}

export function rankIndex(rank) {
  return RANK_THRESHOLDS.findIndex((r) => r.rank === rank);
}

export function higherRank(a, b) {
  return rankIndex(a) >= rankIndex(b) ? a : b;
}

export function isHabitComplete(habit, entry) {
  if (!entry) return false;
  if (habit.type === 'numeric') {
    const value = Number(entry.value);
    const target = Number(habit.target);
    if (Number.isNaN(value) || Number.isNaN(target)) return false;
    return value >= target;
  }
  return Boolean(entry.done);
}

export function dayScore(habits, entries) {
  const active = habits.filter((h) => h.active !== false && !h.archivedAt);
  const weightSum = active.reduce((sum, h) => sum + (h.weight || 1), 0);
  if (weightSum === 0) return 0;
  const byId = new Map((entries || []).map((e) => [String(e.habitId), e]));
  const earned = active.reduce((sum, h) => {
    const entry = byId.get(String(h._id || h.id));
    return sum + (isHabitComplete(h, entry) ? h.weight || 1 : 0);
  }, 0);
  return Math.round((earned / weightSum) * 100);
}

export function dayWon(habits, entries) {
  const core = habits.filter((h) => h.core && h.active !== false && !h.archivedAt);
  if (core.length === 0) return false;
  const byId = new Map((entries || []).map((e) => [String(e.habitId), e]));
  return core.every((h) => isHabitComplete(h, byId.get(String(h._id || h.id))));
}

export function computeDayResult(habits, entries) {
  return {
    score: dayScore(habits, entries),
    won: dayWon(habits, entries),
  };
}

/**
 * Recalculate streak, XP and rank from a chronologically sorted list of closed days.
 * Rank never decreases relative to previousRank.
 */
export function recalculateStats(closedDays, habits, previousRank = 'Unranked') {
  let currentStreak = 0;
  let longestStreak = 0;
  let totalXp = 0;
  const habitStreaks = {};

  for (const day of closedDays) {
    const { score, won } = computeDayResult(habits, day.entries);
    day.score = score;
    day.won = won;

    if (won) {
      currentStreak += 1;
      if (MILESTONES.includes(currentStreak)) totalXp += MILESTONE_XP;
    } else {
      currentStreak = 0;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
    totalXp += score;

    for (const habit of habits.filter((h) => h.active !== false && !h.archivedAt)) {
      const id = String(habit._id || habit.id);
      const entry = (day.entries || []).find((e) => String(e.habitId) === id);
      const done = isHabitComplete(habit, entry);
      const prev = habitStreaks[id] || { current: 0, longest: 0 };
      prev.current = done ? prev.current + 1 : 0;
      prev.longest = Math.max(prev.longest, prev.current);
      habitStreaks[id] = prev;
    }
  }

  const derived = rankFromXp(totalXp);
  const rank = higherRank(derived, previousRank);

  return {
    currentStreak,
    longestStreak,
    totalXp,
    rank,
    habitStreaks,
  };
}

export function sevenDayStrip(closedDays, today, count = 7) {
  const byDate = new Map(closedDays.map((d) => [d.date, d]));
  const strip = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const [y, m, d] = today.split('-').map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d - i));
    const date = `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
    const day = byDate.get(date);
    strip.push({
      date,
      won: day ? Boolean(day.won) : null,
      score: day ? day.score : null,
      closed: Boolean(day),
    });
  }
  return strip;
}
