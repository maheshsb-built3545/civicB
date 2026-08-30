/**
 * PART 2 — Schema 2: Issue
 *
 * Mapped from: src/types.ts → CivicIssue, ScoreBreakdown, IssueCategory,
 *              IssueStatus, ConfidenceLevel interfaces
 *
 * Field mapping notes:
 *   - `id` (string) → stored as MongoDB `_id` (ObjectId). A virtual `id` is surfaced for the frontend.
 *   - `daysOpen` → DERIVED field. We store `reportedDate` (ISO string, matches types.ts)
 *     and compute daysOpen at read-time. However, to exactly match the frontend's CivicIssue.daysOpen
 *     field for the API response, we also persist it; the scoring engine recomputes it anyway.
 *   - `scoreBreakdown` → embedded sub-document mirroring ScoreBreakdown exactly.
 *   - `overrideDetails` → optional embedded sub-document mirroring CivicIssue.overrideDetails.
 *   - `aiVerification` → optional embedded sub-document mirroring CivicIssue.aiVerification.
 *   - `requiredEquipment`, `dataQualityFlags` → string arrays, direct from types.ts.
 *   - `computedRank` → original algorithmic rank before any officer override.
 *   - `currentRank` → live active rank (may differ post-override).
 *   - `coordinates` → optional lat/lng, matches types.ts optional field.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';
import type {
  IssueCategory,
  IssueStatus,
  ConfidenceLevel,
} from '../../types';

export interface IIssue extends Document {
  _id: mongoose.Types.ObjectId;
  ticketNumber: string;
  title: string;
  description: string;
  category: IssueCategory;
  ward: string;
  locationLandmark: string;
  coordinates?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
  reportedDate: string;
  daysOpen: number;
  urgencyScore: number;
  computedRank: number;
  currentRank: number;
  justification: string;
  scoreBreakdown: {
    safetyRisk: number;
    citizenReportsCount: number;
    citizenDensityScore: number;
    daysOpen: number;
    agingScore: number;
    criticalFacilityProximityScore: number;
    facilityDetails?: string;
    tieBreakerApplied?: boolean;
    tieBreakerReason?: string;
  };
  estimatedCostInr: number;
  estimatedCrewHours: number;
  requiredEquipment: string[];
  dataConfidence: ConfidenceLevel;
  dataQualityScore: number;
  dataQualityFlags: string[];
  needsReview: boolean;
  status: IssueStatus;
  isActionedThisCycle: boolean;
  isOverridden: boolean;
  overrideDetails?: {
    originalRank: number;
    newRank: number;
    reason: string;
    category: string;
    officerName: string;
    officerRole: string;
    timestamp: string;
  };
  aiVerification?: {
    isLikelyGenuine: boolean;
    confidenceLabel: ConfidenceLevel;
    aiReasoning: string;
    screenedAt: string;
  };
}

const ScoreBreakdownSchema = new Schema(
  {
    safetyRisk: { type: Number, required: true, min: 0, max: 100 },
    citizenReportsCount: { type: Number, required: true, min: 0 },
    citizenDensityScore: { type: Number, required: true, min: 0, max: 100 },
    daysOpen: { type: Number, required: true, min: 0 },
    agingScore: { type: Number, required: true, min: 0, max: 100 },
    criticalFacilityProximityScore: { type: Number, required: true, min: 0, max: 100 },
    facilityDetails: { type: String },
    tieBreakerApplied: { type: Boolean },
    tieBreakerReason: { type: String },
  },
  { _id: false }
);

const IssueSchema = new Schema<IIssue>(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: [
        'Roads & Potholes',
        'Water Supply',
        'Drainage & Sewage',
        'Streetlights & Electrical',
        'Solid Waste Management',
        'Public Safety & Structural',
      ] as IssueCategory[],
    },
    ward: { type: String, required: true, index: true },
    locationLandmark: { type: String, required: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    latitude: { type: Number },
    longitude: { type: Number },
    reportedDate: { type: String, required: true }, // ISO date string "YYYY-MM-DD" — matches CivicIssue.reportedDate
    daysOpen: { type: Number, required: true, default: 0 },
    urgencyScore: { type: Number, required: true, min: 0, max: 100, index: true },
    computedRank: { type: Number, required: true },
    currentRank: { type: Number, required: true, index: true },
    justification: { type: String, required: true },
    scoreBreakdown: { type: ScoreBreakdownSchema, required: true },
    estimatedCostInr: { type: Number, required: true, min: 0 },
    estimatedCrewHours: { type: Number, required: true, min: 0 },
    requiredEquipment: [{ type: String }],
    dataConfidence: {
      type: String,
      enum: ['high', 'medium', 'low'] as ConfidenceLevel[],
      required: true,
    },
    dataQualityScore: { type: Number, required: true, min: 0, max: 100 },
    dataQualityFlags: [{ type: String }],
    needsReview: { type: Boolean, required: true, default: false },
    status: {
      type: String,
      enum: ['ranked', 'scheduled', 'in_progress', 'resolved', 'needs_review'],
      required: true,
      default: 'ranked',
    },
    isActionedThisCycle: { type: Boolean, required: true, default: false },
    isOverridden: { type: Boolean, required: true, default: false },
    overrideDetails: {
      originalRank: { type: Number },
      newRank: { type: Number },
      reason: { type: String },
      category: { type: String },
      officerName: { type: String },
      officerRole: { type: String },
      timestamp: { type: String },
    },
    aiVerification: {
      isLikelyGenuine: { type: Boolean },
      confidenceLabel: { type: String, enum: ['high', 'medium', 'low'] },
      aiReasoning: { type: String },
      screenedAt: { type: String },
    },
  },
  {
    timestamps: true, // adds createdAt / updatedAt managed by Mongoose
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const IssueModel: Model<IIssue> =
  mongoose.models.Issue || mongoose.model<IIssue>('Issue', IssueSchema);
