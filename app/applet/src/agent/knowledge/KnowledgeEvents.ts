import { KnowledgeRecord, KnowledgeCollection } from './KnowledgeTypes';

export enum KnowledgeEventType {
  RECORD_CREATED = 'RECORD_CREATED',
  RECORD_UPDATED = 'RECORD_UPDATED',
  RECORD_DELETED = 'RECORD_DELETED',
  COLLECTION_CREATED = 'COLLECTION_CREATED',
  COLLECTION_UPDATED = 'COLLECTION_UPDATED',
  COLLECTION_DELETED = 'COLLECTION_DELETED',
  TRANSACTION_COMMITTED = 'TRANSACTION_COMMITTED',
  TRANSACTION_ROLLED_BACK = 'TRANSACTION_ROLLED_BACK'
}

export interface KnowledgeEvent {
  type: KnowledgeEventType;
  timestamp: number;
  namespace?: string;
}

export interface KnowledgeRecordEvent extends KnowledgeEvent {
  type: KnowledgeEventType.RECORD_CREATED | KnowledgeEventType.RECORD_UPDATED | KnowledgeEventType.RECORD_DELETED;
  recordId: string;
  record?: KnowledgeRecord;
}

export interface KnowledgeCollectionEvent extends KnowledgeEvent {
  type: KnowledgeEventType.COLLECTION_CREATED | KnowledgeEventType.COLLECTION_UPDATED | KnowledgeEventType.COLLECTION_DELETED;
  collectionId: string;
  collection?: KnowledgeCollection;
}

export interface KnowledgeTransactionEvent extends KnowledgeEvent {
  type: KnowledgeEventType.TRANSACTION_COMMITTED | KnowledgeEventType.TRANSACTION_ROLLED_BACK;
  transactionId: string;
}
