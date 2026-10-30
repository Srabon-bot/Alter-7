// Deletes all day logs and verdicts for every user, then recomputes user stats from scratch.
// Auth records (users), habits and habit state are intentionally kept, so the user can keep
// logging in and run the ritual days through the normal flow.
// Run from server/ with MONGODB_URI pointing at the target database.

import 'dotenv/config';
import mongoose from 'mongoose';
import DayLog from '../src/models/DayLog.js';
import Verdict from '../src/models/Verdict.js';
import { persistUserStats } from '../src/services/closeDay.js';

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI);

  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  for (const user of users) {
    await DayLog.deleteMany({ userId: user._id });
    await Verdict.deleteMany({ userId: user._id });
  }

  for (const user of await mongoose.connection.db.collection('users').find({}).toArray()) {
    const stats = await persistUserStats(user._id, user.rank);
    console.log(JSON.stringify({ user: user.email, ...stats }));
  }

  await mongoose.disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
