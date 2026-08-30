import React from 'react';
import { FilterState } from '../types';
import { WARDS_LIST, CATEGORIES_LIST } from '../data/mockData';
import { Search, RotateCcw, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  totalMatches: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  totalMatches
}) => {
  const { t, getWardName, getCategoryName, language } = useLanguage();
  const { role } = useAuth();

  const handleReset = () => {
    setFilters(prev => ({
      ...prev,
      searchQuery: '',
      category: 'All Categories',
      ward: role === 'officer' ? prev.ward : 'All Wards',
      minUrgency: 0,
      showNeedsReviewOnly: false,
      showScheduledOnly: false,
      showOverriddenOnly: false
    }));
  };

  const isFiltered = 
    filters.searchQuery !== '' ||
    filters.category !== 'All Categories' ||
    (role === 'admin' && filters.ward !== 'All Wards') ||
    filters.minUrgency > 0 ||
    filters.showNeedsReviewOnly ||
    filters.showScheduledOnly ||
    filters.showOverriddenOnly;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 mb-5 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Search & Select Controls */}
        <div className="flex flex-1 flex-wrap sm:flex-nowrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              placeholder={t.searchPlaceholder}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8.5 pr-3 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#0f2942] focus:bg-white transition-colors"
            />
          </div>

          {/* Ward Filter (for Admins) */}
          {role === 'admin' && (
            <div className="w-full sm:w-44">
              <select
                value={filters.ward}
                onChange={(e) => setFilters(prev => ({ ...prev, ward: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0f2942] focus:bg-white transition-colors cursor-pointer"
              >
                {WARDS_LIST.map((w) => (
                  <option key={w} value={w}>{getWardName(w)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Category Filter */}
          <div className="w-full sm:w-44">
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0f2942] focus:bg-white transition-colors cursor-pointer"
            >
              {CATEGORIES_LIST.map((c) => (
                <option key={c} value={c}>{getCategoryName(c)}</option>
              ))}
            </select>
          </div>

          {/* Min Urgency Slider */}
          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight shrink-0">
              {language === 'mr' ? 'किमान तातडी:' : 'Min:'}
            </span>
            <input
              type="range"
              min="0"
              max="90"
              step="10"
              value={filters.minUrgency}
              onChange={(e) => setFilters(prev => ({ ...prev, minUrgency: Number(e.target.value) }))}
              className="w-16 sm:w-20 accent-[#0f2942] h-1 bg-slate-200 rounded-lg cursor-pointer"
            />
            <span className="font-mono font-bold text-[#0f2942] shrink-0 text-[11px]">
              {filters.minUrgency > 0 ? `${filters.minUrgency}+` : 'All'}
            </span>
          </div>
        </div>

        {/* Quick Filter Toggle Chips & Match Count */}
        <div className="flex items-center flex-wrap gap-1.5 justify-between lg:justify-end border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-100">
          <button
            onClick={() => setFilters(prev => ({ ...prev, showScheduledOnly: !prev.showScheduledOnly }))}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filters.showScheduledOnly
                ? 'bg-[#0f2942] text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <CheckCircle className="w-3 h-3" />
            <span>{language === 'mr' ? 'मंजूर' : 'In Sprint'}</span>
          </button>

          <button
            onClick={() => setFilters(prev => ({ ...prev, showNeedsReviewOnly: !prev.showNeedsReviewOnly }))}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filters.showNeedsReviewOnly
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>{language === 'mr' ? 'पडताळणी आवश्यक' : 'Needs Review'}</span>
          </button>

          <button
            onClick={() => setFilters(prev => ({ ...prev, showOverriddenOnly: !prev.showOverriddenOnly }))}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filters.showOverriddenOnly
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>{language === 'mr' ? 'बदलेले' : 'Overridden'}</span>
          </button>

          {isFiltered && (
            <button
              onClick={handleReset}
              title={language === 'mr' ? 'फिल्टर पूर्ववत करा' : 'Reset filters'}
              className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}

          <span className="text-[11px] font-mono text-slate-400 font-medium pl-1">
            {totalMatches} {language === 'mr' ? 'तक्रारी' : 'items'}
          </span>
        </div>

      </div>
    </div>
  );
};
