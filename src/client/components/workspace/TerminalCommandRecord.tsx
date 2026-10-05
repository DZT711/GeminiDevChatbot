import React, { useState } from 'react';
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

export interface TerminalCommandData {
  id: string;
  command: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  durationMs?: number;
  isRunning?: boolean;
  isTimeout?: boolean;
  isAborted?: boolean;
  executionId?: string;
  cwd?: string;
  timestamp: number;
}

export interface TerminalCommandRecordProps {
  commandData: TerminalCommandData;
  onViewInTerminal?: (executionId?: string) => void;
  theme?: 'light' | 'dark';
}

function formatDuration(ms?: number): string {
  if (ms === undefined || ms === null || ms <= 0) return '';
  if (ms < 1000) return `${ms}ms`;
  const secs = ms / 1000;
  if (secs < 60) {
    return `${Math.round(secs)}s`;
  }
  const mins = Math.floor(secs / 60);
  const remSecs = Math.round(secs % 60);
  return `${mins}m ${remSecs}s`;
}

export const TerminalCommandRecord: React.FC<TerminalCommandRecordProps> = ({
  commandData,
  onViewInTerminal,
  theme = 'dark'
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const isDark = theme === 'dark';
  const durationLabel = formatDuration(commandData.durationMs);

  const rawOutput = (commandData.stdout || '') + (commandData.stderr ? (commandData.stdout ? '\n' : '') + commandData.stderr : '');
  const hasOutput = rawOutput.trim().length > 0;

  const exitCode = commandData.exitCode ?? (commandData.isTimeout ? 124 : commandData.isAborted ? 130 : commandData.isRunning ? undefined : 0);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const text = `$ ${commandData.command}\n${rawOutput}`;
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="w-full my-1.5 select-text">
      {/* Collapsible Header Row (Matching Codex/Agent style) */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left py-1 px-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer select-none group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 shrink-0" />
          <span className="font-sans text-xs text-zinc-300 group-hover:text-zinc-100 truncate">
            {commandData.isRunning ? (
              <span className="inline-flex items-center gap-1.5 text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Running command...
              </span>
            ) : durationLabel ? (
              `Ran command in ${durationLabel}`
            ) : (
              'Ran command'
            )}
          </span>
        </div>

        <div className="flex items-center gap-1 text-zinc-500 group-hover:text-zinc-300 shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* Expanded Terminal Command Box (Matching Image 2) */}
      {isExpanded && (
        <div
          className={`mt-1 rounded-xl border p-3 text-xs font-mono transition-all ${
            isDark
              ? 'bg-zinc-950/80 border-zinc-800/80 text-zinc-200'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          {/* Header inside Shell box */}
          <div className="flex items-center justify-between gap-2 mb-2 select-none">
            <span className="font-sans text-xs text-zinc-400 font-medium">Shell</span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                title="Copy command and output"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>

              {onViewInTerminal && (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(
                        new CustomEvent('terminal:add-log', {
                          detail: {
                            executionId: commandData.executionId,
                            command: commandData.command,
                            stdout: commandData.stdout || '',
                            stderr: commandData.stderr || '',
                            exitCode: commandData.exitCode,
                            durationMs: commandData.durationMs,
                            timestamp: commandData.timestamp
                          }
                        })
                      );
                    }
                    onViewInTerminal(commandData.executionId);
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-medium text-indigo-300 hover:text-indigo-100 hover:bg-indigo-600/30 transition-colors cursor-pointer"
                  title="View and focus execution in Workspace Terminal"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  <span>View in Terminal</span>
                </button>
              )}
            </div>
          </div>

          {/* Command Prompt Line */}
          <div className="text-zinc-200 font-semibold mb-2 flex items-baseline gap-1.5 select-text">
            <span className="text-zinc-400 select-none">$</span>
            <span className="break-all">{commandData.command}</span>
          </div>

          {/* Output content or No output */}
          <div className="mb-2">
            {hasOutput ? (
              <pre className="whitespace-pre-wrap break-all text-[11px] leading-relaxed max-h-56 overflow-y-auto text-zinc-300 bg-black/30 p-2 rounded border border-zinc-800/50">
                {rawOutput}
              </pre>
            ) : (
              <div className="text-zinc-500 italic text-xs py-1">No output</div>
            )}
          </div>

          {/* Footer exit code */}
          <div className="flex items-center justify-end pt-1 select-none">
            {commandData.isRunning ? (
              <span className="text-cyan-400 text-[11px] font-mono animate-pulse">
                Executing...
              </span>
            ) : exitCode !== undefined ? (
              <span
                className={`text-[11px] font-mono ${
                  commandData.isTimeout || exitCode === 124
                    ? 'text-zinc-400 font-semibold'
                    : exitCode === 0
                    ? 'text-zinc-400'
                    : 'text-rose-400'
                }`}
              >
                Exit code {exitCode}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
