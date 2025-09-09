import { 
  ErrorContext, 
  ErrorResponse, 
  ModuleResponse,
  Template,
  TemplateManager as ITemplateManager,
  ResponseTemplate,
  DynamicTemplateLoader,
  EnhancedResponseTemplate,
  PolicyCondition
} from '../../types/ErrorHandlingCenter.types';
import { ERROR_HANDLING_CENTER_CONSTANTS } from '../../constants/ErrorHandlingCenter.constants';

/**
 * Response Template Manager - Manages standardized response templates
 * Handles default, module-specific, and dynamic template loading
 */
export class ResponseTemplateManager implements ITemplateManager {
  private templates: Map<string, ResponseTemplate> = new Map();
  private moduleTemplates: Map<string, string> = new Map(); // moduleId -> templateId
  private dynamicLoader: DynamicTemplateLoader | null = null;
  private isInitialized: boolean = false;
  private enableMetrics: boolean = true;
  private templateCache: Map<string, any> = new Map();
  
  /**
   * Constructs the Response Template Manager
   */
  constructor() {
    // Initialize with default templates
  }

  /**
   * Initialize the response template manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize dynamic loader if available
      // this.dynamicLoader = new DynamicTemplateLoader();
      // await this.dynamicLoader.initialize();
      
      // Set initialized flag before registering templates to allow internal calls
      this.isInitialized = true;
      
      // Register default templates
      await this.registerDefaultTemplates();
      
      // Load initial dynamic templates
      await this.loadDynamicTemplates();
      
      console.log('Response Template Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Response Template Manager:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Get template for error context
   * @param error - Error context
   * @returns Promise<ResponseTemplate> - Appropriate response template
   */
  public async getTemplateForError(error: ErrorContext): Promise<EnhancedResponseTemplate> {
    this.ensureInitialized();
    
    try {
      if (this.enableMetrics) {
        console.log(`Getting template for error ${error.errorId}`);
      }

      // Try to get module-specific template first
      let templateId = this.moduleTemplates.get(error.source.moduleId) || undefined;
      
      if (templateId) {
        const template = this.templates.get(templateId);
        if (template && this.isTemplateApplicable(template, error)) {
          return template;
        }
      }
      
      // Try to get template by error type/severity
      templateId = this.getTemplateIdByErrorType(error);
      if (templateId) {
        const template = this.templates.get(templateId);
        if (template && this.isTemplateApplicable(template, error)) {
          return template;
        }
      }
      
      // Dynamic loader not used in this implementation
      // In a real implementation, this would load templates from external sources
      try {
        // Placeholder for dynamic template loading
        if (this.enableMetrics) {
          console.log('Dynamic template loading not implemented');
        }
      } catch (dynamicError) {
        console.warn('Dynamic template loading failed:', dynamicError);
      }
      
      // Fallback to default template
      const defaultTemplate = this.templates.get('default');
      if (!defaultTemplate) {
        throw new Error('Default template not found');
      }
      
      return defaultTemplate;
    } catch (error) {
      const errorObj = error as Error;
      console.error(`Error getting template:`, errorObj);
      throw errorObj;
    }
  }

  /**
   * Register a template
   * @param template - Template to register
   */
  public registerTemplate(template: EnhancedResponseTemplate): void {
    this.ensureInitialized();
    
    try {
      this.validateTemplate(template);
      this.templates.set(template.templateId, template);
      
      if (this.enableMetrics) {
        console.log(`Template ${template.name} (${template.templateId}) registered successfully`);
      }
    } catch (error) {
      console.error(`Failed to register template ${template.templateId}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a template
   * @param templateId - Template ID to unregister
   */
  public unregisterTemplate(templateId: string): void {
    this.ensureInitialized();
    
    try {
      const deleted = this.templates.delete(templateId);
      
      // Remove from module templates mapping
      for (const [moduleId, mappedTemplateId] of this.moduleTemplates.entries()) {
        if (mappedTemplateId === templateId) {
          this.moduleTemplates.delete(moduleId);
        }
      }
      
      if (deleted) {
        console.log(`Template ${templateId} unregistered successfully`);
      } else {
        console.warn(`Template ${templateId} not found for unregistration`);
      }
    } catch (error) {
      console.error(`Failed to unregister template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Assign template to module
   * @param moduleId - Module ID
   * @param templateId - Template ID
   */
  public assignTemplateToModule(moduleId: string, templateId: string): void {
    this.ensureInitialized();
    
    try {
      if (!this.templates.has(templateId)) {
        throw new Error(`Template ${templateId} not found`);
      }
      
      this.moduleTemplates.set(moduleId, templateId);
      
      if (this.enableMetrics) {
        console.log(`Template ${templateId} assigned to module ${moduleId}`);
      }
    } catch (error) {
      console.error(`Failed to assign template ${templateId} to module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Remove template assignment from module
   * @param moduleId - Module ID
   */
  public removeTemplateFromModule(moduleId: string): void {
    this.ensureInitialized();
    
    try {
      const removed = this.moduleTemplates.delete(moduleId);
      if (removed) {
        console.log(`Template removed from module ${moduleId}`);
      }
    } catch (error) {
      console.error(`Failed to remove template from module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Generate response from template
   * @param template - Response template
   * @param error - Error context
   * @returns Promise<ErrorResponse> - Generated error response
   */
  public async generateResponse(
    template: ResponseTemplate, 
    error: ErrorContext
  ): Promise<ErrorResponse> {
    this.ensureInitialized();
    
    try {
      if (this.enableMetrics) {
        console.log(`Generating response from template ${template.templateId}`);
      }

      const cacheKey = this.generateCacheKey(template.templateId, error.errorId);
      
      // Check cache first
      const enhancedTemplate = template as EnhancedResponseTemplate;
      if (enhancedTemplate.cacheable && this.templateCache.has(cacheKey)) {
        return this.templateCache.get(cacheKey);
      }

      // Generate response
      const response = await this.createResponseFromTemplate(template, error);
      
      // Cache if template is cacheable
      if (enhancedTemplate.cacheable) {
        this.templateCache.set(cacheKey, response);
        
        // Set cache expiration if specified
        if (enhancedTemplate.cacheTimeout) {
          setTimeout(() => {
            this.templateCache.delete(cacheKey);
          }, enhancedTemplate.cacheTimeout);
        }
      }

      return response;
    } catch (error) {
      console.error(`Error generating response from template ${template.templateId}:`, error);
      throw error;
    }
  }

  /**
   * Get template by ID
   * @param templateId - Template ID
   * @returns Template or null if not found
   */
  public getTemplateById(templateId: string): ResponseTemplate | null {
    this.ensureInitialized();
    return this.templates.get(templateId) || null;
  }

  /**
   * Get all templates
   * @returns Array of all templates
   */
  public getAllTemplates(): ResponseTemplate[] {
    this.ensureInitialized();
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   * @param category - Template category
   * @returns Array of templates in category
   */
  public getTemplatesByCategory(category: string): ResponseTemplate[] {
    this.ensureInitialized();
    return Array.from(this.templates.values())
      .filter(template => {
        const enhancedTemplate = template as EnhancedResponseTemplate;
        return enhancedTemplate.category === category;
      });
  }

  /**
   * Get module template assignments
   * @returns Map of module ID to template ID
   */
  public getModuleTemplateAssignments(): Map<string, string> {
    this.ensureInitialized();
    return new Map(this.moduleTemplates);
  }

  /**
   * Load dynamic templates
   */
  public async loadDynamicTemplates(): Promise<void> {
    this.ensureInitialized();
    
    if (!this.dynamicLoader) {
      return;
    }

    try {
      if (this.dynamicLoader && this.dynamicLoader.loadAllTemplates) {
        const dynamicTemplates = await this.dynamicLoader.loadAllTemplates();
        
        for (const template of dynamicTemplates) {
          this.registerTemplate(template);
        }
        
        if (this.enableMetrics) {
          console.log(`Loaded ${dynamicTemplates.length} dynamic templates`);
        }
      }
    } catch (error) {
      console.error('Error loading dynamic templates:', error);
    }
  }

  /**
   * Refresh template cache
   */
  public refreshTemplateCache(): void {
    this.ensureInitialized();
    
    this.templateCache.clear();
    console.log('Template cache refreshed');
  }

  /**
   * Shutdown the response template manager
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log('Shutting down Response Template Manager...');
      
      // Shutdown dynamic loader
      if (this.dynamicLoader && this.dynamicLoader.shutdown) {
        await this.dynamicLoader.shutdown();
      }
      
      // Clear templates and cache
      this.templates.clear();
      this.moduleTemplates.clear();
      this.templateCache.clear();
      
      this.isInitialized = false;
      console.log('Response Template Manager shutdown completed');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get template manager status
   * @returns Template manager status information
   */
  public getStatus(): any {
    return {
      isInitialized: this.isInitialized,
      enableMetrics: this.enableMetrics,
      templatesCount: this.templates.size,
      moduleAssignmentsCount: this.moduleTemplates.size,
      cacheSize: this.templateCache.size,
      dynamicLoaderAvailable: !!this.dynamicLoader,
      dynamicLoaderStatus: this.dynamicLoader && this.dynamicLoader.getStatus ? this.dynamicLoader.getStatus() : null
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
   * Check if template is applicable to error context
   * @param template - Template to check
   * @param error - Error context
   * @returns Whether template is applicable
   */
  private isTemplateApplicable(template: ResponseTemplate | EnhancedResponseTemplate, error: ErrorContext): boolean {
    const enhancedTemplate = template as EnhancedResponseTemplate;
    if (!enhancedTemplate.conditions) {
      return true; // No conditions means applicable to all
    }

    return enhancedTemplate.conditions.every(condition => 
      this.matchesTemplateCondition(condition, error)
    );
  }

  /**
   * Check if template condition matches error context
   * @param condition - Template condition
   * @param error - Error context
   * @returns Whether condition matches
   */
  private matchesTemplateCondition(condition: PolicyCondition | TemplateCondition, error: ErrorContext): boolean {
    const templateCondition = condition as TemplateCondition;
    switch (templateCondition.field) {
      case 'moduleId':
        return templateCondition.value === error.source.moduleId;
      case 'errorType':
        return templateCondition.value === error.classification.type;
      case 'severity':
        return templateCondition.value === error.classification.severity;
      case 'source':
        return templateCondition.value === error.classification.source;
      case 'impact':
        return templateCondition.value === error.classification.impact;
      case 'isUnderConstruction':
        return templateCondition.value === (error.data.isUnderConstruction || false);
      default:
        return false;
    }
  }

  /**
   * Get template ID by error type and severity
   * @param error - Error context
   * @returns Template ID or null if not found
   */
  private getTemplateIdByErrorType(error: ErrorContext): string | undefined {
    const errorType = error.classification.type;
    const severity = error.classification.severity;
    
    // Try specific template first (e.g., 'technical_critical')
    const specificId = `${errorType}_${severity}`;
    if (this.templates.has(specificId)) {
      return specificId;
    }
    
    // Try type-specific template (e.g., 'technical')
    if (this.templates.has(errorType)) {
      return errorType;
    }
    
    // Try severity-specific template (e.g., 'critical')
    if (this.templates.has(severity)) {
      return severity;
    }
    
    return undefined;
  }

  /**
   * Create response from template
   * @param template - Response template
   * @param error - Error context
   * @returns Promise<ErrorResponse> - Generated response
   */
  private async createResponseFromTemplate(
    template: ResponseTemplate, 
    error: ErrorContext
  ): Promise<ErrorResponse> {
    const templateData = this.prepareTemplateData(template, error);
    
    // Process template variables
    const processedTemplate = await this.processTemplateVariables(template, templateData);
    const enhancedTemplate = processedTemplate as EnhancedResponseTemplate;
    
    return {
      responseId: this.generateResponseId(error.errorId),
      errorId: error.errorId,
      result: {
        status: enhancedTemplate.result?.status || 'success',
        message: enhancedTemplate.result?.message || 'Error processed',
        details: enhancedTemplate.result?.details || '',
        code: enhancedTemplate.result?.code || 'TEMPLATE_RESPONSE'
      },
      timestamp: new Date(),
      processingTime: 0, // Will be set by executor
      data: {
        moduleName: error.source.moduleName,
        moduleId: error.source.moduleId,
        response: enhancedTemplate.data?.response || {},
        config: error.config,
        metadata: enhancedTemplate.data?.metadata || {}
      },
      actions: enhancedTemplate.actions || [],
      annotations: enhancedTemplate.annotations || []
    };
  }

  /**
   * Prepare template data from error context
   * @param template - Response template
   * @param error - Error context
   * @returns Template data object
   */
  private prepareTemplateData(template: ResponseTemplate, error: ErrorContext): any {
    const enhancedTemplate = template as EnhancedResponseTemplate;
    return {
      error: {
        id: error.errorId,
        message: error.error.message,
        name: error.error.name,
        stack: error.error.stack,
        timestamp: error.timestamp
      },
      source: {
        moduleId: error.source.moduleId,
        moduleName: error.source.moduleName,
        version: error.source.version,
        fileName: error.source.fileName,
        lineNumber: error.source.lineNumber
      },
      classification: error.classification,
      data: error.data,
      config: error.config,
      timestamp: Date.now(),
      template: {
        id: template.templateId,
        name: template.name,
        category: enhancedTemplate.category
      }
    };
  }

  /**
   * Process template variables
   * @param template - Template with variables
   * @param data - Template data
   * @returns Processed template
   */
  private async processTemplateVariables(
    template: ResponseTemplate, 
    data: any
  ): Promise<any> {
    const processed = JSON.parse(JSON.stringify(template)); // Deep clone
    
    // Process string variables in template
    this.processVariablesInObject(processed, data);
    
    // Execute dynamic content if available
    const enhancedProcessed = processed as EnhancedResponseTemplate;
    if (enhancedProcessed.dynamicContent) {
      for (const [key, dynamicFunc] of Object.entries(enhancedProcessed.dynamicContent)) {
        try {
          (processed as any)[key] = await (dynamicFunc as (data: any) => Promise<any>)(data);
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          console.warn(`Dynamic content function ${key} failed:`, errorObj);
          // Keep original value if dynamic function fails
        }
      }
    }
    
    return processed;
  }

  /**
   * Process variables in object recursively
   * @param obj - Object to process
   * @param data - Template data
   */
  private processVariablesInObject(obj: any, data: any): void {
    if (typeof obj === 'string') {
      // Replace variables in strings
      obj = this.replaceVariables(obj, data);
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = this.processVariablesInObject(obj[i], data);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          obj[key] = this.processVariablesInObject(obj[key], data);
        }
      }
    }
    
    return obj;
  }

  /**
   * Replace variables in string
   * @param str - String with variables
   * @param data - Template data
   * @returns String with variables replaced
   */
  private replaceVariables(str: string, data: any): string {
    return str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      return this.getNestedValue(data, path.trim()) || match;
    });
  }

  /**
   * Get nested value from object using dot notation
   * @param obj - Object to get value from
   * @param path - Dot notation path
   * @returns Value or original placeholder if not found
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Generate response ID
   * @param errorId - Error ID
   * @returns Generated response ID
   */
  private generateResponseId(errorId: string): string {
    return `resp_${errorId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate cache key
   * @param templateId - Template ID
   * @param errorId - Error ID
   * @returns Cache key
   */
  private generateCacheKey(templateId: string, errorId: string): string {
    return `${templateId}_${errorId}`;
  }

  /**
   * Register default templates
   */
  private async registerDefaultTemplates(): Promise<void> {
    // Default template - using EnhancedResponseTemplate type
    const defaultTemplate: EnhancedResponseTemplate = {
      templateId: 'default',
      name: 'DefaultResponseTemplate',
      templateType: 'response',
      content: 'Default error response template',
      variables: {},
      enabled: true,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      category: 'default',
      conditions: [],
      result: {
        status: 'success',
        message: 'Error processed successfully',
        details: 'The error has been handled by the system',
        code: 'DEFAULT_RESPONSE'
      },
      data: {
        response: {
          message: 'The error has been logged and will be processed',
          code: 'DEFAULT_ERROR_RESPONSE'
        },
        metadata: {
          templateUsed: 'default',
          processedAt: '{{timestamp}}'
        }
      },
      cacheable: true,
      cacheTimeout: 300000,
      actions: [
        {
          actionId: 'log_error',
          type: 'log',
          target: 'system_logger',
          payload: {
            level: 'error',
            message: '{{error.message}}',
            module: '{{source.moduleName}}'
          },
          priority: 'medium',
          status: 'pending',
          timestamp: '{{timestamp}}'
        }
      ],
      annotations: []
    };
    this.registerTemplate(defaultTemplate);

    // UnderConstruction template - using EnhancedResponseTemplate type
    const underConstructionTemplate: EnhancedResponseTemplate = {
      templateId: 'under_construction',
      name: 'UnderConstructionTemplate',
      templateType: 'response',
      content: 'Template for under construction modules',
      variables: {},
      enabled: true,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      category: 'development',
      conditions: [
        { field: 'isUnderConstruction' as any, value: true, operator: 'equals' as any }
      ],
      result: {
        status: 'fallback',
        message: 'Module is under construction',
        details: 'This module is currently being developed. Functionality may be limited.',
        code: 'UNDER_CONSTRUCTION'
      },
      data: {
        response: {
          message: 'The requested functionality is under construction',
          code: 'MODULE_UNDER_CONSTRUCTION',
          estimatedCompletion: 'TBD'
        },
        metadata: {
          templateUsed: 'under_construction',
          isUnderConstruction: true,
          developerNote: 'This module is still in development phase'
        }
      },
      cacheable: true,
      cacheTimeout: 0,
      actions: [
        {
          actionId: 'log_under_construction',
          type: 'log',
          target: 'development_logger',
          payload: {
            level: 'warn',
            message: 'Under construction module accessed',
            module: '{{source.moduleName}}',
            method: '{{data.methodName}}'
          },
          priority: 'low',
          status: 'pending',
          timestamp: '{{timestamp}}'
        }
      ],
      annotations: []
    };
    this.registerTemplate(underConstructionTemplate);

    // Critical error template - using EnhancedResponseTemplate type
    const criticalTemplate: EnhancedResponseTemplate = {
      templateId: 'critical',
      name: 'CriticalErrorTemplate',
      templateType: 'response',
      content: 'Template for critical errors',
      variables: {},
      enabled: true,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      category: 'error',
      conditions: [
        { field: 'severity' as any, value: 'critical', operator: 'equals' as any }
      ],
      result: {
        status: 'failure',
        message: 'Critical error occurred',
        details: 'A critical error has been detected and requires immediate attention',
        code: 'CRITICAL_ERROR'
      },
      data: {
        response: {
          message: 'A critical error has occurred. The system may be unstable.',
          code: 'CRITICAL_SYSTEM_ERROR'
        },
        metadata: {
          templateUsed: 'critical',
          severity: 'critical',
          requiresImmediateAttention: true
        }
      },
      cacheable: false,
      cacheTimeout: 0,
      actions: [
        {
          actionId: 'alert_critical_error',
          type: 'notify',
          target: 'critical_alert',
          payload: {
            level: 'critical',
            message: '{{error.message}}',
            module: '{{source.moduleName}}'
          },
          priority: 'critical',
          status: 'pending',
          timestamp: '{{timestamp}}'
        },
        {
          actionId: 'isolate_module',
          type: 'isolate',
          target: '{{source.moduleId}}',
          payload: {
            timeout: 60000,
            reason: 'Critical error detected'
          },
          priority: 'high',
          status: 'pending',
          timestamp: '{{timestamp}}'
        }
      ],
      annotations: []
    };
    this.registerTemplate(criticalTemplate);
  }

  /**
   * Validate template
   * @param template - Template to validate
   * @throws Error if validation fails
   */
  private validateTemplate(template: ResponseTemplate): void {
    const enhancedTemplate = template as EnhancedResponseTemplate;
    if (!template.templateId || template.templateId.trim() === '') {
      throw new Error('Template ID is required');
    }
    
    if (!template.name || template.name.trim() === '') {
      throw new Error('Template name is required');
    }
    
    if (!enhancedTemplate.result || !enhancedTemplate.result.status) {
      throw new Error('Template result with status is required');
    }
    
    if (!enhancedTemplate.data || !enhancedTemplate.data.response) {
      throw new Error('Template data with response is required');
    }
  }

  /**
   * Ensure response template manager is initialized
   * @throws Error if not initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Response Template Manager is not initialized. Call initialize() first.');
    }
  }

  // TemplateManager interface implementation
  
  /**
   * Get template by ID (TemplateManager interface)
   * @param templateId - Template ID
   * @returns Template | null - Template or null if not found
   */
  public getTemplate(templateId: string): Template | null {
    this.ensureInitialized();
    
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        return null;
      }
      
      return {
        templateId: template.templateId,
        name: template.name,
        templateType: template.templateType,
        content: template.content,
        variables: template.variables,
        enabled: template.enabled,
        version: template.version
      };
    } catch (error) {
      const errorObj = error as Error;
      console.error('Error getting template:', errorObj);
      return null;
    }
  }

  /**
   * Register template (TemplateManager interface)
   * @param template - Template to register
   */
  public registerTemplateForInterface(template: Template): void {
    const responseTemplate: ResponseTemplate = {
      ...template,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    // Call the existing registerTemplate method
    this.registerTemplate(responseTemplate);
  }

  /**
   * Unregister template (TemplateManager interface - already implemented)
   * @param templateId - Template ID to unregister
   */
  public unregisterTemplateForInterface(templateId: string): void {
    // Call the existing unregisterTemplate method
    this.unregisterTemplate(templateId);
  }

  /**
   * Render template (TemplateManager interface)
   * @param templateId - Template ID
   * @param variables - Template variables
   * @returns Rendered template string
   */
  public renderTemplate(templateId: string, variables: Record<string, any>): string {
    this.ensureInitialized();
    
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }
      
      // Simple template rendering - replace variables
      let rendered = template.content;
      for (const [key, value] of Object.entries(variables)) {
        rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
      }
      
      return rendered;
    } catch (error) {
      const errorObj = error as Error;
      console.error('Error rendering template:', errorObj);
      throw errorObj;
    }
  }
}

/**
 * Template condition interface
 */
interface TemplateCondition {
  field: 'moduleId' | 'errorType' | 'severity' | 'source' | 'impact' | 'isUnderConstruction';
  value: string | boolean;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains';
}