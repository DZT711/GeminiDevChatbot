import React, { useState, useMemo } from 'react';
import { Bot, User, ArrowLeftRight, Clock, Hash } from 'lucide-react';
import type { FileProvenanceRecord } from '../../services/workspaceService.js';

interface DiffViewerProps {
  filePath: string;
  previousContent: string;
  currentContent: string;
  lastRecord?: FileProvenanceRecord;
  onClose?: () => void;
  theme?: 'light' | 'dark';
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  filePath,
  previousContent,
  currentContent,
  lastRecord,
  onClose,
  theme = 'dark'
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('unified');

  // Simple line-by-line diff algorithm
  const diffLines: DiffLine[] = useMemo(() => {
    const oldLines = previousContent.split('\n');
    const newLines = currentContent.split('\n');
    const lines: DiffLine[] = [];

    let oldIdx = 0;
    let newIdx = 0;

    while (oldIdx < oldLines.length || newIdx < newLines.length) {
      if (oldIdx < oldLines.length && newIdx < newLines.length) {
        if (oldLines[oldIdx] === newLines[newIdx]) {
          lines.push({
            type: 'unchanged',
            oldLineNumber: oldIdx + 1,
            newLineNumber: newIdx + 1,
            content: oldLines[oldIdx]
          });
          oldIdx++;
          newIdx++;
        } else {
          // Look ahead to see if removed or added
          lines.push({
            type: 'removed',
            oldLineNumber: oldIdx + 1,
            content: oldLines[oldIdx]
          });
          oldIdx++;
          lines.push({
            type: 'added',
            newLineNumber: newIdx + 1,
            content: newLines[newIdx]
          });
          newIdx++;
        }
      } else if (oldIdx < oldLines.length) {
        lines.push({
          type: 'removed',
          oldLineNumber: oldIdx + 1,
          content: oldLines[oldIdx]
        });
        oldIdx++;
      } else if (newIdx < newLines.length) {
        lines.push({
          type: 'added',
          newLineNumber: newIdx + 1,
          content: newLines[newIdx]
        });
        newIdx++;
      }
    }

    return lines;
  }, [previousContent, currentContent]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const line of diffLines) {
      if (line.type === 'added') added++;
      if (line.type === 'removed') removed++;
    }
    return { added, removed };
  }, [diffLines]);

  const isDark = theme === 'dark';

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-zinc-950 text-zinc-200' : 'bg-slate-50 text-slate-800'}`}>
      {/* Header */}
      <div className={`p-3 border-b flex items-center justify-between ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-semibold">{filePath}</span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-emerald-400 font-mono">+{stats.added}</span>
            <span className="text-rose-400 font-mono">-{stats.removed}</span>
          </div>

          {lastRecord && (
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span
                className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] font-medium ${
                  lastRecord.actor === 'AGENT'
                    ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                    : 'bg-sky-950/80 text-sky-300 border border-sky-800'
                }`}
              >
                {lastRecord.actor === 'AGENT' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                {lastRecord.actor}
              </span>
              {lastRecord.taskId && (
                <span className="flex items-center gap-0.5 font-mono text-[10px]">
                  <Hash className="w-2.5 h-2.5" />
                  {lastRecord.taskId}
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px]">
                <Clock className="w-2.5 h-2.5" />
                {new Date(lastRecord.timestamp).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded border border-zinc-700 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              className={`px-2 py-1 ${viewMode === 'unified' ? 'bg-indigo-600 text-white' : 'bg-transparent text-zinc-400 hover:text-zinc-200'}`}
            >
              Unified
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 ${viewMode === 'split' ? 'bg-indigo-600 text-white' : 'bg-transparent text-zinc-400 hover:text-zinc-200'}`}
            >
              Split
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            >
              Close Diff
            </button>
          )}
        </div>
      </div>

      {/* Diff Content View */}
      <div className="flex-1 overflow-auto font-mono text-xs p-2">
        {viewMode === 'unified' ? (
          <div className="space-y-0.5">
            {diffLines.map((line, idx) => {
              let bgClass = 'hover:bg-zinc-900/30';
              let textClass = isDark ? 'text-zinc-300' : 'text-slate-700';
              let prefix = ' ';

              if (line.type === 'added') {
                bgClass = isDark ? 'bg-emerald-950/40 text-emerald-300' : 'bg-emerald-50 text-emerald-800';
                textClass = isDark ? 'text-emerald-300' : 'text-emerald-800';
                prefix = '+';
              } else if (line.type === 'removed') {
                bgClass = isDark ? 'bg-rose-950/40 text-rose-300' : 'bg-rose-50 text-rose-800';
                textClass = isDark ? 'text-rose-300' : 'text-rose-800';
                prefix = '-';
              }

              return (
                <div key={idx} className={`flex items-start px-2 py-0.5 rounded-sm ${bgClass}`}>
                  <span className="w-8 select-none text-right pr-2 text-zinc-600">
                    {line.oldLineNumber || ''}
                  </span>
                  <span className="w-8 select-none text-right pr-3 text-zinc-600">
                    {line.newLineNumber || ''}
                  </span>
                  <span className="select-none font-bold w-4 text-center">{prefix}</span>
                  <pre className={`flex-1 whitespace-pre-wrap ${textClass}`}>{line.content || ' '}</pre>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 h-full">
            {/* Left: Previous */}
            <div className={`p-2 rounded border overflow-auto ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-slate-200 bg-white'}`}>
              <div className="text-[11px] font-semibold text-rose-400 mb-2 pb-1 border-b border-zinc-800">
                Original Version
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed">
                {previousContent || '<Empty File>'}
              </pre>
            </div>

            {/* Right: Current */}
            <div className={`p-2 rounded border overflow-auto ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-slate-200 bg-white'}`}>
              <div className="text-[11px] font-semibold text-emerald-400 mb-2 pb-1 border-b border-zinc-800">
                Current Version (Agent/User Modified)
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed">
                {currentContent || '<Empty File>'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
