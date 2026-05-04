import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { User, Bot, Terminal, Pencil, Check, X, FileText, Link as LinkIcon, Copy, History, RotateCcw, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Attachment } from '@/services/geminiService';

const FilePreview = ({ attachment }: { attachment: Attachment }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!attachment.content) return null;

  const isText = attachment.type.includes('text') || 
                 attachment.type.includes('javascript') || 
                 attachment.type.includes('typescript') || 
                 attachment.type.includes('json') ||
                 attachment.type.includes('markdown') ||
                 attachment.type === 'code' ||
                 attachment.type === 'repo';

  if (!isText) return null;

  return (
    <div className="w-full mt-2 border border-zinc-800/50 rounded-xl overflow-hidden bg-zinc-950/20">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-mono text-zinc-500 hover:bg-zinc-800/20 transition-all border-b border-zinc-800/30"
      >
        <div className="flex items-center gap-2">
          <Eye size={12} className="text-cyan-500" />
          <span className="uppercase tracking-widest font-bold">{attachment.name}</span>
          <span className="text-[8px] text-zinc-700">({attachment.type})</span>
        </div>
        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-[#0d0d0f]">
              <pre className="text-[11px] font-mono leading-relaxed text-zinc-400 overflow-x-auto custom-scrollbar max-h-64">
                {attachment.content}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ChatMessageProps {
  role: 'user' | 'model';
  content: string;
  modelName?: string;
  imageUrl?: string;
  onEdit?: (newContent: string) => void;
  onRevert?: (version: string) => void;
  attachments?: Attachment[];
  history?: string[];
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, modelName, imageUrl, onEdit, onRevert, attachments, history = [] }) => {
  const isUser = role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const theme = localStorage.getItem('dg_theme') || 'midnight';

  const handleSave = () => {
    if (editValue.trim() !== content) {
      onEdit?.(editValue);
    }
    setIsEditing(false);
  };

  const getThemeClasses = () => {
    switch(theme) {
      case 'cyberpunk':
        return {
          card: !isUser ? "bg-[#080808] border-[#00ffcc]/30 shadow-[#00ffcc]/5" : "",
          avatar: isUser ? "border-[#00ffcc]/20 bg-[#00ffcc]/5 text-[#00ffcc]" : "border-[#00ffcc] bg-[#00ffcc]/10 text-[#00ffcc]",
          text: !isUser ? "text-[#00ffcc]/90" : "text-[#00ffcc]/70",
          modelTag: "bg-[#00ffcc]/10 text-[#00ffcc] border-[#00ffcc]/20"
        };
      case 'monochrome':
        return {
          card: !isUser ? "bg-[#181818] border-zinc-700 shadow-none" : "",
          avatar: isUser ? "border-zinc-800 bg-zinc-900 text-zinc-500" : "border-white bg-white text-black",
          text: !isUser ? "text-zinc-200" : "text-zinc-500",
          modelTag: "bg-zinc-800 text-zinc-400 border-zinc-700"
        };
      default:
        return {
          card: !isUser ? "bg-surface-card border-border-dim shadow-xl" : "",
          avatar: isUser ? "border-zinc-800 bg-[#0a0a0c] text-zinc-500" : "border-cyan-700/50 bg-cyan-900/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]",
          text: !isUser ? "text-zinc-200" : "text-zinc-400",
          modelTag: "bg-cyan-950/30 text-cyan-500/60 border-cyan-900/30"
        };
    }
  };

  const handleEditClick = () => {
    setEditValue(content);
    setIsEditing(true);
  };

  const themeClasses = getThemeClasses();

  return (
    <div className={cn(
      "flex w-full gap-4 p-8 transition-all animate-in fade-in slide-in-from-bottom-2 group",
      isUser ? "bg-transparent" : "bg-transparent"
    )}>
      <div className="flex-shrink-0">
        <div className={cn(
          "w-8 h-8 rounded border flex items-center justify-center transition-all shadow-sm",
          themeClasses.avatar
        )}>
          <span className="text-[10px] font-bold uppercase tracking-tighter">
            {isUser ? "USR" : "GG"}
          </span>
        </div>
      </div>
      
      <div className={cn(
        "flex-1 min-w-0 relative",
        themeClasses.card,
        !isUser && "p-5 rounded-2xl"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {!isUser && (
              <span className={cn("text-[10px] font-mono font-bold tracking-widest uppercase", theme === 'cyberpunk' ? "text-[#00ffcc]" : "text-cyan-500/80")}>
                DevGenie
              </span>
            )}
            {isUser && (
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-zinc-500">
                Neural Probe
              </span>
            )}
            {modelName && (
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-mono italic", themeClasses.modelTag)}>
                USING {modelName}
              </span>
            )}
          </div>

          {isUser && !isEditing && (
            <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
               {history.length > 0 && (
                <button 
                  onClick={() => setShowHistoryModal(!showHistoryModal)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-600 hover:text-amber-400 relative"
                  title="View History"
                >
                  <History size={12} />
                  <span className="absolute -top-1 -right-1 bg-amber-500/20 text-amber-500 text-[8px] px-1 rounded-full">{history.length}</span>
                </button>
              )}
              <button 
                onClick={handleEditClick}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-600 hover:text-cyan-400"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
        </div>
        
        {/* History Quick View */}
        <AnimatePresence>
          {showHistoryModal && history.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-inner"
            >
              <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Edit Archive</span>
                <span className="text-[8px] font-mono text-zinc-700">{history.length} Previous States</span>
              </div>
              <div className="max-h-48 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {history.map((ver, vIdx) => (
                  <div key={vIdx} className="group/ver p-2 bg-[#0d0d0f] rounded border border-zinc-800/50 hover:border-zinc-700 transition-all">
                    <div className="text-[11px] text-zinc-500 line-clamp-2 italic mb-2">"{ver}"</div>
                    <button 
                      onClick={() => {
                        onRevert?.(ver);
                        setShowHistoryModal(false);
                      }}
                      className="text-[9px] font-bold uppercase text-amber-500/60 hover:text-amber-500 flex items-center gap-1 transition-all"
                    >
                      <RotateCcw size={10} /> Restore This State
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="markdown-body prose prose-invert max-w-none text-sm leading-relaxed">
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-xl p-4 text-sm font-mono focus:border-cyan-500 outline-none min-h-[120px] resize-y shadow-inner"
                autoFocus
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors shadow-lg shadow-cyan-900/20"
                >
                  <Check size={14} /> Commit Changes
                </button>
                <button 
                  onClick={() => { setIsEditing(false); setEditValue(content); }}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors"
                >
                  <X size={14} /> Discard
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <div className="mb-4 last:mb-0">{children}</div>,
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    const [copied, setCopied] = React.useState(false);

                    const handleCopy = () => {
                      navigator.clipboard.writeText(codeString);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    };

                    if (!inline) {
                      return (
                        <div className="relative group/code my-4">
                          <div className="absolute right-3 top-3 z-10 opacity-0 group-hover/code:opacity-100 transition-opacity">
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              initial={false}
                              animate={copied ? { scale: [1, 1.1, 1] } : {}}
                              onClick={handleCopy}
                              className={cn(
                                "flex items-center gap-1.5 p-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all backdrop-blur-sm",
                                copied 
                                  ? "bg-green-500/20 border-green-500/50 text-green-400 px-3" 
                                  : "bg-zinc-900/80 border-zinc-700/50 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800"
                              )}
                            >
                              <AnimatePresence mode="wait">
                                {copied ? (
                                  <motion.div 
                                    key="check"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    className="flex items-center gap-1.5"
                                  >
                                    <Check size={12} strokeWidth={3} />
                                    <span>Copied!</span>
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="copy"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                  >
                                    <Copy size={12} strokeWidth={2.5} />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.button>
                          </div>
                          <pre className={cn("overflow-x-auto p-4 rounded-xl bg-[#0d0d0f] border border-zinc-800/50 font-mono text-[13px] custom-scrollbar", className)}>
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    }

                    return (
                      <code className={cn("bg-zinc-800/50 px-1.5 py-0.5 rounded text-cyan-400/90 font-mono text-[0.9em]", className)} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {content}
              </ReactMarkdown>
              {attachments && attachments.length > 0 && (
                <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-zinc-800/50">
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 bg-[#0c0c0e] border border-zinc-800 px-2 py-1 rounded text-[10px] font-mono text-zinc-400">
                        {a.type === 'repo' ? <LinkIcon size={10} className="text-purple-500" /> : <FileText size={10} className="text-cyan-500" />}
                        <span className="truncate max-w-[150px]">{a.name}</span>
                      </div>
                    ))}
                  </div>
                  {attachments.map((a, i) => (
                    <FilePreview key={i} attachment={a} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {imageUrl && (
          <div className="mt-4 rounded-lg overflow-hidden border border-border-dim shadow-2xl">
            <img 
              src={imageUrl} 
              alt="AI Generated" 
              className="w-full h-auto object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </div>
    </div>
  );
};
