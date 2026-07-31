import { useState, useCallback, useEffect } from "react";
import { Skill, DEFAULT_SKILLS } from "@/services/geminiService";
import { useChatContext } from "@/contexts/ChatProvider";

export function useSkills() {
  const { customSkills, setCustomSkills } = useChatContext();
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>([]);
  const [isEditingSkill, setIsEditingSkill] = useState<Skill | null>(null);
  
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDescription, setNewSkillDescription] = useState("");
  const [newSkillModel, setNewSkillModel] = useState("");
  const [newSkillPromptText, setNewSkillPromptText] = useState("");
  const [newSkillPrompt, setNewSkillPrompt] = useState("");

  const [suggestedSkills, setSuggestedSkills] = useState<Skill[]>([]);
  const [autocompleteSuggestion, setAutocompleteSuggestion] = useState("");
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(true);
  const [isSkillsExpanded, setIsSkillsExpanded] = useState(false);

  const toggleSkill = (skillId: string) => {
    setActiveSkillIds((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleSaveSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingSkill) return;

    

    setCustomSkills((prev) =>
      prev.map((s) => (s.id === isEditingSkill.id ? isEditingSkill : s))
    );
    setIsEditingSkill(null);
  };

  const handleDeleteSkill = (skillId: string) => {
    if (!confirm("Are you sure you want to delete this custom skill?")) return;
    setCustomSkills((prev) => prev.filter((s) => s.id !== skillId));
    setActiveSkillIds((prev) => prev.filter((id) => id !== skillId));
  };

  return {
    activeSkillIds,
    setActiveSkillIds,
    isEditingSkill,
    setIsEditingSkill,
    isCreatingSkill,
    setIsCreatingSkill,
    newSkillName,
    setNewSkillName,
    newSkillDescription,
    setNewSkillDescription,
    newSkillModel,
    setNewSkillModel,
    newSkillPromptText,
    setNewSkillPromptText,
    newSkillPrompt,
    setNewSkillPrompt,
    suggestedSkills,
    setSuggestedSkills,
    autocompleteSuggestion,
    setAutocompleteSuggestion,
    showSkillSuggestions,
    setShowSkillSuggestions,
    isSkillsExpanded,
    setIsSkillsExpanded,
    toggleSkill,
    handleSaveSkill,
    handleDeleteSkill,
  };
}
