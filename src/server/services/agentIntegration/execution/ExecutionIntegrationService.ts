import { ExecutionPipeline } from '../../../../agent/tools/ExecutionPipeline.js';
import { DefaultToolRegistry } from '../../../../agent/tools/ToolRegistry.js';
import { ToolResolver } from '../../../../agent/tools/ToolResolver.js';
import { PermissionValidator } from '../../../../agent/tools/PermissionValidator.js';
import { InputValidator } from '../../../../agent/tools/InputValidator.js';
import { ResultNormalizer } from '../../../../agent/tools/ResultNormalizer.js';
import { InMemoryCheckpointStore } from '../../../../agent/checkpoint/CheckpointStore.js';
import { DefaultRestoreStrategy } from '../../../../agent/checkpoint/Restore.js';
import { createInitialContext } from '../../../../agent/runtime/ExecutionContext.js';
import { ToolExecutionAdapter } from './ToolExecutionAdapter.js';
import { AgentFeatureFlags } from '../AgentFeatureFlags.js';
import { RuleBasedReflection } from '../../../../agent/reflection/RuleBasedReflection.js';
import { ReflectionRecord } from '../../../../agent/reflection/ReflectionTypes.js';
import { ExecutionState } from '../../../../agent/runtime/ExecutionState.js';
import { RuleBasedLearningEngine } from '../../../../agent/learning/RuleBasedLearningEngine.js';
import { LearningResult } from '../../../../agent/learning/LearningTypes.js';
import { DurableExperienceStore } from '../../experience/DurableExperienceStore.js';
import { ExperienceStore } from '../../../../agent/experience/ExperienceStore.js';
import { DefaultPromotionService, PromotionService } from '../../../../agent/promotion/index.js';
import { InMemoryKnowledgeStore } from '../../../../agent/knowledge/InMemoryKnowledgeStore.js';
import { KnowledgeStore } from '../../../../agent/knowledge/KnowledgeStore.js';

export class ExecutionIntegrationService {
    private pipeline: ExecutionPipeline;
    private registry: DefaultToolRegistry;
    private reflectionEngine = new RuleBasedReflection();
    private learningEngine = new RuleBasedLearningEngine();
    private knowledgeStore: KnowledgeStore = new InMemoryKnowledgeStore();
    private promotionService: PromotionService;
    
    // M05 Durable Store replacing in-memory arrays (imported dynamically or require later)
    public static experienceStore: ExperienceStore = new DurableExperienceStore();

    public static reflectionLogs: ReflectionRecord[] = []; // In-memory store
    public static learningLogs: LearningResult[] = []; // In-memory store
    
    constructor(knowledgeStore?: KnowledgeStore) {
        if (knowledgeStore) {
            this.knowledgeStore = knowledgeStore;
        }
        this.promotionService = new DefaultPromotionService(
            this.knowledgeStore,
            undefined,
            ExecutionIntegrationService.experienceStore
        );
        this.registry = new DefaultToolRegistry();
        const resolver = new ToolResolver(this.registry);
        const permissionValidator = new PermissionValidator();
        const inputValidator = new InputValidator();
        const normalizer = new ResultNormalizer();
        const checkpointStore = new InMemoryCheckpointStore();
        const restoreStrategy = new DefaultRestoreStrategy();
        
        this.pipeline = new ExecutionPipeline(
            resolver,
            permissionValidator,
            inputValidator,
            normalizer,
            checkpointStore,
            restoreStrategy
        );
    }
    
    public async registerProductionTools(payload: any, sendEvent: (type: string, data: any) => void) {
        const adapter = new ToolExecutionAdapter(payload, sendEvent);
        await this.registry.register(adapter.createProposeKnowledgeTool());
        await this.registry.register(adapter.createExecuteCodeTool());
        await this.registry.register(adapter.createReadGithubRepoTool());
    }

    public async executeTool(name: string, args: any): Promise<any> {
        const context = createInitialContext(
            `exec_${Date.now()}`, 
            `task_${Date.now()}`,
            {
               scope: {
                  permissions: [],
                  allowedTools: ['*']
               }
            }
        );
        
        const result = await this.pipeline.execute(name, args, context);
        
        if (AgentFeatureFlags.USE_REFLECTION) {
            try {
                const reflectionReq = {
                    executionId: context.executionId,
                    result: {
                        executionId: context.executionId,
                        success: result.success,
                        finalState: result.success ? ExecutionState.COMPLETED : ExecutionState.FAILED,
                        completedAt: Date.now(),
                        error: result.error as Error | undefined
                    },
                    toolResults: [result],
                    errors: result.error ? [result.error as Error] : undefined
                };
                
                const reflectionRecord = await this.reflectionEngine.reflect(reflectionReq);
                ExecutionIntegrationService.reflectionLogs.push(reflectionRecord);
                console.log(`[Reflection] Generated record for ${name}: Score ${reflectionRecord.summary.overallScore}`);

                // M05: Append to durable store
                await ExecutionIntegrationService.experienceStore.append({
                    sessionId: context.workspaceId || 'unknown_session',
                    taskId: context.executionId,
                    type: 'REFLECTION',
                    payload: reflectionRecord as unknown as Record<string, unknown>,
                    metadata: {
                        success: true, // reflection generation succeeded
                    }
                }).catch(e => console.error("[Reflection] ExperienceStore error:", e));

                if (AgentFeatureFlags.USE_LEARNING) {
                    try {
                        const learningReq = {
                            reflection: reflectionRecord
                        };
                        const learningResult = await this.learningEngine.learn(learningReq);
                        ExecutionIntegrationService.learningLogs.push(learningResult);
                        console.log(`[Learning] Generated decision for ${name}: ${learningResult.decision}`);

                        // M05: Append to durable store
                        await ExecutionIntegrationService.experienceStore.append({
                            sessionId: context.workspaceId || 'unknown_session',
                            taskId: context.executionId,
                            type: 'LEARNING',
                            payload: learningResult as unknown as Record<string, unknown>,
                            metadata: {
                                success: true
                            }
                        }).catch(e => console.error("[Learning] ExperienceStore error:", e));

                        // M05-02: Knowledge Promotion Boundary
                        if (AgentFeatureFlags.USE_KNOWLEDGE_PROMOTION) {
                            try {
                                const promotionResults = await this.promotionService.processLearningResult(learningResult, {
                                    sessionId: context.workspaceId || 'unknown_session',
                                    taskId: context.taskId || context.executionId,
                                    executionId: context.executionId,
                                    toolName: name,
                                    overallScore: reflectionRecord.summary.overallScore,
                                    detectedMistakes: reflectionRecord.summary.detectedMistakes,
                                    potentialImprovements: reflectionRecord.summary.potentialImprovements,
                                    durationMs: typeof result.metadata?.durationMs === 'number' ? result.metadata.durationMs : undefined
                                });
                                console.log(`[Promotion] Processed ${promotionResults.length} promotion candidates for ${name}`);
                            } catch (promoErr) {
                                console.error("[Promotion] Failed to process promotion:", promoErr);
                            }
                        }
                    } catch (err) {
                        console.error("[Learning] Failed to generate learning result:", err);
                    }
                }
            } catch (err) {
                console.error("[Reflection] Failed to generate reflection:", err);
            }
        }
        
        if (!result.success) {
            return { status: "error", error: (result.error as any)?.message || String(result.error) };
        }
        return result.data;
    }
}
