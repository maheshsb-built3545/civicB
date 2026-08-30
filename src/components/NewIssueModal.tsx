import React, { useState } from 'react';
import { CivicIssue, IssueCategory } from '../types';
import { WARDS_LIST, CATEGORIES_LIST } from '../data/mockData';
import { PlusCircle, Sparkles, X, BrainCircuit } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { calculateUrgencyScore, generateJustification } from '../utils/scoringEngine';

interface NewIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddIssue: (issue: CivicIssue) => void;
  currentIssuesCount: number;
}

export const NewIssueModal: React.FC<NewIssueModalProps> = ({
  isOpen,
  onClose,
  onAddIssue,
  currentIssuesCount
}) => {
  const { language, t, getWardName, getCategoryName } = useLanguage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>('Roads & Potholes');
  const [ward, setWard] = useState(WARDS_LIST[1] || 'Ward 1 - Gandhi Market & Old City');
  const [landmark, setLandmark] = useState('');
  const [safetyRisk, setSafetyRisk] = useState<number>(75);
  const [citizenReports, setCitizenReports] = useState<number>(12);
  const [daysOpen, setDaysOpen] = useState<number>(5);
  const [facilityProximity, setFacilityProximity] = useState<number>(60);
  const [estimatedCost, setEstimatedCost] = useState<number>(65000);
  const [estimatedCrewHours, setEstimatedCrewHours] = useState<number>(16);

  if (!isOpen) return null;

  // Delegate live urgency score computation to shared pure scoring engine
  const calcResult = calculateUrgencyScore(
    {
      safetyRisk,
      citizenReportsCount: citizenReports,
      criticalFacilityProximityScore: facilityProximity,
      facilityDetails: `${landmark || 'locality'} corridor`
    },
    daysOpen
  );

  const computedUrgencyScore = calcResult.urgencyScore;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !landmark.trim()) return;

    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || `Civic issue reported in ${ward} near ${landmark}.`,
          category,
          ward,
          locationLandmark: landmark.trim(),
          safetyRisk,
          citizenReportsCount: citizenReports,
          criticalFacilityProximityScore: facilityProximity,
          daysOpen,
          estimatedCostInr: estimatedCost,
          estimatedCrewHours,
          requiredEquipment: ['Standard Municipal Repair Squad'],
          dataConfidence: 'high',
          dataQualityScore: 92,
          dataQualityFlags: ['GPS Verified', 'Logged in Smart City Portal'],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to ingest issue.');
        return;
      }

      const data = await res.json();
      if (data.issue) {
        onAddIssue(data.issue);
      }
      onClose();
    } catch (err) {
      console.error('[NewIssueModal]', err);
      alert('Network error while adding issue.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="relative w-full max-w-xl bg-[#fffdfa] border-2 border-[#3a352e] rounded-sm shadow-2xl overflow-hidden text-[#24211e]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3a352e] bg-[#24211e] text-[#fffdfa]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-sm bg-[#fffdfa]/10 border border-[#fffdfa]/20 text-amber-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-400">
                {language === 'mr' ? 'नागरी समस्या नोंदणी व थेट मूल्यमापन' : 'OFFICIAL GAZETTE // CIVIC INTAKE'}
              </span>
              <h3 className="text-base font-serif font-bold text-[#fffdfa] mt-0.5">
                {t.newIssueModalTitle}
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-sm text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Title */}
          <div>
            <label className="block text-xs font-serif font-bold text-[#24211e] mb-1">
              {t.issueTitleLabel} <span className="text-rose-700">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.issueTitlePlaceholder}
              className="w-full bg-[#fbf9f4] border border-[#c4b6a3] rounded-sm px-3 py-2 text-xs font-medium text-[#24211e] placeholder:text-[#8c8275] focus:outline-none focus:border-[#24211e]"
            />
          </div>

          {/* Ward & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-serif font-bold text-[#24211e] mb-1">
                {t.wardLabel} <span className="text-rose-700">*</span>
              </label>
              <select
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="w-full bg-[#fbf9f4] border border-[#c4b6a3] rounded-sm px-3 py-2 text-xs font-bold text-[#24211e] focus:outline-none focus:border-[#24211e]"
              >
                {WARDS_LIST.filter(w => w !== 'All Wards').map(w => (
                  <option key={w} value={w}>{getWardName(w)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-serif font-bold text-[#24211e] mb-1">
                {t.categoryLabel} <span className="text-rose-700">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IssueCategory)}
                className="w-full bg-[#fbf9f4] border border-[#c4b6a3] rounded-sm px-3 py-2 text-xs font-bold text-[#24211e] focus:outline-none focus:border-[#24211e]"
              >
                {CATEGORIES_LIST.filter(c => c !== 'All Categories').map(c => (
                  <option key={c} value={c}>{getCategoryName(c)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Landmark */}
          <div>
            <label className="block text-xs font-serif font-bold text-[#24211e] mb-1">
              {t.landmarkLabel} <span className="text-rose-700">*</span>
            </label>
            <input
              type="text"
              required
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder={t.landmarkPlaceholder}
              className="w-full bg-[#fbf9f4] border border-[#c4b6a3] rounded-sm px-3 py-2 text-xs font-medium text-[#24211e] placeholder:text-[#8c8275] focus:outline-none focus:border-[#24211e]"
            />
          </div>

          {/* Dynamic Weight Sliders Box */}
          <div className="p-4 rounded-sm bg-[#f7f3ec] border border-[#e3dacd] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#24211e]">
                <BrainCircuit className="w-4 h-4 text-[#6b2d18]" />
                <span>{t.priorityScoringFactors}</span>
              </div>
              <div className="gazette-stamp gazette-stamp-high">
                {t.computedUrgency}: {computedUrgencyScore}/100
              </div>
            </div>

            {/* Safety Risk */}
            <div>
              <div className="flex justify-between text-xs text-[#24211e] font-bold mb-1">
                <span>{t.safetyHazardSlider}:</span>
                <span className="font-mono font-black text-rose-800">{safetyRisk}</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={safetyRisk}
                onChange={(e) => setSafetyRisk(Number(e.target.value))}
                className="w-full accent-rose-700 h-1.5 bg-[#e3dacd] rounded-sm cursor-pointer"
              />
            </div>

            {/* Citizen Reports */}
            <div>
              <div className="flex justify-between text-xs text-[#24211e] font-bold mb-1">
                <span>{t.citizenReportsSlider}:</span>
                <span className="font-mono font-black text-blue-800">{citizenReports} {language === 'mr' ? 'तक्रारी' : 'reports'}</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={citizenReports}
                onChange={(e) => setCitizenReports(Number(e.target.value))}
                className="w-full accent-blue-700 h-1.5 bg-[#e3dacd] rounded-sm cursor-pointer"
              />
            </div>

            {/* Critical Facility Proximity */}
            <div>
              <div className="flex justify-between text-xs text-[#24211e] font-bold mb-1">
                <span>{t.proximitySlider}:</span>
                <span className="font-mono font-black text-emerald-800">{facilityProximity}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={facilityProximity}
                onChange={(e) => setFacilityProximity(Number(e.target.value))}
                className="w-full accent-emerald-700 h-1.5 bg-[#e3dacd] rounded-sm cursor-pointer"
              />
            </div>
          </div>

          {/* Resources Input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-serif font-bold text-[#24211e] mb-1">
                {t.estimatedCostLabel}
              </label>
              <input
                type="number"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(Number(e.target.value))}
                className="w-full bg-[#fbf9f4] border border-[#c4b6a3] rounded-sm px-3 py-2 text-xs font-mono font-bold text-[#24211e] focus:outline-none focus:border-[#24211e]"
              />
            </div>
            <div>
              <label className="block text-xs font-serif font-bold text-[#24211e] mb-1">
                {t.estimatedCrewHoursLabel}
              </label>
              <input
                type="number"
                value={estimatedCrewHours}
                onChange={(e) => setEstimatedCrewHours(Number(e.target.value))}
                className="w-full bg-[#fbf9f4] border border-[#c4b6a3] rounded-sm px-3 py-2 text-xs font-mono font-bold text-[#24211e] focus:outline-none focus:border-[#24211e]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono font-bold text-[#59534c] hover:text-[#24211e] bg-[#f4efe6] border border-[#c4b6a3] hover:bg-[#e7e0d6] rounded-sm uppercase cursor-pointer"
            >
              {t.btnCancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-mono font-bold text-[#fffdfa] bg-[#24211e] hover:bg-[#3a352e] rounded-sm transition-all shadow-xs border border-black flex items-center gap-1.5 uppercase cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              {t.btnComputeRankAndIngest}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

