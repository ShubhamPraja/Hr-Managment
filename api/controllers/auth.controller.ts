import type { Request, Response } from 'express';
import { loginHandler } from '../auth/login';
import { registerHandler } from '../auth/register';

export const register = async (req: Request, res: Response) => {
  try {
    const result = await registerHandler(req.body || {});
    res.status(result.status).json(result.data);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const result = await loginHandler(req.body || {});
    res.status(result.status).json(result.data);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

