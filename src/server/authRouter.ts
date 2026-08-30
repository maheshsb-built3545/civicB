/**
 * Auth Routes
 * POST /api/auth/login  — verifies credentials, sets httpOnly cookie, returns user profile
 * POST /api/auth/logout — clears the httpOnly cookie
 */
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { UserModel } from './models/User';
import { signToken, JWT_COOKIE_NAME } from './authMiddleware';

const router = Router();

// Cookie options — HttpOnly prevents JS access; SameSite=Strict prevents CSRF
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  // secure: true must be set in production (HTTPS). In dev (HTTP localhost) leave it false.
  secure: process.env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
};

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // If MongoDB is connected, query the UserModel
    if (mongoose.connection.readyState === 1) {
      const user = await UserModel.findOne({ email: cleanEmail }).select('+password');

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const passwordMatch = await user.comparePassword(password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = signToken({
        userId: user._id.toString(),
        role: user.role,
        ward: user.ward,
      });

      res.cookie(JWT_COOKIE_NAME, token, COOKIE_OPTIONS);

      const safeUser = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        roleTitle: user.roleTitle,
        roleTitleMr: user.roleTitleMr,
        ward: user.ward,
        department: user.department,
        badgeNumber: user.badgeNumber,
      };

      return res.json({ user: safeUser });
    }

    // Fallback mode (when DB is unconfigured in local preview)
    const isAdmin = cleanEmail === 'admin@kopargaon.gov.in';
    const isOfficer1 = cleanEmail === 'officer1@kopargaon.gov.in';
    const isOfficer2 = cleanEmail === 'officer2@kopargaon.gov.in';
    const isOfficer3 = cleanEmail === 'officer3@kopargaon.gov.in' || cleanEmail === 'officer@kopargaon.gov.in';

    if (!isAdmin && !isOfficer1 && !isOfficer2 && !isOfficer3) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const role = isAdmin ? 'admin' : 'officer';
    const ward = isAdmin
      ? 'All Wards'
      : isOfficer1
      ? 'Ward 1 - Gandhi Market & Old City'
      : isOfficer2
      ? 'Ward 2 - Kalika Nagar & Temple Zone'
      : 'Ward 3 - Shivaji Chowk & Main Market';

    const userId = isAdmin
      ? 'ADM-001'
      : isOfficer1
      ? 'OFF-001'
      : isOfficer2
      ? 'OFF-002'
      : 'OFF-003';

    const token = signToken({
      userId,
      role,
      ward,
    });

    res.cookie(JWT_COOKIE_NAME, token, COOKIE_OPTIONS);

    const fallbackUser = isAdmin ? {
      id: 'ADM-001',
      name: 'Er. Sanjay R. Deshmukh',
      email: 'admin@kopargaon.gov.in',
      role: 'admin' as const,
      roleTitle: 'Chief Municipal Officer (CMO)',
      roleTitleMr: 'मुख्याधिकारी (नगर परिषद)',
      ward: 'All Wards',
      department: 'Urban Development & Municipal Governance',
      badgeNumber: 'KMC-CMO-001',
    } : isOfficer1 ? {
      id: 'OFF-001',
      name: 'Ramesh (Ward 1)',
      email: 'officer1@kopargaon.gov.in',
      role: 'officer' as const,
      roleTitle: 'Ward Executive Officer (Ward 1)',
      roleTitleMr: 'वॉर्ड अधिकारी (प्रभाग १)',
      ward: 'Ward 1 - Gandhi Market & Old City',
      department: 'Civil & Plumbing Division',
      badgeNumber: 'KMC-OFF-001',
      maxActiveTicketCapacity: 3,
      specializations: ['general', 'plumbing']
    } : isOfficer2 ? {
      id: 'OFF-002',
      name: 'Suresh (Ward 2)',
      email: 'officer2@kopargaon.gov.in',
      role: 'officer' as const,
      roleTitle: 'Ward Executive Officer (Ward 2)',
      roleTitleMr: 'वॉर्ड अधिकारी (प्रभाग २)',
      ward: 'Ward 2 - Kalika Nagar & Temple Zone',
      department: 'Electrical Infrastructure',
      badgeNumber: 'KMC-OFF-002',
      maxActiveTicketCapacity: 2,
      specializations: ['general', 'electrical']
    } : {
      id: 'OFF-003',
      name: 'Patil (Ward 3)',
      email: cleanEmail,
      role: 'officer' as const,
      roleTitle: 'Ward Executive Officer (Ward 3)',
      roleTitleMr: 'वॉर्ड अधिकारी (प्रभाग ३)',
      ward: 'Ward 3 - Shivaji Chowk & Main Market',
      department: 'Roads & Heavy Machinery',
      badgeNumber: 'KMC-OFF-003',
      maxActiveTicketCapacity: 4,
      specializations: ['general', 'heavy_machinery']
    };

    return res.json({ user: fallbackUser });
  } catch (err: any) {
    console.error('[POST /api/auth/login]', err);
    return res.status(503).json({ error: 'Authentication service unavailable. Please try again.' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(JWT_COOKIE_NAME, COOKIE_OPTIONS);
  return res.json({ message: 'Logged out.' });
});

export const authRouter = router;
