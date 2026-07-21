import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Plus, BookOpen, Clock, Activity, Trash2, Settings, Eye, Upload, Edit, RotateCcw } from 'lucide-react';


interface Subject {
  _id: string;
  name: string;
}

interface ExamTemplate {
  _id: string;
  title: string;
  description?: string;
  subjectId: {
    _id: string;
    name: string;
  } | null;
  duration: number;
  availabilityStart: string;
  availabilityEnd: string;
  difficultyDistribution: {
    easyCount: number;
    mediumCount: number;
    hardCount: number;
  };
  negativeMarkingRules: {
    enabled: boolean;
    penalty: number;
  };
  randomizationSettings?: {
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  };
  selectionMode?: 'AUTOMATIC' | 'MANUAL';
  manualQuestions?: string[];
  maxAttempts: number;
  passingPercentage?: number;
  isActive: boolean;
  createdAt: string;
}

export const TeacherDashboard: React.FC = () => {
  const { api } = useAuth();

  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Exam Template Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [newDuration, setNewDuration] = useState<number>(30);
  const [availStart, setAvailStart] = useState('');
  const [availEnd, setAvailEnd] = useState('');
  const [selectionMode, setSelectionMode] = useState<'AUTOMATIC' | 'MANUAL'>('AUTOMATIC');
  const [manualQuestions, setManualQuestions] = useState<string[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [passingPercentage, setPassingPercentage] = useState<number>(50);

  // Subject Add/Edit states
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showEditSubject, setShowEditSubject] = useState(false);
  const [subjectInputName, setSubjectInputName] = useState('');
  
  // Custom Rules
  const [negEnabled, setNegEnabled] = useState(false);
  const [negPenalty, setNegPenalty] = useState(0.25);
  const [shuffleQs, setShuffleQs] = useState(true);
  const [shuffleOpts, setShuffleOpts] = useState(true);
  const [easyCount, setEasyCount] = useState(2);
  const [mediumCount, setMediumCount] = useState(2);
  const [hardCount, setHardCount] = useState(1);
  const [maxAttempts, setMaxAttempts] = useState(1);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [templatesRes, subjectsRes, questionsRes] = await Promise.all([
        api.get('/exams'),
        api.get('/subjects'),
        api.get('/questions')
      ]);
      const validTemplates = Array.isArray(templatesRes?.data) ? templatesRes.data : [];
      const validSubjects = Array.isArray(subjectsRes?.data) ? subjectsRes.data : [];
      const validQuestions = Array.isArray(questionsRes?.data) ? questionsRes.data : [];

      setTemplates(validTemplates);
      setSubjects(validSubjects);
      setQuestions(validQuestions);

      if (validSubjects.length > 0) {
        setSelectedSubjectId(validSubjects[0]._id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve dashboard records');
      setTemplates([]);
      setSubjects([]);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedSubjectId) {
      setError('Please create or select a subject category');
      return;
    }

    if (!availStart || !availEnd) {
      setError('Please configure availability dates');
      return;
    }

    const payload = {
      title: newTitle,
      description: newDescription,
      subjectId: selectedSubjectId,
      duration: newDuration,
      availabilityStart: new Date(availStart).toISOString(),
      availabilityEnd: new Date(availEnd).toISOString(),
      negativeMarkingRules: {
        enabled: negEnabled,
        penalty: negEnabled ? negPenalty : 0
      },
      randomizationSettings: {
        shuffleQuestions: shuffleQs,
        shuffleOptions: shuffleOpts
      },
      difficultyDistribution: {
        easyCount: selectionMode === 'AUTOMATIC' ? easyCount : 0,
        mediumCount: selectionMode === 'AUTOMATIC' ? mediumCount : 0,
        hardCount: selectionMode === 'AUTOMATIC' ? hardCount : 0
      },
      maxAttempts,
      passingPercentage,
      selectionMode,
      manualQuestions: selectionMode === 'MANUAL' ? manualQuestions : []
    };

    try {
      if (editingTemplateId) {
        await api.put(`/exams/${editingTemplateId}`, payload);
      } else {
        await api.post('/exams', payload);
      }

      resetForm();
      fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to compile exam template');
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewDuration(30);
    setAvailStart('');
    setAvailEnd('');
    setNegEnabled(false);
    setEasyCount(2);
    setMediumCount(2);
    setHardCount(1);
    setMaxAttempts(1);
    setPassingPercentage(50);
    setSelectionMode('AUTOMATIC');
    setManualQuestions([]);
    setEditingTemplateId(null);
    setShowAddSubject(false);
    setShowEditSubject(false);
    setSubjectInputName('');
    setShowCreateModal(false);
  };

  const handleStartEdit = (t: ExamTemplate) => {
    setEditingTemplateId(t._id);
    setNewTitle(t.title);
    setNewDescription(t.description || '');
    setSelectedSubjectId(t.subjectId?._id || '');
    setNewDuration(t.duration);
    setPassingPercentage(t.passingPercentage || 50);
    
    // Format start/end UTC dates to local YYYY-MM-DDTHH:MM for inputs
    const startIso = new Date(t.availabilityStart);
    const endIso = new Date(t.availabilityEnd);
    
    // offset timezone helper
    const toLocalString = (date: Date) => {
      const pad = (num: number) => String(num).padStart(2, '0');
      const yyyy = date.getFullYear();
      const MM = pad(date.getMonth() + 1);
      const dd = pad(date.getDate());
      const hh = pad(date.getHours());
      const mm = pad(date.getMinutes());
      return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
    };

    setAvailStart(toLocalString(startIso));
    setAvailEnd(toLocalString(endIso));

    setNegEnabled(t.negativeMarkingRules?.enabled || false);
    setNegPenalty(t.negativeMarkingRules?.penalty || 0.25);
    setShuffleQs(t.randomizationSettings?.shuffleQuestions ?? true);
    setShuffleOpts(t.randomizationSettings?.shuffleOptions ?? true);
    setEasyCount(t.difficultyDistribution?.easyCount || 0);
    setMediumCount(t.difficultyDistribution?.mediumCount || 0);
    setHardCount(t.difficultyDistribution?.hardCount || 0);
    setMaxAttempts(t.maxAttempts || 1);
    setSelectionMode(t.selectionMode || 'AUTOMATIC');
    
    const manualIds = (t.manualQuestions || []).map((q: any) => {
      if (q && typeof q === 'object' && '_id' in q) {
        return q._id.toString();
      }
      return q.toString();
    });
    setManualQuestions(manualIds);
    setShowCreateModal(true);
  };

  const handleResetAttemptsForExam = async (templateId: string, examTitle: string) => {
    if (!window.confirm(`Are you sure you want to reset all student attempt records for "${examTitle}"? This will allow students to retake the exam.`)) {
      return;
    }
    try {
      await api.delete(`/attempts/reset/${templateId}`);
      alert(`All student attempts for "${examTitle}" have been reset successfully.`);
      fetchDashboardData();
    } catch (err: any) {
      const allAttempts = JSON.parse(localStorage.getItem('qn_db_attempts') || '[]');
      const filtered = allAttempts.filter((att: any) => {
        const attTempId = att.templateId?._id || att.templateId;
        return attTempId !== templateId;
      });
      localStorage.setItem('qn_db_attempts', JSON.stringify(filtered));
      alert(`All student attempts for "${examTitle}" have been reset successfully.`);
      fetchDashboardData();
    }
  };

  const handleAddSubject = async () => {

    if (!subjectInputName.trim()) return;
    try {
      const res = await api.post('/subjects', { name: subjectInputName.trim() });
      const newSub = res.data;
      setSubjects(prev => [...prev, newSub].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedSubjectId(newSub._id);
      setShowAddSubject(false);
      setSubjectInputName('');
    } catch (err: any) {
      alert(err.message || 'Failed to create subject category');
    }
  };

  const handleEditSubject = async () => {
    if (!subjectInputName.trim() || !selectedSubjectId) return;
    try {
      const res = await api.put(`/subjects/${selectedSubjectId}`, { name: subjectInputName.trim() });
      const updatedSub = res.data;
      setSubjects(prev => prev.map(s => s._id === selectedSubjectId ? updatedSub : s).sort((a, b) => a.name.localeCompare(b.name)));
      setShowEditSubject(false);
      setSubjectInputName('');
    } catch (err: any) {
      alert(err.message || 'Failed to update subject category');
    }
  };

  const formatTemplateDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const handleDeleteTemplate = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the template "${title}"?`)) {
      return;
    }

    try {
      await api.delete(`/exams/${id}`);
      setTemplates((prev) => prev.filter((t) => t._id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-8 animate-pulse">
        <div className="h-32 bg-slate-900/80 rounded-2xl border border-slate-850"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 bg-slate-900/60 rounded-2xl border border-slate-850"></div>
          <div className="h-44 bg-slate-900/60 rounded-2xl border border-slate-850"></div>
          <div className="h-44 bg-slate-900/60 rounded-2xl border border-slate-850"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-8">
      {/* Welcome Banner */}
      <div className="relative glass-panel rounded-2xl p-6 md:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Teacher Command Hub</h1>
            <p className="mt-1.5 text-slate-400 max-w-xl">
              Configure dynamic exam templates, write question pools, import bulk JSON databases, and track active candidate sessions.
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white font-extrabold text-sm px-5 py-3 rounded-xl shadow-xl shadow-brand-500/20 hover:shadow-brand-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Question Paper
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Grid Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/teacher/questions"
          className="glass-panel p-5 rounded-2xl flex items-start gap-4 hover:border-brand-500/50 transition-all group"
        >
          <div className="p-3 bg-brand-500/10 rounded-xl text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Question Pool</h3>
            <p className="text-[11px] text-slate-400 mt-1">Add or edit individual MCQs and short answers.</p>
          </div>
        </Link>

        <Link
          to="/teacher/import"
          className="glass-panel p-5 rounded-2xl flex items-start gap-4 hover:border-brand-500/50 transition-all group"
        >
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Bulk Import</h3>
            <p className="text-[11px] text-slate-400 mt-1">Upload JSON question databases (100+ questions).</p>
          </div>
        </Link>

        <Link
          to="/teacher/monitor"
          className="glass-panel p-5 rounded-2xl flex items-start gap-4 hover:border-brand-500/50 transition-all group"
        >
          <div className="p-3 bg-red-500/10 rounded-xl text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
            <span className="relative flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500"></span>
            </span>
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Live Proctor</h3>
            <p className="text-[11px] text-slate-400 mt-1">Track active exams and window focus violations in real time.</p>
          </div>
        </Link>

        <Link
          to="/teacher/results"
          className="glass-panel p-5 rounded-2xl flex items-start gap-4 hover:border-brand-500/50 transition-all group"
        >
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">History Logs</h3>
            <p className="text-[11px] text-slate-400 mt-1">Verify student grades and anti-cheat reports.</p>
          </div>
        </Link>
      </div>

      {/* Main Content: Templates List */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-200">Exam Templates</h2>

        {templates.length === 0 ? (
          <div className="glass-panel p-10 rounded-2xl text-center text-slate-500 border-dashed">
            No templates configured yet. Click "Create Exam Template" to begin.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((t) => (
              <div
                key={t._id}
                className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-slate-800 transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1.5">
                      <span className="text-[9px] font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/15 uppercase">
                        {t.subjectId?.name || 'General'}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15 uppercase">
                        Pass: {t.passingPercentage || 50}%
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Max Attempts: {t.maxAttempts}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mt-3 line-clamp-1">{t.title}</h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                    {t.description || 'No instructions provided.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-900 flex flex-col gap-1.5 text-[10px] text-slate-500">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-550 font-bold uppercase tracking-wider text-[8px]">Available From</span>
                      <span className="font-semibold text-slate-350">{formatTemplateDate(t.availabilityStart)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-550 font-bold uppercase tracking-wider text-[8px]">Available Until</span>
                      <span className="font-semibold text-slate-350">{formatTemplateDate(t.availabilityEnd)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" /> {t.duration}m
                    </span>
                    <span className="flex items-center gap-1" title={t.selectionMode === 'MANUAL' ? 'Manually selected questions' : 'Dynamic distribution (Easy/Medium/Hard)'}>
                      <Settings className="w-3.5 h-3.5 text-slate-500" />
                      {t.selectionMode === 'MANUAL'
                        ? `${t.manualQuestions?.length || 0} Qs`
                        : `${(t.difficultyDistribution?.easyCount || 0) + (t.difficultyDistribution?.mediumCount || 0) + (t.difficultyDistribution?.hardCount || 0)} Qs`
                      }
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResetAttemptsForExam(t._id, t.title)}
                      className="p-1.5 rounded-lg bg-amber-500/10 border border-transparent hover:border-amber-500/25 text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
                      title="Reset All Student Attempts for this Exam"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartEdit(t)}

                      className="p-1.5 rounded-lg bg-brand-550/10 border border-transparent hover:border-brand-500/25 text-brand-400 hover:bg-brand-500/20 transition-all cursor-pointer"
                      title="Edit Template"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/teacher/monitor?exam=${t._id}`}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-300 transition-colors"
                      title="Monitor Proctoring"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteTemplate(t._id, t.title)}
                      className="p-1.5 rounded-lg bg-red-500/10 border border-transparent hover:border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Template Dialog Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel max-w-2xl w-full rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl border-slate-700 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div>
              <h3 className="text-xl font-bold text-white">
                {editingTemplateId ? 'Edit Question Paper' : 'Create Question Paper'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configure layout, grading rules, and question distributions.</p>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                    Exam Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="E.g., CS101 Final Exam"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                      Subject Category
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddSubject(true);
                          setShowEditSubject(false);
                          setSubjectInputName('');
                        }}
                        className="text-[9px] font-bold text-brand-400 hover:text-brand-300 uppercase cursor-pointer"
                      >
                        + Add
                      </button>
                      {selectedSubjectId && (
                        <button
                          type="button"
                          onClick={() => {
                            const currentSub = subjects.find(s => s._id === selectedSubjectId);
                            if (currentSub) {
                              setSubjectInputName(currentSub.name);
                              setShowEditSubject(true);
                              setShowAddSubject(false);
                            }
                          }}
                          className="text-[9px] font-bold text-brand-400 hover:text-brand-300 uppercase cursor-pointer"
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {showAddSubject && (
                    <div className="flex gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-900 mt-1 animate-in slide-in-from-top-2 duration-150">
                      <input
                        type="text"
                        value={subjectInputName}
                        onChange={(e) => setSubjectInputName(e.target.value)}
                        placeholder="New Subject Name"
                        className="flex-1 px-2 py-1 bg-slate-900 border border-slate-800 text-white rounded text-[10px]"
                      />
                      <button
                        type="button"
                        onClick={handleAddSubject}
                        className="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded text-[10px] cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddSubject(false)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold rounded text-[10px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {showEditSubject && (
                    <div className="flex gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-900 mt-1 animate-in slide-in-from-top-2 duration-150">
                      <input
                        type="text"
                        value={subjectInputName}
                        onChange={(e) => setSubjectInputName(e.target.value)}
                        placeholder="Edit Subject Name"
                        className="flex-1 px-2 py-1 bg-slate-900 border border-slate-800 text-white rounded text-[10px]"
                      />
                      <button
                        type="button"
                        onClick={handleEditSubject}
                        className="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded text-[10px] cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEditSubject(false)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold rounded text-[10px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {!showAddSubject && !showEditSubject && (
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                    >
                      {subjects.map((sub) => (
                        <option key={sub._id} value={sub._id}>{sub.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                  Description / Instructions
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 h-16 resize-none"
                  placeholder="Exam instructions, anti-cheat regulations..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                    Duration (m)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newDuration}
                    onChange={(e) => setNewDuration(parseInt(e.target.value) || 0)}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                    Max Attempts
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                    Pass Score (%)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={passingPercentage}
                    onChange={(e) => setPassingPercentage(Math.max(1, Math.min(100, parseInt(e.target.value) || 50)))}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                    Negative Marking
                  </label>
                  <div className="flex items-center gap-2 h-9">
                    <input
                      type="checkbox"
                      checked={negEnabled}
                      onChange={(e) => setNegEnabled(e.target.checked)}
                      className="accent-brand-500 h-4 w-4 cursor-pointer"
                    />
                    {negEnabled && (
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={negPenalty}
                        onChange={(e) => setNegPenalty(parseFloat(e.target.value) || 0)}
                        className="w-16 px-1.5 py-1 border border-slate-800 rounded bg-slate-900 text-white text-[10px]"
                        placeholder="0.25"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Availability Windows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                    Available From
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={availStart}
                    onChange={(e) => setAvailStart(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer datetime-picker-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                    Available Until
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={availEnd}
                    onChange={(e) => setAvailEnd(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer datetime-picker-input"
                  />
                </div>
              </div>

              {/* Selection Mode Selector */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                  Question Selection Mode
                </label>
                <div className="flex gap-6 py-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-205 text-white">
                    <input
                      type="radio"
                      name="selectionMode"
                      value="AUTOMATIC"
                      checked={selectionMode === 'AUTOMATIC'}
                      onChange={() => setSelectionMode('AUTOMATIC')}
                      className="accent-brand-500 cursor-pointer h-4 w-4"
                    />
                    Automatic Selection
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-205 text-white">
                    <input
                      type="radio"
                      name="selectionMode"
                      value="MANUAL"
                      checked={selectionMode === 'MANUAL'}
                      onChange={() => setSelectionMode('MANUAL')}
                      className="accent-brand-500 cursor-pointer h-4 w-4"
                    />
                    Manual Selection
                  </label>
                </div>
              </div>

              {/* Dynamic Difficulty Distribution OR Manual Checklist */}
              {selectionMode === 'AUTOMATIC' ? (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-350 uppercase tracking-wider">Dynamic Question Distribution</h4>
                  <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-900">
                    <div className="space-y-1">
                      <label className="text-slate-500 text-[10px] uppercase font-bold">Easy Questions</label>
                      <input
                        type="number"
                        min="0"
                        value={easyCount}
                        onChange={(e) => setEasyCount(parseInt(e.target.value) || 0)}
                        className="block w-full px-2.5 py-1.5 border border-slate-800 rounded-md bg-slate-900 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 text-[10px] uppercase font-bold">Medium Questions</label>
                      <input
                        type="number"
                        min="0"
                        value={mediumCount}
                        onChange={(e) => setMediumCount(parseInt(e.target.value) || 0)}
                        className="block w-full px-2.5 py-1.5 border border-slate-800 rounded-md bg-slate-900 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 text-[10px] uppercase font-bold">Hard Questions</label>
                      <input
                        type="number"
                        min="0"
                        value={hardCount}
                        onChange={(e) => setHardCount(parseInt(e.target.value) || 0)}
                        className="block w-full px-2.5 py-1.5 border border-slate-800 rounded-md bg-slate-900 text-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-350 uppercase tracking-wider">Select Questions Checklist</h4>
                  <div className="max-h-48 overflow-y-auto bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-2">
                    {questions.filter(q => {
                      const qSubId = q.subjectId && typeof q.subjectId === 'object' && '_id' in q.subjectId ? q.subjectId._id : q.subjectId;
                      return qSubId === selectedSubjectId;
                    }).length === 0 ? (
                      <div className="text-[10px] text-slate-500 text-center py-6">
                        No active questions found in this subject category.
                      </div>
                    ) : (
                      questions
                        .filter(q => {
                          const qSubId = q.subjectId && typeof q.subjectId === 'object' && '_id' in q.subjectId ? q.subjectId._id : q.subjectId;
                          return qSubId === selectedSubjectId;
                        })
                        .map((q) => {
                          const isChecked = manualQuestions.includes(q._id);
                          return (
                            <label
                              key={q._id}
                              className="flex items-start gap-2.5 p-2.5 rounded bg-slate-900/40 hover:bg-slate-900/70 border border-slate-900 hover:border-slate-800 cursor-pointer text-[10px] text-slate-300"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setManualQuestions((prev) => [...prev, q._id]);
                                  } else {
                                    setManualQuestions((prev) => prev.filter((id) => id !== q._id));
                                  }
                                }}
                                className="accent-brand-500 mt-0.5 cursor-pointer"
                              />
                              <div className="flex-1">
                                <div className="font-bold text-white leading-normal">{q.questionText}</div>
                                <div className="flex gap-2 text-[8px] text-slate-500 mt-1 uppercase font-mono">
                                  <span>{q.difficulty}</span>
                                  <span>{q.type.replace('_', ' ')}</span>
                                  <span>{q.marks} Mark(s)</span>
                                </div>
                              </div>
                            </label>
                          );
                        })
                    )}
                  </div>
                  <div className="text-[10px] text-brand-400 font-semibold mt-1">
                    Selected manual questions: {manualQuestions.length}
                  </div>
                </div>
              )}

              {/* Shuffling options */}
              <div className="flex gap-6 py-2 bg-slate-900/40 p-3 rounded-lg border border-slate-850">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={shuffleQs}
                    onChange={(e) => setShuffleQs(e.target.checked)}
                    className="accent-brand-500 h-4 w-4 cursor-pointer"
                  />
                  Shuffle Question Order
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={shuffleOpts}
                    onChange={(e) => setShuffleOpts(e.target.checked)}
                    className="accent-brand-500 h-4 w-4 cursor-pointer"
                  />
                  Shuffle MCQ Choices
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors shadow-lg shadow-brand-600/20 cursor-pointer"
                >
                  {editingTemplateId ? 'Save Changes' : 'Compile & Deploy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
