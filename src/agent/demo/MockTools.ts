import { Tool, ToolDescriptor, ToolLifecycleState, ToolCapability, ExecutionContext } from '../index';

export class BaseMockTool implements Tool {
  constructor(protected descriptor: ToolDescriptor) {}
  getDescriptor(): ToolDescriptor { return this.descriptor; }
  getState(): ToolLifecycleState { return ToolLifecycleState.READY; }
  async initialize(): Promise<void> {}
  async execute(context: ExecutionContext, input: unknown): Promise<unknown> { return input; }
  async cleanup(): Promise<void> {}
}

export class EchoTool extends BaseMockTool {
  constructor() {
    super({
      metadata: { name: 'echo', version: '1.0.0', description: 'Echoes input' },
      schema: { inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
      permissions: [],
      capabilities: [ToolCapability.DATA_PROCESSING]
    });
  }
  async execute(context: ExecutionContext, input: any): Promise<unknown> {
    return { echoed: input.text };
  }
}

export class DelayTool extends BaseMockTool {
  constructor() {
    super({
      metadata: { name: 'delay', version: '1.0.0', description: 'Sleeps' },
      schema: { inputSchema: { type: 'object', properties: { ms: { type: 'number' } }, required: ['ms'] } },
      permissions: [],
      capabilities: [ToolCapability.UNKNOWN]
    });
  }
  async execute(context: ExecutionContext, input: any): Promise<unknown> {
    await new Promise(resolve => setTimeout(resolve, input.ms));
    return { delayed: input.ms };
  }
}

export class FailTool extends BaseMockTool {
  constructor() {
    super({
      metadata: { name: 'fail', version: '1.0.0', description: 'Always fails after mutating state' },
      schema: { inputSchema: {} },
      permissions: [],
      capabilities: [ToolCapability.UNKNOWN]
    });
  }
  async execute(context: ExecutionContext, input: any): Promise<unknown> {
    // Maliciously mutate context state before failing
    context.outputs['counter'] = 999;
    throw new Error('Intentional execution failure from FailTool');
  }
}

export class CounterTool extends BaseMockTool {
  constructor() {
    super({
      metadata: { name: 'counter', version: '1.0.0', description: 'Increments a counter in context outputs' },
      schema: { inputSchema: {} },
      permissions: [],
      capabilities: [ToolCapability.STATE_MUTATION]
    });
  }
  async execute(context: ExecutionContext, input: any): Promise<unknown> {
    const current = (context.outputs['counter'] as number) || 0;
    context.outputs['counter'] = current + 1;
    return { counter: context.outputs['counter'] };
  }
}

export class RestrictedTool extends BaseMockTool {
  constructor() {
    super({
      metadata: { name: 'restricted', version: '1.0.0', description: 'Requires user approval' },
      schema: { inputSchema: {} },
      permissions: [{ capability: ToolCapability.SYSTEM_COMMAND, requiresUserApproval: true }],
      capabilities: [ToolCapability.SYSTEM_COMMAND]
    });
  }
  async execute(context: ExecutionContext, input: any): Promise<unknown> {
    return { status: 'Executed restricted tool successfully' };
  }
}
