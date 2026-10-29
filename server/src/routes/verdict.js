import { Router } from 'express';
import Verdict from '../models/Verdict.js';
import { cannedLine, FALLBACK_LINE } from '../services/canned.js';

const router = Router();

router.get('/latest', async (req, res, next) => {
  try {
    const latest = await Verdict.findOne({ userId: req.user._id }).sort({ date: -1, createdAt: -1 });
    res.json({
      verdict: latest
        ? {
            date: latest.date,
            verdict: latest.verdict,
            evidence: latest.evidence,
            question: latest.question,
            line: cannedLine(latest),
          }
        : null,
      line: latest ? cannedLine(latest) : FALLBACK_LINE,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
