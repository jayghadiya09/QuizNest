import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Runtime Error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-200">
          <div className="max-w-lg w-full glass-panel p-8 rounded-2xl border border-red-500/30 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/10 rounded-full blur-3xl"></div>
            
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Application Error Handled</h1>
                <p className="text-xs text-slate-400">QuizNest caught a runtime error without crashing the screen.</p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto max-h-40">
              <p className="text-red-400 font-bold mb-1">{this.state.error?.toString()}</p>
              <p className="text-slate-500 text-[10px]">
                {this.state.errorInfo?.componentStack || 'Component stack trace recorded.'}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
              >
                <RefreshCw className="w-4 h-4" /> Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" /> Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
