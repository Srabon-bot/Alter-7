import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../.data/mongo');

function isLocalMongo(uri) {
  return /127\.0\.0\.1|localhost/.test(uri || '');
}

async function loadMemoryServer() {
  // Keep this dev-only dependency out of production/serverless bundles.
  const dynamicImport = new Function('specifier', 'return import(specifier)');
  return dynamicImport('mongodb-memory-server');
}

export async function connectDb(uri) {
  const local = isLocalMongo(uri);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: local ? 2500 : 10000 });
    console.log(`MongoDB connected (${mongoose.connection.host})`);
    return;
  } catch (err) {
    if (!local || process.env.NODE_ENV === 'production') throw err;
    console.warn('Local MongoDB is not running. Starting an embedded database...');
  }

  fs.mkdirSync(dataDir, { recursive: true });
  const { MongoMemoryServer } = await loadMemoryServer();
  const mongod = await MongoMemoryServer.create({
    instance: {
      dbName: 'alter7',
      dbPath: dataDir,
      storageEngine: 'wiredTiger',
    },
  });
  const embeddedUri = mongod.getUri('alter7');
  await mongoose.connect(embeddedUri);
  console.log('Embedded MongoDB ready. Data lives in server/.data/mongo');
}
