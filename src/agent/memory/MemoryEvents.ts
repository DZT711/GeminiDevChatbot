import { MemoryRecord } from './MemoryTypes';

export enum MemoryEventType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  TRANSACTION_COMMITTED = 'TRANSACTION_COMMITTED',
  TRANSACTION_ROLLED_BACK = 'TRANSACTION_ROLLED_BACK'
}

export interface MemoryEvent {
  type: MemoryEventType;
  timestamp: number;
  namespace?: string;
}

export interface MemoryRecordEvent extends MemoryEvent {
  type: MemoryEventType.CREATED | MemoryEventType.UPDATED | MemoryEventType.DELETED;
  recordId: string;
  record?: MemoryRecord;
}

export interface MemoryTransactionEvent extends MemoryEvent {
  type: MemoryEventType.TRANSACTION_COMMITTED | MemoryEventType.TRANSACTION_ROLLED_BACK;
  transactionId: string;
}
