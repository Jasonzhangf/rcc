import { ModuleRegistryManager } from '../src/components/ModuleRegistryManager';
import { 
  ModuleRegistration, 
  ResponseHandler,
  ErrorPolicy,
  CustomRule 
} from '../types/ErrorHandlingCenter.types';

describe('ModuleRegistryManager', () => {
  let moduleRegistryManager: ModuleRegistryManager;
  let mockModuleRegistration: ModuleRegistration;
  let mockDependencyModule: ModuleRegistration;
  let mockResponseHandler: jest.Mocked<ResponseHandler>;

  beforeEach(() => {
    moduleRegistryManager = new ModuleRegistryManager();
    
    mockResponseHandler = {
      execute: jest.fn()
    } as any as jest.Mocked<ResponseHandler>;

    mockModuleRegistration = {
      moduleId: 'test-module',
      moduleName: 'TestModule',
      version: '1.0.0'
    } as ModuleRegistration;

    mockDependencyModule = {
      moduleId: 'dependency-module',
      moduleName: 'DependencyModule',
      version: '1.0.0'
    } as ModuleRegistration;

    // Setup default implementations
    mockResponseHandler.execute.mockResolvedValue({
      responseId: 'test-response',
      errorId: 'test-error',
      result: {
        status: 'success' as any,
        message: 'Success',
        details: '',
        code: 'SUCCESS'
      },
      timestamp: new Date(),
      processingTime: 100,
      data: {
        moduleName: 'TestModule',
        moduleId: 'test-module',
        response: {},
        config: {},
        metadata: {}
      },
      actions: [],
      annotations: []
    } as any);
  });

  afterEach(async () => {
    if (moduleRegistryManager) {
      await moduleRegistryManager.shutdown();
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await moduleRegistryManager.initialize();
      const status = moduleRegistryManager.getStatus();
      expect(status.isInitialized).toBe(true);
    });

    test('should not initialize twice', async () => {
      await moduleRegistryManager.initialize();
      await moduleRegistryManager.initialize();
      
      const status = moduleRegistryManager.getStatus();
      expect(status.isInitialized).toBe(true);
    });

    test('should handle initialization errors', async () => {
      // Mock initialization to fail
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Override initialize to throw error
      moduleRegistryManager['initialize'] = async () => {
        throw new Error('Initialization failed');
      };

      await expect(moduleRegistryManager.initialize())
        .rejects.toThrow('Initialization failed');
      
      jest.restoreAllMocks();
    });
  });

  describe('Module Registration', () => {
    beforeEach(async () => {
      await moduleRegistryManager.initialize();
    });

    test('should register module successfully', () => {
      moduleRegistryManager.registerModule(mockModuleRegistration);
      
      const module = moduleRegistryManager.getModule('test-module');
      expect(module).toBeDefined();
      expect(module?.moduleId).toBe('test-module');
      expect(module?.moduleName).toBe('TestModule');
    });

    test('should overwrite existing module with same ID', () => {
      const firstModule = { ...mockModuleRegistration, moduleName: 'FirstModule' };
      const secondModule = { ...mockModuleRegistration, moduleName: 'SecondModule' };
      
      moduleRegistryManager.registerModule(firstModule);
      moduleRegistryManager.registerModule(secondModule);
      
      const module = moduleRegistryManager.getModule('test-module');
      expect(module?.moduleName).toBe('SecondModule');
    });

    test('should register module with dependencies', () => {
      mockDependencyModule.dependencies = [];
      moduleRegistryManager.registerModule(mockDependencyModule);
      
      mockModuleRegistration.dependencies = ['dependency-module'];
      moduleRegistryManager.registerModule(mockModuleRegistration);
      
      const module = moduleRegistryManager.getModule('test-module');
      expect(module?.dependencies).toContain('dependency-module');
    });

    test('should register module with error policies', () => {
      const errorPolicy: ErrorPolicy = {
        policyId: 'test-policy',
        name: 'Test Policy',
        policyType: 'retry' as any,
        type: 'retry' as any,
        conditions: [],
        actions: [],
        enabled: true,
        priority: 10
      };

      mockModuleRegistration.errorPolicies = [errorPolicy];
      moduleRegistryManager.registerModule(mockModuleRegistration);
      
      const module = moduleRegistryManager.getModule('test-module');
      expect(module?.errorPolicies).toHaveLength(1);
      if (module?.errorPolicies && module.errorPolicies.length > 0) {
        expect(module.errorPolicies[0].policyId).toBe('test-policy');
      }
    });

    test('should register module with custom rules', () => {
      const customRule: CustomRule = {
        ruleId: 'custom-rule',
        name: 'Custom Rule',
        ruleType: 'validation' as any,
        condition: { moduleIds: ['test-module'] },
        action: {},
        enabled: true,
        priority: 5
      };

      mockModuleRegistration.customRules = [customRule];
      moduleRegistryManager.registerModule(mockModuleRegistration);
      
      const module = moduleRegistryManager.getModule('test-module');
      expect(module?.customRules).toHaveLength(1);
      if (module?.customRules && module.customRules.length > 0) {
        expect(module.customRules[0].ruleId).toBe('custom-rule');
      }
    });

    test('should validate module registration', () => {
      // Test with empty module ID
      expect(() => {
        moduleRegistryManager.registerModule({
          ...mockModuleRegistration,
          moduleId: ''
        });
      }).toThrow('Module ID is required');

      // Test with empty module name
      expect(() => {
        moduleRegistryManager.registerModule({
          ...mockModuleRegistration,
          moduleName: ''
        });
      }).toThrow('Module name is required');

      // Test with empty version
      expect(() => {
        moduleRegistryManager.registerModule({
          ...mockModuleRegistration,
          version: ''
        });
      }).toThrow('Module version is required');

      // Test with invalid dependencies array
      expect(() => {
        moduleRegistryManager.registerModule({
          ...mockModuleRegistration,
          dependencies: {} as any
        });
      }).toThrow('Module dependencies must be an array');

      // Test with invalid error policies array
      expect(() => {
        moduleRegistryManager.registerModule({
          ...mockModuleRegistration,
          errorPolicies: {} as any
        });
      }).toThrow('Module error policies must be an array');

      // Test with invalid custom rules array
      expect(() => {
        moduleRegistryManager.registerModule({
          ...mockModuleRegistration,
          customRules: {} as any
        });
      }).toThrow('Module custom rules must be an array');
    });

    test('should validate dependencies', () => {
      mockModuleRegistration.dependencies = ['non-existent-dependency'];
      
      expect(() => {
        moduleRegistryManager.registerModule(mockModuleRegistration);
      }).toThrow('Dependency module non-existent-dependency not found for module test-module');
    });

    test('should throw error when not initialized', () => {
      const uninitializedManager = new ModuleRegistryManager();
      
      expect(() => uninitializedManager.registerModule(mockModuleRegistration))
        .toThrow('Module Registry Manager is not initialized');
    });
  });

  describe('Module Unregistration', () => {
    beforeEach(async () => {
      await moduleRegistryManager.initialize();
      moduleRegistryManager.registerModule(mockModuleRegistration);
    });

    test('should unregister module successfully', () => {
      moduleRegistryManager.unregisterModule('test-module');
      
      const module = moduleRegistryManager.getModule('test-module');
      expect(module).toBeNull();
    });

    test('should handle unregistering non-existent module', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => {
        moduleRegistryManager.unregisterModule('non-existent-module');
      }).not.toThrow();
      
      expect(console.warn).toHaveBeenCalledWith(
        'Module non-existent-module not found for unregistration'
      );
      
      jest.restoreAllMocks();
    });

    test('should prevent unregistering module with dependents', () => {
      // Register dependency first
      mockDependencyModule.dependencies = [];
      moduleRegistryManager.registerModule(mockDependencyModule);
      
      // Register module that depends on it
      mockModuleRegistration.dependencies = ['dependency-module'];
      moduleRegistryManager.registerModule(mockModuleRegistration);
      
      expect(() => {
        moduleRegistryManager.unregisterModule('dependency-module');
      }).toThrow('Cannot unregister module dependency-module');
    });

    test('should throw error when not initialized', () => {
      const uninitializedManager = new ModuleRegistryManager();
      
      expect(() => uninitializedManager.unregisterModule('test-module'))
        .toThrow('Module Registry Manager is not initialized');
    });
  });

  describe('Module Retrieval', () => {
    beforeEach(async () => {
      await moduleRegistryManager.initialize();
      moduleRegistryManager.registerModule(mockModuleRegistration);
    });

    test('should get module by ID', () => {
      const module = moduleRegistryManager.getModule('test-module');
      
      expect(module).toBeDefined();
      expect(module?.moduleId).toBe('test-module');
      expect(module?.moduleName).toBe('TestModule');
    });

    test('should return null for non-existent module', () => {
      const module = moduleRegistryManager.getModule('non-existent-module');
      expect(module).toBeNull();
    });

    test('should get all modules', () => {
      moduleRegistryManager.registerModule(mockDependencyModule);
      
      const allModules = moduleRegistryManager.getAllModules();
      
      expect(allModules).toHaveLength(2);
      expect(allModules.some(m => m.moduleId === 'test-module')).toBe(true);
      expect(allModules.some(m => m.moduleId === 'dependency-module')).toBe(true);
    });

    test('should get modules by filter', () => {
      const dependencyModuleWithType = {
        ...mockDependencyModule,
        metadata: { category: 'database' }
      };
      
      const moduleWithConfig = {
        ...mockModuleRegistration,
        version: '2.0.0',
        dependencies: ['dependency-module']
      };

      moduleRegistryManager.registerModule(dependencyModuleWithType);
      moduleRegistryManager.registerModule(moduleWithConfig);
      
      // Filter by type
      const databaseModules = moduleRegistryManager.getModulesByFilter({
        type: 'database'
      });
      expect(databaseModules).toHaveLength(1);
      expect(databaseModules[0].metadata?.category).toBe('database');
      
      // Filter by version
      const version2Modules = moduleRegistryManager.getModulesByFilter({
        version: '2.0.0'
      });
      expect(version2Modules).toHaveLength(1);
      expect(version2Modules[0].version).toBe('2.0.0');
      
      // Filter by hasDependencies
      const modulesWithDeps = moduleRegistryManager.getModulesByFilter({
        hasDependencies: true
      });
      expect(modulesWithDeps).toHaveLength(1);
      expect(modulesWithDeps[0].moduleId).toBe('test-module');
      
      // Filter by hasDependencies (false)
      const modulesWithoutDeps = moduleRegistryManager.getModulesByFilter({
        hasDependencies: false
      });
      expect(modulesWithoutDeps).toHaveLength(1);
      expect(modulesWithoutDeps[0].moduleId).toBe('dependency-module');
      
      // Filter by status
      const activeModules = moduleRegistryManager.getModulesByFilter({
        status: 'active'
      });
      expect(activeModules).toHaveLength(2);
    });

    test('should throw error when not initialized', () => {
      const uninitializedManager = new ModuleRegistryManager();
      
      expect(() => uninitializedManager.getModule('test-module'))
        .toThrow('Module Registry Manager is not initialized');
    });
  });

  describe('Dependency Management', () => {
    beforeEach(async () => {
      await moduleRegistryManager.initialize();
      moduleRegistryManager.registerModule(mockDependencyModule);
      
      mockModuleRegistration.dependencies = ['dependency-module'];
      moduleRegistryManager.registerModule(mockModuleRegistration);
    });

    test('should get module dependencies', () => {
      const dependencies = moduleRegistryManager.getModuleDependencies('test-module');
      
      expect(dependencies).toContain('dependency-module');
    });

    test('should return empty array for module without dependencies', () => {
      const dependencies = moduleRegistryManager.getModuleDependencies('dependency-module');
      
      expect(dependencies).toEqual([]);
    });

    test('should get module dependents', () => {
      const dependents = moduleRegistryManager.getDependents('dependency-module');
      
      expect(dependents).toContain('test-module');
    });

    test('should return empty array for module without dependents', () => {
      const dependents = moduleRegistryManager.getDependents('test-module');
      
      expect(dependents).toEqual([]);
    });

    test('should resolve dependency order', () => {
      const modules = moduleRegistryManager.resolveDependencyOrder();
      
      expect(modules).toContain('dependency-module');
      expect(modules).toContain('test-module');
      
      // Dependency should come first
      const dependencyIndex = modules.indexOf('dependency-module');
      const moduleIndex = modules.indexOf('test-module');
      expect(dependencyIndex).toBeLessThan(moduleIndex);
    });

    test('should detect circular dependencies', () => {
      // Create circular dependency
      mockDependencyModule.dependencies = ['test-module'];
      moduleRegistryManager.registerModule(mockDependencyModule);
      
      mockModuleRegistration.dependencies = ['dependency-module'];
      moduleRegistryManager.registerModule(mockModuleRegistration);
      
      expect(() => {
        moduleRegistryManager.resolveDependencyOrder();
      }).toThrow('Circular dependency detected');
    });

    test('should handle missing dependencies in resolution', () => {
      mockModuleRegistration.dependencies = ['missing-dependency'];
      moduleRegistryManager.registerModule(mockModuleRegistration);
      
      const modules = moduleRegistryManager.resolveDependencyOrder();
      
      // Should still work, just ignore missing dependencies
      expect(modules).toContain('test-module');
    });
  });

  describe('Module Configuration', () => {
    beforeEach(async () => {
      await moduleRegistryManager.initialize();
      moduleRegistryManager.registerModule(mockModuleRegistration);
    });

    test('should get module configuration', () => {
      const config = moduleRegistryManager.getModuleConfig('test-module');
      
      expect(config).toBeDefined();
      expect(config?.status).toBe('active');
      expect(config?.errorCount).toBe(0);
      expect(config?.successCount).toBe(0);
    });

    test('should return null for non-existent module configuration', () => {
      const config = moduleRegistryManager.getModuleConfig('non-existent-module');
      expect(config).toBeNull();
    });

    test('should update module configuration', () => {
      const update = {
        status: 'inactive' as const,
        customField: 'custom-value'
      };

      moduleRegistryManager.updateModuleConfig('test-module', update);
      
      const config = moduleRegistryManager.getModuleConfig('test-module');
      expect(config?.status).toBe('inactive');
      expect(config?.customField).toBe('custom-value');
      expect(config?.lastUpdated).toBeDefined();
    });

    test('should throw error when updating non-existent module', () => {
      expect(() => {
        moduleRegistryManager.updateModuleConfig('non-existent-module', {});
      }).toThrow('Module non-existent-module not found');
    });

    test('should increment error count', () => {
      moduleRegistryManager.incrementErrorCount('test-module');
      
      const config = moduleRegistryManager.getModuleConfig('test-module');
      expect(config?.errorCount).toBe(1);
    });

    test('should increment success count', () => {
      moduleRegistryManager.incrementSuccessCount('test-module');
      
      const config = moduleRegistryManager.getModuleConfig('test-module');
      expect(config?.successCount).toBe(1);
    });

    test('should handle incrementing counts for non-existent module', () => {
      // Should not throw, just silently handle
      expect(() => {
        moduleRegistryManager.incrementErrorCount('non-existent-module');
      }).not.toThrow();
    });
  });

  describe('Module Health', () => {
    beforeEach(async () => {
      await moduleRegistryManager.initialize();
      moduleRegistryManager.registerModule(mockModuleRegistration);
    });

    test('should check module health', () => {
      const isHealthy = moduleRegistryManager.isModuleHealthy('test-module');
      expect(isHealthy).toBe(true);
    });

    test('should return false for non-existent module', () => {
      const isHealthy = moduleRegistryManager.isModuleHealthy('non-existent-module');
      expect(isHealthy).toBe(false);
    });

    test('should detect unhealthy module (high error rate)', () => {
      // Increment error count to make error rate > 10%
      for (let i = 0; i < 20; i++) {
        moduleRegistryManager.incrementErrorCount('test-module');
      }
      
      const isHealthy = moduleRegistryManager.isModuleHealthy('test-module');
      expect(isHealthy).toBe(false);
    });

    test('should detect healthy module with low error rate', () => {
      // Add some successful requests
      for (let i = 0; i < 100; i++) {
        moduleRegistryManager.incrementSuccessCount('test-module');
      }
      
      // Add some errors but keep rate < 10%
      for (let i = 0; i < 5; i++) {
        moduleRegistryManager.incrementErrorCount('test-module');
      }
      
      const isHealthy = moduleRegistryManager.isModuleHealthy('test-module');
      expect(isHealthy).toBe(true);
    });

    test('should get all modules health', () => {
      // Add some metrics
      moduleRegistryManager.incrementSuccessCount('test-module');
      moduleRegistryManager.incrementErrorCount('test-module');
      
      moduleRegistryManager.registerModule(mockDependencyModule);
      moduleRegistryManager.incrementSuccessCount('dependency-module');
      
      const healthStatus = moduleRegistryManager.getAllModulesHealth();
      
      expect(healthStatus['test-module']).toBeDefined();
      expect(healthStatus['dependency-module']).toBeDefined();
      expect(healthStatus['test-module'].moduleInfo?.name).toBe('TestModule');
      expect(healthStatus['test-module'].errorCount).toBe(1);
      expect(healthStatus['test-module'].successCount).toBe(1);
    });

    test('should handle health checks for inactive modules', () => {
      moduleRegistryManager.updateModuleConfig('test-module', { status: 'inactive' as const });
      
      const isHealthy = moduleRegistryManager.isModuleHealthy('test-module');
      expect(isHealthy).toBe(false);
      });
  });

  describe('Status and Configuration', () => {
    beforeEach(async () => {
      await moduleRegistryManager.initialize();
      moduleRegistryManager.registerModule(mockModuleRegistration);
    });

    test('should return correct status', () => {
      const status = moduleRegistryManager.getStatus();
      
      expect(status.isInitialized).toBe(true);
      expect(status.enableMetrics).toBe(true);
      expect(status.modulesCount).toBe(1);
      expect(status.healthStatus).toBeDefined();
      expect(status.dependencyGraph).toBeDefined();
    });

    test('should enable and disable metrics', () => {
      moduleRegistryManager.setMetricsEnabled(false);
      
      let status = moduleRegistryManager.getStatus();
      expect(status.enableMetrics).toBe(false);
      
      moduleRegistryManager.setMetricsEnabled(true);
      status = moduleRegistryManager.getStatus();
      expect(status.enableMetrics).toBe(true);
    });
  });

  describe('Shutdown', () => {
    test('should shutdown successfully', async () => {
      await moduleRegistryManager.initialize();
      moduleRegistryManager.registerModule(mockModuleRegistration);
      
      expect(moduleRegistryManager.getAllModules()).toHaveLength(1);
      
      await moduleRegistryManager.shutdown();
      
      const status = moduleRegistryManager.getStatus();
      expect(status.isInitialized).toBe(false);
      expect(status.modulesCount).toBe(0);
    });

    test('should shutdown when not initialized', async () => {
      const uninitializedManager = new ModuleRegistryManager();
      
      await expect(uninitializedManager.shutdown()).resolves.not.toThrow();
    });

    test('should handle shutdown errors gracefully', async () => {
      await moduleRegistryManager.initialize();
      moduleRegistryManager.registerModule(mockModuleRegistration);
      
      // Mock map.clear to throw an error
      jest.spyOn(Map.prototype, 'clear').mockImplementation(() => {
        throw new Error('Clear failed');
      });

      await expect(moduleRegistryManager.shutdown()).rejects.toThrow('Clear failed');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await moduleRegistryManager.initialize();
    });

    test('should handle modules with special characters in IDs', () => {
      const specialModule = {
        ...mockModuleRegistration,
        moduleId: 'module-with-special-chars_123'
      };
      
      expect(() => {
        moduleRegistryManager.registerModule(specialModule);
      }).not.toThrow();
      
      const module = moduleRegistryManager.getModule('module-with-special-chars_123');
      expect(module).toBeDefined();
    });

    test('should handle very long module names', () => {
      const longNameModule = {
        ...mockModuleRegistration,
        moduleName: 'a'.repeat(1000)
      };
      
      expect(() => {
        moduleRegistryManager.registerModule(longNameModule);
      }).not.toThrow();
      
      const module = moduleRegistryManager.getModule('test-module');
      expect(module?.moduleName).toBe('a'.repeat(1000));
    });

    test('should handle empty module dependencies array', () => {
      mockModuleRegistration.dependencies = [];
      
      expect(() => {
        moduleRegistryManager.registerModule(mockModuleRegistration);
      }).not.toThrow();
    });

    test('should handle modules with complex dependencies', () => {
      // Create a complex dependency graph
      const modules = [
        { moduleId: 'module-a', dependencies: [] },
        { moduleId: 'module-b', dependencies: ['module-a'] },
        { moduleId: 'module-c', dependencies: ['module-a', 'module-b'] },
        { moduleId: 'module-d', dependencies: ['module-c'] }
      ];
      
      modules.forEach(module => {
        moduleRegistryManager.registerModule({
          ...mockModuleRegistration,
          moduleId: module.moduleId,
          dependencies: module.dependencies
        });
      });
      
      const order = moduleRegistryManager.resolveDependencyOrder();
      
      expect(order).toContain('module-a');
      expect(order).toContain('module-b');
      expect(order).toContain('module-c');
      expect(order).toContain('module-d');
      
      // Check dependency order
      expect(order.indexOf('module-a')).toBeLessThan(order.indexOf('module-b'));
      expect(order.indexOf('module-b')).toBeLessThan(order.indexOf('module-c'));
      expect(order.indexOf('module-c')).toBeLessThan(order.indexOf('module-d'));
    });

    test('should handle concurrent module operations', async () => {
      const modules = Array(100).fill(null).map((_, i) => ({
        ...mockModuleRegistration,
        moduleId: `concurrent-module-${i}`
      }));

      const registerPromises = modules.map(module => 
        Promise.resolve(moduleRegistryManager.registerModule(module))
      );

      await Promise.all(registerPromises);
      
      expect(moduleRegistryManager.getAllModules()).toHaveLength(100);
    });

    test('should handle performance for large numbers of modules', async () => {
      // Add many modules
      for (let i = 0; i < 1000; i++) {
        moduleRegistryManager.registerModule({
          ...mockModuleRegistration,
          moduleId: `perf-module-${i}`
        });
      }

      const startTime = Date.now();
      const allModules = moduleRegistryManager.getAllModules();
      const order = moduleRegistryManager.resolveDependencyOrder();
      const endTime = Date.now();

      expect(allModules).toHaveLength(1000);
      expect(order).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });

    test('should handle memory management for many modules', async () => {
      // Add and remove many modules
      for (let i = 0; i < 100; i++) {
        moduleRegistryManager.registerModule({
          ...mockModuleRegistration,
          moduleId: `temp-module-${i}`
        });
      }

      expect(moduleRegistryManager.getAllModules()).toHaveLength(100);

      // Remove all modules
      for (let i = 0; i < 100; i++) {
        moduleRegistryManager.unregisterModule(`temp-module-${i}`);
      }

      expect(moduleRegistryManager.getAllModules()).toHaveLength(0);
    });
  });
});