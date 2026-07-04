import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Upload, FileCode, CheckCircle, Plus, AlertCircle } from 'lucide-react';

interface Subject {
  _id: string;
  name: string;
}

export const BulkImport: React.FC = () => {
  const { api } = useAuth();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [jsonText, setJsonText] = useState('');
  
  // New Subject Form
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');

  // Import Metrics Results
  const [report, setReport] = useState<{
    createdCount: number;
    skippedCount: number;
    errorCount: number;
    errors: string[];
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/subjects');
      setSubjects(res.data);
      if (res.data.length > 0) {
        setSelectedSubjectId(res.data[0]._id);
      }
    } catch (err: any) {
      setError('Failed to load subjects pool');
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newSubName) return;

    try {
      const res = await api.post('/subjects', {
        name: newSubName,
        description: newSubDesc
      });
      setSubjects((prev) => [...prev, res.data]);
      setSelectedSubjectId(res.data._id);
      setNewSubName('');
      setNewSubDesc('');
      setShowAddSubject(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create subject');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setReport(null);
    setSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        JSON.parse(text);
        setJsonText(text);
      } catch (err) {
        setError('Selected file is not valid JSON. Please check file formatting.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setError(null);
    setSuccess(null);
    setReport(null);

    if (!selectedSubjectId) {
      setError('Please select or create a subject category first.');
      return;
    }

    if (!jsonText.trim()) {
      setError('Please paste question JSON payload or upload a valid file.');
      return;
    }

    let questionsList: any[];
    try {
      questionsList = JSON.parse(jsonText);
      if (!Array.isArray(questionsList)) {
        setError('Invalid question format: Root level of JSON must be a list array.');
        return;
      }
    } catch (err) {
      setError('JSON parsing failed. Ensure syntax matches expected standards.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/questions/import', {
        subjectId: selectedSubjectId,
        questionsList
      });

      setReport(res.data);
      if (res.data.createdCount > 0) {
        setSuccess(`Successfully imported ${res.data.createdCount} new questions into the database.`);
      } else if (res.data.errorCount > 0) {
        setError('All records in the payload failed validation checking.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Bulk import server request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-8 text-slate-250">
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2.5">
          <FileCode className="w-8 h-8 text-brand-400" /> JSON Bulk Import Node
        </h1>
        <p className="text-slate-400 mt-2 text-sm">
          Upload or paste structured JSON databases directly into subject pools with instant syntax validation.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-2.5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-2.5 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Target Subject Selector */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Target Subject Category
              </label>
              <button
                type="button"
                onClick={() => setShowAddSubject(!showAddSubject)}
                className="flex items-center gap-1 text-brand-400 hover:text-brand-300 font-bold transition-all text-xs"
              >
                <Plus className="w-4 h-4" /> New Subject
              </button>
            </div>

            {showAddSubject ? (
              <form onSubmit={handleCreateSubject} className="p-4 bg-slate-950/60 rounded-xl border border-slate-850 space-y-4">
                <p className="font-bold text-white text-xs uppercase tracking-wider">Create Category</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Subject Name (e.g. Operating Systems)"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="block w-full px-4 py-2 border border-slate-800 rounded-lg bg-slate-900 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <input
                    type="text"
                    placeholder="Brief description..."
                    value={newSubDesc}
                    onChange={(e) => setNewSubDesc(e.target.value)}
                    className="block w-full px-4 py-2 border border-slate-800 rounded-lg bg-slate-900 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="flex gap-3 justify-end text-xs">
                  <button
                    type="button"
                    onClick={() => setShowAddSubject(false)}
                    className="px-3 py-1.5 text-slate-400 hover:text-white font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded"
                  >
                    Create
                  </button>
                </div>
              </form>
            ) : (
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-800 rounded-xl bg-slate-900 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
              >
                {subjects.map((sub) => (
                  <option key={sub._id} value={sub._id} className="bg-slate-900 text-slate-100">
                    {sub.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* JSON Upload & Area */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                JSON Data Input
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  id="file-import"
                  className="hidden"
                />
                <label
                  htmlFor="file-import"
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-white font-bold px-4 py-2 rounded-xl border border-slate-700 cursor-pointer transition-colors text-xs"
                >
                  <Upload className="w-4 h-4" /> Upload File
                </label>
              </div>
            </div>

            <textarea
              rows={12}
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setReport(null);
                setSuccess(null);
              }}
              placeholder='[\n  {\n    "type": "SINGLE_MCQ",\n    "questionText": "Question description?",\n    "options": ["Opt A", "Opt B", "Opt C"],\n    "correctAnswers": ["1"],\n    "difficulty": "MEDIUM",\n    "marks": 2\n  }\n]'
              className="w-full p-4 font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-transparent leading-relaxed"
            />

            <button
              onClick={handleImport}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs uppercase tracking-wider"
            >
              {loading ? 'Processing Import...' : 'Validate & Import Database'}
            </button>
          </div>
        </div>

        {/* JSON Schema Format Helper */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
              Expected JSON Format
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Format imports as a JSON array of question objects.
            </p>
            <pre className="p-3 bg-slate-950/80 rounded-xl border border-slate-850/80 text-[10px] font-mono text-brand-300 overflow-x-auto leading-relaxed">
{`[
  {
    "type": "SINGLE_MCQ",
    "questionText": "JavaScript type?",
    "options": ["String", "Float"],
    "correctAnswers": ["0"],
    "difficulty": "EASY",
    "marks": 1
  },
  {
    "type": "SHORT_ANSWER",
    "questionText": "Describe BST search.",
    "correctAnswers": ["o(log n)"],
    "difficulty": "MEDIUM",
    "marks": 2
  }
]`}
            </pre>
          </div>

          {/* Validation Report */}
          {report && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                Import Session Report
              </h3>
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <div className="text-emerald-400 font-extrabold text-xl">{report.createdCount}</div>
                  <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Success</div>
                </div>
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <div className="text-yellow-400 font-extrabold text-xl">{report.skippedCount}</div>
                  <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Skipped</div>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <div className="text-red-400 font-extrabold text-xl">{report.errorCount}</div>
                  <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Failed</div>
                </div>
              </div>

              {report.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-red-400">Validation Failures:</div>
                  <div className="max-h-48 overflow-y-auto p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1.5 font-mono text-[10px] text-slate-400 leading-normal">
                    {report.errors.map((err, i) => (
                      <div key={i} className="flex gap-1.5">
                        <span className="text-red-500 font-bold">•</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};