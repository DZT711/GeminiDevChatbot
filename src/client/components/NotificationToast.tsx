import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppNotification } from '../hooks/useUIState';

interface NotificationToastProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
  theme?: string;
}

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle2,
    defaultTitle: 'SUCCESS',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    borderClass: 'border-emerald-500/30 hover:border-emerald-500/50',
    iconColor: 'text-emerald-400',
    barColor: 'bg-emerald-500',
    titleColor: 'text-emerald-400',
    glowClass: 'shadow-[0_8px_30px_rgba(16,185,129,0.15)]',
  },
  error: {
    icon: AlertCircle,
    defaultTitle: 'ERROR',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    borderClass: 'border-rose-500/30 hover:border-rose-500/50',
    iconColor: 'text-rose-400',
    barColor: 'bg-rose-500',
    titleColor: 'text-rose-400',
    glowClass: 'shadow-[0_8px_30px_rgba(244,63,94,0.15)]',
  },
  warning: {
    icon: AlertTriangle,
    defaultTitle: 'WARNING',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    borderClass: 'border-amber-500/30 hover:border-amber-500/50',
    iconColor: 'text-amber-400',
    barColor: 'bg-amber-500',
    titleColor: 'text-amber-400',
    glowClass: 'shadow-[0_8px_30px_rgba(245,158,11,0.15)]',
  },
  info: {
    icon: Info,
    defaultTitle: 'SYSTEM',
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    borderClass: 'border-cyan-500/30 hover:border-cyan-500/50',
    iconColor: 'text-cyan-400',
    barColor: 'bg-cyan-500',
    titleColor: 'text-cyan-400',
    glowClass: 'shadow-[0_8px_30px_rgba(6,182,212,0.15)]',
  },
};

export function NotificationToast({
  notifications,
  onDismiss,
  theme = 'dark',
}: NotificationToastProps) {
  const isLight = theme === 'light';

  return (
    <div
      className="fixed bottom-6 right-6 z-[250] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none sm:w-[380px]"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notif) => {
          const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
          const Icon = cfg.icon;
          const duration = notif.duration || 4500;
          const displayTitle = notif.title || cfg.defaultTitle;

          return (
            <motion.div
              key={notif.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.94, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className={cn(
                'pointer-events-auto relative overflow-hidden rounded-xl border backdrop-blur-xl transition-all duration-200',
                isLight
                  ? 'bg-white/95 border-zinc-200 text-zinc-800 shadow-[0_12px_36px_rgba(0,0,0,0.1)]'
                  : 'bg-zinc-950/95 border-zinc-800/80 text-zinc-100',
                cfg.glowClass,
                cfg.borderClass
              )}
            >
              <div className="p-3.5 flex items-start gap-3">
                {/* Icon Badge */}
                <div
                  className={cn(
                    'p-1.5 rounded-lg border shrink-0 mt-0.5 flex items-center justify-center',
                    cfg.badgeClass
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={cn(
                        'text-[10px] font-mono font-bold uppercase tracking-wider',
                        cfg.titleColor
                      )}
                    >
                      {displayTitle}
                    </span>
                    {notif.timestamp && (
                      <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
                        {notif.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      'text-xs leading-relaxed break-words font-sans',
                      isLight ? 'text-zinc-700' : 'text-zinc-300'
                    )}
                  >
                    {notif.message}
                  </p>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => onDismiss(notif.id)}
                  className={cn(
                    'p-1 rounded-md transition-colors shrink-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60',
                    isLight && 'hover:text-zinc-900 hover:bg-zinc-100'
                  )}
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Countdown Progress Bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
                style={{ originX: 0 }}
                className={cn('h-[2px] w-full', cfg.barColor)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
