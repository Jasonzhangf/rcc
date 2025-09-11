// Type definitions for RCC Virtual Model Rules Module

/**
 * Rule priority levels
 */
export type RulePriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Rule condition operators
 */
export type ConditionOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains' 
  | 'starts_with' 
  | 'ends_with' 
  | 'greater_than' 
  | 'less_than' 
  | 'in' 
  | 'not_in' 
  | 'regex' 
  | 'custom';

/**
 * Rule action types
 */
export type ActionType = 
  | 'route_to_model' 
  | 'set_priority' 
  | 'add_tag' 
  | 'remove_tag' 
  | 'transform_request' 
  | 'transform_response' 
  | 'log_event' 
  | 'send_notification' 
  | 'custom';

/**
 * Virtual model rule definition
 */
export interface VirtualModelRule {
  /**
   * Rule identifier
   */
  id: string;

  /**
   * Rule name
   */
  name: string;

  /**
   * Rule description
   */
  description?: string;

  /**
   * Target model ID (optional, applies to all models if not specified)
   */
  modelId?: string;

  /**
   * Rule priority
   */
  priority: RulePriority;

  /**
   * Whether rule is enabled
   */
  enabled: boolean;

  /**
   * Rule conditions
   */
  conditions: RuleCondition[];

  /**
   * Rule actions
   */
  actions: RuleAction[];

  /**
   * Rule metadata
   */
  metadata?: {
    /**
     * Creation timestamp
     */
    createdAt?: number;

    /**
     * Last update timestamp
     */
    updatedAt?: number;

    /**
     * Author
     */
    author?: string;

    /**
     * Tags
     */
    tags?: string[];

    /**
     * Version
     */
    version?: string;
  };

  /**
   * Rule scheduling
   */
  schedule?: {
    /**
     * Time-based scheduling (cron expression)
     */
    cron?: string;

    /**
     * Event-based triggering
     */
    events?: string[];

    /**
     * Maximum executions per interval
     */
    maxExecutions?: number;

    /**
     * Execution interval in milliseconds
     */
    executionInterval?: number;
  };
}

/**
 * Rule condition
 */
export interface RuleCondition {
  /**
   * Condition identifier
   */
  id?: string;

  /**
   * Field to evaluate
   */
  field: string;

  /**
   * Operator
   */
  operator: ConditionOperator;

  /**
   * Expected value
   */
  value: any;

  /**
   * Whether condition is negated
   */
  negate?: boolean;

  /**
   * Custom evaluator function name
   */
  customEvaluator?: string;

  /**
   * Condition weight for scoring
   */
  weight?: number;

  /**
   * Logical grouping with other conditions
   */
  group?: 'AND' | 'OR';
}

/**
 * Rule action
 */
export interface RuleAction {
  /**
   * Action identifier
   */
  id?: string;

  /**
   * Action type
   */
  type: ActionType;

  /**
   * Action parameters
   */
  parameters: Record<string, any>;

  /**
   * Whether action is async
   */
  async?: boolean;

  /**
   * Action timeout in milliseconds
   */
  timeout?: number;

  /**
   * Retry configuration
   */
  retry?: {
    /**
     * Maximum retry attempts
     */
    maxAttempts: number;

    /**
     * Retry delay in milliseconds
     */
    delay: number;

    /**
     * Backoff multiplier
     */
    backoffMultiplier?: number;
  };

  /**
   * Custom executor function name
   */
  customExecutor?: string;
}

/**
 * Model schedule configuration
 */
export interface ModelSchedule {
  /**
   * Model identifier
   */
  modelId: string;

  /**
   * Schedule name
   */
  name: string;

  /**
   * Cron expression for time-based scheduling
   */
  cron?: string;

  /**
   * Event-based triggers
   */
  triggers?: {
    /**
     * Event types that trigger this schedule
     */
    events: string[];

    /**
     * Event filters
     */
    filters?: Record<string, any>;
  };

  /**
   * Time windows for execution
   */
  timeWindows?: {
    /**
     * Start time (HH:MM format)
     */
    startTime?: string;

    /**
     * End time (HH:MM format)
     */
    endTime?: string;

    /**
     * Allowed days of week
     */
    daysOfWeek?: number[];

    /**
     * Timezone
     */
    timezone?: string;
  };

  /**
   * Resource constraints
   */
  constraints?: {
    /**
     * Maximum concurrent executions
     */
    maxConcurrent?: number;

    /**
     * Memory limit in MB
     */
    memoryLimit?: number;

    /**
     * CPU limit percentage
     */
    cpuLimit?: number;
  };

  /**
   * Priority level for scheduling
   */
  priority: RulePriority;

  /**
   * Whether schedule is enabled
   */
  enabled: boolean;

  /**
   * Maximum execution time in milliseconds
   */
  maxExecutionTime?: number;

  /**
   * Timeout handling strategy
   */
  timeoutStrategy?: 'continue' | 'retry' | 'fail';
}

/**
 * Evaluation context
 */
export interface EvaluationContext {
  /**
   * Request identifier
   */
  requestId: string;

  /**
   * Timestamp
   */
  timestamp: number;

  /**
   * User identifier
   */
  userId?: string;

  /**
   * Session identifier
   */
  sessionId?: string;

  /**
   * Request data
   */
  request: {
    /**
     * Request path
     */
    path: string;

    /**
     * HTTP method
     */
    method: string;

    /**
     * Request headers
     */
    headers: Record<string, string>;

    /**
     * Request body
     */
    body?: any;

    /**
     * Query parameters
     */
    query?: Record<string, string>;
  };

  /**
   * Context data
   */
  context: {
    /**
     * User agent
     */
    userAgent?: string;

    /**
     * IP address
     */
    ip?: string;

    /**
     * Geographic location
     */
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };

    /**
     * Device information
     */
    device?: {
      type?: 'desktop' | 'mobile' | 'tablet';
      os?: string;
      browser?: string;
    };
  };

  /**
   * Model information
   */
  model?: {
    /**
     * Model ID
     */
    modelId: string;

    /**
     * Model provider
     */
    provider: string;

    /**
     * Model capabilities
     */
    capabilities: string[];

    /**
     * Model priority
     */
    priority: number;
  };

  /**
   * System context
   */
  system?: {
    /**
     * Current system load
     */
    systemLoad?: number;

    /**
     * Memory usage percentage
     */
    memoryUsage?: number;

    /**
     * Active connections
     */
    activeConnections?: number;
  };

  /**
   * Custom data
   */
  custom?: Record<string, any>;
}

/**
 * Evaluation result
 */
export interface EvaluationResult {
  /**
   * Rule identifier
   */
  ruleId: string;

  /**
   * Whether rule matched
   */
  matched: boolean;

  /**
   * Match confidence (0-1)
   */
  confidence: number;

  /**
   * Execution results
   */
  executionResults: {
    /**
     * Action results
     */
    actions: Array<{
      actionId: string;
      success: boolean;
      result?: any;
      error?: string;
      executionTime: number;
    }>;

    /**
     * Total execution time
     */
    totalExecutionTime: number;

    /**
     * Whether all actions succeeded
     */
    allSuccess: boolean;
  };

  /**
   * Timestamp
   */
  timestamp: number;

  /**
   * Evaluation metrics
   */
  metrics: {
    /**
     * Condition evaluation time
     */
    conditionEvalTime: number;

    /**
     * Number of conditions evaluated
     */
    conditionsEvaluated: number;

    /**
     * Number of conditions matched
     */
    conditionsMatched: number;
  };
}

/**
 * Rule metrics
 */
export interface RuleMetrics {
  /**
   * Rule identifier
   */
  ruleId: string;

  /**
   * Total evaluations
   */
  totalEvaluations: number;

  /**
   * Successful matches
   */
  successfulMatches: number;

  /**
   * Failed matches
   */
  failedMatches: number;

  /**
   * Match rate
   */
  matchRate: number;

  /**
   * Average evaluation time
   */
  avgEvaluationTime: number;

  /**
   * Average confidence score
   */
  avgConfidence: number;

  /**
   * Last evaluation timestamp
   */
  lastEvaluation: number;

  /**
   * Action success rate
   */
  actionSuccessRate: number;

  /**
   * Error count
   */
  errorCount: number;
}