import { EventEmitter } from 'events';

export const systemLogEmitter = new EventEmitter();
export const logHistory: string[] = [];
const MAX_LOG_HISTORY = 200;

export function setupLogInterception() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  function broadcastLog(level: string, ...args: any[]) {
    try {
      const msg = args.map(a => {
        if (a instanceof Error) return a.stack || a.message;
        if (typeof a === 'object') return JSON.stringify(a);
        return String(a);
      }).join(' ');
      const formatted = `[BACKEND_${level.toUpperCase()}] ${msg}`;
      logHistory.push(formatted);
      if (logHistory.length > MAX_LOG_HISTORY) logHistory.shift();
      systemLogEmitter.emit('log', formatted);
    } catch(e) {}
  }

  console.log = (...args) => { originalLog(...args); broadcastLog('log', ...args); };
  console.error = (...args) => { originalError(...args); broadcastLog('error', ...args); };
  console.warn = (...args) => { originalWarn(...args); broadcastLog('warn', ...args); };
  console.info = (...args) => { originalInfo(...args); broadcastLog('info', ...args); };
}
