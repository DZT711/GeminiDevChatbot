import React, { createContext, useContext, useState, useEffect } from "react";
import { storageService } from "@/services/storageService";
import { ChatSession, Message, Attachment } from "@/services/chatSessionManager";
import { Skill } from "@/services/geminiService";

interface ChatContextType {
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  customSkills: Skill[];
  setCustomSkills: React.Dispatch<React.SetStateAction<Skill[]>>;
  currentSessionId: string | null;
  setCurrentSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = storageService.getItem("devengine_sessions") || storageService.getItem("chat_sessions");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [customSkills, setCustomSkills] = useState<Skill[]>(() => {
    try {
      const saved = storageService.getItem("devengine_skills");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    try {
      storageService.setItem("devengine_sessions", JSON.stringify(sessions));
      storageService.setItem("devengine_skills", JSON.stringify(customSkills));
    } catch {}
  }, [sessions, customSkills]);

  return (
    <ChatContext.Provider
      value={{
        sessions,
        setSessions,
        customSkills,
        setCustomSkills,
        currentSessionId,
        setCurrentSessionId,
        messages,
        setMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};
