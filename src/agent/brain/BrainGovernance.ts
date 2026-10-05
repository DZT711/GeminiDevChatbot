import {
  BrainTaskProfile,
  BrainCandidateLearning,
  BrainPromotionDecision,
  BrainAuditLog,
  BrainContextSummary
} from './BrainTypes';

export class BrainGovernance {
  /**
   * Identifies the task profile based on the user's objective and affected file paths.
   */
  public static detectTaskProfile(prompt: string, activeFiles: string[] = []): BrainTaskProfile {
    const lower = prompt.toLowerCase();
    const filesStr = activeFiles.join(' ').toLowerCase();

    if (
      lower.includes('architecture') ||
      lower.includes('adr') ||
      lower.includes('invariant') ||
      lower.includes('decompose') ||
      lower.includes('boundary') ||
      filesStr.includes('runtime') ||
      filesStr.includes('pipeline')
    ) {
      return 'ARCHITECTURE_CHANGE';
    }

    if (
      lower.includes('bug') ||
      lower.includes('fix') ||
      lower.includes('error') ||
      lower.includes('crash') ||
      lower.includes('fail') ||
      lower.includes('exception')
    ) {
      return 'DEBUGGING';
    }

    if (
      lower.includes('refactor') ||
      lower.includes('cleanup') ||
      lower.includes('rename') ||
      lower.includes('reorganize') ||
      lower.includes('extract')
    ) {
      return 'REFACTORING';
    }

    return 'ROUTINE_CODING';
  }

  /**
   * Sanitizes text to guarantee no sensitive data or token-heavy dumps are persisted.
   */
  public static sanitizeForBrain(text: string): string {
    if (!text) return '';
    let sanitized = text;

    // Redact API tokens, secrets, Bearer tokens
    sanitized = sanitized.replace(/ntn_[a-zA-Z0-9_\-]+/g, '[REDACTED_NOTION_TOKEN]');
    sanitized = sanitized.replace(/secret_[a-zA-Z0-9_\-]+/g, '[REDACTED_SECRET]');
    sanitized = sanitized.replace(/AIzaSy[a-zA-Z0-9_\-]{33}/g, '[REDACTED_API_KEY]');
    sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED_TOKEN]');
    sanitized = sanitized.replace(/password\s*[:=]\s*['"][^'"]+['"]/gi, 'password=[REDACTED]');
    sanitized = sanitized.replace(/api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, 'api_key=[REDACTED]');

    // Strip out massive terminal stdout dumps or raw stacktraces if overly verbose
    if (sanitized.length > 2000) {
      sanitized = sanitized.substring(0, 1950) + '... [truncated for token efficiency]';
    }

    return sanitized;
  }

  /**
   * Evaluates whether a candidate learning item meets durability and evidence criteria.
   */
  public static evaluateCandidate(candidate: BrainCandidateLearning): BrainPromotionDecision {
    // 1. Durability check
    if (!candidate.isDurable) {
      return {
        approved: false,
        reason: 'Candidate is marked non-durable (trivial edit or temporary artifact).',
        learningType: 'Rejected Proposal',
        action: 'Audited'
      };
    }

    // 2. Evidence requirement
    if (!candidate.evidence || candidate.evidence.trim().length < 10) {
      return {
        approved: false,
        reason: 'Candidate rejected: Missing concrete source/test/compiler evidence.',
        learningType: 'Rejected Proposal',
        action: 'Audited'
      };
    }

    // 3. Minimum confidence check
    if (candidate.confidence !== 'High' && candidate.confidence !== 'Medium') {
      return {
        approved: false,
        reason: 'Candidate rejected: Insufficient confidence level.',
        learningType: 'Rejected Proposal',
        action: 'Audited'
      };
    }

    // 4. Content sanity
    if (!candidate.summary || candidate.summary.trim().length < 5) {
      return {
        approved: false,
        reason: 'Candidate rejected: Summary is empty or insufficient.',
        learningType: 'Rejected Proposal',
        action: 'Audited'
      };
    }

    return {
      approved: true,
      reason: 'Candidate meets all governance criteria: durable, verified evidence, and high/medium confidence.',
      learningType: candidate.learningType,
      action: candidate.learningType === 'Corrected Knowledge' ? 'Updated' : 'Created'
    };
  }

  /**
   * Generates a candidate learning record from completed task execution metadata.
   */
  public static generateCandidateFromExecution(params: {
    task: string;
    filesModified: string[];
    reusableRule?: string;
    detectedMistakes?: string[];
    potentialImprovements?: string[];
    isRefactoringOrArch?: boolean;
    evidenceText: string;
    moduleName?: string;
  }): BrainCandidateLearning | null {
    const {
      task,
      filesModified,
      reusableRule,
      detectedMistakes,
      potentialImprovements,
      isRefactoringOrArch,
      evidenceText,
      moduleName
    } = params;

    // Filter out trivial executions (e.g. 0 files modified and no rule or mistake)
    if (filesModified.length === 0 && !reusableRule && !isRefactoringOrArch) {
      return null;
    }

    // Case A: Bug fix with reusable rule -> Updated Lesson / Bug Memory
    if (reusableRule && reusableRule.trim().length > 10) {
      return {
        id: `candidate_lesson_${Date.now()}`,
        title: `Lesson: ${task.substring(0, 50)}`,
        learningType: 'Updated Lesson',
        targetDatabase: 'Lessons & Bug Memory',
        summary: reusableRule,
        evidence: BrainGovernance.sanitizeForBrain(evidenceText),
        confidence: 'High',
        moduleName: moduleName || 'Agent Panel',
        reusableRule: BrainGovernance.sanitizeForBrain(reusableRule),
        sourceFiles: filesModified,
        isDurable: true
      };
    }

    // Case B: Architecture or Contract Invariant -> New Knowledge or Added ADR
    if (isRefactoringOrArch) {
      return {
        id: `candidate_arch_${Date.now()}`,
        title: `Architecture Invariant: ${task.substring(0, 50)}`,
        learningType: 'New Knowledge',
        targetDatabase: 'Knowledge & Concepts',
        summary: potentialImprovements?.[0] || `Verified architectural boundary in ${filesModified.join(', ')}`,
        evidence: BrainGovernance.sanitizeForBrain(evidenceText),
        confidence: 'High',
        moduleName,
        sourceFiles: filesModified,
        isDurable: true
      };
    }

    // Case C: Derived general improvement from execution
    if (potentialImprovements && potentialImprovements.length > 0) {
      return {
        id: `candidate_improvement_${Date.now()}`,
        title: `Best Practice: ${potentialImprovements[0].substring(0, 50)}`,
        learningType: 'New Knowledge',
        targetDatabase: 'Knowledge & Concepts',
        summary: potentialImprovements[0],
        evidence: BrainGovernance.sanitizeForBrain(evidenceText),
        confidence: 'Medium',
        sourceFiles: filesModified,
        isDurable: true
      };
    }

    return null;
  }

  /**
   * Constructs the audit log entry corresponding to a durable Brain write or audit decision.
   */
  public static createAuditLog(
    candidate: BrainCandidateLearning,
    decision: BrainPromotionDecision,
    targetPage: string
  ): BrainAuditLog {
    const today = new Date().toISOString().split('T')[0];
    return {
      name: `[Audit] ${decision.learningType}: ${candidate.title.substring(0, 60)}`,
      date: today,
      task: candidate.title,
      learningType: decision.learningType,
      action: decision.action,
      targetPage,
      summary: candidate.summary,
      evidence: candidate.evidence,
      confidence: candidate.confidence,
      agentIdentity: 'DevGenie Coding Agent'
    };
  }

  /**
   * Formats compact context summary text to inject into the system/context prompt.
   */
  public static formatCompactContext(summary: BrainContextSummary): string {
    const lines: string[] = [];
    lines.push(`### DevGenie Brain Context [Profile: ${summary.taskProfile}]`);
    lines.push(`*Use as contextual guidance, not implementation truth. Source code remains current truth.*`);

    if (summary.relevantModules.length > 0) {
      lines.push('\n**Relevant Architecture & Modules**:');
      for (const m of summary.relevantModules) {
        lines.push(`- **${m.name}** (${m.layer}) - \`${m.path}\`: ${m.summary}`);
      }
    }

    if (summary.relevantDecisions.length > 0) {
      lines.push('\n**Architectural Decisions (ADRs)**:');
      for (const d of summary.relevantDecisions) {
        lines.push(`- [${d.status}] **${d.title}**: ${d.summary}`);
      }
    }

    if (summary.relevantLessons.length > 0) {
      lines.push('\n**Verified Bug Lessons & Rules to Follow**:');
      for (const l of summary.relevantLessons) {
        lines.push(`- **${l.title}**: *${l.rule}*`);
      }
    }

    if (summary.relevantFlows.length > 0) {
      lines.push('\n**Associated Execution Flows**:');
      for (const f of summary.relevantFlows) {
        lines.push(`- **${f.title}**: Triggered by ${f.trigger}`);
      }
    }

    if (summary.invariants.length > 0) {
      lines.push('\n**Core Architecture Invariants**:');
      for (const inv of summary.invariants) {
        lines.push(`- ${inv}`);
      }
    }

    return lines.join('\n');
  }
}
