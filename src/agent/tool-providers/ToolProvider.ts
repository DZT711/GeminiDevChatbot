import { ToolProviderDescriptor } from './ToolProviderDescriptor';
import { ToolProviderLifecycleState } from './ToolProviderLifecycle';
import { ProviderHealth } from './ProviderHealth';
import { ToolRegistry } from '../tools/ToolRegistry';

export interface ToolProvider {
  /**
   * Returns the descriptor for this provider (metadata, capabilities).
   */
  getDescriptor(): ToolProviderDescriptor;

  /**
   * Gets the current lifecycle state.
   */
  getState(): ToolProviderLifecycleState;

  /**
   * Retrieves the current health of the provider.
   */
  getHealth(): Promise<ProviderHealth>;

  /**
   * Initializes the provider (e.g., establishing connections, authenticating).
   */
  initialize(): Promise<void>;

  /**
   * Discovers and registers tools into the provided ToolRegistry.
   */
  discoverAndRegisterTools(registry: ToolRegistry): Promise<void>;

  /**
   * Unregisters this provider's tools from the ToolRegistry.
   */
  unregisterTools(registry: ToolRegistry): Promise<void>;

  /**
   * Cleans up resources, closes connections.
   */
  cleanup(): Promise<void>;
}
