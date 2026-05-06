
export interface GithubRepoInfo {
  name: string;
  owner: string;
  description: string;
  stars: number;
  forks: number;
  languages: Record<string, number>;
  topFiles: string[];
  defaultBranch: string;
}

class GithubService {
  async getRepoInfo(url: string): Promise<GithubRepoInfo | null> {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    const [, owner, repoRaw] = match;
    const repo = repoRaw.replace(/\.git$/, '');

    try {
      // Fetch general repo info
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (!repoRes.ok) throw new Error("Repo not found");
      const repoData = await repoRes.json();

      const defaultBranch = repoData.default_branch || 'main';

      // Fetch languages
      const langRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`);
      const languages = langRes.ok ? await langRes.json() : {};

      // Fetch contents
      const contentRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents?ref=${defaultBranch}`);
      let topFiles: string[] = [];
      if (contentRes.ok) {
        const contentData = await contentRes.json();
        topFiles = (contentData as any[]).map(f => f.name);
      }

      return {
        name: repoData.name,
        owner: repoData.owner.login,
        description: repoData.description || 'No description provided.',
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        languages,
        topFiles,
        defaultBranch
      };
    } catch (err) {
      console.error("Github fetch error:", err);
      return null;
    }
  }

  async getFileContent(url: string, path: string): Promise<string | null> {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    const [, owner, repoRaw] = match;
    const repo = repoRaw.replace(/\.git$/, '');

    try {
      const info = await this.getRepoInfo(url);
      const branch = info?.defaultBranch || 'main';

      // First try the REST API for potential better metadata/handling
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
      const apiRes = await fetch(apiUrl);
      
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.content) {
          // It's a file with content (usually base64)
          return atob(data.content.replace(/\n/g, ''));
        }
      }

      // Fallback to raw content (better for large files)
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
      const res = await fetch(rawUrl);
      
      if (!res.ok && branch !== 'master') {
        const masterUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${path}`;
        const masterRes = await fetch(masterUrl);
        if (masterRes.ok) return await masterRes.text();
      }
      
      if (res.ok) return await res.text();
      return null;
    } catch (err) {
      console.error("Github file fetch error:", err);
      return null;
    }
  }

  async listDirectory(url: string, path: string = ''): Promise<{ name: string; type: string; path: string }[] | null> {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    const [, owner, repoRaw] = match;
    const repo = repoRaw.replace(/\.git$/, '');

    try {
      const info = await this.getRepoInfo(url);
      const branch = info?.defaultBranch || 'main';

      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
      const res = await fetch(apiUrl);
      
      if (!res.ok) return null;
      const data = await res.json();
      
      if (Array.isArray(data)) {
        return data.map(item => ({
          name: item.name,
          type: item.type,
          path: item.path
        }));
      }
      return null;
    } catch (err) {
      console.error("Github list directory error:", err);
      return null;
    }
  }

  formatRepoSummary(info: GithubRepoInfo): string {
    const languages = Object.keys(info.languages).join(', ');
    return `
Repository: ${info.owner}/${info.name}
Description: ${info.description}
Status: ⭐ ${info.stars} | 🍴 ${info.forks}
Languages: ${languages}
Top-level files: ${info.topFiles.join(', ')}
    `.trim();
  }
}

export const githubService = new GithubService();
