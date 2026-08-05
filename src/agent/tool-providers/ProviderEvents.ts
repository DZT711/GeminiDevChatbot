import { ProviderHealth } from './ProviderHealth';
import { ToolProviderLifecycleState } from './ToolProviderLifecycle';

export enum ProviderEventType {
  STATE_CHANGED = 'STATE_CHANGED',
  HEALTH_CHANGED = 'HEALTH_CHANGED',
  TOOL_DISCOVERED = 'TOOL_DISCOVERED',
  TOOL_UNREGISTERED = 'TOOL_UNREGISTERED',
  ERROR = 'ERROR'
}

export interface ProviderEvent {
  type: ProviderEventType;
  providerId: string;
  timestamp: number;
  payload?: any;
}

export interface ProviderStateChangedEvent extends ProviderEvent {
  type: ProviderEventType.STATE_CHANGED;
  payload: {
    previousState: ToolProviderLifecycleState;
    newState: ToolProviderLifecycleState;
  };
}

export interface ProviderHealthChangedEvent extends ProviderEvent {
  type: ProviderEventType.HEALTH_CHANGED;
  payload: {
    health: ProviderHealth;
  };
}

export interface ProviderToolDiscoveredEvent extends ProviderEvent {
  type: ProviderEventType.TOOL_DISCOVERED;
  payload: {
    toolName: string;
    toolVersion: string;
  };
}
