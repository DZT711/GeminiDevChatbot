import React, { useState } from 'react';
import {
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  FileCode2,
  ExternalLink
} from 'lucide-react';
import type { ChangeSet, FileChange } from '../../../agent/changes/ChangeSetTypes.js';

export interface SimplifiedChangeRecordProps {
  changeSet: ChangeSet;
  onOpenFile?: (filePath: string) => void;
  onUndo?: (changeSet: ChangeSet) => void;
  onApply?: (changeSetId: string) => void;
  onReject?: (changeSetId: string) => void;
  theme?: 'light' | 'dark';
}

export const SimplifiedChangeRecord: React.FC<SimplifiedChangeRecordProps> = ({
  changeSet,
  onOpenFile,
  onUndo,
  onApply,
  onReject,
  theme = 'dark'
}) => {
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(
    changeSet.files.length > 0 ? changeSet.files[0].path : null
  );

  const isDark = theme === 'dark';
  const fileCount = changeSet.files.length;
  const isApplied = changeSet.status === 'APPLIED';
  const isRejected = changeSet.status === 'REJECTED';
  const isProposed = changeSet.status === 'PROPOSED' || (!isApplied && !isRejected);

  const totalAdditions = changeSet.files.reduce((sum, f) => sum + (f.additions || 0), 0);
  const totalDeletions = changeSet.files.reduce((sum, f) => sum + (f.deletions || 0), 0);

  const selectedFile =
    changeSet.files.find((f) => f.path === selectedFilePath) || changeSet.files[0];

  const handleFileClick = (file: FileChange) => {
    setSelectedFilePath(file.path);
    if (onOpenFile) {
      onOpenFile(file.path);
    }
  };

  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUndo) {
      onUndo(changeSet);
    } else if (onReject) {
      onReject(changeSet.changeSetId);
    }
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onApply) {
      onApply(changeSet.changeSetId);
    }
  };

  return (
    <div
      className={`my-2 w-full rounded-xl border p-3 text-xs transition-all shadow-sm select-text ${
        isDark
          ? 'bg-zinc-950/80 border-zinc-800/80 text-zinc-200'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Top Header Row (Matching Image 3) */}
      <div className="flex items-center justify-between gap-3 mb-2.5 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-300 shrink-0">
            <FileCode2 className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="min-w-0">
            <div className="font-semibold text-xs text-zinc-200 flex items-center gap-1.5 truncate">
              <span>
                {isRejected
                  ? `Rejected ${fileCount} ${fileCount === 1 ? 'file' : 'files'}`
                  : `Edited ${fileCount} ${fileCount === 1 ? 'file' : 'files'}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium mt-0.5">
              <span className="text-emerald-400">+{totalAdditions}</span>
              <span className="text-rose-400">-{totalDeletions}</span>
              {isApplied && (
                <span className="text-[10px] text-zinc-500 font-sans ml-1">applied</span>
              )}
              {isRejected && (
                <span className="text-[10px] text-zinc-500 font-sans ml-1">reverted</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons: Undo / Apply / Review */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Undo Button */}
          {!isRejected && (onUndo || onReject) && (
            <button
              type="button"
              onClick={handleUndo}
              className="flex items-center gap-1 px-2 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer text-xs font-medium"
              title="Undo and revert these changes"
            >
              <span>Undo</span>
              <RotateCcw className="w-3 h-3" />
            </button>
          )}

          {/* Apply Button (if proposed) */}
          {isProposed && onApply && (
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 hover:text-emerald-100 border border-emerald-500/40 transition-colors cursor-pointer text-xs font-medium"
              title="Apply these changes to workspace"
            >
              <Check className="w-3 h-3" />
              <span>Apply</span>
            </button>
          )}

          {/* Review Button (Image 3) */}
          <button
            type="button"
            onClick={() => setIsReviewOpen(!isReviewOpen)}
            className="flex items-center gap-1 px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer border border-zinc-700/60"
            title={isReviewOpen ? 'Hide diff review' : 'Review file diffs'}
          >
            <span>Review</span>
            {isReviewOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Subtle Divider */}
      <div className="border-t border-zinc-800/60 my-2" />

      {/* File List (Matching Image 3) */}
      <div className="space-y-1">
        {changeSet.files.map((file) => {
          const isSelected = selectedFile?.path === file.path;
          return (
            <div
              key={file.path}
              onClick={() => handleFileClick(file)}
              className={`flex items-center justify-between py-1 px-1.5 rounded transition-colors cursor-pointer group ${
                isDark ? 'hover:bg-zinc-900/60' : 'hover:bg-slate-100'
              } ${isSelected && isReviewOpen ? (isDark ? 'bg-zinc-900/70' : 'bg-slate-100') : ''}`}
            >
              {/* File Path */}
              <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                <span className="font-mono text-zinc-300 group-hover:text-indigo-300 text-[11px] truncate">
                  {file.path}
                </span>
                {file.operation && file.operation !== 'MODIFY' && (
                  <span
                    className={`text-[9px] font-bold px-1 rounded uppercase shrink-0 ${
                      file.operation === 'CREATE'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                        : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                    }`}
                  >
                    {file.operation}
                  </span>
                )}
              </div>

              {/* +add -del stats */}
              <div className="flex items-center gap-2 font-mono text-[11px] shrink-0 select-none">
                <span className="text-emerald-400 font-medium">+{file.additions || 0}</span>
                <span className="text-rose-400 font-medium">-{file.deletions || 0}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Diff Preview (Matching Image 4 - Codex Diff) */}
      {isReviewOpen && selectedFile && (
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden text-[10px] font-mono select-text shadow-inner">
          <div className="px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-zinc-300 flex items-center justify-between">
            <span className="truncate font-semibold text-indigo-300">{selectedFile.path}</span>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="text-emerald-400">+{selectedFile.additions || 0}</span>
              <span className="text-rose-400">-{selectedFile.deletions || 0}</span>
              {onOpenFile && (
                <button
                  type="button"
                  onClick={() => onOpenFile(selectedFile.path)}
                  className="p-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors ml-1 cursor-pointer"
                  title="Open in Workspace Editor"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto p-2 leading-relaxed">
            {selectedFile.diff ? (
              selectedFile.diff.split('\n').map((line, idx) => {
                const isAdd = line.startsWith('+') && !line.startsWith('+++');
                const isDel = line.startsWith('-') && !line.startsWith('---');
                const isHeader =
                  line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++');
                return (
                  <div
                    key={idx}
                    className={`whitespace-pre-wrap break-all ${
                      isAdd
                        ? 'text-emerald-300 bg-emerald-950/40 px-1 rounded-sm'
                        : isDel
                        ? 'text-rose-300 bg-rose-950/40 px-1 rounded-sm'
                        : isHeader
                        ? 'text-indigo-400 opacity-80'
                        : 'text-zinc-400'
                    }`}
                  >
                    {line}
                  </div>
                );
              })
            ) : (
              <div className="text-zinc-500 italic p-1">No diff content recorded for this file.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
