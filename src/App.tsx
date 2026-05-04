import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  RotateCcw, 
  Settings as SettingsIcon, 
  Terminal, 
  Cpu, 
  Code2, 
  Palette, 
  Server,
  ChevronRight,
  ChevronDown,
  Info,
  Bot,
  Search,
  Brain,
  Image as ImageIcon,
  Plus,
  Trash2,
  MessageSquare,
  Sparkles,
  Database,
  Cloud,
  Shield,
  X,
  History,
  Paperclip,
  FileText,
  FolderOpen,
  Github,
  ChevronLeft,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  geminiService, 
  DEFAULT_SKILLS, 
  ModelId, 
  Skill, 
  ChatSession, 
  Message,
  Attachment
} from '@/services/geminiService';
import { ChatMessage } from '@/components/ChatMessage';
import { cn } from '@/lib/utils';
import { ThinkingLevel } from '@google/genai';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';

const ICON_MAP: Record<string, any> = { Code2, Palette, Server, Cpu, Database, Cloud, Shield };

export default function App() {
  // Persistence States
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('dg_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [customSkills, setCustomSkills] = useState<Skill[]>(() => {
    const saved = localStorage.getItem('dg_custom_skills');
    return saved ? JSON.parse(saved) : [];
  });
  const [apiKeys, setApiKeys] = useState<{name: string, key: string, id: string}[]>(() => {
    const saved = localStorage.getItem('dg_api_keys');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeKeyId, setActiveKeyId] = useState<string>(() => localStorage.getItem('dg_active_key_id') || '');
  const [theme, setTheme] = useState<'midnight' | 'cyberpunk' | 'monochrome'>(() => 
    (localStorage.getItem('dg_theme') as any) || 'midnight'
  );

  // Active Session State
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // UI & Input States
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>(DEFAULT_SKILLS.map(s => s.id));
  const [currentModel, setCurrentModel] = useState<ModelId>(geminiService.getCurrentModel());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [isSkillsExpanded, setIsSkillsExpanded] = useState(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyVal, setNewKeyVal] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'keys' | 'context' | 'theme'>('keys');
  const [repoUrl, setRepoUrl] = useState('');
  
  const activeApiKey = apiKeys.find(k => k.id === activeKeyId)?.key || '';

  // Persistence Sync
  useEffect(() => {
    localStorage.setItem('dg_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    localStorage.setItem('dg_active_key_id', activeKeyId);
  }, [activeKeyId]);

  useEffect(() => {
    localStorage.setItem('dg_theme', theme);
  }, [theme]);
  
  // Tools & Config
  const [useSearch, setUseSearch] = useState(false);
  const [thinkingMode, setThinkingMode] = useState<ThinkingLevel>(ThinkingLevel.LOW);
  const [usage, setUsage] = useState(geminiService.getUsage());
  
  // Abort Control
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modals / Views
  const [view, setView] = useState<'chat' | 'skills'>('chat');
  const [showHistory, setShowHistory] = useState(false);
  const [newSkillPrompt, setNewSkillPrompt] = useState('');
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync Persistence
  useEffect(() => {
    localStorage.setItem('dg_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('dg_custom_skills', JSON.stringify(customSkills));
  }, [customSkills]);

  // Usage Polling
  useEffect(() => {
    const interval = setInterval(() => {
      setUsage(geminiService.getUsage());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleEditMessage = async (index: number, newContent: string) => {
    if (isLoading) return;
    
    const messageToEdit = messages[index];
    if (!messageToEdit) return;

    const oldContent = messageToEdit.content;
    const history = messageToEdit.editHistory || [];
    
    // Create new message object with history
    const updatedMessage: Message = {
      ...messageToEdit,
      content: newContent,
      editHistory: [...history, oldContent]
    };

    const updatedMessages = [...messages.slice(0, index), updatedMessage];
    setMessages(updatedMessages);
    handleSubmit(undefined, updatedMessages);
  };

  const handleRevertMessage = (index: number, versionContent: string) => {
    setMessages(prev => {
      const next = [...prev];
      const msg = next[index];
      const history = msg.editHistory || [];
      const currentContent = msg.content;
      
      // Move current to history and pick version
      next[index] = {
        ...msg,
        content: versionContent,
        editHistory: history.filter(h => h !== versionContent).concat(currentContent)
      };
      return next;
    });
  };

  const loadSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setView('chat');
    setShowHistory(false);
  };

  const createNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setView('chat');
  };

  const saveCurrentSession = (updatedMessages: Message[], sessionId?: string) => {
    if (updatedMessages.length === 0 || !updatedMessages[0]) return;

    const finalId = sessionId || currentSessionId || `session-${Date.now()}`;
    const session: ChatSession = {
      id: finalId,
      title: updatedMessages[0].content?.slice(0, 30) + (updatedMessages[0].content?.length > 30 ? '...' : ''),
      messages: updatedMessages,
      updatedAt: Date.now()
    };

    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === session.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = session;
        return next;
      }
      return [session, ...prev];
    });

    if (!currentSessionId) setCurrentSessionId(finalId);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) createNewSession();
  };

  const handleImageGen = async (prompt: string, sessionId?: string) => {
    setIsLoading(true);
    const systemMsg: Message = { 
      id: `img-${Date.now()}`,
      role: 'model', 
      content: `*Generating image for: "${prompt}"...*` 
    };
    setMessages(prev => [...prev, systemMsg]);

    try {
      const imageUrl = await geminiService.generateImage(prompt, activeApiKey);
      setMessages(prev => {
        const last = [...prev];
        if (last.length > 0) {
          last[last.length - 1] = { 
            id: `img-${Date.now()}`,
            role: 'model', 
            content: `Here is the image I generated for: "${prompt}"`,
            imageUrl 
          };
        }
        saveCurrentSession(last, sessionId);
        return last;
      });
    } catch (err: any) {
      setMessages(prev => {
        const last = [...prev];
        if (last.length > 0) {
          last[last.length - 1].content = `**Error generating image:** ${err.message}`;
        }
        return last;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const newAttachments: Attachment[] = [];
    
    for (const file of acceptedFiles) {
      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        try {
          const content = await zip.loadAsync(file);
          for (const [path, zipEntry] of Object.entries(content.files)) {
            if (!zipEntry.dir) {
              const fileContent = await zipEntry.async('string');
              newAttachments.push({
                name: path,
                content: fileContent,
                type: 'file'
              });
            }
          }
        } catch (e) {
          console.error("Error reading zip:", e);
        }
      } else {
        const content = await file.text();
        newAttachments.push({
          name: file.name,
          content: content,
          type: file.type || 'text/plain'
        });
      }
    }
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    noClick: true,
    noKeyboard: true
  });

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddRepo = async () => {
    if (!repoUrl.trim()) return;
    setIsLoading(true);
    try {
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        const [, owner, repo] = match;
        const cleanRepo = repo.replace(/\.git$/, '');
        const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/contents`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          const files = (data as any[]).map(f => f.name).join(', ');
          const repoContent: Attachment = {
            name: `Repo: ${owner}/${cleanRepo}`,
            content: `Repository linked: https://github.com/${owner}/${cleanRepo}\nTop-level files: ${files}`,
            type: 'repo'
          };
          setAttachments(prev => [...prev, repoContent]);
          setIsRepoModalOpen(false);
        } else {
          throw new Error("Could not fetch repo info");
        }
      } else {
        const simpleContent: Attachment = {
          name: `Repo Reference`,
          content: `Project Repository: ${repoUrl}`,
          type: 'repo'
        };
        setAttachments(prev => [...prev, simpleContent]);
        setIsRepoModalOpen(false);
      }
      setRepoUrl('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!input.trim() || isEnhancingPrompt) return;
    setIsEnhancingPrompt(true);
    try {
      const enhanced = await geminiService.enhancePrompt(input, activeApiKey);
      setInput(enhanced);
    } catch (err) {
      console.error("Failed to enhance prompt:", err);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, overrideMessages?: Message[]) => {
    e?.preventDefault();
    const targetInput = overrideMessages ? (overrideMessages[overrideMessages.length - 1]?.content || '') : input;
    if (!targetInput.trim() || isLoading) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = `session-${Date.now()}`;
      setCurrentSessionId(sessionId);
    }

    const userMessage: Message = { 
      id: `msg-${Date.now()}`,
      role: 'user', 
      content: targetInput,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      editHistory: []
    };
    const currentMsgBase = overrideMessages || messages;
    const newMessages = overrideMessages ? [...overrideMessages] : [...currentMsgBase, userMessage];
    
    if (!overrideMessages) {
      setMessages(newMessages);
      saveCurrentSession(newMessages, sessionId);
      setInput('');
      setAttachments([]);
    }
    
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    // Simple Intent Detection for Image Gen
    if (targetInput.toLowerCase().startsWith('generate image')) {
      await handleImageGen(targetInput.replace(/generate image/i, '').trim() || targetInput, sessionId);
      return;
    }

    try {
      let assistantMessage: Message = { 
        id: `msg-${Date.now() + 1}`,
        role: 'model', 
        content: '', 
        modelName: geminiService.getCurrentModel() 
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      const history = newMessages
        .filter(m => m && m.role && m.content)
        .map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

      await geminiService.generateResponse(
        targetInput,
        activeSkillIds,
        customSkills,
        history,
        { 
          model: currentModel,
          useSearch, 
          thinkingLevel: currentModel === ModelId.PRO ? undefined : thinkingMode,
          signal: abortControllerRef.current.signal,
          attachments: userMessage.attachments,
          customKey: activeApiKey,
          onModelSwitch: (newModel) => {
            setCurrentModel(newModel);
            setMessages(prev => {
              const last = [...prev];
              const msg = last[last.length - 1];
              if (msg && msg.role === 'model') {
                msg.modelName = newModel;
                msg.content += "\n\n*(Auto-failover: Switched to " + newModel.split('-')[2] + " due to limits)*";
              }
              return last;
            });
          }
        },
        (fullContent) => {
          setMessages(prev => {
            const last = [...prev];
            const msg = last[last.length - 1];
            if (msg && msg.role === 'model') {
              msg.content = fullContent;
              msg.modelName = geminiService.getCurrentModel();
            }
            return last;
          });
        }
      );

      setMessages(prev => {
        saveCurrentSession(prev, sessionId);
        return prev;
      });
      setCurrentModel(geminiService.getCurrentModel());
      
    } catch (error: any) {
      if (error.message === 'Operation aborted') {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { id: `err-${Date.now()}`, role: 'model', content: `*Generation cancelled by user.*` }
        ]);
      } else {
        setMessages(prev => [
          ...prev, 
          { id: `err-${Date.now()}`, role: 'model', content: `**Error:** ${error.message || "An unexpected error occurred."}` }
        ]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCreateSkill = async () => {
    if (!newSkillPrompt.trim() || isCreatingSkill) return;
    setIsCreatingSkill(true);
    try {
      const newSkill = await geminiService.createSkillFromPrompt(newSkillPrompt);
      setCustomSkills(prev => [...prev, newSkill]);
      setActiveSkillIds(prev => [...prev, newSkill.id]);
      setNewSkillPrompt('');
    } catch (err: any) {
      alert("Failed to create skill: " + err.message);
    } finally {
      setIsCreatingSkill(false);
    }
  };

  const toggleSkill = (id: string) => {
    setActiveSkillIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const removeCustomSkill = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCustomSkills(prev => prev.filter(s => s.id !== id));
    setActiveSkillIds(prev => prev.filter(s => s !== id));
  };

  return (
    <div {...getRootProps()} className={cn(
      "flex h-screen text-[#e0e0e0] font-sans overflow-hidden transition-colors duration-500",
      theme === 'midnight' && "bg-surface-dark",
      theme === 'cyberpunk' && "bg-[#050505] text-[#00ffcc] selection:bg-[#00ffcc] selection:text-black",
      theme === 'monochrome' && "bg-[#111] text-zinc-400 selection:bg-zinc-700 selection:text-white"
    )}>
      <input {...getInputProps()} />
      {/* Sidebar - Context & Skills Navigation */}
      <aside className={cn(
        "border-r border-border-dim bg-[#08080a] flex flex-col shrink-0 transition-all duration-300 relative",
        isSidebarCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-64 opacity-100"
      )}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8 group">
            <div className="flex items-center gap-2 cursor-pointer" onClick={createNewSession}>
              <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-110 transition-transform">GG</div>
              <h1 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">DevGenie AI</h1>
            </div>
          </div>
          
          <nav className="space-y-1">
            <button 
              onClick={() => setView('chat')}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded text-xs font-mono transition-all",
                view === 'chat' ? "bg-cyan-900/20 text-cyan-400 border border-cyan-800/30" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <MessageSquare size={14} />
              Terminals
            </button>
            <button 
              onClick={() => setView('skills')}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded text-xs font-mono transition-all",
                view === 'skills' ? "bg-purple-900/20 text-purple-400 border border-purple-800/30" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Sparkles size={14} />
              Skills Lab
            </button>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded text-xs font-mono transition-all",
                showHistory ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <History size={14} />
              History Archive
            </button>
          </nav>

          {/* History Bubble (Inline or Overlay) */}
          <AnimatePresence>
            {showHistory && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-1 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3 px-2">
                  <h2 className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold">Recent Pulses</h2>
                </div>
                <div className="space-y-1 max-h-[30vh] overflow-y-auto custom-scrollbar pr-2">
                  {sessions.length === 0 && (
                    <div className="text-[10px] text-zinc-700 italic px-2">No archived streams...</div>
                  )}
                  {sessions.map(s => (
                    <div 
                      key={s.id}
                      onClick={() => loadSession(s)}
                      className={cn(
                        "group flex items-center justify-between p-2 rounded text-[10px] font-mono cursor-pointer transition-all border",
                        currentSessionId === s.id ? "bg-[#121216] border-[#222] text-zinc-200" : "text-zinc-500 border-transparent hover:bg-zinc-900/50"
                      )}
                    >
                      <span className="truncate flex-1">{s.title}</span>
                      <button 
                        onClick={(e) => deleteSession(e, s.id)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 transition-all p-1"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="mt-auto p-4 border-t border-border-dim bg-[#0a0a0c] space-y-4">
          <div className="space-y-3">
            {[ModelId.PRO, ModelId.FLASH, ModelId.LITE].map(model => (
              <div key={model} className="space-y-1">
                <div className="flex justify-between items-center opacity-60">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-tighter">
                    {model.replace('gemini-3.1-', '')}
                  </span>
                  <span className="text-[8px] font-mono text-cyan-400">{Math.round(usage[model] || 0)}%</span>
                </div>
                <div className="w-full bg-border-dim/30 h-1 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      usage[model] > 80 ? "bg-red-500" : usage[model] > 50 ? "bg-amber-500" : "bg-cyan-500"
                    )}
                    style={{ width: `${usage[model] || 0}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-border-dim/30">
            <div className="flex justify-between items-center mb-1.5 opacity-60">
              <span className="text-[9px] font-mono text-zinc-600 tracking-tighter uppercase">Memory Status</span>
              <span className="text-[9px] font-mono text-cyan-400">Stable</span>
            </div>
            <div className="w-full bg-border-dim h-0.5 rounded-full overflow-hidden">
              <div className="bg-cyan-500 h-full w-[45%]" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative">
        {/* Toggle Sidebar Button */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 z-50 w-6 h-12 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-500 hover:text-cyan-400 transition-all shadow-2xl",
            isSidebarCollapsed ? "left-4 rotate-180" : "-left-3"
          )}
        >
          <ChevronLeft size={14} />
        </button>

        {view === 'chat' ? (
          <>
            <header className="h-16 border-b border-border-dim flex items-center justify-between px-4 sm:px-8 bg-surface-dark/80 backdrop-blur-md z-10 shrink-0">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <span className="text-[9px] sm:text-[10px] font-mono text-[#555] tracking-widest uppercase truncate">
                  {currentSessionId ? `ID: ${currentSessionId.slice(-8)}` : 'NEW_SESSION'}
                </span>
                {isSidebarCollapsed && (
                  <button onClick={createNewSession} className="text-cyan-500 hover:text-cyan-400 transition-colors p-1 shrink-0" title="New Session">
                    <Plus size={14} />
                  </button>
                )}
                <div className="h-3 w-px bg-border-dim hidden sm:block" />
                <div className="hidden min-[450px]:flex items-center gap-1.5 whitespace-nowrap">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] sm:text-[10px] font-mono text-green-500/80 uppercase tracking-tighter transition-all">
                    Link: {activeApiKey ? 'Custom Key' : 'System Key'}
                  </span>
                  {activeApiKey && <Shield size={10} className="text-cyan-500" />}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* Custom Styled Model Selector */}
                <div className="relative">
                  <button 
                    id="model-selector-container" 
                    onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                    className={cn(
                      "flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-[#0a0a0c] border rounded-xl text-[10px] font-mono transition-all active:scale-95 shadow-inner",
                      isModelSelectorOpen ? "border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.1)]" : "border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    <Cpu size={12} className={cn("shrink-0 transition-colors", isModelSelectorOpen ? "text-cyan-400" : "text-cyan-600")} />
                    <span className="text-zinc-300 font-bold uppercase tracking-tight hidden xs:inline">
                      {currentModel === ModelId.PRO ? "PRO 3.1" : currentModel === ModelId.FLASH ? "FLASH 3.0" : "LITE 3.1"}
                    </span>
                    <span className="text-zinc-300 font-bold uppercase tracking-tight xs:hidden">
                      {currentModel === ModelId.PRO ? "PRO" : currentModel === ModelId.FLASH ? "FLS" : "LTE"}
                    </span>
                    <ChevronDown size={10} className={cn("text-zinc-600 transition-transform duration-300", isModelSelectorOpen && "rotate-180 text-cyan-400")} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isModelSelectorOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-3 w-48 sm:w-56 bg-[#0d0d0f] border border-zinc-800 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] z-[100] overflow-hidden"
                      >
                        <div className="p-3 border-b border-zinc-800 bg-zinc-900/30">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Neural Compute Unit</span>
                            <button onClick={() => setIsModelSelectorOpen(false)} className="text-zinc-700 hover:text-zinc-400">
                              <X size={10} />
                            </button>
                          </div>
                          <p className="text-[8px] text-zinc-600 leading-tight">Switch backend processing engine for optimized response.</p>
                        </div>
                        <div className="p-1.5 space-y-1">
                          {[
                            { id: ModelId.PRO, name: 'Pro 3.1', desc: 'Complex reasoning & code synthesis', color: 'text-cyan-400', bg: 'hover:bg-cyan-500/5' },
                            { id: ModelId.FLASH, name: 'Flash 3.0', desc: 'Real-time task & stream processing', color: 'text-purple-400', bg: 'hover:bg-purple-500/5' },
                            { id: ModelId.LITE, name: 'Lite 3.1', desc: 'Low-latency conversational logic', color: 'text-zinc-400', bg: 'hover:bg-zinc-500/5' }
                          ].map((m) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setCurrentModel(m.id);
                                setIsModelSelectorOpen(false);
                              }}
                              className={cn(
                                "w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-0.5 border border-transparent",
                                m.bg,
                                currentModel === m.id ? "bg-cyan-950/10 border-cyan-500/20 shadow-sm" : ""
                              )}
                            >
                              <div className="flex items-center justify-between pointer-events-none">
                                <span className={cn("text-xs font-bold uppercase tracking-tight", m.color)}>{m.name}</span>
                                {currentModel === m.id && <Sparkles size={10} className="text-cyan-500" />}
                              </div>
                              <p className="text-[9px] text-zinc-500 leading-relaxed pointer-events-none">{m.desc}</p>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="h-4 w-px bg-zinc-800 hidden xs:block" />
                
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all border border-transparent hover:border-zinc-800 active:scale-90"
                  title="System Settings"
                >
                  <SettingsIcon size={16} />
                </button>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4">
              <div className="max-w-4xl mx-auto pb-64">
                {messages.length === 0 ? (
                  <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center opacity-40">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
                      <Terminal size={32} className="text-zinc-600" />
                    </div>
                    <h2 className="text-xl font-mono text-zinc-400 uppercase tracking-widest mb-2">Terminal Initialization...</h2>
                    <p className="text-xs font-mono text-zinc-600">Awaiting user input sequence</p>
                  </div>
                ) : (
                  messages.filter(m => m).map((m, i) => (
                    <ChatMessage 
                      key={i} 
                      role={m.role} 
                      content={m.content} 
                      modelName={m.modelName} 
                      imageUrl={m.imageUrl}
                      onEdit={(content) => handleEditMessage(i, content)}
                      onRevert={(content) => handleRevertMessage(i, content)}
                      attachments={m.attachments}
                      history={m.editHistory}
                    />
                  ))
                )}
                {isLoading && (
                  <div className="p-8 flex gap-4 animate-pulse opacity-50">
                    <div className="w-8 h-8 rounded border border-zinc-800 bg-[#0a0a0c]" />
                    <div className="flex-1 space-y-3 pt-2">
                       <div className="h-2 w-16 bg-zinc-800 rounded" />
                       <div className="h-2 w-full bg-zinc-900 rounded" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Float Input Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-8 pt-0 pointer-events-none z-30">
              <div className="max-w-4xl mx-auto pointer-events-auto">
                <AnimatePresence>
                  {isLoading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex justify-center mb-4"
                    >
                      <button 
                        onClick={handleStop}
                        className="flex items-center gap-2 px-4 py-2 bg-red-950/30 border border-red-900/50 text-red-500 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-red-900/50 transition-all shadow-xl backdrop-blur-sm active:scale-95"
                      >
                        <X size={12} />
                        Stop Generation
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="bg-[#0d0d0f] border border-[#222] rounded-2xl p-4 shadow-2xl relative transition-all focus-within:border-cyan-800/50 shadow-cyan-500/5 group scale-in-center">
                  
                  {/* Attachments List */}
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4 animate-in slide-in-from-bottom-2">
                      {attachments.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 bg-[#121216] border border-zinc-800 px-2 py-1 rounded-lg">
                          <FileText size={10} className="text-cyan-500" />
                          <span className="text-[9px] font-mono text-zinc-400 truncate max-w-[100px]">{a.name}</span>
                          <button onClick={() => removeAttachment(i)} className="text-zinc-600 hover:text-red-500">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Context Control Bar */}
                  <div className="flex items-center gap-4 mb-4 border-b border-border-dim pb-3">
                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                      <button 
                        onClick={() => setIsSkillsExpanded(!isSkillsExpanded)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all text-[9px] font-bold uppercase tracking-wider shrink-0",
                          isSkillsExpanded ? "bg-cyan-900/20 border-cyan-500/40 text-cyan-400" : "border-zinc-800 text-zinc-600 hover:text-cyan-400/80"
                        )}
                      >
                        <Sparkles size={10} />
                        Skills {isSkillsExpanded ? 'ON' : 'OFF'}
                      </button>
                      
                      <div className={cn(
                        "flex items-center gap-2 overflow-hidden transition-all duration-300",
                        isSkillsExpanded ? "flex-1 opacity-100" : "w-0 opacity-0"
                      )}>
                        {[...DEFAULT_SKILLS, ...customSkills].map(skill => {
                          const Icon = ICON_MAP[skill.icon] || Code2;
                          const isActive = activeSkillIds.includes(skill.id);
                          return (
                            <button
                              key={skill.id}
                              onClick={() => toggleSkill(skill.id)}
                              className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all text-[9px] font-bold uppercase tracking-wider whitespace-nowrap",
                                isActive 
                                  ? "bg-cyan-900/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]" 
                                  : "bg-[#0a0a0c] border-[#222] text-[#444] hover:text-zinc-400 hover:border-zinc-700"
                              )}
                            >
                              <Icon size={10} />
                              {skill.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.onchange = (e) => {
                          const files = (e.target as HTMLInputElement).files;
                          if (files) onDrop(Array.from(files));
                        };
                        input.click();
                      }}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-zinc-800 text-[9px] font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-300 hover:border-zinc-700 transition-all"
                    >
                      <Paperclip size={10} />
                      Attach
                    </button>

                    <button 
                      onClick={() => setUseSearch(!useSearch)}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all text-[9px] font-bold uppercase tracking-wider",
                        useSearch ? "bg-cyan-900/20 border-cyan-500/40 text-cyan-400" : "border-zinc-800 text-zinc-600"
                      )}
                    >
                      <Search size={10} />
                      Search
                    </button>

                    <button 
                      onClick={() => setThinkingMode(thinkingMode === ThinkingLevel.HIGH ? ThinkingLevel.LOW : ThinkingLevel.HIGH)}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all text-[9px] font-bold uppercase tracking-wider",
                        thinkingMode === ThinkingLevel.HIGH ? "bg-amber-900/20 border-amber-500/40 text-amber-500" : "border-zinc-800 text-zinc-600"
                      )}
                    >
                      <Brain size={10} />
                      Thinking
                    </button>

                    <div className="relative">
                      <button 
                        onClick={() => setIsRepoModalOpen(!isRepoModalOpen)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all text-[9px] font-bold uppercase tracking-wider",
                          isRepoModalOpen ? "bg-purple-900/20 border-purple-500/40 text-purple-400" : "border-zinc-800 text-zinc-600 hover:text-purple-400/80"
                        )}
                      >
                        <Github size={10} />
                        Repo
                      </button>
                      
                      <AnimatePresence>
                        {isRepoModalOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-0 mb-3 w-64 bg-[#0d0d0f] border border-zinc-800 rounded-xl shadow-2xl p-3 z-50 overflow-hidden"
                          >
                            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Repository Sync</span>
                              <button onClick={() => setIsRepoModalOpen(false)} className="text-zinc-700 hover:text-zinc-400">
                                <X size={10} />
                              </button>
                            </div>
                            <div className="space-y-2">
                              <div className="text-[8px] text-zinc-600 uppercase font-mono tracking-tighter">Enter GitHub URL</div>
                              <input 
                                type="text"
                                placeholder="https://github.com/owner/repo"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-lg px-3 py-2 text-[10px] font-mono outline-none focus:border-purple-500/50 text-purple-300"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddRepo();
                                  }
                                }}
                                autoFocus
                              />
                              <button 
                                onClick={handleAddRepo}
                                disabled={isLoading || !repoUrl.trim()}
                                className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 disabled:opacity-20 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all shadow-lg"
                              >
                                {isLoading ? 'Syncing...' : 'Link Repository'}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex gap-2 min-w-0 flex-1 overflow-hidden pointer-events-none cursor-default">
                      {[...DEFAULT_SKILLS, ...customSkills].filter(s => activeSkillIds.includes(s.id)).map(s => (
                        <span key={s.id} className="text-[9px] font-mono text-zinc-600 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800/50 truncate">
                          {s.name.split(' ')[0].toLowerCase()}
                        </span>
                      ))}
                    </div>

                    <button 
                      onClick={() => setInput('Generate image of ')}
                      className="text-zinc-600 hover:text-cyan-500 transition-all p-1"
                      title="Generate Image"
                    >
                      <ImageIcon size={14} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="flex items-end gap-3 pb-2 pt-1 border-t border-zinc-900/50 mt-2">
                    <div className="flex-1 flex flex-col gap-2 relative">
                      <div className="absolute right-2 top-0 flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={handleEnhancePrompt}
                          disabled={!input.trim() || isEnhancingPrompt}
                          className={cn(
                            "p-1.5 rounded-lg border transition-all active:scale-90",
                            isEnhancingPrompt ? "bg-amber-900/20 border-amber-500/40 text-amber-400 animate-pulse" : "border-zinc-800 text-zinc-600 hover:text-amber-400/80 hover:bg-amber-900/10"
                          )}
                          title="Magic Enhance Input"
                        >
                          <Sparkles size={14} className={isEnhancingPrompt ? "animate-spin" : ""} />
                        </button>
                      </div>
                      <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Input development command or 'Generate image of...'"
                        className="bg-transparent flex-1 resize-none font-mono text-[13px] leading-relaxed outline-none min-h-[40px] max-h-48 custom-scrollbar py-1 pr-10"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit();
                          }
                        }}
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className={cn(
                        "flex items-center gap-2 h-10 px-4 rounded-xl transition-all bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-lg",
                        (isLoading || !input.trim()) && "opacity-20 grayscale cursor-not-allowed"
                      )}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Send Prompt</span>
                      <Send size={16} strokeWidth={2.5} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4">
              <header className="flex justify-between items-end border-b border-border-dim pb-8">
                <div>
                  <h1 className="text-4xl font-mono font-bold tracking-tighter text-white mb-2 uppercase">Skills Lab</h1>
                  <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest tracking-tighter opacity-60">Design and Inject Neural Capabilities</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[9px] font-mono text-cyan-500/80 px-2 py-0.5 bg-cyan-950/20 border border-cyan-900/30 rounded uppercase">Core Sync: Active</span>
                  <div className="h-1 w-32 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 w-2/3" />
                  </div>
                </div>
              </header>

              {/* Generator Module */}
              <section className="bg-surface-card border border-border-dim p-8 rounded-2xl shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                  <Sparkles size={120} />
                </div>
                <div className="relative z-10">
                  <h2 className="text-sm font-mono font-bold text-zinc-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Plus size={16} className="text-cyan-500" />
                    Automated Neural Structuring
                  </h2>
                  <div className="flex gap-4">
                    <input 
                      value={newSkillPrompt}
                      onChange={(e) => setNewSkillPrompt(e.target.value)}
                      placeholder="Describe a specialized role (e.g. Kubernetes Cluster Architect)..."
                      className="flex-1 bg-surface-dark border border-zinc-800 rounded-lg px-4 py-3 text-sm font-mono outline-none focus:border-cyan-500 transition-colors shadow-inner"
                    />
                    <button 
                      onClick={handleCreateSkill}
                      disabled={isCreatingSkill || !newSkillPrompt}
                      className={cn(
                        "px-8 rounded-lg font-mono text-xs font-bold uppercase transition-all bg-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]",
                        (isCreatingSkill || !newSkillPrompt) && "opacity-30 grayscale cursor-not-allowed"
                      )}
                    >
                      {isCreatingSkill ? "Infecting Path..." : "Initialize"}
                    </button>
                  </div>
                </div>
              </section>

              {/* Grid of Modules */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24">
                {[...DEFAULT_SKILLS, ...customSkills].map((skill) => {
                  const Icon = ICON_MAP[skill.icon] || Code2;
                  const isActive = activeSkillIds.includes(skill.id);
                  return (
                    <motion.div
                      layout
                      key={skill.id}
                      onClick={() => toggleSkill(skill.id)}
                      className={cn(
                        "p-6 rounded-2xl border transition-all cursor-pointer relative group",
                        isActive ? "bg-cyan-900/10 border-cyan-800/50 shadow-[0_0_30px_rgba(6,182,212,0.05)]" : "bg-transparent border-zinc-800/30 opacity-40 grayscale hover:opacity-100 hover:border-zinc-700"
                      )}
                    >
                      {skill.isCustom && (
                        <button 
                          onClick={(e) => removeCustomSkill(e, skill.id)}
                          className="absolute top-4 right-4 text-zinc-700 hover:text-red-500 transition-colors p-2"
                        >
                          <X size={14} />
                        </button>
                      )}
                      <div className="flex items-start gap-5">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                          isActive ? "bg-cyan-500 text-surface-dark shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "bg-zinc-800 text-zinc-600"
                        )}>
                          <Icon size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-zinc-200 mb-1.5 group-hover:text-white transition-colors uppercase tracking-tight">{skill.name}</h3>
                          <p className="text-[11px] text-zinc-500 leading-relaxed font-mono line-clamp-2">{skill.description}</p>
                        </div>
                      </div>
                      <div className="mt-6 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <div className={cn(
                             "w-1.5 h-1.5 rounded-full",
                             isActive ? "bg-green-500 animate-pulse" : "bg-zinc-700"
                           )} />
                           <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                             {isActive ? "Operational" : "Ready"}
                           </span>
                         </div>
                         {skill.isCustom && <span className="text-[8px] font-mono text-purple-500/60 uppercase border border-purple-500/20 px-1.5 py-0.5 rounded">Custom Build</span>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm bg-black/60">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-card border border-border-dim w-full max-w-xl rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight">System Configuration</h2>
                  <p className="text-xs text-zinc-500 font-mono mt-1">Adjust core neural path parameters</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex gap-8 border-b border-border-dim mb-8">
                {['keys', 'context', 'theme'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSettingsTab(tab as any)}
                    className={cn(
                      "pb-4 text-[10px] font-bold uppercase tracking-widest transition-all",
                      settingsTab === tab ? "border-b-2 border-cyan-500 text-white" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                {settingsTab === 'keys' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Manage API Keys</label>
                        <button 
                          onClick={() => setIsAddingKey(true)}
                          className="text-[9px] font-mono text-cyan-500 hover:text-cyan-400 uppercase flex items-center gap-1"
                        >
                          <Plus size={10} /> Add New
                        </button>
                      </div>

                      {isAddingKey && (
                        <div className="p-4 bg-zinc-950 border border-cyan-900/30 rounded-2xl animate-in fade-in slide-in-from-top-2">
                          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Add Security Token</div>
                          <div className="space-y-3">
                            <input 
                              type="text"
                              value={newKeyName}
                              onChange={(e) => setNewKeyName(e.target.value)}
                              placeholder="Key Name (e.g. Master Cluster)"
                              className="w-full bg-surface-dark border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-cyan-500 transition-all"
                            />
                            <input 
                              type="password"
                              value={newKeyVal}
                              onChange={(e) => setNewKeyVal(e.target.value)}
                              placeholder="Paste Key Hash"
                              className="w-full bg-surface-dark border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-cyan-500 transition-all"
                            />
                            <div className="flex gap-2 pt-1">
                              <button 
                                onClick={() => {
                                  if (newKeyName && newKeyVal) {
                                    setApiKeys(prev => [...prev, { name: newKeyName, key: newKeyVal, id: `key-${Date.now()}` }]);
                                    setNewKeyName('');
                                    setNewKeyVal('');
                                    setIsAddingKey(false);
                                  }
                                }}
                                className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                              >
                                Save Key
                              </button>
                              <button 
                                onClick={() => {
                                  setIsAddingKey(false);
                                  setNewKeyName('');
                                  setNewKeyVal('');
                                }}
                                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                        {apiKeys.length === 0 && (
                          <div className="text-[10px] text-zinc-600 italic p-8 bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-800 text-center">
                            No security tokens mapped to this terminal.
                          </div>
                        )}
                        {apiKeys.map(k => (
                          <div 
                            key={k.id} 
                            className={cn(
                              "flex items-center justify-between p-4 rounded-2xl border transition-all group/key relative overflow-hidden",
                              activeKeyId === k.id ? "bg-cyan-900/10 border-cyan-500/30" : "bg-black/40 border-zinc-900 hover:border-zinc-800"
                            )}
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0" onClick={() => setActiveKeyId(k.id)}>
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-inner",
                                activeKeyId === k.id ? "bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "bg-zinc-900 text-zinc-600"
                              )}>
                                <Shield size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={cn("text-xs font-bold uppercase tracking-tight", activeKeyId === k.id ? "text-cyan-400" : "text-zinc-400")}>
                                  {k.name}
                                </div>
                                <div className="text-[10px] font-mono text-zinc-600 mt-0.5 tracking-widest truncate">
                                  ••••••••{k.key.slice(-4)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className={cn(
                                "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded transition-all",
                                activeKeyId === k.id ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "opacity-0"
                              )}>
                                Active
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setApiKeys(prev => prev.filter(ik => ik.id !== k.id));
                                  if (activeKeyId === k.id) setActiveKeyId('');
                                }}
                                className="p-2 text-zinc-700 hover:text-red-500 transition-all opacity-0 group-hover/key:opacity-100"
                                title="Revoke Access"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === 'context' && (
                   <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                      <Github size={12} className="text-purple-500" />
                      Repository Context
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="Github/Gitlab URL..."
                        className="flex-1 bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono focus:border-cyan-500 outline-none transition-all"
                      />
                      <button 
                        onClick={handleAddRepo}
                        className="px-6 bg-purple-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-purple-500 transition-colors"
                      >
                        Sync
                      </button>
                    </div>
                  </div>
                )}

                {settingsTab === 'theme' && (
                   <div className="grid grid-cols-3 gap-4">
                    {(['midnight', 'cyberpunk', 'monochrome'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={cn(
                          "aspect-video rounded-xl border flex flex-col items-center justify-center gap-2 transition-all p-4",
                          theme === t ? "border-cyan-500 bg-cyan-700/10" : "border-zinc-800 bg-zinc-950/50 grayscale hover:grayscale-0 hover:border-zinc-700"
                        )}
                      >
                        <Palette size={20} className={cn(
                          "transition-colors",
                          t === 'cyberpunk' ? "text-[#00ffcc]" : "text-cyan-500"
                        )} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{t}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="pt-6 border-t border-zinc-800 flex justify-end">
                   <button 
                    onClick={() => setShowSettings(false)}
                    className="px-8 py-3 bg-zinc-800 text-zinc-200 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-700 transition-colors"
                   >
                     Close
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
