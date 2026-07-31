import { apiClient } from '../services/apiClient.js';
import { storageService } from '../services/storageService.js';
import { ChatSession } from './chatSessionManager.js';

export const MAX_WINDOW_SIZE = 15;
export const ACTIVE_WINDOW_SIZE = 5;

export function stripCodeBlocks(text: string): string {
  return text.replace(/\`\`\`[\s\S]*?\`\`\`/g, '[Code Block Removed]');
}

export async function manageSessionMemory(session: ChatSession): Promise<void> {
  if (session.messages.length <= MAX_WINDOW_SIZE) {
    return;
  }

  const oldestMessages = session.messages.slice(0, session.messages.length - ACTIVE_WINDOW_SIZE);
  session.messages.splice(0, session.messages.length - ACTIVE_WINDOW_SIZE);

  const rawTextLog = oldestMessages.map(m => '[' + m.role + ']: ' + m.content).join('\n\n');
  const compressedText = stripCodeBlocks(rawTextLog);

  // Background non-blocking execution safely enclosed in try/catch to guarantee failure does not crash the active loop
  setTimeout(async () => {
    try {
      const token = storageService.getItem('session');
      if (!token) return;

      const { summary } = await apiClient.post<any>('/api/summarize-memory', {
          logs: compressedText,
          existingSummary: session.current_session_summary
        });
        session.current_session_summary = session.current_session_summary 
          ? session.current_session_summary + '\n' + summary
          : summary;
    } catch (err) {
      console.error('Background memory compaction failed', err);
    }
  }, 0);
}
