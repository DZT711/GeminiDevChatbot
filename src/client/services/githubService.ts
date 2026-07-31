
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
  async getRepoInfo(url: string, token?: string): Promise<GithubRepoInfo | null> {
    const match = url.match(/github\.com\/([^/\s]+)\/([^/\s]+)/);
    if (!match) return null;

    const [, owner, repoRaw] = match;
    const repo = repoRaw.replace(/\.git$/, '');

    const resolvedToken = token || (import.meta as any).env.VITE_GITHUB_TOKEN;
    const headers = resolvedToken ? { Authorization: `token ${resolvedToken}` } : undefined;
    
    // Fetch general repo info
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (repoRes.status === 403 || repoRes.status === 429) {
      throw new Error("GitHub API rate limit exceeded. Please add VITE_GITHUB_TOKEN in Settings or login with GitHub.");
    }
    if (!repoRes.ok) throw new Error("Repo not found");
    const repoData = await repoRes.json();

    const defaultBranch = repoData.default_branch || 'main';

    // Fetch languages
    const langRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers });
    const languages = langRes.ok ? await langRes.json() : {};

    // Fetch contents
    const contentRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents?ref=${defaultBranch}`, { headers });
    let topFiles: string[] = [];
    if (contentRes.ok) {
      const contentData = await contentRes.json();
      if (Array.isArray(contentData)) {
        topFiles = contentData.map(f => f.name);
      }
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
  }

  async getFileContent(url: string, path: string, token?: string): Promise<string | null> {
    const match = url.match(/github\.com\/([^/\s]+)\/([^/\s]+)/);
    if (!match) return null;

    const [, owner, repoRaw] = match;
    const repo = repoRaw.replace(/\.git$/, '');

    let branch = 'main';
    try {
      const info = await this.getRepoInfo(url, token);
      if (info?.defaultBranch) branch = info.defaultBranch;
    } catch (e) {
      console.warn("Failed to get repo info, defaulting branch to main");
    }

    const resolvedToken = token || (import.meta as any).env.VITE_GITHUB_TOKEN;
    const headers = resolvedToken ? { Authorization: `token ${resolvedToken}` } : undefined;

    const cleanPath = path.replace(/^\/+/, '');
    // First try the REST API for potential better metadata/handling
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${branch}`;
    let apiRes;
    try {
      apiRes = await fetch(apiUrl, { headers });
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.content) {
          // It's a file with content (usually base64)
          try {
            return decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
          } catch (e) {
            return atob(data.content.replace(/\n/g, ''));
          }
        }
      }
    } catch (e) {
      console.warn("API fetch failed, falling back to raw...", e);
    }

    // Fallback to raw content (better for large files)
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanPath}`;
    const res = await fetch(rawUrl, { headers });
    
    if (!res.ok && branch !== 'master') {
      const masterUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${cleanPath}`;
      const masterRes = await fetch(masterUrl, { headers });
      if (masterRes.ok) return await masterRes.text();
    }
    
    if (res.ok) return await res.text();
    return null;
  }

  async listDirectory(url: string, path: string = '', token?: string): Promise<{ name: string; type: string; path: string }[] | null> {
    const match = url.match(/github\.com\/([^/\s]+)\/([^/\s]+)/);
    if (!match) return null;

    const [, owner, repoRaw] = match;
    const repo = repoRaw.replace(/\.git$/, '');

    let branch = 'main';
    try {
      const info = await this.getRepoInfo(url, token);
      if (info?.defaultBranch) branch = info.defaultBranch;
    } catch (e) {
      console.warn("Failed to get repo info, defaulting branch to main");
    }

    const resolvedToken = token || (import.meta as any).env.VITE_GITHUB_TOKEN;
    const headers = resolvedToken ? { Authorization: `token ${resolvedToken}` } : undefined;
    const cleanPath = path.replace(/^\/+/, '');
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${branch}`;
    try {
      const res = await fetch(apiUrl, { headers });
      
      if (res.status === 403 || res.status === 429) {
        throw new Error("GitHub API rate limit exceeded. Please add VITE_GITHUB_TOKEN in Settings or login with GitHub.");
      }
      
      if (!res.ok) return null;
      const data = await res.json();
      
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          name: item.name,
          type: item.type,
          path: item.path
        }));
      }
    } catch (e) {
      console.warn("Failed to list directory", e);
    }
    return null;
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
