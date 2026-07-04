import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, Sparkles, UserCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      // Determine redirection from credentials
      const storedUser = localStorage.getItem('qn_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.role === 'STUDENT') navigate('/student');
        else if (u.role === 'TEACHER') navigate('/teacher');
        else if (u.role === 'ADMIN') navigate('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'STUDENT' | 'TEACHER' | 'ADMIN') => {
    setError(null);
    setLoading(true);
    const demoEmail = `${role.toLowerCase()}@quiznest.com`;
    const demoPassword = 'password123';
    const demoName = `Demo ${role.charAt(0) + role.slice(1).toLowerCase()}`;

    try {
      // Try to login directly
      await login(demoEmail, demoPassword);
      navigate(`/${role.toLowerCase()}`);
    } catch (err: any) {
      // If user doesn't exist, auto-register the demo user
      try {
        await register(demoName, demoEmail, demoPassword, role);
        navigate(`/${role.toLowerCase()}`);
      } catch (regErr: any) {
        setError(`Demo provisioning failed: ${regErr.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-950">
      <div className="max-w-md w-full space-y-8 glass-panel p-8 rounded-2xl relative overflow-hidden">
        {/* Glow Element */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl"></div>

        <div className="text-center relative">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-violet-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-brand-500/20">
            QN
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
            Welcome to QuizNest
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Secure, real-time examination, built for integrity.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6 relative" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition-all"
                  placeholder="name@university.edu"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-brand-500 disabled:opacity-50 transition-all shadow-lg shadow-brand-500/20"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <LogIn className="w-5 h-5 text-brand-300 group-hover:text-white transition-colors" />
              </span>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

        {/* Demo Roles Shortcut Section */}
        <div className="mt-6 pt-6 border-t border-slate-950/80 relative">
          <div className="absolute inset-x-0 top-0 flex justify-center transform -translate-y-1/2">
            <span className="bg-slate-900 border border-slate-800 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider text-slate-400 flex items-center gap-1 uppercase">
              <Sparkles className="w-3 h-3 text-yellow-400" /> Auto Demo Login
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2">
            <button
              onClick={() => handleDemoLogin('STUDENT')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-brand-500/10 hover:border-brand-500/30 transition-all group"
            >
              <UserCheck className="w-5 h-5 text-slate-400 group-hover:text-brand-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-300 group-hover:text-white uppercase tracking-wider">
                Student
              </span>
            </button>

            <button
              onClick={() => handleDemoLogin('TEACHER')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-brand-500/10 hover:border-brand-500/30 transition-all group"
            >
              <UserCheck className="w-5 h-5 text-slate-400 group-hover:text-brand-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-300 group-hover:text-white uppercase tracking-wider">
                Teacher
              </span>
            </button>

            <button
              onClick={() => handleDemoLogin('ADMIN')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-brand-500/10 hover:border-brand-500/30 transition-all group"
            >
              <UserCheck className="w-5 h-5 text-slate-400 group-hover:text-brand-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-300 group-hover:text-white uppercase tracking-wider">
                Admin
              </span>
            </button>
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
