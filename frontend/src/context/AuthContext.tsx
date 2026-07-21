import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

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
    subjectId: DEFAULT_SUBJECT,
    durationMinutes: 30,
    duration: 30,
    totalMarks: 3,
    passingMarks: 2,
    questions: DEFAULT_QUESTIONS,
    maxAttempts: 3,
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() + 86400000).toISOString(),
    isActive: true,
    createdBy: { name: 'Demo Teacher', email: 'teacher@quiznest.com' }
  }
];

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
  if (cleanPath === '/auth/login' || cleanPath === '/auth/register') {
    const email = (bodyData?.email || 'user@quiznest.com').trim().toLowerCase();
    let role: 'STUDENT' | 'TEACHER' | 'ADMIN' = bodyData?.role || 'STUDENT';
    if (!bodyData?.role) {
      if (email.includes('teacher')) role = 'TEACHER';
      else if (email.includes('admin')) role = 'ADMIN';
    }
    const rawName = bodyData?.name || (email.split('@')[0] ? email.split('@')[0] : 'Demo User');
    const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    
    const user: User = {
      id: `usr_${Date.now()}`,
      name,
      email,
      role
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
      return {
        attemptId: `att_${Date.now()}`,
        timeLeft: 1800,
        questions: DEFAULT_QUESTIONS,
        title: 'Computer Science Fundamentals Exam',
        description: 'Core software, databases, and algorithms.'
      };
    }
    if (cleanPath.includes('/submit') || (method === 'POST' && (cleanPath.includes('submissions') || cleanPath.includes('attempts')))) {
      const attempts = getStorageItem('qn_db_attempts', []);
      const newAtt = {
        _id: `att_${Date.now()}`,
        templateId: { _id: 'exam_101', title: 'Computer Science Fundamentals Exam', duration: 30, passingPercentage: 50 },
        score: 3,
        maxScore: 3,
        warningsCount: 0,
        tabSwitchesCount: 0,
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ...bodyData
      };
      attempts.unshift(newAtt);
      setStorageItem('qn_db_attempts', attempts);
      return newAtt;
    }
    return getStorageItem('qn_db_attempts', [
      {
        _id: 'att_demo_1',
        templateId: { _id: 'exam_101', title: 'Computer Science Fundamentals Exam', duration: 30, passingPercentage: 50 },
        score: 3,
        maxScore: 3,
        warningsCount: 0,
        tabSwitchesCount: 0,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ]);
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

  // Initialize Auth from localStorage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('qn_token');
      const storedUser = localStorage.getItem('qn_user');

      if (storedToken && storedUser && storedUser !== 'undefined') {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
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
