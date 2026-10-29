import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { httpError } from './errorHandler.js';

const COOKIE = 'alter7';

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

export function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

export function setAuthCookie(res, userId) {
  res.cookie(COOKIE, signToken(userId), cookieOptions());
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: 0 });
}

export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[COOKIE];
    if (!token) throw httpError(401, 'UNAUTHENTICATED', 'Sign in first.');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) throw httpError(401, 'UNAUTHENTICATED', 'Sign in first.');
    req.user = user;
    next();
  } catch (err) {
    if (err.status) return next(err);
    next(httpError(401, 'UNAUTHENTICATED', 'Sign in first.'));
  }
}

export function publicUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    timezone: user.timezone,
    personaMode: user.personaMode,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    totalXp: user.totalXp,
    rank: user.rank,
    shareNotesWithAI: user.shareNotesWithAI,
  };
}
