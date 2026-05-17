import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TransparencyDashboard } from '../components/TransparencyDashboard';
import { transparencyLogger } from '../utils/transparencyLogger';
import { findSkillSuggestions } from '../utils/skillMatcher';
import { getAutocompleteSuggestion } from '../utils/autocompleteEngine';
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
  ChevronUp,
  RefreshCw,
  Info,
  Bot,
  Search,
  Copy,
  Brain,
  Image as ImageIcon,
  Video as VideoIcon,
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
  Settings,
  Sun,
  Zap,
  Globe,
  Activity,
  Network,
  ArrowDown,
  Wind,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  geminiService, 
  DEFAULT_SKILLS, 
  ModelId, 
  Skill, 
  ChatSession, 
  Message,
  Attachment,
  Provider,
  PROVIDER_CONFIGS,
  ModelMetrics
} from '@/services/geminiService';
import { githubService } from '../services/githubService';
import { ChatMessage } from '@/components/ChatMessage';
import { cn } from '@/lib/utils';
import { ThinkingLevel } from '@google/genai';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';

const ICON_MAP: Record<string, any> = { Code2, Palette, Server, Cpu, Database, Cloud, Shield };

const PROVIDER_ICONS: Record<string, any> = {
  [Provider.GOOGLE]: Bot,
  [Provider.OPENAI]: Zap,
  [Provider.ANTHROPIC]: Layers,
  [Provider.XAI]: Shield,
  [Provider.GROQ]: Activity,
  [Provider.NVIDIA]: Cpu,
  [Provider.OPENROUTER]: Globe,
  [Provider.TOGETHER]: Network,
  [Provider.CEREBRAS]: Server,
  [Provider.DEEPSEEK]: Search,
  [Provider.MISTRAL]: Wind
};

interface ApiKey {
  name: string;
  key: string;
  id: string;
  provider: Provider;
  models?: string[];
  limit?: number; // Daily token limit
  usage?: number; // Current day usage
  lastReset?: number; // Timestamp of last roll
}

interface UserContext {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  customInstructions?: string | null;
  isGuest?: boolean;
}

export default function DevEngine() {
  const [user, setUser] = useState<UserContext | null>(null);
  
  // Persistence States
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('dg_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [customSkills, setCustomSkills] = useState<Skill[]>(() => {
    const saved = localStorage.getItem('dg_custom_skills');
    return saved ? JSON.parse(saved) : [];
  });
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(() => {
    const saved = localStorage.getItem('dg_api_keys');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((k: any) => ({
        ...k,
        provider: k.provider || Provider.GOOGLE,
        limit: k.limit || 500000,
        usage: k.usage || 0,
        lastReset: k.lastReset || Date.now()
      }));
    } catch (e) {
      return [];
    }
  });
  const [activeKeyId, setActiveKeyId] = useState<string>(() => localStorage.getItem('dg_active_key_id') || '');
  
  // Model Queue Sync
  useEffect(() => {
    const activeKey = apiKeys.find(k => k.id === activeKeyId);
    if (activeKey && activeKey.models && activeKey.models.length > 0) {
      geminiService.setCustomQueue(activeKey.models);
    } else {
      geminiService.resetQueue();
    }
    // Force currentModel state to sync with the new queue OR restore from persistence
    const savedModel = localStorage.getItem('dg_current_model');
    const currentQueue = geminiService.getCurrentQueue();
    if (savedModel && currentQueue.includes(savedModel)) {
      setCurrentModel(savedModel);
    } else {
      setCurrentModel(geminiService.getCurrentModel());
    }
  }, [activeKeyId, apiKeys]);

  const [theme, setTheme] = useState<'midnight' | 'cyberpunk' | 'monochrome' | 'light'>(() => 
    (localStorage.getItem('dg_theme') as any) || 'midnight'
  );

  // Active Session State
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // UI & Input States
  const [input, setInput] = useState('');
  const [suggestedSkills, setSuggestedSkills] = useState<Skill[]>([]);
  const [autocompleteSuggestion, setAutocompleteSuggestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>([]);
  const [modelSearch, setModelSearch] = useState('');
  const [usages, setUsages] = useState<Record<string, number>>(() => geminiService.getAllUsage());
  const [currentModel, setCurrentModel] = useState<string>(() => {
    try {
      return localStorage.getItem('dg_current_model') || geminiService.getCurrentModel();
    } catch (e) {
      return geminiService.getCurrentModel();
    }
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isSkillsExpanded, setIsSkillsExpanded] = useState(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [isEditingSkill, setIsEditingSkill] = useState<Skill | null>(null);
  const [isImportingGithub, setIsImportingGithub] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [validationStatus, setValidationStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyVal, setNewKeyVal] = useState('');
  const [newKeyLimit, setNewKeyLimit] = useState(500000);
  const [newKeyProvider, setNewKeyProvider] = useState<Provider>(Provider.GOOGLE);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'keys' | 'context' | 'theme' | 'performance'>('keys');
  const [metrics, setMetrics] = useState<Record<string, ModelMetrics>>({});
  const [repoUrl, setRepoUrl] = useState('');
  
  const activeKey = apiKeys.find(k => k.id === activeKeyId);
  const activeApiKey = activeKey?.key || '';

  // Update Page Title based on current session
  useEffect(() => {
    if (currentSessionId && sessions.length > 0) {
      const currentSession = sessions.find(s => s.id === currentSessionId);
      if (currentSession && currentSession.title) {
        document.title = `${currentSession.title} | DevEngine`;
        return;
      }
    }
    document.title = "Dashboard | DevEngine";
  }, [currentSessionId, sessions]);

  // Initial Data Fetch
  useEffect(() => {
    document.title = "Dashboard | DevEngine";
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('session');
        if (!token) return;
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (e) {
        console.error("Failed to fetch user context", e);
      }
    };
    fetchUser();
  }, []);

  // Persistence Sync
  useEffect(() => {
    try {
      localStorage.setItem('dg_api_keys', JSON.stringify(apiKeys));
    } catch (e) {}
  }, [apiKeys]);

  useEffect(() => {
    try {
      localStorage.setItem('dg_active_key_id', activeKeyId);
    } catch (e) {}
  }, [activeKeyId]);

  useEffect(() => {
    try {
      localStorage.setItem('dg_theme', theme);
    } catch (e) {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('dg_current_model', currentModel);
    } catch (e) {}
  }, [currentModel]);
  
  useEffect(() => {
    const checkReset = () => {
      const now = Date.now();
      setApiKeys(prev => prev.map(k => {
        const lastDate = new Date(k.lastReset || 0).toDateString();
        const currentDate = new Date(now).toDateString();
        if (lastDate !== currentDate) {
          return { ...k, usage: 0, lastReset: now };
        }
        return k;
      }));
    };
    checkReset();
    const interval = setInterval(checkReset, 1000 * 60 * 60); // Check every hour
    return () => clearInterval(interval);
  }, []);
  const [thinkingMode, setThinkingMode] = useState<string>('none');
  const [useSearch, setUseSearch] = useState(false);
  const [showTransparency, setShowTransparency] = useState(false);
  
  // Abort Control
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modals / Views
  const [view, setView] = useState<'chat' | 'skills'>('chat');
  const [showHistory, setShowHistory] = useState(false);
  const [newSkillPrompt, setNewSkillPrompt] = useState('');
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto Scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Sync Persistence
  useEffect(() => {
    try {
      localStorage.setItem('dg_sessions', JSON.stringify(sessions));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn("Storage quota reached. Pruning sessions...");
        // Auto-prune logic: remove oldest sessions until it fits or only 1 remains
        const pruneSessions = async () => {
          let currentSessions = [...sessions];
          while (currentSessions.length > 1) {
            currentSessions.pop(); // Remove oldest
            try {
              localStorage.setItem('dg_sessions', JSON.stringify(currentSessions));
              setSessions(currentSessions);
              console.log("Pruned oldest session to save space.");
              return;
            } catch (innerE) {
              // Continue pruning
            }
          }
          // If still failing with 1 session, try stripping media
          if (currentSessions.length === 1) {
            currentSessions[0].messages = currentSessions[0].messages.map(m => ({
              ...m,
              imageUrl: undefined,
              videoUrl: undefined
            }));
            try {
              localStorage.setItem('dg_sessions', JSON.stringify(currentSessions));
              setSessions(currentSessions);
              console.warn("Stripped media data from current session to save space.");
            } catch (finalE) {
              console.error("Extreme quota failure: could not even save one stripped session.");
            }
          }
        };
        pruneSessions();
      } else {
        console.error("Persistence error:", e);
      }
    }
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('dg_custom_skills', JSON.stringify(customSkills));
  }, [customSkills]);

  // Usage & Metrics Polling
  useEffect(() => {
    const interval = setInterval(() => {
      setUsages(geminiService.getAllUsage());
      setMetrics(geminiService.getAllMetrics());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Skill Suggestions Hook
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const allAvailableSkills = [...DEFAULT_SKILLS, ...customSkills];
        const matches = findSkillSuggestions(input, allAvailableSkills);
        setSuggestedSkills(matches.filter(s => !activeSkillIds.includes(s.id)));
      } catch(e) {
        setSuggestedSkills([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [input, customSkills, activeSkillIds]);

  // Autocomplete Hook
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const suggestion = await getAutocompleteSuggestion(input);
        if (isMounted) {
          setAutocompleteSuggestion(suggestion);
        }
      } catch(e) {
        if (isMounted) setAutocompleteSuggestion('');
      }
    }, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [input]);

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
      if (!msg) return prev;
      
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

  const handleToggleRepoModal = () => {
    if (!isRepoModalOpen && input.includes('github.com/')) {
      const match = input.match(/https?:\/\/github\.com\/[^/\s]+\/[^/\s]+/);
      if (match) {
        setRepoUrl(match[0]);
        setValidationStatus({ type: 'success', message: 'GITHUB URL DETECTED & TRANSFERRED' });
        setTimeout(() => setValidationStatus(null), 2000);
      }
    }
    setIsRepoModalOpen(!isRepoModalOpen);
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

  const handleCopyFullChat = async () => {
    if (messages.length === 0) return;

    const transcript = messages
      .filter(m => m.role && m.content)
      .map(m => {
        const rolePrefix = m.role === 'user' ? 'USER' : 'AI';
        const modelInfo = m.modelName ? ` [${m.modelName}]` : '';
        const timestamp = m.id.includes('-') ? new Date(parseInt(m.id.split('-').pop() || '0')).toLocaleTimeString() : '';
        
        let content = m.content;
        
        // Include attachment info if present
        if (m.attachments && m.attachments.length > 0) {
          const attachmentsList = m.attachments.map(a => `[Attachment: ${a.name}]`).join(' ');
          content = `${attachmentsList}\n${content}`;
        }

        return `--- ${rolePrefix}${modelInfo} ${timestamp} ---\n${content}\n`;
      })
      .join('\n');

    try {
      await navigator.clipboard.writeText(transcript);
      setValidationStatus({ type: 'success', message: 'FULL TRANSCRIPT COPIED TO CLIPBOARD' });
      setTimeout(() => setValidationStatus(null), 3000);
    } catch (err) {
      console.error('Failed to copy transcript:', err);
      setValidationStatus({ type: 'error', message: 'FAILED TO COPY TRANSCRIPT' });
      setTimeout(() => setValidationStatus(null), 3000);
    }
  };

  const handleImageGen = async (prompt: string, sessionId?: string) => {
    if (isLoading) return;
    setIsLoading(true);
    
    const tempId = `img-temp-${Date.now()}`;
    const initialMsg: Message = { 
      id: tempId,
      role: 'model', 
      content: `*Generating neural vision for: "${prompt}"...*` 
    };
    
    setMessages(prev => [...prev, initialMsg]);

    try {
      transparencyLogger.log(
        'Task Execution',
        `Initializing Image Generation node`,
        { prompt }
      );

      const imageUrl = await geminiService.generateImage(prompt, activeApiKey);
      const finalMsg: Message = { 
        id: `img-${Date.now()}`,
        role: 'model', 
        content: `Neural vision integrated. Prompt: "${prompt}"`,
        imageUrl 
      };
      
      setMessages(prev => {
        const next = prev.map(m => m.id === tempId ? finalMsg : m);
        // Important: save sessions after state is updated to avoid race conditions
        setTimeout(() => {
          try {
            saveCurrentSession(next, sessionId);
          } catch (e) {
            console.error("Session persistence failure", e);
          }
        }, 50);
        return next;
      });
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === tempId ? {
        ...m,
        content: `**Neural Link Failure:** ${err.message}`
      } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoGen = async (prompt: string, sessionId?: string) => {
    if (isLoading) return;
    setIsLoading(true);
    
    const tempId = `vid-temp-${Date.now()}`;
    const startTime = Date.now();
    const initialMsg: Message = { 
      id: tempId,
      role: 'model', 
      content: `*Initializing temporal motion for: "${prompt}"...*\n[Progress: 0%] (Est: 90s remaining)` 
    };
    
    setMessages(prev => [...prev, initialMsg]);

    try {
      transparencyLogger.log(
        'Task Execution',
        `Initializing Video Generation node (Temporal synthesis)`,
        { prompt }
      );

      const videoUrl = await geminiService.generateVideo(
        prompt, 
        activeApiKey,
        (status, percentage) => {
          const elapsed = Date.now() - startTime;
          let estRemaining = "";
          if (percentage > 0) {
            const totalEst = (elapsed / percentage) * 100;
            const remaining = Math.max(0, totalEst - elapsed);
            estRemaining = ` (Est: ${Math.ceil(remaining / 1000)}s remaining)`;
          }
          setMessages(prev => prev.map(m => m.id === tempId ? {
            ...m,
            content: `*${status} for: "${prompt}"...*\n[Progress: ${percentage}%]${estRemaining}`
          } : m));
        }
      );
      const finalMsg: Message = { 
        id: `vid-${Date.now()}`,
        role: 'model', 
        content: `Temporal synthesis complete. Prompt: "${prompt}"`,
        videoUrl 
      };
      
      setMessages(prev => {
        const next = prev.map(m => m.id === tempId ? finalMsg : m);
        setTimeout(() => {
          try {
            saveCurrentSession(next, sessionId);
          } catch (e) {
            console.error("Session persistence failure", e);
          }
        }, 50);
        return next;
      });
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === tempId ? {
        ...m,
        content: `**Temporal De-sync Error:** ${err.message}`
      } : m));
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
      } else if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // Handle media and PDFs as data URLs for multi-modal context
        try {
          const reader = new FileReader();
          const content = await new Promise<string>((resolve, reject) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          });
          newAttachments.push({
            name: file.name,
            content: content,
            type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream')
          });
        } catch (e) {
          console.error("Binary read failure:", e);
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

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      onDrop(files);
    }
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
      const info = await githubService.getRepoInfo(repoUrl);
      if (info) {
        const repoContent: Attachment = {
          name: `Repo: ${info.owner}/${info.name}`,
          content: githubService.formatRepoSummary(info),
          type: 'repo'
        };
        setAttachments(prev => [...prev, repoContent]);
        setIsRepoModalOpen(false);
        setValidationStatus({ type: 'success', message: `Neural map of ${info.name} added.` });
        
        transparencyLogger.log(
          'Learning',
          `Parsed repository neural map from GitHub: ${info.owner}/${info.name}`,
          { url: `https://github.com/${info.owner}/${info.name}` }
        );

        setTimeout(() => setValidationStatus(null), 3000);
      } else {
        throw new Error("Could not fetch repo info");
      }
      setRepoUrl('');
    } catch (err: any) {
      setValidationStatus({ type: 'error', message: err.message || 'GitHub link validation failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!input.trim() || isEnhancingPrompt) return;
    setIsEnhancingPrompt(true);
    try {
      transparencyLogger.log(
        'Analysis',
        `Enhancing prompt complexity and structure`,
        { originalLength: input.length }
      );
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

    // Immediately update UI to prevent "holding" old content
    setIsLoading(true);
    if (!overrideMessages) {
      setInput('');
      const currentAttachments = [...attachments];
      // Keep repo attachments in the UI for persistence
      setAttachments(currentAttachments.filter(a => a.type === 'repo'));
      
      const processedInput = targetInput;
      
      abortControllerRef.current = new AbortController();

      // Auto-detect GitHub URL and suggest attachment if repo is mentioned
      let finalAttachments = currentAttachments;
      if (targetInput.includes('github.com/') && !currentAttachments.some(a => a.type === 'repo')) {
        try {
          const info = await githubService.getRepoInfo(targetInput);
          if (info) {
            const repoContent: Attachment = {
              name: `Context: ${info.owner}/${info.name}`,
              content: githubService.formatRepoSummary(info),
              type: 'repo'
            };
            finalAttachments = [...currentAttachments, repoContent];
            // Also append this auto-detected repo to persistent state
            setAttachments(prev => [...prev.filter(a => a.type === 'repo'), repoContent]);
            setValidationStatus({ type: 'success', message: `Neural Link established with ${info.name}` });
            
            transparencyLogger.log(
              'Research/Retrieval',
              `Retrieved repository context from GitHub: ${info.owner}/${info.name}`,
              { url: `https://github.com/${info.owner}/${info.name}` }
            );

            setTimeout(() => setValidationStatus(null), 3000);
          }
        } catch (e: any) {
          console.warn("Auto-repo detection failed", e);
          if (e.message) {
            setValidationStatus({ type: 'error', message: e.message });
            setTimeout(() => setValidationStatus(null), 3000);
          }
        }
      }

      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = `session-${Date.now()}`;
        setCurrentSessionId(sessionId);
      }

      const nonRepoAttachments = finalAttachments.filter(a => a.type !== 'repo');
      
      const userMessage: Message = { 
        id: `msg-${Date.now()}`,
        role: 'user', 
        content: processedInput,
        attachments: nonRepoAttachments.length > 0 ? nonRepoAttachments : undefined,
        editHistory: []
      };
      
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      saveCurrentSession(newMessages, sessionId);

      // Simple Intent Detection for Image/Video Gen
      if (isImageMode || processedInput.toLowerCase().startsWith('generate image')) {
        await handleImageGen(processedInput.replace(/generate image/i, '').trim() || processedInput, sessionId);
        return;
      }
      
      if (isVideoMode || processedInput.toLowerCase().startsWith('generate video')) {
        await handleVideoGen(processedInput.replace(/generate video/i, '').trim() || processedInput, sessionId);
        return;
      }

      let mainActionId: string | undefined;
      try {
        transparencyLogger.clear();
        mainActionId = transparencyLogger.log(
          'Analysis', 
          `Initializing neural generation process for model: ${currentModel}`,
          {
             model: currentModel,
             provider: activeKey?.provider,
             useSearch,
             thinkingLevel: currentModel === ModelId.PRO ? undefined : (thinkingMode !== 'none' ? thinkingMode as any : undefined)
          },
          'active'
        );

        if (useSearch) {
          transparencyLogger.log(
            'Research/Retrieval',
            'Authorized external Google Search access requested',
            { domains: ['*.google.com'] }
          );
        }

        const effectiveModel = currentModel === ModelId.HYBRID ? geminiService.getCurrentModel() : currentModel;
        const assistantMessage: Message = { 
          id: `msg-${Date.now() + 1}`,
          role: 'model', 
          content: '', 
          modelName: `${effectiveModel}${activeKey ? ` (${activeKey.name})` : ''}`
        };
        
        setMessages(prev => [...prev, assistantMessage]);

        const history = newMessages
          .filter(m => m && m.role && m.content)
          .map((m, index) => {
            const parts: any[] = [{ text: m.content }];
            if (m.attachments) {
              parts.push(...m.attachments.map(a => geminiService.attachmentToPart(a)));
            }
            // Inject persistent repo sync into the current API interaction
            if (index === newMessages.length - 1 && m.role === 'user') {
               const repoAttachments = finalAttachments.filter(a => a.type === 'repo');
               parts.push(...repoAttachments.map(a => geminiService.attachmentToPart(a)));
            }
            return {
              role: m.role,
              parts: parts
            };
          });

        await geminiService.generateResponse(
          processedInput,
          activeSkillIds,
          customSkills,
          history,
          { 
            model: currentModel,
            useSearch, 
            thinkingLevel: currentModel === ModelId.PRO ? undefined : (thinkingMode !== 'none' ? thinkingMode as any : undefined),
            signal: abortControllerRef.current.signal,
            attachments: userMessage.attachments,
            customKey: activeKey?.key,
            provider: activeKey?.provider,
            customInstructions: user?.customInstructions,
            onModelSwitch: (newModel) => {
              try {
                setCurrentModel(newModel);
                setMessages(prev => {
                  const last = [...prev];
                  const msg = last[last.length - 1];
                  if (msg && msg.role === 'model') {
                    msg.modelName = `${newModel}${activeKey ? ` (${activeKey.name})` : ''}`;
                    const modelParts = (newModel || '').split('-');
                    const modelSuffix = modelParts.length > 2 ? modelParts[2] : modelParts[modelParts.length - 1];
                    msg.content += `\n\n*(Auto-failover: Switched to ${modelSuffix} due to limits)*`;
                  }
                  return last;
                });
              } catch (e) {
                console.error("Model switch handling failed", e);
              }
            },
            onTokenUpdate: (tokens) => {
              if (activeKeyId) {
                setApiKeys(prev => prev.map(k => k.id === activeKeyId ? { ...k, usage: (k.usage || 0) + tokens } : k));
              }
            }
          },
          (fullContent) => {
            setMessages(prev => {
              const last = [...prev];
              const msg = last[last.length - 1];
              if (msg && msg.role === 'model') {
                msg.content = fullContent;
                const currentEffective = currentModel === ModelId.HYBRID ? geminiService.getCurrentModel() : currentModel;
                msg.modelName = `${currentEffective}${activeKey ? ` (${activeKey.name})` : ''}`;
              }
              return last;
            });
          }
        );

        setUsages(geminiService.getAllUsage());

        setMessages(prev => {
          saveCurrentSession(prev, sessionId);
          return prev;
        });
        setCurrentModel(geminiService.getCurrentModel());
        
      } catch (error: any) {
        if (mainActionId) transparencyLogger.updateAction(mainActionId, { status: 'failed' });
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
        if (mainActionId) transparencyLogger.updateAction(mainActionId, { status: 'completed' });
        setIsLoading(false);
      }
    } else {
      // Handle overrideMessages (edit case)
      // Similar logic but don't clear input
        let mainRetryActionId: string | undefined;
        try {
          mainRetryActionId = transparencyLogger.log(
            'Analysis', 
            `Retrying neural generation sequence`,
            { model: currentModel },
            'active'
          );
        abortControllerRef.current = new AbortController();
        const processedInput = targetInput;
        
        let sessionId = currentSessionId;
        if (!sessionId) {
          sessionId = `session-${Date.now()}`;
          setCurrentSessionId(sessionId);
        }

        const effectiveModel = currentModel === ModelId.HYBRID ? geminiService.getCurrentModel() : currentModel;
        const assistantMessage: Message = { 
          id: `msg-${Date.now() + 1}`,
          role: 'model', 
          content: '', 
          modelName: `${effectiveModel}${activeKey ? ` (${activeKey.name})` : ''}`
        };
        
        setMessages(prev => [...prev.slice(0, overrideMessages.length), assistantMessage]);

        const history = overrideMessages
          .filter(m => m && m.role && m.content)
          .map((m, index) => {
            const parts: any[] = [{ text: m.content }];
            if (m.attachments) {
              parts.push(...m.attachments.map(a => geminiService.attachmentToPart(a)));
            }
            // Inject persistent repo sync into the current API interaction
            if (index === overrideMessages.length - 1 && m.role === 'user') {
               const repoAttachments = attachments.filter(a => a.type === 'repo');
               parts.push(...repoAttachments.map(a => geminiService.attachmentToPart(a)));
            }
            return { role: m.role, parts: parts };
          });

        await geminiService.generateResponse(
          processedInput,
          activeSkillIds,
          customSkills,
          history,
          { 
            model: currentModel,
            useSearch, 
            thinkingLevel: currentModel === ModelId.PRO ? undefined : (thinkingMode !== 'none' ? thinkingMode as any : undefined),
            signal: abortControllerRef.current.signal,
            customKey: activeKey?.key,
            provider: activeKey?.provider,
            customInstructions: user?.customInstructions,
            onTokenUpdate: (tokens) => {
              if (activeKeyId) {
                setApiKeys(prev => prev.map(k => k.id === activeKeyId ? { ...k, usage: (k.usage || 0) + tokens } : k));
              }
            }
          },
          (fullContent) => {
            setMessages(prev => {
              const last = [...prev];
              const msg = last[last.length - 1];
              if (msg && msg.role === 'model') {
                msg.content = fullContent;
              }
              return last;
            });
          }
        );

        setUsages(geminiService.getAllUsage());
        setMessages(prev => {
          saveCurrentSession(prev, sessionId);
          return prev;
        });
      } catch (error: any) {
        if (mainRetryActionId) transparencyLogger.updateAction(mainRetryActionId, { status: 'failed' });
        setMessages(prev => [
          ...prev, 
          { id: `err-${Date.now()}`, role: 'model', content: `**Error:** ${error.message || "An unexpected error occurred."}` }
        ]);
      } finally {
        if (mainRetryActionId) transparencyLogger.updateAction(mainRetryActionId, { status: 'completed' });
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleEditSkill = (skill: Skill) => {
    setIsEditingSkill(skill);
  };

  const saveSkillEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingSkill) return;

    if (isEditingSkill.isCustom) {
      setCustomSkills(prev => prev.map(s => s.id === isEditingSkill.id ? isEditingSkill : s));
    } else {
      setCustomSkills(prev => {
        const exists = prev.find(s => s.id === isEditingSkill.id);
        if (exists) return prev.map(s => s.id === isEditingSkill.id ? isEditingSkill : s);
        return [...prev, { ...isEditingSkill, isCustom: true }];
      });
    }
    setIsEditingSkill(null);
    setValidationStatus({ type: 'success', message: 'Neural path reconfigured successfully' });
    setTimeout(() => setValidationStatus(null), 2000);
  };

  const handleGithubImport = async () => {
    if (!githubUrl) return;
    setIsImportingGithub(true);
    try {
      const info = await githubService.getRepoInfo(githubUrl);
      if (info) {
        setValidationStatus({ type: 'success', message: `Importing ${info.name} neural structure...` });
        const newSkill: Skill = {
          id: `gh-${Date.now()}`,
          name: `GH: ${info.name}`,
          description: info.description,
          systemPrompt: `Act as a specialized AI imported from GitHub repository: ${info.owner}/${info.name}. 
          Repository Summary:
          ${githubService.formatRepoSummary(info)}
          `,
          icon: 'Cloud',
          isCustom: true
        };
        setCustomSkills(prev => [...prev, newSkill]);
        setGithubUrl('');
        setValidationStatus({ type: 'success', message: `GitHub Neural Pattern Integrated: ${info.name}` });
      } else {
        throw new Error("Invalid repository path");
      }
    } catch (err: any) {
      setValidationStatus({ type: 'error', message: err.message || 'GitHub integration failed: Unreachable path' });
    } finally {
      setIsImportingGithub(false);
      setTimeout(() => setValidationStatus(null), 3000);
    }
  };

  const handleCreateSkill = async () => {
    if (!newSkillPrompt.trim() || isCreatingSkill) return;
    setIsCreatingSkill(true);
    try {
      const newSkill = await geminiService.createSkillFromPrompt(newSkillPrompt, activeApiKey);
      setCustomSkills(prev => [...prev, newSkill]);
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
      "flex h-screen text-[#e0e0e0] font-sans overflow-hidden transition-all duration-500",
      theme === 'midnight' && "bg-surface-dark",
      theme === 'cyberpunk' && "bg-[#050505] text-[#00ffcc] selection:bg-[#00ffcc] selection:text-black",
      theme === 'monochrome' && "bg-[#111] text-zinc-400 selection:bg-zinc-700 selection:text-white",
      theme === 'light' && "bg-[#f8fafc] text-slate-900 selection:bg-cyan-100 selection:text-slate-900"
    )}>
      <input {...getInputProps()} />
      {/* Sidebar - Context & Skills Navigation */}
      <aside className={cn(
        "border-r flex flex-col shrink-0 transition-all duration-300 relative",
        theme === 'midnight' && "bg-[#08080a] border-white/5",
        theme === 'cyberpunk' && "bg-[#050505] border-[#00ffcc]/20",
        theme === 'monochrome' && "bg-white border-black/10",
        theme === 'light' && "bg-white border-slate-200",
        isSidebarCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-64 opacity-100"
      )}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8 group">
            <div className="flex items-center gap-2 cursor-pointer" onClick={createNewSession}>
              <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-110 transition-transform">GG</div>
              <h1 className={cn(
                "text-sm font-semibold uppercase tracking-widest transition-colors",
                theme === 'light' ? "text-slate-400 group-hover:text-slate-900" : "text-zinc-500 group-hover:text-white"
              )}>DevGenie AI</h1>
            </div>
          </div>
          
          <nav className="space-y-1">
            <button 
              onClick={() => setView('chat')}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded text-xs font-mono transition-all",
                view === 'chat' 
                  ? (theme === 'light' ? "bg-cyan-50 text-cyan-600 border border-cyan-200 shadow-sm" : "bg-cyan-900/20 text-cyan-400 border border-cyan-800/30") 
                  : (theme === 'light' ? "text-slate-500 hover:text-slate-900 hover:bg-slate-50" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50")
              )}
            >
              <MessageSquare size={14} />
              Terminals
            </button>
            <button 
              onClick={() => setView('skills')}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded text-xs font-mono transition-all",
                view === 'skills' 
                  ? (theme === 'light' ? "bg-purple-50 text-purple-600 border border-purple-200 shadow-sm" : "bg-purple-900/20 text-purple-400 border border-purple-800/30") 
                  : (theme === 'light' ? "text-slate-500 hover:text-slate-900 hover:bg-slate-50" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50")
              )}
            >
              <Sparkles size={14} />
              Skills Lab
            </button>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded text-xs font-mono transition-all",
                showHistory 
                  ? (theme === 'light' ? "bg-slate-200 text-slate-900" : "bg-zinc-800 text-white") 
                  : (theme === 'light' ? "text-slate-500 hover:text-slate-900 hover:bg-slate-50" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50")
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
                          currentSessionId === s.id 
                            ? (theme === 'light' ? "bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm" : "bg-[#121216] border-[#222] text-zinc-200") 
                            : (theme === 'light' ? "text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-100" : "text-zinc-500 border-transparent hover:bg-zinc-900/50")
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
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2 mb-4">
            <div className="flex items-center justify-between mb-2 sticky top-0 bg-[#0a0a0c] z-10 py-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Neural Sync</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-700 uppercase">
                {activeKeyId ? 'Custom_Link' : 'System_Node'}
              </span>
            </div>
            
            {geminiService.getCurrentQueue().map(model => {
              const usageVal = usages[model] || 0;
              const isHeavy = usageVal > 90;
              return (
                <div key={model} className="space-y-1.5 group" title={`Current usage for ${model}: ${usageVal.toFixed(1)}%`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-mono text-zinc-500 group-hover:text-cyan-400/80 transition-colors uppercase tracking-tighter truncate max-w-[140px]">
                        {model.split('/').pop()?.replace('gemini-1.5-', '').replace('gemini-3.1-', '')}
                      </span>
                      {isHeavy && <AlertTriangle size={8} className="text-red-500 animate-pulse" />}
                    </div>
                    <span className={cn(
                      "text-[9px] font-mono",
                      isHeavy ? "text-red-500" : "text-cyan-500/80"
                    )}>{Math.round(usageVal)}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden shadow-inner border border-white/5">
                    <div 
                      className={cn(
                        "h-full transition-all duration-700 ease-out",
                        usageVal > 90 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" : 
                        usageVal > 50 ? "bg-amber-500/80" : 
                        "bg-cyan-500/80"
                      )}
                      style={{ width: `${usageVal}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-border-dim/30">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-mono text-zinc-600 tracking-tighter uppercase font-bold">Node Integrity</span>
              <span className="text-[8px] font-mono text-green-500 uppercase tracking-widest">Optimized</span>
            </div>
            <div className="w-full bg-zinc-950 h-0.5 rounded-full overflow-hidden">
              <div className="bg-green-500/40 h-full w-[85%] animate-pulse" />
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
            "absolute left-4 top-1/2 -translate-y-1/2 z-50 w-6 h-12 rounded-full flex items-center justify-center transition-all shadow-2xl border",
            theme === 'light' 
              ? "bg-white border-slate-200 text-slate-400 hover:text-cyan-600" 
              : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-cyan-400",
            isSidebarCollapsed ? "left-4 rotate-180" : "-left-3"
          )}
        >
          <ChevronLeft size={14} />
        </button>

        {view === 'chat' ? (
          <>
            <header className={cn(
              "h-16 border-b flex items-center justify-between px-4 sm:px-8 backdrop-blur-md z-10 shrink-0 transition-all",
              theme === 'midnight' && "bg-surface-dark/80 border-white/5",
              theme === 'cyberpunk' && "bg-[#050505]/80 border-[#00ffcc]/20",
              theme === 'monochrome' && "bg-white/80 border-black/10",
              theme === 'light' && "bg-white/80 border-slate-200"
            )}>
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <span className={cn(
                  "text-[9px] sm:text-[10px] font-mono tracking-widest uppercase truncate",
                  theme === 'light' ? "text-slate-400" : "text-[#555]"
                )}>
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
                  <span className={cn(
                    "text-[9px] sm:text-[10px] font-mono uppercase tracking-tighter transition-all",
                    theme === 'light' ? "text-green-600" : "text-green-500/80"
                  )}>
                    NEURAL LINK: {activeKey ? 'ENCRYPTED_CUSTOM' : 'SYSTEM_NODE'}
                  </span>
                  {activeApiKey && <Shield size={10} className="text-cyan-500 animate-pulse" />}
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
                      {currentModel === ModelId.HYBRID ? "HYBRID AUTO" : 
                       [ModelId.PRO, ModelId.FLASH, ModelId.LITE].includes(currentModel as any) 
                         ? (currentModel === ModelId.PRO ? "PRO 3.1" : currentModel === ModelId.FLASH ? "FLASH 3.0" : "LITE 3.1")
                         : (currentModel || '').split('/').pop()?.replace('gemini-', '').toUpperCase() || 'UNKNOWN'}
                    </span>
                    <span className="text-zinc-300 font-bold uppercase tracking-tight xs:hidden">
                      {currentModel === ModelId.HYBRID ? "HYB" : 
                       [ModelId.PRO, ModelId.FLASH, ModelId.LITE].includes(currentModel as any)
                         ? (currentModel === ModelId.PRO ? "PRO" : currentModel === ModelId.FLASH ? "FLS" : "LTE")
                         : "EXT"}
                    </span>
                    <ChevronDown size={10} className={cn("text-zinc-600 transition-transform duration-300", isModelSelectorOpen && "rotate-180 text-cyan-400")} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isModelSelectorOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40 bg-transparent" 
                          onClick={() => setIsModelSelectorOpen(false)}
                        />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full right-0 mt-3 w-48 sm:w-64 bg-[#0d0d0f] border border-zinc-800 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
                        >
                                    <div className="p-3 border-b border-zinc-800 bg-zinc-900/30 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Neural Compute Unit</span>
                                        <button onClick={() => setIsModelSelectorOpen(false)} className="text-zinc-700 hover:text-zinc-400">
                                          <X size={10} />
                                        </button>
                                      </div>
                                      <div className="relative">
                                        <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                                        <input 
                                          type="text"
                                          placeholder="Filter neural nodes..."
                                          value={modelSearch}
                                          onChange={(e) => setModelSearch(e.target.value)}
                                          className="w-full bg-black/40 border border-zinc-800 rounded-lg pl-7 pr-3 py-1.5 text-[9px] font-mono outline-none focus:border-cyan-500/30 transition-all text-zinc-300"
                                          autoFocus
                                        />
                                      </div>
                                    <p className="text-[8px] text-zinc-600 leading-tight">
                                      {activeApiKey ? "Custom Neural Link active. Discovered nodes shown below." : "Switch backend processing engine for optimized response."}
                                    </p>
                                  </div>
                                  <div className="p-1.5 space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {[
                                      { id: ModelId.HYBRID, name: 'Hybrid Node', desc: 'Auto-rotating failover mechanism', color: 'text-amber-400', bg: 'hover:bg-amber-500/5' },
                                      ...geminiService.getCurrentQueue().map(id => ({
                                        id,
                                        name: id === ModelId.PRO ? 'Pro 3.1' : id === ModelId.FLASH ? 'Flash 3.0' : id === ModelId.LITE ? 'Lite 3.1' : id.replace('models/', '').toUpperCase(),
                                        desc: [ModelId.PRO, ModelId.FLASH, ModelId.LITE].includes(id as any) 
                                          ? (id === ModelId.PRO ? 'Complex reasoning' : id === ModelId.FLASH ? 'Real-time task' : 'Low-latency logic')
                                          : 'External Discovered Node',
                                        color: id === ModelId.PRO ? 'text-cyan-400' : id === ModelId.FLASH ? 'text-purple-400' : 'text-zinc-300',
                                        bg: 'hover:bg-cyan-500/5'
                                      }))
                                    ].filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.id.toLowerCase().includes(modelSearch.toLowerCase()))
                                     .map((m) => (
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
                                          <span className={cn("text-[11px] font-bold uppercase tracking-tight", m.color)}>{m.name}</span>
                                          {currentModel === m.id && <Sparkles size={10} className="text-cyan-500" />}
                                        </div>
                                        <p className="text-[8px] text-zinc-600 leading-relaxed pointer-events-none italic truncate">{m.id}</p>
                                      </button>
                                    ))}
                                  </div>
                      </motion.div>
                    </>
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

                <div className="h-4 w-px bg-zinc-800 hidden xs:block" />

                <button 
                  onClick={() => setShowTransparency(true)}
                  className="p-2 hover:bg-green-500/20 rounded-xl text-green-500 hover:text-green-400 transition-all border border-transparent hover:border-green-500/30 active:scale-90"
                  title="Model Transparency Dashboard"
                >
                  <Shield size={16} />
                </button>

                <div className="h-4 w-px bg-zinc-800 hidden xs:block" />
                
                <button 
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={cn(
                    "p-2 rounded-xl transition-all border outline-none active:scale-90 flex items-center gap-1.5",
                    autoScroll 
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]" 
                      : "hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 border-transparent hover:border-zinc-800"
                  )}
                  title={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
                >
                  <ArrowDown size={14} className={cn("transition-transform", autoScroll ? "animate-bounce" : "")} />
                  <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline-block">Auto Scroll</span>
                </button>

                <button 
                  onClick={handleCopyFullChat}
                  disabled={messages.length === 0}
                  className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all border border-transparent hover:border-zinc-800 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Copy Full Transcript"
                >
                  <Copy size={16} />
                </button>

                <div className="h-4 w-px bg-zinc-800 hidden xs:block" />

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end hidden sm:flex cursor-pointer" onClick={() => { setSettingsTab('profile'); setShowSettings(true); }}>
                    <span className={cn("text-xs font-bold leading-tight", theme === 'light' ? "text-slate-900" : "text-white")}>
                      {user?.name || user?.email?.split('@')[0] || 'User'}
                    </span>
                    <span className={cn("text-[9px] font-mono", theme === 'light' ? "text-slate-500" : "text-zinc-500")}>
                      {user?.isGuest ? 'Guest Session' : 'Verified'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem('session');
                      navigate('/');
                    }}
                    className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-xs font-bold uppercase transition-colors"
                  >
                    Logout
                  </button>
                </div>

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
                      theme={theme}
                      modelName={m.modelName} 
                      imageUrl={m.imageUrl}
                      videoUrl={m.videoUrl}
                      onEdit={(content) => handleEditMessage(i, content)}
                      onRevert={(content) => handleRevertMessage(i, content)}
                      attachments={m.attachments}
                      history={m.editHistory}
                      isLatest={i === messages.filter(msg => msg).length - 1}
                      isLoading={isLoading}
                      userName={user?.name}
                      userAvatarUrl={user?.avatarUrl}
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
              <div className="max-w-4xl mx-auto pointer-events-auto relative">
                {suggestedSkills.length > 0 && (
                  <div className={cn(
                    "absolute bottom-full left-0 mb-4 w-full z-50 rounded-2xl border p-1 shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-bottom-2",
                    theme === 'light' ? "bg-white/95 border-slate-200" : "bg-black/95 border-zinc-800"
                  )}>
                     <div className="px-3 py-2 flex items-center gap-2 mb-1 border-b border-white/5">
                        <Sparkles size={12} className="text-cyan-500" />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Suggested Skills</span>
                     </div>
                    {suggestedSkills.map(skill => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => {
                          toggleSkill(skill.id);
                          setSuggestedSkills([]);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl flex items-center gap-4 transition-colors group",
                          theme === 'light' ? "hover:bg-slate-100" : "hover:bg-white/5"
                        )}
                      >
                        {ICON_MAP[skill.icon] ? React.createElement(ICON_MAP[skill.icon], { size: 16, className: "text-zinc-500 group-hover:text-cyan-400 transition-colors shrink-0" }) : <Code2 size={16} className="text-zinc-500 group-hover:text-cyan-400 transition-colors shrink-0" />}
                        <div>
                          <div className={cn(
                            "text-sm font-bold font-mono tracking-wide group-hover:text-cyan-400 transition-colors",
                            theme === 'light' ? "text-slate-800" : "text-zinc-300"
                          )}>{skill.name}</div>
                          <div className="text-xs text-zinc-500 font-mono mt-1 opacity-80 truncate max-w-2xl">{skill.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
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
                <div className={cn(
                  "backdrop-blur-3xl border rounded-[2rem] p-2 relative transition-all focus-within:ring-2 group scale-in-center shadow-2xl",
                  theme === 'light' 
                    ? "bg-white border-slate-200 focus-within:ring-cyan-500/20" 
                    : "bg-[#0f0f12]/95 border-white/5 focus-within:ring-cyan-500/30",
                  theme === 'cyberpunk' && "border-[#00ffcc]/20 focus-within:ring-[#00ffcc]/20"
                )}>
                  {/* Background containment */}
                  <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
                    {theme !== 'light' && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/[0.03] to-transparent pointer-events-none" />
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10 opacity-0 group-focus-within:opacity-100 blur-2xl transition-opacity duration-1000 pointer-events-none" />
                      </>
                    )}
                  </div>
                  
                  {/* Attachments List */}
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 p-3 relative z-10">
                      {attachments.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl group/att animate-in zoom-in-95 duration-200 hover:border-cyan-500/20">
                          <FileText size={12} className="text-cyan-400/80" />
                          <span className="text-[10px] font-mono text-zinc-300 truncate max-w-[120px]">{a.name}</span>
                          <button onClick={() => removeAttachment(i)} className="text-zinc-600 hover:text-red-400 transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-1 relative z-10">
                      <div className={cn(
                        "flex items-center justify-between px-3 pt-2 pb-3 mb-2",
                        theme === 'light' ? "border-b border-slate-100" : "border-b border-white/5"
                      )}>
                        <div className="flex items-center gap-3 flex-1 flex-wrap">
                          <div className={cn(
                            "flex flex-wrap rounded-xl border p-1 shrink-0 shadow-inner max-w-full",
                            theme === 'light' ? "bg-slate-50 border-slate-100" : "bg-black/60 border-white/5"
                          )}>
                          <button 
                            onClick={() => setIsSkillsExpanded(!isSkillsExpanded)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-1.5 rounded-full transition-all text-[10px] font-bold uppercase tracking-wider shrink-0",
                              isSkillsExpanded ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            <Sparkles size={12} />
                            Skills
                          </button>
                          
                          <button 
                            onClick={() => setUseSearch(!useSearch)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-1.5 rounded-full transition-all text-[10px] font-bold uppercase tracking-wider",
                              useSearch ? "bg-zinc-800 text-cyan-400 shadow-inner" : "text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            <Search size={12} />
                            Search
                          </button>

                          <div className="relative">
                            <button 
                              onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                              className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-full transition-all text-[10px] font-bold uppercase tracking-wider",
                                isModelSelectorOpen ? "bg-cyan-500 text-black px-5" : "text-zinc-500 hover:text-zinc-300"
                              )}
                            >
                              <Cpu size={12} />
                              {currentModel === ModelId.HYBRID ? "Hybrid" : 
                               [ModelId.PRO, ModelId.FLASH, ModelId.LITE].includes(currentModel as any) 
                                 ? (currentModel === ModelId.PRO ? "Pro" : currentModel === ModelId.FLASH ? "Flash" : "Lite")
                                 : (currentModel || '').split('/').pop()?.replace('gemini-', '').toUpperCase() || 'UNKNOWN'}
                            </button>
                          </div>

                          {/* Deep Mode Toggle */}
                          <div className={cn(
                            "flex items-center rounded-full transition-all border relative group/deep",
                            thinkingMode !== 'none' ? "bg-zinc-900 border-zinc-700" : "bg-transparent border-transparent"
                          )}>
                            <button 
                              onClick={() => setThinkingMode(thinkingMode === 'none' ? 'low' : 'none')}
                              className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-full transition-all text-[10px] font-bold uppercase tracking-wider",
                                thinkingMode !== 'none' ? "text-amber-500 shadow-inner" : "text-zinc-500 hover:text-zinc-300"
                              )}
                            >
                              <Brain size={12} />
                              Deep
                            </button>
                            
                            {thinkingMode !== 'none' && (
                              <div className="flex items-center border-l border-zinc-800 pr-1 pl-1 cursor-pointer">
                                <span className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-amber-500/80 outline-none p-1 pointer-events-none">
                                  {thinkingMode.replace('_', ' ')}
                                </span>
                                <ChevronDown size={10} className="text-amber-500/50 -ml-1 pointer-events-none" />
                                
                                {/* Custom Dropdown Menu (opens upwards to avoid input collision) */}
                                <div className="absolute left-0 bottom-full mb-2 w-32 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover/deep:opacity-100 group-hover/deep:visible transition-all z-50 overflow-hidden flex flex-col">
                                  {['low', 'medium', 'high', ...(currentModel !== ModelId.PRO ? ['extra_high'] : [])].map((level) => (
                                    <button
                                      key={level}
                                      onClick={() => setThinkingMode(level)}
                                      className={cn(
                                        "px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-white/5",
                                        thinkingMode === level ? "text-amber-500 bg-black/20" : "text-zinc-400"
                                      )}
                                    >
                                      {level.replace('_', ' ')}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={cn(
                          "flex items-center gap-1.5 overflow-x-auto custom-scrollbar transition-all duration-500 no-scrollbar",
                          isSkillsExpanded ? "max-w-[400px] opacity-100 px-2" : "max-w-0 opacity-0 px-0"
                        )}>
                          {[...DEFAULT_SKILLS, ...customSkills].map(skill => {
                            const Icon = ICON_MAP[skill.icon] || Code2;
                            const isActive = activeSkillIds.includes(skill.id);
                            return (
                              <button
                                key={skill.id}
                                onClick={() => toggleSkill(skill.id)}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[9px] font-bold uppercase tracking-widest whitespace-nowrap",
                                  isActive 
                                    ? "bg-cyan-950/30 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]" 
                                    : "bg-transparent border-transparent text-zinc-600 hover:text-zinc-400"
                                )}
                              >
                                <Icon size={10} />
                                {skill.name.split(' ')[0]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
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
                          className="p-2 text-zinc-600 hover:text-zinc-300 transition-colors hover:bg-white/5 rounded-full"
                          title="Attach Files"
                        >
                          <Paperclip size={16} />
                        </button>
                        <button 
                          onClick={handleToggleRepoModal}
                          className={cn(
                            "p-2 transition-all rounded-full hover:bg-white/5",
                            isRepoModalOpen ? "text-purple-400" : "text-zinc-600 hover:text-purple-400/80"
                          )}
                          title="Link Repository"
                        >
                          <Github size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            if (isImageMode) {
                              setIsImageMode(false);
                            } else {
                              setIsImageMode(true);
                              setIsVideoMode(false);
                              setValidationStatus({ type: 'success', message: "NEURAL VISION MODE ENABLED" });
                              setTimeout(() => setValidationStatus(null), 2000);
                            }
                          }}
                          className={cn(
                            "p-2 transition-all rounded-full hover:bg-white/5",
                            isImageMode ? "text-pink-400 bg-pink-400/10" : "text-zinc-600 hover:text-pink-400"
                          )}
                          title={isImageMode ? "Cancel Image Generation" : "Enable Image Generation"}
                        >
                          <ImageIcon size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            if (isVideoMode) {
                              setIsVideoMode(false);
                            } else {
                              setIsVideoMode(true);
                              setIsImageMode(false);
                              setValidationStatus({ type: 'success', message: "NEURAL MOTION MODE ENABLED" });
                              setTimeout(() => setValidationStatus(null), 2000);
                            }
                          }}
                          className={cn(
                            "p-2 transition-all rounded-full hover:bg-white/5",
                            isVideoMode ? "text-amber-400 bg-amber-400/10" : "text-zinc-600 hover:text-amber-400"
                          )}
                          title={isVideoMode ? "Cancel Video Generation" : "Enable Video Generation"}
                        >
                          <VideoIcon size={16} />
                        </button>
                      </div>
                    </div>

                    <form 
                      onSubmit={handleSubmit} 
                      className={cn(
                        "flex items-end gap-3 p-1 rounded-2xl transition-all",
                        theme === 'light' ? "bg-slate-50/50" : "bg-black/20"
                      )}
                    >
                        <div className={cn(
                          "flex-1 rounded-2xl border transition-all p-2 relative shadow-inner",
                          theme === 'light' 
                            ? "bg-white border-slate-200 focus-within:border-cyan-500/50" 
                            : "bg-black/60 border-white/5 focus-within:border-cyan-500/30"
                        )}>
                          <div className={cn(
                            "flex items-center justify-between mb-1 px-2 relative z-10",
                            theme === 'light' ? "border-b border-slate-50 pb-1" : ""
                          )}>
                          <div className="flex gap-3 items-center h-4">
                            {activeSkillIds.length > 0 ? (
                              activeSkillIds.slice(0, 3).map(id => {
                                const skill = [...DEFAULT_SKILLS, ...customSkills].find(s => s.id === id);
                                return (
                                <span key={id} className="text-[9px] font-mono font-bold text-cyan-500/40 uppercase tracking-tighter flex items-center gap-1.5 hover:text-cyan-400 transition-colors cursor-default" title={skill?.name || id}>
                                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/20 shadow-[0_0_5px_rgba(6,182,212,0.3)]" />
                                  {skill ? skill.name : id.split('-')[0]}
                                </span>
                              )})
                            ) : (
                               <span className="text-[9px] font-mono text-zinc-800 uppercase tracking-widest font-bold">Standard Compute</span>
                            )}
                          </div>
                          <button 
                            type="button"
                            onClick={handleEnhancePrompt}
                            disabled={!input.trim() || isEnhancingPrompt}
                            className={cn(
                              "p-1.5 rounded-lg transition-all active:scale-95",
                              isEnhancingPrompt ? "text-amber-400 animate-spin" : "text-zinc-600 hover:text-cyan-400 hover:bg-white/5"
                            )}
                            title="Neural Refinement"
                          >
                            <Sparkles size={14} />
                          </button>
                        </div>
                        <textarea 
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onPaste={handlePaste}
                          placeholder="Inject system commands..."
                          className={cn(
                            "bg-transparent w-full resize-none font-mono text-sm leading-relaxed outline-none min-h-[48px] max-h-64 custom-scrollbar px-2 py-1 relative z-10 transition-colors",
                            theme === 'light' ? "placeholder:text-slate-300 text-slate-800" : "placeholder:text-zinc-800 text-zinc-200"
                          )}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab' && autocompleteSuggestion) {
                              e.preventDefault();
                              setInput(input + autocompleteSuggestion);
                              setAutocompleteSuggestion('');
                            } else if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmit();
                            }
                          }}
                        />
                        {autocompleteSuggestion && (
                          <div className={cn(
                            "absolute right-2 bottom-2 flex items-center gap-1 z-20 pointer-events-none text-xs truncate max-w-[200px] sm:max-w-[300px]",
                            theme === 'light' ? "text-slate-400" : "text-zinc-500"
                          )}>
                            <span className="truncate opacity-50">{autocompleteSuggestion}</span>
                            <kbd className={cn(
                              "text-[9px] font-sans px-1.5 py-0.5 rounded ml-1 border shrink-0",
                              theme === 'light' ? "bg-slate-100 border-slate-200 text-slate-500" : "bg-zinc-800 border-zinc-700 text-zinc-400"
                            )}>Tab</kbd>
                          </div>
                        )}
                      </div>
                      
                      <button 
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="w-14 h-14 rounded-2xl bg-cyan-600 text-black flex items-center justify-center transition-all enabled:hover:bg-cyan-400 enabled:hover:scale-[1.02] enabled:active:scale-95 disabled:opacity-10 shadow-[0_0_40px_rgba(6,182,212,0.15)] mb-0.5 border border-cyan-400/20 group/send"
                      >
                        <Terminal size={24} strokeWidth={2.5} className="group-hover/send:rotate-12 transition-transform" />
                      </button>
                    </form>
                  </div>

                  <AnimatePresence>
                    {isRepoModalOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full right-0 mb-4 w-80 bg-[#0f0f12]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] p-5 z-50 overflow-hidden"
                      >
                         <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />
                        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2">
                            <Github size={16} className="text-purple-400" />
                            <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">Repository Sync</span>
                          </div>
                          <button onClick={() => setIsRepoModalOpen(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="space-y-4 relative z-10">
                          <div className="bg-black/60 rounded-xl border border-white/5 p-1 focus-within:border-purple-500/30 transition-all">
                            <input 
                              type="text"
                              placeholder="https://github.com/owner/repo"
                              value={repoUrl}
                              onChange={(e) => setRepoUrl(e.target.value)}
                              className="w-full bg-transparent px-4 py-3 text-xs font-mono outline-none text-purple-300 placeholder:text-zinc-700"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddRepo();
                                }
                              }}
                              autoFocus
                            />
                          </div>
                          <button 
                            onClick={handleAddRepo}
                            disabled={isLoading || !repoUrl.trim()}
                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 disabled:opacity-20 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_10px_20px_rgba(0,0,0,0.3)] shadow-purple-900/10"
                          >
                            {isLoading ? 'Establishing Link...' : 'Link Repository'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
              <section className={cn(
                "p-8 rounded-2xl shadow-xl relative overflow-hidden group border",
                theme === 'light' ? "bg-white border-slate-200" : "bg-surface-card border-border-dim"
              )}>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                  <Sparkles size={120} className={theme === 'light' ? "text-slate-200" : ""} />
                </div>
                <div className="relative z-10">
                  <h2 className={cn(
                    "text-sm font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2",
                    theme === 'light' ? "text-slate-500" : "text-zinc-300"
                  )}>
                    <Plus size={16} className="text-cyan-500" />
                    Automated Neural Structuring
                  </h2>
                  <div className="flex gap-4">
                    <input 
                      value={newSkillPrompt}
                      onChange={(e) => setNewSkillPrompt(e.target.value)}
                      placeholder="Describe a specialized role (e.g. Kubernetes Cluster Architect)..."
                      className={cn(
                        "flex-1 border rounded-lg px-4 py-3 text-sm font-mono outline-none focus:border-cyan-500 transition-colors shadow-inner",
                        theme === 'light' ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-surface-dark border-zinc-800 text-zinc-100"
                      )}
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
                  
                  <div className="mt-8 pt-8 border-t border-white/5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                      <Github size={14} />
                      External Intelligence Bridge
                    </h3>
                    <div className="flex gap-3">
                      <div className="flex-1 bg-black/40 rounded-xl border border-white/5 p-1 focus-within:border-purple-500/30 transition-all">
                        <input 
                          type="text"
                          placeholder="GitHub Repository URL (Intelligence Pattern)"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          className="w-full bg-transparent px-4 py-3 text-xs font-mono outline-none text-purple-300 placeholder:text-zinc-700"
                        />
                      </div>
                      <button 
                        onClick={handleGithubImport}
                        disabled={isImportingGithub || !githubUrl}
                        className="px-6 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                      >
                        {isImportingGithub ? "Importing..." : "Bridge Pattern"}
                      </button>
                    </div>
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
                        isActive 
                          ? (theme === 'light' ? "bg-cyan-50 border-cyan-200 shadow-[0_10px_30px_rgba(6,182,212,0.1)]" : "bg-cyan-900/10 border-cyan-800/50 shadow-[0_0_30px_rgba(6,182,212,0.05)]") 
                          : (theme === 'light' ? "bg-white border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-200" : "bg-transparent border-zinc-800/30 opacity-40 grayscale hover:opacity-100 hover:border-zinc-700")
                      )}
                    >
                      {skill.isCustom && (
                        <button 
                          onClick={(e) => removeCustomSkill(e, skill.id)}
                          className={cn(
                            "absolute top-4 right-4 transition-colors p-2",
                            theme === 'light' ? "text-slate-300 hover:text-red-500" : "text-zinc-700 hover:text-red-500"
                          )}
                        >
                          <X size={14} />
                        </button>
                      )}
                      <div className="flex items-start gap-5">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                          isActive ? "bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "bg-zinc-800 text-zinc-600"
                        )}>
                          <Icon size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1.5 ">
                            <h3 className={cn(
                              "font-bold transition-colors uppercase tracking-tight truncate",
                              theme === 'light' ? "text-slate-700 group-hover:text-cyan-600" : "text-zinc-200 group-hover:text-white"
                            )}>{skill.name}</h3>
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-500 whitespace-nowrap">
                              {(currentModel || '').split('/').pop() || 'UNKNOWN'}
                            </span>
                          </div>
                          <p className={cn(
                            "text-[11px] leading-relaxed font-mono line-clamp-2",
                            theme === 'light' ? "text-slate-400" : "text-zinc-500"
                          )}>{skill.description}</p>
                        </div>
                      </div>
                      <div className="mt-6 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                           <div className="flex items-center gap-2">
                             <div className={cn(
                               "w-1.5 h-1.5 rounded-full",
                               isActive ? "bg-green-500 animate-pulse" : "bg-zinc-700"
                             )} />
                             <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                               {isActive ? "Operational" : "Ready"}
                             </span>
                           </div>
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               handleEditSkill(skill);
                             }}
                             className={cn(
                               "p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all",
                               theme === 'light' && "bg-slate-100 border-slate-200 text-slate-400"
                             )}
                             title="Refactor Path"
                           >
                             <Settings size={12} />
                           </button>
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

      {/* Transparency Dashboard Modal */}
      <TransparencyDashboard 
        isOpen={showTransparency} 
        onClose={() => setShowTransparency(false)} 
        theme={theme}
      />

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm bg-black/60">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn(
                "w-full max-w-xl rounded-3xl p-8 shadow-2xl border transition-all",
                theme === 'light' ? "bg-white border-slate-200" : "bg-surface-card border-border-dim"
              )}
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className={cn("text-xl font-bold uppercase tracking-tight", theme === 'light' ? "text-slate-900" : "text-white")}>System Configuration</h2>
                  <p className={cn("text-xs font-mono mt-1", theme === 'light' ? "text-slate-500" : "text-zinc-500")}>Adjust core neural path parameters</p>
                </div>
                <button 
                  onClick={() => setShowSettings(false)} 
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    theme === 'light' ? "hover:bg-slate-100 text-slate-400" : "hover:bg-zinc-800 text-zinc-500"
                  )}
                >
                  <X size={20} />
                </button>
              </div>

              <div className={cn(
                "flex gap-8 border-b mb-8 overflow-x-auto",
                theme === 'light' ? "border-slate-100" : "border-border-dim"
              )}>
                {['profile', 'keys', 'context', 'theme', 'performance'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSettingsTab(tab as any)}
                    className={cn(
                      "pb-4 text-[10px] whitespace-nowrap font-bold uppercase tracking-widest transition-all",
                      settingsTab === tab 
                        ? (theme === 'light' ? "border-b-2 border-cyan-500 text-slate-900" : "border-b-2 border-cyan-500 text-white") 
                        : (theme === 'light' ? "text-slate-400 hover:text-slate-600" : "text-zinc-500 hover:text-zinc-300")
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                {settingsTab === 'profile' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">User Profile Configuration</label>
                    </div>
                    {user?.isGuest && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs rounded-xl flex items-start gap-2">
                         <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                         <span>You are using a Guest Session. If you log out or clear your cache, your session data might be lost unless a permanent account is created. To upgrade, please log out and authenticate normally. Your data is still stored in the sandbox safely.</span>
                      </div>
                    )}
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                       <div className="space-y-1.5">
                         <label className="text-[8px] font-mono text-zinc-500 uppercase">Registered Email</label>
                         <input 
                           type="text"
                           value={user?.email || ''}
                           disabled
                           className="w-full bg-black/40 border border-zinc-800/50 rounded-xl px-4 py-2.5 text-xs text-zinc-500 font-mono cursor-not-allowed"
                           title="Email cannot be changed"
                         />
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-[8px] font-mono text-zinc-500 uppercase">Display Name</label>
                         <input 
                           type="text"
                           value={user?.name || ''}
                           onChange={(e) => setUser(prev => prev ? { ...prev, name: e.target.value } : null)}
                           className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 text-cyan-100 font-mono transition-all"
                         />
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-[8px] font-mono text-zinc-500 uppercase">System Instructions (Model Personalization)</label>
                         <textarea 
                           value={user?.customInstructions || ''}
                           onChange={(e) => setUser(prev => prev ? { ...prev, customInstructions: e.target.value } : null)}
                           placeholder="e.g. Always respond in markdown... Act like a senior developer..."
                           className="w-full h-24 bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 text-cyan-100 font-mono transition-all resize-none"
                         />
                       </div>
                       <div className="pt-2">
                         <button
                           onClick={async () => {
                             if (!user) return;
                             const token = localStorage.getItem('session');
                             try {
                               const res = await fetch('/api/auth/me', {
                                 method: 'PUT',
                                 headers: {
                                   'Content-Type': 'application/json',
                                   'Authorization': `Bearer ${token}`
                                 },
                                 body: JSON.stringify({ name: user.name, avatarUrl: user.avatarUrl, customInstructions: user.customInstructions })
                               });
                               if (res.ok) {
                                 const updated = await res.json();
                                 setUser(updated);
                                 setValidationStatus({ type: 'success', message: 'Profile updated successfully.' });
                                 setTimeout(() => setValidationStatus(null), 3000);
                               }
                             } catch(e: any) {
                               setValidationStatus({ type: 'error', message: 'Failed to update profile.' });
                               setTimeout(() => setValidationStatus(null), 3000);
                             }
                           }}
                           className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-black rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
                         >
                           Save Profile
                         </button>
                         {validationStatus && (
                            <span className={cn(
                              "text-xs font-mono ml-4", 
                              validationStatus.type === 'success' ? "text-green-400" : "text-red-400"
                            )}>
                              {validationStatus.message}
                            </span>
                         )}
                       </div>
                    </div>
                  </div>
                )}
                {settingsTab === 'performance' && (
                  <div className="space-y-6 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Neural Performance Dashboard</label>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to clear all sessions and keys? This cannot be undone.')) {
                              localStorage.clear();
                              window.location.reload();
                            }
                          }}
                          className="text-[8px] font-mono text-red-500/60 hover:text-red-500 uppercase tracking-tighter border border-red-500/20 px-2 py-0.5 rounded transition-colors"
                        >
                          Purge Neural Cache
                        </button>
                        <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-tighter">Live Neural Feed</span>
                      </div>
                    </div>

                    {/* Storage Metric */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Token Quota Metric */}
                      {activeKey && (
                        <div className="p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Bot size={16} className="text-cyan-400" />
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-tight text-white block">Token Quota</span>
                              <span className="text-[8px] font-mono text-zinc-600 uppercase">{activeKey.name}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={cn(
                              "text-sm font-bold",
                              (activeKey.usage || 0) > (activeKey.limit || 500000) * 0.9 ? "text-red-400" : "text-cyan-300"
                            )}>
                              {((activeKey.usage || 0) / 1000).toFixed(1)}k <span className="text-[10px] text-zinc-600 font-mono">/ {((activeKey.limit || 500000) / 1000).toFixed(0)}k</span>
                            </span>
                            <div className="w-20 h-1 bg-zinc-900 rounded-full mt-1 overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full",
                                  (activeKey.usage || 0) > (activeKey.limit || 500000) * 0.9 ? "bg-red-500" : "bg-cyan-500"
                                )}
                                style={{ width: `${Math.min(100, ((activeKey.usage || 0) / (activeKey.limit || 500000)) * 100)}%` }} 
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Database size={16} className="text-zinc-500" />
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-tight text-white block">Local Storage</span>
                            <span className="text-[8px] font-mono text-zinc-600 uppercase">Neural Sessions</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-zinc-300">
                            {(JSON.stringify(localStorage).length / 1024 / 1024).toFixed(2)} <span className="text-[10px] text-zinc-600 font-mono">MB</span>
                          </span>
                          <div className="w-20 h-1 bg-zinc-900 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-cyan-500/50" 
                              style={{ width: `${Math.min(100, (JSON.stringify(localStorage).length / (5 * 1024 * 1024)) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Zap size={16} className="text-amber-500" />
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-tight text-white block">Sandbox Cache</span>
                            <span className="text-[8px] font-mono text-zinc-600 uppercase">Agent Tool Access</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-amber-500">
                            84% <span className="text-[10px] text-zinc-600 font-mono">/ OPT</span>
                          </span>
                          <div className="w-20 h-1 bg-zinc-900 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-amber-500/50" style={{ width: '84%' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {Object.entries(metrics).length === 0 ? (
                        <div className="p-8 text-center bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-900">
                          <Activity size={24} className="mx-auto mb-3 text-zinc-800" />
                          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">No metrics recorded yet. Engage models to initiate telemetry.</p>
                        </div>
                      ) : (
                        Object.entries(metrics).map(([modelId, data]) => {
                          const isHealthy = data.errorRate < 10;
                          return (
                            <motion.div 
                              key={modelId}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-5 bg-black/40 border border-zinc-900 rounded-2xl group hover:border-cyan-500/20 transition-all"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    isHealthy ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                                  )} />
                                  <span className="text-[11px] font-bold uppercase tracking-tight text-white">{modelId.split('/').pop()}</span>
                                </div>
                                <span className="text-[8px] font-mono text-zinc-600">Last used: {new Date(data.lastUsed).toLocaleTimeString()}</span>
                              </div>

                              <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-1">
                                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest leading-none block">Latency</span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-bold text-cyan-400">{(data.avgResponseTime / 1000).toFixed(2)}</span>
                                    <span className="text-[9px] text-zinc-600 font-mono">s</span>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest leading-none block">Throughput</span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-bold text-amber-500">{Math.round(data.tokenRate)}</span>
                                    <span className="text-[9px] text-zinc-600 font-mono">t/s</span>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest leading-none block">Reliability</span>
                                  <div className="flex items-baseline gap-1">
                                    <span className={cn(
                                      "text-sm font-bold",
                                      isHealthy ? "text-green-400" : "text-red-400"
                                    )}>{(100 - data.errorRate).toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-zinc-700 uppercase">
                                <span>Success: <span className="text-zinc-500">{data.successCount}</span></span>
                                <span>Failures: <span className="text-zinc-500">{data.failureCount}</span></span>
                                <span>Efficiency Index: <span className="text-cyan-500/50">{(data.tokenRate / (data.avgResponseTime / 1000 + 1)).toFixed(2)}</span></span>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
                {settingsTab === 'keys' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Manage API Keys</label>
                          {activeKeyId && (
                            <button 
                              onClick={() => setActiveKeyId('')}
                              className="text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full hover:text-cyan-400 hover:border-cyan-900/50 transition-all flex items-center gap-1 uppercase font-bold tracking-tighter"
                            >
                              <RotateCcw size={8} /> Use System Default
                            </button>
                          )}
                        </div>
                        <button 
                          onClick={() => setIsAddingKey(true)}
                          className="text-[9px] font-mono text-cyan-500 hover:text-cyan-400 uppercase flex items-center gap-1"
                        >
                          <Plus size={10} /> Add New
                        </button>
                      </div>

                      {isAddingKey && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
                          <div className="flex items-center justify-between relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Register Neural Key</h3>
                            <button onClick={() => { setIsAddingKey(false); setValidationStatus(null); }} className="text-zinc-600 hover:text-red-400">
                              <X size={14} />
                            </button>
                          </div>
                          
                          <div className="space-y-3 relative z-10">
                            <div className="space-y-1.5">
                              <label className="text-[8px] font-mono text-zinc-500 uppercase">AI Provider Platform</label>
                              <select 
                                value={newKeyProvider}
                                onChange={(e) => setNewKeyProvider(e.target.value as Provider)}
                                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 text-cyan-100 font-mono appearance-none"
                              >
                                {Object.entries(PROVIDER_CONFIGS).map(([id, config]) => (
                                  <option key={id} value={id} className="bg-zinc-950">{config.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[8px] font-mono text-zinc-500 uppercase">Provider Alias</label>
                                <input 
                                  type="text"
                                  placeholder="Work Key"
                                  value={newKeyName}
                                  onChange={(e) => setNewKeyName(e.target.value)}
                                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 text-cyan-100 placeholder:text-zinc-800 font-mono"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[8px] font-mono text-zinc-500 uppercase">Input Secret Key</label>
                                <input 
                                  type="password"
                                  placeholder={newKeyProvider === Provider.GOOGLE ? "AIzaSy..." : "sk-..."}
                                  value={newKeyVal}
                                  onChange={(e) => setNewKeyVal(e.target.value)}
                                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 text-cyan-100 placeholder:text-zinc-800 font-mono"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[8px] font-mono text-zinc-500 uppercase">Daily Limit (Tokens)</label>
                                <select
                                  id="limit-selector"
                                  value={newKeyLimit}
                                  onChange={(e) => {
                                    setNewKeyLimit(parseInt(e.target.value));
                                  }}
                                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 text-cyan-100 font-mono"
                                >
                                  <option value={100000}>100k</option>
                                  <option value={500000}>500k</option>
                                  <option value={1000000}>1M</option>
                                  <option value={5000000}>5M</option>
                                </select>
                              </div>
                            </div>
                            
                            {validationStatus && (
                              <div className={cn(
                                "p-3 rounded-xl border text-[9px] font-mono animate-in slide-in-from-top-1",
                                validationStatus.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-green-500/10 border-green-500/20 text-green-400"
                              )}>
                                {validationStatus.message}
                              </div>
                            )}

                            <div className="flex gap-2 pt-2">
                              <button 
                                onClick={async () => {
                                  if (!newKeyVal.trim()) {
                                    setValidationStatus({ type: 'error', message: 'ERROR: Key cannot be empty' });
                                    return;
                                  }
                                  setValidationStatus({ type: 'success', message: `CONNECTING TO ${newKeyProvider.toUpperCase()}...` });
                                  const result = await geminiService.checkKey(newKeyVal, newKeyProvider);
                                  if (result.valid) {
                                    const discovered = result.models || [];
                                    setValidationStatus({ type: 'success', message: `SUCCESS: ${discovered.length} NODES DISCOVERED` });
                                    
                                    const keyObj: ApiKey = { 
                                      id: `key-${Date.now()}`, 
                                      name: newKeyName || PROVIDER_CONFIGS[newKeyProvider].name, 
                                      key: newKeyVal,
                                      provider: newKeyProvider,
                                      models: discovered.map(m => m.id),
                                      limit: newKeyLimit,
                                      usage: 0,
                                      lastReset: Date.now()
                                    };
                                    setApiKeys(prev => [...prev, keyObj]);
                                    setActiveKeyId(keyObj.id);
                                    setTimeout(() => {
                                      setIsAddingKey(false);
                                      setNewKeyName('');
                                      setNewKeyVal('');
                                      setValidationStatus(null);
                                    }, 1500);
                                  } else {
                                    setValidationStatus({ type: 'error', message: `REJECTED: ${result.error}` });
                                  }
                                }}
                                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-black rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-[0.98]"
                              >
                                Authenticate & Discover Nodes
                              </button>
                            </div>
                          </div>
                        </motion.div>
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
                            onClick={() => setActiveKeyId(k.id)}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-2xl border transition-all group/key relative overflow-hidden cursor-pointer",
                              activeKeyId === k.id ? "bg-cyan-900/10 border-cyan-500/30 ring-1 ring-cyan-500/20" : "bg-black/40 border-zinc-900 hover:border-zinc-800"
                            )}
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-inner",
                                activeKeyId === k.id ? "bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "bg-zinc-900 text-zinc-600 group-hover/key:bg-zinc-800"
                              )}>
                                {(() => {
                                  const Icon = PROVIDER_ICONS[k.provider] || Shield;
                                  return <Icon size={18} />;
                                })()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={cn("text-xs font-bold uppercase tracking-tight", activeKeyId === k.id ? "text-cyan-400" : "text-zinc-400 transition-colors group-hover/key:text-zinc-200")}>
                                  {k.name} <span className="text-[8px] opacity-40 ml-2 font-mono">[{PROVIDER_CONFIGS[k.provider]?.name || k.provider}]</span>
                                </div>
                                <div className="text-[10px] font-mono text-zinc-600 mt-0.5 tracking-widest truncate">
                                  ••••••••{k.key.slice(-4)}
                                </div>
                                {k.models && (
                                  <div className="text-[8px] font-mono text-cyan-500/50 mt-1 uppercase">
                                    {k.models.length} Nodes Mapped
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setValidationStatus({ type: 'success', message: `INITIATING NEURAL PROBE: CRAWLING ${k.provider.toUpperCase()} QUOTA...` });
                                  const result = await geminiService.checkKey(k.key, k.provider);
                                  if (result.valid) {
                                    const discovered = result.models || [];
                                    const usage = await geminiService.syncUsageFromProvider(k.key, k.provider);
                                    setUsages(usage);
                                    setApiKeys(prev => prev.map(prevK => 
                                      prevK.id === k.id ? { ...prevK, models: discovered.map(m => m.id) } : prevK
                                    ));
                                    setValidationStatus({ type: 'success', message: `SUCCESS: NODE_MAP & QUOTA_CRAWL COMPLETE` });
                                    setTimeout(() => setValidationStatus(null), 2000);
                                  } else {
                                    setValidationStatus({ type: 'error', message: `CRAWL FAILED: ${result.error}` });
                                  }
                                }}
                                className="p-2 text-zinc-700 hover:text-cyan-400 transition-all opacity-0 group-hover/key:opacity-100"
                                title="Crawl exact node usage & nodes"
                              >
                                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                              </button>
                              {activeKeyId === k.id && (
                                <motion.div 
                                  initial={{ opacity: 0, x: 5 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                >
                                  Active
                                </motion.div>
                              )}
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

                      {activeKeyId && apiKeys.find(k => k.id === activeKeyId)?.models && (
                        <div className="pt-6 border-t border-zinc-900/50 space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Node Queue Management</label>
                            <span className="text-[10px] font-mono text-zinc-600">Active Priority</span>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            {(apiKeys.find(k => k.id === activeKeyId)?.models || []).map((modelId, idx) => {
                              const usageVal = usages[modelId] || 0;
                              const isHeavy = usageVal > 90;
                              
                              return (
                                <div key={`${modelId}-${idx}`} className="flex flex-col gap-2 p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl group/node">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <div className="w-6 h-6 rounded-lg bg-zinc-950 flex items-center justify-center text-[10px] font-mono text-zinc-600 font-bold shrink-0">
                                        {idx + 1}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[10px] font-mono text-zinc-300 truncate uppercase tracking-tight">
                                          {modelId.split('/').pop()}
                                        </span>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                            <motion.div 
                                              initial={{ width: 0 }}
                                              animate={{ width: `${usageVal}%` }}
                                              className={cn(
                                                "h-full transition-colors",
                                                isHeavy ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-cyan-500"
                                              )}
                                            />
                                          </div>
                                          <span className={cn(
                                            "text-[8px] font-bold font-mono tracking-tighter",
                                            isHeavy ? "text-red-400" : "text-zinc-500"
                                          )}>
                                            {usageVal.toFixed(0)}%
                                          </span>
                                          {isHeavy && (
                                            <motion.div
                                              animate={{ opacity: [0.4, 1, 0.4] }}
                                              transition={{ repeat: Infinity, duration: 1.5 }}
                                            >
                                              <AlertTriangle size={10} className="text-red-500" />
                                            </motion.div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover/node:opacity-100 transition-opacity">
                                      <button 
                                        disabled={idx === 0}
                                        onClick={() => {
                                          setApiKeys(prev => prev.map(k => {
                                            if (k.id === activeKeyId && k.models) {
                                              const next = [...k.models];
                                              [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
                                              return { ...k, models: next };
                                            }
                                            return k;
                                          }));
                                        }}
                                        className="p-1 text-zinc-600 hover:text-cyan-400 disabled:opacity-30"
                                      >
                                        <ChevronUp size={14} />
                                      </button>
                                      <button 
                                        disabled={idx === (apiKeys.find(k => k.id === activeKeyId)?.models?.length || 1) - 1}
                                        onClick={() => {
                                          setApiKeys(prev => prev.map(k => {
                                            if (k.id === activeKeyId && k.models) {
                                              const next = [...k.models];
                                              [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                                              return { ...k, models: next };
                                            }
                                            return k;
                                          }));
                                        }}
                                        className="p-1 text-zinc-600 hover:text-cyan-400 disabled:opacity-30"
                                      >
                                        <ChevronDown size={14} />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setApiKeys(prev => prev.map(k => {
                                            if (k.id === activeKeyId && k.models) {
                                              return { ...k, models: k.models.filter((_, i) => i !== idx) };
                                            }
                                            return k;
                                          }));
                                        }}
                                        className="p-1 text-zinc-600 hover:text-red-500"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
                   <div className="grid grid-cols-4 gap-4">
                    {(['midnight', 'cyberpunk', 'monochrome', 'light'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={cn(
                          "aspect-video rounded-xl border flex flex-col items-center justify-center gap-2 transition-all p-2",
                          theme === t ? "border-cyan-500 bg-cyan-700/10" : "border-zinc-800 bg-zinc-950/50 grayscale hover:grayscale-0 hover:border-zinc-700"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-lg",
                          t === 'midnight' && "bg-zinc-900",
                          t === 'cyberpunk' && "bg-[#00ffcc]/20 text-[#00ffcc]",
                          t === 'monochrome' && "bg-white text-black",
                          t === 'light' && "bg-cyan-100 text-cyan-600"
                        )}>
                          {t === 'light' ? <Sun size={18} /> : t === 'cyberpunk' ? <Palette size={18} /> : t === 'monochrome' ? <Terminal size={18} /> : <Bot size={18} />}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest">{t === 'monochrome' ? 'Classic' : t === 'light' ? 'Lab Light' : t}</span>
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
        {isEditingSkill && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingSkill(null)}
              className="absolute inset-0 bg-[#050505]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "w-full max-w-lg relative z-10 border rounded-3xl overflow-hidden shadow-2xl",
                theme === 'light' ? "bg-white border-slate-200 text-slate-900" : "bg-[#0f0f12] border-white/10 text-white"
              )}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                   <div>
                    <h2 className="text-xl font-bold uppercase tracking-tighter">Refactor Neural Path</h2>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase mt-1">Adjusting Identity & Prompt Matrix</p>
                  </div>
                  <button onClick={() => setIsEditingSkill(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={saveSkillEdit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold font-mono uppercase text-zinc-500">Identity Identifier</label>
                    <input 
                      type="text"
                      value={isEditingSkill.name}
                      onChange={(e) => setIsEditingSkill({...isEditingSkill, name: e.target.value})}
                      className={cn(
                        "w-full border rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all",
                        theme === 'light' ? "bg-slate-50 border-slate-200 focus:border-cyan-500" : "bg-black/60 border-zinc-800 focus:border-cyan-500"
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold font-mono uppercase text-zinc-500">Node Description</label>
                    <textarea 
                      value={isEditingSkill.description}
                      onChange={(e) => setIsEditingSkill({...isEditingSkill, description: e.target.value})}
                      className={cn(
                        "w-full border rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all h-24 resize-none",
                        theme === 'light' ? "bg-slate-50 border-slate-200 focus:border-cyan-500" : "bg-black/60 border-zinc-800 focus:border-cyan-500"
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold font-mono uppercase text-zinc-500">Neural Programming (Prompt)</label>
                    <textarea 
                      value={isEditingSkill.systemPrompt}
                      onChange={(e) => setIsEditingSkill({...isEditingSkill, systemPrompt: e.target.value})}
                      className={cn(
                        "w-full border rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all h-40 resize-none",
                        theme === 'light' ? "bg-slate-50 border-slate-200 focus:border-cyan-500" : "bg-black/60 border-zinc-800 focus:border-cyan-500"
                      )}
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsEditingSkill(null)}
                      className="flex-1 py-3 px-6 rounded-xl border border-zinc-800 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-900 transition-all text-zinc-400"
                    >
                      Abort
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-3 px-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg"
                    >
                      Commit Changes
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

      {/* Global Validation Toast */}
      <AnimatePresence>
        {validationStatus && (
          <motion.div 
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 20 }}
            className={cn(
              "fixed bottom-6 right-6 z-[200] max-w-xs p-4 rounded-xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 pointer-events-none",
              validationStatus.type === 'error' 
                ? "bg-red-500/10 border-red-500/20 text-red-400" 
                : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                validationStatus.type === 'error' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
              )} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{validationStatus.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
