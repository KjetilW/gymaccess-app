import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.API_SECRET || 'dev-secret';

export interface AuthRequest extends Request {
  adminId?: string;
  gymId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string; gymId: string };
    req.adminId = decoded.adminId;
    req.gymId = decoded.gymId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
