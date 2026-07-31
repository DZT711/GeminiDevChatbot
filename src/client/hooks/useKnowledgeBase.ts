import { useState, useCallback } from "react";
import { storageService } from "@/services/storageService";
import { apiClient } from "@/services/apiClient";

export interface KnowledgeNode {
  id: string;
  content: string;
  nodeType: string;
  metadata: any;
}

export interface KnowledgeProposal {
  id: string;
  userId: string;
  actionType: "INSERT" | "UPDATE" | "DELETE";
  proposedContent: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  targetNodeId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useKnowledgeBase() {
  const [knowledgeNodes, setKnowledgeNodes] = useState<KnowledgeNode[]>([]);
  const [knowledgeProposals, setKnowledgeProposals] = useState<KnowledgeProposal[]>([]);
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(false);
  const [isKnowledgeActionLoading, setIsKnowledgeActionLoading] = useState<Record<string, boolean>>({});
  
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeContent, setEditingNodeContent] = useState("");
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [editingProposalContent, setEditingProposalContent] = useState("");
  
  const [newProposalContent, setNewProposalContent] = useState("");
  const [newProposalReason, setNewProposalReason] = useState("");
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  const [kSearchQuery, setKSearchQuery] = useState("");
  const [kSearchResults, setKSearchResults] = useState<{ id: string; content: string; nodeType: string; similarity: number }[]>([]);
  const [isKSearching, setIsKSearching] = useState(false);
  const [kSearchError, setKSearchError] = useState("");

  const fetchKnowledgeData = useCallback(async () => {
    const token = storageService.getItem("session");
    if (!token) return;

    setIsKnowledgeLoading(true);
    try {
      // Intentionally keeping fetch to avoid breaking specific endpoints unless apiClient has these implemented.
      // Since apiClient automatically attaches token, we can use it if endpoints match.
      const nodesData = await apiClient.get<KnowledgeNode[]>("/api/knowledge");
      const proposalsData = await apiClient.get<KnowledgeProposal[]>("/api/knowledge/proposals");
      
      setKnowledgeNodes(nodesData || []);
      setKnowledgeProposals(proposalsData || []);
    } catch (e) {
      console.error("Failed to fetch knowledge details", e);
    } finally {
      setIsKnowledgeLoading(false);
    }
  }, []);

  const handleApproveProposal = async (proposalId: string) => {
    setIsKnowledgeActionLoading((prev) => ({ ...prev, [proposalId]: true }));
    try {
      await apiClient.post(`/api/knowledge/proposals/${proposalId}/approve`);
      await fetchKnowledgeData();
    } catch (e) {
      console.error(e);
      alert("Failed to approve proposal");
    } finally {
      setIsKnowledgeActionLoading((prev) => ({ ...prev, [proposalId]: false }));
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    setIsKnowledgeActionLoading((prev) => ({ ...prev, [proposalId]: true }));
    try {
      await apiClient.post(`/api/knowledge/proposals/${proposalId}/reject`);
      await fetchKnowledgeData();
    } catch (e) {
      console.error(e);
      alert("Failed to reject proposal");
    } finally {
      setIsKnowledgeActionLoading((prev) => ({ ...prev, [proposalId]: false }));
    }
  };

  const handleUpdateProposal = async (proposalId: string, content: string) => {
    setIsKnowledgeActionLoading((prev) => ({ ...prev, [proposalId]: true }));
    try {
      await apiClient.put(`/api/knowledge/proposals/${proposalId}`, { content });
      await fetchKnowledgeData();
      setEditingProposalId(null);
    } catch (e) {
      console.error(e);
      alert("Failed to update proposal");
    } finally {
      setIsKnowledgeActionLoading((prev) => ({ ...prev, [proposalId]: false }));
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm("Are you sure you want to delete this knowledge node directly from your vector index?")) return;
    setIsKnowledgeActionLoading((prev) => ({ ...prev, [nodeId]: true }));
    try {
      await apiClient.delete(`/api/knowledge/${nodeId}`);
      await fetchKnowledgeData();
    } catch (e) {
      console.error(e);
      alert("Failed to delete node");
    } finally {
      setIsKnowledgeActionLoading((prev) => ({ ...prev, [nodeId]: false }));
    }
  };

  const handleProposeDeleteNode = async (nodeId: string) => {
    setIsKnowledgeActionLoading((prev) => ({ ...prev, [nodeId]: true }));
    try {
      await apiClient.post("/api/knowledge/proposals", {
        actionType: "delete",
        targetNodeId: nodeId,
        reasoning: "User manually requested deletion from dashboard",
      });
      await fetchKnowledgeData();
    } catch (e) {
      console.error(e);
      alert("Failed to propose deletion");
    } finally {
      setIsKnowledgeActionLoading((prev) => ({ ...prev, [nodeId]: false }));
    }
  };

  const handleUpdateNode = async (nodeId: string, content: string) => {
    setIsKnowledgeActionLoading((prev) => ({ ...prev, [nodeId]: true }));
    try {
      await apiClient.put(`/api/knowledge/${nodeId}`, { content });
      await fetchKnowledgeData();
      setEditingNodeId(null);
    } catch (e) {
      console.error(e);
      alert("Failed to update node");
    } finally {
      setIsKnowledgeActionLoading((prev) => ({ ...prev, [nodeId]: false }));
    }
  };

  const handleProposeUpdateNode = async (nodeId: string, content: string) => {
    setIsKnowledgeActionLoading((prev) => ({ ...prev, [nodeId]: true }));
    try {
      await apiClient.post("/api/knowledge/proposals", {
        actionType: "update",
        targetNodeId: nodeId,
        content: content,
        reasoning: "User manually requested edit from dashboard",
      });
      await fetchKnowledgeData();
      setEditingNodeId(null);
    } catch (e) {
      console.error(e);
      alert("Failed to propose edit");
    } finally {
      setIsKnowledgeActionLoading((prev) => ({ ...prev, [nodeId]: false }));
    }
  };

  const executeKSearch = async () => {
    if (!kSearchQuery.trim()) return;
    setIsKSearching(true);
    setKSearchError("");
    try {
      const results = await apiClient.post<{ id: string; content: string; nodeType: string; similarity: number }[]>("/api/knowledge/search", { query: kSearchQuery, limit: 10 });
      setKSearchResults(results || []);
    } catch (e: any) {
      console.error(e);
      setKSearchError(e.message || "Search failed");
    } finally {
      setIsKSearching(false);
    }
  };

  const handleCreateProposal = async (content: string, reason: string) => {
    setIsSubmittingProposal(true);
    try {
      await apiClient.post("/api/knowledge/proposals", {
        actionType: "add",
        content: content,
        reasoning: reason,
      });
      await fetchKnowledgeData();
      setNewProposalContent("");
      setNewProposalReason("");
      return true;
    } catch (e: any) {
      console.error(e);
      alert("Failed to submit proposal: " + e.message);
      return false;
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  return {
    setKnowledgeNodes,
    setKnowledgeProposals,
    setIsKnowledgeLoading,
    setIsKnowledgeActionLoading,
    setIsSubmittingProposal,
    setKSearchResults,
    setIsKSearching,
    setKSearchError,
    knowledgeNodes,
    knowledgeProposals,
    isKnowledgeLoading,
    isKnowledgeActionLoading,
    editingNodeId,
    setEditingNodeId,
    editingNodeContent,
    setEditingNodeContent,
    editingProposalId,
    setEditingProposalId,
    editingProposalContent,
    setEditingProposalContent,
    newProposalContent,
    setNewProposalContent,
    newProposalReason,
    setNewProposalReason,
    isSubmittingProposal,
    kSearchQuery,
    setKSearchQuery,
    kSearchResults,
    isKSearching,
    kSearchError,
    fetchKnowledgeData,
    handleApproveProposal,
    handleRejectProposal,
    handleUpdateProposal,
    handleDeleteNode,
    handleProposeDeleteNode,
    handleUpdateNode,
    handleProposeUpdateNode,
    executeKSearch,
    handleCreateProposal,
  };
}
