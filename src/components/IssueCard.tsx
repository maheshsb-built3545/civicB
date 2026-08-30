import React from 'react';
import { CivicIssue } from '../types';
import { 
  Clock, 
  MapPin, 
  BrainCircuit, 
  SlidersHorizontal,
  Check,
  AlertTriangle,
  Sparkles,
  Scale,
  ShieldAlert
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface IssueCardProps {
  issue: CivicIssue;
  onToggleAction: (issueId: string) => void;
  onOpenOverride: (issue: CivicIssue) => void;
  onOpenJustification: (issue: CivicIssue) => void;
  onOpenDataReview?: (issue: CivicIssue) => void;
  isSelectedForCompare?: boolean;
  onToggleSelectForCompare?: (issue: CivicIssue) => void;
  isCompareDisabled?: boolean;
  isDeferred?: boolean;
  deferredReason?: string;
}

export const IssueCard: React.FC<IssueCardProps> = ({
  issue,
  onToggleAction,
  onOpenOverride,
  onOpenJustification,
  onOpenDataReview,
  isSelectedForCompare = false,
  onToggleSelectForCompare,
  isCompareDisabled = false,
  isDeferred = false,
  deferredReason
}) => {
  const { language, t, getWardName, getCategoryName, getIssueText } = useLanguage();
  const issueText = getIssueText(issue);

  const isMisinformation = Boolean(
    issue.isMisinformationRisk || 
    issue.aiVerification?.isMisinformationRisk
  );

  const safetyRationaleText = issue.safetyRationale || issue.aiVerification?.safetyRationale || 'Quarantined due to misinformation risk or defamatory attack.';

  const formatInr = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getRankNumberFormatted = (rank: number) => {
    return rank < 10 ? `0${rank}` : `${rank}`;
  };

  // Modern Urgency Badge Helper with Misinformation Shield Flag
  const renderUrgencyBadge = () => {
    if (isMisinformation) {
      return (
        <span 
          title={safetyRationaleText}
          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white border border-rose-700 shadow-md animate-pulse cursor-help"
        >
          <ShieldAlert className="w-4 h-4 text-white shrink-0" />
          <span>🛑 FLAG: MISINFORMATION RISK</span>
        </span>
      );
    }
    if (issue.isOverridden) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs">
          ⚡ {language === 'mr' ? 'प्रशासकीय प्राधान्य बदल' : 'ADMIN OVERRIDE'}
        </span>
      );
    }
    if (issue.urgencyScore >= 75) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-700 border border-red-200 shadow-2xs">
          <Sparkles className="w-4 h-4 text-red-600 shrink-0" />
          <span>{issue.urgencyScore.toFixed(0)}/100 {language === 'mr' ? 'अति-महत्त्वाचे' : 'HIGH URGENCY'}</span>
        </span>
      );
    }
    if (issue.urgencyScore >= 50) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{issue.urgencyScore.toFixed(0)}/100 {language === 'mr' ? 'मध्यम' : 'MEDIUM'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-700 border border-blue-200">
        <span>{issue.urgencyScore.toFixed(0)}/100 {language === 'mr' ? 'सामान्य' : 'ROUTINE'}</span>
      </span>
    );
  };

  return (
    <div 
      className={`group relative rounded-2xl border transition-all duration-200 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md ${
        isMisinformation
          ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/30 shadow-md'
          : issue.isActionedThisCycle
          ? 'border-emerald-500/80 ring-2 ring-emerald-500/20'
          : isDeferred
          ? 'border-slate-200 bg-slate-50/50 opacity-80'
          : issue.isOverridden
          ? 'border-purple-200 ring-1 ring-purple-500/10'
          : issue.needsReview
          ? 'border-amber-200 ring-1 ring-amber-500/10'
          : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      {/* Top Banner for Misinformation Risk or Special Statuses */}
      {isMisinformation ? (
        <div className="-mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-4 px-5 py-3 flex items-center justify-between text-xs font-bold bg-rose-100 text-rose-950 border-b border-rose-300 rounded-t-2xl shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" />
            <span>
              <strong className="text-rose-900 font-extrabold uppercase">🛑 MISINFORMATION SHIELD QUARANTINE:</strong> {safetyRationaleText}
            </span>
          </div>
        </div>
      ) : (issue.isOverridden || (!issue.isActionedThisCycle && isDeferred) || issue.needsReview) && (
        <div className={`-mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-4 px-5 py-2.5 flex items-center justify-between text-xs font-medium border-b rounded-t-2xl ${
          issue.isOverridden
            ? 'bg-purple-50 text-purple-900 border-purple-100'
            : !issue.isActionedThisCycle && isDeferred
            ? 'bg-slate-100/90 text-slate-700 border-slate-200'
            : 'bg-amber-50 text-amber-900 border-amber-100'
        }`}>
          <div className="flex items-center gap-2">
            {issue.isOverridden ? (
              <span className="flex items-center gap-1.5">
                <strong className="font-bold">{language === 'mr' ? 'प्रशासकीय नोंद:' : 'Officer Directive:'}</strong>
                <span>{issue.overrideDetails?.officerName} (Rank #{issue.overrideDetails?.originalRank} → #{issue.overrideDetails?.newRank})</span>
              </span>
            ) : !issue.isActionedThisCycle && isDeferred ? (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                <strong className="font-bold">{language === 'mr' ? 'पुढील चक्रासाठी पुढे ढकलले:' : 'Deferred to Next Cycle:'}</strong>
                <span>{deferredReason}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{language === 'mr' ? 'कमी विश्वसनीयता — प्रत्यक्ष पडताळणी आवश्यक' : 'Field Geotag Verification Required'}</span>
              </span>
            )}
          </div>

          {issue.needsReview && onOpenDataReview && (
            <button
              onClick={() => onOpenDataReview(issue)}
              className="font-bold text-amber-800 hover:text-amber-950 underline uppercase text-xs cursor-pointer"
            >
              {language === 'mr' ? 'पडताळा' : 'Inspect'}
            </button>
          )}
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        
        {/* Left Section: Rank, Metadata, Title, Rationale */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          
          {/* Bold Rank Circle Badge */}
          <div className="shrink-0 pt-0.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold font-mono text-xl tracking-tight shadow-xs ${
              issue.isActionedThisCycle
                ? 'bg-emerald-600 text-white shadow-emerald-200'
                : isDeferred
                ? 'bg-slate-200 text-slate-500'
                : issue.isOverridden 
                ? 'bg-purple-600 text-white shadow-purple-200' 
                : issue.currentRank === 1 
                ? 'bg-rose-600 text-white shadow-rose-200' 
                : 'bg-slate-900 text-white'
            }`}>
              #{getRankNumberFormatted(issue.currentRank)}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center mt-1">
              {t.rankLabel}
            </span>
          </div>

          {/* Issue Details Body */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
                {issue.ticketNumber}
              </span>

              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
                {getCategoryName(issue.category)}
              </span>

              {renderUrgencyBadge()}

              {issue.isActionedThisCycle && (
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg uppercase">
                  {language === 'mr' ? 'मंजूर' : 'In Sprint'}
                </span>
              )}

              {issue.aiVerification && (
                <span 
                  title={`AI Reasoning: ${issue.aiVerification.aiReasoning}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 cursor-help"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>AI: {issue.aiVerification.isLikelyGenuine ? 'Genuine' : 'Flagged'} ({issue.aiVerification.confidenceLabel})</span>
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
              {issueText.title}
            </h3>

            {/* Rationale */}
            <p className={`text-sm leading-relaxed ${issue.isOverridden ? 'font-semibold text-purple-950' : 'text-slate-600'}`}>
              {issue.isOverridden 
                ? `Manually prioritized by Staff. Reason: ${issue.overrideDetails?.reason || issueText.justification}`
                : issueText.justification}
            </p>

            {/* Location & Interactive Triggers */}
            <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-bold">{getWardName(issue.ward)}</span>
                <span className="text-slate-400">• {issueText.landmark}</span>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-slate-500">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{issue.daysOpen}{language === 'mr' ? 'दिस' : 'd open'}</span>
              </div>

              <button
                type="button"
                onClick={() => onOpenJustification(issue)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <BrainCircuit className="w-4 h-4 shrink-0" />
                <span>{language === 'mr' ? 'स्कोर सूत्र' : 'Formula Breakdown'}</span>
              </button>

              {onToggleSelectForCompare && (
                <button
                  type="button"
                  onClick={() => onToggleSelectForCompare(issue)}
                  disabled={isCompareDisabled && !isSelectedForCompare}
                  title={isSelectedForCompare ? "Deselect from comparison" : "Select for side-by-side comparison"}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelectedForCompare
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50 shadow-xs'
                      : isCompareDisabled
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Scale className="w-4 h-4 shrink-0" />
                  <span>{isSelectedForCompare ? (language === 'mr' ? 'निवडले ✓' : 'Selected ✓') : (language === 'mr' ? 'तुलना' : 'Compare')}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Cost & Action Buttons */}
        <div className="flex items-center gap-4 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 justify-between lg:justify-end">
          
          {/* Estimated Cost & Labor Chip */}
          <div className="text-right bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl">
            <div className="text-sm font-mono font-extrabold text-slate-900">
              {formatInr(issue.estimatedCostInr)}
            </div>
            <div className="text-xs font-mono text-slate-500 font-medium">
              {issue.estimatedCrewHours} {language === 'mr' ? 'तास' : 'hrs crew'}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleAction(issue.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-xs ${
                issue.isActionedThisCycle
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-900 hover:bg-blue-600 text-white'
              }`}
            >
              {issue.isActionedThisCycle && <Check className="w-4 h-4 text-emerald-200 shrink-0" />}
              <span>{issue.isActionedThisCycle ? (language === 'mr' ? 'मंजूर' : 'Scheduled') : (language === 'mr' ? 'मंजूर करा' : 'Schedule')}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenOverride(issue)}
              title={t.btnOverride}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-5 h-5 shrink-0" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};


