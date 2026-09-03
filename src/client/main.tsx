import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Ensure browser-safe polyfills for global and Buffer if accessed by isomorphic utilities
if (typeof window !== 'undefined') {
  if (!(window as unknown as { global?: unknown }).global) {
    (window as unknown as { global: unknown }).global = window;
  }
  if (!(window as unknown as { Buffer?: unknown }).Buffer) {
    const BrowserBuffer = {
      isBuffer: (obj: unknown): boolean => Boolean(obj && typeof obj === 'object' && '_isBuffer' in obj),
      from: (data: unknown, encoding?: string): Uint8Array => {
        if (typeof data === 'string') {
          if (encoding === 'base64') {
            const binary = atob(data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
          }
          if (encoding === 'hex') {
            const bytes = new Uint8Array(data.length / 2);
            for (let i = 0; i < data.length; i += 2) {
              bytes[i / 2] = parseInt(data.substring(i, i + 2), 16);
            }
            return bytes;
          }
          return new TextEncoder().encode(data);
        }
        if (data instanceof Uint8Array) {
          return new Uint8Array(data);
        }
        if (Array.isArray(data)) {
          return new Uint8Array(data);
        }
        return new Uint8Array(0);
      },
      alloc: (size: number): Uint8Array => new Uint8Array(size),
      concat: (list: Uint8Array[]): Uint8Array => {
        const totalLen = list.reduce((acc, curr) => acc + curr.length, 0);
        const result = new Uint8Array(totalLen);
        let offset = 0;
        for (const item of list) {
          result.set(item, offset);
          offset += item.length;
        }
        return result;
      }
    };
    (window as unknown as { Buffer: unknown }).Buffer = BrowserBuffer;
    (globalThis as unknown as { Buffer: unknown }).Buffer = BrowserBuffer;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
