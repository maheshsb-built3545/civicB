/**
 * Audit Log API Routes — Part 3
 *
 * GET /api/audit-logs — admin-only, full audit trail
 *
 * Fields returned match AuditLogEntry in types.ts exactly:
 *   id, timestamp, actionType, issueId, ticketNumber, issueTitle,
 *   officerName, officerRole, details, metadata
 * This matches what AuditLogTable.tsx renders without any prop-shape changes.
 */
import { Router, Request, Response } from 'express';
import { AuditLogModel } from './models/AuditLog';
import { requireAuth, requireRole } from './authMiddleware';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    // Most-recent first (matches AuditLogTable display order)
    const logs = await AuditLogModel.find({}).sort({ createdAt: -1 });

    // Map to the exact AuditLogEntry shape the frontend expects
    const formatted = logs.map((log) => ({
      id: log._id.toString(),
      timestamp: log.timestamp,
      actionType: log.actionType,
      issueId: log.issueId,
      ticketNumber: log.ticketNumber,
      issueTitle: log.issueTitle,
      officerName: log.officerName,
      officerRole: log.officerRole,
      details: log.details,
      metadata: log.metadata,
    }));

    return res.json({ logs: formatted });
  } catch (err: any) {
    console.error('[GET /api/audit-logs]', err);
    return res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

export const auditRouter = router;
