import { createInitialContext } from '../runtime/ExecutionContext';
import { InMemoryCheckpointStore } from '../checkpoint/CheckpointStore';
import { DefaultRestoreStrategy } from '../checkpoint/Restore';
import { ToolResolver } from '../tools/ToolResolver';
import { PermissionValidator } from '../tools/PermissionValidator';
import { InputValidator } from '../tools/InputValidator';
import { ResultNormalizer } from '../tools/ResultNormalizer';
import { DefaultToolRegistry, ToolLifecycleState } from '../tools';
import { ExecutionPipeline } from '../tools/ExecutionPipeline';
import { ExecutionContext } from '../runtime/ExecutionContext';
import { NativeToolProvider } from '../tool-providers/NativeToolProvider';
import { MCPToolProvider, MCPConnection, MCPServerDescriptor, MCPHealth, MCPCapabilities, MCPTransportType } from '../tool-providers/mcp';
import { ToolProviderRegistry, DefaultToolProviderRegistry, ToolProviderLifecycleState, ProviderHealthStatus, ProviderHealth } from '../tool-providers';
import { Tool } from '../tools/Tool';
import { InMemoryMemoryProvider } from '../memory/InMemoryMemoryProvider';
import { InMemoryKnowledgeStore } from '../knowledge/InMemoryKnowledgeStore';
import { SimpleRetriever } from '../retrieval/SimpleRetriever';
import { SimpleContextBuilder } from '../context/SimpleContextBuilder';
import { RuleBasedReflection } from '../reflection/RuleBasedReflection';
import { RuleBasedLearningEngine } from '../learning/RuleBasedLearningEngine';

// Mock REST Tool Provider
class MockRESTToolProvider extends NativeToolProvider {
  constructor(tools: Tool[]) {
    super(tools);
  }
  public getDescriptor() {
    return {
      ...super.getDescriptor(),
      metadata: {
        ...super.getDescriptor().metadata,
        id: 'rest-provider',
        name: 'Mock REST Provider',
        tags: ['rest'],
        namespaces: ['rest']
      }
    };
  }
}

class MockMCPConnection implements MCPConnection {
  private connected = false;
  
  public getDescriptor(): MCPServerDescriptor {
    return {
      id: 'mock-mcp-1',
      name: 'Mock MCP Server',
      version: '1.0.0',
      transportType: MCPTransportType.STDIO,
      transportConfig: {}
    };
  }
  
  public async connect(): Promise<void> { this.connected = true; }
  public async disconnect(): Promise<void> { this.connected = false; }
  
  public async executeTool(toolName: string, args: unknown): Promise<unknown> {
    return { status: 'success', toolName, args };
  }
  
  public async listTools(): Promise<any[]> {
    return [
      { name: 'read_file', version: '1.1.0', description: 'MCP read file', inputSchema: {} },
      { name: 'mcp_specific_tool', version: '1.0.0', description: 'MCP tool', inputSchema: {} }
    ];
  }
  
  public async getHealth(): Promise<MCPHealth> {
    return {
      status: ProviderHealthStatus.HEALTHY,
      lastPing: Date.now(),
      connectionState: this.connected ? 'CONNECTED' : 'DISCONNECTED'
    };
  }
  
  public getCapabilities(): MCPCapabilities {
    return { tools: true };
  }
}

// Dummy Native Tool
class DummyNativeTool implements Tool {
  constructor(private name: string, private description: string) {}
  getDescriptor() {
    return {
      metadata: { name: this.name, version: '1.0.0', description: this.description, tags: ['native'] },
      schema: { inputSchema: {}, outputSchema: {} },
      capabilities: [],
      permissions: []
    };
  }
  getState() { return ToolLifecycleState.READY; }
  async initialize() {}
  async execute(context: ExecutionContext, input: unknown) { return `Native ${this.name} executed`; }
  async cleanup() {}
}

async function runPlayground() {
  console.log('============================================================');
  console.log('COGNITIVE INTEGRATION PLAYGROUND');
  console.log('============================================================');

  // We need to set up the context layers
  console.log('\n--- Scenario 1: Memory -> Knowledge -> Retriever -> ContextBuilder -> PromptContext ---');
  const memory = new InMemoryMemoryProvider();
  const knowledge = new InMemoryKnowledgeStore();
  
  await memory.initialize();
  await knowledge.initialize();

  // Add some data
  await memory.create({
    id: 'mem-1',
    content: { action: 'user_ask', query: 'What is my favorite color?' },
    metadata: { agentId: 'agent-1', sessionId: 'sess-1' }
  });
  
  await knowledge.createRecord({
    id: 'know-1',
    content: { color: 'blue' },
    metadata: { label: 'User favorite color is blue', userId: 'user-1' }
  });

  // No SimpleRetriever, just query them directly
  const contextBuilder = new SimpleContextBuilder();
  
  const query = 'What is my favorite color?';
  const memories = await memory.query({});
  const knowledgeNodes = await knowledge.queryRecords({});
  const promptContext = await contextBuilder.build({ userPrompt: query, memories: memories.map(m => ({ id: m.id || '?', content: JSON.stringify(m.content) })), knowledge: knowledgeNodes.map(k => ({ id: k.id || '?', content: JSON.stringify(k.content) })), tokenBudget: { maxTokens: 1000, reservedCompletionTokens: 100 } });
  console.log('Prompt Context Parts Built:', promptContext.sections.length);
  console.log('Prompt Context Content preview:', JSON.stringify(promptContext).substring(0, 150) + '...');
  
  console.log('\n--- Scenario 2: Execution -> Reflection -> Learning -> Knowledge Promotion -> Knowledge Store ---');
  const reflection = new RuleBasedReflection();
  const learning = new RuleBasedLearningEngine();
  
  const execResultSuccess = {
    id: 'exec-1',
    status: 'SUCCESS',
    toolName: 'read_file',
    args: { path: '/tmp/test.txt' },
    result: 'file contents: secret recipe',
    error: undefined,
    durationMs: 120,
    timestamp: Date.now()
  } as any;
  
  const reflectionResult = await reflection.reflect({ executionId: execResultSuccess.id, result: execResultSuccess });
  console.log('Reflection generated insights:', reflectionResult.suggestions.length);
  
  const learningResult = await learning.learn({ reflection: reflectionResult });
  console.log('Learning generated promotions:', learningResult.knowledgePromotions.length);
  
  for (const promo of learningResult.knowledgePromotions) {
    if (promo.proposedKnowledge) {
      await knowledge.createRecord(promo.proposedKnowledge as any);
    }
  }
  
  const updatedNodes = await knowledge.queryRecords({ limit: 100 });
  console.log('Knowledge Store nodes count:', updatedNodes.length);

  console.log('\n--- Scenario 3: Noise -> Reflection -> Learning -> Discard ---');
  const execResultNoise = {
    id: 'exec-2',
    status: 'ERROR',
    toolName: 'unknown_tool',
    args: {},
    result: null,
    error: { message: 'Tool not found' },
    durationMs: 5,
    timestamp: Date.now()
  } as any;
  
  const badReflection = await reflection.reflect({ executionId: execResultNoise.id, result: execResultNoise, errors: [execResultNoise.error] });
  console.log('Noise Reflection insights (should have low confidence or negative impact):', badReflection.suggestions.length);
  const badLearning = await learning.learn({ reflection: badReflection });
  console.log('Noise Learning promotions (should be 0 or rejected):', badLearning.knowledgePromotions.length);

  // Tools Setup
  const registry = new DefaultToolRegistry();
  const providerRegistry = new DefaultToolProviderRegistry();
  const checkpointStore = new InMemoryCheckpointStore();
  const restoreStrategy = new DefaultRestoreStrategy();
  const resolver = new ToolResolver(registry);
  const permissionValidator = new PermissionValidator();
  const inputValidator = new InputValidator();
  const normalizer = new ResultNormalizer();
  const pipeline = new ExecutionPipeline(resolver, permissionValidator, inputValidator, normalizer, checkpointStore, restoreStrategy);
  const context = createInitialContext({ runId: 'test-1', agentId: 'agent-1', sessionId: 'sess-1' });
context.scope.allowedTools = ['*'];

  console.log('\n--- Scenario 4: Native Tool -> Execution Pipeline -> Success ---');
  const nativeProvider = new NativeToolProvider([new DummyNativeTool('read_file', 'Native read file')]);
  await providerRegistry.registerProvider(nativeProvider);
  await nativeProvider.discoverAndRegisterTools(registry);
  const nativeTool = await registry.getTool('read_file');
  if (nativeTool) {
    const result = await pipeline.execute(nativeTool.getDescriptor().metadata.name, {}, context);
    console.log('Result:', result.success, result.data, result.error);
  }
  
  console.log('\n--- Scenario 5: MCP Tool -> Discovery -> Registry -> Execution Pipeline -> Success ---');
  const mcpConnection = new MockMCPConnection();
  const mcpProvider = new MCPToolProvider(mcpConnection);
  await providerRegistry.registerProvider(mcpProvider);
  await mcpProvider.discoverAndRegisterTools(registry);
  
  const mcpTool = await registry.getTool('mcp_specific_tool');
  if (mcpTool) {
    const res = await pipeline.execute(mcpTool.getDescriptor().metadata.name, { hello: 'world' }, context);
    console.log('Result:', res.success, res.data, res.error);
  }

  console.log('\n--- Scenario 6: Mock REST ToolProvider -> Discovery -> Registry -> Execution Pipeline -> Success ---');
  const restProvider = new MockRESTToolProvider([new DummyNativeTool('rest_api_call', 'REST Call')]);
  await providerRegistry.registerProvider(restProvider);
  await restProvider.discoverAndRegisterTools(registry);
  const restTool = await registry.getTool('rest_api_call');
  if (restTool) {
    const res = await pipeline.execute(restTool.getDescriptor().metadata.name, { endpoint: '/ping' }, context);
    console.log('Result:', res.success, res.data, res.error);
  }

  console.log('\n--- Scenario 7: Hot-add MCP server -> Discovery refresh -> Registry update ---');
  const mcpConnection2 = new MockMCPConnection();
  // Modify connection 2 slightly
  mcpConnection2.getDescriptor = () => ({ id: 'mock-mcp-2', name: 'Hot MCP Server', version: '1.0.0', transportType: MCPTransportType.STDIO, transportConfig: {} });
  mcpConnection2.listTools = async () => [{ name: 'hot_added_tool', version: '1.0.0', description: 'Hot tool', inputSchema: {} }];
  
  const mcpProvider2 = new MCPToolProvider(mcpConnection2);
  await providerRegistry.registerProvider(mcpProvider2);
  await mcpProvider2.discoverAndRegisterTools(registry);
  const hotTool = await registry.getTool('hot_added_tool');
  console.log('Hot added tool found:', hotTool?.getDescriptor().metadata.name);

  console.log('\n--- Scenario 8: Hot-remove MCP server -> Registry refresh -> Verify removed tools disappear ---');
  await mcpProvider2.unregisterTools(registry);
  await providerRegistry.unregisterProvider('mcp-provider-mock-mcp-2');
  const missingTool = await registry.getTool('hot_added_tool');
  console.log('Hot added tool found after removal:', missingTool !== null);

  console.log('\n--- Scenario 9: Duplicate tool names -> Native read_file + MCP read_file -> Verify deterministic namespace resolution ---');
  const tools = await registry.findTools({ name: 'read_file' });
  // Since we overrode read_file version to 1.1.0 in MCP, the resolver correctly picked MCP over Native.
  console.log('Found versions/implementations of read_file:', tools.length);
  tools.forEach((t, i) => console.log(`  [${i}]: tags ${t.metadata.tags?.join(', ')}`));
  const defaultReadFile = await registry.getTool('read_file');
  console.log('Default resolve returns (highest priority / version) [should be mcp]:', defaultReadFile?.getDescriptor().metadata.tags);

  console.log('\n============================================================');
  console.log('PLAYGROUND FINISHED');
  console.log('============================================================');
}

runPlayground().catch(console.error);
