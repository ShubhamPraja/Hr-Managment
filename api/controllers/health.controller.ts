import type { Request, Response } from 'express';
import dbConnect from '../lib/mongodb';

export const health = async (_req: Request, res: Response) => {
  await dbConnect();
  res.status(200).json({ status: 'ok', storage: 'MongoDB' });
};

