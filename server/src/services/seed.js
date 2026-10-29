import Habit from '../models/Habit.js';

export const SEED_HABITS = [
  {
    name: 'Phone away',
    description: 'Phone away by 9:00 PM.',
    type: 'boolean',
    target: 1,
    unit: '',
    weight: 5,
    targetTime: '21:00',
    window: 'night',
    core: true,
    order: 1,
  },
  {
    name: 'Lights out',
    description: 'Lights out by 10:00 PM.',
    type: 'boolean',
    target: 1,
    unit: '',
    weight: 5,
    targetTime: '22:00',
    window: 'night',
    core: true,
    order: 2,
  },
  {
    name: 'Wake up',
    description: 'Wake at 5:30 AM.',
    type: 'boolean',
    target: 1,
    unit: '',
    weight: 5,
    targetTime: '05:30',
    window: 'night',
    core: true,
    order: 3,
  },
  {
    name: 'Morning workout',
    description: 'Workout after waking.',
    type: 'boolean',
    target: 1,
    unit: '',
    weight: 5,
    targetTime: '',
    window: 'day',
    core: true,
    order: 4,
  },
];

export async function seedHabits(userId) {
  const count = await Habit.countDocuments({ userId });
  if (count > 0) return [];
  return Habit.insertMany(SEED_HABITS.map((h) => ({ ...h, userId, active: true })));
}
