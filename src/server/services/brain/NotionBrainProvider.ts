import { BrainProvider, BrainQueryOptions } from '../../../agent/brain/BrainProvider.js';

export class NotionBrainProvider implements BrainProvider {
  private apiBase: string = 'https://api.notion.com/v1';

  constructor(private tokenProvider: () => string | null = () => process.env.NOTION_PAT || null) {}

  public isAvailable(): boolean {
    return Boolean(this.tokenProvider());
  }

  private getHeaders(): Record<string, string> {
    const token = this.tokenProvider();
    if (!token) {
      throw new Error('NOTION_PAT environment variable is not configured.');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    };
  }

  public async search(query: string, filter?: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`${this.apiBase}/search`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: query || '',
        ...(filter ? { filter } : {})
      })
    });
    if (!res.ok) {
      throw new Error(`NotionBrainProvider search error (${res.status}): ${await res.text()}`);
    }
    return await res.json();
  }

  public async fetchRecord(id: string, recordType?: 'page' | 'database'): Promise<unknown> {
    if (!id) throw new Error('NotionBrainProvider fetchRecord: missing required argument "id"');
    const url = recordType === 'database'
      ? `${this.apiBase}/databases/${id}`
      : `${this.apiBase}/pages/${id}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      // Fallback check database if page lookup returned non-200
      const fallbackRes = await fetch(`${this.apiBase}/databases/${id}`, { headers: this.getHeaders() });
      if (fallbackRes.ok) return await fallbackRes.json();
      throw new Error(`NotionBrainProvider fetchRecord error (${res.status}): ${await res.text()}`);
    }
    return await res.json();
  }

  public async queryDatabase(databaseId: string, options?: BrainQueryOptions): Promise<unknown> {
    if (!databaseId) throw new Error('NotionBrainProvider queryDatabase: missing required argument "databaseId"');
    const body: Record<string, unknown> = {
      page_size: options?.pageSize || 10
    };
    if (options?.filter) body.filter = options.filter;
    if (options?.sorts) body.sorts = options.sorts;

    const res = await fetch(`${this.apiBase}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      throw new Error(`NotionBrainProvider queryDatabase error (${res.status}): ${await res.text()}`);
    }
    return await res.json();
  }

  public async createRecord(
    databaseId: string,
    properties: Record<string, unknown>,
    children?: unknown[]
  ): Promise<unknown> {
    if (!databaseId || !properties) {
      throw new Error('NotionBrainProvider createRecord: missing required arguments "databaseId" and "properties"');
    }
    const res = await fetch(`${this.apiBase}/pages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
        ...(children ? { children } : {})
      })
    });
    if (!res.ok) {
      throw new Error(`NotionBrainProvider createRecord error (${res.status}): ${await res.text()}`);
    }
    return await res.json();
  }

  public async updateRecord(
    recordId: string,
    properties?: Record<string, unknown>,
    archived?: boolean
  ): Promise<unknown> {
    if (!recordId) throw new Error('NotionBrainProvider updateRecord: missing required argument "recordId"');
    const body: Record<string, unknown> = {};
    if (properties) body.properties = properties;
    if (typeof archived === 'boolean') body.archived = archived;

    const res = await fetch(`${this.apiBase}/pages/${recordId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      throw new Error(`NotionBrainProvider updateRecord error (${res.status}): ${await res.text()}`);
    }
    return await res.json();
  }

  public async appendContent(recordId: string, children: unknown[]): Promise<unknown> {
    if (!recordId || !children) {
      throw new Error('NotionBrainProvider appendContent: missing required arguments "recordId" and "children"');
    }
    const res = await fetch(`${this.apiBase}/blocks/${recordId}/children`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ children })
    });
    if (!res.ok) {
      throw new Error(`NotionBrainProvider appendContent error (${res.status}): ${await res.text()}`);
    }
    return await res.json();
  }
}
