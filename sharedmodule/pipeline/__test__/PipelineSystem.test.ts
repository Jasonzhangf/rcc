/**
 * Comprehensive Unit Tests for Pipeline System
 * Using real implementations instead of mocks where possible
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PipelineAssembler, Pipeline } from '../src/core/PipelineAssembler';
import { BasePipelineModule } from '../src/modules/BasePipelineModule';
import { LLMSwitchModule } from '../src/modules/LLMSwitchModule';
import { WorkflowModule } from '../src/modules/WorkflowModule';
import { CompatibilityModule } from '../src/modules/CompatibilityModule';
import { ProviderModule } from '../src/modules/ProviderModule';
import { ModuleInfo, BaseModule } from 'rcc-basemodule';
import { PipelineAssemblyConfig, PipelineModuleConfig, ModuleConnection } from '../src/interfaces/IPipelineAssembler';
import { v4 as uuidv4 } from 'uuid';

// Test implementations instead of mocks
class TestModule extends BasePipelineModule {
  private processCount = 0;
  private shouldFail = false;
  private delay = 0;

  constructor(moduleInfo: ModuleInfo, shouldFail = false, delay = 0) {
    super(moduleInfo);
    this.shouldFail = shouldFail;
    this.delay = delay;
  }

  async configure(config: any): Promise<void> {
    await super.configure(config);
  }

  async process(request: any): Promise<any> {
    this.processCount++;
    
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    if (this.shouldFail && this.processCount > 2) {
      throw new Error(`Module ${this.getId()} failed intentionally`);
    }

    return {
      ...request,
      processedBy: this.getId(),
      processCount: this.processCount,
      timestamp: Date.now()
    };
  }

  async processResponse(response: any): Promise<any> {
    return {
      ...response,
      responseProcessedBy: this.getId(),
      responseTimestamp: Date.now()
    };
  }

  getProcessCount(): number {
    return this.processCount;
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  getHealth(): any {
    return {
      moduleId: this.getId(),
      status: this.shouldFail ? 'error' : 'healthy',
      processCount: this.processCount,
      lastProcessed: Date.now()
    };
  }
}

class TestErrorHandler {
  private errors: any[] = [];

  async handleError(error: any, context: any): Promise<void> {
    this.errors.push({ error, context, timestamp: Date.now() });
  }

  getErrors(): any[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }
}

describe('Pipeline System Unit Tests', () => {
  let pipelineAssembler: PipelineAssembler;
  let errorHandler: TestErrorHandler;

  beforeEach(() => {
    pipelineAssembler = new PipelineAssembler();
    errorHandler = new TestErrorHandler();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Pipeline Assembly', () => {
    it('should assemble pipeline with valid configuration', async () => {
      const config: PipelineAssemblyConfig = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        version: '1.0.0',
        description: 'Test pipeline for unit testing',
        modules: [
          {
            id: 'module-1',
            type: 'TestModule',
            config: { setting: 'value1' }
          }
        ],
        connections: [
          {
            source: 'module-1',
            target: 'module-1',
            type: 'request'
          }
        ]
      };

      // Mock the module factory to use our test module
      (pipelineAssembler as any).moduleFactories.set('TestModule', (info: ModuleInfo) => 
        new TestModule(info)
      );

      const pipeline = await pipelineAssembler.assemble(config);

      expect(pipeline).toBeDefined();
      expect(pipeline.getPipelineInfo().id).toBe('test-pipeline');
      expect(pipeline.getModules()).toHaveLength(1);
    });

    it('should validate required configuration fields', async () => {
      const invalidConfig = {
        name: 'Test Pipeline',
        version: '1.0.0',
        modules: [],
        connections: []
      } as any;

      await expect(pipelineAssembler.assemble(invalidConfig))
        .rejects.toThrow('Pipeline configuration must have id, name, and version');
    });

    it('should require at least one module', async () => {
      const config: PipelineAssemblyConfig = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        version: '1.0.0',
        modules: [],
        connections: []
      };

      await expect(pipelineAssembler.assemble(config))
        .rejects.toThrow('Pipeline must have at least one module');
    });

    it('should validate module IDs uniqueness', async () => {
      const config: PipelineAssemblyConfig = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        version: '1.0.0',
        modules: [
          {
            id: 'duplicate-id',
            type: 'TestModule',
            config: {}
          },
          {
            id: 'duplicate-id',
            type: 'TestModule',
            config: {}
          }
        ],
        connections: []
      };

      (pipelineAssembler as any).moduleFactories.set('TestModule', (info: ModuleInfo) => 
        new TestModule(info)
      );

      await expect(pipelineAssembler.assemble(config))
        .rejects.toThrow('Duplicate module ID: duplicate-id');
    });

    it('should validate connection sources and targets', async () => {
      const config: PipelineAssemblyConfig = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        version: '1.0.0',
        modules: [
          {
            id: 'module-1',
            type: 'TestModule',
            config: {}
          }
        ],
        connections: [
          {
            source: 'non-existent-module',
            target: 'module-1',
            type: 'request'
          }
        ]
      };

      (pipelineAssembler as any).moduleFactories.set('TestModule', (info: ModuleInfo) => 
        new TestModule(info)
      );

      await expect(pipelineAssembler.assemble(config))
        .rejects.toThrow('Invalid connection source module: non-existent-module');
    });
  });

  describe('Pipeline Processing', () => {
    let pipeline: Pipeline;
    let testModule: TestModule;

    beforeEach(async () => {
      const config: PipelineAssemblyConfig = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        version: '1.0.0',
        modules: [
          {
            id: 'test-module',
            type: 'TestModule',
            config: { setting: 'value' }
          }
        ],
        connections: [
          {
            source: 'test-module',
            target: 'test-module',
            type: 'request'
          }
        ]
      };

      (pipelineAssembler as any).moduleFactories.set('TestModule', (info: ModuleInfo) => 
        testModule = new TestModule(info)
      );

      pipeline = await pipelineAssembler.assemble(config);
      await pipelineAssembler.activate();
    });

    it('should process requests through pipeline', async () => {
      const request = {
        data: 'test-input',
        timestamp: Date.now()
      };

      const result = await pipeline.process(request);

      expect(result).toHaveProperty('processedBy', 'test-module');
      expect(result).toHaveProperty('processCount', 1);
      expect(result).toHaveProperty('pipelineId', 'test-pipeline');
      expect(result).toHaveProperty('requestId');
    });

    it('should process responses through pipeline', async () => {
      const response = {
        data: 'test-response',
        timestamp: Date.now()
      };

      const result = await pipeline.processResponse(response);

      expect(result).toHaveProperty('responseProcessedBy', 'test-module');
      expect(result).toHaveProperty('responseTimestamp');
    });

    it('should reject processing when pipeline is inactive', async () => {
      await pipelineAssembler.deactivate();

      await expect(pipeline.process({ data: 'test' }))
        .rejects.toThrow('Pipeline is not active');
    });

    it('should handle module processing errors', async () => {
      testModule.setShouldFail(true);

      await expect(pipeline.process({ data: 'test' }))
        .rejects.toThrow('Pipeline processing failed at module test-module');
    });

    it('should track module health status', () => {
      const health = pipeline.getHealth();

      expect(health.pipelineId).toBe('test-pipeline');
      expect(health.status).toBe('active');
      expect(health.modules).toHaveLength(1);
      expect(health.modules[0].moduleId).toBe('test-module');
    });
  });

  describe('Multi-Module Pipeline', () => {
    let pipeline: Pipeline;
    let modules: TestModule[];

    beforeEach(async () => {
      const config: PipelineAssemblyConfig = {
        id: 'multi-module-pipeline',
        name: 'Multi-Module Pipeline',
        version: '1.0.0',
        modules: [
          {
            id: 'input-processor',
            type: 'TestModule',
            config: { stage: 'input' }
          },
          {
            id: 'transform-processor',
            type: 'TestModule',
            config: { stage: 'transform' }
          },
          {
            id: 'output-processor',
            type: 'TestModule',
            config: { stage: 'output' }
          }
        ],
        connections: [
          {
            source: 'input-processor',
            target: 'transform-processor',
            type: 'request'
          },
          {
            source: 'transform-processor',
            target: 'output-processor',
            type: 'request'
          },
          {
            source: 'output-processor',
            target: 'transform-processor',
            type: 'response'
          },
          {
            source: 'transform-processor',
            target: 'input-processor',
            type: 'response'
          }
        ]
      };

      modules = [];
      (pipelineAssembler as any).moduleFactories.set('TestModule', (info: ModuleInfo) => {
        const module = new TestModule(info);
        modules.push(module);
        return module;
      });

      pipeline = await pipelineAssembler.assemble(config);
      await pipelineAssembler.activate();
    });

    it('should process through multiple modules in sequence', async () => {
      const request = {
        data: 'multi-module-test',
        timestamp: Date.now()
      };

      const result = await pipeline.process(request);

      expect(result.processedBy).toBe('output-processor');
      expect(modules[0].getProcessCount()).toBe(1); // input-processor
      expect(modules[1].getProcessCount()).toBe(1); // transform-processor
      expect(modules[2].getProcessCount()).toBe(1); // output-processor
    });

    it('should process responses in reverse order', async () => {
      const response = {
        data: 'multi-module-response',
        timestamp: Date.now()
      };

      const result = await pipeline.processResponse(response);

      expect(result.responseProcessedBy).toBe('input-processor');
    });

    it('should handle partial pipeline failures gracefully', async () => {
      // Make the second module fail
      modules[1].setShouldFail(true);

      const request = {
        data: 'failure-test',
        timestamp: Date.now()
      };

      await expect(pipeline.process(request))
        .rejects.toThrow('Pipeline processing failed at module transform-processor');

      // First module should have processed
      expect(modules[0].getProcessCount()).toBe(1);
      // Second module should have processed and failed
      expect(modules[1].getProcessCount()).toBe(1);
      // Third module should not have processed
      expect(modules[2].getProcessCount()).toBe(0);
    });
  });

  describe('Pipeline Lifecycle', () => {
    let pipeline: Pipeline;

    beforeEach(async () => {
      const config: PipelineAssemblyConfig = {
        id: 'lifecycle-pipeline',
        name: 'Lifecycle Pipeline',
        version: '1.0.0',
        modules: [
          {
            id: 'lifecycle-module',
            type: 'TestModule',
            config: {}
          }
        ],
        connections: [
          {
            source: 'lifecycle-module',
            target: 'lifecycle-module',
            type: 'request'
          }
        ]
      };

      (pipelineAssembler as any).moduleFactories.set('TestModule', (info: ModuleInfo) => 
        new TestModule(info)
      );

      pipeline = await pipelineAssembler.assemble(config);
    });

    it('should activate pipeline successfully', async () => {
      await pipelineAssembler.activate();

      expect(pipeline.isPipelineActive()).toBe(true);
      expect(pipeline.getPipelineInfo().isActive).toBe(true);
    });

    it('should deactivate pipeline successfully', async () => {
      await pipelineAssembler.activate();
      await pipelineAssembler.deactivate();

      expect(pipeline.isPipelineActive()).toBe(false);
      expect(pipeline.getPipelineInfo().isActive).toBe(false);
    });

    it('should handle activate without assembly', async () => {
      const newAssembler = new PipelineAssembler();
      
      await expect(newAssembler.activate())
        .rejects.toThrow('No pipeline assembled. Call assemble() first.');
    });

    it('should handle multiple deactivations gracefully', async () => {
      await pipelineAssembler.activate();
      await pipelineAssembler.deactivate();
      await pipelineAssembler.deactivate(); // Should not throw

      expect(pipeline.isPipelineActive()).toBe(false);
    });
  });

  describe('Pipeline Configuration', () => {
    it('should return available module types', () => {
      const moduleTypes = pipelineAssembler.getAvailableModuleTypes();

      expect(Array.isArray(moduleTypes)).toBe(true);
      expect(moduleTypes.length).toBeGreaterThan(0);
    });

    it('should return pipeline status', async () => {
      const config: PipelineAssemblyConfig = {
        id: 'status-pipeline',
        name: 'Status Pipeline',
        version: '1.0.0',
        modules: [
          {
            id: 'status-module',
            type: 'TestModule',
            config: {}
          }
        ],
        connections: [
          {
            source: 'status-module',
            target: 'status-module',
            type: 'request'
          }
        ]
      };

      (pipelineAssembler as any).moduleFactories.set('TestModule', (info: ModuleInfo) => 
        new TestModule(info)
      );

      await pipelineAssembler.assemble(config);

      let status = pipelineAssembler.getPipelineStatus();
      expect(status.status).toBe('inactive');

      await pipelineAssembler.activate();
      status = pipelineAssembler.getPipelineStatus();
      expect(status.status).toBe('active');
      expect(status.pipeline.id).toBe('status-pipeline');
    });
  });

  describe('Pipeline Error Handling', () => {
    it('should handle module configuration errors', async () => {
      class FailingConfigurationModule extends TestModule {
        async configure(config: any): Promise<void> {
          throw new Error('Configuration failed');
        }
      }

      const config: PipelineAssemblyConfig = {
        id: 'config-error-pipeline',
        name: 'Config Error Pipeline',
        version: '1.0.0',
        modules: [
          {
            id: 'failing-module',
            type: 'FailingModule',
            config: {}
          }
        ],
        connections: []
      };

      (pipelineAssembler as any).moduleFactories.set('FailingModule', (info: ModuleInfo) => 
        new FailingConfigurationModule(info)
      );

      await expect(pipelineAssembler.assemble(config))
        .rejects.toThrow('Failed to assemble pipeline: Failed to activate module failing-module');
    });

    it('should handle module health check errors', async () => {
      class UnhealthyModule extends TestModule {
        getHealth(): any {
          throw new Error('Health check failed');
        }
      }

      const config: PipelineAssemblyConfig = {
        id: 'unhealthy-pipeline',
        name: 'Unhealthy Pipeline',
        version: '1.0.0',
        modules: [
          {
            id: 'unhealthy-module',
            type: 'UnhealthyModule',
            config: {}
          }
        ],
        connections: [
          {
            source: 'unhealthy-module',
            target: 'unhealthy-module',
            type: 'request'
          }
        ]
      };

      (pipelineAssembler as any).moduleFactories.set('UnhealthyModule', (info: ModuleInfo) => 
        new UnhealthyModule(info)
      );

      const pipeline = await pipelineAssembler.assemble(config);
      await pipelineAssembler.activate();

      const health = pipeline.getHealth();
      expect(health.modules[0].status).toBe('error');
      expect(health.modules[0].error).toBe('Health check failed');
    });
  });

  describe('Pipeline Performance', () => {
    it('should handle concurrent processing', async () => {
      const config: PipelineAssemblyConfig = {
        id: 'concurrent-pipeline',
        name: 'Concurrent Pipeline',
        version: '1.0.0',
        modules: [
          {
            id: 'concurrent-module',
            type: 'TestModule',
            config: {}
          }
        ],
        connections: [
          {
            source: 'concurrent-module',
            target: 'concurrent-module',
            type: 'request'
          }
        ]
      };

      (pipelineAssembler as any).moduleFactories.set('TestModule', (info: ModuleInfo) => 
        new TestModule(info)
      );

      const pipeline = await pipelineAssembler.assemble(config);
      await pipelineAssembler.activate();

      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(pipeline.process({ data: `test-${i}`, index: i }));
      }

      const results = await Promise.all(requests);
      
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.data).toBe(`test-${index}`);
        expect(result.processedBy).toBe('concurrent-module');
      });
    });

    it('should process requests within reasonable time', async () => {
      const config: PipelineAssemblyConfig = {
        id: 'performance-pipeline',
        name: 'Performance Pipeline',
        version: '1.0.0',
        modules: [
          {
            id: 'fast-module',
            type: 'TestModule',
            config: {}
          }
        ],
        connections: [
          {
            source: 'fast-module',
            target: 'fast-module',
            type: 'request'
          }
        ]
      };

      (pipelineAssembler as any).moduleFactories.set('TestModule', (info: ModuleInfo) => 
        new TestModule(info)
      );

      const pipeline = await pipelineAssembler.assemble(config);
      await pipelineAssembler.activate();

      const startTime = Date.now();
      await pipeline.process({ data: 'performance-test' });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Pipeline Module Management', () => {
    let pipeline: Pipeline;

    beforeEach(async () => {
      const config: PipelineAssemblyConfig = {
        id: 'module-mgmt-pipeline',
        name: 'Module Management Pipeline',
        version: '1.0.0',
        modules: [
          {
            id: 'mgmt-module-1',
            type: 'TestModule',
            config: {}
          },
          {
            id: 'mgmt-module-2',
            type: 'TestModule',
            config: {}
          }
        ],
        connections: [
          {
            source: 'mgmt-module-1',
            target: 'mgmt-module-2',
            type: 'request'
          }
        ]
      };

      (pipelineAssembler as any).moduleFactories.set('TestModule', (info: ModuleInfo) => 
        new TestModule(info)
      );

      pipeline = await pipelineAssembler.assemble(config);
    });

    it('should retrieve modules by ID', () => {
      const module = pipeline.getModule('mgmt-module-1');
      expect(module).toBeDefined();
      expect(module?.getId()).toBe('mgmt-module-1');

      const nonExistentModule = pipeline.getModule('non-existent');
      expect(nonExistentModule).toBeUndefined();
    });

    it('should return all modules', () => {
      const modules = pipeline.getModules();
      expect(modules).toHaveLength(2);
      expect(modules.map(m => m.getId())).toContain('mgmt-module-1');
      expect(modules.map(m => m.getId())).toContain('mgmt-module-2');
    });

    it('should provide complete pipeline information', () => {
      const info = pipeline.getPipelineInfo();

      expect(info.id).toBe('module-mgmt-pipeline');
      expect(info.name).toBe('Module Management Pipeline');
      expect(info.version).toBe('1.0.0');
      expect(info.moduleCount).toBe(2);
      expect(info.connectionCount).toBe(1);
    });
  });
});