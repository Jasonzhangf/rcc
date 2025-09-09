// Import all types from shared types to maintain backward compatibility
export * from '../../../interfaces/SharedTypes';

// Import specific types that need to be available locally
import { 
  ModuleSource, 
  ErrorClassification, 
  ErrorContext, 
  ResponseHandler, 
  ErrorType, 
  ErrorSeverity, 
  ErrorResponse, 
  ModuleRegistration, 
  PolicyType, 
  Action, 
  RuleType, 
  ConditionOperator, 
  LogicalOperator,
  ResponsePriority,
  ErrorSource,
  ErrorImpact,
  ErrorRecoverability
} from '../../../interfaces/SharedTypes';

// Re-export all the imported types to ensure they're available
export {
  ModuleSource, 
  ErrorClassification, 
  ErrorContext, 
  ResponseHandler, 
  ErrorType, 
  ErrorSeverity, 
  ErrorResponse, 
  ModuleRegistration, 
  PolicyType, 
  Action, 
  RuleType, 
  ConditionOperator, 
  LogicalOperator,
  ResponsePriority,
  ErrorSource,
  ErrorImpact,
  ErrorRecoverability
};

// Additional Error Handling Center specific types
export type ErrorHandlingCenterTypes = {
  ErrorContext: any;
  ErrorResponse: any;
  ModuleResponse: any;
  ModuleRegistration: any;
  ErrorPolicy: any;
  CustomRule: any;
  ResponseHandler: any;
  ModuleMetadata: any;
};

export interface ErrorIdGenerator {
  generateId(): string;
}

export interface ErrorClassifier {
  classify(error: Error, source: ModuleSource): Promise<ErrorClassification>;
}

export interface ResponseRouterEngine {
  route(error: ErrorContext): Promise<ResponseHandler>;
  registerRoute(rule: RoutingRule): void;
  unregisterRoute(ruleId: string): void;
}

export interface RoutingRule {
  ruleId: string;
  name: string;
  priority: number;
  condition: RouteCondition;
  handler: ResponseHandler;
  enabled: boolean;
}

export interface RouteCondition {
  moduleIds?: string[];
  errorTypes?: ErrorType[];
  severities?: ErrorSeverity[];
  priorities?: ResponsePriority[];
  custom?: Record<string, any>;
}

export interface ErrorQueueManager {
  enqueue(error: ErrorContext): void;
  dequeue(): ErrorContext | null;
  getQueueSize(): number;
  getQueueStatus(): QueueStatus;
  flush(): Promise<ErrorResponse[]>;
}

export interface QueueStatus {
  size: number;
 Processing: boolean;
  flushed: boolean;
  lastProcessTime?: Date;
  nextProcessTime?: Date;
  priorityCounts?: Record<string, number>;
}

export interface IErrorHandlingCenter {
  initialize(): Promise<void>;
  handleError(error: ErrorContext): Promise<ErrorResponse>;
  handleErrorAsync(error: ErrorContext): void;
  handleBatchErrors(errors: ErrorContext[]): Promise<ErrorResponse[]>;
  registerModule(module: ModuleRegistration): void;
  unregisterModule(moduleId: string): void;
  shutdown(): Promise<void>;
}

export interface ModuleMetadata {
  moduleId: string;
  moduleName: string;
  moduleType: string;
  version: string;
  description?: string;
  tags?: string[];
  dependencies?: string[];
  capabilities?: string[];
  config?: Record<string, any>;
}

export interface ErrorPolicy {
  policyId: string;
  name: string;
  policyType: PolicyType;
  type: PolicyType;
  conditions: RouteCondition[];
  actions: Action[];
  enabled: boolean;
  priority: number;
  config?: Record<string, any>;
}

export interface CustomRule {
  ruleId: string;
  name: string;
  ruleType: RuleType;
  condition: RouteCondition;
  action: any;
  enabled: boolean;
  priority: number;
}

export interface Template {
  templateId: string;
  name: string;
  templateType: string;
  content: string;
  variables: Record<string, any>;
  enabled: boolean;
  version: string;
}

export interface TemplateManager {
  getTemplate(templateId: string): Template | null;
  registerTemplate(template: Template): void;
  unregisterTemplate(templateId: string): void;
  renderTemplate(templateId: string, variables: Record<string, any>): string;
}

export interface ResponseTemplate {
  templateId: string;
  name: string;
  templateType: string;
  content: string;
  variables: Record<string, any>;
  enabled: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DynamicTemplateLoader {
  loadTemplate(templateId: string): Promise<ResponseTemplate>;
  loadTemplates(templateIds: string[]): Promise<ResponseTemplate[]>;
  cacheTemplate(template: ResponseTemplate): void;
  clearCache(): void;
  loadAllTemplates?(): Promise<ResponseTemplate[]>;
  shutdown?(): Promise<void>;
  getStatus?(): any;
}

export interface PolicyConfig {
  policyId: string;
  name: string;
  type: PolicyType;
  enabled: boolean;
  priority: number;
  config: Record<string, any>;
}

export interface PolicyCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: LogicalOperator;
}

// Additional interfaces for ErrorPolicy enhancements
export interface EnhancedErrorPolicy extends ErrorPolicy {
  config: PolicyConfig;
  conditions: RouteCondition[];
  type: PolicyType;
}

// Additional interfaces for ResponseTemplate enhancements
export interface EnhancedResponseTemplate extends ResponseTemplate {
  conditions?: PolicyCondition[];
  category?: string;
  result?: any;
  data?: any;
  cacheable?: boolean;
  cacheTimeout?: number;
  actions?: any[];
  annotations?: any[];
  dynamicContent?: Record<string, any>;
}