export const storageService = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage setItem failed', e);
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage removeItem failed', e);
    }
  },
  clear(): void {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('localStorage clear failed', e);
    }
  },
  
  // Specific getters/setters for typed access
  getSessionToken(): string | null {
    return this.getItem('session');
  },
  setSessionToken(token: string): void {
    this.setItem('session', token);
  },
  removeSessionToken(): void {
    this.removeItem('session');
  },
  
  getParsedItem<T>(key: string, defaultValue: T): T {
    const item = this.getItem(key);
    if (!item) return defaultValue;
    try {
      return JSON.parse(item);
    } catch {
      return defaultValue;
    }
  },
  setParsedItem<T>(key: string, value: T): void {
    this.setItem(key, JSON.stringify(value));
  }
};
