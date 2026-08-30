/**
 * PART 2 — Schema 1: User
 *
 * Mapped from: src/types.ts → User interface + UserRole type
 *
 * Field mapping notes:
 *   - `password` (hashed):  Not on the frontend User type. Added here and stripped from
 *     API responses before sending to client (select: false keeps it out of queries by default).
 *   - `id` → stored as MongoDB `_id` (ObjectId). A virtual `id` string is exposed to match
 *     the frontend's User.id string field.
 *   - `roleTitleMr` → optional, matches types.ts.
 *   - `ward` → "All Wards" for admin, specific ward string for officers (matches types.ts comment).
 */
import mongoose, { Schema, Document, Model, CallbackError } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { UserRole } from '../../types';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  roleTitle: string;
  roleTitleMr?: string;
  ward: string;
  department: string;
  badgeNumber: string;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // select: false means password is NEVER returned by default in queries —
    // you must explicitly call .select('+password') to access it.
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'officer'] as UserRole[], required: true },
    roleTitle: { type: String, required: true },
    roleTitleMr: { type: String },
    // Officers: "Ward 3 - Shivaji Chowk & Main Market"; Admins: "All Wards"
    ward: { type: String, required: true, default: 'All Wards' },
    department: { type: String, required: true },
    badgeNumber: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Hash password before saving if it has been modified
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12); // cost factor 12: ~250ms on modern hardware
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method for constant-time password comparison
UserSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
