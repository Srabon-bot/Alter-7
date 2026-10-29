import 'dotenv/config';
import { createApp } from './app.js';
import { connectDb } from './db.js';

const port = Number(process.env.PORT || 5000);

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is required');
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CLIENT_ORIGIN) {
      console.error('CLIENT_ORIGIN is required in production');
      process.exit(1);
    }
    if (process.env.JWT_SECRET === 'change-me') {
      console.error('JWT_SECRET must be changed in production');
      process.exit(1);
    }
  }
  await connectDb(process.env.MONGODB_URI);
  const app = createApp();
  app.listen(port, () => {
    console.log(`ALTER 7 listening on ${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
