export type IssueCategory = 
  | 'Roads & Potholes'
  | 'Water Supply'
  | 'Drainage & Sewage'
  | 'Streetlights & Electrical'
  | 'Solid Waste Management'
  | 'Public Safety & Structural';

export type IssueStatus = 
  | 'ranked'
  | 'scheduled'
  | 'in_progress'
  | 'resolved'
  | 'needs_review';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ScoreBreakdown {
  safetyRisk: number; // 0-100 (Weight: 35%)
  citizenReportsCount: number; // raw count
  citizenDensityScore: number; // 0-100 (Weight: 25%)
  daysOpen: number; // days unresolved
  agingScore: number; // 0-100 (Weight: 20%)
  criticalFacilityProximityScore: number; // 0-100 (Weight: 20%) - Near schools, hospitals, transit
  facilityDetails?: string;
  tieBreakerApplied?: boolean;
  tieBreakerReason?: string;
}

export interface CivicIssue {
  _id?: any;
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: IssueCategory;
  ward: string; // e.g. "Ward 3 - Shivaji Chowk"
  locationLandmark: string;
  coordinates?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
  reportedDate: string;
  daysOpen: number;
  
  // Algorithmic Decision Support Metrics
  urgencyScore: number; // 0-100 computed composite
  computedRank: number; // Original algorithmic rank
  currentRank: number; // Current active rank (may differ if overridden)
  justification: string; // Plain-English human-readable rationale
  scoreBreakdown: ScoreBreakdown;
  
  // Resource Requirements
  estimatedCostInr: number; // in Rupees
  estimatedCrewHours: number; // hours of labor required
  requiredEquipment: string[]; // e.g., ["Jetting Truck", "Asphalt Patch Unit"]
  
  // Data Quality & Verification
  dataConfidence: ConfidenceLevel; // 'high' | 'medium' | 'low'
  dataQualityScore: number; // 0 - 100 percentage
  dataQualityFlags: string[]; // e.g., ["Missing GPS Geotag", "No photo attached", "Duplicate suspected"]
  needsReview: boolean;
  
  // Workflow & Status
  status: IssueStatus;
  isActionedThisCycle: boolean; // Selected in current resource sprint
  
  // Override Data (if overridden by municipal officer)
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

  // AI-Powered Spam/Validity Screening for Citizen Submissions
  aiVerification?: {
    isLikelyGenuine: boolean;
    confidenceLabel: 'high' | 'medium' | 'low';
    aiReasoning: string;
    screenedAt: string; // ISO timestamp
  };
}

export interface ResourceLedgerState {
  cycleName: string; // e.g. "Fortnight Sprint #14 (Aug 15 - Aug 31)"
  cycleDaysRemaining: number;
  totalBudgetInr: number;
  totalCrewHours: number;
  allocatedBudgetInr: number;
  allocatedCrewHours: number;
  availableEquipment: {
    name: string;
    total: number;
    inUse: number;
  }[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actionType: 'RANKING_OVERRIDE' | 'WORK_ORDER_APPROVED' | 'DATA_VERIFIED' | 'ISSUE_INGESTED' | 'RESOURCE_REBALANCED';
  issueId: string;
  ticketNumber: string;
  issueTitle: string;
  officerName: string;
  officerRole: string;
  details: string;
  metadata?: Record<string, unknown>;
}

export interface FilterState {
  searchQuery: string;
  category: string;
  ward: string;
  minUrgency: number;
  showNeedsReviewOnly: boolean;
  showScheduledOnly: boolean;
  showOverriddenOnly: boolean;
}

export type UserRole = 'admin' | 'officer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  roleTitleMr?: string;
  ward: string; // e.g. "Ward 3 - Shivaji Chowk & Main Market" for officers, "All Wards" for admins
  department: string;
  badgeNumber: string;
}

export interface BudgetSettings {
  totalBudget: number;
  totalCrewHours: number;
  cycleStartDate: string;
  cycleEndDate: string;
  cycleName: string;
}

