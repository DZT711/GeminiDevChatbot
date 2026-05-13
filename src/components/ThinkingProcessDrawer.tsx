import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTransparencyLog, ModelAction } from '../utils/transparencyLogger';
import { Terminal, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle, Clock, X, Brain } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  theme?: string;
}

export const ThinkingProcessDrawer: React.FC<Props> = ({ theme = 'dark' }) => {
  const allActions = useTransparencyLog();
  const [isMinimized, setIsMinimized] = useState(false);
  const [closed, setClosed] = useState(false);
  
  // Track actions associated with a "current session" automatically by detecting active operations
  // If there are pending/active actions, we auto-expand. If completed, we show "completed in X seconds"
  const hasActive = allActions.some(a => a.status === 'active' || a.status === 'pending');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (hasActive) {
      setClosed(false);
      setIsMinimized(false);
      if (!sessionStartTime) setSessionStartTime(Date.now());
    } else {
      // If none active, we don't reset sessionStartTime immediately so we can show total time.
    }
  }, [hasActive]);

  // Keep track of the elapsed time for active generation
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (hasActive && sessionStartTime) {
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [hasActive, sessionStartTime]);

  if (closed || allActions.length === 0) return null;

  // Render only the last N actions for the recent cluster
  // Or just slice the top 5
  const latestActions = allActions.slice(0, 5).reverse();

  const getStatusIcon = (status: ModelAction['status']) => {
    switch(status) {
      case 'active':
      case 'pending':
        return <Loader2 size={12} className="animate-spin text-cyan-400" />;
      case 'completed':
        return <CheckCircle2 size={12} className="text-emerald-500" />;
      case 'failed':
        return <AlertCircle size={12} className="text-red-500" />;
      default:
        return <CheckCircle2 size={12} className="text-emerald-500" />;
    }
  };

  return (
    <div className={cn(
      "w-full rounded-xl border overflow-hidden mt-4 transition-all mb-4 max-w-3xl mx-auto",
      theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-black/40 border-zinc-800"
    )}>
      <div 
        className={cn(
          "px-4 py-2 flex items-center justify-between cursor-pointer",
          theme === 'light' ? "hover:bg-slate-100" : "hover:bg-white/5"
        )}
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-3">
          {hasActive ? (
            <Loader2 size={14} className="animate-spin text-cyan-500" />
          ) : (
            <Brain size={14} className="text-purple-500" />
          )}
          <span className={cn("text-xs font-mono uppercase tracking-widest font-bold", theme === 'light' ? "text-slate-700" : "text-zinc-300")}>
            {hasActive ? "Neural Process Active" : "Thought Process Completed"}
          </span>
          {hasActive && (
            <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded">
              <Clock size={10} /> {elapsed}s
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!hasActive && (
            <button 
              onClick={(e) => { e.stopPropagation(); setClosed(true); }}
              className="p-1 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded"
              title="Close"
            >
              <X size={14} />
            </button>
          )}
          <button className="text-zinc-500">
            {isMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-800/50"
          >
            <div className="p-3 flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar">
              {latestActions.map(action => (
                <div key={action.id} className="flex flex-col gap-1.5 p-2 rounded bg-black/20 border border-white/5">
                  <div className="flex items-start justify-between">
                     <div className="flex items-start gap-2">
                        <div className="mt-0.5">{getStatusIcon(action.status)}</div>
                        <div>
                          <p className={cn("text-xs font-mono", theme === 'light' ? "text-slate-700" : "text-zinc-300")}>
                            {action.description}
                          </p>
                          <p className="text-[9px] uppercase tracking-wider text-zinc-500 mt-0.5 font-bold">{action.category}</p>
                        </div>
                     </div>
                     {action.durationMs && (
                       <span className="text-[9px] font-mono text-zinc-600">{action.durationMs}ms</span>
                     )}
                  </div>
                  {(action.metadata || action.outputPayload) && action.status !== 'pending' && (
                    <div className="mt-1 pl-5">
                       {action.metadata?.intent && (
                          <div className="text-[10px] font-mono text-pink-500/80 mb-1 leading-snug">
                            <span className="font-bold text-pink-500">🔍 Intent:</span> {action.metadata.intent}
                          </div>
                       )}
                       {action.metadata?.rationale && (
                          <div className="text-[10px] font-mono text-zinc-400 mb-1 leading-snug italic border-l-2 border-zinc-700 pl-2 py-0.5">
                            {action.metadata.rationale.length > 300 ? action.metadata.rationale.substring(0, 300) + '...' : action.metadata.rationale}
                          </div>
                       )}
                       {action.metadata?.sources && action.metadata.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 mb-1">
                             {action.metadata.sources.map((s: string, i: number) => (
                               <a key={i} href={s} target="_blank" rel="noreferrer" className="text-[9px] px-1 bg-zinc-800 text-cyan-400 rounded hover:underline truncate max-w-[200px]">
                                 {s}
                               </a>
                             ))}
                          </div>
                       )}
                       {action.metadata?.args && Object.keys(action.metadata.args).length > 0 && (
                          <div className="text-[10px] font-mono text-cyan-500/70 mb-1">
                            {JSON.stringify(action.metadata.args).substring(0, 100)}
                            {JSON.stringify(action.metadata.args).length > 100 && '...'}
                          </div>
                       )}
                       
                       {action.outputPayload && (
                          <div className="mt-1">
                            {action.outputPayload.intent && (
                              <div className="text-[10px] font-mono text-pink-500/80 mb-1 leading-snug">
                                <span className="font-bold text-pink-500">🔍 Search:</span> {action.outputPayload.intent}
                              </div>
                            )}
                            {action.outputPayload.rationale && (
                              <div className="text-[10px] font-mono text-zinc-400 mb-1 leading-snug italic border-l-2 border-emerald-900/50 pl-2 py-0.5">
                                {action.outputPayload.rationale}
                              </div>
                            )}
                            <div className="text-[10px] font-mono text-emerald-500/70 truncate max-w-full">
                              ➜ {JSON.stringify(
                                  Object.fromEntries(Object.entries(action.outputPayload).filter(([k]) => k !== 'intent' && k !== 'rationale'))
                                )}
                            </div>
                          </div>
                       )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
