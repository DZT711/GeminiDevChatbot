import React from 'react';
import { Bot, User, Clock, Hash, FileCode, History } from 'lucide-react';
import type { FileProvenanceRecord } from '../../services/workspaceService.js';

interface AuditLogViewerProps {
  logs: FileProvenanceRecord[];
  onSelectFileDiff?: (filePath: string, record: FileProvenanceRecord) => void;
  theme?: 'light' | 'dark';
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  logs,
  onSelectFileDiff,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  if (logs.length === 0) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-6 text-center select-none ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
        <History className="w-10 h-10 mb-2 opacity-30 text-indigo-400" />
        <h4 className="text-xs font-semibold text-zinc-300 mb-1">No File Changes Recorded</h4>
        <p className="text-xs max-w-sm text-zinc-500">
          Modifications made by you or the Agent will appear in this audit log with full provenance tracking.
        </p>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col font-mono text-xs ${isDark ? 'bg-zinc-950 text-zinc-200' : 'bg-slate-50 text-slate-800'}`}>
      {/* Header */}
      <div className={`p-3 border-b flex items-center justify-between ${isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-xs text-zinc-200">File Mutation Audit Log</span>
        </div>
        <span className="text-[11px] text-zinc-500">{logs.length} revision(s)</span>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {logs
          .slice()
          .reverse()
          .map((record) => {
            const isAgent = record.actor === 'AGENT';
            return (
              <div
                key={record.id}
                className={`p-2.5 rounded border flex items-center justify-between gap-4 transition-colors ${
                  isDark ? 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60' : 'border-slate-200 bg-white hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 truncate flex-1 min-w-0">
                  {/* Actor Badge */}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 shrink-0 ${
                      isAgent
                        ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                        : 'bg-sky-950 text-sky-300 border border-sky-800/60'
                    }`}
                  >
                    {isAgent ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {record.actor}
                  </span>

                  {/* Action Pill */}
                  <span
                    className={`text-[10px] px-1 py-0.2 uppercase font-bold rounded ${
                      record.action === 'create'
                        ? 'bg-emerald-950/60 text-emerald-400'
                        : record.action === 'edit'
                        ? 'bg-amber-950/60 text-amber-400'
                        : 'bg-rose-950/60 text-rose-400'
                    }`}
                  >
                    {record.action}
                  </span>

                  {/* Path */}
                  <span className="font-semibold text-zinc-200 truncate">{record.path}</span>

                  {/* Task ID if present */}
                  {record.taskId && (
                    <span className="text-[10px] text-zinc-500 flex items-center gap-0.5 font-mono">
                      <Hash className="w-2.5 h-2.5" />
                      {record.taskId}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 text-zinc-500 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(record.timestamp).toLocaleTimeString()}
                  </span>

                  {onSelectFileDiff && record.action !== 'delete' && (
                    <button
                      type="button"
                      onClick={() => onSelectFileDiff(record.path, record)}
                      className="px-2 py-0.5 rounded border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 text-[10px] transition-colors"
                    >
                      View Diff
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
