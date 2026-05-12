import { Skill } from '../services/geminiService';

// Safely escape strings for use in regex
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

export const findSkillSuggestions = (
  input: string,
  skills: Skill[]
): Skill[] => {
  try {
    if (!input || !input.trim() || input.length < 3) return [];
    
    // Extract words longer than 2 characters
    const words = input.toLowerCase().split(/[^a-z0-9]+/i).filter(w => w.length > 2);
    if (words.length === 0) return [];
    
    // Simple scoring based on word occurrences in name and description
    const scoredSkills = skills.map(skill => {
      let score = 0;
      const nameStr = (skill.name || '').toLowerCase();
      const descStr = (skill.description || '').toLowerCase();
      
      words.forEach(word => {
        // Partial match
        if (nameStr.includes(word)) score += 3;
        if (descStr.includes(word)) score += 2; // bump to 2 so a match is more significant
        
        // Exact word boundary match gives bonus
        try {
          const escapedWord = escapeRegExp(word);
          if (new RegExp(`\\b${escapedWord}\\b`).test(nameStr)) score += 5;
        } catch (e) {
          // ignore invalid regex
        }
      });
      
      return { skill, score };
    });
    
    return scoredSkills
      .filter(s => s.score >= 3) // Require a decent score
      .sort((a, b) => b.score - a.score)
      .map(s => s.skill)
      .slice(0, 3); // top 3 matches
  } catch (error) {
    console.error("Skill suggestion matcher failed:", error);
    return [];
  }
};

