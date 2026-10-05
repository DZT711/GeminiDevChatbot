import fs from 'fs';
import path from 'path';
import {
  BrainTaskProfile,
  BrainCandidateLearning,
  BrainPromotionDecision,
  BrainAuditLog,
  BrainContextSummary,
  BrainContextModuleSummary,
  BrainContextLessonSummary,
  BrainContextDecisionSummary,
  BrainContextFlowSummary,
  BrainWriteResult
} from '../../../agent/brain/BrainTypes.js';
import { BrainGovernance } from '../../../agent/brain/BrainGovernance.js';
import { BrainProvider } from '../../../agent/brain/BrainProvider.js';
import { NotionBrainProvider } from './NotionBrainProvider.js';

interface NotionDatabaseMap {
  archDbId: string;
  decisionsDbId: string;
  knowledgeDbId: string;
  lessonsDbId: string;
  flowsDbId: string;
  learningLogDbId: string;
  tasksDbId: string;
  experimentsDbId: string;
  dashboardPageId?: string;
  projectStatePageId?: string;
}

export class NotionBrainService {
  private static instance: NotionBrainService | null = null;
  public dbMap: NotionDatabaseMap | null = null;

  // Session-local memory cache to avoid redundant queries and excessive token consumption
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private brainProvider: BrainProvider = new NotionBrainProvider()) {
    this.loadDatabaseMap();
  }

  public static getInstance(brainProvider?: BrainProvider): NotionBrainService {
    if (!NotionBrainService.instance) {
      NotionBrainService.instance = new NotionBrainService(brainProvider);
    }
    return NotionBrainService.instance;
  }

  public getBrainProvider(): BrainProvider {
    return this.brainProvider;
  }

  private loadDatabaseMap(): void {
    try {
      const candidates = [
        path.join(process.cwd(), 'test_db_map.json'),
        path.join(process.cwd(), 'db_map.json')
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          this.dbMap = JSON.parse(fs.readFileSync(p, 'utf8'));
          return;
        }
      }
    } catch (e) {
      console.warn('[NotionBrainService] Could not load database map file:', e);
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.brainProvider.isAvailable() && this.dbMap && this.dbMap.archDbId);
  }

  /**
   * Reads compact, targeted Brain context before non-trivial tasks via BrainProvider.
   */
  public async readContextForTask(
    prompt: string,
    activeFiles: string[] = []
  ): Promise<BrainContextSummary | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const taskProfile = BrainGovernance.detectTaskProfile(prompt, activeFiles);
      const cacheKey = `read_${taskProfile}_${prompt.substring(0, 30)}_${activeFiles.join(',')}`;

      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.data as BrainContextSummary;
      }

      const relevantModules: BrainContextModuleSummary[] = [];
      const relevantLessons: BrainContextLessonSummary[] = [];
      const relevantDecisions: BrainContextDecisionSummary[] = [];
      const relevantFlows: BrainContextFlowSummary[] = [];
      const invariants: string[] = [
        'src/agent/ core must remain provider-agnostic with zero vendor SDK imports.',
        'AgentRuntime is the sole execution authority for lifecycle transitions.',
        'All tool calls must pass through ExecutionPipeline; planners never execute tools.',
        'Canonical AgentSession is shared across all surfaces without split-brain sessions.'
      ];

      // 1. Query relevant architecture modules (max 3) via BrainProvider
      if (this.dbMap?.archDbId) {
        try {
          const archData = (await this.brainProvider.queryDatabase(this.dbMap.archDbId, {
            pageSize: 10
          })) as any;
          const results = archData?.results || [];
          for (const item of results) {
            const name = item.properties?.Name?.title?.[0]?.plain_text || '';
            const layer = item.properties?.Layer?.select?.name || '';
            const pathVal = item.properties?.['Source Path']?.rich_text?.[0]?.plain_text || '';

            const matches =
              prompt.toLowerCase().includes(name.toLowerCase()) ||
              activeFiles.some(f => f.includes(pathVal) || pathVal.includes(f));

            if (matches || relevantModules.length < 2) {
              relevantModules.push({
                name,
                layer,
                path: pathVal,
                summary: `Layer: ${layer}, Path: ${pathVal}`
              });
              if (relevantModules.length >= 3) break;
            }
          }
        } catch (e) {
          console.warn('[NotionBrainService] Non-fatal error reading Architecture DB:', e);
        }
      }

      // 2. Query relevant Lessons & Bug Memory (max 2) via BrainProvider
      if (this.dbMap?.lessonsDbId && (taskProfile === 'DEBUGGING' || taskProfile === 'ROUTINE_CODING' || taskProfile === 'ARCHITECTURE_CHANGE')) {
        try {
          const lessonsData = (await this.brainProvider.queryDatabase(this.dbMap.lessonsDbId, {
            pageSize: 5
          })) as any;
          for (const item of lessonsData?.results || []) {
            const title = item.properties?.Name?.title?.[0]?.plain_text || '';
            const rule = item.properties?.['Reusable Rule']?.rich_text?.[0]?.plain_text || '';
            if (rule) {
              relevantLessons.push({ title, rule });
              if (relevantLessons.length >= 2) break;
            }
          }
        } catch (e) {
          console.warn('[NotionBrainService] Non-fatal error reading Lessons DB:', e);
        }
      }

      // 3. Query relevant Decisions / ADRs (max 2) via BrainProvider
      if (this.dbMap?.decisionsDbId && (taskProfile === 'REFACTORING' || taskProfile === 'ARCHITECTURE_CHANGE')) {
        try {
          const adrData = (await this.brainProvider.queryDatabase(this.dbMap.decisionsDbId, {
            pageSize: 5
          })) as any;
          for (const item of adrData?.results || []) {
            const title = item.properties?.Name?.title?.[0]?.plain_text || '';
            const status = item.properties?.Status?.select?.name || '';
            const evidence = item.properties?.Evidence?.rich_text?.[0]?.plain_text || '';
            if (title) {
              relevantDecisions.push({ title, status, summary: evidence || 'Accepted architectural decision.' });
              if (relevantDecisions.length >= 2) break;
            }
          }
        } catch (e) {
          console.warn('[NotionBrainService] Non-fatal error reading Decisions DB:', e);
        }
      }

      // 4. Query relevant Flows (max 2) via BrainProvider
      if (this.dbMap?.flowsDbId && (taskProfile === 'DEBUGGING' || taskProfile === 'REFACTORING')) {
        try {
          const flowsData = (await this.brainProvider.queryDatabase(this.dbMap.flowsDbId, {
            pageSize: 5
          })) as any;
          for (const item of flowsData?.results || []) {
            const title = item.properties?.Name?.title?.[0]?.plain_text || '';
            const trigger = item.properties?.Trigger?.rich_text?.[0]?.plain_text || '';
            if (title) {
              relevantFlows.push({ title, trigger });
              if (relevantFlows.length >= 2) break;
            }
          }
        } catch (e) {
          console.warn('[NotionBrainService] Non-fatal error reading Flows DB:', e);
        }
      }

      // If all database queries failed or returned 0 records, return null to avoid injecting empty context
      if (
        relevantModules.length === 0 &&
        relevantLessons.length === 0 &&
        relevantDecisions.length === 0 &&
        relevantFlows.length === 0
      ) {
        return null;
      }

      const summary: BrainContextSummary = {
        taskProfile,
        relevantModules,
        relevantLessons,
        relevantDecisions,
        relevantFlows,
        invariants,
        formattedContext: '',
        tokenEstimate: 0
      };

      summary.formattedContext = BrainGovernance.formatCompactContext(summary);
      summary.tokenEstimate = Math.ceil(summary.formattedContext.length / 4);

      this.cache.set(cacheKey, { data: summary, timestamp: Date.now() });
      return summary;
    } catch (error) {
      console.warn('[NotionBrainService] Non-fatal error reading Brain context:', error);
      return null;
    }
  }

  /**
   * Promotes and persists a candidate learning item to the appropriate Notion database via BrainProvider,
   * then appends the mandatory audit record into Agent Learning Log.
   */
  public async writeCandidateLearning(
    candidate: BrainCandidateLearning
  ): Promise<BrainWriteResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        targetDatabase: candidate.targetDatabase,
        error: 'Notion Brain is not configured.'
      };
    }

    try {
      // 1. Evaluate candidate through governance policy
      const decision = BrainGovernance.evaluateCandidate(candidate);

      // If rejected, audit the rejection and exit safely
      if (!decision.approved) {
        console.log(`[NotionBrainService] Candidate learning rejected: ${decision.reason}`);
        const auditLog = BrainGovernance.createAuditLog(candidate, decision, candidate.targetDatabase);
        const auditId = await this.recordAuditLog(auditLog);
        return {
          success: false,
          targetDatabase: candidate.targetDatabase,
          auditLogId: auditId || undefined,
          error: decision.reason
        };
      }

      // 2. Resolve target database ID
      const targetDbId = this.resolveDatabaseId(candidate.targetDatabase);
      if (!targetDbId) {
        throw new Error(`Target database "${candidate.targetDatabase}" not found in database map.`);
      }

      // 3. Prepare sanitized payload for target database
      const sanitizedSummary = BrainGovernance.sanitizeForBrain(candidate.summary);
      const sanitizedEvidence = BrainGovernance.sanitizeForBrain(candidate.evidence);
      let pageProperties: Record<string, unknown> = {};

      if (candidate.targetDatabase === 'Lessons & Bug Memory') {
        pageProperties = {
          Name: { title: [{ text: { content: candidate.title } }] },
          Status: { select: { name: 'Resolved' } },
          Date: { date: { start: new Date().toISOString().split('T')[0] } },
          'Reusable Rule': { rich_text: [{ text: { content: candidate.reusableRule || sanitizedSummary } }] },
          Evidence: { rich_text: [{ text: { content: sanitizedEvidence } }] }
        };
      } else if (candidate.targetDatabase === 'Knowledge & Concepts') {
        pageProperties = {
          Name: { title: [{ text: { content: candidate.title } }] },
          Type: { select: { name: 'Invariant' } },
          Confidence: { select: { name: candidate.confidence } },
          Source: { rich_text: [{ text: { content: candidate.sourceFiles?.join(', ') || 'Source verification' } }] },
          'Last Verified': { date: { start: new Date().toISOString().split('T')[0] } }
        };
      } else if (candidate.targetDatabase === 'Decisions') {
        pageProperties = {
          Name: { title: [{ text: { content: candidate.title } }] },
          Status: { select: { name: 'Accepted' } },
          Importance: { select: { name: candidate.decisionDetails?.importance || 'High' } },
          Date: { date: { start: new Date().toISOString().split('T')[0] } },
          Evidence: { rich_text: [{ text: { content: sanitizedEvidence } }] }
        };
      } else {
        pageProperties = {
          Name: { title: [{ text: { content: candidate.title } }] }
        };
      }

      // 4. Create record in target database via BrainProvider
      const createdRecord = (await this.brainProvider.createRecord(
        targetDbId,
        pageProperties,
        [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ text: { content: sanitizedSummary } }]
            }
          }
        ]
      )) as any;

      console.log(`[NotionBrainService] Persisted durable learning item "${candidate.title}" (ID: ${createdRecord.id}) in ${candidate.targetDatabase}`);

      // 5. Append mandatory audit record into Agent Learning Log via BrainProvider
      const auditLog = BrainGovernance.createAuditLog(candidate, decision, `${candidate.targetDatabase} (${createdRecord.id})`);
      const auditId = await this.recordAuditLog(auditLog);

      // Invalidate relevant cache entries
      this.cache.clear();

      return {
        success: true,
        targetDatabase: candidate.targetDatabase,
        recordId: createdRecord.id,
        auditLogId: auditId || undefined
      };
    } catch (error) {
      console.warn('[NotionBrainService] Non-fatal error persisting durable learning:', error);
      return {
        success: false,
        targetDatabase: candidate.targetDatabase,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Appends an audit entry into Agent Learning Log database via BrainProvider.
   */
  public async recordAuditLog(audit: BrainAuditLog): Promise<string | null> {
    if (!this.dbMap?.learningLogDbId) {
      return null;
    }

    try {
      const sanitizedSummary = BrainGovernance.sanitizeForBrain(audit.summary);
      const sanitizedEvidence = BrainGovernance.sanitizeForBrain(audit.evidence);

      const logRecord = (await this.brainProvider.createRecord(
        this.dbMap.learningLogDbId,
        {
          Name: { title: [{ text: { content: audit.name } }] },
          Date: { date: { start: audit.date } },
          Task: { rich_text: [{ text: { content: audit.task } }] },
          'Learning Type': { select: { name: audit.learningType } },
          Action: { select: { name: audit.action } },
          'Target Page': { rich_text: [{ text: { content: audit.targetPage } }] },
          Summary: { rich_text: [{ text: { content: sanitizedSummary } }] },
          Evidence: { rich_text: [{ text: { content: sanitizedEvidence } }] },
          Confidence: { select: { name: audit.confidence } },
          'Agent Identity': { select: { name: audit.agentIdentity } }
        }
      )) as any;

      console.log(`[NotionBrainService] Recorded Agent Learning Log audit entry (ID: ${logRecord.id}): ${audit.name}`);
      return logRecord.id;
    } catch (e) {
      console.warn('[NotionBrainService] Non-fatal error recording Agent Learning Log:', e);
      return null;
    }
  }

  public resolveDatabaseId(target: string): string | null {
    if (!this.dbMap) return null;
    switch (target) {
      case 'Architecture & Modules': return this.dbMap.archDbId;
      case 'Decisions': return this.dbMap.decisionsDbId;
      case 'Knowledge & Concepts': return this.dbMap.knowledgeDbId;
      case 'Lessons & Bug Memory': return this.dbMap.lessonsDbId;
      case 'Execution Flows': return this.dbMap.flowsDbId;
      case 'Agent Learning Log': return this.dbMap.learningLogDbId;
      case 'Tasks': return this.dbMap.tasksDbId;
      case 'Experiments': return this.dbMap.experimentsDbId;
      default: return null;
    }
  }
}
