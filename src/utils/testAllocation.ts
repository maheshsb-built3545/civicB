import { calculateOptimalAllocation, reconcileRanks } from './allocationEngine';
import { CivicIssue } from '../types';

const issueA: CivicIssue = {
  id: 'ISSUE-A',
  ticketNumber: 'KPG-9999',
  title: 'Critical Pothole (High AI Score)',
  description: 'High AI score issue',
  category: 'Roads & Potholes',
  ward: 'Ward 1 - Gandhi Market & Old City',
  locationLandmark: 'Main Market',
  coordinates: { lat: 19.8887, lng: 74.4756 },
  reportedDate: '2026-08-20',
  daysOpen: 5,
  urgencyScore: 99,
  computedRank: 1,
  currentRank: 1,
  justification: 'AI Score 99',
  scoreBreakdown: {
    safetyRisk: 99,
    citizenReportsCount: 20,
    citizenDensityScore: 90,
    daysOpen: 5,
    agingScore: 80,
    criticalFacilityProximityScore: 90,
  },
  estimatedCostInr: 80000, // ₹80,000
  estimatedCrewHours: 20,
  requiredEquipment: [],
  dataConfidence: 'high',
  dataQualityScore: 95,
  dataQualityFlags: [],
  needsReview: false,
  status: 'ranked',
  isActionedThisCycle: false,
  isOverridden: false, // NOT OVERRIDDEN
};

const issueB: CivicIssue = {
  id: 'ISSUE-B',
  ticketNumber: 'KPG-4444',
  title: 'Minor Streetlight Outage (Overridden to Rank 1)',
  description: 'Overridden issue by Admin',
  category: 'Streetlights & Electrical',
  ward: 'Ward 2 - Kalika Nagar & Temple Zone',
  locationLandmark: 'Temple Gate',
  coordinates: { lat: 19.8890, lng: 74.4760 },
  reportedDate: '2026-08-25',
  daysOpen: 2,
  urgencyScore: 40,
  computedRank: 5,
  currentRank: 1,
  justification: 'Manually prioritized by Staff. Reason: Political request for temple festival',
  scoreBreakdown: {
    safetyRisk: 40,
    citizenReportsCount: 2,
    citizenDensityScore: 30,
    daysOpen: 2,
    agingScore: 20,
    criticalFacilityProximityScore: 40,
  },
  estimatedCostInr: 90000, // ₹90,000
  estimatedCrewHours: 30,
  requiredEquipment: [],
  dataConfidence: 'high',
  dataQualityScore: 90,
  dataQualityFlags: [],
  needsReview: false,
  status: 'ranked',
  isActionedThisCycle: false,
  isOverridden: true, // MANUALLY OVERRIDDEN
  overrideDetails: {
    originalRank: 5,
    newRank: 1,
    reason: 'Political request for temple festival',
    category: 'VIP Request',
    officerName: 'Chief Administrator',
    officerRole: 'admin',
    timestamp: '2026-08-30 10:00 AM',
  },
};

function runTest() {
  console.log('='.repeat(80));
  console.log('PILLAR 4: TWO-STAGE KNAPSACK ALLOCATION & RANK RECONCILIATION TEST');
  console.log('='.repeat(80));

  const totalBudget = 100000; // ₹1,00,000 Total Budget
  const totalCrewHours = 100;

  console.log(`\nInitial Setup:`);
  console.log(`- Total Budget: ₹${totalBudget.toLocaleString('en-IN')}`);
  console.log(`- Issue A (AI Score 99, Cost ₹80,000, NOT overridden)`);
  console.log(`- Issue B (AI Score 40, Cost ₹90,000, OVERRIDDEN to Rank 1)`);

  const result = calculateOptimalAllocation([issueA, issueB], totalBudget, totalCrewHours);

  console.log('\nResult Summary:');
  console.log(`- Total Allocated Count: ${result.allocated.length}`);
  console.log(`- Total Deferred Count: ${result.deferred.length}`);
  console.log(`- Overridden Mandate Budget: ₹${result.overriddenBudget.toLocaleString('en-IN')}`);
  console.log(`- AI Optimized Budget: ₹${result.aiOptimizedBudget.toLocaleString('en-IN')}`);
  console.log(`- Remaining Budget: ₹${result.remainingBudget.toLocaleString('en-IN')}`);

  console.log('\nAllocated Issues:');
  result.allocated.forEach((item) => {
    console.log(`  ✅ [ALLOCATED] ${item.ticketNumber} (#${item.currentRank}) - Score: ${item.urgencyScore}, Cost: ₹${item.estimatedCostInr.toLocaleString('en-IN')}, Overridden: ${item.isOverridden}`);
  });

  console.log('\nDeferred Issues:');
  result.deferred.forEach((item) => {
    console.log(`  ⏳ [DEFERRED]  ${item.ticketNumber} (#${item.currentRank}) - Score: ${item.urgencyScore}, Cost: ₹${item.estimatedCostInr.toLocaleString('en-IN')}, Overridden: ${item.isOverridden}`);
  });

  console.log('\nReconciled Final Ranks:');
  result.allReconciledIssues.forEach((item) => {
    console.log(`  Rank #${item.currentRank}: ${item.ticketNumber} (${item.title})`);
  });

  // VERIFICATION CHECKS
  const isBAllocated = result.allocated.some((i) => i.id === 'ISSUE-B');
  const isADeferred = result.deferred.some((i) => i.id === 'ISSUE-A');
  const ranks = result.allReconciledIssues.map((i) => i.currentRank);
  const hasNoDuplicates = new Set(ranks).size === ranks.length;

  console.log('\n' + '-'.repeat(80));
  console.log('VERIFICATION ASSERTIONS:');
  console.log(`1. Overridden Issue B (Score 40, ₹90k) is ALLOCATED in Stage 1: ${isBAllocated ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`2. High Score Issue A (Score 99, ₹80k) is DEFERRED due to budget cap: ${isADeferred ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`3. Ranks are 1..N with NO DUPLICATES: ${hasNoDuplicates ? '✅ PASSED' : '❌ FAILED'} (Ranks: ${JSON.stringify(ranks)})`);
  console.log('-'.repeat(80));

  if (isBAllocated && isADeferred && hasNoDuplicates) {
    console.log('\n🎉 ALL PILLAR 4 EDGE CASE TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('\n❌ TEST FAILED!');
    process.exit(1);
  }
}

runTest();
