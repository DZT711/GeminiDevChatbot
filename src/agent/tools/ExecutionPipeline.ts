import { ToolExecutor } from './ToolExecutor';
import { ToolResolver } from './ToolResolver';
import { PermissionValidator } from './PermissionValidator';
import { InputValidator } from './InputValidator';
import { ResultNormalizer } from './ResultNormalizer';
import { ExecutionContext } from '../runtime/ExecutionContext';
import { ExecutionHooks } from './ExecutionHooks';
import { ExecutionPolicy } from './ExecutionPolicy';
import { ToolResult } from './ToolResult';
import { TimeoutError, CancellationError, RollbackError } from './ExecutionError';
import { CheckpointStore } from '../checkpoint/CheckpointStore';
import { RestoreStrategy } from '../checkpoint/Restore';
import { ToolDescriptor } from './ToolDescriptor';

export class ExecutionPipeline implements ToolExecutor {
  constructor(
    private resolver: ToolResolver,
    private permissionValidator: PermissionValidator,
    private inputValidator: InputValidator,
    private normalizer: ResultNormalizer,
    private checkpointStore: CheckpointStore,
    private restoreStrategy: RestoreStrategy
  ) {}

  public async execute(
    toolName: string,
    input: unknown,
    context: ExecutionContext,
    policy?: ExecutionPolicy,
    hooks?: ExecutionHooks
  ): Promise<ToolResult> {
    let checkpointId: string | undefined;
    let descriptor: ToolDescriptor | undefined;

    try {
      if (hooks?.beforeResolution) {
        await hooks.beforeResolution(toolName, context);
      }

      // 1. Tool Resolution
      const tool = await this.resolver.resolve(toolName);
      descriptor = tool.getDescriptor();

      // 2. Permission Validation
      this.permissionValidator.validate(descriptor, context);

      // 3. Input Validation
      this.inputValidator.validate(input, descriptor.schema);

      // 4. Checkpoint Creation
      const snapshot = context.createSnapshot();
      checkpointId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await this.checkpointStore.save({
        id: checkpointId,
        executionId: context.executionId,
        timestamp: Date.now(),
        metadata: { triggerType: 'BEFORE_TOOL', toolName },
        snapshot
      });
      context.checkpointId = checkpointId;

      if (hooks?.beforeExecution) {
        await hooks.beforeExecution(descriptor, input, context);
      }

      // 5. Tool Execution
      let rawResult: unknown;
      const executePromise = tool.execute(context, input);
      
      if (policy?.timeoutMs || policy?.abortSignal) {
        rawResult = await this.executeWithPolicy(executePromise, policy);
      } else {
        rawResult = await executePromise;
      }

      // 6. Result Normalization
      const result = this.normalizer.normalize(rawResult);

      if (hooks?.afterExecution) {
        await hooks.afterExecution(descriptor, result, context);
      }

      // 7. Checkpoint Commit (After successful execution)
      const afterSnapshot = context.createSnapshot();
      const afterCheckpointId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await this.checkpointStore.save({
        id: afterCheckpointId,
        executionId: context.executionId,
        timestamp: Date.now(),
        metadata: { triggerType: 'AFTER_TOOL', toolName },
        snapshot: afterSnapshot
      });
      context.checkpointId = afterCheckpointId;

      // 8. Execution Result
      return result;

    } catch (error) {
      if (checkpointId) {
        try {
          const checkpoint = await this.checkpointStore.load(checkpointId);
          if (checkpoint) {
            this.restoreStrategy.restore(context, checkpoint.snapshot);
          }
        } catch (rollbackErr) {
          throw new RollbackError(
            `Failed to rollback after tool error: ${rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr)}`, 
            error
          );
        }
      }

      const resultError = error instanceof Error ? error : new Error(String(error));
      
      if (hooks?.onError) {
        await hooks.onError(toolName, resultError, context, descriptor);
      }
      
      return this.normalizer.normalizeError(resultError);
    }
  }

  private async executeWithPolicy<T>(promise: Promise<T>, policy: ExecutionPolicy): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;

      const onAbort = () => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(new CancellationError());
      };

      if (policy.abortSignal) {
        if (policy.abortSignal.aborted) {
          return onAbort();
        }
        policy.abortSignal.addEventListener('abort', onAbort);
      }

      if (policy.timeoutMs && policy.timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          if (policy.abortSignal) {
            policy.abortSignal.removeEventListener('abort', onAbort);
          }
          reject(new TimeoutError(`Execution timed out after ${policy.timeoutMs}ms`));
        }, policy.timeoutMs);
      }

      promise.then(
        (val) => {
          if (timeoutId) clearTimeout(timeoutId);
          if (policy.abortSignal) {
            policy.abortSignal.removeEventListener('abort', onAbort);
          }
          resolve(val);
        },
        (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          if (policy.abortSignal) {
            policy.abortSignal.removeEventListener('abort', onAbort);
          }
          reject(err);
        }
      );
    });
  }
}
