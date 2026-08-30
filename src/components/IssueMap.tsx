import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { CivicIssue } from '../types';
import { MapPin, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface IssueMapProps {
  issues: CivicIssue[];
  language?: 'en' | 'mr';
}

// Center of Kopargaon, Ahmednagar, Maharashtra, India
const KOPARGAON_CENTER: [number, number] = [19.8887, 74.4756];

/**
 * Creates custom Leaflet DivIcons styled with Tailwind colors based on urgencyScore.
 * Avoids broken static image asset references by rendering SVG pin HTML.
 */
function createUrgencyIcon(urgencyScore: number) {
  let bgColor = '#2563eb'; // Default Blue
  let borderColor = '#1d4ed8';
  let badgeText = urgencyScore.toString();
  let pulseClass = '';

  if (urgencyScore > 75) {
    bgColor = '#dc2626'; // Deep Red
    borderColor = '#7f1d1d';
    pulseClass = 'animate-ping opacity-75';
  } else if (urgencyScore >= 50) {
    bgColor = '#f97316'; // Orange
    borderColor = '#c2410c';
  }

  const html = `
    <div class="relative flex items-center justify-center">
      ${urgencyScore > 75 ? `<span class="absolute inline-flex h-8 w-8 rounded-full bg-red-400 ${pulseClass}"></span>` : ''}
      <div style="background-color: ${bgColor}; border-color: ${borderColor};" class="relative flex items-center justify-center w-7 h-7 rounded-full text-white font-black text-[11px] shadow-md border-2 border-white ring-2 ring-black/10 transition-transform transform hover:scale-110">
        <span>${badgeText}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-urgency-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export const IssueMap: React.FC<IssueMapProps> = ({ issues, language = 'en' }) => {
  // Filter issues with valid coordinates
  const geocodedIssues = issues.filter((issue) => {
    const lat = issue.latitude ?? issue.coordinates?.lat;
    const lng = issue.longitude ?? issue.coordinates?.lng;
    return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
  });

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-800">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              {language === 'mr' ? 'कोपरगाव प्रभाग थेट नकाश (GIS Dashboard)' : 'Kopargaon Spatial Priority Map (GIS)'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {language === 'mr' 
                ? `एकूण ${geocodedIssues.length} जिओटॅग केलेल्या तक्रारींचे थेट वर्गीकरण प्रदर्शित करत आहे` 
                : `Plotting ${geocodedIssues.length} geotagged civic complaints color-coded by AI urgency score`}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 self-start sm:self-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shadow-2xs ring-1 ring-red-300"></span>
            <span>{language === 'mr' ? 'अतितात्काळ (>७५)' : 'Critical (>75)'}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block shadow-2xs ring-1 ring-orange-300"></span>
            <span>{language === 'mr' ? 'उच्च (५०-७५)' : 'High (50-75)'}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-2xs ring-1 ring-blue-300"></span>
            <span>{language === 'mr' ? 'सामान्य (<५०)' : 'Normal (<50)'}</span>
          </span>
        </div>
      </div>

      {/* Map Viewport Container */}
      <div className="w-full h-96 rounded-xl overflow-hidden border border-slate-200 relative z-0 shadow-inner">
        <MapContainer
          center={KOPARGAON_CENTER}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {geocodedIssues.map((issue) => {
            const lat = (issue.latitude ?? issue.coordinates?.lat)!;
            const lng = (issue.longitude ?? issue.coordinates?.lng)!;
            const icon = createUrgencyIcon(issue.urgencyScore);

            const isCritical = issue.urgencyScore > 75;
            const isHigh = issue.urgencyScore >= 50 && issue.urgencyScore <= 75;

            return (
              <Marker key={issue.id} position={[lat, lng]} icon={icon}>
                <Popup className="custom-leaflet-popup">
                  <div className="p-1 min-w-[210px] font-sans">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
                      <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {issue.ticketNumber} (#{issue.currentRank})
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white uppercase ${
                          isCritical
                            ? 'bg-red-600'
                            : isHigh
                            ? 'bg-orange-500'
                            : 'bg-blue-600'
                        }`}
                      >
                        Urgency: {issue.urgencyScore}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-slate-900 leading-snug mb-1">
                      {issue.title}
                    </h4>

                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <p className="font-medium text-slate-700">
                        <strong className="text-slate-900">Category:</strong> {issue.category}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        <strong>Ward:</strong> {issue.ward}
                      </p>
                      <p className="text-[10px] text-slate-500 italic">
                        📍 {issue.locationLandmark}
                      </p>
                    </div>

                    {issue.isOverridden && (
                      <div className="mt-1.5 pt-1 border-t border-amber-100 text-[10px] text-amber-800 font-bold bg-amber-50 p-1 rounded">
                        ⚠️ Officer Overridden from Rank #{issue.overrideDetails?.originalRank}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default IssueMap;
