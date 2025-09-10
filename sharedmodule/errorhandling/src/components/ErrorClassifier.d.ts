import { ModuleSource, ErrorClassification, ErrorSeverity, ErrorImpact, ErrorRecoverability, ErrorClassifier as IErrorClassifier } from '../../../SharedTypes';
/**
 * Error Classifier - Classifies and categorizes errors
 * Implements error classification algorithms and rule-based categorization
 */
export declare class ErrorClassifier implements IErrorClassifier {
    private classificationRules;
    private severityRules;
    private impactRules;
    private recoverabilityRules;
    private isInitialized;
    private enableMetrics;
    /**
     * Constructs the Error Classifier
     */
    constructor();
    /**
     * Initialize the error classifier
     */
    initialize(): Promise<void>;
    /**
     * Classify an error based on error object and module source
     * @param error - Error object to classify
     * @param source - Module source information
     * @returns Promise<ErrorClassification> - Error classification
     */
    classify(error: Error, source: ModuleSource): Promise<ErrorClassification>;
    /**
     * Register a classification rule
     * @param rule - Classification rule to register
     */
    registerClassificationRule(rule: ClassificationRule): void;
    /**
     * Register a severity rule
     * @param rule - Severity rule to register
     */
    registerSeverityRule(rule: SeverityRule): void;
    /**
     * Register an impact rule
     * @param rule - Impact rule to register
     */
    registerImpactRule(rule: ImpactRule): void;
    /**
     * Register a recoverability rule
     * @param rule - Recoverability rule to register
     */
    registerRecoverabilityRule(rule: RecoverabilityRule): void;
    /**
     * Get all classification rules
     * @returns Array of classification rules
     */
    getClassificationRules(): ClassificationRule[];
    /**
     * Get all severity rules
     * @returns Array of severity rules
     */
    getSeverityRules(): SeverityRule[];
    /**
     * Get all impact rules
     * @returns Array of impact rules
     */
    getImpactRules(): ImpactRule[];
    /**
     * Get all recoverability rules
     * @returns Array of recoverability rules
     */
    getRecoverabilityRules(): RecoverabilityRule[];
    /**
     * Clear all rules
     */
    clearRules(): void;
    /**
     * Shutdown the error classifier
     */
    shutdown(): Promise<void>;
    /**
     * Get classifier status
     * @returns Classifier status information
     */
    getStatus(): any;
    /**
     * Enable or disable metrics collection
     * @param enabled - Whether to enable metrics
     */
    setMetricsEnabled(enabled: boolean): void;
    /**
     * Classify error source
     * @param error - Error object
     * @param source - Module source
     * @returns Error source classification
     */
    private classifySource;
    /**
     * Classify error type
     * @param error - Error object
     * @param source - Module source
     * @returns Error type classification
     */
    private classifyType;
    /**
     * Classify error severity
     * @param error - Error object
     * @param source - Module source
     * @returns Error severity classification
     */
    private classifySeverity;
    /**
     * Classify error impact
     * @param error - Error object
     * @param source - Module source
     * @returns Error impact classification
     */
    private classifyImpact;
    /**
     * Classify error recoverability
     * @param error - Error object
     * @param source - Module source
     * @returns Error recoverability classification
     */
    private classifyRecoverability;
    /**
     * Check if error condition matches rule
     * @param error - Error object
     * @param source - Module source
     * @param condition - Rule condition
     * @returns Whether condition matches
     */
    private matchesErrorCondition;
    /**
     * Check if specific criteria matches
     * @param error - Error object
     * @param source - Module source
     * @param criteria - Criteria to check
     * @returns Whether criteria matches
     */
    private matchesCriteria;
    /**
     * Get field value from error or source
     * @param error - Error object
     * @param source - Module source
     * @param field - Field name
     * @returns Field value
     */
    private getFieldValue;
    private isNetworkError;
    private isSystemError;
    private isExternalError;
    private isBusinessError;
    private isConfigurationError;
    private isResourceError;
    private isDependencyError;
    private isCriticalError;
    private isSystemWideImpact;
    private isMultiModuleImpact;
    private isAutoRecoverable;
    private isRecoverable;
    /**
     * Get default classification
     * @returns Default error classification
     */
    private getDefaultClassification;
    /**
     * Register default classification rules
     */
    private registerDefaultClassificationRules;
    /**
     * Validate classification rule
     * @param rule - Rule to validate
     * @throws Error if validation fails
     */
    private validateClassificationRule;
    /**
     * Validate severity rule
     * @param rule - Rule to validate
     * @throws Error if validation fails
     */
    private validateSeverityRule;
    /**
     * Validate impact rule
     * @param rule - Rule to validate
     * @throws Error if validation fails
     */
    private validateImpactRule;
    /**
     * Validate recoverability rule
     * @param rule - Rule to validate
     * @throws Error if validation fails
     */
    private validateRecoverabilityRule;
    /**
     * Ensure error classifier is initialized
     * @throws Error if not initialized
     */
    private ensureInitialized;
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
export {};
