import fs from 'fs';
const file = 'src/server/services/agentIntegration/execution/ExecutionIntegrationService.ts';
let content = fs.readFileSync(file, 'utf8');

const importAdd = `import { AgentFeatureFlags } from '../AgentFeatureFlags.js';
import { RuleBasedReflection } from '../../../../agent/reflection/RuleBasedReflection.js';
import { ReflectionRecord } from '../../../../agent/reflection/ReflectionTypes.js';
import { ExecutionState } from '../../../../agent/runtime/ExecutionState.js';`;

content = content.replace("import { AgentFeatureFlags } from '../AgentFeatureFlags.js';", importAdd);

const classStart = `export class ExecutionIntegrationService {
    private pipeline: ExecutionPipeline;
    private registry: DefaultToolRegistry;`;
    
const classStartReplace = `export class ExecutionIntegrationService {
    private pipeline: ExecutionPipeline;
    private registry: DefaultToolRegistry;
    private reflectionEngine = new RuleBasedReflection();
    public static reflectionLogs: ReflectionRecord[] = []; // In-memory store`;

content = content.replace(classStart, classStartReplace);

const targetBlock = `        const result = await this.pipeline.execute(name, args, context);
        if (!result.success) {
            throw result.error;
        }
        return result.data;`;

const replacementBlock = `        const result = await this.pipeline.execute(name, args, context);
        
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
                console.log(\`[Reflection] Generated record for \${name}: Score \${reflectionRecord.summary.overallScore}\`);
            } catch (err) {
                console.error("[Reflection] Failed to generate reflection:", err);
            }
        }
        
        if (!result.success) {
            throw result.error;
        }
        return result.data;`;

content = content.replace(targetBlock, replacementBlock);
fs.writeFileSync(file, content);
console.log("Patched ExecutionIntegrationService!");
