import { describe, it, expect } from 'vitest';
import { findSkillSuggestions } from './skillMatcher';
import { Skill } from '../services/geminiService';

describe('skillMatcher', () => {
  const mockSkills: Skill[] = [
    {
      id: '1',
      name: 'React Developer',
      description: 'Expert in React, hooks, and frontend state management.',
      systemPrompt: '',
      icon: 'code'
    },
    {
      id: '2',
      name: 'Firebase Architect',
      description: 'Specializes in Firestore rules, auth, and cloud functions.',
      systemPrompt: '',
      icon: 'database'
    },
    {
      id: '3',
      name: 'Tailwind CSS Stylist',
      description: 'Creates beautiful UIs using utility-first CSS and responsive design.',
      systemPrompt: '',
      icon: 'sparkles'
    }
  ];

  it('handles empty inputs without errors', () => {
    expect(findSkillSuggestions('', mockSkills)).toEqual([]);
    expect(findSkillSuggestions('   ', mockSkills)).toEqual([]);
  });

  it('returns no matches for unrelated text', () => {
    expect(findSkillSuggestions('golang python backend', mockSkills)).toEqual([]);
  });

  it('suggests a skill based on keyword match in name', () => {
    const suggestions = findSkillSuggestions('react component', mockSkills);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].id).toBe('1');
  });

  it('suggests a skill based on keyword match in description', () => {
    const suggestions = findSkillSuggestions('firestore rules', mockSkills);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].id).toBe('2');
  });

  it('handles short words by ignoring them (prevents noise)', () => {
    const suggestions = findSkillSuggestions('in a and to', mockSkills);
    expect(suggestions).toEqual([]); // 'in' is in the React description, but it's too short
  });
  
  it('handles high frequency/garbage typing gracefully', () => {
    expect(findSkillSuggestions('reacttttt firebaaaase!', mockSkills)).toEqual([]);
    expect(findSkillSuggestions('$$$', mockSkills)).toEqual([]);
    expect(findSkillSuggestions('---', mockSkills)).toEqual([]);
  });
});
