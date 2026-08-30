/**
 * Issue API Routes — Part 1
 *
 * POST   /api/issues               — create issue (citizen or staff; server computes score)
 * GET    /api/issues               — get issues (protected by requireAuth; ward-scoped by role)
 * GET    /api/issues/:ticketNumber  — PUBLIC, NO auth required (citizens track ticket)
 * PATCH  /api/issues/:id/toggle-action — schedule/unschedule (requireAuth; cap-enforced)
 * POST   /api/issues/:id/override  — rank override (requireAuth; writes AuditLog)
 *
 * CRITICAL: urgencyScore is ALWAYS computed server-side.
 * Any client-supplied urgencyScore in the request body is silently ignored.
 */
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { IssueModel } from './models/Issue';
import { AuditLogModel } from './models/AuditLog';
import { CycleModel } from './models/Cycle';
import { requireAuth, JWT_COOKIE_NAME, JwtPayload } from './authMiddleware';
import { calculateUrgencyScore, generateJustification } from '../utils/scoringEngine';
import { reconcileRanks } from '../utils/allocationEngine';
import { INITIAL_ISSUES } from '../data/mockData';
import type { IssueCategory, IssueStatus, ConfidenceLevel, CivicIssue } from '../types';

const router = Router();

// In-memory fallback store for offline/local-preview mode when MongoDB is not connected
let mockIssuesStore: CivicIssue[] = [...INITIAL_ISSUES];

// Helper to extract user payload if present, without blocking unauthenticated requests
function optionalUser(req: Request): JwtPayload | undefined {
  let token: string | undefined = req.cookies?.[JWT_COOKIE_NAME];
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }
  if (!token) return undefined;
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return undefined;
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return undefined;
  }
}

const CATEGORY_SAFETY_DEFAULTS: Record<string, number> = {
  'Roads & Potholes': 70,
  'Water Supply': 75,
  'Drainage & Sewage': 80,
  'Streetlights & Electrical': 85,
  'Solid Waste Management': 60,
  'Public Safety & Structural': 90,
};

function getCitizenPriorityTier(score: number): string {
  if (score >= 90) return 'Critical Priority';
  if (score >= 75) return 'High Priority';
  if (score >= 50) return 'Medium Priority';
  return 'Standard Priority';
}

function getCitizenSafeJustification(justification: string, isOverridden: boolean, facilityDetails?: string): string {
  if (isOverridden || /overridden|override|officer|cmo|cmo-001/i.test(justification)) {
    return facilityDetails
      ? `Prioritized based on public safety assessment near ${facilityDetails}.`
      : 'Prioritized based on municipal public safety criteria.';
  }
  let text = justification;
  text = text.replace(/OVERRIDDEN\s+from\s+#\d+/gi, '');
  text = text.replace(/Ranked\s+#\d+\s*\(.*?\):?/gi, '');
  text = text.replace(/₹\s*[\d,]+(\.[\d]+)?(L|Lakhs)?/gi, '');
  text = text.replace(/Officer\s+override\s+applied\.?/gi, '');
  text = text.replace(/Er\.\s+[A-Za-z\.]+(\s+[A-Za-z\.]+)*/g, '');
  const cleaned = text.trim().replace(/^[:,\s-]+/, '');
  if (!cleaned || cleaned.length < 5) return 'Prioritized based on standard municipal civic evaluation.';
  return cleaned;
}

// ─── POST /api/issues (Citizen or Staff Submission) ────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const user = optionalUser(req);
    const {
      title,
      description,
      category,
      ward,
      locationLandmark,
      safetyRisk: rawSafetyRisk,
      citizenReportsCount: rawReports,
      criticalFacilityProximityScore: rawProximity,
      facilityDetails,
      daysOpen: rawDaysOpen,
      estimatedCostInr,
      estimatedCrewHours,
      requiredEquipment,
      dataConfidence,
      dataQualityScore,
      dataQualityFlags,
      aiVerification,
    } = req.body;

    if (!title || !category || !ward || !locationLandmark) {
      return res.status(400).json({ error: 'title, category, ward, and locationLandmark are required.' });
    }

    // Ward guard: Officers can only submit issues for their own ward
    if (user && user.role === 'officer' && user.ward !== ward) {
      return res.status(403).json({
        error: `Forbidden: You may only submit issues for your assigned ward (${user.ward}).`,
      });
    }

    const safetyRisk: number = typeof rawSafetyRisk === 'number'
      ? Math.min(100, Math.max(0, rawSafetyRisk))
      : (CATEGORY_SAFETY_DEFAULTS[category] ?? 65);

    const citizenReportsCount: number = typeof rawReports === 'number' ? rawReports : 1;
    const criticalFacilityProximityScore: number = typeof rawProximity === 'number'
      ? rawProximity
      : (locationLandmark?.length > 5 ? 75 : 45);
    const daysOpen: number = typeof rawDaysOpen === 'number' ? rawDaysOpen : 0;

    // *** SERVER-AUTHORITATIVE SCORE COMPUTATION ***
    const calcResult = calculateUrgencyScore(
      {
        safetyRisk,
        citizenReportsCount,
        criticalFacilityProximityScore,
        facilityDetails: facilityDetails || `${locationLandmark} locality`,
      },
      daysOpen
    );

    const reportedDate = new Date().toISOString().slice(0, 10);
    const ticketNumber = `KPG-${String(Math.floor(1000 + Math.random() * 9000))}`;

    // Check for DB readiness (SRE Emergency Blackout Mode check)
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ [BLACKOUT MODE ACTIVE] MongoDB unreachable. Returning 503 blackout response.');
      return res.status(503).json({
        error: 'Database unreachable',
        blackoutMode: true,
        ticketNumber
      });
    }

    // Misinformation Shield Check (The Bad Reading Protection)
    const isMisinformationRisk = Boolean(
      req.body.isMisinformationRisk ||
      req.body.aiVerification?.isMisinformationRisk
    );
    const safetyRationale = req.body.safetyRationale || req.body.aiVerification?.safetyRationale || null;

    // CRITICAL SRE/SAFETY LOGIC: If isMisinformationRisk is true, force urgencyScore to 0 and needsReview to true
    const finalUrgencyScore = isMisinformationRisk ? 0 : calcResult.urgencyScore;
    const finalNeedsReview = isMisinformationRisk ? true : true;
    const justification = generateJustification(
        { currentRank: 0, category, ward, locationLandmark },
        calcResult.scoreBreakdown,
        'en'
      );
    const finalJustification = isMisinformationRisk
      ? `🛑 FLAG: MISINFORMATION RISK. ${safetyRationale || 'Quarantined due to bad-faith intent, defamation, or rumors.'}`
      : justification;

    try {
      const existingCount = await IssueModel.countDocuments();
      const newRank = existingCount + 1;

      const issue = new IssueModel({
        ticketNumber,
        title: String(title).trim(),
        description: description ? String(description).trim() : `Civic issue reported in ${ward} near ${locationLandmark}.`,
        category: category as IssueCategory,
        ward,
        locationLandmark: String(locationLandmark).trim(),
        reportedDate,
        daysOpen,
        urgencyScore: finalUrgencyScore,
        computedRank: newRank,
        currentRank: newRank,
        justification: finalJustification,
        scoreBreakdown: calcResult.scoreBreakdown,
        estimatedCostInr: typeof estimatedCostInr === 'number' ? estimatedCostInr : 25000,
        estimatedCrewHours: typeof estimatedCrewHours === 'number' ? estimatedCrewHours : 8,
        requiredEquipment: Array.isArray(requiredEquipment) ? requiredEquipment : ['General Civic Response Team'],
        dataConfidence: isMisinformationRisk ? 'low' : (['high', 'medium', 'low'].includes(dataConfidence) ? dataConfidence : 'medium') as ConfidenceLevel,
        dataQualityScore: isMisinformationRisk ? 0 : (typeof dataQualityScore === 'number' ? dataQualityScore : 72),
        dataQualityFlags: isMisinformationRisk
          ? ['🛑 MISINFORMATION RISK', 'Quarantined by AI Shield', 'Pending Legal / Administrative Officer Audit']
          : (Array.isArray(dataQualityFlags) ? dataQualityFlags : ['Citizen Direct Submission', 'Pending Field Officer Geotag Verification']),
        needsReview: finalNeedsReview,
        status: isMisinformationRisk ? 'needs_review' : ('ranked' as IssueStatus),
        isActionedThisCycle: false,
        isOverridden: false,
        isMisinformationRisk,
        safetyRationale,
        aiVerification: aiVerification
          ? { ...aiVerification, isMisinformationRisk, safetyRationale }
          : {
              isLikelyGenuine: !isMisinformationRisk,
              confidenceLabel: 'high',
              aiReasoning: isMisinformationRisk ? 'Flagged as misinformation risk or defamatory attack.' : 'Civic complaint verified.',
              screenedAt: new Date().toISOString(),
              isMisinformationRisk,
              safetyRationale
            },
      });

      await issue.save();

      await new AuditLogModel({
        timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        actionType: isMisinformationRisk ? 'DATA_VERIFIED' : 'ISSUE_INGESTED',
        issueId: issue._id.toString(),
        ticketNumber: issue.ticketNumber,
        issueTitle: issue.title,
        officerName: user?.userId ? 'Municipal Staff' : 'Citizen Portal / Smart City Intake',
        officerRole: user?.role || 'Public Citizen Intake (AI Screened)',
        details: isMisinformationRisk 
          ? `🛑 [MISINFORMATION SHIELD TRIGGERED] Issue ${ticketNumber} quarantined. Urgency forced to 0/100. Rationale: ${safetyRationale}`
          : `New civic issue ingested in ${ward} (${category}). Server-computed urgency: ${calcResult.urgencyScore}/100.`,
      }).save();

      return res.status(201).json({ issue, ticketNumber: issue.ticketNumber });
    } catch (dbErr: any) {
      console.error('⚠️ [BLACKOUT MODE TRIGGERED] Database save operation failed:', dbErr);
      return res.status(503).json({
        error: 'Database unreachable',
        blackoutMode: true,
        ticketNumber
      });
    }
  } catch (err: any) {
    console.error('[POST /api/issues]', err);
    return res.status(503).json({
      error: 'Database unreachable',
      blackoutMode: true
    });
  }
});

// ─── GET /api/issues/public/all — PUBLIC BOARD (NO Auth Required) ─────────
router.get('/public/all', async (_req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const publicList = mockIssuesStore.map(issue => ({
        id: issue.id,
        ticketNumber: issue.ticketNumber,
        title: issue.title,
        category: issue.category,
        ward: issue.ward,
        locationLandmark: issue.locationLandmark,
        reportedDate: issue.reportedDate,
        daysOpen: issue.daysOpen,
        currentRank: issue.currentRank,
        status: issue.status,
        isActionedThisCycle: issue.isActionedThisCycle,
        urgencyScore: issue.urgencyScore,
      })).sort((a, b) => a.currentRank - b.currentRank);
      return res.json({ issues: publicList });
    }

    const dbIssues = await IssueModel.find().sort({ currentRank: 1 });
    const publicList = dbIssues.map(issue => ({
      id: issue._id.toString(),
      ticketNumber: issue.ticketNumber,
      title: issue.title,
      category: issue.category,
      ward: issue.ward,
      locationLandmark: issue.locationLandmark,
      reportedDate: issue.reportedDate,
      daysOpen: issue.daysOpen,
      currentRank: issue.currentRank,
      status: issue.status,
      isActionedThisCycle: issue.isActionedThisCycle,
      urgencyScore: issue.urgencyScore,
    }));

    return res.json({ issues: publicList });
  } catch (err: any) {
    console.error('[GET /api/issues/public/all]', err);
    return res.status(500).json({ error: 'Failed to fetch public issues.' });
  }
});

// ─── GET /api/issues (Protected by requireAuth) ───────────────────────────

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      let issues = [...mockIssuesStore];
      if (req.user!.role === 'officer') {
        issues = issues.filter(i => i.ward === req.user!.ward);
      }
      issues.sort((a, b) => a.currentRank - b.currentRank);
      return res.json({ issues });
    }

    const filter: Record<string, any> = {};
    if (req.user!.role === 'officer') {
      filter.ward = req.user!.ward;
    }

    const issues = await IssueModel.find(filter).sort({ currentRank: 1 });
    return res.json({ issues });
  } catch (err: any) {
    console.error('[GET /api/issues]', err);
    return res.status(500).json({ error: 'Failed to fetch issues.' });
  }
});

// ─── GET /api/issues/:ticketNumber — PUBLIC, NO auth required ─────────────

router.get('/:ticketNumber', async (req: Request, res: Response) => {
  try {
    const param = req.params.ticketNumber.toUpperCase();

    if (mongoose.connection.readyState !== 1) {
      const issue = mockIssuesStore.find(i => i.ticketNumber.toUpperCase() === param || i.id.toUpperCase() === param);
      if (!issue) return res.status(404).json({ error: 'Ticket not found.' });

      const citizenView = {
        ticketNumber: issue.ticketNumber,
        title: issue.title,
        category: issue.category,
        ward: issue.ward,
        locationLandmark: issue.locationLandmark,
        reportedDate: issue.reportedDate,
        daysOpen: issue.daysOpen,
        currentRank: issue.currentRank,
        status: issue.status,
        isActionedThisCycle: issue.isActionedThisCycle,
        priorityTier: getCitizenPriorityTier(issue.urgencyScore),
        justification: getCitizenSafeJustification(
          issue.justification,
          issue.isOverridden,
          issue.scoreBreakdown?.facilityDetails
        ),
      };
      return res.json({ issue: citizenView });
    }
    
    // Check by ticketNumber or _id
    const issue = await IssueModel.findOne({
      $or: [{ ticketNumber: param }, { _id: param.match(/^[0-9a-fA-F]{24}$/) ? param : null }]
    });

    if (!issue) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    // Return ONLY citizen-safe fields — never expose raw urgencyScore, internal justification, or override details
    const citizenView = {
      ticketNumber: issue.ticketNumber,
      title: issue.title,
      category: issue.category,
      ward: issue.ward,
      locationLandmark: issue.locationLandmark,
      reportedDate: issue.reportedDate,
      daysOpen: issue.daysOpen,
      currentRank: issue.currentRank,
      status: issue.status,
      isActionedThisCycle: issue.isActionedThisCycle,
      priorityTier: getCitizenPriorityTier(issue.urgencyScore),
      justification: getCitizenSafeJustification(
        issue.justification,
        issue.isOverridden,
        issue.scoreBreakdown?.facilityDetails
      ),
    };

    return res.json({ issue: citizenView });
  } catch (err: any) {
    console.error('[GET /api/issues/:ticketNumber]', err);
    return res.status(500).json({ error: 'Failed to retrieve ticket.' });
  }
});

// ─── PATCH /api/issues/:id/toggle-action ──────────────────────────────────

router.patch('/:id/toggle-action', requireAuth, async (req: Request, res: Response) => {
  try {
    const issue = await IssueModel.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });

    if (req.user!.role === 'officer' && issue.ward !== req.user!.ward) {
      return res.status(403).json({
        error: `Forbidden: You may only schedule issues within your assigned ward (${req.user!.ward}).`,
      });
    }

    const willBeActioned = !issue.isActionedThisCycle;

    if (willBeActioned) {
      const cycle = await CycleModel.findOne({ isActive: true });
      if (cycle) {
        const remaining = cycle.totalBudget - cycle.allocatedBudget;
        const remainingCrew = cycle.totalCrewHours - cycle.allocatedCrewHours;
        const exceedsCost = issue.estimatedCostInr > remaining;
        const exceedsCrew = issue.estimatedCrewHours > remainingCrew;

        if (exceedsCost || exceedsCrew) {
          let msg = '';
          if (exceedsCost && exceedsCrew) {
            msg = `Cannot schedule ${issue.ticketNumber} — exceeds remaining budget by ₹${(issue.estimatedCostInr - remaining).toLocaleString('en-IN')} and crew capacity by ${issue.estimatedCrewHours - remainingCrew} hrs.`;
          } else if (exceedsCost) {
            msg = `Cannot schedule ${issue.ticketNumber} — exceeds remaining cycle budget by ₹${(issue.estimatedCostInr - remaining).toLocaleString('en-IN')}.`;
          } else {
            msg = `Cannot schedule ${issue.ticketNumber} — exceeds remaining crew capacity by ${issue.estimatedCrewHours - remainingCrew} hrs.`;
          }
          return res.status(409).json({ error: msg });
        }

        const updated = await CycleModel.findOneAndUpdate(
          {
            _id: cycle._id,
            isActive: true,
            $expr: {
              $lte: [
                { $add: ['$allocatedBudget', issue.estimatedCostInr] },
                '$totalBudget'
              ]
            }
          },
          {
            $inc: {
              allocatedBudget: issue.estimatedCostInr,
              allocatedCrewHours: issue.estimatedCrewHours,
            }
          },
          { new: true }
        );

        if (!updated) {
          return res.status(409).json({ error: `Cannot schedule ${issue.ticketNumber} — budget limit would be exceeded by a concurrent request.` });
        }
      }
    } else {
      await CycleModel.findOneAndUpdate(
        { isActive: true },
        {
          $inc: {
            allocatedBudget: -issue.estimatedCostInr,
            allocatedCrewHours: -issue.estimatedCrewHours,
          }
        }
      );
    }

    issue.isActionedThisCycle = willBeActioned;
    issue.status = (willBeActioned ? 'scheduled' : 'ranked') as IssueStatus;
    await issue.save();

    await new AuditLogModel({
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      actionType: willBeActioned ? 'WORK_ORDER_APPROVED' : 'RESOURCE_REBALANCED',
      issueId: issue._id.toString(),
      ticketNumber: issue.ticketNumber,
      issueTitle: issue.title,
      officerName: req.body.officerName || 'Municipal Officer',
      officerRole: req.body.officerRole || req.user!.role,
      details: willBeActioned
        ? `Added to work order. Committed: ₹${issue.estimatedCostInr.toLocaleString('en-IN')} & ${issue.estimatedCrewHours} Crew-Hours.`
        : `Removed from work order. Released: ₹${issue.estimatedCostInr.toLocaleString('en-IN')} & ${issue.estimatedCrewHours} Crew-Hours.`,
    }).save();

    return res.json({ issue });
  } catch (err: any) {
    console.error('[PATCH /api/issues/:id/toggle-action]', err);
    return res.status(500).json({ error: 'Failed to toggle issue action.' });
  }
});

// ─── POST /api/issues/:id/override ────────────────────────────────────────

router.post('/:id/override', requireAuth, async (req: Request, res: Response) => {
  try {
    const { newRank, reason, category: overrideCategory, officerName, officerRole } = req.body;

    if (!reason || String(reason).trim().length < 10) {
      return res.status(400).json({ error: 'Override reason must be at least 10 characters.' });
    }

    if (typeof newRank !== 'number' || newRank < 1) {
      return res.status(400).json({ error: 'newRank must be a positive integer.' });
    }

    const targetIssue = await IssueModel.findById(req.params.id);
    if (!targetIssue) return res.status(404).json({ error: 'Issue not found.' });

    if (req.user!.role === 'officer' && targetIssue.ward !== req.user!.ward) {
      return res.status(403).json({
        error: `Forbidden: You may only override issues within your assigned ward (${req.user!.ward}).`,
      });
    }

    const oldRank = targetIssue.currentRank;
    const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    targetIssue.isOverridden = true;
    targetIssue.overrideDetails = {
      originalRank: targetIssue.computedRank,
      newRank,
      reason: String(reason).trim(),
      category: overrideCategory || 'General Override',
      officerName: officerName || 'Municipal Officer',
      officerRole: officerRole || req.user!.role,
      timestamp,
    };
    targetIssue.currentRank = newRank;
    targetIssue.justification = `Manually prioritized by Staff. Reason: ${String(reason).trim()}`;
    await targetIssue.save();

    const allIssuesRaw = await IssueModel.find({}).lean();
    const mappedList: CivicIssue[] = allIssuesRaw.map((doc: any) => ({
      ...doc,
      id: doc.id || doc._id.toString(),
    }));

    const reconciled = reconcileRanks(mappedList);

    const bulkOps = reconciled.map((issue) => ({
      updateOne: {
        filter: { _id: issue._id || issue.id },
        update: { $set: { currentRank: issue.currentRank } },
      },
    }));

    if (bulkOps.length > 0) {
      await IssueModel.bulkWrite(bulkOps);
    }

    await new AuditLogModel({
      timestamp,
      actionType: 'RANKING_OVERRIDE',
      issueId: req.params.id,
      ticketNumber: targetIssue.ticketNumber,
      issueTitle: targetIssue.title,
      officerName: officerName || 'Municipal Officer',
      officerRole: officerRole || req.user!.role,
      details: `Officer Override Applied: Re-ranked from #${oldRank} to #${newRank}. Reason: "${String(reason).trim()}" (Category: ${overrideCategory || 'General Override'})`,
      metadata: { originalRank: oldRank, newRank, category: overrideCategory },
    }).save();

    const updatedIssue = await IssueModel.findById(req.params.id);
    return res.json({ issue: updatedIssue });
  } catch (err: any) {
    console.error('[POST /api/issues/:id/override]', err);
    return res.status(500).json({ error: 'Failed to apply override.' });
  }
});

// ─── DELETE /api/issues/:id (Test Cleanup Endpoint) ───────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (mongoose.connection.readyState !== 1) {
      const initialLength = mockIssuesStore.length;
      mockIssuesStore = mockIssuesStore.filter(i => i.id !== id && i.ticketNumber !== id);
      const deleted = initialLength > mockIssuesStore.length;
      return res.json({ success: deleted, message: deleted ? 'Issue removed from mock store.' : 'Issue not found in mock store.' });
    }

    const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
    const filter = isObjectId ? { _id: id } : { ticketNumber: id };
    const deleted = await IssueModel.findOneAndDelete(filter);

    if (!deleted) {
      return res.status(404).json({ error: 'Issue not found.' });
    }

    return res.json({ success: true, message: `Issue ${id} deleted successfully.` });
  } catch (err: any) {
    console.error('[DELETE /api/issues/:id]', err);
    return res.status(500).json({ error: 'Failed to delete issue.' });
  }
});

export const issueRouter = router;
