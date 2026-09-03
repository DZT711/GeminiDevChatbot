import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  Trash2,
  CornerDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import type { CommandExecutionResult } from '../../services/workspaceService.js';

interface TerminalLogEntry {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timestamp: number;
}

interface WorkspaceTerminalProps {
  workingDirectory: string;
  onRunCommand: (command: string) => Promise<CommandExecutionResult>;
  theme?: 'light' | 'dark';
}

const QUICK_COMMANDS = ['ls -la', 'python3 random_utils.py', 'python3 -c "import random_utils; print(random_utils.generate_random_string())"', 'python3 --version', 'node -v'];

export const WorkspaceTerminal: React.FC<WorkspaceTerminalProps> = ({
  workingDirectory,
  onRunCommand,
  theme = 'dark'
}) => {
  const [logs, setLogs] = useState<TerminalLogEntry[]>([]);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isRunning]);

  const handleSubmit = async (cmdToRun?: string) => {
    const rawCmd = cmdToRun !== undefined ? cmdToRun : currentInput;
    const cmd = rawCmd.trim();
    if (!cmd || isRunning) return;

    // Add to history
    setCommandHistory((prev) => [...prev.filter((c) => c !== cmd), cmd]);
    setHistoryIndex(-1);
    setCurrentInput('');
    setIsRunning(true);

    try {
      const res = await onRunCommand(cmd);
      setLogs((prev) => [
        ...prev,
        {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          command: cmd,
          stdout: res.stdout,
          stderr: res.stderr,
          exitCode: res.exitCode,
          durationMs: res.durationMs,
          timestamp: Date.now()
        }
      ]);
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          command: cmd,
          stdout: '',
          stderr: err.message || 'Execution error',
          exitCode: 1,
          durationMs: 0,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsRunning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setCurrentInput(commandHistory[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= commandHistory.length) {
        setHistoryIndex(-1);
        setCurrentInput('');
      } else {
        setHistoryIndex(nextIdx);
        setCurrentInput(commandHistory[nextIdx] || '');
      }
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`h-full flex flex-col font-mono text-xs ${isDark ? 'bg-zinc-950 text-zinc-200' : 'bg-slate-900 text-slate-100'}`}>
      {/* Terminal Top Bar */}
      <div className="p-2 px-3 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-400">
          <TerminalIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-zinc-200">Sandbox Terminal</span>
          <span className="text-zinc-600">•</span>
          <span className="text-[11px] text-zinc-400">{workingDirectory}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick shortcuts */}
          <div className="flex items-center gap-1">
            {QUICK_COMMANDS.slice(0, 3).map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => handleSubmit(cmd)}
                disabled={isRunning}
                className="px-2 py-0.5 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
              >
                {cmd}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setLogs([])}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Clear Terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Scroll Output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 font-mono">
        {logs.length === 0 ? (
          <div className="text-zinc-600 text-xs py-4 select-none">
            Welcome to the DevEngine Sandbox Terminal. Commands execute in the isolated workspace environment.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="space-y-1">
              {/* Command Prompt Line */}
              <div className="flex items-center justify-between text-zinc-400">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-indigo-400 font-bold">$</span>
                  <span className="text-zinc-100 font-semibold">{log.command}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {log.durationMs}ms
                  </span>
                  <span
                    className={`px-1 py-0.2 rounded font-bold ${
                      log.exitCode === 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                    }`}
                  >
                    exit {log.exitCode}
                  </span>
                </div>
              </div>

              {/* Stdout */}
              {log.stdout && (
                <pre className="text-zinc-300 text-[11px] leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-indigo-500/30">
                  {log.stdout}
                </pre>
              )}

              {/* Stderr */}
              {log.stderr && (
                <pre className="text-rose-400 text-[11px] leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-rose-500/50">
                  {log.stderr}
                </pre>
              )}
            </div>
          ))
        )}

        {/* In-Flight Spinner */}
        {isRunning && (
          <div className="flex items-center gap-2 text-indigo-400 text-xs py-1">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>Executing command in sandbox...</span>
          </div>
        )}
      </div>

      {/* Terminal Input Line */}
      <div className="p-2 border-t border-zinc-800 bg-zinc-900/40 flex items-center gap-2">
        <span className="text-indigo-400 font-bold pl-2">$</span>
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder="Run shell command (e.g. ls, npm test)..."
          className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-600 outline-none font-mono"
        />
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={isRunning || !currentInput.trim()}
          className="p-1 px-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 text-xs flex items-center gap-1"
        >
          <CornerDownLeft className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
