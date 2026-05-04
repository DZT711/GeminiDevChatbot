import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  RotateCcw, 
  Settings, 
  Terminal, 
  Cpu, 
  Code2, 
  Palette, 
  Server,
  ChevronRight,
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
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  geminiService, 
  DEFAULT_SKILLS, 
  ModelId, 
  Skill, 
  ChatSession, 
  Message 
} from '@/services/geminiService';
import { ChatMessage } from '@/components/ChatMessage';
import { cn } from '@/lib/utils';
import { ThinkingLevel } from '@google/genai';

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

  // Active Session State
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // UI & Input States
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>(DEFAULT_SKILLS.map(s => s.id));
  const [currentModel, setCurrentModel] = useState<ModelId>(geminiService.getCurrentModel());
  
  // Tools & Config
  const [useSearch, setUseSearch] = useState(false);
  const [thinkingMode, setThinkingMode] = useState<ThinkingLevel>(ThinkingLevel.LOW);
  
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Load session
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

  const saveCurrentSession = (updatedMessages: Message[]) => {
    if (updatedMessages.length === 0) return;

    const session: ChatSession = {
      id: currentSessionId || `session-${Date.now()}`,
      title: updatedMessages[0].content.slice(0, 30) + (updatedMessages[0].content.length > 30 ? '...' : ''),
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

    if (!currentSessionId) setCurrentSessionId(session.id);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) createNewSession();
  };

  const handleImageGen = async (prompt: string) => {
    setIsLoading(true);
    const systemMsg: Message = { role: 'model', content: `*Generating image for: "${prompt}"...*` };
    setMessages(prev => [...prev, systemMsg]);

    try {
      const imageUrl = await geminiService.generateImage(prompt);
      setMessages(prev => {
        const last = [...prev];
        last[last.length - 1] = { 
          role: 'model', 
          content: `Here is the image I generated for: "${prompt}"`,
          imageUrl 
        };
        saveCurrentSession(last);
        return last;
      });
    } catch (err: any) {
      setMessages(prev => {
        const last = [...prev];
        last[last.length - 1].content = `**Error generating image:** ${err.message}`;
        return last;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Simple Intent Detection for Image Gen
    if (input.toLowerCase().startsWith('generate image')) {
      await handleImageGen(input.replace(/generate image/i, '').trim() || input);
      return;
    }

    try {
      let assistantMessage: Message = { 
        role: 'model', 
        content: '', 
        modelName: geminiService.getCurrentModel() 
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      const history = newMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const fullResponse = await geminiService.generateResponse(
        input,
        activeSkillIds,
        customSkills,
        history,
        { 
          useSearch, 
          thinkingLevel: currentModel === ModelId.PRO ? undefined : thinkingMode 
        },
        (chunk) => {
          setMessages(prev => {
            const last = [...prev];
            const msg = last[last.length - 1];
            if (msg.role === 'model') {
              msg.content += chunk;
              msg.modelName = geminiService.getCurrentModel();
            }
            return last;
          });
        }
      );

      setMessages(prev => {
        saveCurrentSession(prev);
        return prev;
      });
      setCurrentModel(geminiService.getCurrentModel());
      
    } catch (error: any) {
      setMessages(prev => [
        ...prev, 
        { role: 'model', content: `**Error:** ${error.message || "An unexpected error occurred."}` }
      ]);
    } finally {
      setIsLoading(false);
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
    <div className="flex h-screen bg-surface-dark text-[#e0e0e0] font-sans overflow-hidden">
      {/* Sidebar - Context & Skills Navigation */}
      <aside className="w-64 border-r border-border-dim bg-[#08080a] flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8 group cursor-pointer" onClick={createNewSession}>
            <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-110 transition-transform">GG</div>
            <h1 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">DevGenie AI</h1>
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
        
        <div className="mt-auto p-4 border-t border-border-dim bg-[#0a0a0c]">
          <div className="flex justify-between items-center mb-1.5 opacity-60">
            <span className="text-[9px] font-mono text-zinc-600 tracking-tighter uppercase">Memory Status</span>
            <span className="text-[9px] font-mono text-cyan-400">Stable</span>
          </div>
          <div className="w-full bg-border-dim h-0.5 rounded-full overflow-hidden">
            <div className="bg-cyan-500 h-full w-[45%]" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent">
        {view === 'chat' ? (
          <>
            <header className="h-14 border-b border-border-dim flex items-center justify-between px-8 bg-surface-dark/80 backdrop-blur-md z-10 shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-[#555] tracking-widest uppercase">ID: {currentSessionId || 'NEW_STREAM'}</span>
                <div className="h-3 w-px bg-border-dim" />
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-green-500/80 uppercase tracking-tighter transition-all">Engine Linked</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-[#121216] border border-[#222] rounded text-[9px] font-mono">
                  <Cpu size={10} className="text-cyan-500" />
                  <span className="text-zinc-400">{currentModel}</span>
                </div>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4">
              <div className="max-w-4xl mx-auto pb-32">
                {messages.length === 0 ? (
                  <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center opacity-40">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
                      <Terminal size={32} className="text-zinc-600" />
                    </div>
                    <h2 className="text-xl font-mono text-zinc-400 uppercase tracking-widest mb-2">Terminal Initialization...</h2>
                    <p className="text-xs font-mono text-zinc-600">Awaiting user input sequence</p>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <ChatMessage 
                      key={i} 
                      role={m.role} 
                      content={m.content} 
                      modelName={m.modelName} 
                      imageUrl={m.imageUrl}
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
            <div className="absolute bottom-0 left-0 right-0 p-8 pointer-events-none">
              <div className="max-w-4xl mx-auto pointer-events-auto">
                <div className="bg-[#0d0d0f] border border-[#222] rounded-2xl p-4 shadow-2xl relative transition-all focus-within:border-cyan-800/50 shadow-cyan-500/5 group scale-in-center">
                  
                  {/* Context Control Bar */}
                  <div className="flex items-center gap-4 mb-4 border-b border-border-dim pb-3">
                    <div className="flex items-center gap-2">
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
                    </div>

                    <div className="h-4 w-px bg-zinc-800" />
                    
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

                  <form onSubmit={handleSubmit} className="flex items-end gap-3">
                    <textarea 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Input development command or 'Generate image of...'"
                      className="bg-transparent flex-1 resize-none font-mono text-[13px] leading-relaxed outline-none min-h-[40px] max-h-48 custom-scrollbar py-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                    />
                    <button 
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-lg",
                        (isLoading || !input.trim()) && "opacity-20 grayscale cursor-not-allowed"
                      )}
                    >
                      <Send size={18} strokeWidth={2.5} />
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
    </div>
  );
}
