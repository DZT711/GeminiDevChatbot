import React, { useState, useEffect, useCallback } from 'react';

/**
 * Utility functions for LaTeX mathematical formulas and KaTeX rendering.
 */

export const katexOptions = {
  throwOnError: false,
  strict: false,
  trust: true,
  errorColor: '#ef4444'
};

const STORAGE_KEY = 'devengine_math_rendering_enabled';
const EVENT_NAME = 'devengine:math-rendering-changed';

/**
 * Checks if Math LaTeX input/output rendering is enabled (default: true).
 */
export function isMathRenderingEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === null) return true; // Always enabled as default
    return val !== 'false';
  } catch {
    return true;
  }
}

/**
 * Toggles Math LaTeX input/output rendering setting.
 */
export function setMathRenderingEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { enabled } }));
  } catch {}
}

/**
 * Hook to access and toggle math rendering state in components.
 */
export function useMathRendering(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabledState] = useState<boolean>(isMathRenderingEnabled);

  useEffect(() => {
    const handleUpdate = () => {
      setEnabledState(isMathRenderingEnabled());
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener(EVENT_NAME, handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener(EVENT_NAME, handleUpdate);
    };
  }, []);

  const setEnabled = useCallback((val: boolean) => {
    setMathRenderingEnabled(val);
    setEnabledState(val);
  }, []);

  return [enabled, setEnabled];
}

/**
 * Preprocesses markdown text to ensure LaTeX math formulas (standard delimiters,
 * bracket notation, and standalone math environments) are correctly formatted
 * for remark-math and rehype-katex to render without disruption.
 */
export function preprocessMath(content: string, forceEnabled?: boolean): string {
  if (!content || typeof content !== 'string') return content || '';
  if (!forceEnabled && !isMathRenderingEnabled()) return content;

  // Split content by code blocks and inline code so we don't accidentally mutate code snippets
  const tokens = content.split(/(```[\s\S]*?```|`[^`\n]+`)/g);

  return tokens.map((segment, idx) => {
    // Odd index corresponds to matched code block or inline code — preserve exactly as is
    if (idx % 2 === 1) return segment;

    let text = segment;

    // 1. Convert display math in bracket form: \[ ... \] -> \n\n$$\n...\n$$\n\n
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula) => {
      const trimmed = formula.trim();
      return `\n\n$$\n${trimmed}\n$$\n\n`;
    });

    // 2. Convert inline math in parentheses form: \( ... \) -> $...$
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_match, formula) => {
      const trimmed = formula.trim();
      return `$${trimmed}$`;
    });

    // 3. Normalize standalone LaTeX environments (pmatrix, align, cases, etc.) not already wrapped in $$
    const mathEnvs = [
      'equation', 'equation\\*',
      'align', 'align\\*',
      'aligned',
      'gather', 'gather\\*',
      'matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix',
      'cases'
    ];
    const envPattern = new RegExp(`(?<!\\$)\\\\begin\\{(${mathEnvs.join('|')})\\}([\\s\\S]*?)\\\\end\\{\\1\\}(?!\\$)`, 'g');
    text = text.replace(envPattern, (match) => {
      return `\n\n$$\n${match.trim()}\n$$\n\n`;
    });

    return text;
  }).join('');
}

export interface MathTemplate {
  label: string;
  syntax: string;
  description: string;
  category: 'basic' | 'calculus' | 'linear_algebra' | 'ai_theory';
}

export const COMMON_MATH_TEMPLATES: MathTemplate[] = [
  {
    label: 'Inline Variable',
    syntax: '$\\theta$',
    description: 'Greek letter or variable',
    category: 'basic'
  },
  {
    label: 'Fraction',
    syntax: '$\\frac{a}{b}$',
    description: 'Numerator and denominator fraction',
    category: 'basic'
  },
  {
    label: 'Superscript & Subscript',
    syntax: '$x_i^2$',
    description: 'Subscript index and power',
    category: 'basic'
  },
  {
    label: 'Summation',
    syntax: '$$\\sum_{i=1}^{n} x_i$$',
    description: 'Summation from index 1 to n',
    category: 'calculus'
  },
  {
    label: 'Definite Integral',
    syntax: '$$\\int_{a}^{b} f(x) \\, dx$$',
    description: 'Integral of function f(x) over [a, b]',
    category: 'calculus'
  },
  {
    label: 'Limit',
    syntax: '$$\\lim_{x \\to \\infty} \\frac{1}{x} = 0$$',
    description: 'Limit expression',
    category: 'calculus'
  },
  {
    label: 'Matrix (2x2)',
    syntax: '$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$',
    description: '2x2 Matrix with parentheses',
    category: 'linear_algebra'
  },
  {
    label: 'Vector Norm / Distance',
    syntax: '$$\\|\\mathbf{u} - \\mathbf{v}\\|_2$$',
    description: 'Euclidean L2 vector distance',
    category: 'linear_algebra'
  },
  {
    label: 'Cosine Similarity',
    syntax: '$$\\text{sim}(e_q, e_c) = \\frac{e_q \\cdot e_c}{\\|e_q\\| \\|e_c\\|}$$',
    description: 'Cosine similarity between embedding vectors',
    category: 'ai_theory'
  },
  {
    label: 'RAG Retrieval Objective',
    syntax: '$$\\mathop{\\arg\\max}_{c \\in \\mathcal{D}} \\text{sim}(e_q, e_c)$$',
    description: 'RAG maximum inner product search',
    category: 'ai_theory'
  },
  {
    label: 'Cross-Entropy Loss',
    syntax: '$$\\mathcal{L} = -\\sum_{i=1}^N y_i \\log P(y_i \\mid x)$$',
    description: 'Log-likelihood / Cross-entropy loss function',
    category: 'ai_theory'
  },
  {
    label: 'Softmax Probability',
    syntax: '$$P(y = k \\mid x) = \\frac{e^{z_k}}{\\sum_{j} e^{z_j}}$$',
    description: 'Softmax distribution over vocabulary classes',
    category: 'ai_theory'
  }
];
