import app from '../src/server';
import { connectDB } from '../src/config/db';

let dbReady: Promise<void> | null = null;

export default async function handler(req: any, res: any) {
  if (!dbReady) {
    dbReady = connectDB();
  }

  await dbReady;

  return app(req, res);
}
