title:: Bug/Katex-Pluggable-Tuple-Types
type:: [[type/bugfix]]
status:: [[resolved]]
date:: [[2026-09-29]]

- # Bug Post-Mortem: TypeScript Tuple Inference on Unified PluggableList

- ## Problem
  - TypeScript compiler error during build check:
    `error TS2322: Type '({ throwOnError: boolean; ... } | ((options?: Readonly<Options>) => ...))[][]' is not assignable to type 'PluggableList'.`

- ## Root Cause
  - When declared as a memoized variable without an explicit type parameter:
    `const activeRehypePlugins = useMemo(() => isMathEnabled ? [[rehypeKatex, katexOptions]] : [], [isMathEnabled]);`
  - TypeScript infers `(Plugin | Options)[][]` instead of the expected tuple `[Plugin, PluginOptions]` required by unified's `PluggableList`.
  - Inline JSX array literals are contextually typed by the prop, but assigning via an untyped variable loses the tuple context.

- ## Fix
  - Imported `PluggableList` from `unified` and explicitly typed the `useMemo` hooks:
    ```typescript
    import type { PluggableList } from 'unified';
    const activeRemarkPlugins = useMemo<PluggableList>(() => isMathEnabled ? [remarkGfm, remarkMath] : [remarkGfm], [isMathEnabled]);
    const activeRehypePlugins = useMemo<PluggableList>(() => isMathEnabled ? [[rehypeKatex, katexOptions]] : [], [isMathEnabled]);
    ```

- ## Reusable Rule
  - **Explicitly type plugin list variables with `PluggableList`** when passing parameterized remark/rehype plugins to `ReactMarkdown` to preserve tuple typing without resorting to `any`.

- ## Evidence
  - Code changes in `src/client/components/workspace/AgentPanel.tsx` lines 40-50 and 200-205. Verified with `tsc --noEmit` passing with 0 errors.
