import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request { user?: { id: string; restaurantId: string; role: string } }

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET!) as AuthRequest['user']; next(); }
  catch { return res.status(401).json({ message: 'Invalid token' }); }
}

export function n8nAuth(req: Request, res: Response, next: NextFunction) {
  if (req.headers['x-api-key'] !== process.env.N8N_API_KEY) return res.status(401).json({ message: 'Invalid integration key' });
  next();
}
