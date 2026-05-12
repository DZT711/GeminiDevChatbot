import React, { useState, useEffect, useRef } from 'react';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Eye, Code } from 'lucide-react';
import { motion } from 'motion/react';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

interface CodePreviewProps {
  code: string;
  language: string;
  isLatest?: boolean;
}

export const CodePreview: React.FC<CodePreviewProps> = ({ code, language, isLatest = false }) => {
  const normalizedLang = language.toLowerCase();

  const isWeb = ['html', 'css', 'javascript', 'js'].includes(normalizedLang);
  const isReact = ['jsx', 'tsx', 'typescript', 'ts', 'react'].includes(normalizedLang);
  const isMermaid = ['mermaid', 'uml', 'diagram'].includes(normalizedLang);
  const isSVG = normalizedLang === 'svg';
  
  const isPreviewable = isWeb || isReact || isMermaid || isSVG;
  
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>(isPreviewable && isLatest ? 'preview' : 'code');
  const [copied, setCopied] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);

  const prevIsLatest = useRef(isLatest);

  // Auto toggle into code mode when no longer the latest message to prevent lagging
  useEffect(() => {
    if (prevIsLatest.current === true && isLatest === false) {
      if (activeTab === 'preview') {
        setActiveTab('code');
      }
    }
    prevIsLatest.current = isLatest;
  }, [isLatest, activeTab]);

  // Debounce the code to prevent preview from crashing while streaming
  const [debouncedCode, setDebouncedCode] = useState(code);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCode(code);
    }, 1000);
    return () => clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    if (activeTab === 'preview' && isMermaid && mermaidRef.current) {
      mermaidRef.current.innerHTML = '';
      mermaid.render(`mermaid-${Math.random().toString(36).substring(2)}`, debouncedCode).then((result) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = result.svg;
        }
      }).catch(e => {
        console.error("Mermaid alert:", e);
        if (mermaidRef.current) mermaidRef.current.innerHTML = `<div class="text-red-500 p-4 font-mono text-sm">Failed to render diagram. Check syntax.</div>`;
      });
    }
  }, [activeTab, isMermaid, debouncedCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code my-6 rounded-xl overflow-hidden border border-zinc-800/80 shadow-2xl">
      <div className="bg-zinc-900/80 px-4 py-2 flex items-center justify-between border-b border-zinc-800/50">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest flex-shrink-0">
            {language || 'text'}
          </span>
          {isPreviewable && (
            <div className="flex bg-zinc-950/50 rounded-lg p-0.5 border border-zinc-800/50">
              <button
                onClick={() => setActiveTab('code')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all",
                  activeTab === 'code' ? "bg-cyan-500/20 text-cyan-400" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Code size={12} /> Code
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all",
                  activeTab === 'preview' ? "bg-cyan-500/20 text-cyan-400" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Eye size={12} /> Preview
              </button>
            </div>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 p-1.5 rounded-md text-[10px] font-bold uppercase transition-all",
            copied ? "text-green-400 bg-green-400/10" : "text-zinc-500 hover:text-white hover:bg-zinc-800"
          )}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </motion.button>
      </div>
      
      <div className="bg-[#0a0a0c] relative">
        <div style={{ display: activeTab === 'code' ? 'block' : 'none' }}>
          <SyntaxHighlighter
            style={vscDarkPlus as any}
            language={language === 'react' ? 'jsx' : language || 'text'}
            PreTag="div"
            customStyle={{
              margin: 0,
              padding: '1.5rem',
              fontSize: '13px',
              lineHeight: '1.6',
              background: 'transparent',
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
        
        {isPreviewable && activeTab === 'preview' && (
          <div className="bg-[#121212] overflow-auto custom-scrollbar items-center justify-center min-h-[200px] w-full flex">
             {isMermaid && <div ref={mermaidRef} className="flex justify-center w-full bg-white/5 p-4" />}
             {isSVG && <div dangerouslySetInnerHTML={{ __html: debouncedCode }} className="flex justify-center w-full bg-white/5 p-4 rounded" />}
             {(isWeb || isReact) && (
               <div className="w-full relative z-0">
                 <SandpackProvider 
                   template={isReact ? "react-ts" : normalizedLang === 'html' ? "static" : "vanilla"}
                   theme="dark"
                   files={
                     isReact 
                       ? { "/App.tsx": debouncedCode }
                       : normalizedLang === 'html' 
                         ? { "/index.html": debouncedCode }
                         : normalizedLang === 'css'
                           ? { "/styles.css": debouncedCode }
                           : { "/index.js": debouncedCode }
                   }
                 >
                   <SandpackPreview showNavigator={true} style={{ height: '500px' }} />
                 </SandpackProvider>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};
