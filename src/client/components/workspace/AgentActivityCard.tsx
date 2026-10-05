import React, { useState } from 'react';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  FileCode,
  FilePlus,
  FileText,
  FileX,
  Search,
  Terminal,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  FolderOpen,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export interface ActivityToolDetails {
  tool: string;
  args?: Record<string, unknown>;
  result?: unknown;
  filePath?: string;
  command?: string;
  executionId?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  diff?: string;
  additions?: number;
  deletions?: number;
  query?: string;
  url?: string;
  success?: boolean;
  isAborted?: boolean;
  isTimeout?: boolean;
}

export interface AgentActivityItem {
  id: string;
  type: 'thinking' | 'tool' | 'terminal' | 'search' | 'file' | 'lifecycle';
  title: string;
  details?: string;
  thinkingContent?: string;
  thoughtDurationSeconds?: number;
  toolData?: ActivityToolDetails;
  status: 'pending' | 'success' | 'error';
  timestamp: number;
}

export interface AgentActivityCardProps {
  activity: AgentActivityItem;
  theme?: 'light' | 'dark';
  onOpenFile?: (filePath: string) => void;
  onRequestRunCommand?: (cmd: string) => void;
  onViewInTerminal?: (executionId?: string) => void;
}

export const AgentActivityCard: React.FC<AgentActivityCardProps> = ({
  activity,
  theme = 'dark',
  onOpenFile,
  onRequestRunCommand,
  onViewInTerminal
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const isDark = theme === 'dark';

  // 1. Thinking / Reasoning Accordion Block (Codex / Antigravity style)
  if (activity.type === 'thinking' || activity.thinkingContent) {
    const durationLabel = activity.thoughtDurationSeconds && activity.thoughtDurationSeconds > 0
      ? `Thought for ${activity.thoughtDurationSeconds}s`
      : activity.status === 'pending'
      ? 'Thinking...'
      : 'Thought';

    return (
      <div
        className={`my-1.5 rounded-xl border text-xs transition-all overflow-hidden ${
          isDark
            ? 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-zinc-800/20 transition-colors select-none group cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Brain className="w-3.5 h-3.5 text-amber-500/90 shrink-0" />
            <span className="font-semibold text-xs tracking-tight text-zinc-300 group-hover:text-amber-400 transition-colors">
              {durationLabel}
            </span>
            {activity.title && activity.title !== durationLabel && (
              <span className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                {activity.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-zinc-500">
            <span className="text-[10px] font-mono opacity-60">
              {isExpanded ? 'hide' : 'inspect'}
            </span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </div>
        </button>

        {isExpanded && (
          <div
            className={`px-3 py-2.5 border-t text-[11px] font-mono leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap select-text ${
              isDark
                ? 'border-zinc-800/60 bg-zinc-900/50 text-zinc-400'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {activity.thinkingContent || activity.details || 'Reasoning about codebase architecture and constraints...'}
          </div>
        )}
      </div>
    );
  }

  // 2. Terminal Command Execution Block
  if (activity.type === 'terminal' || activity.toolData?.tool === 'run_command' || activity.toolData?.command) {
    const cmd = activity.toolData?.command || activity.title.replace(/^Terminal:\s*/, '');
    const exitCode = activity.toolData?.exitCode;
    const isPending = activity.status === 'pending';
    const isTimeout = activity.toolData?.isTimeout || exitCode === 124 || activity.details?.toLowerCase().includes('timeout');
    const isAborted = activity.toolData?.isAborted || exitCode === 130 || activity.details?.toLowerCase().includes('aborted');
    const isSuccess = !isPending && !isTimeout && !isAborted && (activity.status === 'success' || exitCode === 0);
    const isError = !isPending && !isTimeout && !isAborted && !isSuccess;
    const executionId = activity.toolData?.executionId || activity.id.replace(/^term-/, '');

    return (
      <div
        className={`my-1.5 rounded-xl border text-xs overflow-hidden transition-all ${
          isDark
            ? 'bg-zinc-950/70 border-zinc-800/80 text-zinc-300'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <div className="px-3 py-2 flex flex-col gap-1.5 border-b border-zinc-800/40">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Terminal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-mono text-[11px] text-zinc-300 truncate font-semibold block" title={cmd}>
                  {isPending ? `Running ${cmd}` : `$ ${cmd}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              {isPending && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Execution: active
                </span>
              )}
              {isTimeout && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60">
                  ✕ Timeout
                </span>
              )}
              {isAborted && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60">
                  ^C Aborted
                </span>
              )}
              {isSuccess && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  ✓ Exit code 0
                </span>
              )}
              {isError && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60">
                  ✕ Exit code {exitCode ?? 1}
                </span>
              )}

              {onViewInTerminal && (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(
                        new CustomEvent('terminal:add-log', {
                          detail: {
                            executionId,
                            command: cmd,
                            stdout: (activity.toolData as any)?.stdout || (activity.toolData as any)?.output || '',
                            stderr: (activity.toolData as any)?.stderr || (activity.toolData as any)?.error || '',
                            exitCode,
                            durationMs: (activity.toolData as any)?.durationMs,
                            timestamp: activity.timestamp
                          }
                        })
                      );
                    }
                    onViewInTerminal(executionId);
                  }}
                  className="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-indigo-100 text-[10px] font-medium flex items-center gap-1 transition-colors border border-indigo-500/40 cursor-pointer"
                  title="View and focus this command in Workspace Terminal"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  <span>View in Terminal</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                title={isExpanded ? 'Collapse terminal output' : 'Expand terminal output'}
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div
            className={`p-2.5 text-[11px] font-mono max-h-48 overflow-y-auto ${
              isDark ? 'bg-black/60 text-zinc-300' : 'bg-slate-900 text-slate-100'
            }`}
          >
            {activity.toolData?.stdout ? (
              <pre className="whitespace-pre-wrap leading-relaxed">{activity.toolData.stdout}</pre>
            ) : activity.toolData?.stderr ? (
              <pre className="whitespace-pre-wrap text-rose-400 leading-relaxed">{activity.toolData.stderr}</pre>
            ) : activity.details ? (
              <pre className="whitespace-pre-wrap leading-relaxed">{activity.details}</pre>
            ) : (
              <span className="text-zinc-500 italic">Command finished with no output.</span>
            )}
          </div>
        )}
      </div>
    );
  }

  // 3. Web Search Exploration Block
  if (activity.type === 'search' || activity.toolData?.tool === 'search_web' || activity.toolData?.query) {
    const query = activity.toolData?.query || activity.title;

    return (
      <div
        className={`my-1.5 rounded-xl border px-3 py-2 text-xs flex items-center justify-between gap-2 ${
          isDark
            ? 'bg-cyan-950/20 border-cyan-900/40 text-cyan-200'
            : 'bg-cyan-50 border-cyan-200 text-cyan-900'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-500 shrink-0">
            Explored search
          </span>
          <span className="font-mono text-[11px] truncate text-zinc-300" title={query}>
            "{query}"
          </span>
        </div>
        {activity.details && (
          <span className="text-[10px] text-zinc-500 font-mono shrink-0">
            {activity.details}
          </span>
        )}
      </div>
    );
  }

  // 4. File Operation Block (Create, Edit, Diff, Delete, Read)
  const toolName = activity.toolData?.tool || '';
  const filePath = activity.toolData?.filePath || activity.title.split(' ')[1] || '';
  const isCreate = toolName === 'create_file' || activity.title.toLowerCase().includes('created');
  const isDelete = toolName === 'delete_file' || activity.title.toLowerCase().includes('deleted');
  const isEdit = toolName === 'edit_file' || toolName === 'multi_edit_file' || activity.title.toLowerCase().includes('edited');
  const isRead = toolName === 'read_file' || activity.title.toLowerCase().includes('read');

  const additions = activity.toolData?.additions ?? (isCreate ? 10 : 0);
  const deletions = activity.toolData?.deletions ?? (isDelete ? 10 : 0);
  const diffContent = activity.toolData?.diff;

  return (
    <div
      className={`my-1.5 rounded-xl border text-xs overflow-hidden transition-all ${
        isDark
          ? 'bg-zinc-950/70 border-zinc-800/80 text-zinc-300'
          : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}
    >
      <div className="px-3 py-2 flex items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2 min-w-0">
          {isCreate ? (
            <FilePlus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : isDelete ? (
            <FileX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : isEdit ? (
            <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          )}

          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 shrink-0">
            {isCreate ? 'Created' : isDelete ? 'Deleted' : isEdit ? 'Edited' : isRead ? 'Read' : 'File'}
          </span>

          {filePath ? (
            <button
              type="button"
              onClick={() => onOpenFile?.(filePath)}
              className="font-mono text-[11px] text-zinc-200 hover:text-cyan-400 transition-colors truncate underline underline-offset-2 decoration-zinc-700 hover:decoration-cyan-400 cursor-pointer"
              title={`Open ${filePath}`}
            >
              {filePath}
            </button>
          ) : (
            <span className="font-mono text-[11px] truncate text-zinc-300">{activity.title}</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(additions > 0 || deletions > 0) && (
            <div className="flex items-center gap-1 text-[10px] font-mono">
              {additions > 0 && <span className="text-emerald-400">+{additions}</span>}
              {deletions > 0 && <span className="text-rose-400">-{deletions}</span>}
            </div>
          )}

          {diffContent && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title={isExpanded ? 'Hide diff' : 'Inspect diff'}
            >
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          {filePath && (
            <button
              type="button"
              onClick={() => onOpenFile?.(filePath)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 transition-colors"
              title="Open file in workspace"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && diffContent && (
        <div
          className={`p-2.5 border-t text-[11px] font-mono max-h-48 overflow-y-auto leading-relaxed select-text ${
            isDark ? 'bg-black/70 border-zinc-800/80' : 'bg-slate-900 border-slate-200 text-white'
          }`}
        >
          {diffContent.split('\n').map((line, idx) => {
            const isAdd = line.startsWith('+');
            const isDel = line.startsWith('-');
            return (
              <div
                key={idx}
                className={
                  isAdd
                    ? 'text-emerald-400 bg-emerald-950/20'
                    : isDel
                    ? 'text-rose-400 bg-rose-950/20'
                    : 'text-zinc-400'
                }
              >
                {line}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
