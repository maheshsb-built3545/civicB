/**
 * PART 3 / PART 4 — JWT Authentication Middleware
 *
 * JWT expiry: 8 hours (matches a municipal officer workday shift).
 *
 * Token is read from:
 *   1. httpOnly cookie named `kpg_token` (primary, Stage B)
 *   2. Authorization: Bearer <token> header (fallback for API testing)
 *
 * requireAuth  — validates JWT, attaches decoded payload to req.user
 * requireRole  — composes with requireAuth to enforce a minimum role
 * signToken    — issues a new 8-hour JWT
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '../types';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  ward: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const JWT_COOKIE_NAME = 'kpg_token';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('[Auth] JWT_SECRET is not set in .env');
  }
  return secret;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '8h' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Prefer httpOnly cookie; fall back to Authorization header
  let token: string | undefined = req.cookies?.[JWT_COOKIE_NAME];

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Not authenticated.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Unauthorized: Session expired. Please log in again.' });
    } else {
      res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }
  }
}

/**
 * Middleware factory: enforces that the authenticated user has the required role.
 * Must be composed AFTER requireAuth.
 *
 * Usage:
 *   router.delete('/api/issues/:id', requireAuth, requireRole('admin'), handler)
 */
export function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Not authenticated.' });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({
        error: `Forbidden: This action requires the '${role}' role. Your role is '${req.user.role}'.`,
      });
      return;
    }
    next();
  };
}
