// Type definitions for RCC Dynamic Routing Classification Module

/**
 * Routing priority levels
 */
export type RoutingPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Routing condition operators
 */
export type RoutingConditionOperator =
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
  | 'exists'
  | 'custom';

/**
 * Routing action types
 */
export type RoutingActionType =
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
 * Dynamic routing rule definition
 */
export interface RoutingRule {
  /**
   * Routing rule identifier
   */
  routingId: string;

  /**
   * Routing rule name
   */
  name: string;

  /**
   * Routing rule description
   */
  description?: string;

  /**
   * Target model ID (optional, applies to all models if not specified)
   */
  modelId?: string;

  /**
   * Routing rule priority
   */
  priority: RoutingPriority;

  /**
   * Whether routing rule is enabled
   */
  enabled: boolean;

  /**
   * Routing rule conditions
   */
  conditions: RoutingCondition[];

  /**
   * Routing rule actions
   */
  actions: RoutingAction[];

  /**
   * Routing rule metadata
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
   * Routing rule scheduling
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
 * Routing condition
 */
export interface RoutingCondition {
  /**
   * Condition identifier
   */
  conditionId?: string;

  /**
   * Field to evaluate
   */
  field: string;

  /**
   * Operator
   */
  operator: RoutingConditionOperator;

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
 * Routing action
 */
export interface RoutingAction {
  /**
   * Action identifier
   */
  actionId?: string;

  /**
   * Action type
   */
  type: RoutingActionType;

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
 * Routing schedule configuration
 */
export interface RoutingSchedule {
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
  priority: RoutingPriority;

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
 * Routing context
 */
export interface RoutingContext {
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
 * Routing result
 */
export interface RoutingResult {
  /**
   * Routing rule identifier
   */
  routingRuleId: string;

  /**
   * Whether routing rule matched
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
   * Routing metrics
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
 * Routing metrics
 */
export interface RoutingMetrics {
  /**
   * Routing rule identifier
   */
  routingRuleId: string;

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