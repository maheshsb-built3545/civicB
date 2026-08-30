import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  Landmark, 
  Info,
  CheckCircle2,
  Building2,
  MapPin,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { WARDS_LIST } from '../data/mockData';
import { UserRole } from '../types';

// Demo email addresses for the quick-select UI (pre-fill only — no passwords here)
const DEMO_EMAILS: Record<UserRole, string> = {
  admin: 'admin@kopargaon.gov.in',
  officer: 'officer@kopargaon.gov.in',
};

interface LoginScreenProps {
  onSwitchToCitizenPortal?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSwitchToCitizenPortal }) => {
  const { login } = useAuth();
  const { language, setLanguage, t, getWardName } = useLanguage();

  const [email, setEmail] = useState('admin@kopargaon.gov.in');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg('');
    setEmail(DEMO_EMAILS[role]);
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      // =========================================================================
      // [EXPRESS BACKEND INTEGRATION POINT]
      // In a real full-stack app, this calls Express auth:
      // const res = await fetch('/api/auth/login', { method: 'POST', body: ... });
      // =========================================================================
      
      const result = await login(email, password);

      if (!result.success) {
        setErrorMsg(result.error || 'Authentication failed. Please check credentials.');
      }
      // On success, do nothing further — AuthContext's isAuthenticated flag
      // flips to true automatically, and AppContent re-renders to DashboardApp.
    } catch {
      setErrorMsg('Network error connecting to municipal directory server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 flex flex-col justify-between text-slate-900">
      {/* Top Tricolor Ribbon */}
      <div className="h-1.5 w-full flex">
        <div className="h-full w-1/3 bg-[#ff9933]"></div>
        <div className="h-full w-1/3 bg-white"></div>
        <div className="h-full w-1/3 bg-[#138808]"></div>
      </div>

      {/* Header bar */}
      <div className="bg-[#0f2942] text-white py-2.5 px-4 sm:px-6 border-b border-slate-700">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
            <Landmark className="w-4 h-4 text-amber-400" />
            <span>{language === 'mr' ? 'महाराष्ट्र शासन • कोपरगाव नगर परिषद' : 'Govt. of Maharashtra • Kopargaon Municipal Council'}</span>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToCitizenPortal && (
              <button
                type="button"
                onClick={onSwitchToCitizenPortal}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{language === 'mr' ? 'नागरिक तक्रार कक्ष (Citizen Portal)' : 'Citizen Complaint Portal'}</span>
              </button>
            )}

            <div className="flex items-center bg-slate-800 rounded-md p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setLanguage('mr')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  language === 'mr' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                मराठी
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  language === 'en' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Login Center Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          
          {/* Header Banner */}
          <div className="bg-[#0f2942] text-white p-6 sm:p-8 text-center relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg border border-amber-300/40 mb-3">
                KPG
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {language === 'mr' ? 'आपले कोपरगाव • अधिकारी प्रवेशद्वार' : 'KopargaonPriority Portal'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md font-medium">
                {language === 'mr' 
                  ? 'नागरी तक्रार प्राधान्यक्रम व संसाधन वाटप निर्णय सहाय्य प्रणाली' 
                  : 'Municipal Civic Decision Support & Resource Allocation Engine'}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Demo Quick Role Selector Pills */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                {language === 'mr' ? 'डेमो भूमिका निवडा (Select Demo Role):' : 'Select Demo Role to Authenticate:'}
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Role 1: Admin */}
                <button
                  type="button"
                  onClick={() => handleRoleSelect('admin')}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    selectedRole === 'admin'
                      ? 'border-[#0f2942] bg-blue-50/50 ring-2 ring-[#0f2942]/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${
                    selectedRole === 'admin' ? 'bg-[#0f2942] text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span>{language === 'mr' ? 'प्रशासक (Admin)' : 'Municipal Admin / CMO'}</span>
                      {selectedRole === 'admin' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 inline" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                      {language === 'mr' ? 'सर्व वॉर्ड + बजेट व्यवस्थापन' : 'All Wards + Budget Settings'}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1 font-bold">
                      /admin-dashboard
                    </div>
                  </div>
                </button>

                {/* Role 2: Ward Officer */}
                <button
                  type="button"
                  onClick={() => handleRoleSelect('officer')}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    selectedRole === 'officer'
                      ? 'border-[#0f2942] bg-blue-50/50 ring-2 ring-[#0f2942]/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${
                    selectedRole === 'officer' ? 'bg-[#0f2942] text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span>{language === 'mr' ? 'वॉर्ड अधिकारी (Officer)' : 'Ward Officer'}</span>
                      {selectedRole === 'officer' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 inline" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                      {language === 'mr' ? 'नियुक्त वॉर्डनिहाय कार्य' : 'Assigned Ward Scope'}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1 font-bold">
                      /officer-dashboard
                    </div>
                  </div>
                </button>
              </div>
            </div>


            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'mr' ? 'शासकीय ईमेल आयडी' : 'Government Email Address'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="officer@kopargaon.gov.in"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'mr' ? 'सुरक्षा पासवर्ड' : 'Password / Pin'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-[#0f2942] hover:bg-[#1e3a8a] shadow-md transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <span>{language === 'mr' ? 'सत्यापन करत आहे...' : 'Authenticating...'}</span>
                ) : (
                  <>
                    <span>
                      {language === 'mr' 
                        ? `${selectedRole === 'admin' ? 'प्रशासक' : 'अधिकारी'} म्हणून प्रवेश करा` 
                        : `Sign In as ${selectedRole === 'admin' ? 'Administrator' : 'Ward Officer'}`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Public Citizen Portal Quick Link */}
            {onSwitchToCitizenPortal && (
              <div className="mt-4 pt-4 border-t border-slate-200 text-center">
                <button
                  type="button"
                  onClick={onSwitchToCitizenPortal}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>
                    {language === 'mr' 
                      ? 'नागरिक आहात का? येथे थेट तक्रार नोंदवा (Citizen Portal)' 
                      : 'Are you a citizen? Report an issue on Citizen Portal'}
                  </span>
                </button>
              </div>
            )}

            {/* Quick Demo Info Box */}
            <div className="mt-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{language === 'mr' ? 'भूमिका व अधिकार माहिती:' : 'Role Permissions Reference:'}</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                <li>
                  <strong className="text-slate-800">Admin (/admin-dashboard):</strong> {language === 'mr' ? 'सर्व वॉर्डांमधील समस्या, बजेट मर्यादा बदलणे, प्राधान्य बदल व RTI निर्यात.' : 'Cross-ward visibility, Budget & crew capacity settings, algorithmic overrides, RTI audit export.'}
                </li>
                <li>
                  <strong className="text-slate-800">Officer (/officer-dashboard):</strong> {language === 'mr' ? 'केवळ नियुक्त वॉर्डमधील कामे, क्षेत्रीय पुरावे पडताळणी, कार्य चक्रात कामांचे नियोजन.' : 'Restricted to assigned ward issues, field verification sign-off, work order scheduling.'}
                </li>
              </ul>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center text-xs text-slate-500 font-medium">
        <span>{t.footerOrg}</span> • <span>{t.systemTagline}</span> • <span className="font-mono">{t.footerRti}</span>
      </footer>
    </div>
  );
};
