export interface Attachment {
  name: string;
  content: string;
  type: string;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  modelName?: string;
  isFallback?: boolean;
  imageUrl?: string;
  videoUrl?: string;
  attachments?: Attachment[];
  editHistory?: string[];
  id: string;
  rating?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  pinned?: boolean;
  current_session_summary?: string;
}

export const generateSessionId = () => `session-${Date.now()}`;

export const createNewSession = (title: string = "New Session"): ChatSession => ({
  id: generateSessionId(),
  title,
  messages: [],
  updatedAt: Date.now()
});
