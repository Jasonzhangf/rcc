import { ErrorContext, ErrorResponse, Template, TemplateManager as ITemplateManager, ResponseTemplate, EnhancedResponseTemplate } from '../../../SharedTypes';
/**
 * Response Template Manager - Manages standardized response templates
 * Handles default, module-specific, and dynamic template loading
 */
export declare class ResponseTemplateManager implements ITemplateManager {
    private templates;
    private moduleTemplates;
    private dynamicLoader;
    private isInitialized;
    private enableMetrics;
    private templateCache;
    /**
     * Constructs the Response Template Manager
     */
    constructor();
    /**
     * Initialize the response template manager
     */
    initialize(): Promise<void>;
    /**
     * Get template for error context
     * @param error - Error context
     * @returns Promise<ResponseTemplate> - Appropriate response template
     */
    getTemplateForError(error: ErrorContext): Promise<EnhancedResponseTemplate>;
    /**
     * Register a template
     * @param template - Template to register
     */
    registerTemplate(template: EnhancedResponseTemplate): void;
    /**
     * Unregister a template
     * @param templateId - Template ID to unregister
     */
    unregisterTemplate(templateId: string): void;
    /**
     * Assign template to module
     * @param moduleId - Module ID
     * @param templateId - Template ID
     */
    assignTemplateToModule(moduleId: string, templateId: string): void;
    /**
     * Remove template assignment from module
     * @param moduleId - Module ID
     */
    removeTemplateFromModule(moduleId: string): void;
    /**
     * Generate response from template
     * @param template - Response template
     * @param error - Error context
     * @returns Promise<ErrorResponse> - Generated error response
     */
    generateResponse(template: ResponseTemplate, error: ErrorContext): Promise<ErrorResponse>;
    /**
     * Get template by ID
     * @param templateId - Template ID
     * @returns Template or null if not found
     */
    getTemplateById(templateId: string): ResponseTemplate | null;
    /**
     * Get all templates
     * @returns Array of all templates
     */
    getAllTemplates(): ResponseTemplate[];
    /**
     * Get templates by category
     * @param category - Template category
     * @returns Array of templates in category
     */
    getTemplatesByCategory(category: string): ResponseTemplate[];
    /**
     * Get module template assignments
     * @returns Map of module ID to template ID
     */
    getModuleTemplateAssignments(): Map<string, string>;
    /**
     * Load dynamic templates
     */
    loadDynamicTemplates(): Promise<void>;
    /**
     * Refresh template cache
     */
    refreshTemplateCache(): void;
    /**
     * Shutdown the response template manager
     */
    shutdown(): Promise<void>;
    /**
     * Get template manager status
     * @returns Template manager status information
     */
    getStatus(): any;
    /**
     * Enable or disable metrics collection
     * @param enabled - Whether to enable metrics
     */
    setMetricsEnabled(enabled: boolean): void;
    /**
     * Check if template is applicable to error context
     * @param template - Template to check
     * @param error - Error context
     * @returns Whether template is applicable
     */
    private isTemplateApplicable;
    /**
     * Check if template condition matches error context
     * @param condition - Template condition
     * @param error - Error context
     * @returns Whether condition matches
     */
    private matchesTemplateCondition;
    /**
     * Get template ID by error type and severity
     * @param error - Error context
     * @returns Template ID or null if not found
     */
    private getTemplateIdByErrorType;
    /**
     * Create response from template
     * @param template - Response template
     * @param error - Error context
     * @returns Promise<ErrorResponse> - Generated response
     */
    private createResponseFromTemplate;
    /**
     * Prepare template data from error context
     * @param template - Response template
     * @param error - Error context
     * @returns Template data object
     */
    private prepareTemplateData;
    /**
     * Process template variables
     * @param template - Template with variables
     * @param data - Template data
     * @returns Processed template
     */
    private processTemplateVariables;
    /**
     * Process variables in object recursively
     * @param obj - Object to process
     * @param data - Template data
     */
    private processVariablesInObject;
    /**
     * Replace variables in string
     * @param str - String with variables
     * @param data - Template data
     * @returns String with variables replaced
     */
    private replaceVariables;
    /**
     * Get nested value from object using dot notation
     * @param obj - Object to get value from
     * @param path - Dot notation path
     * @returns Value or original placeholder if not found
     */
    private getNestedValue;
    /**
     * Generate response ID
     * @param errorId - Error ID
     * @returns Generated response ID
     */
    private generateResponseId;
    /**
     * Generate cache key
     * @param templateId - Template ID
     * @param errorId - Error ID
     * @returns Cache key
     */
    private generateCacheKey;
    /**
     * Register default templates
     */
    private registerDefaultTemplates;
    /**
     * Validate template
     * @param template - Template to validate
     * @throws Error if validation fails
     */
    private validateTemplate;
    /**
     * Ensure response template manager is initialized
     * @throws Error if not initialized
     */
    private ensureInitialized;
    /**
     * Get template by ID (TemplateManager interface)
     * @param templateId - Template ID
     * @returns Template | null - Template or null if not found
     */
    getTemplate(templateId: string): Template | null;
    /**
     * Register template (TemplateManager interface)
     * @param template - Template to register
     */
    registerTemplateForInterface(template: Template): void;
    /**
     * Unregister template (TemplateManager interface - already implemented)
     * @param templateId - Template ID to unregister
     */
    unregisterTemplateForInterface(templateId: string): void;
    /**
     * Render template (TemplateManager interface)
     * @param templateId - Template ID
     * @param variables - Template variables
     * @returns Rendered template string
     */
    renderTemplate(templateId: string, variables: Record<string, any>): string;
}
