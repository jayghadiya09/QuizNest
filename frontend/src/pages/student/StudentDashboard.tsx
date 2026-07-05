import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ClipboardList, Play, Clock, Calendar, CheckCircle, ShieldAlert, Award } from 'lucide-react';

interface Subject {
  _id: string;
  name: string;
}

interface ExamTemplate {
  _id: string;
  title: string;
  description?: string;
  subjectId: Subject | null;
  duration: number;
  maxAttempts: number;
  createdBy: {
    name: string;
    email: string;
  };
}

interface Attempt {
  _id: string;
  templateId: {
    _id: string;
    title: string;
    duration: number;
    passingPercentage?: number;
  } | null;
  score: number;
  maxScore: number;
  warningsCount: number;
  tabSwitchesCount: number;
  cheatingDetected?: boolean;
  createdAt: string;
}

export const StudentDashboard: React.FC = () => {
  const { api } = useAuth();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<ExamTemplate | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [templatesRes, attemptsRes] = await Promise.all([
        api.get('/exams'),
        api.get('/attempts/student')
      ]);
      setTemplates(templatesRes.data);
      setAttempts(attemptsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (template: ExamTemplate) => {
    setSelectedTemplate(template);
  };

  const confirmStartExam = () => {
    if (selectedTemplate) {
      navigate(`/student/exam/${selectedTemplate._id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-950">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-8">
      {/* Welcome banner */}
      <div className="relative glass-panel rounded-2xl p-6 md:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <h1 className="text-3xl font-extrabold text-white">Student Dashboard</h1>
        <p className="mt-2 text-slate-400 max-w-xl">
          Welcome to your examination hub. Find active exams below or check details on your performance history.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Exams list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-brand-400" /> Active Examinations
            </h2>
            <span className="text-xs text-slate-500 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full font-bold">
              {templates.length} AVAILABLE
            </span>
          </div>

          {templates.length === 0 ? (
            <div className="glass-panel p-10 rounded-2xl text-center text-slate-500 border-dashed">
              No examinations are currently active or available.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => {
                const pastAttemptsCount = attempts.filter((att) => att.templateId?._id === template._id).length;
                const exceeded = pastAttemptsCount >= template.maxAttempts;

                return (
                  <div
                    key={template._id}
                    className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-brand-500/50 transition-all duration-300 relative group"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="text-[10px] font-bold text-brand-400 bg-brand-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {template.subjectId?.name || 'CS'}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-500" /> {template.duration} mins
                        </div>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-brand-400 transition-colors">
                        {template.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                        {template.description || 'No instructions provided.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="text-[10px] text-slate-500">
                        Attempts: <span className="text-slate-300 font-medium">{pastAttemptsCount}/{template.maxAttempts}</span>
                      </div>
                      
                      {exceeded ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" /> Max Attempted
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStartExam(template)}
                          className="flex items-center gap-1 text-[10px] font-bold bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg shadow-md shadow-brand-600/10 transition-colors animate-pulse"
                        >
                          <Play className="w-3 h-3 fill-current" /> Start Test
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Performance Summary */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-400" /> Scoreboard History
          </h2>

          {attempts.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl text-center text-slate-500 border-dashed">
              You haven't completed any attempts yet.
            </div>
          ) : (
            <div className="space-y-4">
              {attempts.map((att) => {
                const isDisqualified = att.cheatingDetected === true;
                const percentage = att.maxScore > 0 ? Math.round((att.score / att.maxScore) * 100) : 0;
                const isPassing = !isDisqualified && percentage >= (att.templateId?.passingPercentage ?? 50);

                return (
                  <div key={att._id} className={`glass-panel rounded-2xl p-4 space-y-3 ${isDisqualified ? 'border-rose-500/30 bg-rose-500/[0.02]' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-xs line-clamp-1">{att.templateId?.title || 'Exam'}</h4>
                        <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-1 font-mono">
                          <Calendar className="w-3 h-3" /> {new Date(att.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-right">
                        {isDisqualified ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase bg-rose-500/10 text-rose-500 border border-rose-500/25">
                            Disqualified
                          </span>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${isPassing ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                {isPassing ? 'Pass' : 'Fail'}
                              </span>
                              <div className={`text-sm font-extrabold ${isPassing ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {att.score}/{att.maxScore}
                              </div>
                            </div>
                            <div className="text-[9px] text-slate-450 mt-0.5 font-semibold">
                              Scored {percentage}% (Required: {att.templateId?.passingPercentage ?? 50}%)
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isDisqualified ? 'bg-rose-500' : isPassing ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: isDisqualified ? '100%' : `${percentage}%` }}
                      ></div>
                    </div>

                    {/* Session warnings log feedback */}
                    <div className="flex justify-between items-center text-[9px] bg-slate-950/50 p-2 rounded-lg border border-slate-900">
                      <span className="text-slate-500">Security violations logged:</span>
                      <span className={`font-bold flex items-center gap-1 ${isDisqualified ? 'text-rose-500 font-extrabold' : att.warningsCount > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                        <ShieldAlert className="w-3 h-3" />
                        {att.warningsCount} warnings ({att.tabSwitchesCount} tab)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Start Exam Instructions dialog */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl border-slate-700 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-2">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-white">Security Protocol Activation</h3>
              <p className="text-sm text-slate-400 mt-2">
                You are starting <span className="text-white font-semibold">{selectedTemplate.title}</span>.
              </p>
            </div>

            <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-900 text-xs space-y-2 text-slate-400">
              <p className="font-semibold text-slate-350">Important Instructions:</p>
              <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
                <li>Time Limit: <span className="text-white font-medium">{selectedTemplate.duration} minutes</span>.</li>
                <li>Do NOT switch tabs or minimize the window.</li>
                <li>Copy, paste, and right-click have been disabled on this exam.</li>
                <li>Defocusing the window will log a proctor warning flag.</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="flex-1 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmStartExam}
                className="flex-1 py-2 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-brand-600/20"
              >
                Accept & Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
