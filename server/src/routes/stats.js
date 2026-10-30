import { Router } from 'express';
import DayLog from '../models/DayLog.js';
import Verdict from '../models/Verdict.js';
import { addDays, partsInTz } from '../lib/dates.js';
import { isHabitComplete, sevenDayStrip } from '../services/stats.js';
import { activeHabits } from '../services/closeDay.js';
import { cannedLine, FALLBACK_LINE } from '../services/canned.js';
import { publicUser } from '../middleware/auth.js';

const router = Router();

router.get('/summary', async (req, res, next) => {
  try {
    const tz = req.user.timezone || 'Asia/Dhaka';
    const parts = partsInTz(new Date(), tz);
    const today = parts.date;
    const yesterday = addDays(today, -1);

    const [closed, todayLog, habits, latest] = await Promise.all([
      DayLog.find({ userId: req.user._id, status: 'closed' }).sort({ date: 1 }),
      DayLog.findOne({ userId: req.user._id, date: today }),
      activeHabits(req.user._id),
      Verdict.findOne({ userId: req.user._id }).sort({ date: -1, createdAt: -1 }),
    ]);

    const entries = new Map((todayLog?.entries || []).map((e) => [String(e.habitId), e]));
    const morning = habits.filter((h) => h.window === 'morning');
    const coreEvening = habits.filter((h) => h.window === 'evening' && h.core);

    // The wake is filed on the morning of the day it opens; after noon it stops being a prompt.
    const openingDue = parts.hour < 12 && morning.some((h) => !entries.has(String(h._id)));
    const eveningDue = todayLog?.status !== 'closed' && !todayLog?.eveningAt;
    const closingDue =
      todayLog?.status === 'open' &&
      coreEvening.length > 0 &&
      coreEvening.every((h) => isHabitComplete(h, entries.get(String(h._id))));

    res.json({
      user: publicUser(req.user),
      today,
      yesterday,
      strip: sevenDayStrip(closed, today, 7),
      openingDue,
      eveningDue,
      closingDue,
      eveningDate: today,
      latestLine: cannedLine(latest) || FALLBACK_LINE,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
