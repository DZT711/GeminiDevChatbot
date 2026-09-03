import { db } from '../../db/index.js';
import { experienceRecords } from '../../db/schema.js';
import { ExperienceEvent, ExperienceQuery, ExperienceStore } from '../../../agent/experience/ExperienceStore.js';
import { desc, eq, and, gte, sql } from 'drizzle-orm';

export class DurableExperienceStore implements ExperienceStore {
  
  public async append(event: Omit<ExperienceEvent, 'id' | 'timestamp'>): Promise<ExperienceEvent> {
    try {
      const newRecord = {
        sessionId: event.sessionId,
        taskId: event.taskId,
        type: event.type,
        payload: event.payload,
        metadata: event.metadata,
      };

      const [inserted] = await db.insert(experienceRecords)
        .values(newRecord)
        .returning();

      return {
        id: inserted.id,
        sessionId: inserted.sessionId,
        taskId: inserted.taskId || undefined,
        timestamp: inserted.timestamp.getTime(),
        type: inserted.type as ExperienceEvent['type'],
        payload: inserted.payload as Record<string, unknown>,
        metadata: inserted.metadata as ExperienceEvent['metadata']
      };
    } catch (e) {
      console.error("[DurableExperienceStore] Error appending record:", e);
      // Experience failures MUST NOT crash the execution pipeline
      return {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...event
      };
    }
  }

  public async query(filter: ExperienceQuery): Promise<ExperienceEvent[]> {
    try {
      const conditions = [];
      
      if (filter.sessionId) conditions.push(eq(experienceRecords.sessionId, filter.sessionId));
      if (filter.taskId) conditions.push(eq(experienceRecords.taskId, filter.taskId));
      if (filter.type) conditions.push(eq(experienceRecords.type, filter.type));
      if (filter.since !== undefined) {
        conditions.push(gte(experienceRecords.timestamp, new Date(filter.since)));
      }
      
      let queryBase = db.select().from(experienceRecords);
      
      if (conditions.length > 0) {
        queryBase = queryBase.where(and(...conditions)) as any;
      }
      
      queryBase = queryBase.orderBy(desc(experienceRecords.timestamp)) as any;
      
      if (filter.limit) {
        queryBase = queryBase.limit(filter.limit) as any;
      }
      
      const results = await queryBase;
      
      let events = results.map(row => ({
        id: row.id,
        sessionId: row.sessionId,
        taskId: row.taskId || undefined,
        timestamp: row.timestamp.getTime(),
        type: row.type as ExperienceEvent['type'],
        payload: row.payload as Record<string, unknown>,
        metadata: row.metadata as ExperienceEvent['metadata']
      }));

      // In-memory filter for successOnly due to JSONB metadata
      if (filter.successOnly !== undefined) {
        events = events.filter(e => e.metadata?.success === filter.successOnly);
      }

      // Return chronologically
      return events.reverse();
    } catch (e) {
      console.error("[DurableExperienceStore] Error querying records:", e);
      return [];
    }
  }

  public async getSessionEvents(sessionId: string): Promise<ExperienceEvent[]> {
    return this.query({ sessionId });
  }

  public async prune(olderThanMs: number): Promise<number> {
    try {
      const threshold = new Date(Date.now() - olderThanMs);
      const res = await db.delete(experienceRecords)
        .where(sql`${experienceRecords.timestamp} < ${threshold.toISOString()}`)
        .returning({ id: experienceRecords.id });
      return res.length;
    } catch (e) {
      console.error("[DurableExperienceStore] Error pruning records:", e);
      return 0;
    }
  }
}
