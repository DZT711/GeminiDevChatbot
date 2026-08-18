import fs from 'fs';
const file = 'src/server/services/agentIntegration/execution/ExecutionIntegrationService.ts';
let content = fs.readFileSync(file, 'utf8');

const importAdd = `import { AgentFeatureFlags } from '../AgentFeatureFlags.js';
import { RuleBasedReflection } from '../../../../agent/reflection/RuleBasedReflection.js';
import { ReflectionRecord } from '../../../../agent/reflection/ReflectionTypes.js';
import { ExecutionState } from '../../../../agent/runtime/ExecutionState.js';
import { RuleBasedLearningEngine } from '../../../../agent/learning/RuleBasedLearningEngine.js';
import { LearningResult } from '../../../../agent/learning/LearningTypes.js';`;

content = content.replace("import { AgentFeatureFlags } from '../AgentFeatureFlags.js';\nimport { RuleBasedReflection } from '../../../../agent/reflection/RuleBasedReflection.js';\nimport { ReflectionRecord } from '../../../../agent/reflection/ReflectionTypes.js';\nimport { ExecutionState } from '../../../../agent/runtime/ExecutionState.js';", importAdd);

const classStart = `export class ExecutionIntegrationService {
    private pipeline: ExecutionPipeline;
    private registry: DefaultToolRegistry;
    private reflectionEngine = new RuleBasedReflection();
    public static reflectionLogs: ReflectionRecord[] = []; // In-memory store`;
    
const classStartReplace = `export class ExecutionIntegrationService {
    private pipeline: ExecutionPipeline;
    private registry: DefaultToolRegistry;
    private reflectionEngine = new RuleBasedReflection();
    private learningEngine = new RuleBasedLearningEngine();
    public static reflectionLogs: ReflectionRecord[] = []; // In-memory store
    public static learningLogs: LearningResult[] = []; // In-memory store`;

content = content.replace(classStart, classStartReplace);

const targetBlock = `                const reflectionRecord = await this.reflectionEngine.reflect(reflectionReq);
                ExecutionIntegrationService.reflectionLogs.push(reflectionRecord);
                console.log(\`[Reflection] Generated record for \${name}: Score \${reflectionRecord.summary.overallScore}\`);
            } catch (err) {`;

const replacementBlock = `                const reflectionRecord = await this.reflectionEngine.reflect(reflectionReq);
                ExecutionIntegrationService.reflectionLogs.push(reflectionRecord);
                console.log(\`[Reflection] Generated record for \${name}: Score \${reflectionRecord.summary.overallScore}\`);
                
                if (AgentFeatureFlags.USE_LEARNING) {
                    try {
                        const learningReq = {
                            reflection: reflectionRecord
                        };
                        const learningResult = await this.learningEngine.learn(learningReq);
                        ExecutionIntegrationService.learningLogs.push(learningResult);
                        console.log(\`[Learning] Generated decision for \${name}: \${learningResult.decision}\`);
                    } catch (err) {
                        console.error("[Learning] Failed to generate learning result:", err);
                    }
                }
            } catch (err) {`;

content = content.replace(targetBlock, replacementBlock);
fs.writeFileSync(file, content);
console.log("Patched ExecutionIntegrationService for learning!");
