import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Terminal as TerminalIcon,
  Trash2,
  CornerDownLeft,
  Clock,
  HelpCircle,
  Copy,
  Check,
  RotateCcw,
  Search,
  X,
  Square,
  ArrowDown,
  Sparkles,
  ShieldCheck,
  Folder,
  Send
} from 'lucide-react';
import type { CommandExecutionResult, WorkspaceDirectoryEntry } from '../../services/workspaceService.js';

interface TerminalLogEntry {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timestamp: number;
  cwd?: string;
  isAborted?: boolean;
  stdinUsed?: string;
  showsInputPrompt?: boolean;
  inputPromptTip?: string;
}

interface WorkspaceTerminalProps {
  workingDirectory: string;
  onRunCommand: (
    command: string,
    options?: {
      input?: string;
      sessionId?: string;
      signal?: AbortSignal;
      onStdout?: (chunk: string) => void;
      onStderr?: (chunk: string) => void;
    }
  ) => Promise<CommandExecutionResult>;
  onSendCommandInput?: (sessionId: string, input: string) => Promise<boolean>;
  onAbortCommand?: (sessionId: string) => Promise<boolean>;
  files?: Array<{ name: string; path: string; type?: string } | WorkspaceDirectoryEntry>;
  theme?: 'light' | 'dark';
  isAgentCoding?: boolean;
  onToggleMaximize?: () => void;
  isMaximized?: boolean;
  externalCommand?: string | null;
  onClearExternalCommand?: () => void;
}

const STORAGE_KEY_HISTORY = 'devgenie_terminal_history';
const DEFAULT_COMMANDS = [
  'ls',
  'ls -la',
  'ls -lh',
  'cd',
  'pwd',
  'whoami',
  'uname -a',
  'cat',
  'head',
  'tail',
  'grep',
  'find',
  'echo',
  'touch',
  'mkdir',
  'rm',
  'cp',
  'mv',
  'python3',
  'node',
  'npm',
  'git',
  'curl',
  'jq',
  'date',
  'uptime',
  'clear',
  'history',
  'help'
];

export const formatLinuxPath = (p: string): string => {
  if (!p || p === '/workspace' || p === '/home/user') return '~/workspace';
  if (p.startsWith('/workspace/')) return `~/workspace/${p.slice('/workspace/'.length)}`;
  if (p.startsWith('/home/user/')) return `~/${p.slice('/home/user/'.length)}`;
  return p;
};

export const LinuxPrompt: React.FC<{
  user?: string;
  host?: string;
  cwd: string;
  symbol?: string;
  className?: string;
}> = ({ user = 'dev', host = 'sandbox', cwd, symbol = '$', className = '' }) => (
  <span className={`inline-flex items-center gap-0 select-none font-mono text-xs whitespace-nowrap ${className}`}>
    <span className="text-emerald-400 font-bold">{user}@{host}</span>
    <span className="text-zinc-500">:</span>
    <span className="text-sky-400 font-semibold">{formatLinuxPath(cwd)}</span>
    <span className="text-zinc-200 font-bold ml-1 mr-1.5">{symbol}</span>
  </span>
);

const findCommonPrefix = (strings: string[]): string => {
  if (strings.length === 0) return '';
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (strings[i].indexOf(prefix) !== 0) {
      prefix = prefix.substring(0, prefix.length - 1);
      if (prefix === '') return '';
    }
  }
  return prefix;
};

interface AnsiSegment {
  text: string;
  classes: string;
}

/**
 * Parses terminal ANSI color escape codes into stylized Tailwind CSS spans
 */
const parseAnsi = (text: string): AnsiSegment[] => {
  if (!text) return [];

  // Match standard ANSI escape sequences: \u001b[...m or \x1b[...m
  const ansiRegex = /(?:\u001b|\x1b)\[([0-9;]*)m/g;
  const segments: AnsiSegment[] = [];

  let lastIndex = 0;
  let activeColor = '';
  let isBold = false;
  let isUnderline = false;

  const getStyleClass = (): string => {
    const parts: string[] = [];
    if (activeColor) parts.push(activeColor);
    if (isBold) parts.push('font-bold');
    if (isUnderline) parts.push('underline');
    return parts.join(' ');
  };

  let match: RegExpExecArray | null = ansiRegex.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, match.index),
        classes: getStyleClass()
      });
    }

    const codeStr = match[1] || '0';
    const codes = codeStr.split(';').map((c) => parseInt(c, 10) || 0);

    for (const code of codes) {
      if (code === 0) {
        activeColor = '';
        isBold = false;
        isUnderline = false;
      } else if (code === 1) {
        isBold = true;
      } else if (code === 4) {
        isUnderline = true;
      } else if (code === 30) {
        activeColor = 'text-zinc-600';
      } else if (code === 31 || code === 91) {
        activeColor = 'text-rose-400';
      } else if (code === 32 || code === 92) {
        activeColor = 'text-emerald-400';
      } else if (code === 33 || code === 93) {
        activeColor = 'text-amber-300';
      } else if (code === 34 || code === 94) {
        activeColor = 'text-sky-400';
      } else if (code === 35 || code === 95) {
        activeColor = 'text-purple-400';
      } else if (code === 36 || code === 96) {
        activeColor = 'text-cyan-400';
      } else if (code === 37 || code === 97) {
        activeColor = 'text-zinc-100';
      } else if (code === 90) {
        activeColor = 'text-zinc-500';
      }
    }

    lastIndex = ansiRegex.lastIndex;
    match = ansiRegex.exec(text);
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      classes: getStyleClass()
    });
  }

  return segments;
};

const AnsiText: React.FC<{ text: string; defaultColorClass?: string }> = ({
  text,
  defaultColorClass = 'text-zinc-300'
}) => {
  const segments = useMemo(() => parseAnsi(text), [text]);

  if (segments.length === 0) {
    return <span className={defaultColorClass}>{text}</span>;
  }

  return (
    <>
      {segments.map((seg, idx) => (
        <span key={idx} className={seg.classes || defaultColorClass}>
          {seg.text}
        </span>
      ))}
    </>
  );
};

export const WorkspaceTerminal: React.FC<WorkspaceTerminalProps> = ({
  workingDirectory,
  onRunCommand,
  onSendCommandInput,
  onAbortCommand,
  files = [],
  theme = 'dark',
  isAgentCoding = false,
  onToggleMaximize,
  isMaximized = false,
  externalCommand,
  onClearExternalCommand
}) => {
  const [logs, setLogs] = useState<TerminalLogEntry[]>([]);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeCommand, setActiveCommand] = useState<string>('');
  const [liveStdout, setLiveStdout] = useState<string>('');
  const [liveStderr, setLiveStderr] = useState<string>('');
  const activeSessionIdRef = useRef<string>('');
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('sm');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [currentCwd, setCurrentCwd] = useState<string>(workingDirectory || '/workspace');
  const [tabSuggestions, setTabSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (workingDirectory) {
      setCurrentCwd(workingDirectory);
    }
  }, [workingDirectory]);

  // Stdin states
  const [stdinText, setStdinText] = useState<string>('');
  const [showStdinDrawer, setShowStdinDrawer] = useState<boolean>(false);
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastHandledExternalRef = useRef<string | null>(null);
  const runStartTimeRef = useRef<number>(0);

  // Live timer while running - runs cleanly without state re-trigger loops
  useEffect(() => {
    if (!isRunning) {
      setElapsedSeconds(0);
      return;
    }
    const startTime = Date.now();
    runStartTimeRef.current = startTime;
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [isRunning]);

  // Save history to localStorage
  const updateHistory = useCallback((cmd: string): void => {
    setCommandHistory((prev) => {
      const filtered = prev.filter((c) => c !== cmd);
      const updated = [...filtered, cmd].slice(-50);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // Detect user scroll position
  const handleScroll = (): void => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - (scrollTop + clientHeight) < 60;
    setShowScrollBottom(!isAtBottom);
  };

  const scrollToBottom = (): void => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
    setShowScrollBottom(false);
  };

  // Auto scroll on new logs if near bottom
  useEffect(() => {
    if (!showScrollBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isRunning, showScrollBottom]);

  // Contextual Quick Commands
  const quickCommands = useMemo<string[]>(() => {
    const list: string[] = ['ls -la'];
    const fileNames = files.map((f) => f.name.toLowerCase());
    if (fileNames.includes('main.py')) {
      list.push('python3 main.py');
    } else {
      const pyFile = files.find((f) => f.name.endsWith('.py'));
      if (pyFile) list.push(`python3 ${pyFile.name}`);
    }
    if (fileNames.includes('package.json')) {
      list.push('npm test');
    }
    const jsFile = files.find((f) => f.name.endsWith('.js') && !f.name.includes('.config.'));
    if (jsFile) list.push(`node ${jsFile.name}`);

    list.push('pwd');
    list.push('help');
    return Array.from(new Set(list));
  }, [files]);

  // Stop running command (Ctrl+C / SIGINT)
  const handleStopExecution = useCallback((): void => {
    if (!isRunning) return;
    const currentSessionId = activeSessionIdRef.current;
    if (currentSessionId && onAbortCommand) {
      onAbortCommand(currentSessionId).catch(() => {});
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLogs((prev) => [
      ...prev,
      {
        id: `log_${Date.now()}_aborted`,
        command: activeCommand,
        stdout: liveStdout,
        stderr: (liveStderr ? liveStderr + '\n' : '') + '^C (Aborted by user - SIGINT)',
        exitCode: 130,
        durationMs: Math.max(0, Date.now() - (runStartTimeRef.current || Date.now())),
        timestamp: Date.now(),
        cwd: currentCwd,
        isAborted: true
      }
    ]);
    activeSessionIdRef.current = '';
    setIsRunning(false);
    setActiveCommand('');
    setLiveStdout('');
    setLiveStderr('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [isRunning, activeCommand, liveStdout, liveStderr, onAbortCommand, currentCwd]);

  // Send interactive input to currently running command process
  const handleSendLiveInput = useCallback(async (): Promise<void> => {
    if (!isRunning || !activeSessionIdRef.current) return;
    const textToSend = currentInput;
    setCurrentInput('');
    // Echo user typed input to live stdout just like a real shell terminal
    setLiveStdout((prev) => prev + textToSend + '\n');
    if (onSendCommandInput) {
      await onSendCommandInput(activeSessionIdRef.current, textToSend);
    }
  }, [isRunning, currentInput, onSendCommandInput]);

  const copyToClipboard = async (text: string, id: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const copyAllOutput = async (): Promise<void> => {
    const full = logs
      .map((l) => `$ ${l.command}\n${l.stdout ? l.stdout + '\n' : ''}${l.stderr ? l.stderr + '\n' : ''}`)
      .join('\n');
    await copyToClipboard(full, 'all');
  };

  const handleSubmit = async (cmdToRun?: string, stdinOverride?: string): Promise<void> => {
    const rawCmd = cmdToRun !== undefined ? cmdToRun : currentInput;
    const cmd = rawCmd.trim();
    if (!cmd || isRunning || isAgentCoding) return;

    updateHistory(cmd);
    setHistoryIndex(-1);
    setCurrentInput('');
    setTabSuggestions([]);

    // Fast-path client-side commands
    if (cmd === 'clear' || cmd === 'cls') {
      setLogs([]);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    if (cmd === 'whoami') {
      setLogs((prev) => [
        ...prev,
        {
          id: `whoami_${Date.now()}`,
          command: 'whoami',
          stdout: 'dev\n',
          stderr: '',
          exitCode: 0,
          durationMs: 1,
          timestamp: Date.now(),
          cwd: currentCwd
        }
      ]);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    if (cmd === 'uname' || cmd === 'uname -a') {
      setLogs((prev) => [
        ...prev,
        {
          id: `uname_${Date.now()}`,
          command: cmd,
          stdout: 'Linux devgenie-sandbox 6.6.0-generic #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux\n',
          stderr: '',
          exitCode: 0,
          durationMs: 1,
          timestamp: Date.now(),
          cwd: currentCwd
        }
      ]);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    if (cmd === 'date') {
      setLogs((prev) => [
        ...prev,
        {
          id: `date_${Date.now()}`,
          command: 'date',
          stdout: `${new Date().toUTCString()}\n`,
          stderr: '',
          exitCode: 0,
          durationMs: 1,
          timestamp: Date.now(),
          cwd: currentCwd
        }
      ]);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    if (cmd === 'help') {
      setLogs((prev) => [
        ...prev,
        {
          id: `help_${Date.now()}`,
          command: 'help',
          stdout:
            'DevGenie Linux Sandbox Shell Help\n' +
            '─────────────────────────────────────────────────────────────\n' +
            'Linux Keyboard Shortcuts:\n' +
            '  • Tab         : Autocomplete commands, files & directories\n' +
            '  • Up / Down   : History navigation (browse previous commands)\n' +
            '  • Ctrl + C    : Interrupt / kill running process (SIGINT)\n' +
            '  • Ctrl + L    : Clear terminal screen\n' +
            '  • Ctrl + U    : Erase current command line\n' +
            '  • Escape      : Clear input line or suggestions\n\n' +
            'Standard Linux Commands:\n' +
            '  • ls -la      : List directory contents with permissions & sizes\n' +
            '  • cd <dir>    : Change directory with persistent path tracking\n' +
            '  • pwd         : Print current working directory\n' +
            '  • whoami      : Display current shell username (dev)\n' +
            '  • uname -a    : Display kernel & system architecture\n' +
            '  • cat <file>  : View file contents\n' +
            '  • python3 <f> : Execute Python 3 scripts\n' +
            '  • node <f>    : Execute Node.js scripts\n' +
            '  • mkdir / rm  : Create or remove workspace directories/files\n' +
            '  • echo / pipe : echo "data" | python3 script.py\n' +
            '  • history     : View numbered command history\n' +
            '  • clear       : Clear terminal window',
          stderr: '',
          exitCode: 0,
          durationMs: 1,
          timestamp: Date.now(),
          cwd: currentCwd
        }
      ]);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    if (cmd === 'history') {
      const historyList = commandHistory
        .map((c, i) => `  ${String(i + 1).padStart(3, ' ')}  ${c}`)
        .join('\n');
      setLogs((prev) => [
        ...prev,
        {
          id: `hist_${Date.now()}`,
          command: 'history',
          stdout: historyList || 'No command history recorded yet.',
          stderr: '',
          exitCode: 0,
          durationMs: 1,
          timestamp: Date.now(),
          cwd: currentCwd
        }
      ]);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    if (cmd === 'pwd') {
      setLogs((prev) => [
        ...prev,
        {
          id: `pwd_${Date.now()}`,
          command: 'pwd',
          stdout: `${currentCwd}\n`,
          stderr: '',
          exitCode: 0,
          durationMs: 1,
          timestamp: Date.now(),
          cwd: currentCwd
        }
      ]);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    const inputToUse =
      stdinOverride !== undefined
        ? stdinOverride
        : showStdinDrawer && stdinText.trim()
        ? stdinText
        : undefined;

    const normalizedInput =
      inputToUse !== undefined
        ? inputToUse.endsWith('\n')
          ? inputToUse
          : `${inputToUse}\n`
        : undefined;

    const sessionId = `term_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    activeSessionIdRef.current = sessionId;
    setLiveStdout('');
    setLiveStderr('');
    setIsRunning(true);
    setActiveCommand(cmd);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await onRunCommand(cmd, {
        signal: controller.signal,
        input: normalizedInput,
        sessionId,
        onStdout: (chunk: string) => {
          setLiveStdout((prev) => prev + chunk);
        },
        onStderr: (chunk: string) => {
          setLiveStderr((prev) => prev + chunk);
        }
      });

      if (res.workingDirectory) {
        setCurrentCwd(res.workingDirectory);
      }

      const isAborted = res.exitCode === 130;

      // Check if command failed specifically due to waiting for interactive input without stdin
      // Strictly FALSE if exitCode is 0 or if stdin was already supplied or if aborted
      const hasEofError =
        res.stderr.includes('EOFError') ||
        res.stderr.includes('EOF when reading a line') ||
        res.stderr.includes('interactive stdin');

      const isAwaitingInput = res.exitCode !== 0 && hasEofError && !inputToUse && !isAborted;

      let tip: string | undefined;
      if (isAwaitingInput) {
        tip = `echo "value" | ${cmd}`;
      }

      setLogs((prev) => [
        ...prev,
        {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          command: cmd,
          stdout: res.stdout,
          stderr: res.stderr,
          exitCode: res.exitCode,
          durationMs: res.durationMs,
          timestamp: Date.now(),
          cwd: currentCwd,
          stdinUsed: inputToUse,
          showsInputPrompt: isAwaitingInput,
          inputPromptTip: tip,
          isAborted
        }
      ]);
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      if (errorObj?.name === 'AbortError') {
        // Handled in handleStopExecution
        return;
      }
      setLogs((prev) => [
        ...prev,
        {
          id: `log_${Date.now()}_err`,
          command: cmd,
          stdout: '',
          stderr: errorObj?.message || 'Execution failed',
          exitCode: 1,
          durationMs: 0,
          timestamp: Date.now(),
          cwd: currentCwd
        }
      ]);
    } finally {
      abortControllerRef.current = null;
      activeSessionIdRef.current = '';
      setIsRunning(false);
      setActiveCommand('');
      setLiveStdout('');
      setLiveStderr('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Handle external execution requests (e.g. Run File button clicked in CodeEditor)
  useEffect(() => {
    if (externalCommand && externalCommand !== lastHandledExternalRef.current && !isRunning && !isAgentCoding) {
      lastHandledExternalRef.current = externalCommand;
      onClearExternalCommand?.();
      handleSubmit(externalCommand);
    }
  }, [externalCommand, isRunning, isAgentCoding]);

  // Tab autocompletion handler
  const handleTabCompletion = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const val = currentInput;
    if (!val.trim()) {
      setCurrentInput('ls -la');
      return;
    }

    const words = val.split(' ');
    const lastWord = words[words.length - 1] || '';
    const isFirstWord = words.length === 1;

    let pool: string[] = [];
    if (isFirstWord) {
      pool = [...DEFAULT_COMMANDS];
    } else {
      const firstCmd = words[0].toLowerCase();
      if (firstCmd === 'cd') {
        pool = files
          .filter((f) => ('isDirectory' in f && f.isDirectory) || ('type' in f && f.type === 'directory'))
          .map((f) => f.name + '/');
      } else {
        pool = files.map((f) =>
          (('isDirectory' in f && f.isDirectory) || ('type' in f && f.type === 'directory'))
            ? f.name + '/'
            : f.name
        );
      }
    }

    const matches = pool.filter((item) =>
      item.toLowerCase().startsWith(lastWord.toLowerCase())
    );

    if (matches.length === 1) {
      setTabSuggestions([]);
      const completion = matches[0];
      words[words.length - 1] = completion;
      const newCmd = words.join(' ');
      setCurrentInput(newCmd + (completion.endsWith('/') ? '' : ' '));
    } else if (matches.length > 1) {
      setTabSuggestions(matches.slice(0, 10));
      const common = findCommonPrefix(matches);
      if (common && common.length > lastWord.length) {
        words[words.length - 1] = common;
        setCurrentInput(words.join(' '));
      }
    } else {
      setTabSuggestions([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'c' && e.ctrlKey) {
      if (isRunning) {
        e.preventDefault();
        handleStopExecution();
      } else if (currentInput) {
        e.preventDefault();
        setCurrentInput('');
        setTabSuggestions([]);
      }
      return;
    }

    if (e.key === 'u' && e.ctrlKey) {
      e.preventDefault();
      setCurrentInput('');
      setTabSuggestions([]);
      return;
    }

    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLogs([]);
      return;
    }

    if (e.key === 'f' && e.ctrlKey) {
      e.preventDefault();
      setIsSearchOpen((prev) => !prev);
      return;
    }

    if (e.key === 'Escape') {
      setTabSuggestions([]);
      if (isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery('');
      } else {
        setCurrentInput('');
      }
      return;
    }

    if (e.key === 'Tab') {
      handleTabCompletion(e);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (isRunning) {
        handleSendLiveInput();
      } else {
        handleSubmit();
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setCurrentInput(commandHistory[nextIdx] || '');
      return;
    }

    if (e.key === 'ArrowDown') {
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

  // Filter logs based on search query
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (l) => l.command.toLowerCase().includes(q) || l.stdout.toLowerCase().includes(q) || l.stderr.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  const handleTerminalContainerClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    const sel = window.getSelection();
    if (sel && sel.toString().length > 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a') || target.closest('form')) {
      return;
    }
    inputRef.current?.focus();
  };

  const isDark = theme === 'dark';

  const fontClass =
    fontSize === 'base' ? 'text-xs' : fontSize === 'lg' ? 'text-sm' : 'text-[11px]';

  return (
    <div
      className={`h-full flex flex-col font-mono relative select-text ${
        isDark ? 'bg-zinc-950 text-zinc-200' : 'bg-slate-900 text-slate-100'
      }`}
    >
      {/* Top Bar */}
      <div className="p-2 px-3 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Window dots, Terminal badge & cwd */}
        <div className="flex items-center gap-2 text-zinc-400 min-w-0">
          <div className="flex items-center gap-1.5 mr-1 select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-200 border border-zinc-700/60 shrink-0 select-none">
            <TerminalIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-semibold text-xs">bash</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800/80 text-[11px] text-zinc-300 truncate border border-zinc-700/40">
            <Folder className="w-3 h-3 text-sky-400 shrink-0" />
            <span className="truncate font-mono">{formatLinuxPath(currentCwd)}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[10px]">
            {isAgentCoding ? (
              <span className="flex items-center gap-1 text-purple-300 px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800/60 animate-pulse font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Agent Coding Active
              </span>
            ) : isRunning ? (
              <span className="flex items-center gap-1 text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Running ({elapsedSeconds}s)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Bash 5.2 (Ready)
              </span>
            )}
          </div>
        </div>

        {/* Right: Quick commands & action icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick command buttons */}
          <div className="hidden md:flex items-center gap-1">
            {quickCommands.slice(0, 4).map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => handleSubmit(cmd)}
                disabled={isRunning}
                className="px-2 py-0.5 text-[10px] rounded bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1 border border-zinc-700/50"
              >
                <span>{cmd}</span>
              </button>
            ))}
          </div>

          {/* Search Toggle */}
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className={`p-1.5 rounded transition-colors text-zinc-400 hover:text-zinc-200 ${
              isSearchOpen ? 'bg-indigo-600/30 text-indigo-300' : 'hover:bg-zinc-800'
            }`}
            title="Search logs (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Copy All */}
          <button
            type="button"
            onClick={copyAllOutput}
            disabled={logs.length === 0}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition-colors"
            title="Copy entire session"
          >
            {copiedId === 'all' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Font Size Toggle */}
          <button
            type="button"
            onClick={() =>
              setFontSize((prev) => (prev === 'sm' ? 'base' : prev === 'base' ? 'lg' : 'sm'))
            }
            className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title={`Font size: ${fontSize.toUpperCase()} (Click to toggle)`}
          >
            {fontSize === 'sm' ? '11px' : fontSize === 'base' ? '12px' : '14px'}
          </button>

          {/* Clear Terminal */}
          <button
            type="button"
            onClick={() => setLogs([])}
            disabled={logs.length === 0 && !isRunning}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 disabled:opacity-30 transition-colors"
            title="Clear terminal (Ctrl+L)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Optional Search Bar */}
      {isSearchOpen && (
        <div className="px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2 text-xs">
          <Search className="w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter terminal output..."
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 outline-none"
            autoFocus
          />
          {searchQuery && (
            <span className="text-[10px] text-zinc-400">
              {filteredLogs.length} matching command{filteredLogs.length === 1 ? '' : 's'}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery('');
            }}
            className="p-1 text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Terminal Scroll Output */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onClick={handleTerminalContainerClick}
        className={`flex-1 overflow-y-auto p-3 space-y-4 font-mono cursor-text ${fontClass}`}
      >
        {logs.length === 0 && (
          <div className="space-y-2.5 py-3 select-none text-zinc-400 border border-zinc-800/90 bg-zinc-900/50 rounded-lg p-3.5 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <TerminalIcon className="w-4 h-4" />
                <span>DevGenie Linux Terminal (x86_64-linux-gnu)</span>
              </div>
              <span className="text-[10px] text-zinc-500">Ubuntu 24.04 LTS Container</span>
            </div>
            <div className="text-[11px] text-zinc-400 space-y-1 pl-1 border-l-2 border-emerald-500/40">
              <p>• Shell: <span className="text-zinc-200">/bin/bash (5.2)</span> | User: <span className="text-emerald-400 font-semibold">dev</span> | Host: <span className="text-emerald-400 font-semibold">sandbox</span></p>
              <p>• CWD: <span className="text-sky-400 font-semibold">{currentCwd}</span> (persists across commands with <code className="text-amber-300">cd</code>)</p>
              <p>• Runtimes: <span className="text-zinc-300">Python 3.11, Node.js 20, git, curl, jq, sed, awk</span></p>
              <p>• Aliases enabled: <span className="text-zinc-300">ll, la, l, whoami</span></p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-zinc-500 text-[10px]">Quick test:</span>
              {['ls -la', 'pwd', 'whoami', 'uname -a', 'help'].map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => handleSubmit(cmd)}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sky-300 hover:text-white font-mono text-[11px] transition-colors border border-zinc-700/60"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredLogs.map((log) => (
          <div key={log.id} className="group space-y-1.5">
            {/* Command Header Line with Linux Prompt */}
            <div className="flex items-center justify-between text-zinc-400">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <LinuxPrompt cwd={log.cwd || currentCwd} />
                <span className="text-zinc-100 font-semibold truncate">{log.command}</span>
                {log.stdinUsed && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-700/40 font-mono">
                    input: &quot;{log.stdinUsed.trim()}&quot;
                  </span>
                )}
              </div>

              {/* Action Toolbar on Hover */}
              <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                {/* Rerun */}
                <button
                  type="button"
                  onClick={() => handleSubmit(log.command)}
                  disabled={isRunning}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
                  title="Re-run this command"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>

                {/* Copy Output */}
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `${log.stdout}${log.stderr ? '\n' + log.stderr : ''}`,
                      `out_${log.id}`
                    )
                  }
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
                  title="Copy output"
                >
                  {copiedId === `out_${log.id}` ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>

                {/* Duration */}
                <span className="flex items-center gap-0.5 text-[10px] text-zinc-500 ml-1">
                  <Clock className="w-2.5 h-2.5" />
                  {log.durationMs >= 1000
                    ? `${(log.durationMs / 1000).toFixed(1)}s`
                    : `${log.durationMs}ms`}
                </span>

                {/* Exit status badge */}
                {log.isAborted ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800/40">
                    aborted (130)
                  </span>
                ) : (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                      log.exitCode === 0
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/40'
                        : 'bg-rose-950/80 text-rose-400 border-rose-800/40'
                    }`}
                  >
                    exit {log.exitCode}
                  </span>
                )}
              </div>
            </div>

            {/* Stdout Output */}
            {log.stdout && (
              <pre className="text-zinc-200 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-emerald-500/40 overflow-x-auto py-0.5">
                <AnsiText text={log.stdout} defaultColorClass="text-zinc-200" />
              </pre>
            )}

            {/* Stderr Output */}
            {log.stderr && (
              <pre className="text-rose-400 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-rose-500/60 overflow-x-auto py-0.5">
                <AnsiText text={log.stderr} defaultColorClass="text-rose-400" />
              </pre>
            )}

            {/* Actionable Interactive Input Suggestion & Inline Input Box */}
            {log.showsInputPrompt && (
              <div className="space-y-1.5 pt-1">
                {/* Inline form to enter value and run directly */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs bg-indigo-950/40 border border-indigo-500/30 rounded p-2">
                  <div className="flex items-center gap-1.5 text-indigo-300 shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="font-semibold text-[11px]">Input value for script:</span>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const val = inlineInputs[log.id] ?? '';
                      // Dismiss prompt on current log so it does not stay in the DOM or re-trigger
                      setLogs((prev) =>
                        prev.map((l) => (l.id === log.id ? { ...l, showsInputPrompt: false } : l))
                      );
                      handleSubmit(log.command, val);
                    }}
                    className="flex items-center gap-1.5 flex-1"
                  >
                    <input
                      type="text"
                      value={inlineInputs[log.id] ?? ''}
                      onChange={(e) =>
                        setInlineInputs((prev) => ({ ...prev, [log.id]: e.target.value }))
                      }
                      placeholder='Type value (e.g. huy) and click Run'
                      className="flex-1 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      type="submit"
                      disabled={isRunning || isAgentCoding}
                      className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1 transition-colors shrink-0 disabled:opacity-50"
                    >
                      <span>{isAgentCoding ? 'Agent Coding...' : 'Run with input'}</span>
                      <CornerDownLeft className="w-3 h-3" />
                    </button>
                  </form>
                </div>

                {/* Shell pipe syntax tip */}
                {log.inputPromptTip && (
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 pl-1">
                    <span>Or run via shell pipe:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentInput(log.inputPromptTip || '');
                        inputRef.current?.focus();
                      }}
                      className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-indigo-300 font-mono text-[10px] transition-colors border border-zinc-700"
                    >
                      {log.inputPromptTip}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Live Execution Indicator */}
        {isRunning && (
          <div className="space-y-1.5 text-indigo-400 py-2 pl-3 border-l-2 border-emerald-400 bg-emerald-950/20 rounded-r">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-wrap">
                <LinuxPrompt cwd={currentCwd} />
                <span className="font-semibold text-zinc-100">{activeCommand}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
                <span className="text-zinc-400 text-xs">({elapsedSeconds}s)...</span>
              </div>
              <button
                type="button"
                onClick={handleStopExecution}
                className="mr-2 px-2 py-1 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-xs flex items-center gap-1 transition-colors border border-rose-700/50"
                title="Stop / Interrupt command (Ctrl+C)"
              >
                <Square className="w-3 h-3 fill-rose-300" />
                <span>Stop (Ctrl+C)</span>
              </button>
            </div>

            {/* Live streaming stdout (e.g. "Enter your name: ") */}
            {liveStdout && (
              <pre className="text-zinc-200 leading-relaxed whitespace-pre-wrap pl-2 border-l border-emerald-500/40 overflow-x-auto py-0.5 text-xs font-mono">
                <AnsiText text={liveStdout} defaultColorClass="text-zinc-200" />
              </pre>
            )}

            {/* Live streaming stderr */}
            {liveStderr && (
              <pre className="text-rose-400 leading-relaxed whitespace-pre-wrap pl-2 border-l border-rose-500/30 overflow-x-auto py-0.5 text-xs font-mono">
                <AnsiText text={liveStderr} defaultColorClass="text-rose-400" />
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-14 right-4 px-2.5 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs shadow-lg flex items-center gap-1.5 transition-transform hover:scale-105 z-10"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Scroll to bottom</span>
        </button>
      )}

      {/* Expandable Stdin Input Drawer */}
      {showStdinDrawer && (
        <div className="px-3 py-2 border-t border-zinc-800 bg-zinc-900/95 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-indigo-300 shrink-0">
            <Send className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-[11px]">Standard Input (stdin):</span>
          </div>
          <input
            type="text"
            value={stdinText}
            onChange={(e) => setStdinText(e.target.value)}
            placeholder="Value to feed into script stdin (e.g. huy)"
            className="flex-1 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-indigo-500"
          />
          {stdinText && (
            <button
              type="button"
              onClick={() => setStdinText('')}
              className="text-[10px] text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowStdinDrawer(false)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 p-1"
            title="Close stdin input bar"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Tab Autocompletion Candidate Hints Bar */}
      {tabSuggestions.length > 0 && (
        <div className="px-3 py-1.5 bg-zinc-900/95 border-t border-zinc-800 flex items-center gap-1.5 flex-wrap text-xs font-mono">
          <span className="text-[10px] text-zinc-500 mr-1 select-none">Completions:</span>
          {tabSuggestions.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => {
                const words = currentInput.split(' ');
                words[words.length - 1] = sug;
                setCurrentInput(words.join(' ') + (sug.endsWith('/') ? '' : ' '));
                setTabSuggestions([]);
                inputRef.current?.focus();
              }}
              className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sky-300 hover:text-white text-[11px] font-mono border border-zinc-700/60 transition-colors"
            >
              {sug}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setTabSuggestions([])}
            className="p-0.5 text-zinc-500 hover:text-zinc-300 ml-auto"
            title="Dismiss suggestions (Esc)"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Terminal Input Line */}
      <div className="p-2 border-t border-zinc-800 bg-zinc-900/80 flex items-center gap-2 shrink-0">
        {/* Stdin Toggle Button */}
        <button
          type="button"
          onClick={() => setShowStdinDrawer((prev) => !prev)}
          className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-colors border ${
            showStdinDrawer || stdinText.trim()
              ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
              : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-700/60'
          }`}
          title="Toggle stdin input bar to pass inputs to scripts"
        >
          <span className="text-[11px] font-medium">Input</span>
          {stdinText.trim() ? (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          ) : (
            <span className="text-[10px] opacity-60">stdin</span>
          )}
        </button>

        {/* Linux Shell Prompt */}
        <LinuxPrompt cwd={currentCwd} />

        <div className="flex-1 flex items-center min-w-0 relative">
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => {
              setCurrentInput(e.target.value);
              if (tabSuggestions.length > 0) setTabSuggestions([]);
            }}
            onKeyDown={handleKeyDown}
            disabled={isAgentCoding}
            placeholder={
              isAgentCoding
                ? 'Agent is actively coding/executing... Terminal input locked to prevent conflicts'
                : isRunning
                ? 'Type input for running process & press Enter (or Ctrl+C to stop)...'
                : 'Run shell command (e.g. ls -la, python3 main.py, echo "huy" | python3 main.py)...'
            }
            className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-500 outline-none font-mono disabled:opacity-50"
          />
        </div>

        {isAgentCoding ? (
          <div
            className="px-2.5 py-1 rounded bg-purple-950/80 border border-purple-600/40 text-purple-300 text-xs font-semibold flex items-center gap-1.5 select-none animate-pulse shrink-0"
            title="Agent is actively coding / executing tasks. Command execution locked to prevent conflicts."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping shrink-0" />
            <span className="text-[11px]">Agent Coding...</span>
          </div>
        ) : isRunning ? (
          <div className="flex items-center gap-1.5 shrink-0">
            {currentInput.trim() && (
              <button
                type="button"
                onClick={handleSendLiveInput}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Send input to running program (Enter)"
              >
                <Send className="w-3 h-3" />
                <span>Send</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleStopExecution}
              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Stop / Interrupt command (Ctrl+C)"
            >
              <Square className="w-3 h-3 fill-white" />
              <span>Stop (Ctrl+C)</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!currentInput.trim()}
            className="p-1 px-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 text-xs flex items-center gap-1 transition-colors shrink-0"
            title="Execute command (Enter)"
          >
            <CornerDownLeft className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
