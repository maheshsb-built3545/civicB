import React, { useState } from 'react';
import { AuditLogEntry } from '../types';
import { 
  FileText, 
  ShieldAlert, 
  CheckCircle2, 
  Search, 
  Download, 
  Filter, 
  History, 
  Calendar, 
  User, 
  Activity,
  Layers
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface AuditLogTableProps {
  logs: AuditLogEntry[];
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({ logs }) => {
  const { language, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.issueTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.officerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = 
      actionFilter === 'ALL' || log.actionType === actionFilter;

    return matchesSearch && matchesAction;
  });

  // Export audit logs as CSV for civic transparency
  const handleExportCSV = () => {
    const headers = ['Log ID', 'Timestamp', 'Action Type', 'Ticket Number', 'Issue Title', 'Authorizing Officer', 'Role', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      l.actionType,
      l.ticketNumber,
      `"${l.issueTitle.replace(/"/g, '""')}"`,
      `"${l.officerName}"`,
      `"${l.officerRole}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Kopargaon_Civic_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (type: AuditLogEntry['actionType']) => {
    switch (type) {
      case 'RANKING_OVERRIDE':
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-purple-700" />,
          label: language === 'mr' ? 'प्राधान्य बदल (Override)' : 'Priority Override',
          className: 'bg-purple-50 text-purple-900 border-purple-200'
        };
      case 'WORK_ORDER_APPROVED':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />,
          label: language === 'mr' ? 'कामाचे आदेश जारी' : 'Work Order Dispatched',
          className: 'bg-emerald-50 text-emerald-900 border-emerald-200'
        };
      case 'DATA_VERIFIED':
        return {
          icon: <Activity className="w-3.5 h-3.5 text-cyan-700" />,
          label: language === 'mr' ? 'पडताळणी पूर्ण' : 'Data Verified',
          className: 'bg-cyan-50 text-cyan-900 border-cyan-200'
        };
      case 'RESOURCE_REBALANCED':
        return {
          icon: <Layers className="w-3.5 h-3.5 text-blue-700" />,
          label: language === 'mr' ? 'साधनसामग्री पुनर्संतुलन' : 'Sprint Rebalanced',
          className: 'bg-blue-50 text-blue-900 border-blue-200'
        };
      default:
        return {
          icon: <FileText className="w-3.5 h-3.5 text-slate-500" />,
          label: language === 'mr' ? 'नोंद' : 'Log Entry',
          className: 'bg-slate-100 text-slate-700 border-slate-200'
        };
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#0f2942] text-amber-400 border border-[#1e3a8a]">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-[#0f2942] uppercase tracking-tight">
              {t.auditTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-1">
            {t.auditSubtitle}
          </p>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-[#0f2942]" />
          <span>{t.exportAuditCSV}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={language === 'mr' ? 'तक्रार क्रमांक, अधिकारी किंवा शब्द शोधा...' : 'Search ticket, officer, or keyword...'}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0f2942] focus:border-[#0f2942]"
          />
        </div>

        {/* Action Type Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {[
            { id: 'ALL', label: language === 'mr' ? 'सर्व नोंदी' : 'All Logs' },
            { id: 'RANKING_OVERRIDE', label: language === 'mr' ? 'प्राधान्य बदल' : 'Overrides' },
            { id: 'WORK_ORDER_APPROVED', label: language === 'mr' ? 'कामाचे आदेश' : 'Work Orders' },
            { id: 'DATA_VERIFIED', label: language === 'mr' ? 'पडताळणी' : 'Verifications' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActionFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                actionFilter === tab.id
                  ? 'bg-[#0f2942] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table / Timeline List */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <div className="divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-medium">
              {language === 'mr' ? 'कोणतीही ऑडिट नोंद सापडली नाही.' : 'No audit records match your query.'}
            </div>
          ) : (
            filteredLogs.map((log) => {
              const badge = getActionBadge(log.actionType);
              return (
                <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${badge.className}`}>
                        {badge.icon}
                        {badge.label}
                      </span>

                      <span className="font-mono text-xs font-bold text-slate-700">
                        {log.ticketNumber}
                      </span>

                      <span className="text-xs font-bold text-slate-900 truncate max-w-sm">
                        {log.issueTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono shrink-0">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Details / Justification paragraph */}
                  <div className="mt-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed font-medium">
                    {log.details}
                  </div>

                  {/* Authorizing Officer strip */}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{language === 'mr' ? 'अधिकृत करणारे अधिकारी:' : 'Authorized by:'}</span>
                      <strong className="text-slate-800">{log.officerName}</strong>
                      <span className="text-slate-500">({log.officerRole})</span>
                    </div>

                    <span className="font-mono text-[10px] text-slate-400">
                      LogID: {log.id}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

