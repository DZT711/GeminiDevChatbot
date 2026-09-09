import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LogoutTransitionModalProps {
  isOpen: boolean;
  onComplete: () => void;
  userEmail?: string;
  isGuest?: boolean;
}

export const LogoutTransitionModal: React.FC<LogoutTransitionModalProps> = ({
  isOpen,
  onComplete,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // Fast, responsive exit transition without unnecessary waiting
    const timer = setTimeout(() => {
      onComplete();
    }, 400);

    return () => clearTimeout(timer);
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="logout-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm select-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="w-full max-w-xs bg-zinc-900 border border-zinc-800/90 rounded-2xl p-6 text-center shadow-2xl"
        >
          {/* Minimalist Monochromatic Spinner */}
          <div className="mx-auto mb-3.5 flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-200 rounded-full animate-spin block" />
          </div>

          <h3 className="text-sm font-medium text-zinc-200 tracking-tight">
            Signing out
          </h3>
          <p className="text-xs text-zinc-500 mt-1 font-mono">
            Clearing session cache...
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
