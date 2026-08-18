const fs = require('fs');
const file = 'src/client/services/githubService.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  /const resolvedToken = token[\s\S]*?throw new Error\("Repo not found"\);/,
`const resolvedToken = token || (import.meta as any).env.VITE_GITHUB_TOKEN;
    let headers: any = resolvedToken ? { Authorization: \`token \${resolvedToken}\` } : undefined;
    
    // Fetch general repo info
    let repoRes = await fetch(\`https://api.github.com/repos/\${owner}/\${repo}\`, { headers });
    
    // If unauthorized, retry without token (token might be invalid)
    if (repoRes.status === 401 && headers) {
      headers = undefined;
      repoRes = await fetch(\`https://api.github.com/repos/\${owner}/\${repo}\`);
    }

    if (repoRes.status === 403 || repoRes.status === 429) {
      throw new Error("GitHub API rate limit exceeded. Please add VITE_GITHUB_TOKEN in Settings.");
    }
    if (!repoRes.ok) throw new Error(\`Repo not found (HTTP \${repoRes.status})\`);`
);
fs.writeFileSync(file, code);
