/**
 * Cycle / Budget API Routes — Part 2
 *
 * GET  /api/cycle/current    — return the active cycle with remaining amounts
 * POST /api/cycle/auto-fit   — greedy allocation (admin-only), ported from App.tsx handleAutoFitSprint
 */
import { Router, Request, Response } from 'express';
import { CycleModel } from './models/Cycle';
import { IssueModel } from './models/Issue';
import { AuditLogModel } from './models/AuditLog';
import { requireAuth, requireRole } from './authMiddleware';
import { calculateOptimalAllocation } from '../utils/allocationEngine';
import type { IssueStatus, CivicIssue } from '../types';

const router = Router();

// ─── GET /api/cycle/current ────────────────────────────────────────────────

router.get('/current', requireAuth, async (_req: Request, res: Response) => {
  try {
    const cycle = await CycleModel.findOne({ isActive: true });
    if (!cycle) {
      return res.status(404).json({ error: 'No active budget cycle found.' });
    }
    // toJSON transform adds remainingBudget and remainingCrewHours automatically
    return res.json({ cycle });
  } catch (err: any) {
    console.error('[GET /api/cycle/current]', err);
    return res.status(500).json({ error: 'Failed to fetch cycle.' });
  }
});

// ─── POST /api/cycle/auto-fit — Admin-only Two-Stage Knapsack ────────────────

router.post('/auto-fit', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const cycle = await CycleModel.findOne({ isActive: true });
    if (!cycle) {
      return res.status(404).json({ error: 'No active budget cycle found.' });
    }

    const rawIssues = await IssueModel.find({}).lean();
    const issuesList: CivicIssue[] = rawIssues.map((doc: any) => ({
      ...doc,
      id: doc.id || doc._id.toString(),
    }));

    // Run Two-Stage Optimal Allocation Pipeline
    const allocationResult = calculateOptimalAllocation(
      issuesList,
      cycle.totalBudget,
      cycle.totalCrewHours
    );

    const bulkOps: any[] = allocationResult.allReconciledIssues.map((issue) => ({
      updateOne: {
        filter: { _id: issue._id || issue.id },
        update: {
          $set: {
            currentRank: issue.currentRank,
            isActionedThisCycle: issue.isActionedThisCycle,
            status: issue.status,
          },
        },
      },
    }));

    if (bulkOps.length > 0) {
      await IssueModel.bulkWrite(bulkOps);
    }

    // Update cycle allocated totals
    const allocatedBudget = cycle.totalBudget - allocationResult.remainingBudget;
    const allocatedCrewHours = cycle.totalCrewHours - allocationResult.remainingCrewHours;
    await CycleModel.findByIdAndUpdate(cycle._id, { allocatedBudget, allocatedCrewHours });

    // Audit log
    await new AuditLogModel({
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      actionType: 'RESOURCE_REBALANCED',
      issueId: 'SYSTEM-OPTIMIZER',
      ticketNumber: 'SYS-OPT',
      issueTitle: 'Two-Stage Knapsack Allocation Executed',
      officerName: req.body.officerName || 'Administrative Controller',
      officerRole: 'admin',
      details: `Optimized ${cycle.cycleName}: Mandated Overrides = ₹${(allocationResult.overriddenBudget / 100000).toFixed(2)}L, AI Optimized = ₹${(allocationResult.aiOptimizedBudget / 100000).toFixed(2)}L. Selected ${allocationResult.allocated.length} total issues.`,
      metadata: {
        overriddenBudget: allocationResult.overriddenBudget,
        aiOptimizedBudget: allocationResult.aiOptimizedBudget,
        remainingBudget: allocationResult.remainingBudget,
      },
    }).save();

    return res.json({
      actionedCount: allocationResult.allocated.length,
      allocatedBudget,
      allocatedCrewHours,
      remainingBudget: allocationResult.remainingBudget,
      remainingCrewHours: allocationResult.remainingCrewHours,
      overriddenBudget: allocationResult.overriddenBudget,
      aiOptimizedBudget: allocationResult.aiOptimizedBudget,
    });
  } catch (err: any) {
    console.error('[POST /api/cycle/auto-fit]', err);
    return res.status(500).json({ error: 'Auto-fit failed.' });
  }
});

export const cycleRouter = router;
