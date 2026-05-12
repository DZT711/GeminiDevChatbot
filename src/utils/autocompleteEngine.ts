export const getAutocompleteSuggestion = async (input: string): Promise<string> => {
  return new Promise((resolve) => {
    try {
      if (!input || !input.trim() || input.length < 2) {
        resolve('');
        return;
      }
      
      const lowerInput = input.toLowerCase().replace(/\s+/g, ' ');
      
      const COMMON_PROMPTS = [
        "create a react component",
        "create a web app",
        "create a dashboard navigation",
        "fix the issue in",
        "fix the bug",
        "refactor this code to use hooks",
        "refactor this code",
        "refactor this component",
        "explain this code snippet",
        "explain how this works",
        "write a unit test for",
        "write a regex to match",
        "add tailwind styling to",
        "add a new feature",
        "implement a feature",
        "implement authentication",
        "debug this error message",
        "debug this error",
        "generate a python script for",
        "generate a typescript interface",
        "how do i use",
        "what is the difference between",
        "optimize this function",
        "update the dependencies",
        "set up a new project",
      ];
      
      const match = COMMON_PROMPTS.find(p => p.startsWith(lowerInput));
      
      if (match) {
        // Return only the remaining part
        resolve(match.substring(lowerInput.length));
      } else {
        resolve('');
      }
    } catch (e) {
      console.error("Autocomplete engine error:", e);
      resolve('');
    }
  });
};
