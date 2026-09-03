import type { PlanningContext, PlanningResult, PlanningStrategy, StrategySelector } from './PlanningTypes.js';
import { RuleBasedPlanningStrategy } from './RuleBasedPlanningStrategy.js';
import { DefaultStrategySelector } from './StrategySelector.js';

export class Planner {
  private strategy?: PlanningStrategy;
  private selector?: StrategySelector;

  constructor(strategyOrSelector?: PlanningStrategy | StrategySelector) {
    if (!strategyOrSelector) {
      this.strategy = new RuleBasedPlanningStrategy();
    } else if ('selectStrategy' in strategyOrSelector) {
      this.selector = strategyOrSelector;
    } else {
      this.strategy = strategyOrSelector;
    }
  }

  public setStrategy(strategy: PlanningStrategy): void {
    this.strategy = strategy;
    this.selector = undefined;
  }

  public setSelector(selector: StrategySelector): void {
    this.selector = selector;
    this.strategy = undefined;
  }

  public getActiveStrategy(context: PlanningContext): PlanningStrategy {
    if (this.strategy) {
      return this.strategy;
    }
    if (this.selector) {
      return this.selector.selectStrategy(context);
    }
    const defaultSelector = new DefaultStrategySelector();
    return defaultSelector.selectStrategy(context);
  }

  public async generatePlan(context: PlanningContext): Promise<PlanningResult> {
    const activeStrategy = this.getActiveStrategy(context);
    return activeStrategy.generatePlan(context);
  }

  public async createPlan(context: PlanningContext): Promise<PlanningResult> {
    return this.generatePlan(context);
  }
}

