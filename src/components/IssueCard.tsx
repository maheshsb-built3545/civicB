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
  Scale
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
  const { language, t, getWardName, getCategoryName, getEquipmentName, getIssueText } = useLanguage();
  const issueText = getIssueText(issue);

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

  return (
    <div 
      className={`group relative rounded-2xl border transition-all duration-150 overflow-hidden bg-white ${
        issue.isActionedThisCycle
          ? 'border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/20'
          : isDeferred
          ? 'border-slate-200/80 bg-slate-50/40 opacity-80'
          : issue.isOverridden
          ? 'border-purple-200/90 shadow-2xs'
          : issue.needsReview
          ? 'border-amber-200/90 shadow-2xs'
          : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
      }`}
    >
      {/* Compact Status Ribbon if special state */}
      {(issue.isOverridden || (!issue.isActionedThisCycle && isDeferred) || issue.needsReview) && (
        <div className={`px-4 py-1 flex items-center justify-between text-[11px] font-semibold border-b ${
          issue.isOverridden
            ? 'bg-purple-50 text-purple-900 border-purple-100'
            : !issue.isActionedThisCycle && isDeferred
            ? 'bg-slate-100/80 text-slate-600 border-slate-200'
            : 'bg-amber-50 text-amber-900 border-amber-100'
        }`}>
          <div className="flex items-center gap-1.5">
            {issue.isOverridden ? (
              <span>
                {language === 'mr' ? 'प्रशासकीय प्राधान्य बदल: ' : 'Administrative Override: '}
                {issue.overrideDetails?.officerName} (Orig #{issue.overrideDetails?.originalRank} → #{issue.overrideDetails?.newRank})
              </span>
            ) : !issue.isActionedThisCycle && isDeferred ? (
              <span>
                ⏳ {language === 'mr' ? 'पुढील चक्रासाठी पुढे ढकलले: ' : 'Deferred to Next Sprint: '} 
                <strong className="font-bold">{deferredReason}</strong>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                {language === 'mr' ? 'कमी विश्वसनीयता — प्रत्यक्ष पडताळणी आवश्यक' : 'Low Confidence — Field Geotag Verification Required'}
              </span>
            )}
          </div>

          {issue.needsReview && onOpenDataReview && (
            <button
              onClick={() => onOpenDataReview(issue)}
              className="font-bold text-amber-900 hover:underline uppercase text-[10px] cursor-pointer"
            >
              {language === 'mr' ? 'पडताळा' : 'Review'}
            </button>
          )}
        </div>
      )}

      {/* Main Content Body */}
      <div className="p-4 sm:p-4.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          
          {/* Left: Rank & Issue Details */}
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            {/* Crisp Rank Badge */}
            <div className="shrink-0 text-center pt-0.5">
              <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tighter leading-none block select-none ${
                issue.isActionedThisCycle
                  ? 'text-emerald-700'
                  : isDeferred
                  ? 'text-slate-400'
                  : issue.isOverridden 
                  ? 'text-purple-700' 
                  : issue.currentRank === 1 
                  ? 'text-rose-600' 
                  : issue.currentRank <= 3 
                  ? 'text-[#0f2942]' 
                  : 'text-slate-500'
              }`}>
                #{getRankNumberFormatted(issue.currentRank)}
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mt-0.5">
                {t.rankLabel}
              </span>
            </div>

            {/* Title, Category & Location */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                  {issue.ticketNumber}
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.2 rounded bg-blue-50 text-[#0f2942] border border-blue-100">
                  {getCategoryName(issue.category)}
                </span>
                {issue.isActionedThisCycle && (
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded uppercase">
                    {language === 'mr' ? 'मंजूर' : 'In Sprint'}
                  </span>
                )}
                {issue.aiVerification && (
                  <span 
                    title={`AI Screening: ${issue.aiVerification.aiReasoning}`}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.2 rounded bg-sky-50 text-sky-800 border border-sky-200 cursor-help"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                    <span>
                      AI Pre-Screened: {issue.aiVerification.isLikelyGenuine ? 'Likely genuine' : 'Flagged'} ({issue.aiVerification.confidenceLabel} conf)
                    </span>
                  </span>
                )}
              </div>

              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug group-hover:text-[#0f2942] transition-colors line-clamp-1">
                {issueText.title}
              </h3>

              <p className={`text-xs mt-0.5 line-clamp-1 ${issue.isOverridden ? 'font-bold text-purple-900' : 'text-slate-500'}`}>
                {issue.isOverridden 
                  ? `Manually prioritized by Staff. Reason: ${issue.overrideDetails?.reason || issueText.justification}`
                  : issueText.justification}
              </p>

              {/* Location & Metadata Row */}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-slate-700 font-semibold">{getWardName(issue.ward)}</span>
                  <span className="text-slate-400">• {issueText.landmark}</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{issue.daysOpen}{language === 'mr' ? 'दिस' : 'd'}</span>
                </div>
                <button
                  onClick={() => onOpenJustification(issue)}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-0.5 uppercase cursor-pointer"
                >
                  <BrainCircuit className="w-3 h-3" />
                  <span>{language === 'mr' ? 'स्कोर सूत्र' : 'Score'}</span>
                </button>
                {onToggleSelectForCompare && (
                  <button
                    type="button"
                    onClick={() => onToggleSelectForCompare(issue)}
                    disabled={isCompareDisabled && !isSelectedForCompare}
                    title={isSelectedForCompare ? "Deselect from comparison" : "Select for side-by-side comparison"}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isSelectedForCompare
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50 shadow-2xs font-extrabold'
                        : isCompareDisabled
                        ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Scale className="w-3 h-3 shrink-0" />
                    <span>{isSelectedForCompare ? (language === 'mr' ? 'निवडले ✓' : 'Selected ✓') : (language === 'mr' ? 'तुलना' : 'Compare')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Metrics & Action Controls */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 justify-between md:justify-end">
            
            {/* Cost & Hours */}
            <div className="text-right min-w-[80px]">
              <div className="text-xs font-mono font-bold text-slate-900">
                {formatInr(issue.estimatedCostInr)}
              </div>
              <div className="text-[11px] font-mono text-slate-500 font-medium">
                {issue.estimatedCrewHours} {language === 'mr' ? 'तास' : 'hrs'}
              </div>
            </div>

            {/* Urgency Meter */}
            <div className="w-20 sm:w-24">
              <div className="flex justify-between items-center text-[10px] font-mono font-extrabold mb-1">
                <span className="text-slate-400 uppercase tracking-tight">{language === 'mr' ? 'तातडी' : 'Score'}</span>
                <span className={
                  issue.urgencyScore >= 90 ? 'text-rose-600' :
                  issue.urgencyScore >= 75 ? 'text-amber-600' : 'text-[#0f2942]'
                }>
                  {issue.urgencyScore.toFixed(0)}/100
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    issue.isOverridden ? 'bg-purple-600' :
                    issue.urgencyScore >= 90 ? 'bg-rose-500' :
                    issue.urgencyScore >= 75 ? 'bg-amber-500' : 'bg-[#0f2942]'
                  }`}
                  style={{ width: `${issue.urgencyScore}%` }}
                />
              </div>
            </div>

            {/* Action Buttons: Schedule Pill + Override Icon */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onToggleAction(issue.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  issue.isActionedThisCycle
                    ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {issue.isActionedThisCycle && <Check className="w-3.5 h-3.5" />}
                <span>{issue.isActionedThisCycle ? (language === 'mr' ? 'मंजूर' : 'Scheduled') : (language === 'mr' ? 'मंजूर करा' : 'Schedule')}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenOverride(issue)}
                title={t.btnOverride}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
