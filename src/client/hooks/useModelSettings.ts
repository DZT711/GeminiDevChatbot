import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/services/apiClient";
import { ModelMetrics } from "@/services/geminiService";
import { modelQueueManager } from "@/services/modelQueueManager";
import { Provider } from "@/services/types";

export interface ModelInformation {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: {
    vision: boolean;
    tools: boolean;
    systemInstructions: boolean;
  };
  contextWindow: number;
  provider: string;
  architecture?: string;
  contextLength?: number;
  pricing?: any;
}

export function useModelSettings(apiKeys: any[], activeKeyId: string, globalEnabledModels: string[]) {
  const [globalModelCatalog, setGlobalModelCatalog] = useState<any[]>([]);
  const [modelCatalog, setModelCatalog] = useState<ModelInformation[]>([]);
  
  const [newModelName, setNewModelName] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [newModelContext, setNewModelContext] = useState("");
  const [newModelTools, setNewModelTools] = useState(false);
  
  const [modelSearch, setModelSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState("");
  const [catalogPage, setCatalogPage] = useState(1);
  const [currentModel, setCurrentModel] = useState<string>("");
  const [metrics, setMetrics] = useState<Record<string, ModelMetrics>>({});

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await apiClient.get<any[]>('/api/models/info');
        setGlobalModelCatalog(data);
      } catch (err) {
        console.error("Failed to fetch model catalog", err);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    const activeKey = apiKeys.find((k) => k.id === activeKeyId);
    if (activeKey) {
      if (activeKey.models && activeKey.models.length > 0) {
        modelQueueManager.setQueue(activeKey.models.filter((m: string) => !m.startsWith("OFF:")));
      } else {
        const fallbackQueue =
          activeKey.provider === "google"
            ? ["gemini-1.5-pro", "gemini-1.5-flash"]
            : ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet-20241022"];
        modelQueueManager.setQueue(fallbackQueue);
      }
    } else {
      if (globalEnabledModels.length > 0) {
        modelQueueManager.setQueue(globalEnabledModels.filter((m: string) => !m.startsWith("OFF:")));
      } else {
        modelQueueManager.resetQueue();
      }
    }
    const currentQueue = modelQueueManager.getQueue();
    if (currentModel && currentQueue.includes(currentModel)) {
      setCurrentModel(currentModel);
    } else {
      setCurrentModel(modelQueueManager.getCurrentModel());
    }
  }, [activeKeyId, apiKeys, globalEnabledModels]);


  const [managingKeyId, setManagingKeyId] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyVal, setNewKeyVal] = useState("");
  const [newKeyBaseUrl, setNewKeyBaseUrl] = useState("");
  const [newKeyExpectedPrefix, setNewKeyExpectedPrefix] = useState("");
  const [newKeyProvider, setNewKeyProvider] = useState<Provider>(Provider.GOOGLE);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [visibleKeyIds, setVisibleKeyIds] = useState<string[]>([]);

  const handleSaveKey = async (setApiKeys: any, setValidationStatus: any, setActiveKeyId: any) => {
    if (isAddingKey) {
      if (!newKeyName || !newKeyVal || !newKeyProvider) {
        setValidationStatus({ type: "error", message: "Missing required fields" });
        return;
      }
      const newKey = {
        id: Math.random().toString(36).substr(2, 9),
        name: newKeyName,
        key: newKeyVal,
        provider: newKeyProvider as any,
        baseUrl: newKeyBaseUrl,
        expectedPrefix: newKeyExpectedPrefix,
        models: []
      };
      setApiKeys((prev: any) => [...prev, newKey]);
      setIsAddingKey(false);
      setNewKeyName("");
      setNewKeyVal("");
      setNewKeyProvider(Provider.OPENAI);
      setNewKeyBaseUrl("");
      setNewKeyExpectedPrefix("");
    } else if (managingKeyId) {
      setApiKeys((prev: any) => prev.map((k: any) => k.id === managingKeyId ? {
        ...k,
        name: newKeyName || k.name,
        key: newKeyVal || k.key,
        baseUrl: newKeyBaseUrl || k.baseUrl,
        expectedPrefix: newKeyExpectedPrefix || k.expectedPrefix
      } : k));
      setManagingKeyId(null);
    }
  };

  const handleDeleteKey = (id: string, setApiKeys: any, activeKeyId: string | null, setActiveKeyId: any) => {
    setApiKeys((prev: any) => prev.filter((k: any) => k.id !== id));
    if (activeKeyId === id) setActiveKeyId(null);
    if (managingKeyId === id) setManagingKeyId(null);
  };
  return {
    managingKeyId, setManagingKeyId,
    newKeyName, setNewKeyName,
    newKeyVal, setNewKeyVal,
    newKeyBaseUrl, setNewKeyBaseUrl,
    newKeyExpectedPrefix, setNewKeyExpectedPrefix,
    newKeyProvider, setNewKeyProvider,
    isAddingKey, setIsAddingKey,
    visibleKeyIds, setVisibleKeyIds,
    handleSaveKey, handleDeleteKey,
    globalModelCatalog, setGlobalModelCatalog,
    modelCatalog,
    setModelCatalog,
    newModelName, setNewModelName,
    newModelId, setNewModelId,
    newModelContext, setNewModelContext,
    newModelTools, setNewModelTools,
    modelSearch, setModelSearch,
    catalogSearch, setCatalogSearch,
    catalogFilter, setCatalogFilter,
    catalogPage, setCatalogPage,
    currentModel, setCurrentModel,
    metrics, setMetrics,
  };
}
