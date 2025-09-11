// RCC Virtual Model Rules Module - Claude Code Router rules implementation

// Main exports
export { VirtualModelRulesModule } from './src/VirtualModelRulesModule';
export { RuleEngine } from './src/components/RuleEngine';
export { ModelScheduler } from './src/components/ModelScheduler';
export { RuleEvaluator } from './src/components/RuleEvaluator';

// Interfaces
export type {
  IVirtualModelRulesModule,
  IRuleEngine,
  IModelScheduler,
  IRuleEvaluator
} from './src/interfaces/IVirtualModelRules';

// Types
export type {
  VirtualModelRule,
  RuleCondition,
  RuleAction,
  RulePriority,
  ModelSchedule,
  ScheduleConfig,
  EvaluationContext,
  EvaluationResult,
  RuleMetrics
} from './src/types/VirtualModelRulesTypes';

// Default exports
export default VirtualModelRulesModule;