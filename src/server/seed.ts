/**
 * PART 3 — Seed Script: creates initial demo admin and officer accounts
 *
 * WHY A SEED SCRIPT (not a /register endpoint):
 *   A public /register endpoint would let anyone create admin accounts —
 *   inappropriate for a municipal system. A one-time seed script run by the
 *   deployment engineer is the correct pattern. Officers are created by admins
 *   via an admin-only endpoint (Stage B).
 *
 * HOW TO RUN:
 *   1. Ensure MONGODB_URI, SEED_ADMIN_PASSWORD, and SEED_OFFICER_PASSWORD
 *      are set in your .env file.
 *   2. Run: npx tsx src/server/seed.ts
 *
 * SECURITY:
 *   - Passwords are read from environment variables — never hardcoded.
 *   - This script is idempotent: re-running it updates existing demo users
 *     rather than duplicating them.
 *   - Add src/server/seed.ts to .gitignore if you ever put real secrets here.
 *     Currently it reads from .env, so it is safe to commit.
 */
import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import mongoose from 'mongoose';
import { UserModel } from './models/User';

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[Seed] MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const officerPassword = process.env.SEED_OFFICER_PASSWORD;

  if (!adminPassword || !officerPassword) {
    console.error(
      '[Seed] SEED_ADMIN_PASSWORD and SEED_OFFICER_PASSWORD must be set in .env. Aborting.'
    );
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName: 'kopargaonpriority' });
  console.log('[Seed] Connected to MongoDB Atlas');

  // --- Admin Account (matches DEMO_USERS.admin in AuthContext.tsx) ---
  let adminUser = await UserModel.findOne({ email: 'admin@kopargaon.gov.in' });
  if (adminUser) {
    adminUser.name = 'Er. Sanjay R. Deshmukh';
    adminUser.password = adminPassword;
    adminUser.role = 'admin';
    adminUser.roleTitle = 'Chief Municipal Officer (CMO)';
    adminUser.roleTitleMr = 'मुख्याधिकारी (नगर परिषद)';
    adminUser.ward = 'All Wards';
    adminUser.department = 'Urban Development & Municipal Governance';
    adminUser.badgeNumber = 'KMC-CMO-001';
  } else {
    adminUser = new UserModel({
      name: 'Er. Sanjay R. Deshmukh',
      email: 'admin@kopargaon.gov.in',
      password: adminPassword,
      role: 'admin',
      roleTitle: 'Chief Municipal Officer (CMO)',
      roleTitleMr: 'मुख्याधिकारी (नगर परिषद)',
      ward: 'All Wards',
      department: 'Urban Development & Municipal Governance',
      badgeNumber: 'KMC-CMO-001',
    });
  }
  await adminUser.save();
  console.log('[Seed] ✅ Admin account seeded: admin@kopargaon.gov.in');

  // --- Officer Account (matches DEMO_USERS.officer in AuthContext.tsx) ---
  let officerUser = await UserModel.findOne({ email: 'officer@kopargaon.gov.in' });
  if (officerUser) {
    officerUser.name = 'Er. Rahul S. Patil';
    officerUser.password = officerPassword;
    officerUser.role = 'officer';
    officerUser.roleTitle = 'Ward Executive Engineer (Ward 3)';
    officerUser.roleTitleMr = 'वॉर्ड कार्यकारी अभियंता';
    officerUser.ward = 'Ward 3 - Shivaji Chowk & Main Market';
    officerUser.department = 'Civil Engineering & Road Infrastructure';
    officerUser.badgeNumber = 'KMC-ENG-042';
  } else {
    officerUser = new UserModel({
      name: 'Er. Rahul S. Patil',
      email: 'officer@kopargaon.gov.in',
      password: officerPassword,
      role: 'officer',
      roleTitle: 'Ward Executive Engineer (Ward 3)',
      roleTitleMr: 'वॉर्ड कार्यकारी अभियंता',
      ward: 'Ward 3 - Shivaji Chowk & Main Market',
      department: 'Civil Engineering & Road Infrastructure',
      badgeNumber: 'KMC-ENG-042',
    });
  }
  await officerUser.save();
  console.log('[Seed] ✅ Officer account seeded: officer@kopargaon.gov.in');

  await mongoose.disconnect();
  console.log('[Seed] Done. Disconnected from MongoDB.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[Seed] Fatal error:', err);
  process.exit(1);
});
