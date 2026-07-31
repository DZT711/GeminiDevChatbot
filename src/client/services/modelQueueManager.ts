import { ModelId } from './types';

export class ModelQueueManager {
  private queue: string[] = [ModelId.PRO, ModelId.FLASH_3_5, ModelId.FLASH, ModelId.LITE];
  private currentIndex: number = 0;

  setQueue(models: string[]) {
    if (models.length > 0) {
      this.queue = [...new Set(models)];
      this.currentIndex = 0;
    }
  }

  resetQueue() {
    this.queue = [ModelId.PRO, ModelId.FLASH_3_5, ModelId.FLASH, ModelId.LITE];
    this.currentIndex = 0;
  }

  getCurrentModel(): string {
    return this.queue[this.currentIndex];
  }

  getQueue(): string[] {
    return [...this.queue];
  }

  rotateModel() {
    this.currentIndex = (this.currentIndex + 1) % this.queue.length;
    console.log(`Rotating to: ${this.getCurrentModel()}`);
  }

  indexOf(model: string): number {
    return this.queue.indexOf(model);
  }

  getModelAt(index: number): string {
    return this.queue[index % this.queue.length];
  }
  
  promoteToCurrent(model: string) {
    const idx = this.queue.indexOf(model);
    if (idx !== -1) {
      this.currentIndex = idx;
    }
  }

  get length(): number {
    return this.queue.length;
  }
}

export const modelQueueManager = new ModelQueueManager();
