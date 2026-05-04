import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'model';
  content: string;
  modelName?: string;
  imageUrl?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, modelName, imageUrl }) => {
  const isUser = role === 'user';

  return (
    <div className={cn(
      "flex w-full gap-4 p-8 transition-all animate-in fade-in slide-in-from-bottom-2",
      isUser ? "bg-transparent" : "bg-transparent"
    )}>
      <div className="flex-shrink-0">
        <div className={cn(
          "w-8 h-8 rounded border flex items-center justify-center transition-all shadow-sm",
          isUser 
            ? "border-zinc-800 bg-[#0a0a0c] text-zinc-500" 
            : "border-cyan-700/50 bg-cyan-900/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
        )}>
          <span className="text-[10px] font-bold uppercase tracking-tighter">
            {isUser ? "USR" : "GG"}
          </span>
        </div>
      </div>
      
      <div className={cn(
        "flex-1 min-w-0",
        !isUser && "bg-surface-card border border-border-dim p-5 rounded-2xl shadow-xl"
      )}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-cyan-500/80">
              DevGenie
            </span>
            {modelName && (
              <span className="text-[9px] bg-cyan-950/30 text-cyan-500/60 px-1.5 py-0.5 rounded border border-cyan-900/30 font-mono italic">
                USING {modelName}
              </span>
            )}
          </div>
        )}
        
        <div className="markdown-body prose prose-invert max-w-none text-sm leading-relaxed">
          <ReactMarkdown>{content}</ReactMarkdown>
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
