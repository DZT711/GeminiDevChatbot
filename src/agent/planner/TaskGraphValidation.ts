import { TaskGraph, TaskStatus } from './TaskGraphTypes.js';
import { InvalidTaskGraphError, TaskGraphCycleError } from './TaskGraphErrors.js';

export interface TaskGraphValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Finds a cycle in a directed graph where edges Map is: taskId -> dependencies (upstream).
 * In our graph, an edge from A to B means "A depends on B" (B must execute before A).
 * Execution order is B -> A.
 * A cycle exists if following dependencies leads back to an ancestor.
 */
export function findCycle(
  edges: Map<string, string[]>,
  nodeIds: Iterable<string>
): string[] | null {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  const dfs = (nodeId: string): string[] | null => {
    if (recursionStack.has(nodeId)) {
      // Cycle detected
      const cycleStartIdx = path.indexOf(nodeId);
      if (cycleStartIdx >= 0) {
        return [...path.slice(cycleStartIdx), nodeId];
      }
      return [nodeId, nodeId];
    }
    if (visited.has(nodeId)) {
      return null;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const deps = edges.get(nodeId) || [];
    for (const dep of deps) {
      const cycle = dfs(dep);
      if (cycle) {
        return cycle;
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
    return null;
  };

  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId)) {
      const cycle = dfs(nodeId);
      if (cycle) {
        return cycle;
      }
    }
  }

  return null;
}

/**
 * Computes topological order of tasks using Kahn's Algorithm (in-degree based on execution flow).
 * Since edges[A] = dependencies (B is prerequisite of A), the execution edge is B -> A.
 * So in-degree(A) = number of upstream dependencies of A.
 */
export function computeTopologicalOrder(
  nodeIds: Iterable<string>,
  edges: Map<string, string[]>,
  dependents: Map<string, string[]>
): string[] {
  const inDegree = new Map<string, number>();
  const allNodes = Array.from(nodeIds);

  for (const nodeId of allNodes) {
    const deps = edges.get(nodeId) || [];
    inDegree.set(nodeId, deps.length);
  }

  // Queue nodes with 0 incoming dependencies (no prerequisites)
  const queue: string[] = [];
  for (const nodeId of allNodes) {
    if (inDegree.get(nodeId) === 0) {
      queue.push(nodeId);
    }
  }

  const order: string[] = [];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    order.push(current);

    const children = dependents.get(current) || [];
    for (const child of children) {
      const currentInDegree = inDegree.get(child) ?? 0;
      const nextInDegree = currentInDegree - 1;
      inDegree.set(child, nextInDegree);
      if (nextInDegree === 0) {
        queue.push(child);
      }
    }
  }

  if (order.length !== allNodes.length) {
    const cycle = findCycle(edges, allNodes);
    throw new TaskGraphCycleError(cycle || ['unknown']);
  }

  return order;
}

export function validateTaskGraph(graph: TaskGraph): TaskGraphValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!graph.id || graph.id.trim() === '') {
    errors.push('TaskGraph must have a non-empty id.');
  }

  const nodeIds = new Set(graph.nodes.keys());

  // Validate nodes and dependencies
  for (const [nodeId, node] of graph.nodes.entries()) {
    if (!node.task) {
      errors.push(`Node '${nodeId}' is missing task payload.`);
    }

    if (node.id !== nodeId) {
      errors.push(`Node key '${nodeId}' does not match node.id '${node.id}'.`);
    }

    // Check for self-dependencies
    for (const depId of node.dependencies) {
      if (depId === nodeId) {
        errors.push(`Task '${nodeId}' has a self-dependency.`);
      } else if (!nodeIds.has(depId)) {
        errors.push(`Task '${nodeId}' depends on non-existent task '${depId}'.`);
      }
    }

    // Check dependents consistency
    for (const dependentId of node.dependents) {
      if (!nodeIds.has(dependentId)) {
        errors.push(`Task '${nodeId}' lists non-existent dependent task '${dependentId}'.`);
      }
    }
  }

  // Check cycle
  const cycle = findCycle(graph.edges, nodeIds);
  if (cycle) {
    errors.push(`Circular dependency detected in graph along cycle: ${cycle.join(' -> ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function assertValidTaskGraph(graph: TaskGraph): void {
  const result = validateTaskGraph(graph);
  if (!result.isValid) {
    const cycle = findCycle(graph.edges, graph.nodes.keys());
    if (cycle) {
      throw new TaskGraphCycleError(cycle);
    }
    throw new InvalidTaskGraphError(result.errors.join('\n- '), result.errors);
  }
}
