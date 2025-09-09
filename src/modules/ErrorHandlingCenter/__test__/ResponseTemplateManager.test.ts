import { ResponseTemplateManager } from '../src/components/ResponseTemplateManager';
import { 
  ErrorContext, 
  ErrorResponse, 
  ModuleResponse,
  Template,
  TemplateManager,
  ResponseTemplate,
  EnhancedResponseTemplate,
  DynamicTemplateLoader,
  ErrorSource,
  ErrorType,
  ErrorSeverity,
  ErrorImpact,
  ErrorRecoverability
} from '../types/ErrorHandlingCenter.types';

describe('ResponseTemplateManager', () => {
  let responseTemplateManager: ResponseTemplateManager;
  let mockErrorContext: ErrorContext;
  let mockCriticalErrorContext: ErrorContext;
  let mockUnderConstructionErrorContext: ErrorContext;

  beforeEach(() => {
    responseTemplateManager = new ResponseTemplateManager();

    mockErrorContext = {
      errorId: 'test-error-1',
      error: new Error('Test error message'),
      source: {
        moduleId: 'test-module',
        moduleName: 'TestModule',
        version: '1.0.0',
        fileName: 'test-module.ts',
        lineNumber: 42
      },
      classification: {
        source: 'module' as ErrorSource,
        type: 'technical' as ErrorType,
        severity: 'medium' as ErrorSeverity,
        impact: 'single_module' as ErrorImpact,
        recoverability: 'recoverable' as ErrorRecoverability
      },
      timestamp: new Date(),
      config: {},
      data: {}
    };

    mockCriticalErrorContext = {
      ...mockErrorContext,
      errorId: 'critical-error-1',
      error: new Error('Critical system failure'),
      classification: {
        ...mockErrorContext.classification,
        severity: 'critical' as ErrorSeverity
      }
    };

    mockUnderConstructionErrorContext = {
      ...mockErrorContext,
      errorId: 'under-construction-error-1',
      data: {
        isUnderConstruction: true
      }
    };
  });

  afterEach(async () => {
    if (responseTemplateManager) {
      await responseTemplateManager.shutdown();
    }
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await responseTemplateManager.initialize();
      const status = responseTemplateManager.getStatus();
      expect(status.isInitialized).toBe(true);
    });

    test('should register default templates on initialization', async () => {
      await responseTemplateManager.initialize();
      const templates = responseTemplateManager.getAllTemplates();
      
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.name.includes('Default'))).toBe(true);
      expect(templates.some(t => t.name.includes('UnderConstruction'))).toBe(true);
      expect(templates.some(t => t.name.includes('Critical'))).toBe(true);
    });

    test('should not initialize twice', async () => {
      await responseTemplateManager.initialize();
      await responseTemplateManager.initialize();
      
      const status = responseTemplateManager.getStatus();
      expect(status.isInitialized).toBe(true);
    });

    test('should handle initialization errors', async () => {
      // Mock registerDefaultTemplates to throw error
      jest.spyOn(responseTemplateManager as any, 'registerDefaultTemplates').mockImplementation(() => {
        throw new Error('Template registration failed');
      });

      await expect(responseTemplateManager.initialize())
        .rejects.toThrow('Template registration failed');
    });
  });

  describe('Template Retrieval', () => {
    beforeEach(async () => {
      await responseTemplateManager.initialize();
    });

    test('should get template for error context', async () => {
      const template = await responseTemplateManager.getTemplateForError(mockErrorContext);
      
      expect(template).toBeDefined();
      expect(template.templateId).toBeDefined();
      expect(template.name).toBeDefined();
    });

    test('should get specific template for critical errors', async () => {
      const template = await responseTemplateManager.getTemplateForError(mockCriticalErrorContext);
      
      expect(template).toBeDefined();
      // Should match critical severity template
      expect(template.category).toBe('error');
    });

    test('should get specific template for under construction modules', async () => {
      const template = await responseTemplateManager.getTemplateForError(mockUnderConstructionErrorContext);
      
      expect(template).toBeDefined();
      expect(template.category).toBe('development');
    });

    test('should get default template when no specific template matches', async () => {
      const unmatchedErrorContext = {
        ...mockErrorContext,
        classification: {
          ...mockErrorContext.classification,
          severity: 'low' as ErrorSeverity // Should fall back to default
        }
      };

      const template = await responseTemplateManager.getTemplateForError(unmatchedErrorContext);
      
      expect(template).toBeDefined();
      expect(template.category).toBe('default');
    });

    test('should handle template retrieval errors gracefully', async () => {
      console.error = jest.fn(); // Suppress error output
      
      const template = await responseTemplateManager.getTemplateForError(mockErrorContext);
      
      expect(template).toBeDefined(); // Should return default template
      
      console.error = jest.requireActual('console').error;
    });

    test('should throw error when not initialized', async () => {
      const uninitializedManager = new ResponseTemplateManager();
      
      await expect(uninitializedManager.getTemplateForError(mockErrorContext))
        .rejects.toThrow('Response Template Manager is not initialized');
    });
  });

  describe('Template Registration', () => {
    beforeEach(async () => {
      await responseTemplateManager.initialize();
    });

    test('should register template successfully', () => {
      const template: EnhancedResponseTemplate = {
        templateId: 'custom-template',
        name: 'Custom Template',
        templateType: 'response',
        content: 'Custom template content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'custom',
        conditions: [],
        result: {
          status: 'success',
          message: 'Custom response',
          details: '',
          code: 'CUSTOM_RESPONSE'
        },
        data: {
          response: { message: 'Custom template response' },
          metadata: { custom: true }
        },
        cacheable: true
      };

      expect(() => responseTemplateManager.registerTemplate(template)).not.toThrow();
      
      const retrievedTemplate = responseTemplateManager.getTemplateById('custom-template');
      expect(retrievedTemplate?.templateId).toBe('custom-template');
    });

    test('should validate template registration', () => {
      // Test with empty template ID
      expect(() => {
        responseTemplateManager.registerTemplate({
          templateId: '',
          name: 'Test Template',
          templateType: 'response',
          content: 'Content',
          variables: {},
          enabled: true,
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date()
        } as any);
      }).toThrow('Template ID is required');

      // Test with empty template name
      expect(() => {
        responseTemplateManager.registerTemplate({
          templateId: 'test-template',
          name: '',
          templateType: 'response',
          content: 'Content',
          variables: {},
          enabled: true,
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date()
        } as any);
      }).toThrow('Template name is required');

      // Test with missing result
      expect(() => {
        responseTemplateManager.registerTemplate({
          templateId: 'test-template',
          name: 'Test Template',
          templateType: 'response',
          content: 'Content',
          variables: {},
          enabled: true,
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          data: {
            response: {},
            metadata: {}
          }
        } as any);
      }).toThrow('Template result with status is required');
    });

    test('should handle registration errors', () => {
      console.error = jest.fn();
      
      // Mock Map.set to throw an error
      jest.spyOn(Map.prototype, 'set').mockImplementationOnce(() => {
        throw new Error('Registration failed');
      });

      const template: EnhancedResponseTemplate = {
        templateId: 'error-template',
        name: 'Error Template',
        templateType: 'response',
        content: 'Error template content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'error',
        result: {
          status: 'success',
          message: 'Error response',
          details: '',
          code: 'ERROR_RESPONSE'
        },
        data: {
          response: { message: 'Error template response' },
          metadata: {}
        }
      };

      expect(() => responseTemplateManager.registerTemplate(template))
        .toThrow('Registration failed');
      
      console.error = jest.requireActual('console').error;
    });
  });

  describe('Template Unregistration', () => {
    beforeEach(async () => {
      await responseTemplateManager.initialize();
    });

    test('should unregister template successfully', () => {
      const template: EnhancedResponseTemplate = {
        templateId: 'test-template',
        name: 'Test Template',
        templateType: 'response',
        content: 'Test content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'test',
        result: {
          status: 'success',
          message: 'Test response',
          details: '',
          code: 'TEST_RESPONSE'
        },
        data: {
          response: { message: 'Test template response' },
          metadata: {}
        }
      };

      responseTemplateManager.registerTemplate(template);
      expect(responseTemplateManager.getTemplateById('test-template')).toBeDefined();
      
      responseTemplateManager.unregisterTemplate('test-template');
      expect(responseTemplateManager.getTemplateById('test-template')).toBeNull();
    });

    test('should remove template from module assignments', () => {
      const template: EnhancedResponseTemplate = {
        templateId: 'module-template',
        name: 'Module Template',
        templateType: 'response',
        content: 'Module template content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'module',
        result: {
          status: 'success',
          message: 'Module response',
          details: '',
          code: 'MODULE_RESPONSE'
        },
        data: {
          response: { message: 'Module template response' },
          metadata: {}
        }
      };

      responseTemplateManager.registerTemplate(template);
      responseTemplateManager.assignTemplateToModule('test-module', 'module-template');
      
      expect(responseTemplateManager.getModuleTemplateAssignments().get('test-module')).toBe('module-template');
      
      responseTemplateManager.unregisterTemplate('module-template');
      expect(responseTemplateManager.getModuleTemplateAssignments().get('test-module')).toBeUndefined();
    });

    test('should handle unregistering non-existent template', () => {
      console.warn = jest.fn();
      
      expect(() => {
        responseTemplateManager.unregisterTemplate('non-existent-template');
      }).not.toThrow();
      
      expect(console.warn).toHaveBeenCalledWith(
        'Template non-existent-template not found for unregistration'
      );
      
      console.warn = jest.requireActual('console').warn;
    });
  });

  describe('Module Template Assignment', () => {
    beforeEach(async () => {
      await responseTemplateManager.initialize();
    });

    test('should assign template to module successfully', () => {
      const template: EnhancedResponseTemplate = {
        templateId: 'module-specific-template',
        name: 'Module Specific Template',
        templateType: 'response',
        content: 'Module specific content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'module',
        result: {
          status: 'success',
          message: 'Module specific response',
          details: '',
          code: 'MODULE_SPECIFIC_RESPONSE'
        },
        data: {
          response: { message: 'Module specific template response' },
          metadata: {}
        }
      };

      responseTemplateManager.registerTemplate(template);
      responseTemplateManager.assignTemplateToModule('test-module', 'module-specific-template');
      
      const assignments = responseTemplateManager.getModuleTemplateAssignments();
      expect(assignments.get('test-module')).toBe('module-specific-template');
    });

    test('should throw error when assigning non-existent template', () => {
      expect(() => {
        responseTemplateManager.assignTemplateToModule('test-module', 'non-existent-template');
      }).toThrow('Template non-existent-template not found');
    });

    test('should remove template from module', () => {
      const template: EnhancedResponseTemplate = {
        templateId: 'removable-template',
        name: 'Removable Template',
        templateType: 'response',
        content: 'Removable content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'removable',
        result: {
          status: 'success',
          message: 'Removable response',
          details: '',
          code: 'REMOVABLE_RESPONSE'
        },
        data: {
          response: { message: 'Removable template response' },
          metadata: {}
        }
      };

      responseTemplateManager.registerTemplate(template);
      responseTemplateManager.assignTemplateToModule('test-module', 'removable-template');
      
      expect(responseTemplateManager.getModuleTemplateAssignments().get('test-module')).toBe('removable-template');
      
      responseTemplateManager.removeTemplateFromModule('test-module');
      expect(responseTemplateManager.getModuleTemplateAssignments().get('test-module')).toBeUndefined();
    });

    test('should handle removing non-existent module assignment', () => {
      console.info = jest.fn(); // Suppress info output
      
      responseTemplateManager.removeTemplateFromModule('non-existent-module');
      
      // Should not throw
      expect(true).toBe(true);
      
      console.info = jest.requireActual('console').info;
    });

    test('should use module-specific template for module errors', async () => {
      const moduleSpecificTemplate: EnhancedResponseTemplate = {
        templateId: 'module-specific',
        name: 'Module Specific',
        templateType: 'response',
        content: 'Module specific content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'module',
        conditions: [
          { field: 'moduleId' as any, value: 'test-module', operator: 'equals' as any }
        ],
        result: {
          status: 'success',
          message: 'Module specific response',
          details: '',
          code: 'MODULE_SPECIFIC'
        },
        data: {
          response: { message: 'Module specific template response' },
          metadata: { moduleSpecific: true }
        }
      };

      responseTemplateManager.registerTemplate(moduleSpecificTemplate);
      responseTemplateManager.assignTemplateToModule('test-module', 'module-specific');
      
      const template = await responseTemplateManager.getTemplateForError(mockErrorContext);
      
      expect(template.templateId).toBe('module-specific');
    });
  });

  describe('Response Generation', () => {
    beforeEach(async () => {
      await responseTemplateManager.initialize();
    });

    test('should generate response from template successfully', async () => {
      const template: EnhancedResponseTemplate = {
        templateId: 'generation-template',
        name: 'Generation Template',
        templateType: 'response',
        content: 'Template content with {{error.message}}',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'generation',
        result: {
          status: 'success',
          message: 'Template response: {{error.message}}',
          details: 'Details: {{source.moduleName}}',
          code: 'TEMPLATE_GENERATED_RESPONSE'
        },
        data: {
          response: { message: 'Generated response for {{source.moduleId}}' },
          metadata: { generatedAt: '{{timestamp}}' }
        },
        cacheable: true
      };

      const response = await responseTemplateManager.generateResponse(template, mockErrorContext);
      
      expect(response).toBeDefined();
      expect(response.result.message).toContain(mockErrorContext.error.message);
      expect(response.data.response.message).toContain(mockErrorContext.source.moduleId);
    });

    test('should cache cacheable template responses', async () => {
      const cacheableTemplate: EnhancedResponseTemplate = {
        templateId: 'cacheable-template',
        name: 'Cacheable Template',
        templateType: 'response',
        content: 'Cacheable content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'cacheable',
        result: {
          status: 'success',
          message: 'Cacheable response',
          details: '',
          code: 'CACHEABLE_RESPONSE'
        },
        data: {
          response: { message: 'Cacheable template response' },
          metadata: {}
        },
        cacheable: true,
        cacheTimeout: 5000
      };

      const firstResponse = await responseTemplateManager.generateResponse(cacheableTemplate, mockErrorContext);
      const secondResponse = await responseTemplateManager.generateResponse(cacheableTemplate, mockErrorContext);
      
      expect(firstResponse).toBeDefined();
      expect(secondResponse).toBeDefined();
      // Same error should return cached response
      expect(firstResponse.responseId).toBe(secondResponse.responseId);
    });

    test('should not cache non-cacheable template responses', async () => {
      const nonCacheableTemplate: EnhancedResponseTemplate = {
        templateId: 'non-cacheable-template',
        name: 'Non-Cacheable Template',
        templateType: 'response',
        content: 'Non-cacheable content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'non-cacheable',
        result: {
          status: 'success',
          message: 'Non-cacheable response',
          details: '',
          code: 'NON_CACHEABLE_RESPONSE'
        },
        data: {
          response: { message: 'Non-cacheable template response' },
          metadata: {}
        },
        cacheable: false
      };

      const firstResponse = await responseTemplateManager.generateResponse(nonCacheableTemplate, mockErrorContext);
      const secondResponse = await responseTemplateManager.generateResponse(nonCacheableTemplate, mockErrorContext);
      
      expect(firstResponse).toBeDefined();
      expect(secondResponse).toBeDefined();
      // Different responses for same error when not cacheable
      expect(firstResponse.responseId).not.toBe(secondResponse.responseId);
    });

    test('should handle template variable processing errors gracefully', async () => {
      console.warn = jest.fn();
      
      const templateWithInvalidVariables: EnhancedResponseTemplate = {
        templateId: 'invalid-vars-template',
        name: 'Invalid Variables Template',
        templateType: 'response',
        content: 'Template with {{invalid.variable}}',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'invalid',
        result: {
          status: 'success',
          message: 'Response with {{invalid.variable}}',
          details: '',
          code: 'INVALID_VARS_RESPONSE'
        },
        data: {
          response: { message: 'Template with invalid variables' },
          metadata: {}
        }
      };

      const response = await responseTemplateManager.generateResponse(templateWithInvalidVariables, mockErrorContext);
      
      expect(response).toBeDefined();
      expect(response.result.message).toContain('{{invalid.variable}}'); // Should leave placeholder
      
      console.warn = jest.requireActual('console').warn;
    });

    test('should handle dynamic content execution', async () => {
      const templateWithDynamicContent: EnhancedResponseTemplate = {
        templateId: 'dynamic-content-template',
        name: 'Dynamic Content Template',
        templateType: 'response',
        content: 'Dynamic content template',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'dynamic',
        result: {
          status: 'success',
          message: 'Dynamic response',
          details: '',
          code: 'DYNAMIC_RESPONSE'
        },
        data: {
          response: { message: 'Dynamic template response' },
          metadata: {}
        },
        dynamicContent: {
          dynamicField: async (data: any) => `Dynamic value: ${data.error.message}`
        }
      };

      const response = await responseTemplateManager.generateResponse(templateWithDynamicContent, mockErrorContext);
      
      expect(response).toBeDefined();
      expect((response as any).dynamicField).toContain('Dynamic value:');
      expect((response as any).dynamicField).toContain(mockErrorContext.error.message);
    });

    test('should handle dynamic content execution errors gracefully', async () => {
      console.warn = jest.fn();
      
      const templateWithFailingDynamicContent: EnhancedResponseTemplate = {
        templateId: 'failing-dynamic-template',
        name: 'Failing Dynamic Template',
        templateType: 'response',
        content: 'Failing dynamic content template',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'failing-dynamic',
        result: {
          status: 'success',
          message: 'Failing dynamic response',
          details: '',
          code: 'FAILING_DYNAMIC_RESPONSE'
        },
        data: {
          response: { message: 'Template with failing dynamic content' },
          metadata: {}
        },
        dynamicContent: {
          failingField: async (data: any) => {
            throw new Error('Dynamic content failed');
          }
        }
      };

      const response = await responseTemplateManager.generateResponse(templateWithFailingDynamicContent, mockErrorContext);
      
      expect(response).toBeDefined();
      // Should not throw, should keep original value if any
      
      console.warn = jest.requireActual('console').warn;
    });
  });

  describe('Template Management', () => {
    beforeEach(async () => {
      await responseTemplateManager.initialize();
    });

    test('should get template by ID', () => {
      const template = responseTemplateManager.getTemplateById('default');
      
      expect(template).toBeDefined();
      expect(template?.templateId).toBe('default');
    });

    test('should return null for non-existent template', () => {
      const template = responseTemplateManager.getTemplateById('non-existent');
      
      expect(template).toBeNull();
    });

    test('should get all templates', () => {
      const templates = responseTemplateManager.getAllTemplates();
      
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.templateId)).toBe(true);
    });

    test('should get templates by category', () => {
      const defaultTemplates = responseTemplateManager.getTemplatesByCategory('default');
      expect(defaultTemplates.length).toBeGreaterThan(0);
      expect(defaultTemplates.every(t => (t as EnhancedResponseTemplate).category === 'default')).toBe(true);

      const criticalTemplates = responseTemplateManager.getTemplatesByCategory('error');
      expect(criticalTemplates.length).toBeGreaterThan(0);
      expect(criticalTemplates.every(t => (t as EnhancedResponseTemplate).category === 'error')).toBe(true);

      const nonExistentCategory = responseTemplateManager.getTemplatesByCategory('non-existent');
      expect(nonExistentCategory).toEqual([]);
    });

    test('should get module template assignments', () => {
      // Initially empty
      const assignments = responseTemplateManager.getModuleTemplateAssignments();
      
      expect(assignments.size).toBeGreaterThanOrEqual(0);
    });

    test('should load dynamic templates', async () => {
      // This test requires a working dynamic loader
      // For now, we'll just test the method doesn't throw
      await expect(responseTemplateManager.loadDynamicTemplates()).resolves.not.toThrow();
    });

    test('should refresh template cache', () => {
      const cacheableTemplate: EnhancedResponseTemplate = {
        templateId: 'cache-refresh-template',
        name: 'Cache Refresh Template',
        templateType: 'response',
        content: 'Cache refresh content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'cache-refresh',
        result: {
          status: 'success',
          message: 'Cache refresh response',
          details: '',
          code: 'CACHE_REFRESH_RESPONSE'
        },
        data: {
          response: { message: 'Cache refresh template response' },
          metadata: {}
        },
        cacheable: true
      };

      responseTemplateManager.registerTemplate(cacheableTemplate);
      responseTemplateManager.generateResponse(cacheableTemplate, mockErrorContext);
      
      // Generate to cache
      const statusBefore = responseTemplateManager.getStatus();
      expect(statusBefore.cacheSize).toBeGreaterThan(0);
      
      responseTemplateManager.refreshTemplateCache();
      
      const statusAfter = responseTemplateManager.getStatus();
      expect(statusAfter.cacheSize).toBe(0);
    });
  });

  describe('Template Compatibility', () => {
    beforeEach(async () => {
      await responseTemplateManager.initialize();
    });

    test('should implement TemplateManager interface', () => {
      const template: Template = {
        templateId: 'interface-template',
        name: 'Interface Template',
        templateType: 'response',
        content: 'Interface template content',
        variables: {},
        enabled: true,
        version: '1.0.0'
      };

      // Test interface methods
      expect(() => responseTemplateManager.registerTemplateForInterface(template)).not.toThrow();
      expect(() => responseTemplateManager.getTemplate('interface-template')).not.toThrow();
      expect(() => responseTemplateManager.unregisterTemplateForInterface('interface-template')).not.toThrow();
    });

    test('should render template with variables', () => {
      const variables = {
        message: 'Test message',
        module: 'TestModule'
      };

      const rendered = responseTemplateManager.renderTemplate('default', variables);
      
      expect(rendered).toBeDefined();
      expect(typeof rendered).toBe('string');
    });

    test('should handle undefined template rendering', () => {
      const variables = {
        message: 'Test message'
      };

      expect(() => {
        responseTemplateManager.renderTemplate('non-existent-template', variables);
      }).toThrow('Template not found: non-existent-template');
    });
  });

  describe('Template Condition Matching', () => {
    beforeEach(async () => {
      await responseTemplateManager.initialize();
    });

    test('should match template conditions correctly', () => {
      const templateWithConditions: EnhancedResponseTemplate = {
        templateId: 'conditional-template',
        name: 'Conditional Template',
        templateType: 'response',
        content: 'Conditional content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'conditional',
        conditions: [
          { field: 'moduleId' as any, value: 'test-module', operator: 'equals' as any }
        ],
        result: {
          status: 'success',
          message: 'Conditional response',
          details: '',
          code: 'CONDITIONAL_RESPONSE'
        },
        data: {
          response: { message: 'Conditional template response' },
          metadata: {}
        }
      };

      const isApplicable = responseTemplateManager['isTemplateApplicable'](templateWithConditions, mockErrorContext);
      expect(isApplicable).toBe(true);
    });

    test('should not match template with failing conditions', () => {
      const templateWithConditions: EnhancedResponseTemplate = {
        templateId: 'non-matching-template',
        name: 'Non Matching Template',
        templateType: 'response',
        content: 'Non matching content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'non-matching',
        conditions: [
          { field: 'moduleId' as any, value: 'different-module', operator: 'equals' as any }
        ],
        result: {
          status: 'success',
          message: 'Non matching response',
          details: '',
          code: 'NON_MATCHING_RESPONSE'
        },
        data: {
          response: { message: 'Non matching template response' },
          metadata: {}
        }
      };

      const isApplicable = responseTemplateManager['isTemplateApplicable'](templateWithConditions, mockErrorContext);
      expect(isApplicable).toBe(false);
    });

    test('should match template with no conditions', () => {
      const templateWithoutConditions: EnhancedResponseTemplate = {
        templateId: 'no-conditions-template',
        name: 'No Conditions Template',
        templateType: 'response',
        content: 'No conditions content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'no-conditions',
        conditions: [], // No conditions - should match all
        result: {
          status: 'success',
          message: 'No conditions response',
          details: '',
          code: 'NO_CONDITIONS_RESPONSE'
        },
        data: {
          response: { message: 'No conditions template response' },
          metadata: {}
        }
      };

      const isApplicable = responseTemplateManager['isTemplateApplicable'](templateWithoutConditions, mockErrorContext);
      expect(isApplicable).toBe(true);
    });

    test('should match multiple template conditions', () => {
      const templateWithMultipleConditions: EnhancedResponseTemplate = {
        templateId: 'multiple-conditions-template',
        name: 'Multiple Conditions Template',
        templateType: 'response',
        content: 'Multiple conditions content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'multiple-conditions',
        conditions: [
          { field: 'moduleId' as any, value: 'test-module', operator: 'equals' as any },
          { field: 'errorType' as any, value: 'technical', operator: 'equals' as any },
          { field: 'severity' as any, value: 'medium', operator: 'equals' as any }
        ],
        result: {
          status: 'success',
          message: 'Multiple conditions response',
          details: '',
          code: 'MULTIPLE_CONDITIONS_RESPONSE'
        },
        data: {
          response: { message: 'Multiple conditions template response' },
          metadata: {}
        }
      };

      const isApplicable = responseTemplateManager['isTemplateApplicable'](templateWithMultipleConditions, mockErrorContext);
      expect(isApplicable).toBe(true);
    });

    test('should not match template with any failing condition', () => {
      const templateWithFailingCondition: EnhancedResponseTemplate = {
        templateId: 'failing-condition-template',
        name: 'Failing Condition Template',
        templateType: 'response',
        content: 'Failing condition content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'failing-condition',
        conditions: [
          { field: 'moduleId' as any, value: 'test-module', operator: 'equals' as any },
          { field: 'severity' as any, value: 'high', operator: 'equals' as any } // This will fail
        ],
        result: {
          status: 'success',
          message: 'Failing condition response',
          details: '',
          code: 'FAILING_CONDITION_RESPONSE'
        },
        data: {
          response: { message: 'Failing condition template response' },
          metadata: {}
        }
      };

      const isApplicable = responseTemplateManager['isTemplateApplicable'](templateWithFailingCondition, mockErrorContext);
      expect(isApplicable).toBe(false);
    });
  });

  describe('Status and Configuration', () => {
    beforeEach(async () => {
      await responseTemplateManager.initialize();
    });

    test('should return correct status', () => {
      const status = responseTemplateManager.getStatus();
      
      expect(status.isInitialized).toBe(true);
      expect(status.enableMetrics).toBe(true);
      expect(status.templatesCount).toBeGreaterThan(0);
      expect(status.moduleAssignmentsCount).toBeGreaterThanOrEqual(0);
      expect(status.dynamicLoaderAvailable).toBe(false);
      expect(status.cacheSize).toBeGreaterThanOrEqual(0);
    });

    test('should enable and disable metrics', () => {
      responseTemplateManager.setMetricsEnabled(false);
      
      let status = responseTemplateManager.getStatus();
      expect(status.enableMetrics).toBe(false);
      
      responseTemplateManager.setMetricsEnabled(true);
      status = responseTemplateManager.getStatus();
      expect(status.enableMetrics).toBe(true);
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      await responseTemplateManager.initialize();
    });

    test('should evict cache entries on timeout', async () => {
      jest.useFakeTimers();

      const shortTimeoutTemplate: EnhancedResponseTemplate = {
        templateId: 'short-timeout-template',
        name: 'Short Timeout Template',
        templateType: 'response',
        content: 'Short timeout content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'timeout-test',
        result: {
          status: 'success',
          message: 'Short timeout response',
          details: '',
          code: 'SHORT_TIMEOUT_RESPONSE'
        },
        data: {
          response: { message: 'Short timeout template response' },
          metadata: {}
        },
        cacheable: true,
        cacheTimeout: 1000 // 1 second timeout
      };

      responseTemplateManager.registerTemplate(shortTimeoutTemplate);
      
      // Generate to cache
      await responseTemplateManager.generateResponse(shortTimeoutTemplate, mockErrorContext);
      expect(responseTemplateManager.getStatus().cacheSize).toBe(1);
      
      // Advance time past timeout
      jest.advanceTimersByTime(1100);
      
      // Cache should be evicted
      expect(responseTemplateManager.getStatus().cacheSize).toBe(0);

      jest.useRealTimers();
    });

    test('should handle cache with many entries', async () => {
      const cacheableTemplate: EnhancedResponseTemplate = {
        templateId: 'bulk-cache-template',
        name: 'Bulk Cache Template',
        templateType: 'response',
        content: 'Bulk cache content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'bulk-cache',
        result: {
          status: 'success',
          message: 'Bulk cache response',
          details: '',
          code: 'BULK_CACHE_RESPONSE'
        },
        data: {
          response: { message: 'Bulk cache template response' },
          metadata: {}
        },
        cacheable: true
      };

      responseTemplateManager.registerTemplate(cacheableTemplate);
      
      // Generate many cached responses
      for (let i = 0; i < 100; i++) {
        const errorContext = { ...mockErrorContext, errorId: `cache-error-${i}` };
        await responseTemplateManager.generateResponse(cacheableTemplate, errorContext);
      }
      
      expect(responseTemplateManager.getStatus().cacheSize).toBe(100);
      
      responseTemplateManager.refreshTemplateCache();
      expect(responseTemplateManager.getStatus().cacheSize).toBe(0);
    });
  });

  describe('Dynamic Template Loading', () => {
    beforeEach(async () => {
      await responseTemplateManager.initialize();
    });

    test('should handle dynamic loader absence gracefully', async () => {
      await expect(responseTemplateManager.loadDynamicTemplates()).resolves.not.toThrow();
    });

    test('should work with mock dynamic loader', async () => {
      // Create a mock dynamic loader
      const mockDynamicLoader: DynamicTemplateLoader = {
        loadTemplate: jest.fn().mockResolvedValue({
          templateId: 'dynamic-template',
          name: 'Dynamic Template',
          templateType: 'response',
          content: 'Dynamic content',
          variables: {},
          enabled: true,
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date()
        } as ResponseTemplate),
        loadTemplates: jest.fn().mockResolvedValue([{
          templateId: 'dynamic-template-2',
          name: 'Dynamic Template 2',
          templateType: 'response',
          content: 'Dynamic content 2',
          variables: {},
          enabled: true,
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date()
        } as ResponseTemplate]),
        cacheTemplate: jest.fn(),
        clearCache: jest.fn()
      };

      // Inject the mock loader (this is a bit hacky but necessary for testing)
      (responseTemplateManager as any).dynamicLoader = mockDynamicLoader;

      await responseTemplateManager.loadDynamicTemplates();
      
      expect(mockDynamicLoader.loadTemplates).toHaveBeenCalled();
      expect(responseTemplateManager.getTemplateById('dynamic-template-2')).toBeDefined();
    });
  });

  describe('Shutdown', () => {
    test('should shutdown successfully', async () => {
      await responseTemplateManager.initialize();
      
      expect(responseTemplateManager.getAllTemplates().length).toBeGreaterThan(0);
      
      await responseTemplateManager.shutdown();
      
      const status = responseTemplateManager.getStatus();
      expect(status.isInitialized).toBe(false);
      expect(status.templatesCount).toBe(0);
      expect(status.moduleAssignmentsCount).toBe(0);
      expect(status.cacheSize).toBe(0);
    });

    test('should shutdown dynamic loader if available', async () => {
      const mockDynamicLoader: DynamicTemplateLoader = {
        loadTemplate: jest.fn(),
        loadTemplates: jest.fn(),
        cacheTemplate: jest.fn(),
        clearCache: jest.fn(),
        shutdown: jest.fn().mockResolvedValue(undefined)
      };

      await responseTemplateManager.initialize();
      (responseTemplateManager as any).dynamicLoader = mockDynamicLoader;
      
      await responseTemplateManager.shutdown();
      
      expect(mockDynamicLoader.shutdown).toHaveBeenCalled();
    });

    test('should handle shutdown errors gracefully', async () => {
      await responseTemplateManager.initialize();
      
      // Mock Map.clear to throw an error
      jest.spyOn(Map.prototype, 'clear').mockImplementation(() => {
        throw new Error('Shutdown failed');
      });

      await expect(responseTemplateManager.shutdown())
        .rejects.toThrow('Shutdown failed');
    });

    test('should shutdown when not initialized', async () => {
      const uninitializedManager = new ResponseTemplateManager();
      
      await expect(uninitializedManager.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await responseTemplateManager.initialize();
    });

    test('should handle template with very long content', async () => {
      const longContent = 'a'.repeat(10000); // 10KB of content
      
      const longTemplate: EnhancedResponseTemplate = {
        templateId: 'long-content-template',
        name: 'Long Content Template',
        templateType: 'response',
        content: longContent,
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'long-content',
        result: {
          status: 'success',
          message: 'Long content response',
          details: '',
          code: 'LONG_CONTENT_RESPONSE'
        },
        data: {
          response: { message: longContent },
          metadata: {}
        }
      };

      expect(() => responseTemplateManager.registerTemplate(longTemplate)).not.toThrow();
      
      const retrievedTemplate = responseTemplateManager.getTemplateById('long-content-template');
      expect(retrievedTemplate?.content).toBe(longContent);
    });

    test('should handle template with deeply nested variables', async () => {
      const nestedTemplate: EnhancedResponseTemplate = {
        templateId: 'nested-vars-template',
        name: 'Nested Variables Template',
        templateType: 'response',
        content: 'Nested variables: {{deeply.nested.variable}}',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'nested-vars',
        result: {
          status: 'success',
          message: 'Response: {{data.config.nested.value}}',
          details: 'Module: {{source.metadata.info.name}}',
          code: 'NESTED_VARS_RESPONSE'
        },
        data: {
          response: { message: '{{data.deep.nested.message}}' },
          metadata: {}
        }
      };

      const errorWithNestedData = {
        ...mockErrorContext,
        data: {
          config: {
            nested: {
              value: 'nested config value'
            }
          },
          deep: {
            nested: {
              message: 'deeply nested message'
            }
          },
          source: {
            metadata: {
              info: {
                name: 'nested module name'
              }
            }
          }
        }
      };

      const response = await responseTemplateManager.generateResponse(nestedTemplate, errorWithNestedData);
      
      expect(response).toBeDefined();
      expect(response.result.message).toContain('nested config value');
      expect(response.result.details).toContain('nested module name');
      expect(response.data.response.message).toContain('deeply nested message');
    });

    test('should handle template with complex dynamic content', async () => {
      const complexTemplate: EnhancedResponseTemplate = {
        templateId: 'complex-dynamic-template',
        name: 'Complex Dynamic Template',
        templateType: 'response',
        content: 'Complex dynamic template',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'complex-dynamic',
        result: {
          status: 'success',
          message: 'Complex dynamic response',
          details: '',
          code: 'COMPLEX_DYNAMIC_RESPONSE'
        },
        data: {
          response: { message: 'Complex dynamic template response' },
          metadata: {}
        },
        dynamicContent: {
          nestedObject: async (data: any) => ({
            level1: {
              level2: {
                value: `Computed: ${data.error.message}`
              }
            }
          }),
          arrayField: async (data: any) => Array(5).fill(null).map((_, i) => `Item ${i}: ${data.source.moduleId}`),
          asyncError: async (data: any) => {
            throw new Error('Async processing failed');
          },
          slowField: async (data: any) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return `Slow value: ${data.error.message}`;
          }
        }
      };

      const response = await responseTemplateManager.generateResponse(complexTemplate, mockErrorContext);
      
      expect(response).toBeDefined();
      expect((response as any).nestedObject.level1.level2.value).toContain('Test error message');
      expect((response as any).arrayField).toHaveLength(5);
      expect((response as any).arrayField[0]).toContain('test-module');
      expect((response as any).slowField).toContain('Test error message');
    });

    test('should handle concurrent template operations', async () => {
      const template: EnhancedResponseTemplate = {
        templateId: 'concurrent-template',
        name: 'Concurrent Template',
        templateType: 'response',
        content: 'Concurrent template content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'concurrent',
        result: {
          status: 'success',
          message: 'Concurrent response',
          details: '',
          code: 'CONCURRENT_RESPONSE'
        },
        data: {
          response: { message: 'Concurrent template response' },
          metadata: {}
        },
        cacheable: false
      };

      responseTemplateManager.registerTemplate(template);

      // Concurrent operations
      const operations = Array(100).fill(null).map((_, i) => 
        responseTemplateManager.getTemplateForError({
          ...mockErrorContext,
          errorId: `concurrent-error-${i}`
        })
      );

      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    test('should handle template with invalid field operators', async () => {
      const templateWithInvalidOperator: EnhancedResponseTemplate = {
        templateId: 'invalid-operator-template',
        name: 'Invalid Operator Template',
        templateType: 'response',
        content: 'Invalid operator content',
        variables: {},
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'invalid-operator',
        conditions: [
          { field: 'moduleId' as any, value: 'test-module', operator: 'invalid_operator' as any }
        ],
        result: {
          status: 'success',
          message: 'Invalid operator response',
          details: '',
          code: 'INVALID_OPERATOR_RESPONSE'
        },
        data: {
          response: { message: 'Invalid operator template response' },
          metadata: {}
        }
      };

      const isApplicable = responseTemplateManager['isTemplateApplicable'](templateWithInvalidOperator, mockErrorContext);
      // Should handle invalid operator gracefully by not matching
      expect(isApplicable).toBe(false);
    });

    test('should handle memory management for many templates', async () => {
      // Register many templates
      for (let i = 0; i < 1000; i++) {
        const template: EnhancedResponseTemplate = {
          templateId: `memory-test-template-${i}`,
          name: `Memory Test Template ${i}`,
          templateType: 'response',
          content: `Memory test content ${i}`,
          variables: {},
          enabled: true,
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          category: 'memory-test',
          result: {
            status: 'success',
            message: `Memory test response ${i}`,
            details: '',
            code: 'MEMORY_TEST_RESPONSE'
          },
          data: {
            response: { message: `Memory test template response ${i}` },
            metadata: {}
          }
        };

        responseTemplateManager.registerTemplate(template);
      }

      expect(responseTemplateManager.getAllTemplates()).toHaveLength(1000 + 3); // 1000 + 3 default templates

      const startTime = Date.now();
      const template = await responseTemplateManager.getTemplateForError(mockErrorContext);
      const endTime = Date.now();

      expect(template).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should be fast even with many templates
    });
  });
});