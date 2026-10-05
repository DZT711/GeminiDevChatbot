import React, { useState } from 'react';
import {
  Check,
  X,
  FileCode,
  Plus,
  Minus,
  AlertTriangle,
  GitCommit,
  ChevronDown,
  ChevronRight,
  Eye,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import type { ChangeSet, FileChange } from '../../../agent/changes/ChangeSetTypes.js';

export interface ChangeSetReviewProps {
  changeSet: ChangeSet;
  onApply: (changeSetId: string) => Promise<void>;
  onReject: (changeSetId: string) => Promise<void>;
  onOpenFileDiff?: (file: FileChange) => void;
  isApplying?: boolean;
  isRejecting?: boolean;
  theme?: 'light' | 'dark';
}

export const ChangeSetReview: React.FC<ChangeSetReviewProps> = ({
  changeSet,
  onApply,
  onReject,
  onOpenFileDiff,
  isApplying = false,
  isRejecting = false,
  theme = 'dark'
}) => {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(
    changeSet.files.length > 0 ? changeSet.files[0].path : null
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const isDark = theme === 'dark';
  const isConflict = changeSet.status === 'CONFLICT';
  const isTerminal = changeSet.status === 'APPLIED' || changeSet.status === 'REJECTED';

  const totalAdditions = changeSet.files.reduce((sum, f) => sum + (f.additions || 0), 0);
  const totalDeletions = changeSet.files.reduce((sum, f) => sum + (f.deletions || 0), 0);

  const selectedFile = changeSet.files.find((f) => f.path === selectedFilePath) || changeSet.files[0];

  const handleApply = async () => {
    try {
      setActionError(null);
      await onApply(changeSet.changeSetId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
    }
  };

  const handleReject = async () => {
    try {
      setActionError(null);
      await onReject(changeSet.changeSetId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
    }
  };

  const getStatusBadge = () => {
    switch (changeSet.status) {
      case 'APPLIED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-400" /> APPLIED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1">
            <X className="w-3 h-3 text-zinc-400" /> REJECTED
          </span>
        );
      case 'CONFLICT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800/60 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-400" /> CONFLICT
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60 flex items-center gap-1">
            <GitCommit className="w-3 h-3 text-amber-400" /> PROPOSED
          </span>
        );
    }
  };

  return (
    <div
      className={`rounded-lg border my-2 overflow-hidden transition-all shadow-sm ${
        isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-slate-50 border-slate-200'
      }`}
    >
      {/* Header */}
      <div
        className={`px-3 py-2 flex items-center justify-between border-b cursor-pointer select-none ${
          isDark ? 'border-zinc-800/80 bg-zinc-900' : 'border-slate-200 bg-white'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <GitCommit className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-zinc-200">
                ChangeSet ({changeSet.files.length} {changeSet.files.length === 1 ? 'file' : 'files'})
              </span>
              {getStatusBadge()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-emerald-400 flex items-center">
            <Plus className="w-3 h-3 mr-0.5" />
            {totalAdditions}
          </span>
          <span className="text-rose-400 flex items-center">
            <Minus className="w-3 h-3 mr-0.5" />
            {totalDeletions}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col">
          {/* Conflict Alert Banner if applicable */}
          {isConflict && changeSet.conflictReason && (
            <div className="p-2.5 bg-rose-950/40 border-b border-rose-900/50 flex items-start gap-2 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Conflict Detected:</span>{' '}
                <span>{changeSet.conflictReason}</span>
              </div>
            </div>
          )}

          {/* Action error banner if applicable */}
          {actionError && (
            <div className="p-2.5 bg-rose-950/40 border-b border-rose-900/50 flex items-start gap-2 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Operation Error:</span>{' '}
                <span>{actionError}</span>
              </div>
            </div>
          )}

          {/* File list */}
          <div className="p-2 space-y-1 max-h-48 overflow-y-auto border-b border-zinc-800/60">
            {changeSet.files.map((file) => {
              const isSelected = selectedFile?.path === file.path;
              return (
                <div
                  key={file.path}
                  onClick={() => setSelectedFilePath(file.path)}
                  className={`px-2.5 py-1.5 rounded text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isSelected
                      ? isDark
                        ? 'bg-indigo-950/50 text-indigo-200 border border-indigo-800/50'
                        : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                      : isDark
                      ? 'text-zinc-300 hover:bg-zinc-800/50'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <FileCode className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="font-mono text-[11px] truncate">{file.path}</span>
                    <span
                      className={`px-1 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 ${
                        file.operation === 'CREATE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                          : file.operation === 'DELETE'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                          : 'bg-amber-950 text-amber-400 border border-amber-800/50'
                      }`}
                    >
                      {file.operation}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
                    <span className="text-emerald-400">+{file.additions || 0}</span>
                    <span className="text-rose-400">-{file.deletions || 0}</span>
                    {onOpenFileDiff && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenFileDiff(file);
                        }}
                        className="p-1 hover:text-indigo-300 text-zinc-400 transition-colors"
                        title="View Full Diff"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Diff Preview of selected file */}
          {selectedFile && selectedFile.diff && (
            <div className="max-h-48 overflow-y-auto font-mono text-[10px] p-2 bg-zinc-950/80 border-b border-zinc-800/60 leading-relaxed select-text">
              {selectedFile.diff.split('\n').map((line, idx) => {
                const isAdd = line.startsWith('+') && !line.startsWith('+++');
                const isDel = line.startsWith('-') && !line.startsWith('---');
                const isHeader = line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++');
                return (
                  <div
                    key={idx}
                    className={`whitespace-pre-wrap break-all ${
                      isAdd
                        ? 'text-emerald-300 bg-emerald-950/30 px-1 rounded-sm'
                        : isDel
                        ? 'text-rose-300 bg-rose-950/30 px-1 rounded-sm'
                        : isHeader
                        ? 'text-indigo-400 opacity-80'
                        : 'text-zinc-400'
                    }`}
                  >
                    {line}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Bar */}
          {!isTerminal && (
            <div
              className={`p-2.5 flex items-center justify-between gap-2 select-none ${
                isDark ? 'bg-zinc-900/60' : 'bg-slate-100'
              }`}
            >
              <button
                type="button"
                onClick={handleReject}
                disabled={isRejecting || isApplying}
                className="px-3 py-1.5 rounded text-xs font-semibold text-rose-300 hover:bg-rose-950/50 border border-rose-800/60 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRejecting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                Reject Changes
              </button>

              <button
                type="button"
                onClick={handleApply}
                disabled={isRejecting || isApplying || isConflict}
                className="px-3.5 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplying ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Apply Changes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
