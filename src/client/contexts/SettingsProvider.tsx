import React, { createContext, useContext, useState, useEffect } from "react";
import { storageService } from "@/services/storageService";
import { ApiKey, Provider } from "@/services/types";

interface SettingsContextType {
  apiKeys: ApiKey[];
  setApiKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>;
  activeKeyId: string;
  setActiveKeyId: React.Dispatch<React.SetStateAction<string>>;
  globalEnabledModels: string[];
  setGlobalEnabledModels: React.Dispatch<React.SetStateAction<string[]>>;
  theme: "midnight" | "cyberpunk" | "monochrome" | "light";
  setTheme: React.Dispatch<React.SetStateAction<"midnight" | "cyberpunk" | "monochrome" | "light">>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(() => {
    try {
      const saved = storageService.getItem("devengine_api_keys");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [activeKeyId, setActiveKeyId] = useState<string>(() => {
    return storageService.getItem("devengine_active_key_id") || "";
  });

  const [globalEnabledModels, setGlobalEnabledModels] = useState<string[]>(() => {
    try {
      const saved = storageService.getItem("devengine_enabled_models");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [theme, setTheme] = useState<"midnight" | "cyberpunk" | "monochrome" | "light">(() => {
    return (storageService.getItem("theme") as any) || "midnight";
  });

  useEffect(() => {
    try {
      storageService.setItem("devengine_api_keys", JSON.stringify(apiKeys));
      storageService.setItem("devengine_active_key_id", activeKeyId);
      storageService.setItem("devengine_enabled_models", JSON.stringify(globalEnabledModels));
      storageService.setItem("theme", theme);
    } catch {}
  }, [apiKeys, activeKeyId, globalEnabledModels, theme]);

  return (
    <SettingsContext.Provider
      value={{
        apiKeys,
        setApiKeys,
        activeKeyId,
        setActiveKeyId,
        globalEnabledModels,
        setGlobalEnabledModels,
        theme,
        setTheme,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
