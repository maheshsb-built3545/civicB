/**
 * Allocation Engine & Rank Reconciliation Utility
 *
 * Implements the "Golden Rule of Governance" (Two-Stage Knapsack Allocation):
 * - Stage 1 (Mandates): Extract all isOverridden === true issues. Automatically allocate
 *   them in manual rank order, deducting cost/crew hours from the cycle totals.
 * - Stage 2 (Optimization): Pass remaining non-overridden issues into the Knapsack
 *   optimizer against the remaining budget and crew hours.
 * - Stage 3 (Merge): Return allocated, deferred, and breakdown metrics.
 *
 * Rank Reconciliation:
 * Ensures no two issues share the exact same rank number (1..N), placing overridden
 * issues at their requested manual ranks and shifting non-overridden issues down.
 */

import { CivicIssue } from '../types';

export interface AllocationResult {
  allocated: CivicIssue[];
  deferred: CivicIssue[];
  allReconciledIssues: CivicIssue[];
  remainingBudget: number;
  remainingCrewHours: number;
  overriddenBudget: number;
  overriddenCrewHours: number;
  aiOptimizedBudget: number;
  aiOptimizedCrewHours: number;
  mandateOverBudgetWarning?: boolean;
}

/**
 * Reconciles ranks across all issues so that no two issues share the exact same rank number.
 * Overridden issues take precedence based on their assigned manual rank.
 * Non-overridden issues follow, sorted strictly by urgencyScore (descending).
 * Reassigns currentRank = 1, 2, 3, ... N sequentially.
 */
export function reconcileRanks(issues: CivicIssue[]): CivicIssue[] {
  if (!issues || issues.length === 0) return [];

  // Deep copy to prevent unintended mutations
  const cloneList = issues.map((item) => ({ ...item }));

  // Separate overridden and non-overridden issues
  const overridden = cloneList.filter((i) => i.isOverridden);
  const nonOverridden = cloneList.filter((i) => !i.isOverridden);

  // Sort overridden issues by their target manual rank
  overridden.sort((a, b) => {
    const rankA = a.overrideDetails?.newRank ?? a.currentRank ?? 1;
    const rankB = b.overrideDetails?.newRank ?? b.currentRank ?? 1;
    return rankA - rankB;
  });

  // Sort non-overridden issues strictly by urgencyScore descending (or computedRank ascending)
  nonOverridden.sort((a, b) => {
    if (b.urgencyScore !== a.urgencyScore) {
      return b.urgencyScore - a.urgencyScore;
    }
    return a.computedRank - b.computedRank;
  });

  // Interleave / reconcile into a single array with 1-based sequential ranks
  const reconciled: CivicIssue[] = [];
  let overriddenIdx = 0;
  let nonOverriddenIdx = 0;
  const totalCount = cloneList.length;

  for (let rank = 1; rank <= totalCount; rank++) {
    // Check if there is an overridden issue targeting this specific rank
    const targetOverridden = overridden.find(
      (item) => (item.overrideDetails?.newRank ?? item.currentRank) === rank
    );

    if (targetOverridden && !reconciled.some((r) => r.id === targetOverridden.id)) {
      targetOverridden.currentRank = rank;
      reconciled.push(targetOverridden);
    } else if (overriddenIdx < overridden.length && !reconciled.some((r) => r.id === overridden[overriddenIdx].id)) {
      // Pick the next unplaced overridden if its desired rank is <= current rank slot
      const nextOverridden = overridden[overriddenIdx];
      const desiredRank = nextOverridden.overrideDetails?.newRank ?? nextOverridden.currentRank;
      if (desiredRank <= rank) {
        nextOverridden.currentRank = rank;
        reconciled.push(nextOverridden);
        overriddenIdx++;
      } else if (nonOverriddenIdx < nonOverridden.length) {
        const nextNormal = nonOverridden[nonOverriddenIdx];
        nextNormal.currentRank = rank;
        reconciled.push(nextNormal);
        nonOverriddenIdx++;
      }
    } else if (nonOverriddenIdx < nonOverridden.length) {
      const nextNormal = nonOverridden[nonOverriddenIdx];
      nextNormal.currentRank = rank;
      reconciled.push(nextNormal);
      nonOverriddenIdx++;
    }
  }

  // Ensure any leftover issues are appended with strict 1-based sequential index
  const placedIds = new Set(reconciled.map((i) => i.id));
  const unplaced = cloneList.filter((i) => !placedIds.has(i.id));
  unplaced.forEach((item) => {
    reconciled.push(item);
  });

  // Final 1..N index assignment to guarantee 0 collisions
  reconciled.forEach((item, index) => {
    item.currentRank = index + 1;
  });

  return reconciled;
}

/**
 * Two-Stage Allocation Engine:
 * Stage 1 (Mandates): Extract all isOverridden === true issues. Automatically allocate
 *   what fits in manual rank order, deducting cost/hours from total budget.
 * Stage 2 (Optimization): Pass remaining non-overridden issues into 0/1 optimization
 *   against remaining budget and crew hours.
 * Stage 3 (Merge): Return allocated, deferred, and breakdown metrics.
 */
export function calculateOptimalAllocation(
  issues: CivicIssue[],
  totalBudget: number,
  totalCrewHours: number
): AllocationResult {
  const reconciled = reconcileRanks(issues);

  let remainingBudget = totalBudget;
  let remainingCrewHours = totalCrewHours;

  let overriddenBudget = 0;
  let overriddenCrewHours = 0;
  let aiOptimizedBudget = 0;
  let aiOptimizedCrewHours = 0;

  const allocated: CivicIssue[] = [];
  const deferred: CivicIssue[] = [];
  let mandateOverBudgetWarning = false;

  // Separate into Overridden Mandates vs Standard Issues
  const mandates = reconciled.filter((i) => i.isOverridden);
  const nonOverridden = reconciled.filter((i) => !i.isOverridden);

  // STAGE 1: Process Mandates (Human Overrides)
  for (const issue of mandates) {
    if (issue.needsReview) {
      deferred.push({
        ...issue,
        isActionedThisCycle: false,
        status: 'needs_review',
      });
      continue;
    }

    if (
      issue.estimatedCostInr <= remainingBudget &&
      issue.estimatedCrewHours <= remainingCrewHours
    ) {
      remainingBudget -= issue.estimatedCostInr;
      remainingCrewHours -= issue.estimatedCrewHours;
      overriddenBudget += issue.estimatedCostInr;
      overriddenCrewHours += issue.estimatedCrewHours;

      allocated.push({
        ...issue,
        isActionedThisCycle: true,
        status: 'scheduled',
      });
    } else {
      mandateOverBudgetWarning = true;
      console.warn(
        `[Stage 1 Mandate Over-Budget Warning] Overridden mandate ${issue.ticketNumber} (#${issue.currentRank}) exceeds remaining limits (Cost: ₹${issue.estimatedCostInr}, Rem: ₹${remainingBudget}). Deferring.`
      );

      deferred.push({
        ...issue,
        isActionedThisCycle: false,
        status: 'ranked',
      });
    }
  }

  // STAGE 2: Process AI-Ranked Standard Issues
  for (const issue of nonOverridden) {
    if (issue.needsReview) {
      deferred.push({
        ...issue,
        isActionedThisCycle: false,
        status: 'needs_review',
      });
      continue;
    }

    if (
      issue.estimatedCostInr <= remainingBudget &&
      issue.estimatedCrewHours <= remainingCrewHours
    ) {
      remainingBudget -= issue.estimatedCostInr;
      remainingCrewHours -= issue.estimatedCrewHours;
      aiOptimizedBudget += issue.estimatedCostInr;
      aiOptimizedCrewHours += issue.estimatedCrewHours;

      allocated.push({
        ...issue,
        isActionedThisCycle: true,
        status: 'scheduled',
      });
    } else {
      deferred.push({
        ...issue,
        isActionedThisCycle: false,
        status: 'ranked',
      });
    }
  }

  // STAGE 3: Merge & Build Reconciled Final List
  const allocatedMap = new Map(allocated.map((item) => [item.id, item]));
  const deferredMap = new Map(deferred.map((item) => [item.id, item]));

  const allReconciledIssues = reconciled.map((item) => {
    if (allocatedMap.has(item.id)) return allocatedMap.get(item.id)!;
    if (deferredMap.has(item.id)) return deferredMap.get(item.id)!;
    return item;
  });

  return {
    allocated,
    deferred,
    allReconciledIssues,
    remainingBudget,
    remainingCrewHours,
    overriddenBudget,
    overriddenCrewHours,
    aiOptimizedBudget,
    aiOptimizedCrewHours,
    mandateOverBudgetWarning,
  };
}
