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
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm mb-6">
      
      {/* Top Meta Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-50 text-blue-900 border border-blue-200/80 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>{cycleName}</span>
          </span>
          <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{cycleStartDate} - {cycleEndDate}</span>
            <span className="font-extrabold text-slate-800">({cycleDaysRemaining} {language === 'mr' ? 'दिवस शिल्लक' : 'days left'})</span>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {role === 'admin' && onOpenBudgetSettings && (
            <button
              onClick={onOpenBudgetSettings}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{language === 'mr' ? 'बजेट मर्यादा' : 'Limits'}</span>
            </button>
          )}

          <button
            onClick={onAutoFitSprint}
            title={language === 'mr' ? 'कमाल तातडीची कामे स्वयंचलित निवडा' : 'Auto-select highest priority issues within limits'}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-blue-600 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{t.btnAutoFit}</span>
          </button>

          {actionedIssues.length > 0 && (
            <button
              onClick={onClearSprint}
              title={t.btnResetSprint}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t.btnResetSprint}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Premium SaaS Analytics Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
        
        {/* Metric 1: Budget Pool */}
        <div className={`p-6 rounded-2xl border transition-all ${
          isOverBudget ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/60 border-slate-200/80 hover:shadow-md'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-600 shrink-0" />
              <span>{t.budgetCapacity}</span>
            </span>
            <span className="font-mono text-xs font-extrabold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80">
              {formatLakhs(totalBudget)} {language === 'mr' ? 'मर्यादा' : 'Cap'}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 tracking-tight">
              {formatInr(committedBudget)}
            </div>
          </div>

          <div className="mt-2 text-sm font-mono font-bold flex items-center justify-between">
            <span className={isOverBudget ? 'text-rose-600 font-extrabold' : 'text-emerald-700'}>
              {isOverBudget ? `-${formatInr(Math.abs(remainingBudget))}` : `${formatInr(remainingBudget)} left`}
            </span>
            <span className="text-slate-500">{budgetUsagePercent}% {language === 'mr' ? 'वापर' : 'used'}</span>
          </div>

          {/* Gradient Progress Bar */}
          <div className="mt-3">
            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  isOverBudget 
                    ? 'bg-gradient-to-r from-rose-500 to-red-600' 
                    : budgetUsagePercent > 80 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                }`}
                style={{ width: `${Math.min(100, (committedBudget / (totalBudget || 1)) * 100)}%` }}
              />
            </div>

            {/* Mandated vs AI Breakdown Subtext */}
            <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-purple-800 flex items-center gap-1">
                ⚡ {language === 'mr' ? 'अधिकारी' : 'Mandated'}: {formatLakhs(mandatedBudget)}
              </span>
              <span className="text-blue-800 flex items-center gap-1">
                🤖 {language === 'mr' ? 'एआय' : 'AI'}: {formatLakhs(aiOptimizedBudget)}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Labor Capacity */}
        <div className={`p-6 rounded-2xl border transition-all ${
          isOverCrewHours ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/60 border-slate-200/80 hover:shadow-md'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>{t.laborCapacity}</span>
            </span>
            <span className="font-mono text-xs font-extrabold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80">
              {totalCrewHours}h {language === 'mr' ? 'एकूण' : 'Pool'}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 tracking-tight">
              {committedCrewHours} <span className="text-base font-semibold text-slate-500">hrs</span>
            </div>
          </div>

          <div className="mt-2 text-sm font-mono font-bold flex items-center justify-between">
            <span className={isOverCrewHours ? 'text-rose-600 font-extrabold' : 'text-blue-700'}>
              {isOverCrewHours ? `+${Math.abs(remainingCrewHours)}h deficit` : `${remainingCrewHours}h left`}
            </span>
            <span className="text-slate-500">{crewUsagePercent}% {language === 'mr' ? 'नियोजित' : 'used'}</span>
          </div>

          {/* Gradient Progress Bar */}
          <div className="mt-3">
            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  isOverCrewHours 
                    ? 'bg-gradient-to-r from-rose-500 to-red-600' 
                    : crewUsagePercent > 80 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600' 
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                }`}
                style={{ width: `${Math.min(100, (committedCrewHours / (totalCrewHours || 1)) * 100)}%` }}
              />
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs font-mono text-slate-500 font-medium">
              <span>{language === 'mr' ? 'एकूण तासही मर्यादा आधारित' : 'Optimized for crew hours'}</span>
              <span className="font-bold text-slate-800">{committedCrewHours} / {totalCrewHours}h</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Active Sprint Work Orders */}
        <div className="p-6 rounded-2xl bg-slate-50/60 border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{language === 'mr' ? 'मंजूर कामाचे आदेश' : 'Committed Orders'}</span>
              </span>
              <span className="font-mono text-xs font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {actionedIssues.length} / {issues.length}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 tracking-tight">
                {actionedIssues.length} <span className="text-base font-medium text-slate-500">{language === 'mr' ? 'कामे' : 'issues'}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>{language === 'mr' ? 'सरासरी तातडी गुण' : 'Avg Urgency Score'}</span>
              <span className="font-mono font-extrabold text-slate-900 text-sm">
                {actionedIssues.length > 0
                  ? Math.round(actionedIssues.reduce((s, i) => s + i.urgencyScore, 0) / actionedIssues.length)
                  : 0}
                <span className="text-slate-400 text-xs font-normal">/100</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>{actionedIssues.length > 0 ? (language === 'mr' ? 'कामाचे आदेश तयार' : 'Work orders active') : (language === 'mr' ? 'कामे निवडा' : 'Select issues to commit')}</span>
              <span className="font-mono font-bold text-slate-700">{actionedIssues.length} committed</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};


