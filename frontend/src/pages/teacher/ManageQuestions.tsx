import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Trash2, Edit2, Filter, Search, X, CheckSquare, Square, Sparkles } from 'lucide-react';

interface Subject {
  _id: string;
  name: string;
}

interface Question {
  _id: string;
  type: 'SINGLE_MCQ' | 'MULTI_MCQ' | 'SHORT_ANSWER';
  subjectId: {
    _id: string;
    name: string;
  } | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string[];
  questionText: string;
  options: string[];
  correctAnswers: string[];
  marks: number;
}

export const ManageQuestions: React.FC = () => {
  const { api } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<'SINGLE_MCQ' | 'MULTI_MCQ' | 'SHORT_ANSWER'>('SINGLE_MCQ');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [tagsInput, setTagsInput] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']); // Default 4 options
  const [correctAnswersList, setCorrectAnswersList] = useState<string[]>([]); // MCQ option indices or text answers
  const [marks, setMarks] = useState(1);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');

  // Short Answer text input helper
  const [shortAnswerText, setShortAnswerText] = useState('');

  // AI Modal States
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [aiType, setAiType] = useState<'SINGLE_MCQ' | 'MULTI_MCQ' | 'SHORT_ANSWER'>('SINGLE_MCQ');
  const [aiCount, setAiCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) return;
    setGenerating(true);
    setAiError(null);
    try {
      const res = await api.post('/questions/generate-ai', {
        topic: aiTopic.trim(),
        difficulty: aiDifficulty,
        type: aiType,
        count: aiCount
      });
      setGeneratedQuestions(res.data);
    } catch (err: any) {
      setAiError(err.response?.data?.message || err.message || 'AI Generation failed. Ensure GEMINI_API_KEY is configured.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUseInForm = (q: any) => {
    setType(q.type);
    setDifficulty(q.difficulty);
    setTagsInput(q.tags ? q.tags.join(', ') : '');
    setQuestionText(q.questionText);
    
    const calculatedMarks = q.difficulty === 'EASY' ? 1 : q.difficulty === 'MEDIUM' ? 2 : 3;
    setMarks(q.marks || calculatedMarks);

    if (q.type === 'SHORT_ANSWER') {
      setOptions(['', '', '', '']);
      setCorrectAnswersList(q.correctAnswers);
    } else {
      const filledOptions = [...q.options];
      while (filledOptions.length < 4) {
        filledOptions.push('');
      }
      setOptions(filledOptions);
      setCorrectAnswersList(q.correctAnswers);
    }
    
    setShowAIModal(false);
    setGeneratedQuestions([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveSingleAI = async (q: any, indexToRemove: number) => {
    if (!selectedSubjectId) {
      setAiError('Please select a subject category in the main form first.');
      return;
    }
    try {
      const calculatedMarks = q.difficulty === 'EASY' ? 1 : q.difficulty === 'MEDIUM' ? 2 : 3;
      const payload = {
        type: q.type,
        subjectId: selectedSubjectId,
        difficulty: q.difficulty,
        tags: q.tags || [],
        questionText: q.questionText.trim(),
        options: q.type === 'SHORT_ANSWER' ? [] : q.options,
        correctAnswers: q.correctAnswers,
        marks: q.marks || calculatedMarks
      };

      await api.post('/questions', payload);
      setGeneratedQuestions((prev) => prev.filter((_, idx) => idx !== indexToRemove));
      fetchData();
    } catch (err: any) {
      setAiError(err.response?.data?.message || err.message || 'Failed to save question');
    }
  };

  const handleSaveAllAI = async () => {
    if (!selectedSubjectId) {
      setAiError('Please select a subject category in the main form first.');
      return;
    }
    setGenerating(true);
    try {
      for (const q of generatedQuestions) {
        const calculatedMarks = q.difficulty === 'EASY' ? 1 : q.difficulty === 'MEDIUM' ? 2 : 3;
        const payload = {
          type: q.type,
          subjectId: selectedSubjectId,
          difficulty: q.difficulty,
          tags: q.tags || [],
          questionText: q.questionText.trim(),
          options: q.type === 'SHORT_ANSWER' ? [] : q.options,
          correctAnswers: q.correctAnswers,
          marks: q.marks || calculatedMarks
        };
        await api.post('/questions', payload);
      }
      
      setShowAIModal(false);
      setGeneratedQuestions([]);
      fetchData();
    } catch (err: any) {
      setAiError(err.response?.data?.message || err.message || 'Failed to save all questions');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [questionsRes, subjectsRes] = await Promise.all([
        api.get('/questions'),
        api.get('/subjects')
      ]);
      const validQuestions = Array.isArray(questionsRes?.data) ? questionsRes.data : [];
      const validSubjects = Array.isArray(subjectsRes?.data) ? subjectsRes.data : [];

      setQuestions(validQuestions);
      setSubjects(validSubjects);
      if (validSubjects.length > 0) {
        setSelectedSubjectId(validSubjects[0]._id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch question pool');
      setQuestions([]);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    setOptions((prev) => {
      const updated = [...prev];
      updated[idx] = val;
      return updated;
    });
  };

  const toggleMCQCorrectAnswer = (idxStr: string) => {
    if (type === 'SINGLE_MCQ') {
      setCorrectAnswersList([idxStr]);
    } else {
      // MULTI_MCQ
      setCorrectAnswersList((prev) =>
        prev.includes(idxStr) ? prev.filter((a) => a !== idxStr) : [...prev, idxStr]
      );
    }
  };

  // Short-Answer tags helper
  const addShortAnswerTarget = () => {
    if (!shortAnswerText.trim()) return;
    const cleanText = shortAnswerText.trim().toLowerCase();
    if (!correctAnswersList.includes(cleanText)) {
      setCorrectAnswersList((prev) => [...prev, cleanText]);
    }
    setShortAnswerText('');
  };

  const removeShortAnswerTarget = (textVal: string) => {
    setCorrectAnswersList((prev) => prev.filter((a) => a !== textVal));
  };

  const resetForm = () => {
    setEditingId(null);
    setType('SINGLE_MCQ');
    setDifficulty('MEDIUM');
    setTagsInput('');
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectAnswersList([]);
    setMarks(1);
    setShortAnswerText('');
  };

  const handleEditClick = (q: Question) => {
    setEditingId(q._id);
    setType(q.type);
    setSelectedSubjectId(q.subjectId?._id || '');
    setDifficulty(q.difficulty);
    setTagsInput(q.tags.join(', '));
    setQuestionText(q.questionText);
    setMarks(q.marks);

    if (q.type === 'SHORT_ANSWER') {
      setOptions(['', '', '', '']);
      setCorrectAnswersList(q.correctAnswers);
    } else {
      setOptions(q.options);
      setCorrectAnswersList(q.correctAnswers);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedSubjectId) {
      setError('Please select a subject category');
      return;
    }

    let finalOptions: string[] = [];
    let finalAnswers = correctAnswersList;

    if (type !== 'SHORT_ANSWER') {
      finalOptions = options.map((o) => o.trim()).filter((o) => o !== '');
      if (finalOptions.length < 2) {
        setError('MCQ questions require at least 2 options');
        return;
      }
      if (finalAnswers.length === 0) {
        setError('Please select at least one correct option index');
        return;
      }
    } else {
      // SHORT_ANSWER
      if (finalAnswers.length === 0) {
        setError('Please add at least one correct answer text match');
        return;
      }
    }

    const payload = {
      type,
      subjectId: selectedSubjectId,
      difficulty,
      tags: tagsInput.split(',').map((t) => t.trim()).filter((t) => t !== ''),
      questionText: questionText.trim(),
      options: finalOptions,
      correctAnswers: finalAnswers,
      marks
    };

    try {
      if (editingId) {
        await api.put(`/questions/${editingId}`, payload);
      } else {
        await api.post('/questions', payload);
      }
      resetForm();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save question');
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question? This cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/questions/${id}`);
      setQuestions((prev) => prev.filter((q) => q._id !== id));
      if (editingId === id) resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to delete question');
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.questionText.toLowerCase().includes(search.toLowerCase()) ||
      (q.subjectId?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = filterDifficulty === 'ALL' || q.difficulty === filterDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-950">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Question Pool Editor</h1>
          <p className="text-sm text-slate-400 mt-1">Manage individual questions in your bank covering multiple test types.</p>
        </div>
        <button
          onClick={() => {
            setShowAIModal(true);
            setAiTopic('');
            setGeneratedQuestions([]);
            setAiError(null);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all font-semibold text-sm border border-indigo-500/30 active:scale-95 duration-150 self-start sm:self-center"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          Generate with AI ⚡
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Panel: Form */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center justify-between">
            <span>{editingId ? 'Edit Question' : 'Add New Question'}</span>
            {editingId && (
              <button onClick={resetForm} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            )}
          </h2>

          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                Question Type
              </label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as any);
                  setCorrectAnswersList([]);
                }}
                className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                <option value="SINGLE_MCQ">Single MCQ (Radio Choice)</option>
                <option value="MULTI_MCQ">Multi MCQ (Checkbox Choice)</option>
                <option value="SHORT_ANSWER">Short Answer (Text Match)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                  Subject Category
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  {subjects.map((sub) => (
                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                  Marks Value
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={marks}
                  onChange={(e) => setMarks(parseInt(e.target.value) || 1)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-white placeholder-slate-650"
                  placeholder="E.g., bst, node, loop"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                Question Text
              </label>
              <textarea
                required
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 h-20 resize-none"
                placeholder="What is the result of 2 + 2?"
              />
            </div>

            {/* Options layout for MCQs */}
            {type !== 'SHORT_ANSWER' && (
              <div className="space-y-2">
                <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                  Options (Select correct indicators)
                </label>
                <div className="space-y-2">
                  {options.map((opt, idx) => {
                    const idxStr = String(idx);
                    const isChecked = correctAnswersList.includes(idxStr);

                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleMCQCorrectAnswer(idxStr)}
                          className="text-slate-400 hover:text-white"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-brand-500 fill-brand-500/10" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-700" />
                          )}
                        </button>
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          className="block flex-1 px-3 py-2 border border-slate-850 rounded-lg bg-slate-900 text-xs text-white"
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Layout for Short Answer Text */}
            {type === 'SHORT_ANSWER' && (
              <div className="space-y-2">
                <label className="text-slate-400 font-semibold uppercase tracking-wider block">
                  Add Correct Answers (Case-insensitive matches)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shortAnswerText}
                    onChange={(e) => setShortAnswerText(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-850 rounded-lg bg-slate-900 text-xs text-white"
                    placeholder="E.g. Binary Search"
                  />
                  <button
                    type="button"
                    onClick={addShortAnswerTarget}
                    className="px-3 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg font-bold"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {correctAnswersList.map((ans, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    >
                      {ans}
                      <button type="button" onClick={() => removeShortAnswerTarget(ans)}>
                        <X className="w-3 h-3 text-brand-500 hover:text-red-400" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-white bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 font-bold text-sm transition-all shadow-lg shadow-brand-500/10 mt-4"
            >
              {editingId ? 'Save Question' : 'Create Question'}
            </button>
          </form>
        </div>

        {/* Right Panel: List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-850 p-4 rounded-2xl">
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search text or subjects..."
                className="block w-full pl-9 pr-3 py-1.5 border border-slate-800 rounded-lg bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-800 rounded-lg bg-slate-950 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="glass-panel p-10 rounded-2xl text-center text-slate-500 border-dashed">
                No questions matching search.
              </div>
            ) : (
              filteredQuestions.map((q) => (
                <div
                  key={q._id}
                  className={`glass-panel rounded-2xl p-5 border transition-all ${
                    editingId === q._id ? 'border-brand-500 bg-brand-500/5' : 'hover:border-slate-850'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="bg-brand-500/10 text-brand-400 text-[9px] font-bold px-2 py-0.5 rounded border border-brand-500/15">
                        {q.subjectId?.name || 'CS'}
                      </span>
                      <span className="bg-slate-900 border border-slate-800 text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                        {q.difficulty}
                      </span>
                      <span className="bg-slate-900 border border-slate-800 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                        {q.type.replace('_', ' ')}
                      </span>
                      <span className="bg-slate-900 border border-slate-800 text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded">
                        Marks: {q.marks}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEditClick(q)}
                        className="p-1 rounded bg-slate-900 border border-slate-850 text-slate-400 hover:text-white transition-colors"
                        title="Edit Question"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(q._id)}
                        className="p-1 rounded bg-red-500/10 border border-transparent hover:border-red-500/20 text-red-400 hover:bg-red-500/25 transition-colors"
                        title="Delete Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-white text-sm font-semibold mt-3 whitespace-pre-wrap leading-relaxed">{q.questionText}</h4>

                  {/* Question details visualization */}
                  {q.type !== 'SHORT_ANSWER' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = q.correctAnswers.includes(String(oIdx));

                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 font-medium'
                                : 'bg-slate-900/40 border-slate-900 text-slate-400'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-950 text-slate-500'
                            }`}>
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="truncate">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 bg-slate-950/60 p-3 rounded-lg border border-slate-900 text-[10px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1">Accepted answers:</span>
                      <div className="flex flex-wrap gap-1">
                        {q.correctAnswers.map((ans, aIdx) => (
                          <span key={aIdx} className="bg-slate-900 border border-slate-800 text-emerald-400 px-2 py-0.5 rounded">
                            {ans}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {q.tags.map((tag, tIdx) => (
                        <span key={tIdx} className="text-[9px] text-slate-650 font-medium">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">AI Question Generator</h2>
                  <p className="text-xs text-slate-400">Create high-quality questions instantly using Google Gemini AI</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setGeneratedQuestions([]);
                  setAiError(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-300">
              {aiError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs">
                  {aiError}
                </div>
              )}

              {generatedQuestions.length === 0 ? (
                /* Input Form */
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-semibold uppercase tracking-wider text-xs block">
                      Topic / Subject Area
                    </label>
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="E.g., CSS Flexbox, JavaScript Promises, TCP/IP handshake"
                      className="w-full px-4 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-semibold uppercase tracking-wider text-xs block">
                        Question Type
                      </label>
                      <select
                        value={aiType}
                        onChange={(e) => setAiType(e.target.value as any)}
                        className="w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      >
                        <option value="SINGLE_MCQ">Single Choice MCQ</option>
                        <option value="MULTI_MCQ">Multiple Choice MCQ</option>
                        <option value="SHORT_ANSWER">Short Answer</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-semibold uppercase tracking-wider text-xs block">
                        Difficulty
                      </label>
                      <select
                        value={aiDifficulty}
                        onChange={(e) => setAiDifficulty(e.target.value as any)}
                        className="w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      >
                        <option value="EASY">Easy (1 Mark)</option>
                        <option value="MEDIUM">Medium (2 Marks)</option>
                        <option value="HARD">Hard (3 Marks)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-semibold uppercase tracking-wider text-xs block">
                        Number of Questions
                      </label>
                      <select
                        value={aiCount}
                        onChange={(e) => setAiCount(parseInt(e.target.value))}
                        className="w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      >
                        <option value="1">1 Question</option>
                        <option value="3">3 Questions</option>
                        <option value="5">5 Questions</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateAI}
                    disabled={generating || !aiTopic.trim()}
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-6 active:scale-95 duration-100"
                  >
                    {generating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating Questions...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Questions
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Preview and Import List */
                <div className="space-y-6">
                  <p className="text-xs text-slate-400">Preview generated questions below. Click "Add to Pool" to import them, or "Use in Form" to fine-tune manually.</p>
                  <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                    {generatedQuestions.map((q, idx) => (
                      <div key={idx} className="p-4 border border-slate-800 bg-slate-950/40 rounded-xl space-y-3 relative group">
                        <div className="flex justify-between items-start gap-4">
                          <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 rounded-md text-[10px] font-bold tracking-wide uppercase">
                            {q.type.replace('_', ' ')}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUseInForm(q)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition"
                            >
                              Use in Form
                            </button>
                            <button
                              onClick={() => handleSaveSingleAI(q, idx)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
                            >
                              Add to Pool
                            </button>
                          </div>
                        </div>

                        <p className="text-sm font-bold text-white leading-relaxed">{q.questionText}</p>
                        
                        {q.type !== 'SHORT_ANSWER' && q.options && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                            {q.options.map((opt: string, optIdx: number) => {
                              const isCorrect = q.correctAnswers.includes(String(optIdx));
                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                                    isCorrect
                                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                                      : 'bg-slate-900/20 border-slate-800 text-slate-400'
                                  }`}
                                >
                                  <span>{opt}</span>
                                  {isCorrect && (
                                    <span className="text-[10px] font-bold uppercase text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                      Correct
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.type === 'SHORT_ANSWER' && (
                          <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-1.5 items-center">
                            <span className="font-semibold text-slate-350">Acceptable Answers:</span>
                            {q.correctAnswers.map((ans: string, ansIdx: number) => (
                              <span key={ansIdx} className="bg-slate-800 border border-slate-700 text-white px-2 py-0.5 rounded">
                                {ans}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {q.tags && q.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {q.tags.map((tag: string) => (
                              <span key={tag} className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setGeneratedQuestions([]);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition text-xs"
                    >
                      Generate More
                    </button>
                    <button
                      onClick={handleSaveAllAI}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition text-xs shadow-lg shadow-emerald-500/10"
                    >
                      Add All to Pool
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
