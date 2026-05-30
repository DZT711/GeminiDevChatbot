import React, { useState, useEffect, useRef } from 'react';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Eye, Code } from 'lucide-react';
import { motion } from 'motion/react';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

let mermaidRenderQueue = Promise.resolve();

interface CodePreviewProps {
  code: string;
  language: string;
  isLatest?: boolean;
  defaultShowPreview?: boolean;
}

export const CodePreview: React.FC<CodePreviewProps> = ({ code, language, isLatest = false, defaultShowPreview = false }) => {
  const normalizedLang = language.toLowerCase();

  const isHtmlCss = ['html', 'css'].includes(normalizedLang);
  const isJs = ['javascript', 'js'].includes(normalizedLang);
  const isTs = ['typescript', 'ts'].includes(normalizedLang);
  const isReact = ['jsx', 'tsx', 'react'].includes(normalizedLang);
  
  // Try to smartly determine if JS/TS code is actually React
  const codeImpliesReact = code.includes('import React') || code.includes('export default function App') || code.includes('from "react"') || code.includes('from \'react\'') || code.includes('useState') || code.includes('useEffect');
  
  const codeImpliesBackendJs = code.includes('require(') || code.includes('process.env') || code.includes('import fs ') || code.includes('import os ') || code.includes('import path ') || code.includes('express()') || code.includes('http.createServer') || code.includes('import {') && code.includes('from \'fs\'');

  const effectiveIsReact = isReact || ((isJs || isTs) && codeImpliesReact);
  const effectiveIsJs = isJs && !effectiveIsReact && !codeImpliesBackendJs;
  const effectiveIsTs = isTs && !effectiveIsReact && !codeImpliesBackendJs;

  const isMarkdown = ['markdown', 'md'].includes(normalizedLang);
  const isMermaid = ['mermaid', 'uml', 'diagram'].includes(normalizedLang);
  const isSVG = normalizedLang === 'svg';
  const isGithub = ['github', 'repo'].includes(normalizedLang) || Boolean(code.trim().match(/^https?:\/\/github\.com\/[^\/]+\/[^\/]+/i));
  const isBackendE2B = ['python', 'py', 'c', 'cpp', 'c++', 'csharp', 'cs', 'c#', 'java', 'bash', 'sh', 'javascript', 'js', 'typescript', 'ts', 'rust', 'rs', 'go', 'php', 'ruby', 'rb'].includes(normalizedLang);
  
  const isPreviewable = isHtmlCss || effectiveIsReact || effectiveIsJs || effectiveIsTs || isMermaid || isSVG || isMarkdown || isBackendE2B || isGithub;
  
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>(isPreviewable && (defaultShowPreview || isMermaid || isSVG || isMarkdown || isGithub) ? 'preview' : 'code');
  const [copied, setCopied] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);

  const [executionOutput, setExecutionOutput] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const runBackendCode = async () => {
    setIsExecuting(true);
    setExecutionOutput(">> Booting E2B VM...\n>> Running code securely...");
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('session') || ''}`
        },
        body: JSON.stringify({ code, language: normalizedLang })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to execute');
      setExecutionOutput(data.output);
    } catch (e: any) {
      setExecutionOutput(`Execution Error: ${e.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

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
    let isCancelled = false;
    
    const renderDiagram = () => {
      if (activeTab === 'preview' && isMermaid && mermaidRef.current) {
        mermaidRenderQueue = mermaidRenderQueue.then(async () => {
          if (isCancelled) return;
          try {
            const codeToRender = debouncedCode.trim();
            if (!codeToRender) {
              if (mermaidRef.current) mermaidRef.current.innerHTML = '';
              return;
            }

            const id = `mermaid-${Math.random().toString(36).substring(2, 10)}`;
            const { svg } = await mermaid.render(id, codeToRender, mermaidRef.current);
            
            if (!isCancelled && mermaidRef.current) {
              mermaidRef.current.innerHTML = svg;
            }
          } catch (e: any) {
            console.error("Mermaid alert:", e);
            
            // Mermaid sometimes leaves error blocks in the body, clean them up
            const elements = document.querySelectorAll('[id^="dmermaid-"]');
            elements.forEach(el => el.remove());

            const errorMsg = e instanceof Error ? e.message : String(e);
            if (!isCancelled && mermaidRef.current) {
              mermaidRef.current.innerHTML = `<div class="text-red-500 p-4 font-mono text-sm max-w-full overflow-auto">Failed to render diagram. Check syntax.<br/><div class="text-xs mt-2 opacity-70 whitespace-pre-wrap">${errorMsg.replace(/</g, "&lt;")}</div></div>`;
            }
          }
        }).catch(() => {
          // silent catch for queue
        });
      }
    };
    
    renderDiagram();
    
    return () => {
      isCancelled = true;
    };
  }, [activeTab, isMermaid, debouncedCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code my-6 rounded-xl overflow-hidden border border-zinc-800/60 shadow-2xl">
      <div className="bg-zinc-900/80 px-4 py-2.5 flex items-center justify-between border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 hidden sm:flex">
             <div className="w-2.5 h-2.5 rounded-full bg-zinc-700/50"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-zinc-700/50"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-zinc-700/50"></div>
          </div>
          <div className="h-3 w-px bg-zinc-800 mx-1 hidden sm:block"></div>
          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex-shrink-0 flex items-center gap-2">
            <Code size={12} className="text-cyan-500/80 hidden sm:block" />
            {language || 'text'}
          </span>
          {isPreviewable && (
            <div className="flex bg-[#050505] rounded-md p-0.5 border border-zinc-800/80 ml-2">
              <button
                onClick={() => setActiveTab('code')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 text-[9px] font-bold uppercase rounded-sm transition-all tracking-wider",
                  activeTab === 'code' ? "bg-cyan-500/20 text-cyan-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                )}
              >
                Code
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 text-[9px] font-bold uppercase rounded-sm transition-all tracking-wider",
                  activeTab === 'preview' ? "bg-cyan-500/20 text-cyan-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                )}
              >
                Preview
              </button>
            </div>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 p-1.5 px-2 rounded-md text-[9px] font-bold uppercase transition-all tracking-wider",
            copied ? "text-emerald-400 bg-emerald-400/10" : "text-zinc-500 hover:text-white hover:bg-zinc-800"
          )}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
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
          <div className="bg-[#121212] overflow-auto custom-scrollbar items-center justify-center min-h-[200px] w-full flex flex-col">
             {isMermaid && <div ref={mermaidRef} className="flex justify-center w-full bg-white/5 p-4" />}
             {isSVG && <div dangerouslySetInnerHTML={{ __html: debouncedCode }} className="flex justify-center w-full bg-white/5 p-4 rounded" />}
             {isMarkdown && (
               <div className="w-full relative z-0 p-6 bg-[#0d1117] text-[#c9d1d9] max-w-none overflow-y-auto">
                 <div className="markdown-body font-sans prose prose-invert max-w-none">
                   <ReactMarkdown remarkPlugins={[remarkGfm]}>
                     {debouncedCode}
                   </ReactMarkdown>
                 </div>
               </div>
             )}
             {isGithub && (() => {
               const urlMatch = debouncedCode.match(/https?:\/\/github\.com\/([^\/]+)\/([^\/\s]+)/i);
               if (urlMatch) {
                 const owner = urlMatch[1];
                 const repo = urlMatch[2].replace(/\.git$/, '');
                 return (
                   <div className="w-full h-[600px] relative z-0">
                     <iframe
                       src={`https://stackblitz.com/github/${owner}/${repo}?embed=1&view=editor`}
                       className="w-full h-full border-0"
                       title={`GitHub Repo: ${owner}/${repo}`}
                       allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
                       sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                     />
                   </div>
                 );
               }
               return <div className="p-4 text-red-500 font-mono text-sm">Valid GitHub repository URL not found.</div>;
             })()}
             {isBackendE2B && (
               <div className="w-full flex flex-col p-4 bg-[#0d0d0d] min-h-[300px]">
                 <div className="flex justify-between items-center mb-3">
                   <div className="text-zinc-400 text-xs font-mono">Sandbox Execution Environment ({normalizedLang})</div>
                   <button 
                     onClick={runBackendCode} 
                     disabled={isExecuting}
                     className="px-4 py-1.5 bg-cyan-600/90 hover:bg-cyan-500 text-white text-xs font-bold rounded flex items-center gap-2 transition-colors disabled:opacity-50"
                   >
                     {isExecuting ? 'Running...' : 'Run Code'}
                   </button>
                 </div>
                 <div className="flex-1 bg-black rounded p-4 font-mono text-xs overflow-auto custom-scrollbar border border-zinc-800 text-zinc-300 min-h-[250px] max-h-[500px] whitespace-pre-wrap">
                   {executionOutput || "Click 'Run Code' to execute this snippet securely in a remote Sandbox VM."}
                 </div>
               </div>
             )}
             {(isHtmlCss || effectiveIsReact || effectiveIsJs || effectiveIsTs) && (
               <div className="w-full relative z-0">
                 <SandpackProvider 
                   template={
                     effectiveIsReact ? (isTs || normalizedLang === 'tsx' ? "react-ts" : "react")
                     : effectiveIsTs ? "vanilla-ts"
                     : (effectiveIsJs || isHtmlCss) ? "vanilla"
                     : "vanilla"
                   }
                   theme="dark"
                   files={
                     effectiveIsReact 
                       ? { [isTs || normalizedLang === 'tsx' ? "/App.tsx" : "/App.js"]: debouncedCode }
                       : isHtmlCss && normalizedLang === 'html' 
                         ? { "/index.html": debouncedCode }
                         : isHtmlCss && normalizedLang === 'css'
                           ? { "/styles.css": debouncedCode }
                           : effectiveIsTs
                             ? { "/index.ts": debouncedCode }
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
