/**
 * Complete configuration validator for the Pipeline System
 * Validates both assembly table and scheduler configurations
 */

import { 
  PipelineAssemblyTable,
  PipelineSchedulerConfig,
  CompleteConfigValidationResult,
  ConfigError,
  ConfigWarning,
  ConfigRecommendation
} from './PipelineCompleteConfig';

/**
 * Comprehensive configuration validator
 */
export class PipelineConfigValidator {
  /**
   * Validate complete pipeline assembly table
   */
  public validateAssemblyTable(config: PipelineAssemblyTable): CompleteConfigValidationResult {
    const errors: ConfigError[] = [];
    const warnings: ConfigWarning[] = [];
    const recommendations: ConfigRecommendation[] = [];

    // Validate basic structure
    this.validateBasicStructure(config, errors);
    
    // Validate routing rules
    this.validateRoutingRules(config, errors, warnings);
    
    // Validate pipeline templates
    this.validatePipelineTemplates(config, errors, warnings, recommendations);
    
    // Validate module registry
    this.validateModuleRegistry(config, errors, warnings);
    
    // Validate assembly strategies
    this.validateAssemblyStrategies(config, errors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Validate scheduler configuration
   */
  public validateSchedulerConfig(config: PipelineSchedulerConfig): CompleteConfigValidationResult {
    const errors: ConfigError[] = [];
    const warnings: ConfigWarning[] = [];
    const recommendations: ConfigRecommendation[] = [];

    // Validate basic structure
    this.validateSchedulerBasicStructure(config, errors);
    
    // Validate load balancing configuration
    this.validateLoadBalancing(config, errors, warnings);
    
    // Validate health check configuration
    this.validateHealthCheck(config, errors, warnings);
    
    // Validate error handling configuration
    this.validateErrorHandling(config, errors, warnings);
    
    // Validate performance configuration
    this.validatePerformance(config, errors, warnings, recommendations);
    
    // Validate monitoring configuration
    this.validateMonitoring(config, errors, warnings);
    
    // Validate security configuration
    this.validateSecurity(config, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Validate both configurations together
   */
  public validateCompleteSystem(
    assemblyTable: PipelineAssemblyTable,
    schedulerConfig: PipelineSchedulerConfig
  ): CompleteConfigValidationResult {
    const assemblyResult = this.validateAssemblyTable(assemblyTable);
    const schedulerResult = this.validateSchedulerConfig(schedulerConfig);
    
    const crossValidationErrors = this.validateCrossReferences(assemblyTable, schedulerConfig);
    
    return {
      isValid: assemblyResult.isValid && schedulerResult.isValid && crossValidationErrors.length === 0,
      errors: [...assemblyResult.errors, ...schedulerResult.errors, ...crossValidationErrors],
      warnings: [...assemblyResult.warnings, ...schedulerResult.warnings],
      recommendations: [...assemblyResult.recommendations, ...schedulerResult.recommendations]
    };
  }

  /**
   * Validate basic structure of assembly table
   */
  private validateBasicStructure(config: PipelineAssemblyTable, errors: ConfigError[]): void {
    if (!config.version) {
      errors.push({
        field: 'version',
        message: 'Version is required',
        severity: 'critical',
        suggestion: 'Add version field (e.g., "1.0.0")'
      });
    }

    if (!config.metadata) {
      errors.push({
        field: 'metadata',
        message: 'Metadata is required',
        severity: 'critical',
        suggestion: 'Add metadata section with createdAt, updatedAt, description, and author'
      });
    } else {
      if (!config.metadata.createdAt) {
        errors.push({
          field: 'metadata.createdAt',
          message: 'Creation timestamp is required',
          severity: 'major',
          suggestion: 'Add createdAt field with ISO timestamp'
        });
      }

      if (!config.metadata.description) {
        warnings.push({
          field: 'metadata.description',
          message: 'Description is recommended for better documentation',
          suggestion: 'Add a brief description of the assembly table'
        });
      }
    }

    if (!Array.isArray(config.routingRules)) {
      errors.push({
        field: 'routingRules',
        message: 'Routing rules must be an array',
        severity: 'critical',
        suggestion: 'Ensure routingRules is an array of RoutingRule objects'
      });
    }

    if (!Array.isArray(config.pipelineTemplates)) {
      errors.push({
        field: 'pipelineTemplates',
        message: 'Pipeline templates must be an array',
        severity: 'critical',
        suggestion: 'Ensure pipelineTemplates is an array of PipelineTemplate objects'
      });
    }
  }

  /**
   * Validate routing rules
   */
  private validateRoutingRules(config: PipelineAssemblyTable, errors: ConfigError[], warnings: ConfigWarning[]): void {
    const ruleIds = new Set<string>();

    for (let i = 0; i < config.routingRules.length; i++) {
      const rule = config.routingRules[i];
      const prefix = `routingRules[${i}]`;

      // Validate required fields
      if (!rule.ruleId) {
        errors.push({
          field: `${prefix}.ruleId`,
          message: 'Rule ID is required',
          severity: 'critical',
          suggestion: 'Add a unique rule identifier'
        });
      } else if (ruleIds.has(rule.ruleId)) {
        errors.push({
          field: `${prefix}.ruleId`,
          message: `Duplicate rule ID: ${rule.ruleId}`,
          severity: 'critical',
          suggestion: 'Use a unique rule ID'
        });
      } else {
        ruleIds.add(rule.ruleId);
      }

      if (!rule.name) {
        errors.push({
          field: `${prefix}.name`,
          message: 'Rule name is required',
          severity: 'major',
          suggestion: 'Add a descriptive name for the rule'
        });
      }

      if (typeof rule.priority !== 'number' || rule.priority < 0) {
        errors.push({
          field: `${prefix}.priority`,
          message: 'Priority must be a non-negative number',
          severity: 'major',
          suggestion: 'Set priority to 0 or higher'
        });
      }

      // Validate conditions
      if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) {
        errors.push({
          field: `${prefix}.conditions`,
          message: 'At least one condition is required',
          severity: 'critical',
          suggestion: 'Add routing conditions'
        });
      } else {
        this.validateConditions(rule.conditions, `${prefix}.conditions`, errors);
      }

      // Validate pipeline selection
      if (!rule.pipelineSelection) {
        errors.push({
          field: `${prefix}.pipelineSelection`,
          message: 'Pipeline selection configuration is required',
          severity: 'critical',
          suggestion: 'Add pipeline selection strategy'
        });
      } else {
        this.validatePipelineSelection(rule.pipelineSelection, `${prefix}.pipelineSelection`, errors);
      }

      // Validate weights if using weighted strategy
      if (rule.pipelineSelection.strategy === 'weighted') {
        const weights = rule.pipelineSelection.weights || {};
        const totalWeight = Object.values(weights).reduce((sum: number, weight: number) => sum + weight, 0);
        
        if (Math.abs(totalWeight - 100) > 0.01) {
          errors.push({
            field: `${prefix}.pipelineSelection.weights`,
            message: `Weights must sum to 100, current sum: ${totalWeight}`,
            severity: 'major',
            suggestion: 'Adjust weights to sum to 100'
          });
        }
      }
    }
  }

  /**
   * Validate conditions
   */
  private validateConditions(conditions: any[], prefix: string, errors: ConfigError[]): void {
    const validOperators = ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 
                           'greater_than', 'less_than', 'greater_equal', 'less_equal', 'in', 'not_in', 'regex', 'custom'];

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionPrefix = `${prefix}[${i}]`;

      if (!condition.field) {
        errors.push({
          field: `${conditionPrefix}.field`,
          message: 'Field is required',
          severity: 'critical',
          suggestion: 'Specify the field to evaluate'
        });
      }

      if (!validOperators.includes(condition.operator)) {
        errors.push({
          field: `${conditionPrefix}.operator`,
          message: `Invalid operator: ${condition.operator}`,
          severity: 'critical',
          suggestion: `Use one of: ${validOperators.join(', ')}`
        });
      }

      if (condition.value === undefined || condition.value === null) {
        errors.push({
          field: `${conditionPrefix}.value`,
          message: 'Value is required',
          severity: 'critical',
          suggestion: 'Provide a value to compare against'
        });
      }
    }
  }

  /**
   * Validate pipeline selection
   */
  private validatePipelineSelection(selection: any, prefix: string, errors: ConfigError[]): void {
    const validStrategies = ['fixed', 'weighted', 'custom'];
    
    if (!validStrategies.includes(selection.strategy)) {
      errors.push({
        field: `${prefix}.strategy`,
        message: `Invalid strategy: ${selection.strategy}`,
        severity: 'critical',
        suggestion: `Use one of: ${validStrategies.join(', ')}`
      });
    }

    if (selection.strategy === 'fixed' && (!selection.targetPipelineIds || selection.targetPipelineIds.length === 0)) {
      errors.push({
        field: `${prefix}.targetPipelineIds`,
        message: 'Target pipeline IDs are required for fixed strategy',
        severity: 'critical',
        suggestion: 'Specify target pipeline IDs'
      });
    }

    if (selection.strategy === 'weighted' && (!selection.weights || Object.keys(selection.weights).length === 0)) {
      errors.push({
        field: `${prefix}.weights`,
        message: 'Weights are required for weighted strategy',
        severity: 'critical',
        suggestion: 'Specify weights for each pipeline'
      });
    }
  }

  /**
   * Validate pipeline templates
   */
  private validatePipelineTemplates(
    config: PipelineAssemblyTable, 
    errors: ConfigError[], 
    warnings: ConfigWarning[], 
    recommendations: ConfigRecommendation[]
  ): void {
    const templateIds = new Set<string>();

    for (let i = 0; i < config.pipelineTemplates.length; i++) {
      const template = config.pipelineTemplates[i];
      const prefix = `pipelineTemplates[${i}]`;

      if (!template.templateId) {
        errors.push({
          field: `${prefix}.templateId`,
          message: 'Template ID is required',
          severity: 'critical',
          suggestion: 'Add a unique template identifier'
        });
      } else if (templateIds.has(template.templateId)) {
        errors.push({
          field: `${prefix}.templateId`,
          message: `Duplicate template ID: ${template.templateId}`,
          severity: 'critical',
          suggestion: 'Use a unique template ID'
        });
      } else {
        templateIds.add(template.templateId);
      }

      if (!template.name) {
        errors.push({
          field: `${prefix}.name`,
          message: 'Template name is required',
          severity: 'major',
          suggestion: 'Add a descriptive name'
        });
      }

      // Validate module assembly
      if (template.moduleAssembly) {
        this.validateModuleAssembly(template.moduleAssembly, `${prefix}.moduleAssembly`, errors, warnings);
      }

      // Validate execution strategy
      if (template.executionStrategy) {
        this.validateExecutionStrategy(template.executionStrategy, `${prefix}.executionStrategy`, errors, recommendations);
      }
    }
  }

  /**
   * Validate module assembly
   */
  private validateModuleAssembly(assembly: any, prefix: string, errors: ConfigError[], warnings: ConfigWarning[]): void {
    if (!Array.isArray(assembly.moduleInstances) || assembly.moduleInstances.length === 0) {
      errors.push({
        field: `${prefix}.moduleInstances`,
        message: 'At least one module instance is required',
        severity: 'critical',
        suggestion: 'Add module instances to the assembly'
      });
      return;
    }

    const instanceIds = new Set<string>();
    
    for (let i = 0; i < assembly.moduleInstances.length; i++) {
      const instance = assembly.moduleInstances[i];
      const instancePrefix = `${prefix}.moduleInstances[${i}]`;

      if (!instance.instanceId) {
        errors.push({
          field: `${instancePrefix}.instanceId`,
          message: 'Instance ID is required',
          severity: 'critical',
          suggestion: 'Add a unique instance identifier'
        });
      } else if (instanceIds.has(instance.instanceId)) {
        errors.push({
          field: `${instancePrefix}.instanceId`,
          message: `Duplicate instance ID: ${instance.instanceId}`,
          severity: 'critical',
          suggestion: 'Use a unique instance ID'
        });
      } else {
        instanceIds.add(instance.instanceId);
      }

      if (!instance.moduleId) {
        errors.push({
          field: `${instancePrefix}.moduleId`,
          message: 'Module ID is required',
          severity: 'critical',
          suggestion: 'Specify the module type'
        });
      }

      // Validate initialization
      if (instance.initialization) {
        if (typeof instance.initialization.startupOrder !== 'number' || instance.initialization.startupOrder < 1) {
          errors.push({
            field: `${instancePrefix}.initialization.startupOrder`,
            message: 'Startup order must be a positive integer',
            severity: 'major',
            suggestion: 'Set startup order to 1 or higher'
          });
        }
      }

      // Validate execution timeout
      if (instance.execution && instance.execution.timeout) {
        if (instance.execution.timeout <= 0 || instance.execution.timeout > 300000) {
          warnings.push({
            field: `${instancePrefix}.execution.timeout`,
            message: 'Timeout should be between 1 and 300000 milliseconds',
            suggestion: 'Set a reasonable timeout value'
          });
        }
      }
    }

    // Validate connections
    if (assembly.connections) {
      this.validateConnections(assembly.connections, instanceIds, `${prefix}.connections`, errors);
    }
  }

  /**
   * Validate connections
   */
  private validateConnections(connections: any[], instanceIds: Set<string>, prefix: string, errors: ConfigError[]): void {
    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];
      const connectionPrefix = `${prefix}[${i}]`;

      if (!connection.from || !instanceIds.has(connection.from)) {
        errors.push({
          field: `${connectionPrefix}.from`,
          message: `Invalid source instance: ${connection.from}`,
          severity: 'critical',
          suggestion: 'Ensure source instance exists'
        });
      }

      if (!connection.to || !instanceIds.has(connection.to)) {
        errors.push({
          field: `${connectionPrefix}.to`,
          message: `Invalid target instance: ${connection.to}`,
          severity: 'critical',
          suggestion: 'Ensure target instance exists'
        });
      }

      const validTypes = ['success', 'error', 'timeout', 'conditional'];
      if (!validTypes.includes(connection.type)) {
        errors.push({
          field: `${connectionPrefix}.type`,
          message: `Invalid connection type: ${connection.type}`,
          severity: 'major',
          suggestion: `Use one of: ${validTypes.join(', ')}`
        });
      }
    }
  }

  /**
   * Validate execution strategy
   */
  private validateExecutionStrategy(
    strategy: any, 
    prefix: string, 
    errors: ConfigError[], 
    recommendations: ConfigRecommendation[]
  ): void {
    const validModes = ['sequential', 'parallel', 'conditional'];
    
    if (!validModes.includes(strategy.mode)) {
      errors.push({
        field: `${prefix}.mode`,
        message: `Invalid execution mode: ${strategy.mode}`,
        severity: 'critical',
        suggestion: `Use one of: ${validModes.join(', ')}`
      });
    }

    if (strategy.mode === 'parallel' && strategy.maxConcurrency) {
      if (strategy.maxConcurrency <= 0) {
        errors.push({
          field: `${prefix}.maxConcurrency`,
          message: 'Max concurrency must be positive',
          severity: 'major',
          suggestion: 'Set maxConcurrency to 1 or higher'
        });
      } else if (strategy.maxConcurrency > 50) {
        recommendations.push({
          field: `${prefix}.maxConcurrency`,
          current: strategy.maxConcurrency,
          recommended: 20,
          reason: 'High concurrency may impact system performance',
          impact: 'medium'
        });
      }
    }

    if (strategy.timeout && (strategy.timeout <= 0 || strategy.timeout > 300000)) {
      warnings.push({
        field: `${prefix}.timeout`,
        message: 'Timeout should be between 1 and 300000 milliseconds',
        suggestion: 'Set a reasonable timeout value'
      });
    }
  }

  /**
   * Validate module registry
   */
  private validateModuleRegistry(config: PipelineAssemblyTable, errors: ConfigError[], warnings: ConfigWarning[]): void {
    const moduleIds = new Set<string>();

    for (let i = 0; i < config.moduleRegistry.length; i++) {
      const module = config.moduleRegistry[i];
      const prefix = `moduleRegistry[${i}]`;

      if (!module.moduleId) {
        errors.push({
          field: `${prefix}.moduleId`,
          message: 'Module ID is required',
          severity: 'critical',
          suggestion: 'Add a unique module identifier'
        });
      } else if (moduleIds.has(module.moduleId)) {
        errors.push({
          field: `${prefix}.moduleId`,
          message: `Duplicate module ID: ${module.moduleId}`,
          severity: 'critical',
          suggestion: 'Use a unique module ID'
        });
      } else {
        moduleIds.add(module.moduleId);
      }

      if (!module.name) {
        errors.push({
          field: `${prefix}.name`,
          message: 'Module name is required',
          severity: 'major',
          suggestion: 'Add a descriptive module name'
        });
      }

      if (!module.type) {
        warnings.push({
          field: `${prefix}.type`,
          message: 'Module type is recommended',
          suggestion: 'Add a module type for better organization'
        });
      }
    }
  }

  /**
   * Validate assembly strategies
   */
  private validateAssemblyStrategies(config: PipelineAssemblyTable, errors: ConfigError[]): void {
    const strategyIds = new Set<string>();

    for (let i = 0; i < config.assemblyStrategies.length; i++) {
      const strategy = config.assemblyStrategies[i];
      const prefix = `assemblyStrategies[${i}]`;

      if (!strategy.strategyId) {
        errors.push({
          field: `${prefix}.strategyId`,
          message: 'Strategy ID is required',
          severity: 'critical',
          suggestion: 'Add a unique strategy identifier'
        });
      } else if (strategyIds.has(strategy.strategyId)) {
        errors.push({
          field: `${prefix}.strategyId`,
          message: `Duplicate strategy ID: ${strategy.strategyId}`,
          severity: 'critical',
          suggestion: 'Use a unique strategy ID'
        });
      } else {
        strategyIds.add(strategy.strategyId);
      }

      const validAlgorithms = ['dynamic', 'static', 'hybrid'];
      if (!validAlgorithms.includes(strategy.algorithm)) {
        errors.push({
          field: `${prefix}.algorithm`,
          message: `Invalid algorithm: ${strategy.algorithm}`,
          severity: 'major',
          suggestion: `Use one of: ${validAlgorithms.join(', ')}`
        });
      }
    }
  }

  /**
   * Validate scheduler basic structure
   */
  private validateSchedulerBasicStructure(config: PipelineSchedulerConfig, errors: ConfigError[]): void {
    if (!config.basic?.schedulerId) {
      errors.push({
        field: 'basic.schedulerId',
        message: 'Scheduler ID is required',
        severity: 'critical',
        suggestion: 'Add a unique scheduler identifier'
      });
    }

    if (!config.basic?.name) {
      errors.push({
        field: 'basic.name',
        message: 'Scheduler name is required',
        severity: 'major',
        suggestion: 'Add a descriptive scheduler name'
      });
    }

    // Validate required sections
    const requiredSections = ['loadBalancing', 'healthCheck', 'errorHandling', 'performance'];
    for (const section of requiredSections) {
      if (!config[section]) {
        errors.push({
          field: section,
          message: `${section} configuration is required`,
          severity: 'critical',
          suggestion: `Add ${section} configuration section`
        });
      }
    }
  }

  /**
   * Validate load balancing configuration
   */
  private validateLoadBalancing(config: PipelineSchedulerConfig, errors: ConfigError[], warnings: ConfigWarning[]): void {
    const lb = config.loadBalancing;
    const prefix = 'loadBalancing';

    const validStrategies = ['roundrobin', 'weighted', 'least_connections', 'random', 'custom'];
    if (!validStrategies.includes(lb.strategy)) {
      errors.push({
        field: `${prefix}.strategy`,
        message: `Invalid load balancing strategy: ${lb.strategy}`,
        severity: 'critical',
        suggestion: `Use one of: ${validStrategies.join(', ')}`
      });
    }

    // Validate strategy-specific configuration
    if (lb.strategy === 'weighted' && lb.strategyConfig?.weighted) {
      const weights = lb.strategyConfig.weighted.weights || {};
      const totalWeight = Object.values(weights).reduce((sum: number, weight: number) => sum + weight, 0);
      
      if (Object.keys(weights).length === 0) {
        errors.push({
          field: `${prefix}.strategyConfig.weighted.weights`,
          message: 'Weights are required for weighted strategy',
          severity: 'critical',
          suggestion: 'Specify weights for each pipeline'
        });
      } else if (Math.abs(totalWeight - 100) > 0.01) {
        errors.push({
          field: `${prefix}.strategyConfig.weighted.weights`,
          message: `Weights must sum to 100, current sum: ${totalWeight}`,
          severity: 'major',
          suggestion: 'Adjust weights to sum to 100'
        });
      }
    }

    // Validate failover configuration
    if (lb.failover?.enabled) {
      if (lb.failover.maxRetries < 0) {
        errors.push({
          field: `${prefix}.failover.maxRetries`,
          message: 'Max retries must be non-negative',
          severity: 'major',
          suggestion: 'Set maxRetries to 0 or higher'
        });
      }

      if (lb.failover.retryDelay <= 0) {
        errors.push({
          field: `${prefix}.failover.retryDelay`,
          message: 'Retry delay must be positive',
          severity: 'major',
          suggestion: 'Set retryDelay to a positive value'
        });
      }
    }
  }

  /**
   * Validate health check configuration
   */
  private validateHealthCheck(config: PipelineSchedulerConfig, errors: ConfigError[], warnings: ConfigWarning[]): void {
    const hc = config.healthCheck;
    const prefix = 'healthCheck';

    const validStrategies = ['passive', 'active', 'hybrid'];
    if (!validStrategies.includes(hc.strategy)) {
      errors.push({
        field: `${prefix}.strategy`,
        message: `Invalid health check strategy: ${hc.strategy}`,
        severity: 'critical',
        suggestion: `Use one of: ${validStrategies.join(', ')}`
      });
    }

    // Validate intervals
    if (hc.intervals?.activeCheckInterval <= 0) {
      errors.push({
        field: `${prefix}.intervals.activeCheckInterval`,
        message: 'Active check interval must be positive',
        severity: 'major',
        suggestion: 'Set a positive interval value'
      });
    }

    if (hc.intervals?.passiveCheckInterval <= 0) {
      errors.push({
        field: `${prefix}.intervals.passiveCheckInterval`,
        message: 'Passive check interval must be positive',
        severity: 'major',
        suggestion: 'Set a positive interval value'
      });
    }

    // Validate thresholds
    if (hc.thresholds?.healthyThreshold <= 0) {
      errors.push({
        field: `${prefix}.thresholds.healthyThreshold`,
        message: 'Healthy threshold must be positive',
        severity: 'major',
        suggestion: 'Set a positive threshold value'
      });
    }

    if (hc.thresholds?.unhealthyThreshold <= 0) {
      errors.push({
        field: `${prefix}.thresholds.unhealthyThreshold`,
        message: 'Unhealthy threshold must be positive',
        severity: 'major',
        suggestion: 'Set a positive threshold value'
      });
    }
  }

  /**
   * Validate error handling configuration
   */
  private validateErrorHandling(config: PipelineSchedulerConfig, errors: ConfigError[], warnings: ConfigWarning[]): void {
    const eh = config.errorHandling;
    const prefix = 'errorHandling';

    // Validate blacklist configuration
    if (eh.blacklist?.enabled) {
      if (eh.blacklist.maxEntries <= 0) {
        errors.push({
          field: `${prefix}.blacklist.maxEntries`,
          message: 'Max entries must be positive',
          severity: 'major',
          suggestion: 'Set a positive value for max entries'
        });
      }

      if (eh.blacklist.defaultDuration <= 0) {
        errors.push({
          field: `${prefix}.blacklist.defaultDuration`,
          message: 'Default duration must be positive',
          severity: 'major',
          suggestion: 'Set a positive duration value'
        });
      }

      if (eh.blacklist.cleanupInterval <= 0) {
        errors.push({
          field: `${prefix}.blacklist.cleanupInterval`,
          message: 'Cleanup interval must be positive',
          severity: 'major',
          suggestion: 'Set a positive cleanup interval'
        });
      }
    }

    // Validate strategies
    const strategies = eh.strategies;
    if (strategies.recoverableErrors?.maxRetryAttempts < 0) {
      errors.push({
        field: `${prefix}.strategies.recoverableErrors.maxRetryAttempts`,
        message: 'Max retry attempts must be non-negative',
        severity: 'major',
        suggestion: 'Set maxRetryAttempts to 0 or higher'
      });
    }

    if (strategies.authenticationErrors?.maintenanceDuration <= 0) {
      errors.push({
        field: `${prefix}.strategies.authenticationErrors.maintenanceDuration`,
        message: 'Maintenance duration must be positive',
        severity: 'major',
        suggestion: 'Set a positive maintenance duration'
      });
    }
  }

  /**
   * Validate performance configuration
   */
  private validatePerformance(
    config: PipelineSchedulerConfig, 
    errors: ConfigError[], 
    warnings: ConfigWarning[], 
    recommendations: ConfigRecommendation[]
  ): void {
    const perf = config.performance;
    const prefix = 'performance';

    // Validate concurrency settings
    if (perf.concurrency?.maxConcurrentRequests <= 0) {
      errors.push({
        field: `${prefix}.concurrency.maxConcurrentRequests`,
        message: 'Max concurrent requests must be positive',
        severity: 'major',
        suggestion: 'Set a positive value'
      });
    }

    if (perf.concurrency?.maxConcurrentRequestsPerPipeline <= 0) {
      errors.push({
        field: `${prefix}.concurrency.maxConcurrentRequestsPerPipeline`,
        message: 'Max concurrent requests per pipeline must be positive',
        severity: 'major',
        suggestion: 'Set a positive value'
      });
    }

    // Validate timeouts
    const timeouts = perf.timeouts || {};
    if (timeouts.defaultTimeout <= 0) {
      errors.push({
        field: `${prefix}.timeouts.defaultTimeout`,
        message: 'Default timeout must be positive',
        severity: 'major',
        suggestion: 'Set a positive timeout value'
      });
    }

    if (timeouts.executionTimeout <= 0) {
      errors.push({
        field: `${prefix}.timeouts.executionTimeout`,
        message: 'Execution timeout must be positive',
        severity: 'major',
        suggestion: 'Set a positive timeout value'
      });
    }

    // Performance recommendations
    if (perf.concurrency?.maxConcurrentRequests > 10000) {
      recommendations.push({
        field: `${prefix}.concurrency.maxConcurrentRequests`,
        current: perf.concurrency.maxConcurrentRequests,
        recommended: 1000,
        reason: 'Very high concurrency may impact system stability',
        impact: 'high'
      });
    }

    if (perf.timeouts?.defaultTimeout > 120000) {
      recommendations.push({
        field: `${prefix}.timeouts.defaultTimeout`,
        current: perf.timeouts.defaultTimeout,
        recommended: 30000,
        reason: 'Long default timeout may degrade user experience',
        impact: 'medium'
      });
    }
  }

  /**
   * Validate monitoring configuration
   */
  private validateMonitoring(config: PipelineSchedulerConfig, errors: ConfigError[], warnings: ConfigWarning[]): void {
    const monitoring = config.monitoring;
    const prefix = 'monitoring';

    // Validate metrics configuration
    if (monitoring.metrics?.enabled) {
      if (monitoring.metrics.collectionInterval <= 0) {
        errors.push({
          field: `${prefix}.metrics.collectionInterval`,
          message: 'Collection interval must be positive',
          severity: 'major',
          suggestion: 'Set a positive collection interval'
        });
      }
    }

    // Validate logging configuration
    if (monitoring.logging) {
      const validLevels = ['trace', 'debug', 'info', 'warn', 'error'];
      if (!validLevels.includes(monitoring.logging.level)) {
        errors.push({
          field: `${prefix}.logging.level`,
          message: `Invalid log level: ${monitoring.logging.level}`,
          severity: 'major',
          suggestion: `Use one of: ${validLevels.join(', ')}`
        });
      }
    }

    // Validate alerts configuration
    if (monitoring.alerts?.enabled) {
      if (!monitoring.alerts.rules || monitoring.alerts.rules.length === 0) {
        warnings.push({
          field: `${prefix}.alerts.rules`,
          message: 'Alert rules are recommended when alerts are enabled',
          suggestion: 'Add alert rules for better monitoring'
        });
      }

      if (!monitoring.alerts.channels || monitoring.alerts.channels.length === 0) {
        warnings.push({
          field: `${prefix}.alerts.channels`,
          message: 'Alert channels are required for alerts to work',
          suggestion: 'Add alert channels for notification delivery'
        });
      }
    }
  }

  /**
   * Validate security configuration
   */
  private validateSecurity(config: PipelineSchedulerConfig, errors: ConfigError[], warnings: ConfigWarning[]): void {
    const security = config.security;
    const prefix = 'security';

    // Validate authentication configuration
    if (security.authentication?.enabled) {
      const validMethods = ['jwt', 'oauth', 'api_key', 'custom'];
      if (!validMethods.includes(security.authentication.method)) {
        errors.push({
          field: `${prefix}.authentication.method`,
          message: `Invalid authentication method: ${security.authentication.method}`,
          severity: 'major',
          suggestion: `Use one of: ${validMethods.join(', ')}`
        });
      }
    }

    // Validate rate limiting configuration
    if (security.rateLimiting?.enabled) {
      if (security.rateLimiting.requestsPerMinute <= 0) {
        errors.push({
          field: `${prefix}.rateLimiting.requestsPerMinute`,
          message: 'Requests per minute must be positive',
          severity: 'major',
          suggestion: 'Set a positive value'
        });
      }

      if (security.rateLimiting.burstSize <= 0) {
        errors.push({
          field: `${prefix}.rateLimiting.burstSize`,
          message: 'Burst size must be positive',
          severity: 'major',
          suggestion: 'Set a positive burst size'
        });
      }
    }
  }

  /**
   * Validate cross-references between assembly table and scheduler config
   */
  private validateCrossReferences(
    assemblyTable: PipelineAssemblyTable,
    schedulerConfig: PipelineSchedulerConfig
  ): ConfigError[] {
    const errors: ConfigError[] = [];

    // Extract pipeline IDs from assembly table
    const assemblyPipelineIds = new Set(
      assemblyTable.pipelineTemplates.map(template => template.templateId)
    );

    // Extract pipeline IDs from scheduler config (if any)
    const schedulerPipelineIds = new Set(
      Object.keys(schedulerConfig.loadBalancing.strategyConfig?.weighted?.weights || {})
    );

    // Check if scheduler references non-existent pipelines
    for (const pipelineId of schedulerPipelineIds) {
      if (!assemblyPipelineIds.has(pipelineId)) {
        errors.push({
          field: 'loadBalancing.strategyConfig.weighted.weights',
          message: `Scheduler references non-existent pipeline: ${pipelineId}`,
          severity: 'critical',
          suggestion: 'Remove reference or add pipeline to assembly table'
        });
      }
    }

    return errors;
  }
}