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
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs mb-5">
      {/* Top Meta Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-blue-50 text-[#0f2942] border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            {cycleName}
          </span>
          <span className="text-xs font-mono font-medium text-slate-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{cycleStartDate} - {cycleEndDate}</span>
            <span className="font-bold text-slate-700">({cycleDaysRemaining} {language === 'mr' ? 'दिवस शिल्लक' : 'days left'})</span>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {role === 'admin' && onOpenBudgetSettings && (
            <button
              onClick={onOpenBudgetSettings}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{language === 'mr' ? 'बजेट मर्यादा' : 'Limits'}</span>
            </button>
          )}

          <button
            onClick={onAutoFitSprint}
            title={language === 'mr' ? 'कमाल तातडीची कामे स्वयंचलित निवडा' : 'Auto-select highest priority issues within limits'}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-[#0f2942] hover:bg-[#1b3f66] rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.btnAutoFit}</span>
          </button>

          {actionedIssues.length > 0 && (
            <button
              onClick={onClearSprint}
              title={t.btnResetSprint}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
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
        <div className={`p-3.5 rounded-xl border transition-all ${
          isOverBudget ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50/60 border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>{t.budgetCapacity}</span>
            </span>
            <span className="font-mono text-[11px] text-slate-500 font-bold">
              {formatLakhs(totalBudget)} {language === 'mr' ? 'मर्यादा' : 'Cap'}
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-black font-mono text-slate-900">
              {formatInr(committedBudget)}
            </div>
            <div className={`text-xs font-mono font-bold ${isOverBudget ? 'text-rose-600' : 'text-emerald-700'}`}>
              {isOverBudget ? `-${formatInr(Math.abs(remainingBudget))}` : `${formatInr(remainingBudget)} left`}
            </div>
          </div>

          <div className="mt-2">
            <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  isOverBudget ? 'bg-rose-500' : budgetUsagePercent > 80 ? 'bg-amber-500' : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.min(100, (committedBudget / (totalBudget || 1)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono font-medium">
              <span>{budgetUsagePercent}% {language === 'mr' ? 'वापर' : 'Committed'}</span>
              {isOverBudget && (
                <span className="text-rose-600 font-bold flex items-center gap-0.5">
                  <AlertCircle className="w-2.5 h-2.5" /> Deficit
                </span>
              )}
            </div>

            {/* Mandated vs AI Optimized breakdown subtext */}
            <div className="mt-1.5 pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-[10px] font-mono">
              <span className="text-purple-800 font-extrabold flex items-center gap-1">
                ⚡ {language === 'mr' ? 'अधिकारी' : 'Mandated'}: {formatLakhs(mandatedBudget)}
              </span>
              <span className="text-blue-800 font-extrabold flex items-center gap-1">
                🤖 {language === 'mr' ? 'एआय' : 'AI'}: {formatLakhs(aiOptimizedBudget)}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Labor Capacity */}
        <div className={`p-3.5 rounded-xl border transition-all ${
          isOverCrewHours ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50/60 border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{t.laborCapacity}</span>
            </span>
            <span className="font-mono text-[11px] text-slate-500 font-bold">
              {totalCrewHours}h {language === 'mr' ? 'एकूण' : 'Pool'}
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-black font-mono text-slate-900">
              {committedCrewHours} <span className="text-xs font-semibold text-slate-500">hrs</span>
            </div>
            <div className={`text-xs font-mono font-bold ${isOverCrewHours ? 'text-rose-600' : 'text-blue-700'}`}>
              {isOverCrewHours ? `+${Math.abs(remainingCrewHours)}h deficit` : `${remainingCrewHours}h left`}
            </div>
          </div>

          <div className="mt-2">
            <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  isOverCrewHours ? 'bg-rose-500' : crewUsagePercent > 80 ? 'bg-amber-500' : 'bg-[#0f2942]'
                }`}
                style={{ width: `${Math.min(100, (committedCrewHours / (totalCrewHours || 1)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono font-medium">
              <span>{crewUsagePercent}% {language === 'mr' ? 'नियोजित' : 'Scheduled'}</span>
              {isOverCrewHours && (
                <span className="text-rose-600 font-bold flex items-center gap-0.5">
                  <AlertCircle className="w-2.5 h-2.5" /> Exceeded
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metric 3: Active Sprint Work Orders */}
        <div className="p-3.5 rounded-xl bg-slate-50/60 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'mr' ? 'मंजूर कामाचे आदेश' : 'Committed Orders'}</span>
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
              {actionedIssues.length} / {issues.length}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              {language === 'mr' ? 'सरासरी तातडी गुण' : 'Avg Urgency Score'}
            </span>
            <span className="font-mono font-black text-slate-900 text-sm">
              {actionedIssues.length > 0
                ? Math.round(actionedIssues.reduce((s, i) => s + i.urgencyScore, 0) / actionedIssues.length)
                : 0}
              <span className="text-slate-400 text-xs font-normal">/100</span>
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{actionedIssues.length > 0 ? (language === 'mr' ? 'कामाचे आदेश तयार' : 'Work orders ready') : (language === 'mr' ? 'कामे निवडा' : 'Select issues to commit')}</span>
            <span className="font-mono text-slate-400">{actionedIssues.length} active</span>
          </div>
        </div>

      </div>
    </div>
  );
};
