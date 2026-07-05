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

  const response = await fetch(url, init);
  
  if (!response.ok) {
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
  // Return wrapper with data field for Axios compatibility
  return { data };
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

  // Initialize Auth
  useEffect(() => {
    const storedToken = localStorage.getItem('qn_token');
    const storedUser = localStorage.getItem('qn_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = response.data;

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
      const { token: receivedToken, user: receivedUser } = response.data;

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
