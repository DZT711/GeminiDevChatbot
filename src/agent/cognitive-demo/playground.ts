import { InMemoryMemoryProvider } from '../memory';
import { RuleBasedReflection, ReflectionRequest } from '../reflection';
import { RuleBasedLearningEngine, LearningRequest, LearningDecision } from '../learning';
import { SimpleContextBuilder, DefaultTokenEstimator, ContextBuilderRequest, TokenBudget } from '../context';
import { ExecutionResult } from '../runtime/ExecutionResult';
import { ExecutionState } from '../runtime/ExecutionState';
import { ToolResult } from '../tools/ToolResult';

async function runPlayground() {
  console.log('============================================================');
  console.log('M03-06.5 : COGNITIVE PLAYGROUND');
  console.log('============================================================\n');

  // Initialize Core Services
  const memoryStore = new InMemoryMemoryProvider();
  await memoryStore.initialize();
  
  const reflectionEngine = new RuleBasedReflection();
  const learningEngine = new RuleBasedLearningEngine();
  const contextBuilder = new SimpleContextBuilder();

  // ------------------------------------------------------------
  // Scenario 1: Experience -> Reflection -> Learning -> Knowledge Promotion
  // ------------------------------------------------------------
  console.log('--- SCENARIO 1: Knowledge Promotion ---');
  
  const successfulExecution: ExecutionResult = {
    executionId: 'exec-1',
    success: true,
    finalState: { status: 'COMPLETED' } as unknown as ExecutionState,
    completedAt: Date.now()
  };
  
  const successfulTools: ToolResult[] = [
    { success: true, timestamp: Date.now(), metadata: { toolName: 'search_web' } }
  ];

  const reflectionReq1: ReflectionRequest = {
    executionId: successfulExecution.executionId,
    result: successfulExecution,
    toolResults: successfulTools
  };

  const reflection1 = await reflectionEngine.reflect(reflectionReq1);
  console.log('Reflection generated for Exec 1: Score =', reflection1.summary.overallScore);
  
  const learningReq1: LearningRequest = { reflection: reflection1 };
  const learningResult1 = await learningEngine.learn(learningReq1);
  console.log('Learning Decision:', learningResult1.decision);
  console.log('Knowledge Promotions:', learningResult1.knowledgePromotions.length);
  
  // Apply promotions to Knowledge Store (MemoryProvider namespace='knowledge')
  for (const kp of learningResult1.knowledgePromotions) {
    await memoryStore.create({
      id: crypto.randomUUID(), namespace: 'knowledge',
      content: kp.content,
      metadata: { confidence: kp.confidence, tags: kp.tags }
    });
    console.log('-> Promoted to Knowledge:', kp.content);
  }
  console.log('\n');

  // ------------------------------------------------------------
  // Scenario 2: Experience -> Reflection -> Learning -> Discard
  // ------------------------------------------------------------
  console.log('--- SCENARIO 2: Discard Noisy Experience ---');
  
  const silentExecution: ExecutionResult = {
    executionId: 'exec-2',
    success: true,
    finalState: { status: 'COMPLETED' } as unknown as ExecutionState,
    completedAt: Date.now()
  };

  const reflectionReq2: ReflectionRequest = {
    executionId: silentExecution.executionId,
    result: silentExecution,
    toolResults: [] // No tools used, so no heuristic improvements are generated
  };

  const reflection2 = await reflectionEngine.reflect(reflectionReq2);
  const learningReq2: LearningRequest = { reflection: reflection2 };
  const learningResult2 = await learningEngine.learn(learningReq2);
  
  console.log('Reflection generated for Exec 2: Score =', reflection2.summary.overallScore);
  console.log('Learning Decision:', learningResult2.decision);
  if (learningResult2.decision === LearningDecision.DISCARD) {
    console.log('-> Noisy experience discarded successfully.');
  }
  console.log('\n');

  // ------------------------------------------------------------
  // Scenario 3: Knowledge already exists -> Version update
  // ------------------------------------------------------------
  console.log('--- SCENARIO 3: Duplicate Knowledge Handling ---');
  
  const newKnowledgeContent = 'Tool usage was successful, consider optimizing sequential tool calls to parallel if possible.';
  
  // Simulate checking for existing knowledge
  const existingKnowledge = await memoryStore.query({ namespace: 'knowledge' });
  const isDuplicate = existingKnowledge.some(k => k.content === newKnowledgeContent);
  
  if (isDuplicate) {
    console.log('-> Duplicate knowledge detected. Upgrading confidence instead of duplicating.');
    const duplicate = existingKnowledge.find(k => k.content === newKnowledgeContent)!;
    const currentConfidence = (duplicate.metadata.confidence as number) || 0;
    await memoryStore.update(duplicate.id, {
      metadata: { ...duplicate.metadata, confidence: Math.min(1.0, currentConfidence + 0.1) }
    });
    console.log(`-> Knowledge updated. New confidence: Math.min(1.0, ${currentConfidence} + 0.1)`);
  }
  console.log('\n');

  // ------------------------------------------------------------
  // Scenario 4: New Knowledge -> Context Builder -> PromptContext
  // ------------------------------------------------------------
  console.log('--- SCENARIO 4: Building Prompt with New Knowledge ---');
  
  const retrievedKnowledge = await memoryStore.query({ namespace: 'knowledge' });
  const knowledgeContext = retrievedKnowledge.map(k => ({ id: k.id, content: k.content as string }));
  
  const tokenBudget: TokenBudget = { maxTokens: 4000, reservedCompletionTokens: 1000 };
  
  const contextReq4: ContextBuilderRequest = {
    userPrompt: 'Tell me how to optimize my tool usage.',
    knowledge: knowledgeContext,
    tokenBudget
  };
  
  const promptContext4 = await contextBuilder.build(contextReq4);
  console.log('Prompt Context Sections:', promptContext4.sections.map(s => s.type));
  console.log('Included Knowledge:', promptContext4.sections.filter(s => s.type === 'KNOWLEDGE').map(s => s.content));
  console.log('\n');

  // ------------------------------------------------------------
  // Scenario 5: Memory + Knowledge + Workspace -> Final Context
  // ------------------------------------------------------------
  console.log('--- SCENARIO 5: Full Context Assembly ---');
  
  // Add some memory
  await memoryStore.create({
    id: crypto.randomUUID(), namespace: 'memory',
    content: 'User prefers concise answers.',
    metadata: {}
  });
  
  const retrievedMemories = await memoryStore.query({ namespace: 'memory' });
  const memoryContext = retrievedMemories.map(m => ({ id: m.id, content: m.content as string }));
  
  const contextReq5: ContextBuilderRequest = {
    systemPrompt: 'You are a helpful AI assistant.',
    userPrompt: 'Write a script to ping localhost.',
    workspaceContext: 'Project has package.json and src/ directory.',
    memories: memoryContext,
    knowledge: knowledgeContext,
    conversationHistory: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there! How can I help?' }
    ],
    tokenBudget: { maxTokens: 200, reservedCompletionTokens: 50 } // Extremely tight budget to test truncation
  };
  
  const promptContext5 = await contextBuilder.build(contextReq5);
  console.log('Token Budget Strategy:', promptContext5.metadata.strategy);
  console.log('Total Tokens Used:', promptContext5.statistics.totalTokens);
  console.log('Final Section Order (by priority):');
  promptContext5.sections.forEach((s, idx) => {
    console.log(`  ${idx + 1}. [${s.type}] ${s.content.substring(0, 50).replace(/\n/g, ' ')}...`);
  });
  console.log('Truncated Sections (IDs):', promptContext5.statistics.truncatedSections);
  
  console.log('\n============================================================');
  console.log('PLAYGROUND EXECUTION COMPLETED');
  console.log('============================================================');
}

runPlayground().catch(console.error);
