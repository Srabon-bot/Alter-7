import { Router } from 'express';
import Habit from '../models/Habit.js';
import { validate } from '../middleware/validate.js';
import { habitCreateSchema, habitIdSchema, habitPatchSchema } from '../schemas.js';
import { httpError } from '../middleware/errorHandler.js';
import { sleepHours } from '../lib/dates.js';
import { persistUserStats } from '../services/closeDay.js';

const router = Router();

function serialize(habit) {
  return {
    id: String(habit._id),
    name: habit.name,
    description: habit.description,
    type: habit.type,
    target: habit.target,
    unit: habit.unit,
    weight: habit.weight,
    targetTime: habit.targetTime,
    window: habit.window,
    core: habit.core,
    active: habit.active,
    order: habit.order,
    archivedAt: habit.archivedAt,
  };
}

async function sleepWarning(userId) {
  const habits = await Habit.find({
    userId,
    active: true,
    archivedAt: null,
    name: { $in: ['Lights out', 'Wake up'] },
  });
  const nameOf = (habit) => habit.name.trim().toLowerCase();
  const lights = habits.find((h) => nameOf(h) === 'lights out')?.targetTime;
  const wake = habits.find((h) => nameOf(h) === 'wake up')?.targetTime;
  const hours = sleepHours(lights, wake);
  if (hours != null && hours < 7) {
    return `Sleep window is ${hours.toFixed(1)} hours. Stay at seven or more.`;
  }
  return null;
}

router.get('/', async (req, res, next) => {
  try {
    const includeArchived = req.query.archived === 'true';
    const filter = { userId: req.user._id };
    if (!includeArchived) filter.archivedAt = null;
    const habits = await Habit.find(filter).sort({ order: 1, createdAt: 1 });
    const warning = await sleepWarning(req.user._id);
    res.json({ habits: habits.map(serialize), warning });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(habitCreateSchema), async (req, res, next) => {
  try {
    const count = await Habit.countDocuments({ userId: req.user._id, archivedAt: null });
    const habit = await Habit.create({
      ...req.body,
      userId: req.user._id,
      order: req.body.order ?? count + 1,
    });
    const warning = await sleepWarning(req.user._id);
    const stats = await persistUserStats(req.user._id, req.user.rank);
    res.status(201).json({ habit: serialize(habit), warning, stats });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(habitPatchSchema), async (req, res, next) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) throw httpError(404, 'NOT_FOUND', 'Habit not found.');
    const { archived, ...rest } = req.body;
    Object.assign(habit, rest);
    if (archived === true) {
      habit.archivedAt = new Date();
      habit.active = false;
    }
    if (archived === false) {
      habit.archivedAt = null;
      habit.active = true;
    }
    await habit.save();
    const warning = await sleepWarning(req.user._id);
    const stats = await persistUserStats(req.user._id, req.user.rank);
    res.json({ habit: serialize(habit), warning, stats });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', validate(habitIdSchema), async (req, res, next) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!habit) throw httpError(404, 'NOT_FOUND', 'Habit not found.');
    const stats = await persistUserStats(req.user._id, req.user.rank);
    res.json({ ok: true, stats });
  } catch (err) {
    next(err);
  }
});

export default router;
