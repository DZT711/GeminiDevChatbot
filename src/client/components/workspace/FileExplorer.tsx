import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  FileCode,
  FileText,
  FileJson,
  FilePlus,
  RefreshCw,
  Trash2,
  Search,
  Bot,
  User,
  ChevronRight,
  ChevronDown,
  Pencil,
  Check,
  X
} from 'lucide-react';
import type { WorkspaceDirectoryEntry } from '../../services/workspaceService.js';

interface FileExplorerProps {
  entries: WorkspaceDirectoryEntry[];
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => Promise<void>;
  onCreateDirectory?: (path: string) => Promise<void>;
  onRenameFile?: (oldPath: string, newPath: string) => Promise<void>;
  onDeleteFile: (path: string) => Promise<void>;
  onDeleteDirectory?: (path: string) => Promise<void>;
  onRefresh: () => void;
  isLoading?: boolean;
  theme?: 'light' | 'dark';
}

interface FlattenedTreeItem {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  depth: number;
  parentPath: string;
  lastActor?: 'USER' | 'AGENT';
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  entries,
  activeFilePath,
  onSelectFile,
  onCreateFile,
  onCreateDirectory,
  onRenameFile,
  onDeleteFile,
  onDeleteDirectory,
  onRefresh,
  isLoading = false,
  theme = 'dark'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/', 'src']));
  const [creationMode, setCreationMode] = useState<{ type: 'file' | 'folder'; targetDir: string } | null>(null);
  const [creationName, setCreationName] = useState('');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');
  const [deletingItem, setDeletingItem] = useState<{ path: string; isDirectory: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFileIcon = (filePath: string, isDirectory: boolean, isExpanded: boolean) => {
    if (isDirectory) {
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
      ) : (
        <Folder className="w-4 h-4 text-amber-400 shrink-0" />
      );
    }
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        return <FileCode className="w-4 h-4 text-sky-400 shrink-0" />;
      case 'json':
        return <FileJson className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'md':
      case 'txt':
        return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
      default:
        return <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />;
    }
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  // Build tree from flat entries and compute nested depths
  const flattenedItems = useMemo(() => {
    const ignored = ['__pycache__', '.pyc', '.pyo', '.pyd', '.git', '.DS_Store', '.npm', '.cache', '.local', '.config', 'node_modules'];
    const itemMap = new Map<string, FlattenedTreeItem>();
    const allDirectories = new Set<string>();

    for (const e of entries || []) {
      if (!e || !e.path) continue;
      const rawPath = e.path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
      if (!rawPath) continue;

      const parts = rawPath.split('/');
      if (parts.some((p) => ignored.includes(p) || p.startsWith('.'))) {
        continue;
      }

      // Add all intermediate folders
      let currentParent = '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        const currentPath = currentParent ? `${currentParent}/${part}` : part;
        const isDir = isLast ? e.isDirectory : true;

        if (isDir) {
          allDirectories.add(currentPath);
        }

        if (!itemMap.has(currentPath)) {
          itemMap.set(currentPath, {
            id: currentPath,
            name: part,
            path: currentPath,
            isDirectory: isDir,
            depth: i,
            parentPath: currentParent,
            lastActor: isLast ? e.lastActor : undefined
          });
        } else if (isLast && !e.isDirectory) {
          // If was previously registered as directory from prefix, refine
          const existing = itemMap.get(currentPath)!;
          existing.isDirectory = false;
          existing.lastActor = e.lastActor;
        }

        currentParent = currentPath;
      }
    }

    const items = Array.from(itemMap.values());

    // Sort: folders first, then alphabetically
    items.sort((a, b) => {
      if (a.parentPath !== b.parentPath) {
        return a.parentPath.localeCompare(b.parentPath);
      }
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return items.filter(i => i.name.toLowerCase().includes(q) || i.path.toLowerCase().includes(q));
    }

    // Filter by expanded state
    return items.filter(item => {
      if (!item.parentPath) return true;
      // All ancestor folders must be expanded
      const ancestors = item.parentPath.split('/');
      let currentAncestor = '';
      for (const a of ancestors) {
        currentAncestor = currentAncestor ? `${currentAncestor}/${a}` : a;
        if (!expandedFolders.has(currentAncestor)) {
          return false;
        }
      }
      return true;
    });
  }, [entries, searchQuery, expandedFolders]);

  const handleStartCreate = (type: 'file' | 'folder', targetDir = '') => {
    setCreationMode({ type, targetDir });
    setCreationName('');
    setError(null);
    setRenamingPath(null);
    setDeletingItem(null);
    if (targetDir) {
      setExpandedFolders(prev => new Set(prev).add(targetDir));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = creationName.trim();
    if (!trimmed || !creationMode) return;

    const fullPath = creationMode.targetDir
      ? `${creationMode.targetDir}/${trimmed}`.replace(/\/+/g, '/')
      : trimmed;

    try {
      setIsSubmitting(true);
      setError(null);
      if (creationMode.type === 'folder') {
        if (onCreateDirectory) {
          await onCreateDirectory(fullPath);
        } else {
          await onCreateFile(`${fullPath}/.keep`);
        }
        setExpandedFolders(prev => new Set(prev).add(fullPath));
      } else {
        await onCreateFile(fullPath);
      }
      setCreationName('');
      setCreationMode(null);
    } catch (err: any) {
      setError(err.message || `Failed to create ${creationMode.type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartRename = (item: FlattenedTreeItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingPath(item.path);
    setRenamingValue(item.name);
    setDeletingItem(null);
    setCreationMode(null);
  };

  const handleRenameSubmit = async (oldPath: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = renamingValue.trim();
    if (!trimmed || trimmed === oldPath.split('/').pop()) {
      setRenamingPath(null);
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      const pathParts = oldPath.split('/');
      pathParts[pathParts.length - 1] = trimmed;
      const newPath = pathParts.join('/');
      if (onRenameFile) {
        await onRenameFile(oldPath, newPath);
      }
      setRenamingPath(null);
    } catch (err: any) {
      setError(err.message || 'Failed to rename');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deletingItem) return;
    try {
      setIsSubmitting(true);
      if (deletingItem.isDirectory && onDeleteDirectory) {
        await onDeleteDirectory(deletingItem.path);
      } else {
        await onDeleteFile(deletingItem.path);
      }
      setDeletingItem(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`h-full flex flex-col select-none border-r ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}
    >
      {/* Header with File + Folder Actions */}
      <div className={`p-3 border-b flex items-center justify-between ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Workspace</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleStartCreate('file')}
            className={`p-1.5 rounded transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title="New File at Root"
          >
            <FilePlus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleStartCreate('folder')}
            className={`p-1.5 rounded transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title="New Folder at Root"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className={`p-1.5 rounded transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
            } ${isLoading ? 'animate-spin' : ''}`}
            title="Refresh Files & Folders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-inherit">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search workspace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-8 pr-2.5 py-1.5 text-xs rounded-md border outline-none transition-all ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 focus:border-indigo-500 text-zinc-200'
                : 'bg-white border-slate-300 focus:border-indigo-500 text-slate-900'
            }`}
          />
        </div>
      </div>

      {/* Inline Creation Banner */}
      {creationMode && (
        <form onSubmit={handleCreateSubmit} className="p-2 border-b border-inherit bg-indigo-500/10">
          <div className="text-[11px] font-medium text-indigo-400 mb-1">
            New {creationMode.type === 'folder' ? 'Folder' : 'File'}
            {creationMode.targetDir ? ` in /${creationMode.targetDir}` : ''}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              autoFocus
              placeholder={creationMode.type === 'folder' ? 'folder_name' : 'filename.ts'}
              value={creationName}
              onChange={(e) => setCreationName(e.target.value)}
              className={`flex-1 px-2 py-1 text-xs rounded border outline-none ${
                isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-black'
              }`}
            />
            <button
              type="submit"
              disabled={isSubmitting || !creationName.trim()}
              className="px-2 py-1 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setCreationMode(null);
                setError(null);
              }}
              className="px-2 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
          {error && <div className="text-[10px] text-rose-400 mt-1">{error}</div>}
        </form>
      )}

      {/* Hierarchical Tree List */}
      <div className="flex-1 overflow-y-auto p-1 text-xs space-y-0.5">
        {flattenedItems.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-xs">
            {searchQuery ? 'No matching items' : 'Workspace is empty'}
          </div>
        ) : (
          flattenedItems.map((item) => {
            const isActive = activeFilePath === item.path || (activeFilePath && activeFilePath.replace(/^\//, '') === item.path);
            const isFolder = item.isDirectory;
            const isExpanded = expandedFolders.has(item.path);
            const isRenaming = renamingPath === item.path;
            const isDeleting = deletingItem?.path === item.path;
            const indentPadding = Math.min(item.depth * 14 + 6, 80);

            if (isRenaming) {
              return (
                <form
                  key={item.id}
                  onSubmit={(e) => handleRenameSubmit(item.path, e)}
                  style={{ paddingLeft: `${indentPadding}px` }}
                  className="flex items-center gap-1 pr-1.5 py-1 rounded bg-indigo-950/40 border border-indigo-500/30"
                  onClick={(e) => e.stopPropagation()}
                >
                  {getFileIcon(item.path, isFolder, isExpanded)}
                  <input
                    type="text"
                    autoFocus
                    value={renamingValue}
                    onChange={(e) => setRenamingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setRenamingPath(null);
                    }}
                    className={`flex-1 px-1.5 py-0.5 text-xs rounded border outline-none ${
                      isDark ? 'bg-zinc-900 border-indigo-500/50 text-zinc-100' : 'bg-white border-indigo-400 text-slate-900'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !renamingValue.trim()}
                    className="p-1 rounded text-emerald-400 hover:bg-emerald-950/40"
                    title="Confirm"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenamingPath(null)}
                    className="p-1 rounded text-zinc-400 hover:bg-zinc-800"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              );
            }

            return (
              <div
                key={item.id}
                style={{ paddingLeft: `${indentPadding}px` }}
                className={`group flex items-center justify-between pr-2 py-1 rounded cursor-pointer transition-colors ${
                  isActive
                    ? isDark
                      ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                      : 'bg-indigo-50 text-indigo-700 font-medium'
                    : isDark
                    ? 'hover:bg-zinc-900 text-zinc-300 hover:text-zinc-100'
                    : 'hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                }`}
                onClick={() => {
                  if (isFolder) {
                    toggleFolder(item.path);
                  } else {
                    onSelectFile(item.path);
                  }
                }}
              >
                <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                  {isFolder ? (
                    <span className="text-zinc-500 hover:text-zinc-300 shrink-0">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  {getFileIcon(item.path, isFolder, isExpanded)}
                  <span className="truncate">{item.name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Actor Badge */}
                  {item.lastActor && !isFolder && !isDeleting && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                        item.lastActor === 'AGENT'
                          ? 'bg-purple-950/60 text-purple-300 border border-purple-800/40'
                          : 'bg-sky-950/60 text-sky-300 border border-sky-800/40'
                      }`}
                      title={`Last modified by ${item.lastActor}`}
                    >
                      {item.lastActor === 'AGENT' ? <Bot className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                      {item.lastActor}
                    </span>
                  )}

                  {/* Inline Delete Confirmation or Action Buttons */}
                  {isDeleting ? (
                    <div
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800/60 text-[10px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-rose-300 font-medium">Delete {isFolder ? 'folder' : 'file'}?</span>
                      <button
                        type="button"
                        onClick={handleDeleteConfirm}
                        className="p-0.5 rounded text-rose-300 hover:text-white hover:bg-rose-800/50"
                        title="Yes, Delete"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingItem(null);
                        }}
                        className="p-0.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Folder contextual creation actions */}
                      {isFolder && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartCreate('file', item.path);
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-sky-300 hover:bg-sky-950/40 transition-colors"
                            title={`New File inside ${item.name}`}
                          >
                            <FilePlus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartCreate('folder', item.path);
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-amber-300 hover:bg-amber-950/40 transition-colors"
                            title={`New Subfolder inside ${item.name}`}
                          >
                            <FolderPlus className="w-3 h-3" />
                          </button>
                        </>
                      )}

                      {/* Rename Action */}
                      {onRenameFile && (
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(item, e)}
                          className="p-1 rounded text-zinc-400 hover:text-indigo-300 hover:bg-indigo-950/40 transition-colors"
                          title={isFolder ? 'Rename Folder' : 'Rename File'}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}

                      {/* Delete Action */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingItem({ path: item.path, isDirectory: isFolder });
                          setRenamingPath(null);
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        title={isFolder ? 'Delete Folder' : 'Delete File'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
