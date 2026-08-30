import React from 'react';
import { CivicIssue } from '../types';
import { BrainCircuit, AlertTriangle, Users, Clock, Building2, Scale, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface JustificationTooltipProps {
  issue: CivicIssue;
  isOpen: boolean;
  onClose: () => void;
}

export const JustificationTooltip: React.FC<JustificationTooltipProps> = ({
  issue,
  isOpen,
  onClose
}) => {
  const { language, t, getIssueText } = useLanguage();

  if (!isOpen) return null;

  const { scoreBreakdown } = issue;
  const issueText = getIssueText(issue);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="relative w-full max-w-xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-[#0f2942] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10 border border-white/20 text-amber-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/20 text-white border border-white/30">
                  {issue.ticketNumber}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  {language === 'mr' ? 'अल्गोरिदम प्राधान्य मूल्यमापन विश्लेषण' : 'Algorithmic Assessment Breakdown'}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5 truncate max-w-md">
                {language === 'mr' ? `क्रमांक #${issue.currentRank} गुण मोजणी सूत्र` : `Rank #${issue.currentRank} Scoring Formula`}
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Main Justification Statement */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
              {language === 'mr' ? 'अधिकृत निर्णय समर्थन कारण' : 'Human-Readable Rationale'}
            </div>
            <p className={`text-sm leading-relaxed ${issue.isOverridden ? 'font-bold text-purple-950' : 'font-semibold text-slate-900'}`}>
              {issue.isOverridden
                ? `Manually prioritized by Staff. Reason: ${issue.overrideDetails?.reason || issueText.justification}`
                : `"${issueText.justification}"`}
            </p>
          </div>

          {/* Overridden Notification if applicable */}
          {issue.isOverridden && issue.overrideDetails && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900">
              <div className="flex items-center gap-2 font-bold text-xs text-purple-800 mb-1">
                <ShieldAlert className="w-4 h-4 text-purple-700" />
                {language === 'mr' 
                  ? `प्रशासकीय प्राधान्य बदल सक्रिय (मूळ क्रमांक #${issue.overrideDetails.originalRank} → #${issue.overrideDetails.newRank})`
                  : `Administrative Override Active (Original Rank #${issue.overrideDetails.originalRank} → #${issue.overrideDetails.newRank})`}
              </div>
              <p className="text-xs text-purple-900 leading-relaxed mb-2">
                <strong>{language === 'mr' ? 'अधिकारी नोंदलेले कारण:' : 'Officer Reason:'}</strong> {issue.overrideDetails.reason}
              </p>
              <div className="text-[11px] text-purple-800 font-mono font-bold">
                {language === 'mr' ? 'मंजूर करणारे:' : 'Authorized by'} {issue.overrideDetails.officerName} ({issue.overrideDetails.officerRole}) • {issue.overrideDetails.timestamp}
              </div>
            </div>
          )}

          {/* Tiebreaker Details if applicable */}
          {scoreBreakdown.tieBreakerApplied && (
            <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900">
              <div className="flex items-center gap-2 font-bold text-xs text-cyan-800 mb-1">
                <Scale className="w-4 h-4 text-cyan-600" />
                {language === 'mr' ? 'समान गुण टाय-ब्रेकर निर्णय तर्क' : 'Tied Score Resolution Logic'}
              </div>
              <p className="text-xs text-cyan-900 leading-relaxed font-medium">
                {scoreBreakdown.tieBreakerReason}
              </p>
            </div>
          )}

          {/* Scoring Factor Breakdown Table / Bars */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                {language === 'mr' ? 'एकत्रित तातडी गुणांक घटक' : 'Composite Urgency Formula Factors'}
              </span>
              <span className="text-xs font-mono font-black text-[#0f2942] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {language === 'mr' ? 'अंतिम गुण' : 'Final Score'}: {issue.urgencyScore.toFixed(1)}/100
              </span>
            </div>

            <div className="space-y-3">
              {/* Factor 1: Safety Risk */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>{language === 'mr' ? 'सार्वजनिक सुरक्षा व अपघात धोका' : 'Public Safety & Hazard Risk'}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">(35% Weight)</span>
                  </div>
                  <span className="font-mono font-black text-rose-600">{scoreBreakdown.safetyRisk}/100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                    style={{ width: `${scoreBreakdown.safetyRisk}%` }}
                  />
                </div>
              </div>

              {/* Factor 2: Citizen Reports & Density */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>{language === 'mr' ? 'नागरिक तक्रारी संख्या व लोकसंख्या घनता' : 'Citizen Volume & Ward Density'}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">(25% Weight • {scoreBreakdown.citizenReportsCount} {language === 'mr' ? 'तक्रारी' : 'reports'})</span>
                  </div>
                  <span className="font-mono font-black text-blue-600">{scoreBreakdown.citizenDensityScore}/100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div 
                    className="h-full bg-[#0f2942] rounded-full transition-all duration-500" 
                    style={{ width: `${scoreBreakdown.citizenDensityScore}%` }}
                  />
                </div>
              </div>

              {/* Factor 3: Aging & Days Unresolved */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{language === 'mr' ? 'प्रलंबित कालावधी (SLA Aging)' : 'Resolution Delay / SLA Aging'}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">(20% Weight • {scoreBreakdown.daysOpen} {language === 'mr' ? 'दिवस' : 'days'})</span>
                  </div>
                  <span className="font-mono font-black text-amber-600">{scoreBreakdown.agingScore}/100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                    style={{ width: `${scoreBreakdown.agingScore}%` }}
                  />
                </div>
              </div>

              {/* Factor 4: Critical Infrastructure Proximity */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{language === 'mr' ? 'महत्त्वाच्या सार्वजनिक संस्थांचे सान्निध्य' : 'Critical Infrastructure Proximity'}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">(20% Weight)</span>
                  </div>
                  <span className="font-mono font-black text-emerald-600">{scoreBreakdown.criticalFacilityProximityScore}/100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mb-1">
                  <div 
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500" 
                    style={{ width: `${scoreBreakdown.criticalFacilityProximityScore}%` }}
                  />
                </div>
                {scoreBreakdown.facilityDetails && (
                  <div className="text-[11px] text-slate-600 flex items-center gap-1.5 mt-1 font-medium">
                    <span className="text-emerald-700 font-bold">{language === 'mr' ? 'सान्निध्य ठिकाणे:' : 'Proximity nodes:'}</span>
                    <span>{scoreBreakdown.facilityDetails}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mathematical Formula Note */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 font-mono font-medium">
            <span className="text-slate-900 font-bold">{language === 'mr' ? 'गणितीय सूत्र:' : 'Formula:'} </span> 
            Score = (0.35 × Safety) + (0.25 × Density) + (0.20 × SLA_Aging) + (0.20 × Facility_Proximity)
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === 'mr' ? 'आपले कोपारगाव निर्णय प्रणाली v२.४ द्वारे प्रमाणित' : 'Audited & verified by Kopargaon Decision Engine v2.4'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {t.btnClose}
          </button>
        </div>
      </div>
    </div>
  );
};

