import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Search, ShieldAlert, FileText, CheckCircle } from 'lucide-react';

interface Attempt {
  _id: string;
  studentId: {
    name: string;
    email: string;
  } | null;
  templateId: {
    _id: string;
    title: string;
    passingPercentage?: number;
  } | null;
  score: number;
  maxScore: number;
  warningsCount: number;
  tabSwitchesCount: number;
  cheatingDetected?: boolean;
  createdAt: string;
}

export const HistoricalResults: React.FC = () => {
  const { api } = useAuth();

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateTitle, setSelectedTemplateTitle] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  useEffect(() => {
    fetchAttempts();
  }, []);

  const fetchAttempts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/attempts/teacher');
      setAttempts(Array.isArray(res?.data) ? res.data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch test attempts results');
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  };

  const safeAttempts = Array.isArray(attempts) ? attempts : [];
  const uniqueTemplates = Array.from(new Set(safeAttempts.map((a) => a.templateId?.title))).filter(Boolean);

  const filteredAttempts = attempts.filter((att) => {
    const studentName = att.studentId?.name || '';
    const studentEmail = att.studentId?.email || '';
    const templateTitle = att.templateId?.title || '';

    const matchesSearch =
      studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTemplate = selectedTemplateTitle === 'ALL' || templateTitle === selectedTemplateTitle;

    const isDisqualified = att.cheatingDetected === true;
    const percentage = att.maxScore > 0 ? Math.round((att.score / att.maxScore) * 100) : 0;
    const isPassing = !isDisqualified && percentage >= (att.templateId?.passingPercentage ?? 50);

    let matchesStatus = true;
    if (selectedStatus === 'PASS') {
      matchesStatus = isPassing;
    } else if (selectedStatus === 'FAIL') {
      matchesStatus = !isPassing && !isDisqualified;
    } else if (selectedStatus === 'DISQUALIFIED') {
      matchesStatus = isDisqualified;
    }

    return matchesSearch && matchesTemplate && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-950">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-6 text-xs">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Candidate Grading Records</h1>
        <p className="text-sm text-slate-400 mt-1">Review student performance reports, grades, and security compliance records.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Filter panel */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-850 p-4 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate by name or email..."
            className="block w-full pl-9 pr-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer w-36"
            >
              <option value="ALL">All Results</option>
              <option value="PASS">Passed Only</option>
              <option value="FAIL">Failed Only</option>
              <option value="DISQUALIFIED">Disqualified</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Exam Filter:</span>
            <select
              value={selectedTemplateTitle}
              onChange={(e) => setSelectedTemplateTitle(e.target.value)}
              className="px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer w-full sm:w-52"
            >
              <option value="ALL">All Exam Templates</option>
              {uniqueTemplates.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">Candidate</th>
                <th className="py-4 px-6">Exam Title</th>
                <th className="py-4 px-6">Date Attempted</th>
                <th className="py-4 px-6 text-center">Score Grade</th>
                <th className="py-4 px-6 text-center">Security Violations</th>
                <th className="py-4 px-6 text-center">compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredAttempts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    No results found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAttempts.map((att) => {
                  const isDisqualified = att.cheatingDetected === true;
                  const percentage = att.maxScore > 0 ? Math.round((att.score / att.maxScore) * 100) : 0;
                  const isPassing = !isDisqualified && percentage >= (att.templateId?.passingPercentage ?? 50);
                  const isSuspicious = isDisqualified || att.warningsCount >= 3;

                  return (
                    <tr key={att._id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-white text-xs">{att.studentId?.name || 'Deleted User'}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{att.studentId?.email || 'N/A'}</div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          {att.templateId?.title || 'Deleted Template'}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(att.createdAt).toLocaleDateString()}{' '}
                          <span className="text-[9px] text-slate-650 font-mono">
                            {new Date(att.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <div className="inline-block">
                          {isDisqualified ? (
                            <div className="text-rose-500 font-extrabold text-xs uppercase tracking-wider">
                              0 / {att.maxScore} (Cheating)
                            </div>
                          ) : (
                            <>
                              <div className={`font-black text-sm ${isPassing ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {att.score} / {att.maxScore}
                              </div>
                              <span className="text-[9px] text-slate-500">({percentage}%)</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center">
                          <span
                            className={`font-black text-[10px] px-2 py-0.5 rounded ${
                              att.warningsCount > 0
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'text-slate-500'
                            }`}
                          >
                            {att.warningsCount} warnings
                          </span>
                          <span className="text-[8px] text-slate-550 mt-1">({att.tabSwitchesCount} tab changes)</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center">
                        {isDisqualified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase tracking-wide">
                            <ShieldAlert className="w-3 h-3" /> Disqualified
                          </span>
                        ) : isSuspicious ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wide">
                            <ShieldAlert className="w-3 h-3" /> Flagged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                            <CheckCircle className="w-3 h-3" /> Integrity Ok
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
