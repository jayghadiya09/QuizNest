import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

const baseURL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5001' : '/api');


const getHeaders = () => {
  const token = localStorage.getItem('qn_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Initial Mock Data
const DEFAULT_SUBJECT = { _id: 'sub_cs_101', name: 'Computer Science', description: 'Core software, databases, and algorithms.' };

const DEFAULT_QUESTIONS = [
  {
    _id: 'q_1',
    type: 'SINGLE_MCQ',
    subjectId: DEFAULT_SUBJECT,
    difficulty: 'EASY',
    tags: ['js', 'basics'],
    questionText: 'Which of the following is NOT a JavaScript primitive data type?',
    options: ['String', 'Number', 'Float', 'Boolean'],
    correctAnswers: ['2'],
    marks: 1
  },
  {
    _id: 'q_2',
    type: 'SINGLE_MCQ',
    subjectId: DEFAULT_SUBJECT,
    difficulty: 'MEDIUM',
    tags: ['react', 'hooks'],
    questionText: 'Which React hook is primarily used for managing side-effects?',
    options: ['useState', 'useEffect', 'useContext', 'useReducer'],
    correctAnswers: ['1'],
    marks: 2
  }
];

const DEFAULT_EXAMS = [
  {
    _id: 'exam_101',
    title: 'Computer Science Fundamentals Exam',
    description: 'Core aspects of software engineering, algorithms, and data structures.',
    subjectId: DEFAULT_SUBJECT,
    durationMinutes: 30,
    duration: 30,
    totalMarks: 3,
    passingMarks: 2,
    passingPercentage: 50,
    questions: DEFAULT_QUESTIONS,
    maxAttempts: 3,
    availabilityStart: new Date(Date.now() - 3600000).toISOString(),
    availabilityEnd: new Date(Date.now() + 86400000).toISOString(),
    difficultyDistribution: { easyCount: 1, mediumCount: 1, hardCount: 0 },
    negativeMarkingRules: { enabled: false, penalty: 0.25 },
    randomizationSettings: { shuffleQuestions: true, shuffleOptions: true },
    selectionMode: 'AUTOMATIC',
    isActive: true,
    createdBy: { name: 'Demo Teacher', email: 'teacher@quiznest.com' }
  }
];

function isTokenExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return false;
    const decodedJson = atob(payloadBase64);
    const decoded = JSON.parse(decodedJson);
    if (decoded.exp && typeof decoded.exp === 'number') {
      return Date.now() >= decoded.exp * 1000;
    }
  } catch (e) {
    // Ignore non-JWT token strings
  }
  return false;
}

// LocalStorage Persistence Helpers for Static / Unreachable Backend
function getStorageItem<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setStorageItem<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    // ignore
  }
}

function getFallbackData(path: string, method: string, bodyData: any): any {
  const cleanPath = path.split('?')[0];

  // Auth Fallback
  if (cleanPath === '/auth/register') {
    const email = (bodyData?.email || '').trim().toLowerCase();
    const name = (bodyData?.name || 'User').trim();
    const role: 'STUDENT' | 'TEACHER' | 'ADMIN' = bodyData?.role || 'STUDENT';
    const password = bodyData?.password || 'password123';

    const users = getStorageItem('qn_db_users', [
      { _id: 'usr_student', name: 'Demo Student', email: 'student@quiznest.com', password: 'password123', role: 'STUDENT', createdAt: new Date().toISOString() },
      { _id: 'usr_teacher', name: 'Demo Teacher', email: 'teacher@quiznest.com', password: 'password123', role: 'TEACHER', createdAt: new Date().toISOString() },
      { _id: 'usr_admin', name: 'Demo Admin', email: 'admin@quiznest.com', password: 'password123', role: 'ADMIN', createdAt: new Date().toISOString() }
    ]);

    const existing = users.find((u: any) => u.email.toLowerCase() === email);
    if (existing) {
      throw new Error('User with this email already exists. Please login.');
    }

    const newUser = {
      _id: `usr_${Date.now()}`,
      name,
      email,
      password,
      role,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    setStorageItem('qn_db_users', users);

    const user: User = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    };

    return {
      token: `demo_token_${Date.now()}`,
      user
    };
  }

  if (cleanPath === '/auth/login') {
    const email = (bodyData?.email || '').trim().toLowerCase();
    const password = bodyData?.password || '';

    const users = getStorageItem('qn_db_users', [
      { _id: 'usr_student', name: 'Demo Student', email: 'student@quiznest.com', password: 'password123', role: 'STUDENT', createdAt: new Date().toISOString() },
      { _id: 'usr_teacher', name: 'Demo Teacher', email: 'teacher@quiznest.com', password: 'password123', role: 'TEACHER', createdAt: new Date().toISOString() },
      { _id: 'usr_admin', name: 'Demo Admin', email: 'admin@quiznest.com', password: 'password123', role: 'ADMIN', createdAt: new Date().toISOString() }
    ]);

    const foundUser = users.find((u: any) => u.email.toLowerCase() === email);
    if (!foundUser) {
      throw new Error('User not found with this email. Please register first.');
    }

    if (foundUser.password && password && foundUser.password !== password) {
      throw new Error('Invalid password. Please check your credentials.');
    }

    const user: User = {
      id: foundUser._id,
      name: foundUser.name,
      email: foundUser.email,
      role: (foundUser.role || 'STUDENT') as 'STUDENT' | 'TEACHER' | 'ADMIN'
    };

    return {
      token: `demo_token_${Date.now()}`,
      user
    };
  }

  // Subjects Fallback
  if (cleanPath.startsWith('/subjects')) {
    const subjects = getStorageItem('qn_db_subjects', [DEFAULT_SUBJECT]);
    if (method === 'POST') {
      const newSub = { _id: `sub_${Date.now()}`, ...bodyData };
      subjects.push(newSub);
      setStorageItem('qn_db_subjects', subjects);
      return newSub;
    }
    if (method === 'PUT') {
      const idToUpdate = cleanPath.split('/').pop();
      const updated = subjects.map((s: any) => (s._id === idToUpdate ? { ...s, ...bodyData } : s));
      setStorageItem('qn_db_subjects', updated);
      return { _id: idToUpdate, ...bodyData };
    }
    if (method === 'DELETE') {
      const idToDelete = cleanPath.split('/').pop();
      const updated = subjects.filter((s: any) => s._id !== idToDelete);
      setStorageItem('qn_db_subjects', updated);
      return { message: 'Subject deleted' };
    }
    return subjects;
  }

  // Questions Fallback
  if (cleanPath.startsWith('/questions')) {
    const questions = getStorageItem('qn_db_questions', DEFAULT_QUESTIONS);
    if (method === 'POST') {
      if (cleanPath.includes('generate-ai')) {
        const count = bodyData?.count ? parseInt(bodyData.count) : 3;
        const topic = bodyData?.topic || 'General Knowledge';
        const diff = bodyData?.difficulty || 'MEDIUM';
        const qType = bodyData?.type || 'SINGLE_MCQ';
        const generated: any[] = [];
        for (let i = 1; i <= count; i++) {
          generated.push({
            type: qType,
            difficulty: diff,
            tags: [topic.toLowerCase().replace(/\s+/g, '-'), 'ai-generated'],
            questionText: `What is the primary function of ${topic}? (AI Generated Question #${i})`,
            options: ['Core execution and state management', 'Native machine code compilation', 'Document key-value storage', 'Stylesheet grid renderer'],
            correctAnswers: ['0'],
            marks: diff === 'EASY' ? 1 : diff === 'MEDIUM' ? 2 : 3
          });
        }
        return generated;
      }
      const newQ = { _id: `q_${Date.now()}`, ...bodyData, subjectId: DEFAULT_SUBJECT };
      questions.unshift(newQ);
      setStorageItem('qn_db_questions', questions);
      return newQ;
    }
    if (method === 'PUT') {
      const idToUpdate = cleanPath.split('/').pop();
      const updated = questions.map((q: any) => (q._id === idToUpdate ? { ...q, ...bodyData } : q));
      setStorageItem('qn_db_questions', updated);
      return { _id: idToUpdate, ...bodyData };
    }
    if (method === 'DELETE') {
      const idToDelete = cleanPath.split('/').pop();
      const updated = questions.filter((q: any) => q._id !== idToDelete);
      setStorageItem('qn_db_questions', updated);
      return { message: 'Question deleted' };
    }
    return questions;
  }

  // Exams Fallback
  if (cleanPath.startsWith('/exams')) {
    const exams = getStorageItem('qn_db_exams', DEFAULT_EXAMS);
    if (method === 'POST') {
      const newExam = {
        _id: `exam_${Date.now()}`,
        ...bodyData,
        subjectId: DEFAULT_SUBJECT,
        questions: DEFAULT_QUESTIONS,
        duration: bodyData?.durationMinutes || 30,
        maxAttempts: bodyData?.maxAttempts || 3,
        isActive: true,
        createdBy: { name: 'Demo Teacher', email: 'teacher@quiznest.com' }
      };
      exams.unshift(newExam);
      setStorageItem('qn_db_exams', exams);
      return newExam;
    }
    if (method === 'PUT') {
      const idToUpdate = cleanPath.split('/').pop();
      const updated = exams.map((e: any) => (e._id === idToUpdate ? { ...e, ...bodyData } : e));
      setStorageItem('qn_db_exams', updated);
      return { _id: idToUpdate, ...bodyData };
    }
    if (method === 'DELETE') {
      const idToDelete = cleanPath.split('/').pop();
      const updated = exams.filter((e: any) => e._id !== idToDelete);
      setStorageItem('qn_db_exams', updated);
      return { message: 'Exam deleted' };
    }
    return exams;
  }

  // Attempts & Submissions Fallback
  if (cleanPath.startsWith('/attempts') || cleanPath.startsWith('/submissions')) {
    if (cleanPath.includes('/start')) {
      const templateId = bodyData?.templateId || 'exam_101';
      const attempts = getStorageItem('qn_db_attempts', []);
      const exams = getStorageItem('qn_db_exams', DEFAULT_EXAMS);
      const targetExam = exams.find((e: any) => e._id === templateId) || DEFAULT_EXAMS[0];

      const currentUser = getStorageItem('qn_user', null);
      const studentId = currentUser?.id || 'usr_student';

      // Check if there's already an active IN_PROGRESS attempt for this student and template
      const activeAttempt = attempts.find((att: any) => {
        const attTempId = att.templateId?._id || att.templateId;
        const attStudId = att.studentId;
        const matchesTemp = attTempId === templateId || attTempId === 'exam_101';
        const matchesStud = attStudId === studentId || !attStudId || attStudId === 'usr_student';
        return matchesTemp && matchesStud && att.status === 'IN_PROGRESS';
      });

      if (activeAttempt) {
        return {
          attemptId: activeAttempt._id,
          timeLeft: activeAttempt.timeLeft || (targetExam?.duration || 30) * 60,
          questions: targetExam?.questions || DEFAULT_QUESTIONS,
          title: targetExam?.title || 'Computer Science Fundamentals Exam',
          description: targetExam?.description || 'Core software, databases, and algorithms.'
        };
      }

      // If no active attempt, check limit against COMPLETED attempts
      // const pastAttempts = attempts.filter((att: any) => {
      //   const attTempId = att.templateId?._id || att.templateId;
      //   const attStudId = att.studentId;
      //   const matchesTemp = attTempId === templateId || attTempId === 'exam_101';
      //   const matchesStud = attStudId === studentId || !attStudId || attStudId === 'usr_student';
      //   return matchesTemp && matchesStud && (att.status === 'COMPLETED' || att.completedAt);
      // });


      // Commented out to allow infinite attempts for testing/demo runs without lockout
      // const maxAttempts = targetExam?.maxAttempts || 3;
      // if (pastAttempts.length >= maxAttempts) {
      //   throw new Error(`Maximum attempt limit of ${maxAttempts} reached for this examination.`);
      // }


      // Create new IN_PROGRESS attempt
      const newAttId = `att_${Date.now()}`;
      const newAttemptRecord = {
        _id: newAttId,
        studentId: studentId,
        templateId: { _id: templateId, title: targetExam?.title || 'Computer Science Fundamentals Exam', duration: targetExam?.duration || 30, passingPercentage: 50 },
        score: 0,
        maxScore: 3,
        status: 'IN_PROGRESS',
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      attempts.unshift(newAttemptRecord);
      setStorageItem('qn_db_attempts', attempts);

      return {
        attemptId: newAttId,
        timeLeft: (targetExam?.duration || 30) * 60,
        questions: targetExam?.questions || DEFAULT_QUESTIONS,
        title: targetExam?.title || 'Computer Science Fundamentals Exam',
        description: targetExam?.description || 'Core software, databases, and algorithms.'
      };
    }
    if (cleanPath.includes('/submit') || (method === 'POST' && (cleanPath.includes('submissions') || cleanPath.includes('attempts')))) {
      const attempts = getStorageItem('qn_db_attempts', []);
      const currentUser = getStorageItem('qn_user', null);
      const studentId = currentUser?.id || 'usr_student';
      
      // Extract attemptId from path e.g. /attempts/att_123/submit
      const pathParts = cleanPath.split('/');
      const attemptId = pathParts[2] || '';

      const questionsList = getStorageItem('qn_db_questions', DEFAULT_QUESTIONS);
      const responsesList = bodyData?.responses || [];
      
      let earnedScore = 0;
      let totalMaxScore = 0;

      questionsList.forEach((q: any) => {
        totalMaxScore += (q.marks || 1);
        const resp = responsesList.find((r: any) => r.questionId === q._id);
        if (resp && resp.answers && resp.answers.length > 0) {
          const studentAns = resp.answers.map(String).sort();
          const correctAns = (q.correctAnswers || ['0']).map(String).sort();
          const isMatch = studentAns.length === correctAns.length && studentAns.every((val: string, idx: number) => val === correctAns[idx]);
          if (isMatch) {
            earnedScore += (q.marks || 1);
          }
        }
      });

      // Find and update existing IN_PROGRESS attempt or fallback
      let targetIndex = attempts.findIndex((att: any) => att._id === attemptId || (att.studentId === studentId && att.status === 'IN_PROGRESS'));
      const originalCreatedAt = targetIndex >= 0 ? attempts[targetIndex].createdAt : new Date().toISOString();

      const updatedAttempt = {
        _id: targetIndex >= 0 ? attempts[targetIndex]._id : `att_${Date.now()}`,
        studentId: studentId,
        templateId: targetIndex >= 0 ? attempts[targetIndex].templateId : { _id: 'exam_101', title: 'Computer Science Fundamentals Exam', duration: 30, passingPercentage: 50 },
        score: earnedScore,
        maxScore: totalMaxScore > 0 ? totalMaxScore : 3,
        status: 'COMPLETED',
        warningsCount: bodyData?.warningsCount || 0,
        tabSwitchesCount: bodyData?.tabSwitchesCount || 0,
        completedAt: new Date().toISOString(),
        createdAt: originalCreatedAt,
        ...bodyData
      };

      if (targetIndex >= 0) {
        attempts[targetIndex] = updatedAttempt;
      } else {
        attempts.unshift(updatedAttempt);
      }

      setStorageItem('qn_db_attempts', attempts);
      return { attempt: updatedAttempt, ...updatedAttempt };
    }




    if (method === 'DELETE' && cleanPath.includes('/reset/')) {
      const templateId = cleanPath.split('/').pop();
      const attempts = getStorageItem('qn_db_attempts', []);
      const currentUser = getStorageItem('qn_user', null);
      const filtered = attempts.filter((att: any) => {
        const attTempId = att.templateId?._id || att.templateId;
        const attStudId = att.studentId;
        return !(attTempId === templateId && (attStudId === currentUser?.id || !attStudId));
      });
      setStorageItem('qn_db_attempts', filtered);
      return { message: 'Attempts reset successfully' };
    }


    const allAttempts = getStorageItem('qn_db_attempts', []);
    const currentUser = getStorageItem('qn_user', null);

    if (currentUser && currentUser.role === 'STUDENT') {
      return allAttempts.filter((att: any) => att.studentId === currentUser.id);
    }
    return allAttempts;
  }

  // Users Fallback
  if (cleanPath.startsWith('/users')) {
    const users = getStorageItem('qn_db_users', [
      { _id: 'usr_student', name: 'Demo Student', email: 'student@quiznest.com', role: 'STUDENT', createdAt: new Date().toISOString() },
      { _id: 'usr_teacher', name: 'Demo Teacher', email: 'teacher@quiznest.com', role: 'TEACHER', createdAt: new Date().toISOString() },
      { _id: 'usr_admin', name: 'Demo Admin', email: 'admin@quiznest.com', role: 'ADMIN', createdAt: new Date().toISOString() }
    ]);
    if (method === 'PUT') {
      const parts = cleanPath.split('/');
      const userId = parts[2];
      const updated = users.map((u: any) => (u._id === userId ? { ...u, role: bodyData?.role || u.role } : u));
      setStorageItem('qn_db_users', updated);
      const updatedUser = updated.find((u: any) => u._id === userId);
      return { user: updatedUser };
    }
    if (method === 'DELETE') {
      const idToDelete = cleanPath.split('/').pop();
      const updated = users.filter((u: any) => u._id !== idToDelete);
      setStorageItem('qn_db_users', updated);
      return { message: 'User deleted' };
    }
    return users;
  }

  return {};
}

// Custom Fetch API wrapper mimicking Axios signatures
export const customFetch = async (path: string, options: any = {}) => {
  const url = `${baseURL}${path}`;
  const { bodyData, ...restOptions } = options;

  const init: RequestInit = {
    ...restOptions,
    headers: {
      ...getHeaders(),
      ...restOptions.headers
    }
  };

  if (bodyData !== undefined) {
    init.body = JSON.stringify(bodyData);
  }

  try {
    const response = await fetch(url, init);
    
    if (!response.ok) {
      const fallbackData = getFallbackData(path, options.method || 'GET', bodyData);
      if (fallbackData !== undefined && Object.keys(fallbackData).length > 0) {
        return { data: fallbackData };
      }
      let errorMsg = 'HTTP request failed';
      try {
        const errJson = await response.json();
        errorMsg = errJson.message || errorMsg;
      } catch (e) {
        // ignore
      }
      throw new Error(errorMsg);
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    return { data };
  } catch (error: any) {
    // Catch ANY network error, TypeError, CORS, or offline scenario and return fallback mock database data
    const fallbackData = getFallbackData(path, options.method || 'GET', bodyData);
    if (fallbackData !== undefined) {
      return { data: fallbackData };
    }
    throw error;
  }
};

export const api = {
  get: (path: string, options?: any) =>
    customFetch(path, { ...options, method: 'GET' }),
  post: (path: string, body?: any, options?: any) =>
    customFetch(path, { ...options, method: 'POST', bodyData: body }),
  put: (path: string, body?: any, options?: any) =>
    customFetch(path, { ...options, method: 'PUT', bodyData: body }),
  delete: (path: string, options?: any) =>
    customFetch(path, { ...options, method: 'DELETE' })
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'STUDENT' | 'TEACHER' | 'ADMIN') => Promise<void>;
  logout: () => void;
  api: typeof api;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize Auth from localStorage with JWT expiration safety
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('qn_token');
      const storedUser = localStorage.getItem('qn_user');

      if (storedToken && storedUser && storedUser !== 'undefined') {
        if (isTokenExpired(storedToken)) {
          localStorage.removeItem('qn_token');
          localStorage.removeItem('qn_user');
          setToken(null);
          setUser(null);
        } else {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        }
      }
    } catch (e) {
      localStorage.removeItem('qn_token');
      localStorage.removeItem('qn_user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const data = response.data;
      
      const receivedToken = data?.token;
      const receivedUser = data?.user;

      if (!receivedToken || !receivedUser) {
        throw new Error('Invalid authentication response');
      }

      localStorage.setItem('qn_token', receivedToken);
      localStorage.setItem('qn_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to login');
    }
  };

  const register = async (name: string, email: string, password: string, role: 'STUDENT' | 'TEACHER' | 'ADMIN') => {
    try {
      const response = await api.post('/auth/register', { name, email, password, role });
      const data = response.data;

      const receivedToken = data?.token;
      const receivedUser = data?.user;

      if (!receivedToken || !receivedUser) {
        throw new Error('Invalid registration response');
      }

      localStorage.setItem('qn_token', receivedToken);
      localStorage.setItem('qn_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to register');
    }
  };

  const logout = () => {
    localStorage.removeItem('qn_token');
    localStorage.removeItem('qn_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
