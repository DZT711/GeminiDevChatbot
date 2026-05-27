import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTransparencyLog, useThinkingStore, ModelAction } from '../utils/transparencyLogger';
import {
  Brain, ChevronDown, ChevronUp, Loader2, CheckCircle2,
  AlertCircle, Clock, X, Github, Search, Database,
  Image, Film, BookOpen, Cpu, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  theme?: string;
}

// ─── Tool icon mapper ───────────────────────────────────────────────────────
const getToolIcon = (name: string, size = 10) => {
  if (name.includes('github') || name.includes('repo') || name.includes('file') || name.includes('list'))
    return <Github size={size} />;
  if (name.includes('search') || name.includes('google') || name.includes('knowledge'))
    return <Search size={size} />;
  if (name.includes('database') || name.includes('message') || name.includes('query'))
    return <Database size={size} />;
  if (name.includes('image'))
    return <Image size={size} />;
  if (name.includes('video'))
    return <Film size={size} />;
  if (name.includes('propose'))
    return <BookOpen size={size} />;
  return <Cpu size={size} />;
};

// ─── Tool name prettifier ───────────────────────────────────────────────────
const prettifyTool = (description: string): string => {
  // Strip the "Invoking neural tool: " prefix added by geminiService
  const cleaned = description.replace(/^invoking neural tool:\s*/i, '').trim();
  const map: Record<string, string> = {
    analyze_github_repo:    'Analyzing repo',
    read_github_file:       'Reading file',
    read_file:              'Reading file',
    list_files:             'Listing directory',
    generate_image:         'Generating image',
    generate_video:         'Generating video',
    proposeKnowledgeUpdate: 'Proposing memory update',
    queryKnowledgeBase:     'Searching knowledge base',
    query_database_messages:'Querying message history',
    googleSearch:           'Searching the web',
    proposeKnowledge:       'Indexing knowledge',
  };
  return map[cleaned] ?? cleaned.replace(/_/g, ' ');
};

type Tab = 'thoughts' | 'actions';

// ─── Main component ─────────────────────────────────────────────────────────
export const ThinkingProcessDrawer: React.FC<Props> = ({ theme = 'dark' }) => {
  const allActions     = useTransparencyLog();
  const { text: thinkingText, isThinking } = useThinkingStore();

  const [isMinimized, setIsMinimized]   = useState(false);
  const [closed, setClosed]             = useState(false);
  const [tab, setTab]                   = useState<Tab>('thoughts');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed]           = useState(0);
  const thoughtsRef                     = useRef<HTMLDivElement>(null);
  const prevIsThinking                  = useRef(false);

  const hasActive   = allActions.some(a => a.status === 'active' || a.status === 'pending');
  const hasThoughts = thinkingText.length > 0;
  const isAnyActive = isThinking || hasActive;

  // ── Lifecycle: auto-open / auto-collapse ──
  useEffect(() => {
    if (isThinking && !prevIsThinking.current) {
      setClosed(false);
      setIsMinimized(false);
      setTab('thoughts');
      setSessionStartTime(Date.now());
    } else if (!isThinking && prevIsThinking.current && thinkingText.length > 0) {
      // Thinking done → collapse so the response is readable
      setIsMinimized(true);
    }
    prevIsThinking.current = isThinking;
  }, [isThinking]);

  useEffect(() => {
    if (hasActive && !isThinking) {
      setClosed(false);
      setIsMinimized(false);
      setTab('actions');
    }
  }, [hasActive, isThinking]);

  // ── Timer ──
  useEffect(() => {
    if (!isAnyActive && sessionStartTime) {
      const t = setTimeout(() => setSessionStartTime(null), 4000);
      return () => clearTimeout(t);
    }
  }, [isAnyActive, sessionStartTime]);

  useEffect(() => {
    if (isAnyActive && sessionStartTime) {
      const id = setInterval(() =>
        setElapsed(Math.floor((Date.now() - sessionStartTime) / 1000)), 1000);
      return () => clearInterval(id);
    }
  }, [isAnyActive, sessionStartTime]);

  // ── Auto-scroll thoughts ──
  useEffect(() => {
    if (tab === 'thoughts' && thoughtsRef.current && isThinking)
      thoughtsRef.current.scrollTop = thoughtsRef.current.scrollHeight;
  }, [thinkingText, tab, isThinking]);

  const hasContent = hasThoughts || allActions.length > 0;
  if (closed || !hasContent) return null;

  const isLight  = theme === 'light';
  const hasModel = hasThoughts || isThinking; // true only for thinking-capable models

  /* ══════════════════════════════════════════════════════════════════════════
     NON-THINKING MODEL PATH — compact activity strip
     Only shows when there's NO thinking text but there ARE tool actions.
  ══════════════════════════════════════════════════════════════════════════ */
  if (!hasModel) {
    return <CompactActivityStrip actions={allActions} theme={theme} />;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     THINKING MODEL PATH — full drawer with tabs
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn(
        'w-full rounded-xl border overflow-hidden mt-3 mb-3 max-w-3xl mx-auto',
        'shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_4px_24px_rgba(0,0,0,0.4)]',
        isLight
          ? 'bg-slate-50/90 border-slate-200 backdrop-blur-sm'
          : 'bg-[#0a0a0f]/90 border-zinc-800/70 backdrop-blur-sm'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'px-4 py-2.5 flex items-center justify-between cursor-pointer select-none',
          isLight ? 'hover:bg-slate-100/80' : 'hover:bg-white/[0.03]'
        )}
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2.5">
          {isThinking ? (
            <motion.div
              animate={{ scale: [1, 1.18, 1] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            >
              <Brain size={14} className="text-violet-400" />
            </motion.div>
          ) : hasActive ? (
            <Loader2 size={14} className="animate-spin text-amber-400" />
          ) : (
            <Brain size={14} className="text-zinc-500" />
          )}

          <span className={cn(
            'text-[10px] font-mono uppercase tracking-[0.15em] font-bold',
            isLight ? 'text-slate-600' : 'text-zinc-400'
          )}>
            {isThinking ? 'Model Reasoning…' : hasActive ? 'Executing Tools…' : 'Thought Process'}
          </span>

          {sessionStartTime && (
            <span className={cn(
              'text-[9px] font-mono flex items-center gap-1 px-1.5 py-0.5 rounded',
              isLight ? 'bg-slate-200 text-slate-500' : 'bg-white/[0.05] text-zinc-600'
            )}>
              <Clock size={9} /> {elapsed}s
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {hasThoughts && (
            <TabPill active={tab === 'thoughts'} onClick={(e) => { e.stopPropagation(); setTab('thoughts'); }}
              icon={<Brain size={9} />} label="Thoughts" pulse={isThinking} theme={theme} />
          )}
          {allActions.length > 0 && (
            <TabPill active={tab === 'actions'} onClick={(e) => { e.stopPropagation(); setTab('actions'); }}
              icon={<Cpu size={9} />} label={`Tools (${allActions.length})`} pulse={hasActive} theme={theme} />
          )}
          {!isAnyActive && (
            <button onClick={(e) => { e.stopPropagation(); setClosed(true); }}
              className={cn('p-1 rounded transition-colors ml-1',
                isLight ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                         : 'text-zinc-600 hover:text-red-400 hover:bg-red-500/10')}
              title="Dismiss">
              <X size={12} />
            </button>
          )}
          <div className={cn('ml-1', isLight ? 'text-slate-400' : 'text-zinc-600')}>
            {isMinimized ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </div>
        </div>
      </div>

      {/* Body */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn('border-t', isLight ? 'border-slate-200' : 'border-zinc-800/60')}
          >
            {/* Thoughts tab */}
            {tab === 'thoughts' && hasThoughts && (
              <div ref={thoughtsRef} className="p-3 max-h-72 overflow-y-auto custom-scrollbar">
                {isThinking && (
                  <div className="flex items-center gap-2 mb-2">
                    {[0, 1, 2].map(i => (
                      <motion.span key={i} className="block w-1 h-1 rounded-full bg-violet-500"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }} />
                    ))}
                    <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest">Processing…</span>
                  </div>
                )}
                <div className={cn(
                  'font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words p-3 rounded-lg border',
                  isLight ? 'bg-violet-50/60 border-violet-100 text-violet-900'
                           : 'bg-violet-950/20 border-violet-900/30 text-zinc-300'
                )}>
                  <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-violet-900/20">
                    <Brain size={10} className="text-violet-500" />
                    <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-violet-500">Internal Monologue</span>
                  </div>
                  {thinkingText}
                  {isThinking && (
                    <motion.span className="inline-block w-1.5 h-3 bg-violet-400 ml-0.5 align-middle rounded-sm"
                      animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.7 }} />
                  )}
                </div>
              </div>
            )}

            {/* Actions tab */}
            {tab === 'actions' && allActions.length > 0 && (
              <div className="p-3 max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-1.5">
                {allActions.slice(0, 10).map(action => (
                  <ActionRow key={action.id} action={action} theme={theme} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   COMPACT ACTIVITY STRIP
   Used for non-thinking models. Shows only what's happening right now —
   which tool fired, with what target, and whether it succeeded.
   Auto-dismisses 3s after all activity stops.
══════════════════════════════════════════════════════════════════════════════ */
const CompactActivityStrip: React.FC<{ actions: ModelAction[]; theme?: string }> = ({
  actions, theme = 'dark'
}) => {
  const isLight     = theme === 'light';
  const [visible, setVisible] = useState(true);

  const hasActive   = actions.some(a => a.status === 'active' || a.status === 'pending');
  const latest      = actions[0]; // most recent first

  // Auto-dismiss 3s after everything quiets down
  useEffect(() => {
    if (!hasActive && actions.length > 0) {
      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    }
    if (hasActive) setVisible(true);
  }, [hasActive, actions.length]);

  // Re-show if new actions arrive after hiding
  useEffect(() => {
    if (actions.length > 0) setVisible(true);
  }, [actions.length]);

  if (!visible || !latest) return null;

  const toolName  = prettifyTool(latest.description);
  const toolIcon  = getToolIcon(latest.description.toLowerCase());
  const isActive  = latest.status === 'active' || latest.status === 'pending';
  const isFailed  = latest.status === 'failed';

  // Build a short "what it's doing" label from metadata
  const argHint = (() => {
    const args = latest.metadata?.args;
    if (!args) return null;
    const val = args.path || args.query || args.repoUrl || args.prompt || args.content;
    if (!val) return null;
    const s = String(val);
    return s.length > 48 ? s.slice(0, 48) + '…' : s;
  })();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="mt-2 mb-2 max-w-3xl mx-auto overflow-hidden flex justify-center"
        >
          {/* Recent activity pills */}
          <div className="flex flex-wrap gap-1.5 max-w-full">
            {actions.slice(0, 5).map((action, i) => {
              const isAct  = action.status === 'active' || action.status === 'pending';
              const isFail = action.status === 'failed';
              const label  = prettifyTool(action.description);
              const icon   = getToolIcon(action.description.toLowerCase());
              const hint   = (() => {
                const a = action.metadata?.args;
                if (!a) return '';
                const v = a.path || a.query || a.repoUrl || a.prompt;
                if (!v) return '';
                const s = String(v);
                return ' · ' + (s.length > 30 ? s.slice(0, 30) + '…' : s);
              })();

              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15, delay: i * 0.03 }}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                    'text-[10px] font-mono border select-none max-w-full overflow-hidden',
                    isAct
                      ? isLight
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-amber-950/30 border-amber-700/40 text-amber-300'
                      : isFail
                      ? isLight
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : 'bg-red-950/20 border-red-800/40 text-red-400'
                      : isLight
                        ? 'bg-zinc-100 border-zinc-200 text-zinc-500'
                        : 'bg-zinc-900/60 border-zinc-700/50 text-zinc-500'
                  )}
                >
                  {/* Status dot / spinner */}
                  {isAct ? (
                    <motion.span
                      className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                        isLight ? 'bg-amber-500' : 'bg-amber-400')}
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: 0.9 }}
                    />
                  ) : isFail ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  ) : (
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                      isLight ? 'bg-zinc-400' : 'bg-zinc-600')} />
                  )}

                  {/* Tool icon */}
                  <span className={cn('shrink-0',
                    isAct
                      ? isLight ? 'text-amber-600' : 'text-amber-400'
                      : isLight ? 'text-zinc-400' : 'text-zinc-600'
                  )}>
                    {icon}
                  </span>

                  {/* Label + arg hint */}
                  <span className="truncate">
                    {label}
                    {hint && (
                      <span className={cn('opacity-60', isAct ? '' : 'opacity-40')}>
                        {hint}
                      </span>
                    )}
                  </span>

                  {/* Duration badge */}
                  {action.durationMs && !isAct && (
                    <span className={cn('opacity-40 ml-0.5 shrink-0',
                      isLight ? 'text-zinc-400' : 'text-zinc-600')}>
                      {action.durationMs}ms
                    </span>
                  )}
                </motion.div>
              );
            })}

            {/* If more than 5 actions, show overflow count */}
            {actions.length > 5 && (
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-[10px] font-mono border',
                isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-400'
                         : 'bg-zinc-900/40 border-zinc-700/40 text-zinc-600'
              )}>
                +{actions.length - 5} more
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ── Shared sub-components ─────────────────────────────────────────────────── */

const ActionRow: React.FC<{ action: ModelAction; theme?: string }> = ({ action, theme = 'dark' }) => {
  const isLight  = theme === 'light';
  const isActive = action.status === 'active' || action.status === 'pending';
  const isFailed = action.status === 'failed';

  return (
    <div className={cn(
      'flex flex-col gap-1 p-2 rounded-lg border text-[10px]',
      isLight ? 'bg-white border-slate-200' : 'bg-black/30 border-white/[0.06]'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 shrink-0">
            {isActive ? <Loader2 size={11} className="animate-spin text-amber-400" />
             : isFailed ? <AlertCircle size={11} className="text-red-500" />
             : <CheckCircle2 size={11} className="text-emerald-500" />}
          </div>
          <div>
            <p className={cn('font-mono', isLight ? 'text-slate-700' : 'text-zinc-300')}>
              {prettifyTool(action.description)}
            </p>
            <p className={cn('text-[8px] uppercase tracking-widest font-bold mt-0.5',
              isLight ? 'text-slate-400' : 'text-zinc-600')}>
              {action.category}
            </p>
          </div>
        </div>
        {action.durationMs && (
          <span className={cn('text-[9px] font-mono shrink-0', isLight ? 'text-slate-400' : 'text-zinc-600')}>
            {action.durationMs}ms
          </span>
        )}
      </div>

      {action.metadata?.rationale && (
        <p className={cn('ml-5 text-[9px] font-mono italic border-l-2 pl-2 py-0.5 leading-snug',
          isLight ? 'border-slate-300 text-slate-500' : 'border-zinc-700 text-zinc-500')}>
          {action.metadata.rationale.length > 180
            ? action.metadata.rationale.slice(0, 180) + '…'
            : action.metadata.rationale}
        </p>
      )}

      {action.outputPayload && action.status === 'completed' && (
        <div className={cn('ml-5 text-[9px] font-mono truncate',
          isLight ? 'text-emerald-600' : 'text-emerald-500/70')}>
          ➜ {JSON.stringify(
            Object.fromEntries(
              Object.entries(action.outputPayload)
                .filter(([k]) => k !== 'intent' && k !== 'rationale')
            )
          ).slice(0, 120)}
        </div>
      )}
    </div>
  );
};

const TabPill: React.FC<{
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
  label: string;
  pulse?: boolean;
  theme?: string;
}> = ({ active, onClick, icon, label, pulse = false, theme = 'dark' }) => {
  const isLight = theme === 'light';
  return (
    <button onClick={onClick} className={cn(
      'flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest font-bold transition-all',
      active
        ? isLight
          ? 'bg-violet-100 text-violet-700 border border-violet-200'
          : 'bg-violet-900/30 text-violet-300 border border-violet-800/50'
        : isLight
          ? 'text-slate-400 hover:text-slate-600'
          : 'text-zinc-600 hover:text-zinc-400'
    )}>
      {pulse && active ? (
        <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
          {icon}
        </motion.span>
      ) : icon}
      {label}
    </button>
  );
};

export default ThinkingProcessDrawer;
