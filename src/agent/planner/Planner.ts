import { PlanningContext, PlanningResult, PlanningStrategy } from './PlanningTypes';

export class Planner {
  private strategy: PlanningStrategy;

  constructor(strategy: PlanningStrategy) {
    this.strategy = strategy;
  }

  public setStrategy(strategy: PlanningStrategy): void {
    this.strategy = strategy;
  }

  public async createPlan(context: PlanningContext): Promise<PlanningResult> {
    return this.strategy.generatePlan(context);
  }
}
