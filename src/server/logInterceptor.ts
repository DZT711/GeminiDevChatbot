import { EventEmitter } from 'events';

export const systemLogEmitter = new EventEmitter();
export const logHistory: string[] = [];
const MAX_LOG_HISTORY = 500;

export function appendSystemLog(category: string, message: string, details?: any) {
  try {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    let detailsStr = '';
    if (details !== undefined && details !== null) {
      if (details instanceof Error) {
        detailsStr = ` | Error: ${details.message}`;
      } else if (typeof details === 'object') {
        try {
          detailsStr = ` | ${JSON.stringify(details)}`;
        } catch (_) {
          detailsStr = ` | ${String(details)}`;
        }
      } else {
        detailsStr = ` | ${String(details)}`;
      }
    }
    const formatted = `[${timestamp}] [${category.toUpperCase()}] ${message}${detailsStr}`;
    logHistory.push(formatted);
    if (logHistory.length > MAX_LOG_HISTORY) logHistory.shift();
    systemLogEmitter.emit('log', formatted);
  } catch (_) {}
}

export function setupLogInterception() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  function broadcastLog(level: string, ...args: any[]) {
    try {
      const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
      const msg = args.map(a => {
        if (a instanceof Error) {
          try {
            if (a.message && a.message.startsWith('{') && a.message.includes('"code":')) {
              const parsed = JSON.parse(a.message);
              if (parsed?.error) {
                return `ApiError ${parsed.error.code || ''}: ${parsed.error.message || parsed.error.status || 'Request failed'}`;
              }
            }
          } catch (_) {}
          return a.stack || a.message;
        }
        if (typeof a === 'object') {
          try {
            return JSON.stringify(a);
          } catch (_) {
            return String(a);
          }
        }
        return String(a);
      }).join(' ');
      const formatted = `[${timestamp}] [BACKEND_${level.toUpperCase()}] ${msg}`;
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
