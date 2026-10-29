import { Router } from 'express';
import DayLog from '../models/DayLog.js';
import Verdict from '../models/Verdict.js';
import { dateInTz, isOverdueForAutoClose, morningDueDate, addDays } from '../lib/dates.js';
import { sevenDayStrip } from '../services/stats.js';
import { cannedLine, FALLBACK_LINE } from '../services/canned.js';
import { publicUser } from '../middleware/auth.js';

const router = Router();

router.get('/summary', async (req, res, next) => {
  try {
    const tz = req.user.timezone || 'Asia/Dhaka';
    const today = dateInTz(new Date(), tz);
    const yesterday = addDays(today, -1);
    const closed = await DayLog.find({ userId: req.user._id, status: 'closed' }).sort({ date: 1 });
    const todayLog = await DayLog.findOne({ userId: req.user._id, date: today });
    const yLog = await DayLog.findOne({ userId: req.user._id, date: yesterday });

    const dueMorningDate = morningDueDate(new Date(), tz);
    const morningDue =
      Boolean(dueMorningDate) && (!yLog || yLog.status === 'open') && !isOverdueForAutoClose(yesterday, new Date(), tz);

    const eveningDue = !morningDue && todayLog?.status !== 'closed' && !todayLog?.eveningAt;

    const latest = await Verdict.findOne({ userId: req.user._id }).sort({ date: -1, createdAt: -1 });

    res.json({
      user: publicUser(req.user),
      today,
      yesterday,
      strip: sevenDayStrip(closed, today, 7),
      morningDue,
      morningDate: morningDue ? yesterday : null,
      eveningDue,
      eveningDate: today,
      latestLine: cannedLine(latest) || FALLBACK_LINE,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
