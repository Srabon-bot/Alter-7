import User from '../models/User.js';
import { autoCloseOverdue } from '../services/closeDay.js';

export async function lazyClose(req, _res, next) {
  try {
    if (req.user?._id) {
      await autoCloseOverdue(req.user._id, new Date(), req.user.timezone);
      req.user = await User.findById(req.user._id);
    }
    next();
  } catch (err) {
    next(err);
  }
}
