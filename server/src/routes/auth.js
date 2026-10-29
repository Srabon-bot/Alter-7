import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { seedHabits } from '../services/seed.js';
import { clearAuthCookie, publicUser, requireAuth, setAuthCookie } from '../middleware/auth.js';
import { lazyClose } from '../middleware/lazyClose.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../schemas.js';
import { httpError } from '../middleware/errorHandler.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/status', async (_req, res, next) => {
  try {
    const count = await User.countDocuments();
    res.json({
      hasUser: count > 0,
      allowRegistration: process.env.ALLOW_REGISTRATION === 'true' || count === 0,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const count = await User.countDocuments();
    const allow = process.env.ALLOW_REGISTRATION === 'true' || count === 0;
    if (!allow) throw httpError(403, 'FORBIDDEN', 'Registration is closed.');

    const { email, password, name, timezone } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      passwordHash,
      name,
      timezone: timezone || process.env.DEFAULT_TIMEZONE || 'Asia/Dhaka',
    });
    await seedHabits(user._id);
    setAuthCookie(res, user._id);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw httpError(401, 'INVALID_CREDENTIALS', 'Email or password is wrong.');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw httpError(401, 'INVALID_CREDENTIALS', 'Email or password is wrong.');
    setAuthCookie(res, user._id);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, lazyClose, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
