import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-white font-sans">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-900 p-8 rounded-3xl shadow-2xl space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-red-500/10 rounded-full">
                <AlertCircle size={48} className="text-red-500" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold uppercase tracking-tight">Neural Link Severed</h1>
              <p className="text-zinc-500 text-sm">
                An unexpected interruption occurred in the core application logic.
              </p>
            </div>

            <div className="p-4 bg-black/40 rounded-xl border border-white/5 overflow-hidden">
              <p className="text-[10px] font-mono text-zinc-600 uppercase mb-2">Error Diagnostic</p>
              <p className="text-xs font-mono text-red-400 break-words">
                {this.state.error?.message || "Internal Memory Fault"}
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 group"
            >
              <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
              Initialize Reboot
            </button>
            
            <p className="text-center text-[10px] text-zinc-700 uppercase tracking-widest">
              Recovery System Active
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
