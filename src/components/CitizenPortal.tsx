import React, { useState, useEffect, useMemo } from 'react';
import { CivicIssue, IssueCategory } from '../types';
import { WARDS_LIST, CATEGORIES_LIST } from '../data/mockData';
import { useLanguage } from '../i18n/LanguageContext';
import { verifyIssueSubmission } from '../services/issueVerification';
import { calculateUrgencyScore, generateJustification } from '../utils/scoringEngine';
import { 
  Send, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Tag, 
  Clock, 
  FileText, 
  Sparkles, 
  Loader2, 
  ShieldCheck, 
  ShieldAlert,
  AlertTriangle,
  ChevronRight, 
  Layers, 
  ArrowLeft,
  Building2,
  ExternalLink,
  X,
  Info,
  Phone,
  User as UserIcon,
  Check
} from 'lucide-react';

function getCitizenPriorityTier(score: number, language: string): { label: string; className: string } {
  if (score >= 90) {
    return {
      label: language === 'mr' ? 'अति-महत्त्वाचे (Critical)' : 'CRITICAL PRIORITY',
      className: 'gazette-stamp gazette-stamp-critical'
    };
  }
  if (score >= 75) {
    return {
      label: language === 'mr' ? 'उच्च प्राधान्य (High)' : 'HIGH PRIORITY',
      className: 'gazette-stamp gazette-stamp-high'
    };
  }
  if (score >= 50) {
    return {
      label: language === 'mr' ? 'मध्यम प्राधान्य (Medium)' : 'MEDIUM PRIORITY',
      className: 'gazette-stamp gazette-stamp-medium'
    };
  }
  return {
    label: language === 'mr' ? 'सामान्य प्राधान्य (Standard)' : 'ROUTINE PRIORITY',
    className: 'gazette-stamp gazette-stamp-low'
  };
}

function getCitizenSafeJustification(issue: CivicIssue, language: string): string {
  // If the issue is overridden or has override keywords, return a clean public rationale
  if (issue.isOverridden || /overridden|override|officer|cmo|cmo-001/i.test(issue.justification)) {
    const facility = issue.scoreBreakdown?.facilityDetails;
    if (language === 'mr') {
      return facility 
        ? `सार्वजनिक सुरक्षा व ${facility} सान्निध्याच्या आधारे प्राधान्य निश्चित केले आहे.`
        : 'सार्वजनिक सुरक्षा व नागरी निकषांनुसार प्राधान्य निश्चित केले आहे.';
    }
    return facility
      ? `Prioritized based on public safety assessment near ${facility}.`
      : 'Prioritized based on municipal public safety criteria.';
  }

  // Otherwise, sanitize raw text: strip cost patterns, officer names, internal ticket numbers, previous ranks
  let text = issue.justification;
  text = text.replace(/OVERRIDDEN\s+from\s+#\d+/gi, '');
  text = text.replace(/Ranked\s+#\d+\s*\(.*?\):?/gi, '');
  text = text.replace(/₹\s*[\d,]+(\.\d+)?(L|Lakhs)?/gi, '');
  text = text.replace(/Officer\s+override\s+applied\.?/gi, '');
  text = text.replace(/Er\.\s+[A-Za-z\.\s]+/g, '');

  const cleaned = text.trim().replace(/^[:,\s-]+/, '');
  if (!cleaned || cleaned.length < 5) {
    return language === 'mr'
      ? 'नागरी निकषांनुसार वॉर्ड प्राधान्य यादीत समाविष्ट.'
      : 'Prioritized based on standard municipal civic evaluation.';
  }
  return cleaned;
}

interface CitizenPortalProps {
  issues?: CivicIssue[];
  onAddIssue?: (issue: CivicIssue) => void;
  onSwitchToStaffLogin: () => void;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  issues,
  onAddIssue,
  onSwitchToStaffLogin
}) => {
  const { language, setLanguage, getWardName, getCategoryName } = useLanguage();

  // Active view: 'report' (submission form) | 'track' (status check) | 'transparency' (public priority board)
  const [activeView, setActiveView] = useState<'report' | 'track' | 'transparency'>('report');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>('Roads & Potholes');
  const [ward, setWard] = useState<string>(WARDS_LIST[1] || 'Ward 1 - Gandhi Market & Old City');
  const [landmark, setLandmark] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [citizenMobile, setCitizenMobile] = useState('');

  // Submission Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spamError, setSpamError] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<{
    ticketNumber: string;
    title: string;
    ward: string;
    category: string;
    date: string;
    urgencyEstimate: number;
    aiScreened: boolean;
  } | null>(null);

  // Blackout Resilience Mode State
  const [isBlackoutActive, setIsBlackoutActive] = useState(false);
  const [isBlackoutBannerDismissed, setIsBlackoutBannerDismissed] = useState(false);

  // Fetch ALL public issues directly from API to prevent ward URL encoding issues
  const [allPublicIssues, setAllPublicIssues] = useState<CivicIssue[]>([]);

  useEffect(() => {
    fetch('/api/issues/public/all')
      .then(r => r.json())
      .then(data => {
        if (data.issues) setAllPublicIssues(data.issues);
      })
      .catch(err => console.warn('[PublicBoard] Fallback to props issues:', err));
  }, []);

  useEffect(() => {
    const queue = localStorage.getItem('urbanloop_blackout_queue');
    if (queue) {
      try {
        const parsed = JSON.parse(queue);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setIsBlackoutActive(true);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Tracking Search State
  const [searchTicket, setSearchTicket] = useState('');
  const [trackedIssue, setTrackedIssue] = useState<CivicIssue | null | 'NOT_FOUND'>(null);

  // Transparency Filter
  const [transparencyWard, setTransparencyWard] = useState('All Wards');

  // Handle Citizen Issue Submission with AI Verification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !landmark.trim()) return;

    setIsSubmitting(true);
    setSpamError(null);

    try {
      // 1. Run AI Spam, Scam & Validity Screening
      const aiResult = await verifyIssueSubmission({
        title: title.trim(),
        description: description.trim(),
        category,
        ward,
        landmark: landmark.trim()
      });

      // 2. Reject ANY spam / scam / non-civic / phishing submission (NO TICKET GENERATED)
      if (aiResult.isSpam || !aiResult.isLikelyGenuine) {
        setIsSubmitting(false);
        const reasonDetail = aiResult.rejectionReason || aiResult.aiReasoning || '';
        setSpamError(
          language === 'mr'
            ? `नाकारले: ही नोंदणी स्पॅम, फसवणूक (Scam), जाहिरात किंवा अप्रासंगिक आढळली आहे. या नोंदीसाठी कोणताही तक्रार टोकन (Ticket) तयार करण्यात आलेला नाही.${reasonDetail ? ` [तपशील: ${reasonDetail}]` : ''} कृपया कोपरगाव नगर परिषदेच्या अधिकार क्षेत्रातील प्रत्यक्ष नागरी समस्येचे (रस्ते, पाणी, सांडपाणी, कचरा, पथदिवे) वर्णन करा.`
            : `Blocked: Submission flagged as Spam, Scam, Promotional, or Non-Civic content. No complaint ticket was generated.${reasonDetail ? ` [Details: ${reasonDetail}]` : ''} Please describe an actual municipal civic issue (roads, water, sewage, garbage, streetlights) to submit.`
        );
        return;
      }

      // 3. POST raw input to /api/issues — urgencyScore is computed server-authoritatively
      let response: Response | null = null;
      let data: any = {};
      let isBlackoutMode = false;

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        ward,
        locationLandmark: landmark.trim(),
        aiVerification: {
          isLikelyGenuine: aiResult.isLikelyGenuine,
          confidenceLabel: aiResult.confidenceLabel,
          aiReasoning: aiResult.aiReasoning,
          screenedAt: new Date().toISOString()
        }
      };

      try {
        response = await fetch('/api/issues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        data = await response.json().catch(() => ({}));
        if (response.status === 503 || data.blackoutMode) {
          isBlackoutMode = true;
        } else if (!response.ok) {
          throw new Error(data.error || 'Failed to register complaint.');
        }
      } catch (err: any) {
        if (err.message?.includes('Database unreachable') || err.name === 'TypeError') {
          isBlackoutMode = true;
        } else {
          throw err;
        }
      }

      // If Emergency Blackout Mode is triggered: Cache in localStorage urbanloop_blackout_queue
      if (isBlackoutMode) {
        setIsBlackoutActive(true);
        const ticketNumber = data.ticketNumber || `KPG-OFFLINE-${Math.floor(1000 + Math.random() * 9000)}`;
        const blackoutItem = {
          ...payload,
          ticketNumber,
          cachedAt: new Date().toISOString()
        };

        const existingQueue = JSON.parse(localStorage.getItem('urbanloop_blackout_queue') || '[]');
        existingQueue.push(blackoutItem);
        localStorage.setItem('urbanloop_blackout_queue', JSON.stringify(existingQueue));

        const reportedDate = new Date().toISOString().slice(0, 10);
        setSubmittedTicket({
          ticketNumber,
          title: title.trim(),
          ward,
          category,
          date: reportedDate,
          urgencyEstimate: 75,
          aiScreened: true
        });

        setTitle('');
        setDescription('');
        setLandmark('');
        setCitizenName('');
        setCitizenMobile('');
        return;
      }

      const ticketNumber = data.ticketNumber;
      const reportedDate = new Date().toISOString().slice(0, 10);

      if (onAddIssue && data.issue) {
        onAddIssue(data.issue);
      }

      // Show success screen with ticket receipt
      setSubmittedTicket({
        ticketNumber,
        title: title.trim(),
        ward,
        category,
        date: reportedDate,
        urgencyEstimate: data.issue?.urgencyScore || 70,
        aiScreened: true
      });

      // Clear input fields
      setTitle('');
      setDescription('');
      setLandmark('');
      setCitizenName('');
      setCitizenMobile('');
    } catch (err: any) {
      console.error('Error submitting complaint:', err);
      setSpamError(err.message || 'Failed to submit complaint. Please check connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Ticket Lookup via public API
  const handleSearchTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTicket.trim()) return;

    const query = searchTicket.trim().toUpperCase();
    try {
      const res = await fetch(`/api/issues/${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setTrackedIssue(data.issue);
      } else {
        setTrackedIssue('NOT_FOUND');
      }
    } catch {
      setTrackedIssue('NOT_FOUND');
    }
  };

  // Robust Ward-Matching Helper (handles & / &amp; / encoding / ward prefixes)
  const normalizeWard = (w: string) => 
    (w || '').toLowerCase().replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

  // Filtered issues for public transparency
  const publicIssues = useMemo(() => {
    const sourceIssues = (allPublicIssues.length > 0 ? allPublicIssues : issues) || [];
    return sourceIssues
      .filter((i) => {
        if (!transparencyWard || transparencyWard === 'All Wards') return true;
        const normSelect = normalizeWard(transparencyWard);
        const normIssueWard = normalizeWard(i.ward);
        
        if (normIssueWard === normSelect) return true;

        // Compare ward prefixes e.g. "ward 3" vs "ward 3"
        const selectPrefix = normSelect.split(' - ')[0];
        const issuePrefix = normIssueWard.split(' - ')[0];
        if (selectPrefix && issuePrefix && selectPrefix === issuePrefix) return true;

        return false;
      })
      .sort((a, b) => a.currentRank - b.currentRank);
  }, [allPublicIssues, issues, transparencyWard]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-900">
      {/* Top Tricolor Strip */}
      <div className="h-1.5 w-full flex">
        <div className="h-full w-1/3 bg-[#ff9933]"></div>
        <div className="h-full w-1/3 bg-white"></div>
        <div className="h-full w-1/3 bg-[#138808]"></div>
      </div>

      {/* Emergency Resilience Mode Top Banner */}
      {isBlackoutActive && !isBlackoutBannerDismissed && (
        <div className="bg-amber-500 text-slate-950 px-4 py-3 font-semibold text-xs sm:text-sm flex items-center justify-between shadow-md border-b border-amber-600 animate-fadeIn">
          <div className="flex items-center gap-2 max-w-5xl mx-auto">
            <AlertTriangle className="w-5 h-5 shrink-0 text-slate-950" />
            <span>
              ⚠️ Emergency Resilience Mode Active. The central database is currently offline. Your civic request has been securely cached on this device and will sync automatically when the connection is restored.
            </span>
          </div>
          <button 
            type="button"
            onClick={() => setIsBlackoutBannerDismissed(true)} 
            className="p-1 hover:bg-amber-600/30 rounded text-slate-950 font-bold shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Public Header */}
      <header className="bg-[#0f2942] text-white border-b border-slate-700 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Council Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-base shadow-sm shrink-0">
                KPG
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black tracking-tight text-white">
                    {language === 'mr' ? 'कोपरगाव नगर परिषद • नागरिक तक्रार कक्ष' : 'Kopargaon Municipal Citizen Portal'}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Check className="w-2.5 h-2.5" /> Live 24x7
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-medium">
                  {language === 'mr' ? 'नागरी समस्या थेट नोंदणी, जलद पडताळणी व पारदर्शक ट्रॅकिंग' : 'Direct civic reporting & algorithmic resource prioritization'}
                </div>
              </div>
            </div>

            {/* Language & Staff Portal Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language Switch */}
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setLanguage('mr')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    language === 'mr' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  मराठी
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    language === 'en' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  English
                </button>
              </div>

              {/* Staff / Officer Login Button */}
              <button
                type="button"
                onClick={onSwitchToStaffLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-600 transition-all shadow-xs"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">
                  {language === 'mr' ? 'अधिकारी लॉगिन' : 'Officer Login'}
                </span>
                <span className="sm:hidden">
                  {language === 'mr' ? 'लॉगिन' : 'Staff'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs for Citizen */}
        <div className="bg-[#0b1f33] border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-4 overflow-x-auto py-1">
            <button
              onClick={() => { setActiveView('report'); setSubmittedTicket(null); setSpamError(null); }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                activeView === 'report'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{language === 'mr' ? '१. नवीन तक्रार नोंदवा' : '1. Report an Issue'}</span>
            </button>

            <button
              onClick={() => setActiveView('track')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                activeView === 'track'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>{language === 'mr' ? '२. तक्रार स्थिती ट्रॅक करा' : '2. Track Status'}</span>
            </button>

            <button
              onClick={() => setActiveView('transparency')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                activeView === 'transparency'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{language === 'mr' ? '३. सार्वजनिक प्राधान्य यादी' : '3. Public Transparency Board'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* VIEW 1: REPORT AN ISSUE */}
        {activeView === 'report' && (
          <div>
            {submittedTicket ? (
              /* Success Confirmation Card */
              <div className="bg-white border border-emerald-200 rounded-2xl p-6 sm:p-8 shadow-lg text-center max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-2">
                  {language === 'mr' ? 'तक्रार यशस्वीरित्या नोंदवली' : 'Complaint Successfully Registered'}
                </span>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {language === 'mr' ? 'आपला तक्रार टोकन क्रमांक' : 'Your Complaint Ticket ID'}
                </h2>

                <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-200 inline-block">
                  <div className="text-2xl sm:text-3xl font-mono font-black text-[#0f2942] tracking-wider">
                    {submittedTicket.ticketNumber}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    {language === 'mr' ? 'भविष्यातील ट्रॅकिंगसाठी हा क्रमांक जपून ठेवा' : 'Keep this ticket number for future status tracking'}
                  </div>
                </div>

                <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 mb-6 text-xs text-slate-700">
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="font-semibold text-slate-500">{language === 'mr' ? 'समस्या:' : 'Subject:'}</span>
                    <span className="font-bold text-slate-900 text-right max-w-xs truncate">{submittedTicket.title}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="font-semibold text-slate-500">{language === 'mr' ? 'प्रभाग:' : 'Ward Area:'}</span>
                    <span className="font-bold text-slate-900">{getWardName(submittedTicket.ward)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="font-semibold text-slate-500">{language === 'mr' ? 'विभाग श्रेणी:' : 'Category:'}</span>
                    <span className="font-bold text-slate-900">{getCategoryName(submittedTicket.category)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">{language === 'mr' ? 'पडताळणी स्थिती:' : 'Triage Status:'}</span>
                    <span className="font-bold text-blue-700 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      {language === 'mr' ? 'एआय प्राथमिक तपासणी पूर्ण • क्षेत्रीय पाहणी प्रलंबित' : 'AI Screened • Queued for Field Inspection'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTicket(submittedTicket.ticketNumber);
                      setTrackedIssue(issues.find(i => i.ticketNumber === submittedTicket.ticketNumber) || null);
                      setActiveView('track');
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0f2942] text-white text-xs font-bold hover:bg-[#1e3a8a] transition-all flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    <span>{language === 'mr' ? 'या तक्रारीची थेट स्थिती पहा' : 'Track This Ticket Live'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedTicket(null);
                      setSpamError(null);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-50 transition-all"
                  >
                    {language === 'mr' ? '+ दुसरी तक्रार नोंदवा' : '+ Submit Another Issue'}
                  </button>
                </div>
              </div>
            ) : (
              /* Seamless Floating Card Report Form */
              <div className="max-w-3xl mx-auto mt-4 sm:mt-8 bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-10">
                
                {/* Form Header */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                  <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0 shadow-2xs">
                    <Send className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      {language === 'mr' ? 'कोपरगाव नागरी समस्या नोंदणी' : 'Submit a Municipal Civic Issue'}
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                      {language === 'mr' 
                        ? 'रस्ते, पाणीपुरवठा, ड्रेनेज, कचरा व पथदिवे संदर्भातील तक्रारी थेट नगर परिषदेकडे नोंदवा.' 
                        : 'Report road damage, water leaks, drainage, streetlights, or waste issues directly to Kopargaon Council.'}
                    </p>
                  </div>
                </div>

                {/* Spam / Scam Blocked Notification Banner */}
                {spamError && (
                  <div className="mb-6 p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 text-sm flex items-start gap-3.5 shadow-2xs animate-shake">
                    <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-base text-rose-900 mb-1 flex items-center gap-1.5">
                        <span>{language === 'mr' ? 'तक्रार नाकारण्यात आली (Spam / Scam Filter)' : 'Submission Blocked by Municipal AI Safety Filter'}</span>
                      </div>
                      <div className="font-semibold text-rose-900 leading-relaxed">{spamError}</div>
                      <div className="mt-2.5 text-xs text-rose-700 bg-white/80 p-3 rounded-xl border border-rose-200 font-medium">
                        {language === 'mr' 
                          ? 'नोंद: कोपरगाव नगर परिषद प्रणाली केवळ प्रत्यक्ष नागरी समस्यांसाठी (रस्ते, पाणीपुरवठा, सांडपाणी, वीज, कचरा) तक्रार क्रमांक जारी करते.'
                          : 'Note: Kopargaon Municipal Council system only issues tickets for verified civic issues (roads, water supply, sewage, electricity, garbage).'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Category Selection Clickable Grid Tiles */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-3">
                      {language === 'mr' ? '१. समस्येचा विभाग निवडा (Select Category):' : '1. Problem Category:'} <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {CATEGORIES_LIST.filter(c => c !== 'All Categories').map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat as IssueCategory)}
                          className={`p-4 rounded-2xl border text-left text-sm transition-all flex items-center gap-3 cursor-pointer ${
                            category === cat
                              ? 'ring-2 ring-blue-600 bg-blue-50 text-blue-700 font-semibold border-transparent shadow-xs'
                              : 'border-slate-200 text-slate-600 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                        >
                          <Tag className={`w-5 h-5 shrink-0 ${category === cat ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className="line-clamp-2 leading-snug">{getCategoryName(cat)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ward & Landmark Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    {/* Ward */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">
                        {language === 'mr' ? '२. प्रभाग / वॉर्ड निवडा:' : '2. Ward Area:'} <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={ward}
                        onChange={(e) => setWard(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                      >
                        {WARDS_LIST.filter(w => w !== 'All Wards').map((w) => (
                          <option key={w} value={w}>
                            {getWardName(w)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Landmark */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">
                        {language === 'mr' ? '३. जवळची खूण / पत्ता (Landmark):' : '3. Landmark / Location:'} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          required
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          placeholder={language === 'mr' ? 'उदा. शिवाजी पुतळ्याजवळ, मेन रोड' : 'e.g. Near Shivaji Chowk, SBI Bank Road'}
                          className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2942]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      {language === 'mr' ? '४. तक्रारीचा संक्षिप्त विषय (Title):' : '4. Short Issue Title:'} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={language === 'mr' ? 'उदा. भाजी मार्केट जवळील मुख्य रस्त्यावर मोठा खड्डा' : 'e.g. Large dangerous pothole near vegetable market'}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2942]"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      {language === 'mr' ? '५. सविस्तर माहिती / प्रत्यक्ष अडचण (Description):' : '5. Detailed Description:'}
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={language === 'mr' ? 'समस्येचे अधिक तपशील, किती दिवसांपासून समस्या आहे इत्यादी नमूद करा...' : 'Provide details such as how long the issue has persisted, impact on traffic or residents...'}
                      className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2942] resize-none"
                    />
                  </div>

                  {/* Optional Citizen Contact Info */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-slate-600" />
                      <span>{language === 'mr' ? 'नागरिक संपर्क माहिती (ऐच्छिक - एसएमएस अपडेट्ससाठी)' : 'Citizen Contact (Optional - for SMS tracking updates):'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          value={citizenName}
                          onChange={(e) => setCitizenName(e.target.value)}
                          placeholder={language === 'mr' ? 'आपले नाव' : 'Your Full Name'}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        />
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="tel"
                          value={citizenMobile}
                          onChange={(e) => setCitizenMobile(e.target.value)}
                          placeholder={language === 'mr' ? '१०-अंकी मोबाईल क्रमांक' : '10-digit Mobile Number'}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* AI Pre-Screening Assurance Note */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-blue-50/80 border border-blue-200/80 p-3 rounded-xl">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      {language === 'mr' 
                        ? 'सर्व तक्रारी एआय प्राथमिक तपासणीनंतर तात्काळ संबंधित वॉर्ड अधिकाऱ्यांच्या कार्यसूचीत पाठवल्या जातात.' 
                        : 'Submissions undergo automated triage and are instantly routed into the municipal priority queue.'}
                    </span>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider text-white bg-[#0f2942] hover:bg-[#1e3a8a] shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        <span>
                          {language === 'mr' ? 'तक्रारीची प्राथमिक तपासणी होत आहे...' : 'Checking your report with municipal triage...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-amber-400" />
                        <span>
                          {language === 'mr' ? 'तक्रार नोंदवा व टोकन मिळवा' : 'Submit Civic Complaint & Get Ticket'}
                        </span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: TRACK STATUS */}
        {activeView === 'track' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[#0f2942]">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                    {language === 'mr' ? 'तक्रार स्थिती ट्रॅक करा' : 'Track Your Complaint Status'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {language === 'mr' ? 'आपला KPG टोकन क्रमांक टाका (उदा. KPG-1014)' : 'Enter your municipal ticket ID (e.g. KPG-1014)'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSearchTicket} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={searchTicket}
                  onChange={(e) => setSearchTicket(e.target.value)}
                  placeholder="KPG-1014"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold uppercase text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2942]"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0f2942] hover:bg-[#1e3a8a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Search className="w-4 h-4" />
                  <span>{language === 'mr' ? 'शोधा' : 'Search'}</span>
                </button>
              </form>
            </div>

            {/* Tracking Result */}
            {trackedIssue === 'NOT_FOUND' && (
              <div className="bg-white border border-rose-200 rounded-2xl p-6 text-center text-xs text-rose-800">
                <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
                <div className="font-bold text-sm mb-1">
                  {language === 'mr' ? 'तक्रार सापडली नाही' : 'Ticket Not Found'}
                </div>
                <p className="text-slate-600">
                  {language === 'mr' ? 'कृपया आपला टोकन क्रमांक तपासून पुन्हा प्रयत्न करा.' : 'Please verify your ticket number and try again.'}
                </p>
              </div>
            )}

            {trackedIssue && trackedIssue !== 'NOT_FOUND' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg space-y-5">
                <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded bg-[#0f2942] text-amber-300">
                      {trackedIssue.ticketNumber}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2">
                      {trackedIssue.title}
                    </h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{getWardName(trackedIssue.ward)} • {trackedIssue.locationLandmark}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase text-slate-400">
                      {language === 'mr' ? 'प्राधान्य क्रम' : 'Live Rank'}
                    </div>
                    <div className="text-xl font-mono font-black text-[#0f2942]">
                      #{trackedIssue.currentRank}
                    </div>
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    {language === 'mr' ? 'कामाची सद्यस्थिती (Current Work Order Status):' : 'Work Order Status:'}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${trackedIssue.isActionedThisCycle ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {trackedIssue.isActionedThisCycle ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {trackedIssue.isActionedThisCycle 
                          ? (language === 'mr' ? 'वर्तमान कार्यचक्रात कामाचे नियोजन मंजूर' : 'Scheduled in Active Work Sprint')
                          : (language === 'mr' ? 'प्राधान्य रांगेत समाविष्ट (पडताळणी पूर्ण)' : 'Ranked in Priority Queue')}
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium">
                        {language === 'mr' ? `नोंदणी दिनांक: ${trackedIssue.reportedDate}` : `Reported on ${trackedIssue.reportedDate}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plain-English Justification */}
                <div className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">
                    {language === 'mr' ? 'वस्तुनिष्ठ प्राधान्यक्रम कारण (Objective Justification):' : 'Priority Justification:'}
                  </div>
                  <p className="font-medium text-slate-600">{getCitizenSafeJustification(trackedIssue, language)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: PUBLIC TRANSPARENCY QUEUE */}
        {activeView === 'transparency' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {language === 'mr' ? 'कोपरगाव सार्वजनिक नागरी प्राधान्य सूची' : 'Kopargaon Public Priority Board'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'mr' ? 'संसाधनांचे न्याय्य व पारदर्शक वाटप' : 'Objective urgency scoring ensures non-discretionary municipal action.'}
                </p>
              </div>

              {/* Ward Filter */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 whitespace-nowrap">
                  {language === 'mr' ? 'प्रभाग:' : 'Ward:'}
                </label>
                <select
                  value={transparencyWard}
                  onChange={(e) => setTransparencyWard(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  {WARDS_LIST.map((w) => (
                    <option key={w} value={w}>
                      {getWardName(w)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List of Public Works */}
            {publicIssues.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-xs">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                    <span className="text-2xl opacity-50">📋</span>
                  </div>
                </div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  {language === 'mr' ? 'कोणत्याही तक्रारी आढळल्या नाहीत' : 'No civic issues found'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 max-w-md mx-auto">
                  {language === 'mr' ? 'या प्रभागात अद्याप कोणतीही सार्वजनिक तक्रार नोंदवली गेली नाही.' : 'No public civic issues have been reported in this ward yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {publicIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#0f2942] text-amber-300 font-mono font-black text-sm flex items-center justify-center shrink-0">
                        #{issue.currentRank}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-slate-500">{issue.ticketNumber}</span>
                          <span className="text-xs font-bold text-slate-900">{issue.title}</span>
                          {issue.isActionedThisCycle && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {language === 'mr' ? 'सक्रिय चक्रात मंजूर' : 'Active Sprint'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                          <span>{getWardName(issue.ward)}</span>
                          <span>•</span>
                          <span>{getCategoryName(issue.category)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{language === 'mr' ? 'प्राधान्य श्रेणी' : 'Priority Tier'}</div>
                        {(() => {
                          const tier = getCitizenPriorityTier(issue.urgencyScore, language);
                          return (
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${tier.className}`}>
                              {tier.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Public Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{language === 'mr' ? 'कोपरगाव नगर परिषद • नागरिकांच्या सेवेसाठी सदैव तत्पर' : 'Kopargaon Municipal Council • Citizen First Public Governance'}</span>
          <span className="font-mono text-[11px]">RTI Act 2005 Proactive Disclosure System</span>
        </div>
      </footer>
    </div>
  );
};
