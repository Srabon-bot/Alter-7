import Habit from '../models/Habit.js';

// A ritual day runs from waking to lights out: `morning` habits open the day,
// `evening` habits close it.
export const SEED_HABITS = [
  {
    name: 'Wake up',
    description: 'Wake at 5:30 AM.',
    type: 'boolean',
    target: 1,
    unit: '',
    weight: 5,
    targetTime: '05:30',
    window: 'morning',
    core: true,
    order: 1,
  },
  {
    name: 'Morning workout',
    description: 'Workout after waking.',
    type: 'boolean',
    target: 1,
    unit: '',
    weight: 5,
    targetTime: '',
    window: 'evening',
    core: true,
    order: 2,
  },
  {
    name: 'Phone away',
    description: 'Phone away by 9:00 PM.',
    type: 'boolean',
    target: 1,
    unit: '',
    weight: 5,
    targetTime: '21:00',
    window: 'evening',
    core: true,
    order: 3,
  },
  {
    name: 'Lights out',
    description: 'Lights out by 10:00 PM.',
    type: 'boolean',
    target: 1,
    unit: '',
    weight: 5,
    targetTime: '22:00',
    window: 'evening',
    core: true,
    order: 4,
  },
];

export async function seedHabits(userId) {
  const count = await Habit.countDocuments({ userId });
  if (count > 0) return [];
  return Habit.insertMany(SEED_HABITS.map((h) => ({ ...h, userId, active: true })));
}
