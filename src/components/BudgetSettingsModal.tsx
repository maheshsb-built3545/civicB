import React, { useState } from 'react';
import { 
  Coins, 
  Clock, 
  Calendar, 
  Settings2, 
  X, 
  Check, 
  AlertCircle,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { useLanguage } from '../i18n/LanguageContext';

interface BudgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const BudgetSettingsModal: React.FC<BudgetSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const { 
    budgetSettings, 
    updateBudgetSettings, 
    allocatedBudget, 
    allocatedCrewHours 
  } = useBudget();
  const { language, t } = useLanguage();

  const [totalBudget, setTotalBudget] = useState<number>(budgetSettings.totalBudget);
  const [totalCrewHours, setTotalCrewHours] = useState<number>(budgetSettings.totalCrewHours);
  const [cycleName, setCycleName] = useState<string>(budgetSettings.cycleName);
  const [cycleStartDate, setCycleStartDate] = useState<string>(budgetSettings.cycleStartDate);
  const [cycleEndDate, setCycleEndDate] = useState<string>(budgetSettings.cycleEndDate);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleApplyPreset = (presetType: 'weekly' | 'fortnightly' | 'monsoon_emergency') => {
    if (presetType === 'weekly') {
      setTotalBudget(650000);
      setTotalCrewHours(180);
      setCycleName('Weekly Rapid Response Sprint (7 Days)');
    } else if (presetType === 'fortnightly') {
      setTotalBudget(1250000);
      setTotalCrewHours(360);
      setCycleName('Fortnightly Municipal Sprint (15 Days)');
    } else if (presetType === 'monsoon_emergency') {
      setTotalBudget(2500000);
      setTotalCrewHours(600);
      setCycleName('Monsoon High-Alert Emergency Contingency Phase');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // =========================================================================
      // [EXPRESS BACKEND INTEGRATION POINT]
      // In production, updateBudgetSettings calls:
      // PUT /api/budget { totalBudget, totalCrewHours, cycleStartDate, cycleEndDate, cycleName }
      // =========================================================================
      await updateBudgetSettings({
        totalBudget,
        totalCrewHours,
        cycleName,
        cycleStartDate,
        cycleEndDate
      });

      setSavedSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch {
      // handle error
    } finally {
      setIsSaving(false);
    }
  };

  const projectedRemainingBudget = totalBudget - allocatedBudget;
  const projectedRemainingCrewHours = totalCrewHours - allocatedCrewHours;

  const formatInr = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-[#0f2942] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-400/30">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                {language === 'mr' ? 'प्रशासकीय बजेट व संसाधन मर्यादा' : 'Sprint Budget & Capacity Settings'}
              </h2>
              <p className="text-xs text-slate-300">
                {language === 'mr' ? 'कोपरगाव नगर परिषद • प्रशासकीय अधिकार' : 'Kopargaon Municipal Council • Administrative Control'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
          {/* Presets Row */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {language === 'mr' ? 'द्रुत नियोजन साचे (Quick Presets):' : 'Sprint Capacity Presets:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('weekly')}
                className="p-2 text-center rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-xs font-bold text-slate-700 transition-all"
              >
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Weekly</div>
                <div className="font-mono text-blue-900 font-bold">₹6.5L • 180h</div>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('fortnightly')}
                className="p-2 text-center rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-xs font-bold text-slate-700 transition-all"
              >
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Fortnight</div>
                <div className="font-mono text-blue-900 font-bold">₹12.5L • 360h</div>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('monsoon_emergency')}
                className="p-2 text-center rounded-lg border border-rose-200 hover:border-rose-400 hover:bg-rose-50/50 text-xs font-bold text-rose-900 transition-all"
              >
                <div className="text-[10px] text-rose-500 font-semibold uppercase">High Alert</div>
                <div className="font-mono text-rose-900 font-bold">₹25.0L • 600h</div>
              </button>
            </div>
          </div>

          {/* Cycle Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {language === 'mr' ? 'कार्य चक्राचे नाव / टप्पा' : 'Sprint Cycle Title / Operational Phase'}
            </label>
            <input
              type="text"
              required
              value={cycleName}
              onChange={(e) => setCycleName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Cycle #18: Aug 15 - Aug 31 (Monsoon Contingency)"
            />
          </div>

          {/* Budget and Crew Hours Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total Budget */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{language === 'mr' ? 'एकूण मंजूर निधी (₹)' : 'Total Cycle Budget (₹)'}</span>
                </span>
                <span className="font-mono text-[11px] font-bold text-emerald-700">
                  {(totalBudget / 100000).toFixed(2)} Lakhs
                </span>
              </label>
              <input
                type="number"
                min="10000"
                step="10000"
                required
                value={totalBudget}
                onChange={(e) => setTotalBudget(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <div className="text-[10px] text-slate-500 mt-1 font-medium">
                {language === 'mr' ? 'सध्या मंजूर कामांचा खर्च:' : 'Currently committed:'} <span className="font-mono font-bold">{formatInr(allocatedBudget)}</span>
              </div>
            </div>

            {/* Total Crew Hours */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>{language === 'mr' ? 'एकूण मनुष्यबळ (तास)' : 'Total Crew Hours (hrs)'}</span>
                </span>
                <span className="font-mono text-[11px] font-bold text-blue-700">
                  {totalCrewHours} hrs
                </span>
              </label>
              <input
                type="number"
                min="10"
                step="10"
                required
                value={totalCrewHours}
                onChange={(e) => setTotalCrewHours(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-[10px] text-slate-500 mt-1 font-medium">
                {language === 'mr' ? 'सध्या वापरलेले तास:' : 'Currently committed:'} <span className="font-mono font-bold">{allocatedCrewHours} hrs</span>
              </div>
            </div>
          </div>

          {/* Cycle Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{language === 'mr' ? 'चक्र सुरू दिनांक' : 'Cycle Start Date'}</span>
              </label>
              <input
                type="date"
                required
                value={cycleStartDate}
                onChange={(e) => setCycleStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{language === 'mr' ? 'चक्र समाप्ती दिनांक' : 'Cycle End Date'}</span>
              </label>
              <input
                type="date"
                required
                value={cycleEndDate}
                onChange={(e) => setCycleEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Projected Impact Preview Card */}
          <div className={`p-4 rounded-xl border ${
            projectedRemainingBudget < 0 || projectedRemainingCrewHours < 0
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide mb-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>{language === 'mr' ? 'बदलांनंतर शिल्लक संसाधने अंदाज:' : 'Projected Balance After Adjustment:'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">{language === 'mr' ? 'शिल्लक निधी' : 'Remaining Budget'}</div>
                <div className={`text-sm font-black font-mono mt-0.5 ${
                  projectedRemainingBudget < 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}>
                  {formatInr(projectedRemainingBudget)}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">{language === 'mr' ? 'शिल्लक तास' : 'Remaining Crew'}</div>
                <div className={`text-sm font-black font-mono mt-0.5 ${
                  projectedRemainingCrewHours < 0 ? 'text-rose-600' : 'text-blue-700'
                }`}>
                  {projectedRemainingCrewHours} hrs
                </div>
              </div>
            </div>
            {(projectedRemainingBudget < 0 || projectedRemainingCrewHours < 0) && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-700 mt-2 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {language === 'mr' 
                    ? 'चेतावणी: नवीन मर्यादा सध्या आधीच निवडलेल्या कामांपेक्षा कमी आहे.' 
                    : 'Warning: New capacity threshold is lower than currently scheduled work orders.'}
                </span>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {t.btnCancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#0f2942] hover:bg-[#1e3a8a] rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'mr' ? 'बदल जतन केले!' : 'Settings Saved!'}</span>
                </>
              ) : isSaving ? (
                <span>{language === 'mr' ? 'जतन करत आहे...' : 'Saving...'}</span>
              ) : (
                <span>{language === 'mr' ? 'बजेट मर्यादा जतन करा' : 'Update Budget & Capacity'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
