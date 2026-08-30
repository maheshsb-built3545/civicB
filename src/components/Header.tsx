import React from 'react';
import { 
  Layers, 
  History, 
  AlertOctagon, 
  Plus, 
  Settings2, 
  LogOut, 
  ShieldCheck, 
  UserCheck, 
  Coins,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeTab: 'queue' | 'review' | 'audit';
  setActiveTab: (tab: 'queue' | 'review' | 'audit') => void;
  needsReviewCount: number;
  totalIssuesCount: number;
  actionedCount: number;
  remainingBudgetInr?: number;
  remainingCrewHours?: number;
  onOpenNewIssueModal: () => void;
  onOpenBudgetSettings?: () => void;
  onSwitchToCitizenView?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  needsReviewCount,
  totalIssuesCount,
  actionedCount,
  remainingBudgetInr = 1250000,
  remainingCrewHours = 360,
  onOpenNewIssueModal,
  onOpenBudgetSettings,
  onSwitchToCitizenView
}) => {
  const { language, setLanguage, t, getWardName } = useLanguage();
  const { user, role, logout } = useAuth();

  const formatLakhs = (amount: number) => {
    const valInLakh = (amount / 100000).toFixed(1);
    return language === 'mr' ? `₹${valInLakh}L` : `₹${valInLakh}L`;
  };

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
      {/* Top Tricolor Ribbon for Civic Consistency */}
      <div className="h-1 w-full flex">
        <div className="h-full w-1/3 bg-[#ff9933]"></div>
        <div className="h-full w-1/3 bg-white"></div>
        <div className="h-full w-1/3 bg-[#138808]"></div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Left: Brand Identity & Role Tag */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#0f2942] text-amber-400 font-black text-xs tracking-wider shadow-xs">
              KPG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                  {t.portalTitle}
                </span>
                {user && (
                  <span className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    role === 'admin' 
                      ? 'bg-purple-50 text-purple-800 border-purple-200' 
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {role === 'admin' ? (
                      <>
                        <ShieldCheck className="w-3 h-3 text-purple-600" />
                        <span>{language === 'mr' ? 'प्रशासक' : 'Admin'}</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3 h-3 text-emerald-600" />
                        <span>{getWardName(user.ward)}</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden md:block leading-none mt-0.5">
                {t.councilTitle}
              </p>
            </div>
          </div>

          {/* Center: Clean Tab Navigation */}
          <nav className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'queue'
                  ? 'bg-white text-[#0f2942] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{language === 'mr' ? 'प्राधान्य यादी' : 'Queue'}</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700">
                {totalIssuesCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('review')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'review'
                  ? 'bg-white text-amber-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
              <span>{language === 'mr' ? 'पडताळणी' : 'Verification'}</span>
              {needsReviewCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                  {needsReviewCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'audit'
                  ? 'bg-white text-[#0f2942] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <History className="w-3.5 h-3.5 text-purple-600" />
              <span>{language === 'mr' ? 'ऑडिट ट्रेल' : 'Audit'}</span>
            </button>
          </nav>

          {/* Right: Actions, Language & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Capacity Indicators */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono">
              <span className={`font-bold flex items-center gap-1 ${remainingBudgetInr < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                <Coins className="w-3.5 h-3.5 opacity-70" />
                {formatLakhs(remainingBudgetInr)}
              </span>
              <span className="text-slate-300">|</span>
              <span className={`font-bold flex items-center gap-1 ${remainingCrewHours < 0 ? 'text-rose-600' : 'text-blue-700'}`}>
                <Clock className="w-3.5 h-3.5 opacity-70" />
                {remainingCrewHours}h
              </span>
            </div>

            {/* Ingest Action Button */}
            <button
              onClick={onOpenNewIssueModal}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[#0f2942] hover:bg-[#1b3f66] rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{t.btnIngestNew}</span>
              <span className="sm:hidden">{language === 'mr' ? 'नोंदवा' : 'New'}</span>
            </button>

            {/* Admin Settings Button */}
            {role === 'admin' && onOpenBudgetSettings && (
              <button
                onClick={onOpenBudgetSettings}
                title={language === 'mr' ? 'बजेट सेटिंग्ज' : 'Budget Settings'}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                <Settings2 className="w-4 h-4 text-blue-600" />
              </button>
            )}

            {/* Citizen Portal View Switch */}
            {onSwitchToCitizenView && (
              <button
                onClick={onSwitchToCitizenView}
                title={language === 'mr' ? 'नागरिक तक्रार कक्ष पहा' : 'View Citizen Portal'}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-200"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>{language === 'mr' ? 'नागरिक पोर्टल' : 'Citizen View'}</span>
              </button>
            )}

            {/* Compact Language Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-[11px] font-bold">
              <button
                onClick={() => setLanguage('mr')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  language === 'mr' ? 'bg-white text-[#0f2942] shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                मराठी
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  language === 'en' ? 'bg-white text-[#0f2942] shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                EN
              </button>
            </div>

            {/* User Avatar / Logout */}
            {user && (
              <button
                onClick={logout}
                title={language === 'mr' ? 'लॉगआउट करा' : 'Sign Out'}
                className="flex items-center gap-1.5 p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
