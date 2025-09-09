import { 
  ModuleSource, 
  ErrorClassification,
  ErrorSource,
  ErrorType,
  ErrorSeverity,
  ErrorImpact,
  ErrorRecoverability,
  ErrorClassifier as IErrorClassifier 
} from '../../types/ErrorHandlingCenter.types';

// Use native Error type
declare const Error: ErrorConstructor;

/**
 * Error Classifier - Classifies and categorizes errors
 * Implements error classification algorithms and rule-based categorization
 */
export class ErrorClassifier implements IErrorClassifier {
  private classificationRules: ClassificationRule[] = [];
  private severityRules: SeverityRule[] = [];
  private impactRules: ImpactRule[] = [];
  private recoverabilityRules: RecoverabilityRule[] = [];
  private isInitialized: boolean = false;
  private enableMetrics: boolean = true;
  
  /**
   * Constructs the Error Classifier
   */
  constructor() {
    // Initialize with default classification rules
  }

  /**
   * Initialize the error classifier
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Register default classification rules
      this.registerDefaultClassificationRules();
      
      this.isInitialized = true;
      console.log('Error Classifier initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Error Classifier:', error);
      throw error;
    }
  }

  /**
   * Classify an error based on error object and module source
   * @param error - Error object to classify
   * @param source - Module source information
   * @returns Promise<ErrorClassification> - Error classification
   */
  public async classify(error: Error, source: ModuleSource): Promise<ErrorClassification> {
    this.ensureInitialized();
    
    try {
      if (this.enableMetrics) {
        console.log(`Classifying error from module ${source.moduleId}: ${error.message}`);
      }

      // Perform classification
      const classification: ErrorClassification = {
        source: this.classifySource(error, source),
        type: this.classifyType(error, source),
        severity: this.classifySeverity(error, source),
        impact: this.classifyImpact(error, source),
        recoverability: this.classifyRecoverability(error, source)
      };

      if (this.enableMetrics) {
        console.log(`Error classified: ${JSON.stringify(classification)}`);
      }

      return classification;
    } catch (classificationError) {
      console.error(`Error during classification: ${classificationError}`);
      
      // Return default classification on failure
      return this.getDefaultClassification();
    }
  }

  /**
   * Register a classification rule
   * @param rule - Classification rule to register
   */
  public registerClassificationRule(rule: ClassificationRule): void {
    this.ensureInitialized();
    
    try {
      this.validateClassificationRule(rule);
      this.classificationRules.push(rule);
      
      if (this.enableMetrics) {
        console.log(`Classification rule ${rule.name} registered successfully`);
      }
    } catch (error) {
      console.error(`Failed to register classification rule: ${error}`);
      throw error;
    }
  }

  /**
   * Register a severity rule
   * @param rule - Severity rule to register
   */
  public registerSeverityRule(rule: SeverityRule): void {
    this.ensureInitialized();
    
    try {
      this.validateSeverityRule(rule);
      this.severityRules.push(rule);
      
      if (this.enableMetrics) {
        console.log(`Severity rule ${rule.name} registered successfully`);
      }
    } catch (error) {
      console.error(`Failed to register severity rule: ${error}`);
      throw error;
    }
  }

  /**
   * Register an impact rule
   * @param rule - Impact rule to register
   */
  public registerImpactRule(rule: ImpactRule): void {
    this.ensureInitialized();
    
    try {
      this.validateImpactRule(rule);
      this.impactRules.push(rule);
      
      if (this.enableMetrics) {
        console.log(`Impact rule ${rule.name} registered successfully`);
      }
    } catch (error) {
      console.error(`Failed to register impact rule: ${error}`);
      throw error;
    }
  }

  /**
   * Register a recoverability rule
   * @param rule - Recoverability rule to register
   */
  public registerRecoverabilityRule(rule: RecoverabilityRule): void {
    this.ensureInitialized();
    
    try {
      this.validateRecoverabilityRule(rule);
      this.recoverabilityRules.push(rule);
      
      if (this.enableMetrics) {
        console.log(`Recoverability rule ${rule.name} registered successfully`);
      }
    } catch (error) {
      console.error(`Failed to register recoverability rule: ${error}`);
      throw error;
    }
  }

  /**
   * Get all classification rules
   * @returns Array of classification rules
   */
  public getClassificationRules(): ClassificationRule[] {
    return [...this.classificationRules];
  }

  /**
   * Get all severity rules
   * @returns Array of severity rules
   */
  public getSeverityRules(): SeverityRule[] {
    return [...this.severityRules];
  }

  /**
   * Get all impact rules
   * @returns Array of impact rules
   */
  public getImpactRules(): ImpactRule[] {
    return [...this.impactRules];
  }

  /**
   * Get all recoverability rules
   * @returns Array of recoverability rules
   */
  public getRecoverabilityRules(): RecoverabilityRule[] {
    return [...this.recoverabilityRules];
  }

  /**
   * Clear all rules
   */
  public clearRules(): void {
    this.ensureInitialized();
    
    this.classificationRules = [];
    this.severityRules = [];
    this.impactRules = [];
    this.recoverabilityRules = [];
    
    console.log('All classification rules cleared');
  }

  /**
   * Shutdown the error classifier
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log('Shutting down Error Classifier...');
      
      // Clear all rules
      this.clearRules();
      
      this.isInitialized = false;
      console.log('Error Classifier shutdown completed');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get classifier status
   * @returns Classifier status information
   */
  public getStatus(): any {
    return {
      isInitialized: this.isInitialized,
      enableMetrics: this.enableMetrics,
      classificationRulesCount: this.classificationRules.length,
      severityRulesCount: this.severityRules.length,
      impactRulesCount: this.impactRules.length,
      recoverabilityRulesCount: this.recoverabilityRules.length
    };
  }

  /**
   * Enable or disable metrics collection
   * @param enabled - Whether to enable metrics
   */
  public setMetricsEnabled(enabled: boolean): void {
    this.enableMetrics = enabled;
  }

  /**
   * Classify error source
   * @param error - Error object
   * @param source - Module source
   * @returns Error source classification
   */
  private classifySource(error: Error, source: ModuleSource): ErrorSource {
    // Check module-specific rules first
    for (const rule of this.classificationRules) {
      if (rule.enabled && this.matchesErrorCondition(error, source, rule.condition)) {
        if (rule.result.source) {
          return rule.result.source;
        }
      }
    }

    // Default source classification logic
    if (this.isNetworkError(error)) {
      return ErrorSource.NETWORK;
    }
    
    if (this.isSystemError(error)) {
      return ErrorSource.SYSTEM;
    }
    
    if (this.isExternalError(error)) {
      return ErrorSource.EXTERNAL;
    }
    
    // Default to module source
    return ErrorSource.MODULE;
  }

  /**
   * Classify error type
   * @param error - Error object
   * @param source - Module source
   * @returns Error type classification
   */
  private classifyType(error: Error, source: ModuleSource): ErrorType {
    // Check module-specific rules first
    for (const rule of this.classificationRules) {
      if (rule.enabled && this.matchesErrorCondition(error, source, rule.condition)) {
        if (rule.result.type) {
          return rule.result.type;
        }
      }
    }

    // Default type classification logic
    if (this.isBusinessError(error)) {
      return ErrorType.BUSINESS;
    }
    
    if (this.isConfigurationError(error)) {
      return ErrorType.CONFIGURATION;
    }
    
    if (this.isResourceError(error)) {
      return ErrorType.RESOURCE;
    }
    
    if (this.isDependencyError(error)) {
      return ErrorType.DEPENDENCY;
    }
    
    // Default to technical error
    return ErrorType.TECHNICAL;
  }

  /**
   * Classify error severity
   * @param error - Error object
   * @param source - Module source
   * @returns Error severity classification
   */
  private classifySeverity(error: Error, source: ModuleSource): ErrorSeverity {
    // Check severity rules first
    for (const rule of this.severityRules) {
      if (rule.enabled && this.matchesErrorCondition(error, source, rule.condition)) {
        return rule.severity;
      }
    }

    // Default severity classification logic
    const errorMessage = error.message.toLowerCase();
    const errorName = error.constructor.name.toLowerCase();
    
    if (this.isCriticalError(error)) {
      return ErrorSeverity.CRITICAL;
    }
    
    if (errorMessage.includes('timeout') || 
        errorMessage.includes('not found') ||
        errorName.includes('notfound') ||
        errorName.includes('notimplemented')) {
      return ErrorSeverity.HIGH;
    }
    
    if (errorMessage.includes('invalid') || 
        errorMessage.includes('failed') ||
        errorName.includes('validation')) {
      return ErrorSeverity.MEDIUM;
    }
    
    // Default to low severity
    return ErrorSeverity.LOW;
  }

  /**
   * Classify error impact
   * @param error - Error object
   * @param source - Module source
   * @returns Error impact classification
   */
  private classifyImpact(error: Error, source: ModuleSource): ErrorImpact {
    // Check impact rules first
    for (const rule of this.impactRules) {
      if (rule.enabled && this.matchesErrorCondition(error, source, rule.condition)) {
        return rule.impact;
      }
    }

    // Default impact classification logic
    if (this.isSystemWideImpact(error)) {
      return ErrorImpact.SYSTEM_WIDE;
    }
    
    if (this.isMultiModuleImpact(error)) {
      return ErrorImpact.MULTIPLE_MODULE;
    }
    
    // Default to single module impact
    return ErrorImpact.SINGLE_MODULE;
  }

  /**
   * Classify error recoverability
   * @param error - Error object
   * @param source - Module source
   * @returns Error recoverability classification
   */
  private classifyRecoverability(error: Error, source: ModuleSource): ErrorRecoverability {
    // Check recoverability rules first
    for (const rule of this.recoverabilityRules) {
      if (rule.enabled && this.matchesErrorCondition(error, source, rule.condition)) {
        return rule.recoverability;
      }
    }

    // Default recoverability classification logic
    if (this.isAutoRecoverable(error)) {
      return ErrorRecoverability.AUTO_RECOVERABLE;
    }
    
    if (this.isRecoverable(error)) {
      return ErrorRecoverability.RECOVERABLE;
    }
    
    // Default to non-recoverable
    return ErrorRecoverability.NON_RECOVERABLE;
  }

  /**
   * Check if error condition matches rule
   * @param error - Error object
   * @param source - Module source
   * @param condition - Rule condition
   * @returns Whether condition matches
   */
  private matchesErrorCondition(
    error: Error, 
    source: ModuleSource, 
    condition: Condition
  ): boolean {
    for (const criteria of condition.criteria) {
      if (!this.matchesCriteria(error, source, criteria)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if specific criteria matches
   * @param error - Error object
   * @param source - Module source
   * @param criteria - Criteria to check
   * @returns Whether criteria matches
   */
  private matchesCriteria(
    error: Error, 
    source: ModuleSource, 
    criteria: Criteria
  ): boolean {
    const fieldValue = this.getFieldValue(error, source, criteria.field);
    
    switch (criteria.operator) {
      case 'equals':
        return fieldValue === criteria.value;
      case 'not_equals':
        return fieldValue !== criteria.value;
      case 'contains':
        return typeof fieldValue === 'string' && 
               fieldValue.toLowerCase().includes(String(criteria.value).toLowerCase());
      case 'not_contains':
        return typeof fieldValue === 'string' && 
               !fieldValue.toLowerCase().includes(String(criteria.value).toLowerCase());
      case 'regex':
        return typeof fieldValue === 'string' && 
               new RegExp(criteria.value).test(fieldValue);
      case 'starts_with':
        return typeof fieldValue === 'string' && 
               fieldValue.toLowerCase().startsWith(String(criteria.value).toLowerCase());
      case 'ends_with':
        return typeof fieldValue === 'string' && 
               fieldValue.toLowerCase().endsWith(String(criteria.value).toLowerCase());
      default:
        return false;
    }
  }

  /**
   * Get field value from error or source
   * @param error - Error object
   * @param source - Module source
   * @param field - Field name
   * @returns Field value
   */
  private getFieldValue(error: Error, source: ModuleSource, field: string): any {
    switch (field) {
      case 'error.message':
        return error.message;
      case 'error.name':
        return error.constructor.name;
      case 'error.stack':
        return error.stack;
      case 'module.id':
        return source.moduleId;
      case 'module.name':
        return source.moduleName;
      case 'module.version':
        return source.version;
      case 'module.fileName':
        return source.fileName;
      default:
        return null;
    }
  }

  // Utility methods for error classification

  private isNetworkError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const name = error.constructor.name.toLowerCase();
    
    return message.includes('network') ||
           message.includes('connection') ||
           message.includes('timeout') ||
           message.includes('econnrefused') ||
           message.includes('econnreset') ||
           name.includes('network') ||
           name.includes('connection');
  }

  private isSystemError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const name = error.constructor.name.toLowerCase();
    
    return message.includes('system') ||
           message.includes('out of memory') ||
           message.includes('disk full') ||
           message.includes('permission denied') ||
           message.includes('access denied') ||
           name.includes('system');
  }

  private isExternalError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    return message.includes('external') ||
           message.includes('third party') ||
           message.includes('api') ||
           message.includes('service');
  }

  private isBusinessError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    return message.includes('business') ||
           message.includes('validation') ||
           message.includes('invalid') ||
           message.includes('not allowed');
  }

  private isConfigurationError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    return message.includes('config') ||
           message.includes('configuration') ||
           message.includes('setting') ||
           message.includes('parameter') ||
           message.includes('option');
  }

  private isResourceError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    return message.includes('resource') ||
           message.includes('memory') ||
           message.includes('disk') ||
           message.includes('quota') ||
           message.includes('limit');
  }

  private isDependencyError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    return message.includes('dependency') ||
           message.includes('missing') ||
           message.includes('not found') ||
           message.includes('require');
  }

  private isCriticalError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const name = error.constructor.name.toLowerCase();
    
    return message.includes('fatal') ||
           message.includes('critical') ||
           message.includes('error') ||
           name.includes('error') ||
           name.includes('exception');
  }

  private isSystemWideImpact(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    return message.includes('system') ||
           message.includes('global') ||
           message.includes('all');
  }

  private isMultiModuleImpact(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    return message.includes('multiple') ||
           message.includes('several') ||
           message.includes('modules');
  }

  private isAutoRecoverable(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    return message.includes('timeout') ||
           message.includes('temporary') ||
           message.includes('retry');
  }

  private isRecoverable(error: Error): boolean {
    // Most errors are recoverable unless they are explicitly marked as non-recoverable
    return !error.message.toLowerCase().includes('fatal');
  }

  /**
   * Get default classification
   * @returns Default error classification
   */
  private getDefaultClassification(): ErrorClassification {
    return {
      source: ErrorSource.UNKNOWN,
      type: ErrorType.TECHNICAL,
      severity: ErrorSeverity.MEDIUM,
      impact: ErrorImpact.SINGLE_MODULE,
      recoverability: ErrorRecoverability.RECOVERABLE
    };
  }

  /**
   * Register default classification rules
   */
  private registerDefaultClassificationRules(): void {
    // UnderConstruction module rule
    const underConstructionRule: ClassificationRule = {
      ruleId: `under_construction_${Date.now()}`,
      name: 'UnderConstructionRule',
      enabled: true,
      priority: 100,
      condition: {
        criteria: [
          {
            field: 'module.name',
            operator: 'contains',
            value: 'UnderConstruction'
          }
        ]
      },
      result: {
        type: ErrorType.TECHNICAL,
        source: ErrorSource.MODULE,
        severity: ErrorSeverity.MEDIUM,
        impact: ErrorImpact.SINGLE_MODULE,
        recoverability: ErrorRecoverability.RECOVERABLE
      }
    };
    this.registerClassificationRule(underConstructionRule);

    // Network error severity rule
    const networkSeverityRule: SeverityRule = {
      ruleId: `network_severity_${Date.now()}`,
      name: 'NetworkSeverityRule',
      enabled: true,
      priority: 90,
      condition: {
        criteria: [
          {
            field: 'error.message',
            operator: 'contains',
            value: 'network'
          }
        ]
      },
      severity: ErrorSeverity.HIGH
    };
    this.registerSeverityRule(networkSeverityRule);

    // System-wide impact rule
    const systemImpactRule: ImpactRule = {
      ruleId: `system_impact_${Date.now()}`,
      name: 'SystemImpactRule',
      enabled: true,
      priority: 95,
      condition: {
        criteria: [
          {
            field: 'error.message',
            operator: 'contains',
            value: 'system'
          }
        ]
      },
      impact: ErrorImpact.SYSTEM_WIDE
    };
    this.registerImpactRule(systemImpactRule);

    // Auto-recoverable rule
    const autoRecoverableRule: RecoverabilityRule = {
      ruleId: `auto_recoverable_${Date.now()}`,
      name: 'AutoRecoverableRule',
      enabled: true,
      priority: 85,
      condition: {
        criteria: [
          {
            field: 'error.message',
            operator: 'contains',
            value: 'timeout'
          }
        ]
      },
      recoverability: ErrorRecoverability.AUTO_RECOVERABLE
    };
    this.registerRecoverabilityRule(autoRecoverableRule);
  }

  /**
   * Validate classification rule
   * @param rule - Rule to validate
   * @throws Error if validation fails
   */
  private validateClassificationRule(rule: ClassificationRule): void {
    if (!rule.ruleId || rule.ruleId.trim() === '') {
      throw new Error('Rule ID is required');
    }
    
    if (!rule.name || rule.name.trim() === '') {
      throw new Error('Rule name is required');
    }
    
    if (!rule.condition || !Array.isArray(rule.condition.criteria)) {
      throw new Error('Rule condition with criteria array is required');
    }
    
    if (typeof rule.priority !== 'number' || rule.priority < 0) {
      throw new Error('Rule priority must be a non-negative number');
    }
  }

  /**
   * Validate severity rule
   * @param rule - Rule to validate
   * @throws Error if validation fails
   */
  private validateSeverityRule(rule: SeverityRule): void {
    if (!rule.ruleId || rule.ruleId.trim() === '') {
      throw new Error('Rule ID is required');
    }
    
    if (!rule.name || rule.name.trim() === '') {
      throw new Error('Rule name is required');
    }
    
    if (!Object.values(ErrorSeverity).includes(rule.severity)) {
      throw new Error(`Invalid severity: ${rule.severity}`);
    }
    
    if (!rule.condition || !Array.isArray(rule.condition.criteria)) {
      throw new Error('Rule condition with criteria array is required');
    }
  }

  /**
   * Validate impact rule
   * @param rule - Rule to validate
   * @throws Error if validation fails
   */
  private validateImpactRule(rule: ImpactRule): void {
    if (!rule.ruleId || rule.ruleId.trim() === '') {
      throw new Error('Rule ID is required');
    }
    
    if (!rule.name || rule.name.trim() === '') {
      throw new Error('Rule name is required');
    }
    
    if (!Object.values(ErrorImpact).includes(rule.impact)) {
      throw new Error(`Invalid impact: ${rule.impact}`);
    }
    
    if (!rule.condition || !Array.isArray(rule.condition.criteria)) {
      throw new Error('Rule condition with criteria array is required');
    }
  }

  /**
   * Validate recoverability rule
   * @param rule - Rule to validate
   * @throws Error if validation fails
   */
  private validateRecoverabilityRule(rule: RecoverabilityRule): void {
    if (!rule.ruleId || rule.ruleId.trim() === '') {
      throw new Error('Rule ID is required');
    }
    
    if (!rule.name || rule.name.trim() === '') {
      throw new Error('Rule name is required');
    }
    
    if (!Object.values(ErrorRecoverability).includes(rule.recoverability)) {
      throw new Error(`Invalid recoverability: ${rule.recoverability}`);
    }
    
    if (!rule.condition || !Array.isArray(rule.condition.criteria)) {
      throw new Error('Rule condition with criteria array is required');
    }
  }

  /**
   * Ensure error classifier is initialized
   * @throws Error if not initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Error Classifier is not initialized. Call initialize() first.');
    }
  }
}

/**
 * Rule interfaces
 */
interface ClassificationRule {
  ruleId: string;
  name: string;
  enabled: boolean;
  priority: number;
  condition: Condition;
  result: Partial<ErrorClassification>;
}

interface SeverityRule {
  ruleId: string;
  name: string;
  enabled: boolean;
  priority: number;
  condition: Condition;
  severity: ErrorSeverity;
}

interface ImpactRule {
  ruleId: string;
  name: string;
  enabled: boolean;
  priority: number;
  condition: Condition;
  impact: ErrorImpact;
}

interface RecoverabilityRule {
  ruleId: string;
  name: string;
  enabled: boolean;
  priority: number;
  condition: Condition;
  recoverability: ErrorRecoverability;
}

interface Condition {
  criteria: Criteria[];
}

interface Criteria {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'regex' | 'starts_with' | 'ends_with';
  value: string;
}