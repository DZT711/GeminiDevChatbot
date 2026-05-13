import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'motion/react';
import { User, Bot, Terminal, Pencil, Check, X, FileText, Link as LinkIcon, Copy, History, RotateCcw, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Attachment } from '@/services/geminiService';
import { CodePreview } from './CodePreview';
import { ThinkingProcessDrawer } from './ThinkingProcessDrawer';

const FilePreview = ({ attachment }: { attachment: Attachment }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!attachment.content) return null;

  const isText = (attachment.type?.includes('text') || 
                 attachment.type?.includes('javascript') || 
                 attachment.type?.includes('typescript') || 
                 attachment.type?.includes('json') ||
                 attachment.type?.includes('markdown') ||
                 attachment.type === 'code' ||
                 attachment.type === 'repo');

  const isVideo = attachment.type?.includes('video');
  const isImage = attachment.type?.includes('image');

  if (!isText && !isVideo && !isImage) return null;

  return (
    <div className="w-full mt-2 border border-zinc-800/50 rounded-xl overflow-hidden bg-zinc-950/20">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-mono text-zinc-500 hover:bg-zinc-800/20 transition-all border-b border-zinc-800/30"
      >
        <div className="flex items-center gap-2">
          {isVideo ? <Bot size={12} className="text-amber-500" /> : 
           isImage ? <Bot size={12} className="text-pink-500" /> : 
           <Eye size={12} className="text-cyan-500" />}
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
              {isVideo ? (
                <video 
                  src={attachment.content} 
                  controls 
                  className="w-full h-auto aspect-video rounded-lg"
                />
              ) : isImage ? (
                <img 
                  src={attachment.content} 
                  alt={attachment.name} 
                  className="w-full h-auto max-h-[500px] object-contain rounded-lg shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <pre className="text-[11px] font-mono leading-relaxed text-zinc-400 overflow-x-auto custom-scrollbar max-h-64">
                  {attachment.content}
                </pre>
              )}
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
  theme?: string;
  modelName?: string;
  imageUrl?: string;
  videoUrl?: string;
  onEdit?: (newContent: string) => void;
  onRevert?: (version: string) => void;
  attachments?: Attachment[];
  history?: string[];
  isLatest?: boolean;
  isLoading?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, theme = 'midnight', modelName, imageUrl, videoUrl, onEdit, onRevert, attachments, history = [], isLatest = false, isLoading = false }) => {
  const isUser = role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [msgCopied, setMsgCopied] = useState(false);
  
  const [displayedContent, setDisplayedContent] = React.useState(content);

  React.useEffect(() => {
    if (!isLatest || isUser) {
      setDisplayedContent(content);
      return;
    }
    
    // Throttled typing animation for performance
    let cancel = false;
    const timeout = setTimeout(() => {
      if (!cancel) setDisplayedContent(content);
    }, 15); // Adjust delay to balance typing speed and performance
    
    return () => {
       cancel = true;
       clearTimeout(timeout);
    };
  }, [content, isLatest, isUser]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(content);
    setMsgCopied(true);
    setTimeout(() => setMsgCopied(false), 2000);
  };

  const handleSave = () => {
    if (editValue.trim()) {
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
      case 'light':
        return {
          card: !isUser ? "bg-white border-slate-200 shadow-sm" : "",
          avatar: isUser ? "border-slate-200 bg-slate-100 text-slate-500" : "border-cyan-200 bg-cyan-50 text-cyan-600",
          text: !isUser ? "text-slate-700" : "text-slate-500",
          modelTag: "bg-cyan-100 text-cyan-700 border-cyan-200"
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

  const markdownComponents = React.useMemo(() => ({
    p: ({ children }: any) => <div className="mb-4 last:mb-0 leading-relaxed">{children}</div>,
    ul: ({ children }: any) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
    li: ({ children }: any) => <li className="text-zinc-300 leading-relaxed mb-1">{children}</li>,
    h1: ({ children }: any) => <h1 className="text-2xl font-bold mb-6 mt-8 text-white border-b border-zinc-800 pb-3">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-bold mb-4 mt-6 text-zinc-100">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-bold mb-3 mt-5 text-zinc-200">{children}</h3>,
    blockquote: ({ children }: any) => <blockquote className="border-l-4 border-cyan-500/50 bg-cyan-500/5 px-5 py-3 italic text-zinc-400 my-6 rounded-r-xl shadow-sm">{children}</blockquote>,
    table: ({ children }: any) => (
      <div className="my-6 overflow-x-auto rounded-xl border border-zinc-800/50">
        <table className="w-full text-sm text-left border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[10px] uppercase tracking-wider border-b border-zinc-800">{children}</thead>,
    th: ({ children }: any) => <th className="px-4 py-3 font-bold">{children}</th>,
    td: ({ children }: any) => <td className="px-4 py-3 border-t border-zinc-800/50 text-zinc-300">{children}</td>,
    a: ({ href, children }: any) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 decoration-cyan-500/30 hover:decoration-cyan-500 transition-all font-medium"
      >
        {children}
      </a>
    ),
    pre: ({ children }: any) => {
      let codeString = '';
      let language = 'text';

      if (React.isValidElement(children)) {
        const props = children.props as any;
        if (typeof props.children === 'string') {
          codeString = props.children;
        } else if (Array.isArray(props.children)) {
          codeString = props.children.join('');
        }
        
        const className = props.className || '';
        const match = /language-(\w+)/.exec(className);
        if (match) {
          language = match[1];
        }
      }

      codeString = codeString.replace(/\n$/, '');

      // Use CodePreview for actual code languages, or multi-line text, or long text
      if (codeString && (language !== 'text' || codeString.includes('\n') || codeString.length > 60)) {
        return <CodePreview code={codeString} language={language} isLatest={isLatest} />;
      }
      
      // Fallback for short, single-line text blocks that the model mistakenly outputted with triple backticks
      return (
        <div className="px-3 py-2 bg-zinc-900/80 rounded-lg border border-zinc-800/80 my-3 overflow-x-auto text-[13px] text-zinc-300 font-mono inline-flex w-fit max-w-full shadow-sm">
          {codeString || children}
        </div>
      );
    },
    code: ({ node, className, children, ...props }: any) => {
      return (
        <code className={cn(
          "px-1.5 py-0.5 rounded font-mono text-[0.85em] font-medium mx-0.5 shadow-sm", 
          theme === 'light' ? "bg-slate-100 text-slate-800 border border-slate-200" : "bg-[#1e1e24] text-cyan-300 border border-zinc-800/80",
          className
        )} {...props}>
          {children}
        </code>
      );
    }
  }), [theme]);

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
              <span className={cn(
                "text-[9px] px-2 py-0.5 rounded border font-mono font-bold tracking-wider", 
                theme === 'cyberpunk' ? "bg-[#00ffcc]/20 text-[#00ffcc] border-[#00ffcc]/40 shadow-[0_0_10px_rgba(0,255,204,0.1)]" :
                theme === 'monochrome' ? "bg-white text-black border-white" :
                "bg-cyan-950/40 text-cyan-400 border-cyan-800/50 shadow-[0_4px_12px_rgba(6,182,212,0.1)]"
              )}>
                NODE: {modelName.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
            {!isEditing && (
              <button 
                onClick={handleCopyMessage}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  msgCopied ? "text-green-500 bg-green-500/10" : "text-zinc-600 hover:text-cyan-400 hover:bg-zinc-800"
                )}
                title="Copy Message"
              >
                {msgCopied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            )}

            {isUser && !isEditing && (
              <>
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
                  title="Edit Message"
                >
                  <Pencil size={12} />
                </button>
              </>
            )}
          </div>
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
        
        <div className={cn(
          "markdown-body prose max-w-none text-sm leading-relaxed",
          theme === 'light' ? 'prose-slate' : 'prose-invert'
        )}>
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
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-cyan-900/20 active:scale-95 group/save"
                >
                  <Bot size={14} className="group-hover/save:animate-bounce" /> Send
                </button>
                <button 
                  onClick={() => { setIsEditing(false); setEditValue(content); }}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors"
                >
                  <X size={14} /> Discard
                </button>
              </div>
            </div>
          ) : content.startsWith('[Progress: ') || content.startsWith('[Neural Probe: ') ? (
            <div className="space-y-4 p-4 bg-zinc-950/30 border border-zinc-800/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <RotateCcw size={14} className="text-cyan-400 animate-spin" />
                </div>
                <div className="flex-1 space-y-1">
                   <p className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest">
                     {content.split('\n')[0].replace(/\*/g, '')}
                   </p>
                   {content.startsWith('[Progress: ') ? (() => {
                     const match = content.match(/\[Progress: (\d+)%\]/);
                     const percent = match ? parseInt(match[1]) : 0;
                     return (
                       <div className="space-y-2">
                         <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${percent}%` }}
                             className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                           />
                         </div>
                         <div className="flex justify-between text-[8px] font-mono font-bold text-zinc-600 uppercase">
                           <span>Neural Synthesis</span>
                           <span>{percent}% Complete</span>
                         </div>
                       </div>
                     );
                   })() : (
                     <div className="flex items-center gap-2">
                       <span className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse" />
                       <span className="text-[9px] font-mono text-cyan-500/60 uppercase tracking-tighter animate-pulse">Establishing data bridge...</span>
                     </div>
                   )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isLatest && !isUser && (
                <div className="-mx-2 mb-4">
                  <ThinkingProcessDrawer theme={theme} />
                </div>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents as any}
              >
                {displayedContent + (isLoading && isLatest ? ' ▍' : '')}
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

        {videoUrl && (
          <div className="mt-4 rounded-lg overflow-hidden border border-border-dim shadow-2xl bg-black">
            <video 
              src={videoUrl} 
              controls 
              className="w-full h-auto aspect-video"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>
    </div>
  );
};
