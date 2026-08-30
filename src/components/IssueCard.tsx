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
  const { language, t, getWardName, getCategoryName, getIssueText } = useLanguage();
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

  // Gazette Rotated Ink Stamp Helper
  const renderStampBadge = () => {
    if (issue.isOverridden) {
      return (
        <span className="gazette-stamp gazette-stamp-override" title="Administrative Override Applied">
          ⚡ {language === 'mr' ? 'अधिकारी बदल' : 'OVERRIDDEN'}
        </span>
      );
    }
    if (issue.urgencyScore >= 90) {
      return (
        <span className="gazette-stamp gazette-stamp-critical">
          CRITICAL // {issue.urgencyScore.toFixed(0)}
        </span>
      );
    }
    if (issue.urgencyScore >= 75) {
      return (
        <span className="gazette-stamp gazette-stamp-high">
          HIGH // {issue.urgencyScore.toFixed(0)}
        </span>
      );
    }
    if (issue.urgencyScore >= 50) {
      return (
        <span className="gazette-stamp gazette-stamp-medium">
          MEDIUM // {issue.urgencyScore.toFixed(0)}
        </span>
      );
    }
    return (
      <span className="gazette-stamp gazette-stamp-low">
        ROUTINE // {issue.urgencyScore.toFixed(0)}
      </span>
    );
  };

  return (
    <div 
      className={`group relative rounded-sm border transition-all duration-150 overflow-hidden bg-[#fffdfa] ${
        issue.isActionedThisCycle
          ? 'border-emerald-700 shadow-xs ring-1 ring-emerald-600/30'
          : isDeferred
          ? 'border-[#c4b6a3] bg-[#f7f3ec]/60 opacity-85'
          : issue.isOverridden
          ? 'border-purple-300 shadow-2xs'
          : issue.needsReview
          ? 'border-amber-300 shadow-2xs'
          : 'border-[#e3dacd] hover:border-[#b8aba0] shadow-2xs'
      }`}
    >
      {/* Top Gazette Status Banner if special state */}
      {(issue.isOverridden || (!issue.isActionedThisCycle && isDeferred) || issue.needsReview) && (
        <div className={`px-4 py-1.5 flex items-center justify-between text-xs font-mono border-b ${
          issue.isOverridden
            ? 'bg-purple-50 text-purple-950 border-purple-200'
            : !issue.isActionedThisCycle && isDeferred
            ? 'bg-[#f2ece1] text-[#59534c] border-[#e3dacd]'
            : 'bg-amber-50 text-amber-950 border-amber-200'
        }`}>
          <div className="flex items-center gap-1.5">
            {issue.isOverridden ? (
              <span>
                <strong>{language === 'mr' ? 'प्रशासकीय प्राधान्य बदल: ' : 'Administrative Override: '}</strong>
                {issue.overrideDetails?.officerName} (Orig #{issue.overrideDetails?.originalRank} → #{issue.overrideDetails?.newRank})
              </span>
            ) : !issue.isActionedThisCycle && isDeferred ? (
              <span>
                ⏳ <strong>{language === 'mr' ? 'पुढील चक्रासाठी पुढे ढकलले: ' : 'Deferred to Next Sprint: '}</strong> 
                <span>{deferredReason}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                {language === 'mr' ? 'कमी विश्वसनीयता — प्रत्यक्ष पडताळणी आवश्यक' : 'Low Confidence — Field Geotag Verification Required'}
              </span>
            )}
          </div>

          {issue.needsReview && onOpenDataReview && (
            <button
              onClick={() => onOpenDataReview(issue)}
              className="font-bold text-amber-950 hover:underline uppercase text-[10px] tracking-wider cursor-pointer font-mono"
            >
              {language === 'mr' ? 'पडताळा' : 'Inspect'}
            </button>
          )}
        </div>
      )}

      {/* Main Content Body */}
      <div className="p-4 sm:p-4.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          
          {/* Left: Rank & Issue Details */}
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            
            {/* Crisp Gazette Rank Stamp Badge */}
            <div className="shrink-0 text-center pt-0.5">
              <div className={`px-2.5 py-1 rounded-sm border font-mono font-black text-2xl sm:text-3xl leading-none select-none ${
                issue.isActionedThisCycle
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : isDeferred
                  ? 'bg-slate-100 text-slate-500 border-slate-300'
                  : issue.isOverridden 
                  ? 'bg-purple-50 text-purple-900 border-purple-300' 
                  : issue.currentRank === 1 
                  ? 'bg-rose-50 text-rose-900 border-rose-300' 
                  : 'bg-[#f4efe6] text-[#24211e] border-[#c4b6a3]'
              }`}>
                #{getRankNumberFormatted(issue.currentRank)}
              </div>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#8c8275] block mt-1">
                {t.rankLabel}
              </span>
            </div>

            {/* Title, Category & Location */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {/* Monospace Ticket Number */}
                <span className="font-mono text-xs font-bold text-[#59534c] bg-[#f4efe6] border border-[#d3c7b8] px-1.5 py-0.5 rounded-sm">
                  {issue.ticketNumber}
                </span>

                {/* Category Badge */}
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-sm bg-[#f5efe4] text-[#24211e] border border-[#c4b6a3]">
                  {getCategoryName(issue.category)}
                </span>

                {/* Rotated Ink Stamp Badge */}
                {renderStampBadge()}

                {issue.isActionedThisCycle && (
                  <span className="text-[10px] font-mono font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-sm uppercase">
                    {language === 'mr' ? 'मंजूर' : 'In Sprint'}
                  </span>
                )}

                {issue.aiVerification && (
                  <span 
                    title={`AI Screening: ${issue.aiVerification.aiReasoning}`}
                    className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sm bg-sky-50 text-sky-900 border border-sky-300 cursor-help"
                  >
                    <Sparkles className="w-3 h-3 text-sky-700 shrink-0" />
                    <span>
                      AI: {issue.aiVerification.isLikelyGenuine ? 'Genuine' : 'Flagged'} ({issue.aiVerification.confidenceLabel})
                    </span>
                  </span>
                )}
              </div>

              {/* Gazette Serif Title */}
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#24211e] leading-snug group-hover:text-[#6b2d18] transition-colors line-clamp-1">
                {issueText.title}
              </h3>

              <p className={`text-xs mt-0.5 line-clamp-1 ${issue.isOverridden ? 'font-bold text-purple-950' : 'text-[#59534c]'}`}>
                {issue.isOverridden 
                  ? `Manually prioritized by Staff. Reason: ${issue.overrideDetails?.reason || issueText.justification}`
                  : issueText.justification}
              </p>

              {/* Location & Metadata Row */}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-[#59534c]">
                <div className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#8c8275] shrink-0" />
                  <span className="text-[#24211e] font-bold">{getWardName(issue.ward)}</span>
                  <span className="text-[#78716c]">• {issueText.landmark}</span>
                </div>

                <div className="flex items-center gap-1 font-mono text-[11px] text-[#59534c]">
                  <Clock className="w-3.5 h-3.5 text-[#8c8275]" />
                  <span>{issue.daysOpen}{language === 'mr' ? 'दिस' : 'd'}</span>
                </div>

                <button
                  onClick={() => onOpenJustification(issue)}
                  className="text-[11px] font-mono font-bold text-[#6b2d18] hover:text-[#24211e] flex items-center gap-1 uppercase cursor-pointer"
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>{language === 'mr' ? 'स्कोर सूत्र' : 'Score'}</span>
                </button>

                {onToggleSelectForCompare && (
                  <button
                    type="button"
                    onClick={() => onToggleSelectForCompare(issue)}
                    disabled={isCompareDisabled && !isSelectedForCompare}
                    title={isSelectedForCompare ? "Deselect from comparison" : "Select for side-by-side comparison"}
                    className={`px-2 py-0.5 rounded-sm text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isSelectedForCompare
                        ? 'bg-amber-400 text-slate-950 border border-amber-600 font-extrabold shadow-2xs'
                        : isCompareDisabled
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50'
                        : 'bg-[#f4efe6] text-[#24211e] border border-[#c4b6a3] hover:bg-[#e7e0d6]'
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
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#e3dacd] justify-between md:justify-end">
            
            {/* Cost & Hours Chip */}
            <div className="text-right min-w-[85px] bg-[#f7f3ec] border border-[#e3dacd] px-2.5 py-1.5 rounded-sm">
              <div className="text-xs font-mono font-bold text-[#24211e]">
                {formatInr(issue.estimatedCostInr)}
              </div>
              <div className="text-[11px] font-mono text-[#59534c] font-medium">
                {issue.estimatedCrewHours} {language === 'mr' ? 'तास' : 'hrs'}
              </div>
            </div>

            {/* Urgency Meter */}
            <div className="w-20 sm:w-24">
              <div className="flex justify-between items-center text-[10px] font-mono font-extrabold mb-1">
                <span className="text-[#8c8275] uppercase">{language === 'mr' ? 'तातडी' : 'Score'}</span>
                <span className={
                  issue.urgencyScore >= 90 ? 'text-rose-800' :
                  issue.urgencyScore >= 75 ? 'text-amber-800' : 'text-[#24211e]'
                }>
                  {issue.urgencyScore.toFixed(0)}/100
                </span>
              </div>
              <div className="h-2 w-full bg-[#e3dacd] rounded-sm overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-xs transition-all duration-300 ${
                    issue.isOverridden ? 'bg-purple-700' :
                    issue.urgencyScore >= 90 ? 'bg-rose-700' :
                    issue.urgencyScore >= 75 ? 'bg-amber-700' : 'bg-[#24211e]'
                  }`}
                  style={{ width: `${issue.urgencyScore}%` }}
                />
              </div>
            </div>

            {/* Gazette Ink Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onToggleAction(issue.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono font-bold transition-all cursor-pointer ${
                  issue.isActionedThisCycle
                    ? 'bg-emerald-800 text-white shadow-xs hover:bg-emerald-900 border border-emerald-950'
                    : 'bg-[#24211e] hover:bg-[#3a352e] text-[#fffdfa] border border-black'
                }`}
              >
                {issue.isActionedThisCycle && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                <span>{issue.isActionedThisCycle ? (language === 'mr' ? 'मंजूर' : 'Scheduled') : (language === 'mr' ? 'मंजूर करा' : 'Schedule')}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenOverride(issue)}
                title={t.btnOverride}
                className="p-1.5 bg-[#f4efe6] hover:bg-[#e7e0d6] text-[#24211e] border border-[#c4b6a3] rounded-sm transition-colors cursor-pointer"
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

