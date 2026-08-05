import { DiscoverySource } from './DiscoverySource';
import { DiscoveryResult } from './DiscoveryResult';
import { DiscoveryError } from './DiscoveryErrors';

export enum DiscoveryEventType {
  DISCOVERY_STARTED = 'DISCOVERY_STARTED',
  DISCOVERY_COMPLETED = 'DISCOVERY_COMPLETED',
  DISCOVERY_FAILED = 'DISCOVERY_FAILED'
}

export interface DiscoveryEvent {
  type: DiscoveryEventType;
  source: DiscoverySource;
  timestamp: number;
}

export interface DiscoveryStartedEvent extends DiscoveryEvent {
  type: DiscoveryEventType.DISCOVERY_STARTED;
}

export interface DiscoveryCompletedEvent extends DiscoveryEvent {
  type: DiscoveryEventType.DISCOVERY_COMPLETED;
  result: DiscoveryResult;
}

export interface DiscoveryFailedEvent extends DiscoveryEvent {
  type: DiscoveryEventType.DISCOVERY_FAILED;
  error: DiscoveryError;
}
