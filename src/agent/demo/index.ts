import {
  DefaultToolRegistry,
  ToolResolver,
  PermissionValidator,
  InputValidator,
  ResultNormalizer,
  ExecutionPipeline,
  createInitialContext,
  InMemoryCheckpointStore,
  DefaultRestoreStrategy,
  ExecutionContext,
  Planner,
  ToolCapability
} from '../index';
import { EchoTool, DelayTool, FailTool, CounterTool, RestrictedTool } from './MockTools';
import { MockPlanningStrategy, DemoOrchestrator } from './MockPlanner';

async function runDemo() {
  console.log('============================================================');
  console.log(' M02-DEMO : AGENT PLAYGROUND');
  console.log('============================================================\n');

  // Initialize Core Components
  const registry = new DefaultToolRegistry();
  await registry.register(new EchoTool());
  await registry.register(new DelayTool());
  await registry.register(new FailTool());
  await registry.register(new CounterTool());
  await registry.register(new RestrictedTool());

  const checkpointStore = new InMemoryCheckpointStore();
  const restoreStrategy = new DefaultRestoreStrategy();
  
  const resolver = new ToolResolver(registry);
  const permissionValidator = new PermissionValidator();
  const inputValidator = new InputValidator();
  const normalizer = new ResultNormalizer();

  const pipeline = new ExecutionPipeline(
    resolver,
    permissionValidator,
    inputValidator,
    normalizer,
    checkpointStore,
    restoreStrategy
  );

  console.log('[Setup] Core components initialized. Tools registered:');
  const allTools = await registry.listAll();
  for (const t of allTools) {
    console.log(`  - ${t.metadata.name} (v${t.metadata.version})`);
  }
  console.log('\n');

  // Helper for logging execution flow
  const createHooks = (demoName: string) => ({
    beforeResolution: async (toolName: string) => console.log(`[${demoName}] Resolving tool: ${toolName}`),
    beforeExecution: async (desc: any) => console.log(`[${demoName}] Executing tool: ${desc.metadata.name}, Checkpoint saved.`),
    afterExecution: async (desc: any, result: any) => console.log(`[${demoName}] Tool ${desc.metadata.name} execution complete. Success: ${result.success}`),
    onError: async (toolName: string, err: any) => console.log(`[${demoName}] Error executing ${toolName}: ${err.message}`)
  });

  // Demo 1: Simple execution via Planner
  console.log('--- Demo 1: Simple Execution via Planner ---');
  let context = createInitialContext('exec-1');
  const planner = new Planner(new MockPlanningStrategy());
  const planResult = await planner.createPlan({ userGoal: 'Run test sequence' } as any);
  if (planResult.plan) {
    const orchestrator = new DemoOrchestrator(pipeline);
    await orchestrator.executePlan(planResult.plan, context);
  }
  console.log();

  // Demo 2: Rollback execution
  console.log('--- Demo 2: State Rollback ---');
  context = createInitialContext('exec-2');
  context.outputs['counter'] = 5;
  console.log(`[Demo 2] Initial counter value: ${context.outputs['counter']}`);
  
  // Execute CounterTool successfully
  let result = await pipeline.execute('counter', {}, context, {}, createHooks('Demo 2'));
  console.log(`[Demo 2] Counter value after CounterTool: ${context.outputs['counter']}`);
  
  // Execute FailTool, which should cause rollback
  result = await pipeline.execute('fail', {}, context, {}, createHooks('Demo 2'));
  console.log(`[Demo 2] Result success: ${result.success}, Error: ${result.error?.message}`);
  console.log(`[Demo 2] Counter value after FailTool (Should be restored to 6): ${context.outputs['counter']}\n`);

  // Demo 3: Permission error
  console.log('--- Demo 3: Permission Checks ---');
  context = createInitialContext('exec-3');
  // Context doesn't have the required tag
  result = await pipeline.execute('restricted', {}, context, {}, createHooks('Demo 3'));
  console.log(`[Demo 3] Result success: ${result.success}, Error: ${result.error?.name} - ${result.error?.message}`);
  
  // Now with approval
  context.customTags = ['APPROVED:restricted'];
  console.log(`[Demo 3] Re-trying with approval tag...`);
  result = await pipeline.execute('restricted', {}, context, {}, createHooks('Demo 3'));
  console.log(`[Demo 3] Result success: ${result.success}, Data:`, result.data, '\n');

  // Demo 4: Validation error
  console.log('--- Demo 4: Input Validation ---');
  context = createInitialContext('exec-4');
  result = await pipeline.execute('echo', { wrongKey: 'missing text' }, context, {}, createHooks('Demo 4'));
  console.log(`[Demo 4] Result success: ${result.success}, Error: ${result.error?.name} - ${result.error?.message}\n`);

  // Demo 5: Timeout policy
  console.log('--- Demo 5: Timeout Execution Policy ---');
  context = createInitialContext('exec-5');
  result = await pipeline.execute('delay', { ms: 500 }, context, { timeoutMs: 100 }, createHooks('Demo 5'));
  console.log(`[Demo 5] Result success: ${result.success}, Error: ${result.error?.name} - ${result.error?.message}\n`);

  // Demo 6: Registry Queries
  console.log('--- Demo 6: Registry Queries ---');
  const foundTools = await registry.findTools({ capabilities: [ToolCapability.STATE_MUTATION] });
  console.log(`[Demo 6] Tools with STATE_MUTATION capability: ${foundTools.map(t => t.metadata.name).join(', ')}`);
  
  console.log('\n============================================================');
  console.log(' M02-DEMO COMPLETE ');
  console.log('============================================================\n');
}

runDemo().catch(console.error);
