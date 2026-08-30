import React, { useState } from 'react';
import { CivicIssue } from '../types';
import { ShieldAlert, ArrowUpDown, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface OverrideModalProps {
  issue: CivicIssue | null;
  totalIssuesCount: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirmOverride: (
    issueId: string,
    newRank: number,
    reason: string,
    category: string,
    officerName: string,
    officerRole: string
  ) => void;
}

const OVERRIDE_CATEGORIES_EN = [
  'Public Safety / Life Threat Escalation',
  'Public Event / Time-Sensitive Risk (School/Transit/Pilgrimage)',
  'Epidemic / Public Health Prevention',
  'Equipment Synergy / Field Crew Proximity',
  'Court / District Collector Directive',
  'Ward Officer Ground Discretion'
];

const OVERRIDE_CATEGORIES_MR = [
  'सार्वजनिक सुरक्षा / जीवघेणा धोका निवारण प्राधान्य',
  'सार्वजनिक कार्यक्रम / शाळा / यात्रा / वाहतूक मार्ग तातडी',
  'साथरोग नियंत्रण / सार्वजनिक आरोग्य प्रतिबंधक उपाययोजना',
  'यंत्रसामग्री उपलब्धता व कर्मचारी proximity synergy',
  'मा. उच्च न्यायालय / जिल्हाधिकारी कार्यालय आदेश',
  'प्रभाग अधिकारी प्रत्यक्ष पाहणी विशेषाधिकार'
];

const OFFICERS_LIST = [
  { name: 'Er. Sanjay R. Deshmukh', roleEn: 'Chief Municipal Officer (CMO)', roleMr: 'मुख्याधिकारी (CMO)' },
  { name: 'Er. Priya S. Patil', roleEn: 'Executive Engineer (Civil & Electrical)', roleMr: 'कार्यकारी अभियंता (स्थापत्य व विद्युत)' },
  { name: 'Er. A. K. Kulkarni', roleEn: 'Assistant Engineer (Water & Sanitation)', roleMr: 'सहायक अभियंता (पाणी पुरवठा व स्वच्छता)' },
  { name: 'Dr. V. M. Thorat', roleEn: 'Municipal Health & Sanitation Officer', roleMr: 'नगर परिषद आरोग्य व स्वच्छता अधिकारी' }
];

export const OverrideModal: React.FC<OverrideModalProps> = ({
  issue,
  totalIssuesCount,
  isOpen,
  onClose,
  onConfirmOverride
}) => {
  const { language, t, getIssueText } = useLanguage();

  if (!isOpen || !issue) return null;

  const issueText = getIssueText(issue);

  const [targetRank, setTargetRank] = useState<number>(
    issue.currentRank === 1 ? 1 : issue.currentRank - 1
  );
  const [overrideCategory, setOverrideCategory] = useState<string>(OVERRIDE_CATEGORIES_EN[0]);
  const [reason, setReason] = useState<string>('');
  const [selectedOfficer, setSelectedOfficer] = useState(OFFICERS_LIST[0]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const minReasonLength = 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < minReasonLength) {
      setErrorMsg(language === 'mr' 
        ? `कृपया सविस्तर प्रशासकीय कारण नोंदवा (किमान ${minReasonLength} अक्षरे).`
        : `Please provide a detailed administrative reason (minimum ${minReasonLength} characters).`);
      return;
    }

    onConfirmOverride(
      issue.id,
      targetRank,
      reason.trim(),
      overrideCategory,
      selectedOfficer.name,
      language === 'mr' ? selectedOfficer.roleMr : selectedOfficer.roleEn
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 bg-purple-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 border border-purple-200 text-purple-800">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
                  {issue.ticketNumber}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-purple-900">
                  {language === 'mr' ? 'प्रशासकीय प्राधान्य बदल (Override)' : 'Officer Priority Override'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5 truncate max-w-sm">
                {issueText.title}
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Current vs New Rank Selector */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                {language === 'mr' ? 'सध्याचा गणना क्रमांक' : 'Current Algorithmic Rank'}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-slate-800">#{issue.currentRank}</span>
                <span className="text-xs text-slate-500 font-mono font-semibold">({issue.urgencyScore.toFixed(1)} pts)</span>
              </div>
            </div>

            <div>
              <label htmlFor="target-rank-select" className="text-[11px] font-bold text-[#0f2942] uppercase tracking-wider block">
                {language === 'mr' ? 'नवीन सुधारित क्रमांक' : 'Target Override Rank'}
              </label>
              <div className="mt-1 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-[#0f2942]" />
                <select
                  id="target-rank-select"
                  aria-label="Target Override Rank"
                  value={targetRank}
                  onChange={(e) => setTargetRank(Number(e.target.value))}
                  className="w-full bg-white border border-blue-300 rounded-lg px-2.5 py-1 text-sm font-mono font-bold text-[#0f2942] focus:outline-none focus:ring-1 focus:ring-[#0f2942]"
                >
                  {Array.from({ length: totalIssuesCount }, (_, i) => i + 1).map((r) => (
                    <option key={r} value={r}>
                      {language === 'mr' ? `क्रमांक #${r}` : `Rank #${r}`} {r === 1 ? (language === 'mr' ? '(सर्वोच्च तातडी कार्य)' : '(Top Urgent Work Order)') : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Override Reason Category */}
          <div>
            <label htmlFor="override-category-select" className="block text-xs font-bold text-slate-800 mb-1.5">
              {language === 'mr' ? 'प्राधान्य बदलाचे अधिकृत कारण वर्गीकरण' : 'Override Justification Category'} <span className="text-rose-500">*</span>
            </label>
            <select
              id="override-category-select"
              aria-label="Override Justification Category"
              value={overrideCategory}
              onChange={(e) => setOverrideCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0f2942]"
            >
              {(language === 'mr' ? OVERRIDE_CATEGORIES_MR : OVERRIDE_CATEGORIES_EN).map((cat, idx) => (
                <option key={cat} value={OVERRIDE_CATEGORIES_EN[idx]}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Required Reason */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="override-reason-text" className="text-xs font-bold text-slate-800">
                {language === 'mr' ? 'लेखी प्रशासकीय स्पष्टीकरण (ऑडिटसाठी अनिवार्य)' : 'Mandatory Written Justification'} <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[11px] font-mono font-bold ${reason.length < minReasonLength ? 'text-amber-600' : 'text-emerald-600'}`}>
                {reason.length} / min {minReasonLength} {language === 'mr' ? 'अक्षरे' : 'chars'}
              </span>
            </div>
            <textarea
              id="override-reason-text"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder={language === 'mr' 
                ? "उदा. आगामी साईबाबा पुण्यतिथी पालखी व शाळा सुरू झाल्यामुळे या मार्गावर तातडीने दुरुस्ती आवश्यक आहे..."
                : "Explain why the algorithmic score is insufficient (e.g., 'Upcoming SPPU University exams will cause 3,500 students to cross this broken culvert daily starting Monday...')"}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0f2942] focus:ring-1 focus:ring-[#0f2942] transition-all resize-none"
            />
          </div>

          {/* Authorizing Officer Selection */}
          <div>
            <label htmlFor="authorizing-officer-select" className="block text-xs font-bold text-slate-800 mb-1.5">
              {language === 'mr' ? 'आदेश देणारे सक्षम अधिकारी' : 'Authorizing Municipal Officer'} <span className="text-rose-500">*</span>
            </label>
            <select
              id="authorizing-officer-select"
              aria-label="Authorizing Municipal Officer"
              value={selectedOfficer.name}
              onChange={(e) => {
                const found = OFFICERS_LIST.find((o) => o.name === e.target.value);
                if (found) setSelectedOfficer(found);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0f2942]"
            >
              {OFFICERS_LIST.map((officer) => (
                <option key={officer.name} value={officer.name}>
                  {officer.name} — {language === 'mr' ? officer.roleMr : officer.roleEn}
                </option>
              ))}
            </select>
          </div>

          {/* Audit Trail Notice */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#0f2942] shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-800">{language === 'mr' ? 'वैधानिक माहिती अधिकार (RTI) सूचना:' : 'Statutory Audit Trail Notice:'}</strong> {language === 'mr'
                ? 'महाराष्ट्र नगरपरिषद अधिनियम आणि पारदर्शकता नियमांनुसार, प्रत्येक प्राधान्य बदलाची कायमस्वरूपी नोंद ऑडिट लॉगमधे केली जाते.'
                : 'In compliance with Maharashtra Municipalities Act & RTI transparency rules, all overrides are permanently recorded with officer credentials and available in public council logs.'}
            </span>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              {t.btnCancel}
            </button>
            <button
              type="submit"
              disabled={reason.trim().length < minReasonLength}
              className="px-5 py-2 text-xs font-bold text-white bg-[#0f2942] hover:bg-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4 text-amber-400" />
              {language === 'mr' ? 'प्राधान्य बदल मंजूर करा व नोंदवा' : 'Commit Override & Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

