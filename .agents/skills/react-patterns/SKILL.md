---
name: react-patterns
description: Use when generating or reviewing React components or hooks.
---

# React patterns

## Component template
```tsx
import { type FC } from 'react';

export interface MyComponentProps {
  title: string;
}

export const MyComponent: FC<MyComponentProps> = ({ title }) => {
  return <div>{title}</div>;
};

export default MyComponent;
```

## Hook rules
- Keep API calls out of components — use custom hooks
- One responsibility per hook

## Tailwind notes
Tailwind version 4.x detected: config lives in vite.config.ts, not tailwind.config.js. Use @theme directive for tokens.
