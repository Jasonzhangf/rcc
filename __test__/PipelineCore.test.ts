/**
 * Simple Unit Tests for Core Pipeline Functionality
 * Testing without external dependencies
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Simple test implementations
class MockModule {
  private id: string;
  private _name: string;
  private config: any;
  private isActive: boolean = false;

  constructor(id: string, name: string, config: any = {}) {
    this.id = id;
    this._name = name;
    this.config = config;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this._name;
  }

  async configure(config: any): Promise<void> {
    this.config = { ...this.config, ...config };
    this.isActive = true;
  }

  isConfigured(): boolean {
    return this.isActive;
  }

  async process(request: any): Promise<any> {
    if (!this.isActive) {
      throw new Error(`Module ${this.id} is not active`);
    }
    return {
      ...request,
      processedBy: this.id,
      timestamp: Date.now(),
    };
  }

  async processResponse(response: any): Promise<any> {
    return {
      ...response,
      responseProcessedBy: this.id,
      responseTimestamp: Date.now(),
    };
  }

  getHealth(): any {
    return {
      moduleId: this.id,
      status: this.isActive ? 'healthy' : 'inactive',
      config: this.config,
    };
  }
}

class SimplePipeline {
  private id: string;
  private modules: Map<string, MockModule> = new Map();
  private isActive: boolean = false;

  constructor(id: string, _name: string) {
    this.id = id;
  }

  addModule(module: MockModule): void {
    this.modules.set(module.getId(), module);
  }

  async activate(): Promise<void> {
    for (const module of this.modules.values()) {
      if (!module.isConfigured()) {
        throw new Error(`Module ${module.getId()} is not configured`);
      }
    }
    this.isActive = true;
  }

  async deactivate(): Promise<void> {
    this.isActive = false;
  }

  async process(request: any): Promise<any> {
    if (!this.isActive) {
      throw new Error('Pipeline is not active');
    }

    let result = { ...request, pipelineId: this.id, timestamp: Date.now() };

    // Process through modules in order
    for (const module of this.modules.values()) {
      try {
        result = await module.process(result);
      } catch (error) {
        throw new Error(
          `Pipeline processing failed at module ${module.getId()}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return result;
  }

  async processResponse(response: any): Promise<any> {
    if (!this.isActive) {
      throw new Error('Pipeline is not active');
    }

    let result = response;

    // Process through modules in reverse order
    const modules = Array.from(this.modules.values()).reverse();
    for (const module of modules) {
      try {
        result = await module.processResponse(result);
      } catch (error) {
        throw new Error(
          `Pipeline response processing failed at module ${module.getId()}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return result;
  }

  getModule(moduleId: string): MockModule | undefined {
    return this.modules.get(moduleId);
  }

  getModules(): MockModule[] {
    return Array.from(this.modules.values());
  }

  getHealth(): any {
    const moduleHealth = Array.from(this.modules.values()).map((module) => {
      try {
        return module.getHealth();
      } catch (error) {
        return {
          moduleId: module.getId(),
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    return {
      pipelineId: this.id,
      status: this.isActive ? 'active' : 'inactive',
      modules: moduleHealth,
      lastCheck: Date.now(),
    };
  }
}

describe('Core Pipeline System Tests', () => {
  let pipeline: SimplePipeline;
  let module1: MockModule;
  let module2: MockModule;

  beforeEach(() => {
    pipeline = new SimplePipeline('test-pipeline', 'Test Pipeline');
    module1 = new MockModule('module-1', 'First Module');
    module2 = new MockModule('module-2', 'Second Module');
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Pipeline Creation and Configuration', () => {
    it('should create pipeline with valid parameters', () => {
      expect(pipeline).toBeDefined();
      expect(pipeline.getHealth().pipelineId).toBe('test-pipeline');
    });

    it('should add modules to pipeline', () => {
      pipeline.addModule(module1);
      pipeline.addModule(module2);

      expect(pipeline.getModules()).toHaveLength(2);
      expect(pipeline.getModule('module-1')).toBe(module1);
      expect(pipeline.getModule('module-2')).toBe(module2);
    });

    it('should activate pipeline with configured modules', async () => {
      pipeline.addModule(module1);
      pipeline.addModule(module2);

      await module1.configure({});
      await module2.configure({});

      await pipeline.activate();

      expect(pipeline.getHealth().status).toBe('active');
    });

    it('should fail activation with unconfigured modules', async () => {
      pipeline.addModule(module1);
      pipeline.addModule(module2);

      await expect(pipeline.activate()).rejects.toThrow('Module module-1 is not configured');
    });
  });

  describe('Request Processing', () => {
    beforeEach(async () => {
      pipeline.addModule(module1);
      pipeline.addModule(module2);

      await module1.configure({});
      await module2.configure({});
      await pipeline.activate();
    });

    it('should process requests through pipeline', async () => {
      const request = {
        data: 'test-input',
        user: 'test-user',
      };

      const result = await pipeline.process(request);

      expect(result).toHaveProperty('data', 'test-input');
      expect(result).toHaveProperty('user', 'test-user');
      expect(result).toHaveProperty('pipelineId', 'test-pipeline');
      expect(result).toHaveProperty('processedBy', 'module-2');
      expect(result).toHaveProperty('timestamp');
    });

    it('should process responses through pipeline', async () => {
      const response = {
        data: 'test-response',
        status: 'success',
      };

      const result = await pipeline.processResponse(response);

      expect(result).toHaveProperty('data', 'test-response');
      expect(result).toHaveProperty('status', 'success');
      expect(result).toHaveProperty('responseProcessedBy', 'module-1');
      expect(result).toHaveProperty('responseTimestamp');
    });

    it('should reject processing when pipeline is inactive', async () => {
      await pipeline.deactivate();

      await expect(pipeline.process({ data: 'test' })).rejects.toThrow('Pipeline is not active');
    });

    it('should handle module processing errors', async () => {
      class FailingModule extends MockModule {
        async process(_request: any): Promise<any> {
          throw new Error('Module processing failed');
        }
      }

      const failingModule = new FailingModule('failing-module', 'Failing Module');
      await failingModule.configure({});

      const failingPipeline = new SimplePipeline('failing-pipeline', 'Failing Pipeline');
      failingPipeline.addModule(failingModule);
      await failingPipeline.activate();

      await expect(failingPipeline.process({ data: 'test' })).rejects.toThrow(
        'Pipeline processing failed at module failing-module: Module processing failed'
      );
    });
  });

  describe('Module Health Management', () => {
    it('should report health status for all modules', async () => {
      pipeline.addModule(module1);
      pipeline.addModule(module2);

      await module1.configure({});
      await module2.configure({});
      await pipeline.activate();

      const health = pipeline.getHealth();

      expect(health.pipelineId).toBe('test-pipeline');
      expect(health.status).toBe('active');
      expect(health.modules).toHaveLength(2);
      expect(health.modules[0].status).toBe('healthy');
      expect(health.modules[1].status).toBe('healthy');
    });

    it('should handle module health check errors', async () => {
      class UnhealthyModule extends MockModule {
        getHealth(): any {
          throw new Error('Health check failed');
        }
      }

      const unhealthyModule = new UnhealthyModule('unhealthy-module', 'Unhealthy Module');
      await unhealthyModule.configure({});

      pipeline.addModule(unhealthyModule);
      await pipeline.activate();

      const health = pipeline.getHealth();

      expect(health.modules[0].status).toBe('error');
      expect(health.modules[0].error).toBe('Health check failed');
    });
  });

  describe('Pipeline Lifecycle', () => {
    it('should handle activation and deactivation', async () => {
      pipeline.addModule(module1);
      await module1.configure({});

      await pipeline.activate();
      expect(pipeline.getHealth().status).toBe('active');

      await pipeline.deactivate();
      expect(pipeline.getHealth().status).toBe('inactive');
    });

    it('should allow reactivation after deactivation', async () => {
      pipeline.addModule(module1);
      await module1.configure({});

      await pipeline.activate();
      expect(pipeline.getHealth().status).toBe('active');

      await pipeline.deactivate();
      expect(pipeline.getHealth().status).toBe('inactive');

      await pipeline.activate();
      expect(pipeline.getHealth().status).toBe('active');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty pipeline', async () => {
      await expect(pipeline.activate()).resolves.not.toThrow();
      expect(pipeline.getHealth().status).toBe('active');
    });

    it('should handle duplicate module IDs', () => {
      pipeline.addModule(module1);

      const duplicateModule = new MockModule('module-1', 'Duplicate Module');
      pipeline.addModule(duplicateModule);

      expect(pipeline.getModules()).toHaveLength(1);
      expect(pipeline.getModule('module-1')).toBe(duplicateModule);
    });

    it('should handle non-existent module retrieval', () => {
      const nonExistent = pipeline.getModule('non-existent');
      expect(nonExistent).toBeUndefined();
    });

    it('should process requests with single module', async () => {
      pipeline.addModule(module1);
      await module1.configure({});
      await pipeline.activate();

      const request = { data: 'single-module-test' };
      const result = await pipeline.process(request);

      expect(result.processedBy).toBe('module-1');
      expect(result.data).toBe('single-module-test');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle multiple rapid requests', async () => {
      pipeline.addModule(module1);
      pipeline.addModule(module2);

      await module1.configure({});
      await module2.configure({});
      await pipeline.activate();

      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(pipeline.process({ data: `test-${i}`, index: i }));
      }

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.data).toBe(`test-${index}`);
        expect(result.processedBy).toBe('module-2');
      });
    });

    it('should process requests within reasonable time', async () => {
      pipeline.addModule(module1);
      await module1.configure({});
      await pipeline.activate();

      const startTime = Date.now();
      await pipeline.process({ data: 'performance-test' });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should maintain module order in processing', async () => {
      const module3 = new MockModule('module-3', 'Third Module');

      pipeline.addModule(module1);
      pipeline.addModule(module2);
      pipeline.addModule(module3);

      await module1.configure({});
      await module2.configure({});
      await module3.configure({});
      await pipeline.activate();

      const result = await pipeline.process({ data: 'order-test' });

      expect(result.processedBy).toBe('module-3');
    });
  });
});
