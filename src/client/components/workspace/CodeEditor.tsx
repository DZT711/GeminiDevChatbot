import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Save,
  FileCode,
  X,
  Bot,
  User,
  GitCompare,
  RotateCcw,
  Copy,
  Check,
  Code,
  Play
} from 'lucide-react';
import { DiffViewer } from './DiffViewer.js';
import type { WorkspaceFileMeta, FileProvenanceRecord } from '../../services/workspaceService.js';

interface CodeEditorProps {
  activeFile: WorkspaceFileMeta | null;
  openFiles: WorkspaceFileMeta[];
  onSelectFile: (path: string) => void;
  onCloseFile: (path: string) => void;
  onSaveFile: (path: string, content: string) => Promise<void>;
  onRunCode?: (file: WorkspaceFileMeta) => void;
  theme?: 'light' | 'dark';
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  activeFile,
  openFiles,
  onSelectFile,
  onCloseFile,
  onSaveFile,
  onRunCode,
  theme = 'dark'
}) => {
  const [content, setContent] = useState<string>('');
  const [initialContent, setInitialContent] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showDiff, setShowDiff] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync content when active file changes
  useEffect(() => {
    if (activeFile) {
      setContent(activeFile.content);
      setInitialContent(activeFile.content);
      setIsDirty(false);
      setShowDiff(false);
    } else {
      setContent('');
      setInitialContent('');
      setIsDirty(false);
      setShowDiff(false);
    }
  }, [activeFile?.path, activeFile?.modifiedAt]);

  const handleContentChange = (newVal: string) => {
    setContent(newVal);
    setIsDirty(newVal !== initialContent);
  };

  const handleSave = async () => {
    if (!activeFile || isSaving) return;
    try {
      setIsSaving(true);
      await onSaveFile(activeFile.path, content);
      setInitialContent(content);
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to save file', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async () => {
    if (!activeFile) return;
    if (isDirty) {
      await handleSave();
    }
    if (onRunCode) {
      onRunCode({ ...activeFile, content });
    }
  };

  // Keyboard shortcut Ctrl+S / Cmd+S and Ctrl+Enter / Cmd+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, content, isSaving, isDirty, onRunCode]);

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDark = theme === 'dark';

  const uniqueOpenFiles = useMemo(() => {
    const seen = new Set<string>();
    const result: WorkspaceFileMeta[] = [];
    for (const f of openFiles || []) {
      if (!f || !f.path) continue;
      const norm = f.path.replace(/\/+/g, '/');
      if (!seen.has(norm)) {
        seen.add(norm);
        result.push({ ...f, path: norm });
      }
    }
    return result;
  }, [openFiles]);

  if (!activeFile) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-8 text-center select-none ${isDark ? 'bg-zinc-950 text-zinc-500' : 'bg-slate-50 text-slate-400'}`}>
        <Code className="w-12 h-12 mb-3 opacity-30 text-indigo-400" />
        <h3 className="text-sm font-medium text-zinc-300 mb-1">No File Selected</h3>
        <p className="text-xs max-w-sm text-zinc-500">
          Select a file from the explorer on the left or create a new file to start viewing and editing.
        </p>
      </div>
    );
  }

  const lines = content.split('\n');
  const lastRecord: FileProvenanceRecord | undefined = activeFile.history?.[activeFile.history.length - 1];

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-zinc-950 text-zinc-200' : 'bg-white text-slate-800'}`}>
      {/* Tab bar */}
      <div className={`flex items-center overflow-x-auto border-b ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-100 border-slate-200'}`}>
        {uniqueOpenFiles.map((file) => {
          const isActive = file.path === activeFile.path || file.path.replace(/\/+/g, '/') === activeFile.path.replace(/\/+/g, '/');
          return (
            <div
              key={file.path}
              onClick={() => onSelectFile(file.path)}
              className={`group flex items-center gap-2 px-3 py-2 text-xs border-r cursor-pointer transition-colors ${
                isActive
                  ? isDark
                    ? 'bg-zinc-950 text-indigo-300 font-medium border-b-2 border-b-indigo-500 border-r-zinc-800'
                    : 'bg-white text-indigo-700 font-medium border-b-2 border-b-indigo-500 border-r-slate-200'
                  : isDark
                  ? 'hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-r-zinc-800'
                  : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-r-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{file.name}</span>
              {isActive && isDirty && <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseFile(file.path);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Editor Sub-Header & Metadata Bar */}
      <div className={`px-3 py-2 border-b flex items-center justify-between text-xs ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-center gap-3 truncate">
          <span className="font-mono text-zinc-400 truncate">{activeFile.path}</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-400 uppercase font-mono">
            {activeFile.language}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            {activeFile.size} bytes • {lines.length} lines
          </span>

          {/* Provenance Badge */}
          {activeFile.lastActor && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-medium ${
                activeFile.lastActor === 'AGENT'
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                  : 'bg-sky-950/80 text-sky-300 border border-sky-800/60'
              }`}
            >
              {activeFile.lastActor === 'AGENT' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
              Modified by {activeFile.lastActor}
              {activeFile.lastTaskId && ` (${activeFile.lastTaskId})`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Diff Toggle */}
          <button
            type="button"
            onClick={() => setShowDiff(!showDiff)}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 border transition-colors ${
              showDiff
                ? 'bg-indigo-600 text-white border-indigo-500'
                : isDark
                ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title="View File Revisions Diff"
          >
            <GitCompare className="w-3.5 h-3.5" />
            Diff
          </button>

          {/* Revert Unsaved */}
          {isDirty && (
            <button
              type="button"
              onClick={() => {
                setContent(initialContent);
                setIsDirty(false);
              }}
              className="px-2 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center gap-1"
              title="Discard Unsaved Edits"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Discard
            </button>
          )}

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            title="Copy Content"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all ${
              isDirty
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : isDirty ? 'Save (Ctrl+S)' : 'Saved'}
          </button>

          {/* Run Code Button */}
          {onRunCode && (
            <button
              type="button"
              onClick={handleRun}
              className="px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 shadow-sm bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-all active:scale-95"
              title="Run / Execute File (Ctrl+Enter)"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run (Ctrl+Enter)</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor or Diff View */}
      <div className="flex-1 relative overflow-hidden">
        {showDiff ? (
          <DiffViewer
            filePath={activeFile.path}
            previousContent={lastRecord?.previousContent ?? initialContent}
            currentContent={content}
            lastRecord={lastRecord}
            onClose={() => setShowDiff(false)}
            theme={theme}
          />
        ) : (
          <div className="h-full flex overflow-auto font-mono text-xs">
            {/* Line numbers gutter */}
            <div
              className={`select-none p-3 pr-4 text-right border-r flex flex-col font-mono text-[11px] leading-relaxed ${
                isDark ? 'bg-zinc-900/40 text-zinc-600 border-zinc-800/80' : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}
            >
              {lines.map((_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>

            {/* Editable Textarea */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              spellCheck={false}
              className={`flex-1 p-3 font-mono text-xs leading-relaxed outline-none resize-none overflow-auto whitespace-pre ${
                isDark
                  ? 'bg-zinc-950 text-zinc-100 caret-indigo-400 selection:bg-indigo-500/30'
                  : 'bg-white text-slate-900 caret-indigo-600 selection:bg-indigo-100'
              }`}
              placeholder="Type code here..."
              onKeyDown={(e) => {
                // Handle tab key indentation
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const target = e.currentTarget;
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const newContent = content.substring(0, start) + '  ' + content.substring(end);
                  handleContentChange(newContent);
                  setTimeout(() => {
                    target.selectionStart = target.selectionEnd = start + 2;
                  }, 0);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
