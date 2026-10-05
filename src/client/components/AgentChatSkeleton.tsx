import React from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiSparkIcon } from './AiSparkIcon';

export interface AgentChatSkeletonProps {
  theme?: 'dark' | 'light' | 'midnight' | 'cyberpunk' | 'monochrome' | string;
  showCodeBlock?: boolean;
  className?: string;
}

export const AgentChatSkeleton: React.FC<AgentChatSkeletonProps> = ({
  theme = 'dark',
  showCodeBlock = true,
  className
}) => {
  const isLight = theme === 'light';

  return (
    <div
      className={cn(
        'w-full space-y-3 py-1 select-none animate-fadeIn',
        className
      )}
    >
      {/* Top Status Pill */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
            isLight
              ? 'bg-indigo-50 border-indigo-200/80 text-indigo-700'
              : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
          )}
        >
          <AiSparkIcon size={12} variant="thinking" className="text-indigo-400" />
          <span>Agent is formulating response...</span>
        </div>
      </div>

      {/* Shimmering Text Skeleton Lines */}
      <div className="space-y-2 max-w-2xl">
        <div
          className={cn(
            'h-3.5 rounded-md animate-pulse',
            isLight ? 'bg-slate-200/80' : 'bg-zinc-800/80',
            'w-[92%]'
          )}
        />
        <div
          className={cn(
            'h-3.5 rounded-md animate-pulse',
            isLight ? 'bg-slate-200/70' : 'bg-zinc-800/70',
            'w-[78%]'
          )}
          style={{ animationDelay: '150ms' }}
        />
        <div
          className={cn(
            'h-3.5 rounded-md animate-pulse',
            isLight ? 'bg-slate-200/60' : 'bg-zinc-800/60',
            'w-[86%]'
          )}
          style={{ animationDelay: '300ms' }}
        />
        <div
          className={cn(
            'h-3.5 rounded-md animate-pulse',
            isLight ? 'bg-slate-200/50' : 'bg-zinc-800/50',
            'w-[45%]'
          )}
          style={{ animationDelay: '450ms' }}
        />
      </div>

      {/* Optional Shimmering Code Block Skeleton */}
      {showCodeBlock && (
        <div
          className={cn(
            'rounded-xl border p-3 max-w-2xl space-y-2 mt-2',
            isLight
              ? 'bg-slate-100/90 border-slate-200'
              : 'bg-zinc-900/60 border-zinc-800/80 shadow-xs'
          )}
        >
          {/* Fake Window Controls */}
          <div className="flex items-center justify-between pb-1 border-b border-inherit opacity-60">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/40 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/40 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/40 inline-block" />
            </div>
            <div
              className={cn(
                'h-2.5 w-16 rounded animate-pulse',
                isLight ? 'bg-slate-300' : 'bg-zinc-700'
              )}
            />
          </div>

          {/* Fake Code Lines */}
          <div className="space-y-1.5 pt-1">
            <div
              className={cn(
                'h-3 rounded animate-pulse',
                isLight ? 'bg-slate-200/90' : 'bg-zinc-800/90',
                'w-[60%]'
              )}
              style={{ animationDelay: '200ms' }}
            />
            <div
              className={cn(
                'h-3 rounded animate-pulse',
                isLight ? 'bg-slate-200/70' : 'bg-zinc-800/70',
                'w-[82%]'
              )}
              style={{ animationDelay: '350ms' }}
            />
            <div
              className={cn(
                'h-3 rounded animate-pulse',
                isLight ? 'bg-slate-200/80' : 'bg-zinc-800/80',
                'w-[48%]'
              )}
              style={{ animationDelay: '500ms' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
