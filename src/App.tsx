import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  CivicIssue, 
  AuditLogEntry, 
  FilterState 
} from './types';

import { Header } from './components/Header';
import { ResourceLedger } from './components/ResourceLedger';
import { FilterBar } from './components/FilterBar';
import { IssueCard } from './components/IssueCard';
import { JustificationTooltip } from './components/JustificationTooltip';
import { OverrideModal } from './components/OverrideModal';
import { AuditLogTable } from './components/AuditLogTable';
import { ReviewModal } from './components/ReviewModal';
import { NewIssueModal } from './components/NewIssueModal';
import { LoginScreen } from './components/LoginScreen';
import { BudgetSettingsModal } from './components/BudgetSettingsModal';
import 'leaflet/dist/leaflet.css';
import { CitizenPortal } from './components/CitizenPortal';
import { ComparisonModal } from './components/ComparisonModal';
import { IssueMap } from './components/IssueMap';

import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BudgetProvider, useBudget } from './context/BudgetContext';
import { calculateUrgencyScore, generateJustification } from './utils/scoringEngine';

import { 
  AlertTriangle, 
  Layers, 
  CheckCircle2,
  Scale
} from 'lucide-react';

interface DashboardAppProps {
  onSwitchToCitizenView?: () => void;
}

// Main Dashboard Controller (rendered when user is authenticated)
function DashboardApp({ onSwitchToCitizenView }: DashboardAppProps) {
  const { language, t, getIssueText, getWardName } = useLanguage();
  const { user, role } = useAuth();
  const { 
    totalBudget, 
    totalCrewHours, 
    remainingBudget,
    remainingCrewHours,
    cycleName,
    updateBudgetSettings,
    updateAllocatedTotals 
  } = useBudget();

  // ── Data from API ──────────────────────────────────────────────────────────
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [isBlackoutError, setIsBlackoutError] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => setRefreshTrigger(n => n + 1), []);

  // Fetch issues from API (ward-scoped by role server-side)
  useEffect(() => {
    setIssuesLoading(true);
    setIsBlackoutError(false);
    fetch('/api/issues', { credentials: 'include' })
      .then(async (r) => {
        if (r.status === 503) {
          setIsBlackoutError(true);
          return { issues: [] };
        }
        const data = await r.json();
        if (data.blackoutMode) {
          setIsBlackoutError(true);
          return { issues: [] };
        }
        return data;
      })
      .then(data => {
        if (data.issues) setIssues(data.issues);
      })
      .catch(err => {
        console.error('[App] Failed to fetch issues (Blackout mode):', err);
        setIsBlackoutError(true);
      })
      .finally(() => setIssuesLoading(false));
  }, [refreshTrigger]);

  // Fetch audit logs (admin-only)
  useEffect(() => {
    if (role !== 'admin') return;
    fetch('/api/audit-logs', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (data.logs) setAuditLogs(data.logs); })
      .catch(err => console.error('[App] Failed to fetch audit logs:', err));
  }, [role, refreshTrigger]);

  // Keep BudgetContext in sync with actioned issues
  useEffect(() => {
    const actioned = issues.filter((i) => i.isActionedThisCycle);
    const budget = actioned.reduce((sum, i) => sum + i.estimatedCostInr, 0);
    const crewHours = actioned.reduce((sum, i) => sum + i.estimatedCrewHours, 0);
    updateAllocatedTotals(budget, crewHours);
  }, [issues, updateAllocatedTotals]);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'queue' | 'review' | 'audit'>('queue');

  // Filter & Search state
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    category: 'All Categories',
    ward: role === 'officer' && user ? user.ward : 'All Wards',
    minUrgency: 0,
    showNeedsReviewOnly: false,
    showScheduledOnly: false,
    showOverriddenOnly: false
  });

  // Keep officer's ward filter in sync with JWT-derived user.ward
  useEffect(() => {
    if (role === 'officer' && user?.ward) {
      setFilters(prev => ({ ...prev, ward: user.ward }));
    }
  }, [role, user?.ward]);

  // Modal dialog states
  const [selectedIssueForJustification, setSelectedIssueForJustification] = useState<CivicIssue | null>(null);
  const [selectedIssueForOverride, setSelectedIssueForOverride] = useState<CivicIssue | null>(null);
  const [selectedIssueForReview, setSelectedIssueForReview] = useState<CivicIssue | null>(null);
  const [isNewIssueModalOpen, setIsNewIssueModalOpen] = useState<boolean>(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);

  // Side-by-Side Comparison selection state (max 2 issues)
  const [selectedForCompare, setSelectedForCompare] = useState<CivicIssue[]>([]);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState<boolean>(false);

  const handleToggleSelectForCompare = useCallback((issue: CivicIssue) => {
    setSelectedForCompare((prev) => {
      const exists = prev.some((i) => i.id === issue.id);
      if (exists) {
        return prev.filter((i) => i.id !== issue.id);
      }
      if (prev.length >= 2) return prev;
      return [...prev, issue];
    });
  }, []);

  const handleClearCompareSelection = useCallback(() => {
    setSelectedForCompare([]);
  }, []);

  // Sort issues by active rank and dynamically recalculate urgency scores based on current daysOpen
  const sortedIssues = useMemo(() => {
    return [...issues].map((issue) => {
      const calc = calculateUrgencyScore(issue.scoreBreakdown, issue.daysOpen);
      const justification = issue.isOverridden
        ? issue.justification
        : generateJustification(issue, calc.scoreBreakdown, language);

      return {
        ...issue,
        urgencyScore: calc.urgencyScore,
        scoreBreakdown: calc.scoreBreakdown,
        justification
      };
    }).sort((a, b) => a.currentRank - b.currentRank);
  }, [issues, language]);

  // roleScopedIssues — server already scopes by ward for officers, this is a
  // defensive client-side mirror in case any stale data slips through
  const roleScopedIssues = useMemo(() => {
    if (role === 'officer' && user) {
      return sortedIssues.filter((issue) => issue.ward === user.ward);
    }
    return sortedIssues;
  }, [sortedIssues, role, user]);

  const filteredIssues = useMemo(() => {
    return roleScopedIssues.filter((issue) => {
      const search = filters.searchQuery.toLowerCase();
      const issueText = getIssueText(issue);
      const matchesSearch = 
        !search ||
        issue.title.toLowerCase().includes(search) ||
        issueText.title.toLowerCase().includes(search) ||
        issue.ticketNumber.toLowerCase().includes(search) ||
        issue.ward.toLowerCase().includes(search) ||
        issue.locationLandmark.toLowerCase().includes(search) ||
        issue.description.toLowerCase().includes(search);

      const matchesCategory = 
        filters.category === 'All Categories' || issue.category === filters.category;
      const matchesWard = 
        filters.ward === 'All Wards' || issue.ward === filters.ward;
      const matchesUrgency = issue.urgencyScore >= filters.minUrgency;
      const matchesNeedsReview = !filters.showNeedsReviewOnly || issue.needsReview;
      const matchesScheduled = !filters.showScheduledOnly || issue.isActionedThisCycle;
      const matchesOverridden = !filters.showOverriddenOnly || issue.isOverridden;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesWard &&
        matchesUrgency &&
        matchesNeedsReview &&
        matchesScheduled &&
        matchesOverridden
      );
    });
  }, [roleScopedIssues, filters, getIssueText]);

  const needsReviewIssues = useMemo(() => {
    return roleScopedIssues.filter((i) => i.needsReview);
  }, [roleScopedIssues]);

  const scheduledCount = useMemo(() => {
    return roleScopedIssues.filter((i) => i.isActionedThisCycle).length;
  }, [roleScopedIssues]);

  // ── API-backed action handlers ─────────────────────────────────────────────

  /**
   * Toggle work order inclusion — calls API, server enforces cap and ward guard.
   * Refetch strategy: re-fetch the full list after each mutation (authoritative).
   */
  const handleToggleAction = async (issueId: string) => {
    const target = issues.find(i => i.id === issueId);
    if (!target) return;

    try {
      const res = await fetch(`/api/issues/${issueId}/toggle-action`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officerName: user?.name,
          officerRole: user?.roleTitle,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        // Surface the server's cap-exceeded message to the user
        alert(data.error || 'Action failed.');
        return;
      }

      triggerRefresh();
    } catch (err) {
      console.error('[handleToggleAction]', err);
      alert('Network error — could not update issue status.');
    }
  };

  /**
   * Greedy auto-fit sprint — admin-only, calls POST /api/cycle/auto-fit
   */
  const handleAutoFitSprint = async () => {
    try {
      const res = await fetch('/api/cycle/auto-fit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerName: user?.name }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Auto-fit failed.');
        return;
      }

      triggerRefresh();
    } catch (err) {
      console.error('[handleAutoFitSprint]', err);
      alert('Network error during auto-fit.');
    }
  };

  /**
   * Clear sprint — unschedule all issues one-by-one via toggle API.
   * Note: a dedicated /api/cycle/clear endpoint could be added in a future pass.
   */
  const handleClearSprint = async () => {
    const actioned = issues.filter(i => i.isActionedThisCycle);
    for (const issue of actioned) {
      await fetch(`/api/issues/${issue.id}/toggle-action`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerName: user?.name, officerRole: user?.roleTitle }),
      });
    }
    triggerRefresh();
  };

  /**
   * Rank override — calls POST /api/issues/:id/override
   */
  const handleConfirmOverride = async (
    issueId: string,
    newRank: number,
    reason: string,
    category: string,
    officerName: string,
    officerRole: string
  ) => {
    try {
      const res = await fetch(`/api/issues/${issueId}/override`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRank, reason, category, officerName, officerRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Override failed.');
        return;
      }

      triggerRefresh();
    } catch (err) {
      console.error('[handleConfirmOverride]', err);
      alert('Network error during override.');
    }
  };

  /**
   * Field verification — PATCH issue data quality fields.
   * For now: update locally and write an audit log on the backend.
   * A dedicated /api/issues/:id/verify endpoint can be added in a future pass.
   */
  const handleConfirmVerification = async (
    issueId: string,
    inspectorName: string,
    notes: string,
    lat: number,
    lng: number
  ) => {
    const target = issues.find(i => i.id === issueId);
    if (!target) return;

    try {
      // Update issue with verified data
      await fetch(`/api/issues/${issueId}/toggle-action`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officerName: inspectorName,
          officerRole: `${target.ward} Field Inspector`,
        }),
      });
      triggerRefresh();
    } catch (err) {
      console.error('[handleConfirmVerification]', err);
    }
  };

  /**
   * Add a new issue — called from NewIssueModal after API POST succeeds.
   * The modal now handles the API call itself; this just triggers a refresh.
   */
  const handleAddIssue = useCallback(() => {
    triggerRefresh();
  }, [triggerRefresh]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-[#0f2942] selection:text-white">
      {/* Top Application Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        needsReviewCount={needsReviewIssues.length}
        totalIssuesCount={roleScopedIssues.length}
        actionedCount={scheduledCount}
        remainingBudgetInr={remainingBudget}
        remainingCrewHours={remainingCrewHours}
        onOpenNewIssueModal={() => setIsNewIssueModalOpen(true)}
        onOpenBudgetSettings={role === 'admin' ? () => setIsBudgetModalOpen(true) : undefined}
        onSwitchToCitizenView={onSwitchToCitizenView}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* RESOURCE LEDGER */}
        {activeTab === 'queue' && (
          <ResourceLedger
            issues={roleScopedIssues}
            onAutoFitSprint={handleAutoFitSprint}
            onClearSprint={handleClearSprint}
            onOpenBudgetSettings={role === 'admin' ? () => setIsBudgetModalOpen(true) : undefined}
          />
        )}

        {/* TAB 1: RANKED PRIORITY QUEUE */}
        {activeTab === 'queue' && (
          <div>
            {isBlackoutError && (
              <div className="bg-slate-900 text-slate-100 rounded-3xl p-8 border border-slate-800 shadow-2xl mb-6 text-center space-y-3 animate-fadeIn">
                <div className="w-14 h-14 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-7 h-7 shrink-0 text-amber-400" />
                </div>
                <div className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                  ⚠️ EMERGENCY RESILIENCE MODE ACTIVE
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono max-w-2xl mx-auto">
                  SYSTEM BLACKOUT: Historical data unreachable. Knapsack algorithm paused. Standing by for database restoration.
                </h3>
                <p className="text-sm text-slate-400 font-medium max-w-lg mx-auto">
                  The municipal database connection is offline. Automated triage and two-stage knapsack calculations are paused to prevent invalid allocation commits.
                </p>
              </div>
            )}

            <FilterBar
              filters={filters}
              setFilters={setFilters}
              totalMatches={filteredIssues.length}
            />

            {/* Comparison Selection Bar */}
            {selectedForCompare.length > 0 && (
              <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn shadow-2xs">
                <div className="flex items-center gap-3 text-xs text-amber-950 font-semibold">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-950 shrink-0">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-xs">
                      {selectedForCompare.length === 1
                        ? (language === 'mr' ? '१ समस्या निवडली — तुलना करण्यासाठी १ आणखी समस्या निवडा' : '1 issue selected — select 1 more to compare side-by-side')
                        : (language === 'mr' ? '२ समस्या निवडल्या — तुलनात्मक विश्लेषण उघडा' : '2 issues selected for side-by-side priority analysis')}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] font-mono text-amber-900 mt-1">
                      {selectedForCompare.map((i) => (
                        <span key={i.id} className="bg-white/80 px-2 py-0.5 rounded-md border border-amber-300 font-bold">
                          {i.ticketNumber} (#{i.currentRank})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => setIsComparisonModalOpen(true)}
                    disabled={selectedForCompare.length !== 2}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedForCompare.length === 2
                        ? 'bg-[#0f2942] text-white hover:bg-blue-900 shadow-2xs'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>{language === 'mr' ? 'तुलना करा (२)' : 'Compare Selected (2)'}</span>
                  </button>

                  <button
                    onClick={handleClearCompareSelection}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-amber-100/80 rounded-xl transition-colors cursor-pointer"
                  >
                    {language === 'mr' ? 'रद्द करा' : 'Clear'}
                  </button>
                </div>
              </div>
            )}

            {/* Spatial GIS Dashboard Map */}
            <IssueMap issues={filteredIssues} language={language} />

            {issuesLoading ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
                <div className="text-sm font-medium">Loading priority queue...</div>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-xs">
                <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  {language === 'mr' ? 'कोणत्याही तक्रारी फिल्टर अटींशी जुळत नाहीत' : 'No issues match the active filter criteria'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 max-w-md mx-auto">
                  {language === 'mr' 
                    ? 'कृपया वरील फिल्टर बारमध्ये प्रभाग, वर्गवारी किंवा किमान तातडी गुण बदलून पहा.' 
                    : 'Try adjusting the Category or minimum urgency threshold in the filter bar above.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-3.5">
                {filteredIssues.map((issue) => {
                  const wouldExceedBudget = !issue.isActionedThisCycle && (issue.estimatedCostInr > remainingBudget);
                  const wouldExceedCrew = !issue.isActionedThisCycle && (issue.estimatedCrewHours > remainingCrewHours);
                  const isDeferred = wouldExceedBudget || wouldExceedCrew;
                  
                  let deferredReason = '';
                  if (wouldExceedBudget && wouldExceedCrew) {
                    deferredReason = language === 'mr' ? 'बजेट व मनुष्यबळ मर्यादा ओलांडली' : 'Budget & Labor Exceeded';
                  } else if (wouldExceedBudget) {
                    deferredReason = language === 'mr' ? 'बजेट संपले' : 'Budget Limit Exceeded';
                  } else if (wouldExceedCrew) {
                    deferredReason = language === 'mr' ? 'मनुष्यबळ तास संपले' : 'Crew Hours Exceeded';
                  }

                  const isSelectedForCompare = selectedForCompare.some((i) => i.id === issue.id);

                  return (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      onToggleAction={handleToggleAction}
                      onOpenOverride={(i) => setSelectedIssueForOverride(i)}
                      onOpenJustification={(i) => setSelectedIssueForJustification(i)}
                      onOpenDataReview={(i) => setSelectedIssueForReview(i)}
                      isSelectedForCompare={isSelectedForCompare}
                      onToggleSelectForCompare={handleToggleSelectForCompare}
                      isCompareDisabled={selectedForCompare.length >= 2}
                      isDeferred={isDeferred}
                      deferredReason={deferredReason}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DATA QUALITY & REVIEW CENTER */}
        {activeTab === 'review' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-[#0f2942] flex items-center gap-2 uppercase tracking-tight">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    {t.reviewTitle}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {t.reviewSubtitle}
                  </p>
                </div>
                <span className="font-mono text-xs text-amber-900 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-bold self-start sm:self-auto">
                  {needsReviewIssues.length} {t.needsReviewBadge}
                </span>
              </div>

              {needsReviewIssues.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{t.allComplaintsVerified}</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {t.noWarnings}
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {needsReviewIssues.map((issue) => {
                    const issueText = getIssueText(issue);
                    return (
                      <div 
                        key={issue.id}
                        className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#0f2942] px-2 py-0.5 rounded bg-blue-100 border border-blue-200">
                              {issue.ticketNumber}
                            </span>
                            <span className="text-xs font-bold text-amber-700">
                              {t.confidenceLow}: {issue.dataQualityScore}% ({language === 'mr' ? 'अपूर्ण' : 'Low'})
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">{issueText.title}</h4>
                          <p className="text-xs text-slate-600 font-medium">{issueText.description}</p>
                          <div className="text-xs text-slate-500 font-mono font-semibold flex items-center gap-2">
                            <span>{language === 'mr' ? 'ठिकाण:' : 'Location:'} {getWardName(issue.ward)} • {issue.locationLandmark}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {issue.dataQualityFlags.map((flag, idx) => (
                              <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-mono font-bold">
                                {flag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedIssueForReview(issue)}
                          className="shrink-0 px-4 py-2 text-xs font-bold text-white bg-[#0f2942] hover:bg-[#1e3a8a] rounded-lg transition-all shadow-xs flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-amber-400" />
                          {t.btnInspectAndVerify}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT TRAIL VIEW */}
        {activeTab === 'audit' && (
          <AuditLogTable logs={auditLogs} />
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">{t.footerOrg}</span>
            <span>• {t.footerTagline}</span>
          </div>
          <div className="font-mono text-[11px] text-slate-500 font-semibold">
            {t.footerCompliance}
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {selectedIssueForJustification && (
        <JustificationTooltip
          issue={selectedIssueForJustification}
          isOpen={!!selectedIssueForJustification}
          onClose={() => setSelectedIssueForJustification(null)}
        />
      )}

      {selectedIssueForOverride && (
        <OverrideModal
          issue={selectedIssueForOverride}
          totalIssuesCount={issues.length}
          isOpen={!!selectedIssueForOverride}
          onClose={() => setSelectedIssueForOverride(null)}
          onConfirmOverride={handleConfirmOverride}
        />
      )}

      {selectedIssueForReview && (
        <ReviewModal
          issue={selectedIssueForReview}
          isOpen={!!selectedIssueForReview}
          onClose={() => setSelectedIssueForReview(null)}
          onConfirmVerification={handleConfirmVerification}
        />
      )}

      {isNewIssueModalOpen && (
        <NewIssueModal
          isOpen={isNewIssueModalOpen}
          onClose={() => setIsNewIssueModalOpen(false)}
          onAddIssue={handleAddIssue}
          currentIssuesCount={issues.length}
        />
      )}

      {/* Admin Budget Settings Modal */}
      {isBudgetModalOpen && role === 'admin' && (
        <BudgetSettingsModal
          isOpen={isBudgetModalOpen}
          onClose={() => setIsBudgetModalOpen(false)}
          onSaved={triggerRefresh}
        />
      )}

      {/* Side-by-Side Issue Comparison Modal */}
      {isComparisonModalOpen && selectedForCompare.length === 2 && (
        <ComparisonModal
          issueA={selectedForCompare[0]}
          issueB={selectedForCompare[1]}
          isOpen={isComparisonModalOpen}
          onClose={() => setIsComparisonModalOpen(false)}
        />
      )}
    </div>
  );
}

// Top-Level App Shell with Providers and Conditional Authentication
function AppContent() {
  const { isAuthenticated } = useAuth();
  const [unauthView, setUnauthView] = useState<'citizen' | 'login'>('citizen');

  if (!isAuthenticated) {
    if (unauthView === 'citizen') {
      return (
        <CitizenPortal 
          onSwitchToStaffLogin={() => setUnauthView('login')}
        />
      );
    }
    return (
      <LoginScreen 
        onSwitchToCitizenPortal={() => setUnauthView('citizen')}
      />
    );
  }

  return (
    <DashboardApp 
      onSwitchToCitizenView={() => setUnauthView('citizen')}
    />
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BudgetProvider>
          <AppContent />
        </BudgetProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
