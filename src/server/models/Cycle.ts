/**
 * PART 2 — Schema 3: Cycle / Budget
 *
 * Mapped from:
 *   - src/types.ts → BudgetSettings interface (totalBudget, totalCrewHours, cycle dates/name)
 *   - src/context/BudgetContext.tsx → allocatedBudget, allocatedCrewHours tracked in state
 *   - src/types.ts → ResourceLedgerState.availableEquipment
 *
 * Field mapping notes:
 *   - `totalBudget` maps from BudgetSettings.totalBudget (same naming as BudgetContext).
 *   - `allocatedBudget` / `allocatedCrewHours` are runtime values tracked by BudgetContext;
 *     stored here so the DB is the single source of truth across sessions.
 *   - `remainingBudget` and `remainingCrewHours` are intentionally NOT stored —
 *     they are derived at read-time (total - allocated) to avoid write-time inconsistency.
 *   - `isActive` flag allows one cycle to be "current" at a time; only one active cycle is
 *     expected per deployment. This is inferred: BudgetContext has no concept of multiple
 *     historical cycles, but the schema should support it for future use.
 *   - `availableEquipment` mirrors ResourceLedgerState.availableEquipment exactly.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

interface EquipmentEntry {
  name: string;
  total: number;
  inUse: number;
}

export interface ICycle extends Document {
  _id: mongoose.Types.ObjectId;
  cycleName: string;
  cycleStartDate: string;
  cycleEndDate: string;
  totalBudget: number;
  totalCrewHours: number;
  allocatedBudget: number;
  allocatedCrewHours: number;
  availableEquipment: EquipmentEntry[];
  isActive: boolean;
}

const EquipmentSchema = new Schema<EquipmentEntry>(
  {
    name: { type: String, required: true },
    total: { type: Number, required: true, min: 0 },
    inUse: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const CycleSchema = new Schema<ICycle>(
  {
    cycleName: { type: String, required: true }, // e.g. "Fortnight Sprint #14 (Aug 15 - Aug 31)"
    cycleStartDate: { type: String, required: true }, // ISO date "YYYY-MM-DD"
    cycleEndDate: { type: String, required: true },
    totalBudget: { type: Number, required: true, min: 0 },       // totalBudget in BudgetSettings
    totalCrewHours: { type: Number, required: true, min: 0 },    // totalCrewHours in BudgetSettings
    allocatedBudget: { type: Number, required: true, min: 0, default: 0 },
    allocatedCrewHours: { type: Number, required: true, min: 0, default: 0 },
    availableEquipment: [EquipmentSchema],
    isActive: { type: Boolean, required: true, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: any, ret: any) => {
        // Expose derived values matching what BudgetContext computes client-side
        ret.remainingBudget = ret.totalBudget - ret.allocatedBudget;
        ret.remainingCrewHours = ret.totalCrewHours - ret.allocatedCrewHours;
      },
    },
  }
);

export const CycleModel: Model<ICycle> =
  mongoose.models.Cycle || mongoose.model<ICycle>('Cycle', CycleSchema);
