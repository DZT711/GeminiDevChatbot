import { DiffLine, FileChangeOperation } from './ChangeSetTypes.js';

export interface DiffResult {
  diff: string;
  lines: DiffLine[];
  additions: number;
  deletions: number;
}

/**
 * Computes a fast, deterministic hex hash of file content.
 * Compatible with all JS runtimes without external dependencies.
 */
export function computeContentHash(content: string): string {
  let h1 = 0xdeadbeef ^ content.length;
  let h2 = 0x41c6ce57 ^ content.length;
  for (let i = 0; i < content.length; i++) {
    const ch = content.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hashVal = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hashVal.toString(16).padStart(16, '0');
}

/**
 * Generates structured lines and unified diff format for file changes.
 */
export function generateUnifiedDiff(
  filePath: string,
  beforeContent: string = '',
  afterContent: string = '',
  operation: FileChangeOperation
): DiffResult {
  const lines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;

  if (operation === 'CREATE') {
    const newLines = afterContent.length > 0 ? afterContent.split('\n') : [];
    for (let i = 0; i < newLines.length; i++) {
      lines.push({
        type: 'added',
        newLineNumber: i + 1,
        content: newLines[i]
      });
      additions++;
    }
    const header = `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${newLines.length} @@\n`;
    const diffBody = newLines.map((l) => `+${l}`).join('\n');
    return {
      diff: header + diffBody,
      lines,
      additions,
      deletions
    };
  }

  if (operation === 'DELETE') {
    const oldLines = beforeContent.length > 0 ? beforeContent.split('\n') : [];
    for (let i = 0; i < oldLines.length; i++) {
      lines.push({
        type: 'removed',
        oldLineNumber: i + 1,
        content: oldLines[i]
      });
      deletions++;
    }
    const header = `--- a/${filePath}\n+++ /dev/null\n@@ -1,${oldLines.length} +0,0 @@\n`;
    const diffBody = oldLines.map((l) => `-${l}`).join('\n');
    return {
      diff: header + diffBody,
      lines,
      additions,
      deletions
    };
  }

  // MODIFY operation
  const oldLines = beforeContent.split('\n');
  const newLines = afterContent.split('\n');

  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (oldIdx < oldLines.length && newIdx < newLines.length) {
      if (oldLines[oldIdx] === newLines[newIdx]) {
        lines.push({
          type: 'unchanged',
          oldLineNumber: oldIdx + 1,
          newLineNumber: newIdx + 1,
          content: oldLines[oldIdx]
        });
        oldIdx++;
        newIdx++;
      } else {
        lines.push({
          type: 'removed',
          oldLineNumber: oldIdx + 1,
          content: oldLines[oldIdx]
        });
        deletions++;
        oldIdx++;

        lines.push({
          type: 'added',
          newLineNumber: newIdx + 1,
          content: newLines[newIdx]
        });
        additions++;
        newIdx++;
      }
    } else if (oldIdx < oldLines.length) {
      lines.push({
        type: 'removed',
        oldLineNumber: oldIdx + 1,
        content: oldLines[oldIdx]
      });
      deletions++;
      oldIdx++;
    } else if (newIdx < newLines.length) {
      lines.push({
        type: 'added',
        newLineNumber: newIdx + 1,
        content: newLines[newIdx]
      });
      additions++;
      newIdx++;
    }
  }

  const header = `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,${oldLines.length} +1,${newLines.length} @@\n`;
  const diffBody = lines
    .map((l) => {
      if (l.type === 'added') return `+${l.content}`;
      if (l.type === 'removed') return `-${l.content}`;
      return ` ${l.content}`;
    })
    .join('\n');

  return {
    diff: header + diffBody,
    lines,
    additions,
    deletions
  };
}
