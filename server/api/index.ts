import { Request, Response } from 'express';
import app, { connectDB } from '../src/app';

// Wrap the Express app so the DB connection is always ready before handling
// any request — critical for Vercel serverless where cold starts are common.
export default async (req: Request, res: Response) => {
  await connectDB();
  return app(req, res);
};
