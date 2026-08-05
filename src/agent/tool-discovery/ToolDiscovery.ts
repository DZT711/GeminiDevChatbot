import { DiscoverySource } from './DiscoverySource';
import { DiscoveryFilter } from './DiscoveryFilter';
import { DiscoveryResult } from './DiscoveryResult';

export interface ToolDiscovery {
  /**
   * Identifies the source this discovery mechanism scans.
   */
  getSource(): DiscoverySource;

  /**
   * Performs the discovery process and returns tools that match the filter.
   */
  discover(filter?: DiscoveryFilter): Promise<DiscoveryResult>;
}
