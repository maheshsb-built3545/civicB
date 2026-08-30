import React from 'react';
import { CivicIssue } from '../types';
import { 
  Coins, 
  Clock, 
  Sparkles, 
  RotateCcw,
  Calendar,
  Settings2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';

interface ResourceLedgerProps {
  issues: CivicIssue[];
  onAutoFitSprint: () => void;
  onClearSprint: () => void;
  onOpenBudgetSettings?: () => void;
}

export const ResourceLedger: React.FC<ResourceLedgerProps> = ({
  issues,
  onAutoFitSprint,
  onClearSprint,
  onOpenBudgetSettings
}) => {
  const { language, t } = useLanguage();
  const { role } = useAuth();
  const { 
    totalBudget, 
    totalCrewHours, 
    allocatedBudget: committedBudget, 
    allocatedCrewHours: committedCrewHours, 
    remainingBudget, 
    remainingCrewHours, 
    cycleName, 
    cycleDaysRemaining, 
    cycleStartDate, 
    cycleEndDate 
  } = useBudget();

  const actionedIssues = issues.filter((i) => i.isActionedThisCycle);
  const mandatedIssues = actionedIssues.filter((i) => i.isOverridden);
  const aiOptimizedIssues = actionedIssues.filter((i) => !i.isOverridden);

  const mandatedBudget = mandatedIssues.reduce((sum, i) => sum + i.estimatedCostInr, 0);
  const aiOptimizedBudget = aiOptimizedIssues.reduce((sum, i) => sum + i.estimatedCostInr, 0);

  const budgetUsagePercent = Math.min(100, Math.round((committedBudget / (totalBudget || 1)) * 100));
  const crewUsagePercent = Math.min(100, Math.round((committedCrewHours / (totalCrewHours || 1)) * 100));

  const isOverBudget = remainingBudget < 0;
  const isOverCrewHours = remainingCrewHours < 0;

  const formatInr = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatLakhs = (amount: number) => {
    const valInLakh = (amount / 100000).toFixed(2);
    return `₹${valInLakh}L`;
  };

  return (
    <div className="bg-[#fffdfa] border border-[#e3dacd] rounded-sm p-4 sm:p-5 shadow-xs mb-5">
      {/* Top Meta Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e3dacd]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm font-mono text-xs font-black uppercase tracking-wider bg-[#f4efe6] text-[#24211e] border border-[#c4b6a3]">
            <span className="w-2 h-2 rounded-full bg-amber-700 animate-pulse" />
            OFFICIAL GAZETTE // {cycleName}
          </span>
          <span className="text-xs font-mono font-bold text-[#59534c] flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#8c8275]" />
            <span>{cycleStartDate} - {cycleEndDate}</span>
            <span className="font-extrabold text-[#24211e]">({cycleDaysRemaining} {language === 'mr' ? 'दिवस शिल्लक' : 'days remaining'})</span>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {role === 'admin' && onOpenBudgetSettings && (
            <button
              onClick={onOpenBudgetSettings}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold text-[#24211e] bg-[#f4efe6] hover:bg-[#e7e0d6] rounded-sm border border-[#c4b6a3] transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-[#6b2d18]" />
              <span>{language === 'mr' ? 'बजेट मर्यादा' : 'Limits'}</span>
            </button>
          )}

          <button
            onClick={onAutoFitSprint}
            title={language === 'mr' ? 'कमाल तातडीची कामे स्वयंचलित निवडा' : 'Auto-select highest priority issues within limits'}
            className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-mono font-bold text-[#fffdfa] bg-[#24211e] hover:bg-[#3a352e] rounded-sm shadow-xs border border-black transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.btnAutoFit}</span>
          </button>

          {actionedIssues.length > 0 && (
            <button
              onClick={onClearSprint}
              title={t.btnResetSprint}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold text-[#59534c] hover:text-rose-900 bg-[#fffdfa] hover:bg-rose-50 rounded-sm border border-[#c4b6a3] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">{t.btnResetSprint}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Streamlined KPI Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3.5">
        
        {/* Metric 1: Budget Pool */}
        <div className={`p-3.5 rounded-sm border transition-all ${
          isOverBudget ? 'bg-rose-50/70 border-rose-300' : 'bg-[#fbf9f4] border-[#e3dacd]'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-serif font-bold text-[#24211e] flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-800" />
              <span>{t.budgetCapacity}</span>
            </span>
            <span className="font-mono text-[11px] text-[#59534c] font-bold">
              {formatLakhs(totalBudget)} {language === 'mr' ? 'मर्यादा' : 'Cap'}
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-2xl font-black font-mono text-[#24211e]">
              {formatInr(committedBudget)}
            </div>
            <div className={`text-xs font-mono font-bold ${isOverBudget ? 'text-rose-900 font-black' : 'text-emerald-900'}`}>
              {isOverBudget ? `-${formatInr(Math.abs(remainingBudget))}` : `${formatInr(remainingBudget)} left`}
            </div>
          </div>

          <div className="mt-2">
            <div className="w-full h-2 rounded-xs bg-[#e3dacd] overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-xs transition-all duration-300 ${
                  isOverBudget ? 'bg-rose-700' : budgetUsagePercent > 80 ? 'bg-amber-700' : 'bg-emerald-800'
                }`}
                style={{ width: `${Math.min(100, (committedBudget / (totalBudget || 1)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#59534c] mt-1 font-mono font-bold">
              <span>{budgetUsagePercent}% {language === 'mr' ? 'वापर' : 'Committed'}</span>
              {isOverBudget && (
                <span className="text-rose-900 font-extrabold flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3" /> Deficit
                </span>
              )}
            </div>

            {/* Mandated vs AI Optimized breakdown subtext */}
            <div className="mt-1.5 pt-1.5 border-t border-[#e3dacd] flex items-center justify-between text-[10px] font-mono">
              <span className="text-purple-950 font-extrabold flex items-center gap-1">
                ⚡ {language === 'mr' ? 'अधिकारी' : 'Mandated'}: {formatLakhs(mandatedBudget)}
              </span>
              <span className="text-blue-950 font-extrabold flex items-center gap-1">
                🤖 {language === 'mr' ? 'एआय' : 'AI'}: {formatLakhs(aiOptimizedBudget)}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Labor Capacity */}
        <div className={`p-3.5 rounded-sm border transition-all ${
          isOverCrewHours ? 'bg-rose-50/70 border-rose-300' : 'bg-[#fbf9f4] border-[#e3dacd]'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-serif font-bold text-[#24211e] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-800" />
              <span>{t.laborCapacity}</span>
            </span>
            <span className="font-mono text-[11px] text-[#59534c] font-bold">
              {totalCrewHours}h {language === 'mr' ? 'एकूण' : 'Pool'}
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-2xl font-black font-mono text-[#24211e]">
              {committedCrewHours} <span className="text-xs font-mono font-bold text-[#59534c]">hrs</span>
            </div>
            <div className={`text-xs font-mono font-bold ${isOverCrewHours ? 'text-rose-900 font-black' : 'text-blue-900'}`}>
              {isOverCrewHours ? `+${Math.abs(remainingCrewHours)}h deficit` : `${remainingCrewHours}h left`}
            </div>
          </div>

          <div className="mt-2">
            <div className="w-full h-2 rounded-xs bg-[#e3dacd] overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-xs transition-all duration-300 ${
                  isOverCrewHours ? 'bg-rose-700' : crewUsagePercent > 80 ? 'bg-amber-700' : 'bg-[#24211e]'
                }`}
                style={{ width: `${Math.min(100, (committedCrewHours / (totalCrewHours || 1)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#59534c] mt-1 font-mono font-bold">
              <span>{crewUsagePercent}% {language === 'mr' ? 'नियोजित' : 'Scheduled'}</span>
              {isOverCrewHours && (
                <span className="text-rose-900 font-extrabold flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3" /> Exceeded
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metric 3: Active Sprint Work Orders */}
        <div className="p-3.5 rounded-sm bg-[#fbf9f4] border border-[#e3dacd] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="font-serif font-bold text-[#24211e] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
              <span>{language === 'mr' ? 'मंजूर कामाचे आदेश' : 'Committed Orders'}</span>
            </span>
            <span className="font-mono text-[11px] font-bold text-[#24211e] bg-[#f4efe6] px-2 py-0.5 rounded-sm border border-[#c4b6a3]">
              {actionedIssues.length} / {issues.length}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-[#59534c] font-medium font-serif">
              {language === 'mr' ? 'सरासरी तातडी गुण' : 'Avg Urgency Score'}
            </span>
            <span className="font-mono font-black text-[#24211e] text-base">
              {actionedIssues.length > 0
                ? Math.round(actionedIssues.reduce((s, i) => s + i.urgencyScore, 0) / actionedIssues.length)
                : 0}
              <span className="text-[#8c8275] text-xs font-normal">/100</span>
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-[#e3dacd] text-[11px] font-mono text-[#59534c] flex items-center justify-between">
            <span>{actionedIssues.length > 0 ? (language === 'mr' ? 'कामाचे आदेश तयार' : 'Work orders ready') : (language === 'mr' ? 'कामे निवडा' : 'Select issues to commit')}</span>
            <span className="font-bold text-[#24211e]">{actionedIssues.length} active</span>
          </div>
        </div>

      </div>
    </div>
  );
};

