import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FolderCode,
  Terminal,
  Activity,
  History,
  RefreshCw,
  Plus,
  Server,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { FileExplorer } from './workspace/FileExplorer.js';
import { CodeEditor } from './workspace/CodeEditor.js';
import { AgentTimeline } from './workspace/AgentTimeline.js';
import { WorkspaceTerminal } from './workspace/WorkspaceTerminal.js';
import { AuditLogViewer } from './workspace/AuditLogViewer.js';
import { workspaceService } from '../services/workspaceService.js';
import type { 
  WorkspaceSummary, 
  WorkspaceDirectoryEntry, 
  WorkspaceFileMeta, 
  FileProvenanceRecord,
  PlanExecutionProgressEvent,
  CommandExecutionResult
} from '../services/workspaceService.js';
import type { GoalPlanningResult } from '../../server/services/agentIntegration/planning/GoalPlanningTypes.js';

interface WorkspaceTabProps {
  theme?: 'light' | 'dark';
  user?: any;
  currentPlanResult?: GoalPlanningResult | null;
}

export const WorkspaceTab: React.FC<WorkspaceTabProps> = ({
  theme = 'dark',
  user,
  currentPlanResult = null
}) => {
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [entries, setEntries] = useState<WorkspaceDirectoryEntry[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<WorkspaceFileMeta | null>(null);
  const [openFiles, setOpenFiles] = useState<WorkspaceFileMeta[]>([]);
  const [bottomTab, setBottomTab] = useState<'timeline' | 'terminal' | 'audit'>('timeline');
  const [planningResult, setPlanningResult] = useState<GoalPlanningResult | null>(currentPlanResult);
  const [executionEvents, setExecutionEvents] = useState<PlanExecutionProgressEvent[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<FileProvenanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  const eventSourceUnsub = useRef<(() => void) | null>(null);

  // Sync incoming planning result prop
  useEffect(() => {
    if (currentPlanResult) {
      setPlanningResult(currentPlanResult);
      setBottomTab('timeline');
    }
  }, [currentPlanResult]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccessNotification(message);
      setTimeout(() => setSuccessNotification(null), 3000);
    } else {
      setErrorNotification(message);
      setTimeout(() => setErrorNotification(null), 5000);
    }
  };

  const loadWorkspaceData = useCallback(async () => {
    try {
      setIsLoading(true);
      const wsData = await workspaceService.getActiveWorkspace();
      setWorkspace(wsData.workspace);

      const filesData = await workspaceService.listFiles(wsData.workspace.id);
      const seen = new Set<string>();
      const uniqueEntries: WorkspaceDirectoryEntry[] = [];
      const ignored = ['__pycache__', '.pyc', '.pyo', '.pyd', '.git', '.DS_Store'];

      for (const e of filesData.entries || []) {
        const norm = (e.path || '').replace(/\/+/g, '/');
        const name = e.name || norm.split('/').pop() || '';
        if (ignored.some((ig) => name.includes(ig) || norm.includes(ig))) {
          continue;
        }
        if (norm && !seen.has(norm)) {
          seen.add(norm);
          uniqueEntries.push({ ...e, path: norm });
        }
      }
      setEntries(uniqueEntries);

      const logs = await workspaceService.getAuditLogs(wsData.workspace.id);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('Failed to load workspace', err);
      showNotification('error', err.message || 'Failed to load workspace');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  const handleSelectFile = async (filePath: string) => {
    try {
      const normalizedPath = filePath.replace(/\/+/g, '/');
      setActiveFilePath(normalizedPath);
      const existing = openFiles.find((f) => f.path.replace(/\/+/g, '/') === normalizedPath);
      if (existing) {
        setActiveFile(existing);
      }

      const fileData = await workspaceService.readFile(normalizedPath, workspace?.id);
      setActiveFile(fileData);

      setOpenFiles((prev) => {
        const idx = prev.findIndex((f) => f.path.replace(/\/+/g, '/') === normalizedPath);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = fileData;
          return next;
        }
        return [...prev, fileData];
      });
    } catch (err: any) {
      console.error('Failed to read file', err);
      showNotification('error', `Cannot open file: ${err.message}`);
    }
  };

  const handleCloseFile = (filePath: string) => {
    const nextOpen = openFiles.filter((f) => f.path !== filePath);
    setOpenFiles(nextOpen);
    if (activeFilePath === filePath) {
      if (nextOpen.length > 0) {
        const nextActive = nextOpen[nextOpen.length - 1];
        setActiveFilePath(nextActive.path);
        setActiveFile(nextActive);
      } else {
        setActiveFilePath(null);
        setActiveFile(null);
      }
    }
  };

  const handleSaveFile = async (filePath: string, content: string) => {
    try {
      const saved = await workspaceService.writeFile(filePath, content, workspace?.id, 'USER');
      setActiveFile(saved);
      setOpenFiles((prev) => prev.map((f) => (f.path === filePath ? saved : f)));

      // Refresh file list and logs
      const filesData = await workspaceService.listFiles(workspace?.id);
      setEntries(filesData.entries);
      const logs = await workspaceService.getAuditLogs(workspace?.id);
      setAuditLogs(logs);

      showNotification('success', `Saved ${saved.name}`);
    } catch (err: any) {
      showNotification('error', `Failed to save: ${err.message}`);
      throw err;
    }
  };

  const handleCreateFile = async (filePath: string) => {
    try {
      const saved = await workspaceService.writeFile(filePath, '', workspace?.id, 'USER');
      const filesData = await workspaceService.listFiles(workspace?.id);
      setEntries(filesData.entries);
      handleSelectFile(saved.path);
      showNotification('success', `Created file ${filePath}`);
    } catch (err: any) {
      showNotification('error', `Failed to create file: ${err.message}`);
      throw err;
    }
  };

  const handleCreateDirectory = async (dirPath: string) => {
    try {
      await workspaceService.createDirectory(dirPath, workspace?.id);
      const filesData = await workspaceService.listFiles(workspace?.id);
      setEntries(filesData.entries);
      const logs = await workspaceService.getAuditLogs(workspace?.id);
      setAuditLogs(logs);
      showNotification('success', `Created directory ${dirPath}`);
    } catch (err: any) {
      showNotification('error', `Failed to create directory: ${err.message}`);
      throw err;
    }
  };

  const handleDeleteDirectory = async (dirPath: string) => {
    try {
      await workspaceService.deleteDirectory(dirPath, workspace?.id);
      // Close any open files inside this deleted folder
      const prefix = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
      const filesToClose = openFiles.filter((f) => f.path.startsWith(prefix) || f.path === dirPath);
      filesToClose.forEach((f) => handleCloseFile(f.path));

      const filesData = await workspaceService.listFiles(workspace?.id);
      setEntries(filesData.entries);
      const logs = await workspaceService.getAuditLogs(workspace?.id);
      setAuditLogs(logs);
      showNotification('success', `Deleted directory ${dirPath}`);
    } catch (err: any) {
      showNotification('error', `Failed to delete directory: ${err.message}`);
      throw err;
    }
  };

  const handleDeleteFile = async (filePath: string) => {
    try {
      await workspaceService.deleteFile(filePath, workspace?.id);
      handleCloseFile(filePath);
      const filesData = await workspaceService.listFiles(workspace?.id);
      setEntries(filesData.entries);
      const logs = await workspaceService.getAuditLogs(workspace?.id);
      setAuditLogs(logs);
      showNotification('success', `Deleted file ${filePath}`);
    } catch (err: any) {
      showNotification('error', `Failed to delete: ${err.message}`);
      throw err;
    }
  };

  const handleRenameFile = async (oldPath: string, newPath: string) => {
    try {
      const res = await workspaceService.renameFile(oldPath, newPath, workspace?.id);
      const renamed = res.file;

      // Update open files
      setOpenFiles((prev) =>
        prev.map((f) => (f.path === oldPath ? { ...renamed, path: newPath } : f))
      );

      // Update active file if it was the one renamed
      if (activeFilePath === oldPath) {
        setActiveFilePath(newPath);
        setActiveFile(renamed);
      }

      const filesData = await workspaceService.listFiles(workspace?.id);
      setEntries(filesData.entries);
      const logs = await workspaceService.getAuditLogs(workspace?.id);
      setAuditLogs(logs);
      showNotification('success', `Renamed to ${renamed.name}`);
    } catch (err: any) {
      showNotification('error', `Failed to rename: ${err.message}`);
      throw err;
    }
  };

  const handleRunCommand = async (command: string): Promise<CommandExecutionResult> => {
    try {
      const res = await workspaceService.runCommand(command, { workspaceId: workspace?.id });
      // Refresh files in case command created or modified files
      const filesData = await workspaceService.listFiles(workspace?.id);
      setEntries(filesData.entries);
      return res;
    } catch (err: any) {
      showNotification('error', `Command failed: ${err.message}`);
      throw err;
    }
  };

  const handleRunFile = async (file: WorkspaceFileMeta) => {
    if (!file || !file.path) return;
    const pathLower = file.path.toLowerCase();
    let cmd = `python3 "${file.path}"`;
    if (pathLower.endsWith('.js') || pathLower.endsWith('.mjs')) {
      cmd = `node "${file.path}"`;
    } else if (pathLower.endsWith('.ts')) {
      cmd = `node -r ts-node/register "${file.path}" || node "${file.path}"`;
    } else if (pathLower.endsWith('.sh') || pathLower.endsWith('.bash')) {
      cmd = `bash "${file.path}"`;
    }
    setBottomTab('terminal');
    try {
      await handleRunCommand(cmd);
    } catch {
      // Command failure already notified
    }
  };

  const handleExecutePlan = async (planToExecute: GoalPlanningResult) => {
    if (!planToExecute || !planToExecute.plan) return;
    setIsExecuting(true);
    setExecutionEvents([]);
    setBottomTab('timeline');

    try {
      // Execute plan with approval
      const approval = {
        confirmed: true,
        approvedAt: Date.now(),
        approvedBy: user?.email || 'user',
        maxRiskLevelConfirmed: 'HIGH'
      };

      const result = await workspaceService.executePlan(planToExecute, approval, workspace?.id);

      showNotification('success', 'Plan execution completed successfully!');
      
      // Refresh files and audit logs
      const filesData = await workspaceService.listFiles(workspace?.id);
      const seenPaths = new Set<string>();
      const uniqueEntries: WorkspaceDirectoryEntry[] = [];
      for (const e of filesData.entries || []) {
        const norm = (e.path || '').replace(/\/+/g, '/');
        if (norm && !seenPaths.has(norm)) {
          seenPaths.add(norm);
          uniqueEntries.push({ ...e, path: norm });
        }
      }
      setEntries(uniqueEntries);
      const logs = await workspaceService.getAuditLogs(workspace?.id);
      setAuditLogs(logs);

      // If active file was modified, reload it (skip if active path is a folder)
      if (activeFilePath) {
        const isDir = uniqueEntries.some(e => e.path === activeFilePath && e.isDirectory);
        if (!isDir) {
          try {
            const reloaded = await workspaceService.readFile(activeFilePath, workspace?.id);
            setActiveFile(reloaded);
          } catch {
            // ignore
          }
        }
      }
    } catch (err: any) {
      showNotification('error', `Plan execution error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStopExecution = async (executionId: string) => {
    try {
      await workspaceService.stopExecution(executionId);
      setIsExecuting(false);
      showNotification('success', 'Execution aborted by user.');
    } catch (err: any) {
      showNotification('error', `Failed to stop: ${err.message}`);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-100 text-slate-900'}`}>
      {/* Workspace Top Navigation / Status Header */}
      <div className={`px-4 py-2.5 border-b flex items-center justify-between ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'}`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FolderCode className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm tracking-tight text-zinc-100">
              {workspace?.name || 'Sandbox Workspace'}
            </span>
          </div>

          {/* Status Badge */}
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
              workspace?.status === 'RUNNING' || isExecuting
                ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60 animate-pulse'
                : workspace?.status === 'ERROR'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {isExecuting ? 'RUNNING' : workspace?.status || 'READY'}
          </span>

          {/* Provider pill */}
          <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 font-mono hidden sm:inline-flex items-center gap-1">
            <Server className="w-3 h-3 text-zinc-500" />
            {workspace?.provider || 'sandbox'}
          </span>

          {/* Working directory */}
          <span className="text-[11px] text-zinc-500 font-mono hidden md:inline">
            {workspace?.workingDirectory || '/workspace'}
          </span>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadWorkspaceData}
            className={`p-1.5 rounded border transition-colors ${
              isDark ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-slate-300 hover:bg-slate-200 text-slate-700'
            } ${isLoading ? 'animate-spin' : ''}`}
            title="Refresh Workspace"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications Toast */}
      {successNotification && (
        <div className="absolute top-14 right-6 z-50 flex items-center gap-2 p-3 text-xs bg-emerald-950 border border-emerald-700 text-emerald-200 rounded-lg shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successNotification}</span>
        </div>
      )}
      {errorNotification && (
        <div className="absolute top-14 right-6 z-50 flex items-center gap-2 p-3 text-xs bg-rose-950 border border-rose-700 text-rose-200 rounded-lg shadow-lg animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{errorNotification}</span>
        </div>
      )}

      {/* Main Multi-Pane Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: File Explorer (240px wide) */}
        <div className="w-full md:w-60 shrink-0 h-48 md:h-full">
          <FileExplorer
            entries={entries}
            activeFilePath={activeFilePath}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onCreateDirectory={handleCreateDirectory}
            onRenameFile={handleRenameFile}
            onDeleteFile={handleDeleteFile}
            onDeleteDirectory={handleDeleteDirectory}
            onRefresh={loadWorkspaceData}
            isLoading={isLoading}
            theme={theme}
          />
        </div>

        {/* Right Area: Code Editor (Top) + Bottom Pane (Timeline / Terminal / Audit) */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top Half: Code Editor */}
          <div className="flex-1 overflow-hidden min-h-[300px]">
            <CodeEditor
              activeFile={activeFile}
              openFiles={openFiles}
              onSelectFile={handleSelectFile}
              onCloseFile={handleCloseFile}
              onSaveFile={handleSaveFile}
              onRunCode={handleRunFile}
              theme={theme}
            />
          </div>

          {/* Bottom Half: Tabs for Timeline, Terminal, Audit Log (Height ~260px) */}
          <div className={`h-64 border-t flex flex-col shrink-0 ${isDark ? 'border-zinc-800 bg-zinc-950' : 'border-slate-200 bg-white'}`}>
            {/* Bottom Tabs Switcher */}
            <div className={`flex items-center justify-between border-b px-2 ${isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-slate-200 bg-slate-100'}`}>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setBottomTab('timeline')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    bottomTab === 'timeline'
                      ? 'border-purple-500 text-purple-400 bg-zinc-950/60'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Agent Execution
                  {isExecuting && <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />}
                </button>

                <button
                  type="button"
                  onClick={() => setBottomTab('terminal')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    bottomTab === 'terminal'
                      ? 'border-indigo-500 text-indigo-400 bg-zinc-950/60'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Workspace Terminal
                </button>

                <button
                  type="button"
                  onClick={() => setBottomTab('audit')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    bottomTab === 'audit'
                      ? 'border-sky-500 text-sky-400 bg-zinc-950/60'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  File Audit Log
                  {auditLogs.length > 0 && (
                    <span className="text-[10px] px-1 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                      {auditLogs.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Tab Content */}
            <div className="flex-1 overflow-hidden">
              {bottomTab === 'timeline' && (
                <AgentTimeline
                  planningResult={planningResult}
                  activeExecutionId={workspace?.activeExecutionId}
                  isExecuting={isExecuting}
                  events={executionEvents}
                  onExecutePlan={handleExecutePlan}
                  onStopExecution={handleStopExecution}
                  theme={theme}
                />
              )}

              {bottomTab === 'terminal' && (
                <WorkspaceTerminal
                  workingDirectory={workspace?.workingDirectory || '/workspace'}
                  onRunCommand={handleRunCommand}
                  theme={theme}
                />
              )}

              {bottomTab === 'audit' && (
                <AuditLogViewer
                  logs={auditLogs}
                  onSelectFileDiff={(filePath) => handleSelectFile(filePath)}
                  theme={theme}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
