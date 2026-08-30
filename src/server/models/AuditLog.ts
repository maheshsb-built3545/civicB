/**
 * PART 2 — Schema 4: AuditLog
 *
 * Mapped from:
 *   - src/types.ts → AuditLogEntry interface (id, timestamp, actionType, issueId,
 *     ticketNumber, issueTitle, officerName, officerRole, details, metadata)
 *   - src/App.tsx → override logging shape (oldRank, newRank in metadata)
 *   - src/components/AuditLogTable.tsx → columns rendered (all fields on AuditLogEntry)
 *
 * Field mapping notes:
 *   - `id` (string) → stored as MongoDB `_id`. Virtual exposes it as string `id`.
 *   - `metadata` → typed as a flexible Record<string, unknown> in types.ts;
 *     stored here as Map<string, any> for MongoDB flexibility. For override logs,
 *     it contains { originalRank, newRank, category }.
 *   - `timestamp` → persisted as string (matches AuditLogEntry.timestamp which is a
 *     locale-formatted string from toLocaleString). Mongoose's `createdAt` is also added
 *     via timestamps:true as a proper Date for server-side sorting.
 *   - `actionType` uses the exact string union from types.ts.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';
import type { AuditLogEntry } from '../../types';

type ActionType = AuditLogEntry['actionType'];

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  timestamp: string;
  actionType: ActionType;
  issueId: string;
  ticketNumber: string;
  issueTitle: string;
  officerName: string;
  officerRole: string;
  details: string;
  metadata?: Record<string, unknown>;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    // locale-formatted string matching AuditLogEntry.timestamp in types.ts
    timestamp: { type: String, required: true },
    actionType: {
      type: String,
      required: true,
      enum: [
        'RANKING_OVERRIDE',
        'WORK_ORDER_APPROVED',
        'DATA_VERIFIED',
        'ISSUE_INGESTED',
        'RESOURCE_REBALANCED',
      ] as ActionType[],
      index: true,
    },
    issueId: { type: String, required: true, index: true },
    ticketNumber: { type: String, required: true, index: true },
    issueTitle: { type: String, required: true },
    officerName: { type: String, required: true },
    officerRole: { type: String, required: true },
    details: { type: String, required: true },
    // Flexible metadata blob (override: { originalRank, newRank, category })
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true, // adds createdAt (Date) for server-side chronological sorting
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for paginating audit trail by most-recent action
AuditLogSchema.index({ createdAt: -1, actionType: 1 });

export const AuditLogModel: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
