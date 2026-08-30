import React from 'react';
import { CivicIssue } from '../types';
import { 
  Scale, 
  Trophy, 
  AlertTriangle, 
  Users, 
  Clock, 
  Building2, 
  X, 
  Sparkles, 
  Check, 
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { generateComparisonSummary } from '../utils/scoringEngine';

interface ComparisonModalProps {
  issueA: CivicIssue;
  issueB: CivicIssue;
  isOpen: boolean;
  onClose: () => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  issueA,
  issueB,
  isOpen,
  onClose,
}) => {
  const { language, t, getIssueText, getWardName } = useLanguage();

  if (!isOpen) return null;

  const comparison = generateComparisonSummary(issueA, issueB, language);
  const { winner, loser, isTied, summarySentence, factorDeltas } = comparison;

  const issueTextA = getIssueText(issueA);
  const issueTextB = getIssueText(issueB);

  const getFactorIcon = (factorKey: string) => {
    switch (factorKey) {
      case 'safety':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      case 'density':
        return <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
      case 'aging':
        return <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'proximity':
        return <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      default:
        return <Scale className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden text-slate-900 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-[#0f2942] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/20 text-white uppercase tracking-wider">
                  {language === 'mr' ? 'तुलनात्मक विश्लेषण' : 'Side-by-Side Comparison'}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  {issueA.ticketNumber} vs {issueB.ticketNumber}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                {language === 'mr' ? 'अल्गोरिदम प्राधान्यक्रम तुलना' : 'Algorithmic Priority Comparison'}
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">

          {/* Plain-Language Net Priority Summary Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200/90 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-900 mb-1.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{language === 'mr' ? 'अंतिम प्राधान्यक्रम निष्कर्ष व कारण' : 'Net Priority Rationale Summary'}</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
              "{summarySentence}"
            </p>
          </div>

          {/* Side-by-Side Issue Header Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Issue A Card */}
            <div className={`p-4 rounded-xl border transition-all ${
              winner.id === issueA.id && !isTied
                ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 border border-blue-200 text-blue-950">
                    {issueA.ticketNumber}
                  </span>
                  <span className="text-xs font-black text-slate-600">
                    #{issueA.currentRank < 10 ? `0${issueA.currentRank}` : issueA.currentRank}
                  </span>
                </div>
                {winner.id === issueA.id && !isTied && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-slate-950 shadow-2xs">
                    <Trophy className="w-3 h-3 text-slate-950" />
                    {language === 'mr' ? 'उच्च प्राधान्य' : 'Higher Rank'}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{issueTextA.title}</h4>
              <div className="mt-1 text-xs text-slate-500 font-medium">
                {getWardName(issueA.ward)} • {issueTextA.landmark}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-200/80">
                <span className="font-semibold text-slate-500">{language === 'mr' ? 'अंतिम तातडी गुण:' : 'Composite Score:'}</span>
                <span className={`font-mono font-black text-sm ${
                  winner.id === issueA.id ? 'text-blue-700' : 'text-slate-700'
                }`}>
                  {issueA.urgencyScore.toFixed(0)}/100
                </span>
              </div>
            </div>

            {/* Issue B Card */}
            <div className={`p-4 rounded-xl border transition-all ${
              winner.id === issueB.id && !isTied
                ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 border border-blue-200 text-blue-950">
                    {issueB.ticketNumber}
                  </span>
                  <span className="text-xs font-black text-slate-600">
                    #{issueB.currentRank < 10 ? `0${issueB.currentRank}` : issueB.currentRank}
                  </span>
                </div>
                {winner.id === issueB.id && !isTied && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-slate-950 shadow-2xs">
                    <Trophy className="w-3 h-3 text-slate-950" />
                    {language === 'mr' ? 'उच्च प्राधान्य' : 'Higher Rank'}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{issueTextB.title}</h4>
              <div className="mt-1 text-xs text-slate-500 font-medium">
                {getWardName(issueB.ward)} • {issueTextB.landmark}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-200/80">
                <span className="font-semibold text-slate-500">{language === 'mr' ? 'अंतिम तातडी गुण:' : 'Composite Score:'}</span>
                <span className={`font-mono font-black text-sm ${
                  winner.id === issueB.id ? 'text-blue-700' : 'text-slate-700'
                }`}>
                  {issueB.urgencyScore.toFixed(0)}/100
                </span>
              </div>
            </div>

          </div>

          {/* Factor-by-Factor Comparative Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
              <span>{language === 'mr' ? 'घटकनिहाय तुलनात्मक मूल्यमापन' : 'Factor-by-Factor Comparative Analysis'}</span>
              <span className="font-mono text-[11px] text-slate-500 font-semibold">(Weighted Formula Comparison)</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {factorDeltas.map((item) => {
                const valA = issueA.scoreBreakdown[
                  item.factorKey === 'safety' ? 'safetyRisk' :
                  item.factorKey === 'density' ? 'citizenDensityScore' :
                  item.factorKey === 'aging' ? 'agingScore' : 'criticalFacilityProximityScore'
                ];
                const valB = issueB.scoreBreakdown[
                  item.factorKey === 'safety' ? 'safetyRisk' :
                  item.factorKey === 'density' ? 'citizenDensityScore' :
                  item.factorKey === 'aging' ? 'agingScore' : 'criticalFacilityProximityScore'
                ];

                const weightRatio = item.weightPercent / 100;
                const weightedA = valA * weightRatio;
                const weightedB = valB * weightRatio;

                const isAWin = valA > valB;
                const isBWin = valB > valA;
                const isTieFactor = valA === valB;

                return (
                  <div key={item.factorKey} className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Factor Name & Weight */}
                      <div className="sm:w-1/3 space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          {getFactorIcon(item.factorKey)}
                          <span>{language === 'mr' ? item.nameMr : item.nameEn}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Formula Weight: <strong>{item.weightPercent}%</strong>
                        </div>
                      </div>

                      {/* Values Comparison */}
                      <div className="sm:w-2/3 grid grid-cols-2 gap-3 items-center">
                        
                        {/* Issue A Value */}
                        <div className={`p-2 rounded-lg border flex items-center justify-between ${
                          isAWin
                            ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-950 ring-1 ring-emerald-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          <div className="space-y-0.5">
                            <div className="font-mono text-xs font-black">
                              {valA}/100
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              +{weightedA.toFixed(1)} pts
                            </div>
                          </div>
                          {isAWin && (
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" />
                              {language === 'mr' ? 'उच्च' : 'Higher'}
                            </span>
                          )}
                        </div>

                        {/* Issue B Value */}
                        <div className={`p-2 rounded-lg border flex items-center justify-between ${
                          isBWin
                            ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-950 ring-1 ring-emerald-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          <div className="space-y-0.5">
                            <div className="font-mono text-xs font-black">
                              {valB}/100
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              +{weightedB.toFixed(1)} pts
                            </div>
                          </div>
                          {isBWin && (
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" />
                              {language === 'mr' ? 'उच्च' : 'Higher'}
                            </span>
                          )}
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mathematical Formula Note */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-mono">
            <span className="text-slate-900 font-bold">{language === 'mr' ? 'सूत्र:' : 'Formula:'} </span> 
            Urgency = (0.35 × Safety) + (0.25 × Density) + (0.20 × SLA_Aging) + (0.20 × Facility_Proximity)
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {language === 'mr' ? 'तुलनात्मक पृथक्करण कोपरगाव निर्णय प्रणाली v२.४' : 'Side-by-Side Audit by Kopargaon Engine v2.4'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#0f2942] hover:bg-[#1e3a8a] rounded-lg transition-colors cursor-pointer"
          >
            {t.btnClose}
          </button>
        </div>
      </div>
    </div>
  );
};
