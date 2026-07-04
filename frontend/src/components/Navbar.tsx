import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, Menu, X, BookOpen, Activity, ClipboardList, Users, Sun, Moon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('qn_theme');
    if (saved === 'light') {
      document.documentElement.classList.add('light');
      return 'light';
    } else {
      document.documentElement.classList.remove('light');
      return 'dark';
    }
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (next === 'light') {
        document.documentElement.classList.add('light');
        localStorage.setItem('qn_theme', 'light');
      } else {
        document.documentElement.classList.remove('light');
        localStorage.setItem('qn_theme', 'dark');
      }
      return next;
    });
  };

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const linkClass = (path: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive(path)
        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
    }`;

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md main-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-violet-500 flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/10 group-hover:scale-105 transition-transform duration-200">
                QN
              </div>
              <span className="font-extrabold text-xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
                Quiz<span className="text-brand-400">Nest</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-2">
            {user.role === 'STUDENT' && (
              <>
                <Link to="/student" className={linkClass('/student')}>
                  <ClipboardList className="w-4 h-4" /> Dashboard
                </Link>
              </>
            )}

            {user.role === 'TEACHER' && (
              <>
                <Link to="/teacher" className={linkClass('/teacher')}>
                  <ClipboardList className="w-4 h-4" /> Dashboard
                </Link>
                <Link to="/teacher/questions" className={linkClass('/teacher/questions')}>
                  <BookOpen className="w-4 h-4" /> Questions
                </Link>
                <Link to="/teacher/monitor" className={linkClass('/teacher/monitor')}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  Live Monitor
                </Link>
                <Link to="/teacher/results" className={linkClass('/teacher/results')}>
                  <Activity className="w-4 h-4" /> Results
                </Link>
              </>
            )}

            {user.role === 'ADMIN' && (
              <>
                <Link to="/admin" className={linkClass('/admin')}>
                  <Users className="w-4 h-4" /> Users Management
                </Link>
              </>
            )}
          </div>

          {/* User Info & Actions */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-200">{user.name}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-brand-400 uppercase tracking-wider">
                <Shield className="w-2.5 h-2.5" />
                {user.role}
              </span>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent transition-all duration-200"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-2 pt-2 pb-4 space-y-1">
          {user.role === 'STUDENT' && (
            <Link
              to="/student"
              className={linkClass('/student')}
              onClick={() => setMobileMenuOpen(false)}
            >
              <ClipboardList className="w-4 h-4" /> Dashboard
            </Link>
          )}

          {user.role === 'TEACHER' && (
            <>
              <Link
                to="/teacher"
                className={linkClass('/teacher')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <ClipboardList className="w-4 h-4" /> Dashboard
              </Link>
              <Link
                to="/teacher/questions"
                className={linkClass('/teacher/questions')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <BookOpen className="w-4 h-4" /> Questions
              </Link>
              <Link
                to="/teacher/monitor"
                className={linkClass('/teacher/monitor')}
                onClick={() => setMobileMenuOpen(false)}
              >
                Live Monitor
              </Link>
              <Link
                to="/teacher/results"
                className={linkClass('/teacher/results')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Activity className="w-4 h-4" /> Results
              </Link>
            </>
          )}

          {user.role === 'ADMIN' && (
            <Link
              to="/admin"
              className={linkClass('/admin')}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Users className="w-4 h-4" /> Users Management
            </Link>
          )}

          <div className="pt-4 border-t border-slate-800 mt-2 flex items-center justify-between px-3">
            <div>
              <div className="text-sm font-semibold text-slate-200">{user.name}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">{user.role}</div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all border border-transparent mr-2"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 border border-red-500/20 text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
