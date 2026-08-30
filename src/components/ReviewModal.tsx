import React, { useState } from 'react';
import { CivicIssue } from '../types';
import { 
  AlertTriangle, 
  MapPin, 
  X, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface ReviewModalProps {
  issue: CivicIssue | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmVerification: (
    issueId: string,
    inspectorName: string,
    verificationNotes: string,
    resolvedLat: number,
    resolvedLng: number
  ) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  issue,
  isOpen,
  onClose,
  onConfirmVerification
}) => {
  const { language, t, getIssueText, getWardName } = useLanguage();

  if (!isOpen || !issue) return null;

  const issueText = getIssueText(issue);

  const [inspectorName, setInspectorName] = useState(
    language === 'mr' ? 'सुनील जी. भालेराव (कनिष्ठ अभियंता)' : 'Sunil G. Bhalerao (Junior Engineer)'
  );
  const [verificationNotes, setVerificationNotes] = useState(
    language === 'mr'
      ? 'घटनास्थळी प्रत्यक्ष पाहणी पूर्ण. जीपीएस अक्षांश-रेखांश नोंदवले व प्रभाग सर्वेक्षकासोबत पडताळणी झाली.'
      : 'Field inspection conducted. GPS location recorded on-site. Photo evidence verified with Ward Surveyor.'
  );
  const [lat, setLat] = useState('19.8845');
  const [lng, setLng] = useState('74.4760');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmVerification(
      issue.id,
      inspectorName,
      verificationNotes,
      parseFloat(lat) || 19.8845,
      parseFloat(lng) || 74.4760
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-[#0f2942] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10 border border-white/20 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/20 text-amber-300 border border-white/30">
                {issue.ticketNumber}
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">
                {language === 'mr' ? 'प्रत्यक्ष पाहणी व माहिती पडताळणी' : 'Field Verification & Data Validation'}
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Issue Summary */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold text-slate-900 mb-1">{issueText.title}</div>
            <div className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0f2942]" />
              <span>{getWardName(issue.ward)}</span>
            </div>
          </div>

          {/* AI Pre-Screening Triage Result if present */}
          {issue.aiVerification && (
            <div className="p-3.5 rounded-xl bg-sky-50/80 border border-sky-200">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                  <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>
                    {language === 'mr' ? 'एआय प्राथमिक पडताळणी निकाल' : 'AI Intake Pre-Screening Report'}
                  </span>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300">
                  {issue.aiVerification.confidenceLabel} confidence
                </span>
              </div>
              <div className="text-xs text-sky-950 font-medium bg-white/70 p-2.5 rounded-lg border border-sky-100">
                <div className="font-semibold text-slate-900 mb-0.5">
                  {issue.aiVerification.isLikelyGenuine
                    ? (language === 'mr' ? '✓ खरी नागरी समस्या म्हणून वर्गीकृत' : '✓ Classified as Likely Genuine Civic Issue')
                    : (language === 'mr' ? '⚠ संशयास्पद / अपुरे तपशील' : '⚠ Flagged for Low Civic Relevance')}
                </div>
                <div className="text-slate-600 text-[11px]">
                  <strong>AI Rationale:</strong> {issue.aiVerification.aiReasoning}
                </div>
              </div>
            </div>
          )}

          {/* Missing Data Flags */}
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
            <div className="text-xs font-bold text-rose-800 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              {language === 'mr' ? 'नोंदवलेल्या माहिती त्रुटी / विसंगती:' : 'Identified Data Quality Discrepancies:'}
            </div>
            <ul className="space-y-1 text-xs text-slate-700 font-medium">
              {issue.dataQualityFlags.map((flag, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Coordinates input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'mr' ? 'पडताळणी झालेले अक्षांश (Latitude)' : 'Verified Latitude'}
              </label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0f2942]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'mr' ? 'पडताळणी झालेले रेखांश (Longitude)' : 'Verified Longitude'}
              </label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0f2942]"
              />
            </div>
          </div>

          {/* Field Officer Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {language === 'mr' ? 'पाहणी करणारे अधिकारी' : 'Field Inspecting Officer'}
            </label>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0f2942]"
            />
          </div>

          {/* Verification Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {language === 'mr' ? 'पाहणी अहवाल व सर्वेक्षण टिप्पणी' : 'Inspection Findings & Survey Log'}
            </label>
            <textarea
              rows={3}
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0f2942] resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
            >
              {t.btnCancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-all shadow-xs flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              {language === 'mr' ? 'पडताळणी पूर्ण करून विश्वासार्हता वाढवा' : 'Verify & Upgrade Confidence to High'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

