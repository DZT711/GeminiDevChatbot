import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTransparencyLog, transparencyLogger, ActionCategory } from '../utils/transparencyLogger';
import { Shield, Activity, Globe, Database, Cpu, Search, X, CheckCircle2, Server } from 'lucide-react';
import { cn } from '../lib/utils';

interface TransparencyDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: string;
}

export const TransparencyDashboard: React.FC<TransparencyDashboardProps> = ({ isOpen, onClose, theme = 'dark' }) => {
  const actions = useTransparencyLog();
  const [activeTab, setActiveTab] = useState<'tracker' | 'scope'>('tracker');

  const getCategoryIcon = (category: ActionCategory) => {
    switch (category) {
      case 'Research/Retrieval': return <Search size={14} className="text-blue-400" />;
      case 'Learning': return <Database size={14} className="text-purple-400" />;
      case 'Analysis': return <Cpu size={14} className="text-amber-400" />;
      case 'Task Execution': return <Activity size={14} className="text-emerald-400" />;
    }
  };

  const getCategoryColor = (category: ActionCategory) => {
    switch (category) {
       case 'Research/Retrieval': return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
       case 'Learning': return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
       case 'Analysis': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
       case 'Task Execution': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className={cn(
              "w-full max-w-4xl max-h-[85vh] rounded-2xl border flex flex-col shadow-2xl relative overflow-hidden",
              theme === 'light' ? "bg-white border-slate-200" : "bg-[#0b0c10] border-zinc-800"
            )}
          >
            {/* Header */}
            <div className={cn(
              "p-5 border-b flex items-center justify-between",
              theme === 'light' ? "border-slate-100 bg-slate-50/50" : "border-white/5 bg-white/[0.02]"
            )}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Shield size={20} className="text-cyan-500" />
                </div>
                <div>
                  <h2 className={cn("text-lg font-bold uppercase tracking-tight", theme === 'light' ? "text-slate-900" : "text-white")}>
                    Model Transparency
                  </h2>
                  <p className={cn("text-xs font-mono", theme === 'light' ? "text-slate-500" : "text-zinc-500")}>
                    Operational Scope & Real-time Action Logs
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  theme === 'light' ? "hover:bg-slate-200 text-slate-500" : "hover:bg-zinc-800 text-zinc-400"
                )}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className={cn(
                "w-48 border-r flex flex-col p-4 gap-2",
                theme === 'light' ? "border-slate-100 bg-slate-50/30" : "border-white/5 bg-black/20"
              )}>
                <button
                  onClick={() => setActiveTab('tracker')}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                    activeTab === 'tracker'
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      : (theme === 'light' ? "text-slate-500 hover:bg-slate-100" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300")
                  )}
                >
                  <Activity size={14} />
                  Action Tracker
                </button>
                <button
                  onClick={() => setActiveTab('scope')}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                    activeTab === 'scope'
                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                      : (theme === 'light' ? "text-slate-500 hover:bg-slate-100" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300")
                  )}
                >
                  <Globe size={14} />
                  Access Scope
                </button>
              </div>

              {/* Main Panel */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {activeTab === 'tracker' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={cn("text-sm font-mono font-bold uppercase tracking-widest", theme === 'light' ? "text-slate-700" : "text-zinc-300")}>
                        Live Operations
                      </h3>
                      <button 
                        onClick={() => transparencyLogger.clear()}
                        className="text-[10px] font-mono text-zinc-500 hover:text-red-400 transition-colors px-2 py-1 border border-zinc-800 rounded hover:border-red-400/30"
                      >
                        Clear Logs
                      </button>
                    </div>

                    {actions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 opacity-50">
                        <Activity size={32} className={theme === 'light' ? "text-slate-300 mb-3" : "text-zinc-700 mb-3"} />
                        <p className={cn("text-xs font-mono", theme === 'light' ? "text-slate-500" : "text-zinc-500")}>No recent model actions logged.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {actions.map(action => (
                          <div 
                            key={action.id}
                            className={cn(
                              "p-4 rounded-xl border flex gap-4 transition-colors",
                              theme === 'light' ? "bg-white border-slate-200" : "bg-[#0a0a0c] border-zinc-800/80"
                            )}
                          >
                            <div className="shrink-0 mt-0.5">
                              {getCategoryIcon(action.category)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className={cn(
                                  "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border",
                                  getCategoryColor(action.category)
                                )}>
                                  {action.category}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-500">
                                  {new Date(action.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className={cn("text-sm font-mono leading-relaxed mt-2", theme === 'light' ? "text-slate-700" : "text-zinc-300")}>
                                {action.description}
                              </p>
                              {action.metadata && Object.keys(action.metadata).length > 0 && (
                                <div className={cn(
                                  "mt-3 p-2 rounded border text-[10px] font-mono overflow-x-auto",
                                  theme === 'light' ? "bg-slate-50 border-slate-100 text-slate-600" : "bg-black/40 border-white/5 text-zinc-400"
                                )}>
                                  <pre>{JSON.stringify(action.metadata, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                     <h3 className={cn("text-sm font-mono font-bold uppercase tracking-widest mb-4", theme === 'light' ? "text-slate-700" : "text-zinc-300")}>
                        Authorized External Domains
                      </h3>
                      <div className="grid gap-3">
                        {transparencyLogger.authorizedDomains.map((domain, i) => (
                           <div 
                            key={i}
                            className={cn(
                              "p-4 rounded-xl border flex items-center justify-between",
                              theme === 'light' ? "bg-white border-slate-200" : "bg-[#0a0a0c] border-zinc-800/80"
                            )}
                          >
                             <div className="flex items-center gap-4">
                               <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                                 <Server size={14} className="text-zinc-400" />
                               </div>
                               <div>
                                 <div className={cn("text-sm font-mono font-bold", theme === 'light' ? "text-slate-700" : "text-zinc-200")}>{domain.domain}</div>
                                 <div className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider mt-1">{domain.purpose}</div>
                               </div>
                             </div>
                             <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                               <CheckCircle2 size={12} />
                               Authorized
                             </div>
                           </div>
                        ))}
                      </div>
                      
                      <div className={cn(
                        "mt-6 p-4 rounded-xl border border-dashed flex gap-3 text-sm",
                        theme === 'light' ? "border-slate-300 bg-slate-50 text-slate-600" : "border-zinc-700 bg-black/20 text-zinc-400"
                      )}>
                        <Shield className="shrink-0 text-amber-500 mt-0.5" size={16} />
                        <div>
                          <strong>Strict Sandbox Enforcement:</strong> The model is entirely restricted from making arbitrary outbound network requests to undisclosed domains. External telemetry or unverified data exfiltration is blocked by the infrastructure context. All web retrieval operations strictly utilize the authenticated Gemini model capabilities.
                        </div>
                      </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
