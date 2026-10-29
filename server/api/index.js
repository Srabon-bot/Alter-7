import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDb } from '../src/db.js';

let appPromise;

async function buildApp() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  if (!process.env.CLIENT_ORIGIN) throw new Error('CLIENT_ORIGIN is required');

  if (mongoose.connection.readyState === 0) {
    await connectDb(process.env.MONGODB_URI);
  } else if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
  }

  return createApp();
}

export default async function handler(req, res) {
  try {
    if (!appPromise) appPromise = buildApp();
    const app = await appPromise;
    return app(req, res);
  } catch (err) {
    appPromise = null;
    console.error(err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'SERVER', message: 'It did not save. Try again.' } }));
  }
}
