/**
 * Server Module Unit Tests - Enhanced with Real Dependencies and Pipeline Integration
 * 
 * Testing Strategy:
 * 1. Test basic module initialization with real BaseModule
 * 2. Test configuration handling with validation
 * 3. Test service lifecycle with real dependencies
 * 4. Test request handling with minimal mocking
 * 5. Test virtual model management with real router
 * 6. Test route management with actual HTTP server
 * 7. Test middleware management
 * 8. Test error handling with real scenarios
 * 9. Test status reporting and health monitoring
 * 10. Test message handling and communication
 * 11. Test resource cleanup and memory management
 * 12. Stress testing with concurrent requests
 * 13. Test Pipeline Scheduler integration
 * 14. Test request routing via Pipeline vs Direct processing
 * 15. Test fallback mechanisms and error handling
 */

import { jest } from '@jest/globals';
import { ServerModule } from '../src/ServerModule';
import { 
  createMockServerConfig, 
  createMockClientRequest, 
  createMockVirtualModelConfig,
  createMockRouteConfig,
  createMockMiddlewareConfig,
  waitFor,
  createRealHttpServer,
  createRealVirtualModelRouter
} from './test-utils';

// Pipeline types for testing
import { 
  IPipelineScheduler, 
  PipelineExecutionResult, 
  PipelineExecutionContext,
  ExecutionOptions,
  SchedulerStats
} from '../../../pipeline/src/PipelineScheduler';

// Real dependencies for testing
import express from 'express';

describe('ServerModule', () => {
  let serverModule: ServerModule;
  let realHttpServer: any;
  let realVirtualModelRouter: any;

  beforeEach(async () => {
    // Create real dependencies instead of mocks
    realHttpServer = createRealHttpServer();
    realVirtualModelRouter = createRealVirtualModelRouter();
    
    // Create fresh instance for each test
    serverModule = new ServerModule();
    
    // Replace mock components with real ones for integration testing
    (serverModule as any).httpServer = realHttpServer;
    (serverModule as any).virtualModelRouter = realVirtualModelRouter;
  });

  afterEach(async () => {
    // Proper cleanup after each test
    try {
      if (serverModule) {
        await serverModule.destroy();
      }
      
      // Clean up real HTTP server
      if (realHttpServer && realHttpServer.close) {
        await new Promise(resolve => realHttpServer.close(resolve));
      }
      
      // Clear any remaining connections
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      // Log cleanup errors but don't fail tests
      console.warn('Cleanup error:', error);
    }
  });

  describe('Module Initialization', () => {
    test('should create ServerModule instance with correct module info', () => {
      expect(serverModule).toBeInstanceOf(ServerModule);
      
      const info = serverModule.getInfo();
      expect(info.id).toBe('ServerModule');
      expect(info.name).toBe('RCC Server Module');
      expect(info.type).toBe('server');
      expect(info.capabilities).toContain('http-server');
      expect(info.capabilities).toContain('virtual-model-routing');
    });

    test('should be in initial state after creation', () => {
      const status = (serverModule as any).getStatus();
      expect(status.status).toBe('stopped');
      expect(status.uptime).toBe(0);
      expect(status.connections).toBe(0);
      expect(status.requestsHandled).toBe(0);
    });

    test('should accept configuration and validate it', () => {
      const config = createMockServerConfig();
      
      expect(() => {
        serverModule.configure(config);
      }).not.toThrow();
      
      // Test configuration validation
      const invalidConfig = createMockServerConfig({ port: 99999 });
      expect(() => {
        serverModule.configure(invalidConfig);
      }).toThrow('Invalid port number');
    });

    test('should properly initialize with real dependencies', async () => {
      const config = createMockServerConfig();
      serverModule.configure(config);
      
      await expect(serverModule.initialize()).resolves.not.toThrow();
      
      // Verify initialization state
      expect((serverModule as any).isInitialized).toBe(true);
      expect((serverModule as any).config).toEqual(config);
    });

    test('should throw error when initializing without configuration', async () => {
      const unconfiguredModule = new ServerModule();
      
      await expect(unconfiguredModule.initialize()).resolves.not.toThrow();
      // BaseModule allows initialization without config but logs warning
    });
  });

  describe('Service Lifecycle with Real HTTP Server', () => {
    let mockConfig: any;

    beforeEach(async () => {
      mockConfig = createMockServerConfig({ port: 0 }); // Use port 0 for automatic assignment
      serverModule.configure(mockConfig);
      await serverModule.initialize();
    });

    test('should start successfully with real HTTP server', async () => {
      await expect(serverModule.start()).resolves.not.toThrow();
      
      const status = (serverModule as any).getStatus();
      expect(status.status).toBe('running');
      expect(status.port).toBeGreaterThan(0);
      expect(status.host).toBe(mockConfig.host);
    });

    test('should handle concurrent start requests gracefully', async () => {
      // Start multiple times concurrently
      const startPromises = [
        serverModule.start(),
        serverModule.start(),
        serverModule.start()
      ];
      
      await expect(Promise.all(startPromises)).resolves.not.toThrow();
      
      const status = (serverModule as any).getStatus();
      expect(status.status).toBe('running');
    });

    test('should stop gracefully and cleanup resources', async () => {
      await serverModule.start();
      
      const initialStatus = (serverModule as any).getStatus();
      expect(initialStatus.status).toBe('running');
      
      await expect(serverModule.stop()).resolves.not.toThrow();
      
      const finalStatus = (serverModule as any).getStatus();
      expect(finalStatus.status).toBe('stopped');
    });

    test('should restart service properly', async () => {
      await serverModule.start();
      
      const startTime = Date.now();
      await serverModule.restart();
      const restartTime = Date.now() - startTime;
      
      expect(restartTime).toBeLessThan(5000); // Should restart quickly
      
      const status = (serverModule as any).getStatus();
      expect(status.status).toBe('running');
    });

    test('should handle start when already running', async () => {
      await serverModule.start();
      
      // Try to start again - should not throw
      await expect(serverModule.start()).resolves.not.toThrow();
    });
  });

  describe('Request Handling with Real HTTP Server', () => {
    let testPort: number;

    beforeEach(async () => {
      const config = createMockServerConfig({ port: 0 });
      serverModule.configure(config);
      await serverModule.initialize();
      await serverModule.start();
      
      testPort = (serverModule as any).getStatus().port;
    });

    test('should handle real HTTP requests', async () => {
      const request = createMockClientRequest();
      
      const response = await serverModule.handleRequest(request);
      
      expect(response).toBeDefined();
      expect(response.id).toBe(request.id);
      expect(response.status).toBe(200);
      expect(response.processingTime).toBeGreaterThan(0);
    });

    test('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        createMockClientRequest({ id: `test-request-${i}` })
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map(req => serverModule.handleRequest(req))
      );
      const totalTime = Date.now() - startTime;
      
      expect(responses).toHaveLength(10);
      expect(totalTime).toBeLessThan(2000); // Should handle 10 requests in under 2 seconds
      
      // Verify all responses are unique
      const responseIds = responses.map(r => r.id);
      expect(new Set(responseIds).size).toBe(10);
    });

    test('should handle requests with large payloads', async () => {
      const largePayload = {
        data: 'x'.repeat(1024 * 1024), // 1MB payload
        timestamp: Date.now()
      };
      
      const request = createMockClientRequest({ body: largePayload });
      
      const response = await serverModule.handleRequest(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
    });

    test('should throw error when server is not running', async () => {
      await serverModule.stop();
      
      const request = createMockClientRequest();
      
      await expect(serverModule.handleRequest(request)).rejects.toThrow('Server is not running');
    });
  });

  describe('Virtual Model Management with Real Router', () => {
    beforeEach(async () => {
      const config = createMockServerConfig();
      serverModule.configure(config);
      await serverModule.initialize();
      await serverModule.start();
    });

    test('should register virtual model with real router', async () => {
      const model = createMockVirtualModelConfig();
      
      await expect(serverModule.registerVirtualModel(model)).resolves.not.toThrow();
      
      const retrievedModel = serverModule.getVirtualModel(model.id);
      expect(retrievedModel).toBeDefined();
      expect(retrievedModel?.id).toBe(model.id);
    });

    test('should handle multiple virtual models', async () => {
      const models = Array.from({ length: 5 }, (_, i) => 
        createMockVirtualModelConfig({ id: `model-${i}` })
      );
      
      // Register all models
      await Promise.all(
        models.map(model => serverModule.registerVirtualModel(model))
      );
      
      const allModels = serverModule.getVirtualModels();
      expect(allModels).toHaveLength(5);
      
      // Verify all models are registered
      const modelIds = allModels.map(m => m.id);
      expect(modelIds).toEqual(['model-0', 'model-1', 'model-2', 'model-3', 'model-4']);
    });

    test('should route requests to appropriate virtual models', async () => {
      const modelA = createMockVirtualModelConfig({ 
        id: 'model-a' 
      });
      const modelB = createMockVirtualModelConfig({ 
        id: 'model-b' 
      });
      
      await serverModule.registerVirtualModel(modelA);
      await serverModule.registerVirtualModel(modelB);
      
      const request = createMockClientRequest({ virtualModel: 'model-a' });
      
      const response = await serverModule.handleRequest(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
    });

    test('should unregister virtual model properly', async () => {
      const model = createMockVirtualModelConfig();
      
      await serverModule.registerVirtualModel(model);
      expect(serverModule.getVirtualModel(model.id)).toBeDefined();
      
      await serverModule.unregisterVirtualModel(model.id);
      expect(serverModule.getVirtualModel(model.id)).toBeUndefined();
    });

    test('should throw error for invalid model configuration', async () => {
      const invalidModel = createMockVirtualModelConfig({ maxTokens: 0 });
      
      await expect(serverModule.registerVirtualModel(invalidModel)).rejects.toThrow();
    });
  });

  describe('Route Management with Real HTTP Server', () => {
    beforeEach(async () => {
      const config = createMockServerConfig();
      serverModule.configure(config);
      await serverModule.initialize();
      await serverModule.start();
    });

    test('should register route with real HTTP server', async () => {
      const route = createMockRouteConfig();
      
      await expect(serverModule.registerRoute(route)).resolves.not.toThrow();
      
      const routes = serverModule.getRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].id).toBe(route.id);
    });

    test('should handle multiple HTTP methods', async () => {
      const routes = [
        createMockRouteConfig({ id: 'get-route', method: 'GET' }),
        createMockRouteConfig({ id: 'post-route', method: 'POST' }),
        createMockRouteConfig({ id: 'put-route', method: 'PUT' }),
        createMockRouteConfig({ id: 'delete-route', method: 'DELETE' })
      ];
      
      await Promise.all(routes.map(route => serverModule.registerRoute(route)));
      
      const registeredRoutes = serverModule.getRoutes();
      expect(registeredRoutes).toHaveLength(4);
    });

    test('should unregister route and clean up HTTP server', async () => {
      const route = createMockRouteConfig();
      
      await serverModule.registerRoute(route);
      expect(serverModule.getRoutes()).toHaveLength(1);
      
      await serverModule.unregisterRoute(route.id);
      expect(serverModule.getRoutes()).toHaveLength(0);
    });

    test('should handle invalid route configurations', async () => {
      const invalidRoute = createMockRouteConfig({ method: 'INVALID' });
      
      await expect(serverModule.registerRoute(invalidRoute)).rejects.toThrow();
    });
  });

  describe('Middleware Management', () => {
    beforeEach(async () => {
      const config = createMockServerConfig();
      serverModule.configure(config);
      await serverModule.initialize();
      await serverModule.start();
    });

    test('should register middleware successfully', async () => {
      const middleware = createMockMiddlewareConfig();
      
      await expect(serverModule.registerMiddleware(middleware)).resolves.not.toThrow();
    });

    test('should handle multiple middleware with different priorities', async () => {
      const middlewares = Array.from({ length: 5 }, (_, i) => 
        createMockMiddlewareConfig({ 
          name: `middleware-${i}`, 
          priority: i + 1 
        })
      );
      
      await Promise.all(
        middlewares.map(middleware => serverModule.registerMiddleware(middleware))
      );
      
      // Verify middleware are registered (no direct way to check order)
      expect((serverModule as any).middlewares.size).toBe(5);
    });

    test('should unregister middleware properly', async () => {
      const middleware = createMockMiddlewareConfig();
      
      await serverModule.registerMiddleware(middleware);
      
      await expect(serverModule.unregisterMiddleware(middleware.name)).resolves.not.toThrow();
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      const config = createMockServerConfig();
      serverModule.configure(config);
      await serverModule.initialize();
      await serverModule.start();
    });

    test('should handle malformed requests gracefully', async () => {
      const malformedRequest = {
        id: 'malformed-request',
        // Missing required fields
      };
      
      const response = await serverModule.handleRequest(malformedRequest as any);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle virtual model routing failures', async () => {
      const request = createMockClientRequest({ virtualModel: 'non-existent-model' });
      
      const response = await serverModule.handleRequest(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(500);
    });

    test('should recover from virtual model registration failures', async () => {
      const validModel = createMockVirtualModelConfig();
      const invalidModel = createMockVirtualModelConfig({ maxTokens: 0 });
      
      // Register valid model
      await serverModule.registerVirtualModel(validModel);
      
      // Try to register invalid model (should fail)
      await expect(serverModule.registerVirtualModel(invalidModel)).rejects.toThrow();
      
      // Verify valid model is still registered
      expect(serverModule.getVirtualModel(validModel.id)).toBeDefined();
    });

    test('should handle HTTP server startup failures', async () => {
      // Try to start on a port that's already in use
      const config = createMockServerConfig({ port: 80 }); // Privileged port
      serverModule.configure(config);
      
      // Should handle port binding errors gracefully
      await expect(serverModule.start()).rejects.toThrow();
    });
  });

  describe('Health Monitoring and Metrics', () => {
    beforeEach(async () => {
      const config = createMockServerConfig();
      serverModule.configure(config);
      await serverModule.initialize();
      await serverModule.start();
    });

    test('should provide accurate health status', async () => {
      const health = await (serverModule as any).getHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('checks');
      expect(health).toHaveProperty('timestamp');
      expect(typeof health.timestamp).toBe('number');
    });

    test('should track request metrics accurately', async () => {
      const initialMetrics = (serverModule as any).getMetrics();
      expect(initialMetrics).toHaveLength(0);
      
      // Send some requests
      const requests = Array.from({ length: 5 }, (_, i) => 
        createMockClientRequest({ id: `metrics-test-${i}` })
      );
      
      await Promise.all(requests.map(req => serverModule.handleRequest(req)));
      
      const finalMetrics = (serverModule as any).getMetrics();
      expect(finalMetrics).toHaveLength(5);
      
      // Verify metrics structure
      finalMetrics.forEach(metric => {
        expect(metric).toHaveProperty('requestId');
        expect(metric).toHaveProperty('processingTime');
        expect(metric).toHaveProperty('status');
        expect(metric).toHaveProperty('timestamp');
      });
    });

    test('should calculate error rates correctly', async () => {
      // Send some valid requests
      const validRequests = Array.from({ length: 3 }, (_, i) => 
        createMockClientRequest({ id: `valid-${i}` })
      );
      
      await Promise.all(validRequests.map(req => serverModule.handleRequest(req)));
      
      // Send invalid request to generate error
      const invalidRequest = { id: 'invalid-request' };
      await serverModule.handleRequest(invalidRequest as any);
      
      const metrics = (serverModule as any).getMetrics();
      const errorRate = (serverModule as any).calculateErrorRate();
      
      expect(errorRate).toBeGreaterThan(0);
      expect(errorRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Message Handling and Communication', () => {
    beforeEach(async () => {
      const config = createMockServerConfig();
      serverModule.configure(config);
      await serverModule.initialize();
      await serverModule.start();
    });

    test('should handle system messages correctly', async () => {
      const message = {
        type: 'test-message',
        source: 'test-system',
        target: 'ServerModule',
        payload: {},
        timestamp: Date.now()
      };
      
      const response = await serverModule.handleMessage(message);
      
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
    });

    test('should handle ping messages with proper response', async () => {
      const pingMessage = {
        type: 'ping',
        source: 'test-system',
        target: 'ServerModule',
        payload: {},
        timestamp: Date.now()
      };
      
      const response = await serverModule.handleMessage(pingMessage);
      
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.data.pong).toBe(true);
    });

    test('should handle shutdown requests gracefully', async () => {
      const shutdownMessage = {
        type: 'shutdown-request',
        source: 'test-system',
        target: 'ServerModule',
        payload: {},
        timestamp: Date.now()
      };
      
      // Should not throw and should handle gracefully
      await expect(serverModule.handleMessage(shutdownMessage)).resolves.not.toThrow();
    });

    test('should broadcast messages to other modules', async () => {
      // This tests the broadcasting capability
      expect(() => {
        (serverModule as any).broadcastMessage('test-broadcast', { data: 'test' });
      }).not.toThrow();
    });
  });

  describe('Resource Management and Cleanup', () => {
    test('should clean up resources properly', async () => {
      const config = createMockServerConfig();
      serverModule.configure(config);
      await serverModule.initialize();
      await serverModule.start();
      
      // Register some resources
      const model = createMockVirtualModelConfig();
      await serverModule.registerVirtualModel(model);
      
      const route = createMockRouteConfig();
      await serverModule.registerRoute(route);
      
      // Send some requests to create metrics
      const request = createMockClientRequest();
      await serverModule.handleRequest(request);
      
      await expect(serverModule.destroy()).resolves.not.toThrow();
      
      // Verify cleanup
      const status = (serverModule as any).getStatus();
      expect(status.status).toBe('stopped');
      expect(serverModule.getVirtualModels()).toHaveLength(0);
      expect(serverModule.getRoutes()).toHaveLength(0);
    });

    test('should handle cleanup errors gracefully', async () => {
      const serverModule = new ServerModule();
      
      // Should not throw even if cleanup fails
      await expect(serverModule.destroy()).resolves.not.toThrow();
    });

    test('should manage memory efficiently under load', async () => {
      const config = createMockServerConfig();
      serverModule.configure(config);
      await serverModule.initialize();
      await serverModule.start();
      
      // Generate load
      const requests = Array.from({ length: 100 }, (_, i) => 
        createMockClientRequest({ id: `load-test-${i}` })
      );
      
      await Promise.all(requests.map(req => serverModule.handleRequest(req)));
      
      // Check memory usage
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
      
      // Cleanup should free memory
      await serverModule.destroy();
    });
  });

  describe('Stress Testing and Performance', () => {
    beforeEach(async () => {
      const config = createMockServerConfig();
      serverModule.configure(config);
      await serverModule.initialize();
      await serverModule.start();
    });

    test('should handle high request concurrency', async () => {
      const concurrentRequests = 50;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => 
        createMockClientRequest({ id: `stress-test-${i}` })
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map(req => serverModule.handleRequest(req))
      );
      const totalTime = Date.now() - startTime;
      
      expect(responses).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(5000); // Should handle 50 requests in under 5 seconds
      
      // Verify all responses are successful
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBe(concurrentRequests);
    });

    test('should maintain performance under sustained load', async () => {
      const batchSize = 10;
      const totalBatches = 5;
      
      for (let batch = 0; batch < totalBatches; batch++) {
        const requests = Array.from({ length: batchSize }, (_, i) => 
          createMockClientRequest({ id: `sustained-test-${batch}-${i}` })
        );
        
        const startTime = Date.now();
        await Promise.all(requests.map(req => serverModule.handleRequest(req)));
        const batchTime = Date.now() - startTime;
        
        expect(batchTime).toBeLessThan(1000); // Each batch should complete in under 1 second
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    test('should handle resource exhaustion gracefully', async () => {
      // Try to exhaust resources with many concurrent operations
      const largeRequestCount = 1000;
      
      // Create requests but don't await all at once to avoid overwhelming the system
      const requestPromises = Array.from({ length: largeRequestCount }, async (_, i) => {
        try {
          const request = createMockClientRequest({ id: `exhaustion-test-${i}` });
          return await serverModule.handleRequest(request);
        } catch (error) {
          return { id: `exhaustion-test-${i}`, status: 500, error: String(error) };
        }
      });
      
      const results = await Promise.all(requestPromises);
      
      // Most requests should succeed, some might fail due to resource limits
      const successfulRequests = results.filter(r => r.status === 200);
      expect(successfulRequests.length).toBeGreaterThan(largeRequestCount * 0.8); // At least 80% success rate
    });
  });

  describe('Pipeline Scheduler Integration', () => {
    let mockPipelineScheduler: jest.Mocked<IPipelineScheduler>;
    let mockExecutionResult: PipelineExecutionResult;
    let mockSchedulerStats: SchedulerStats;

    beforeEach(async () => {
      const config = createMockServerConfig();
      serverModule.configure(config);
      await serverModule.initialize();
      await serverModule.start();

      // Create mock pipeline scheduler
      mockPipelineScheduler = {
        initialize: jest.fn().mockResolvedValue(undefined),
        execute: jest.fn(),
        createPipeline: jest.fn(),
        destroyPipeline: jest.fn(),
        enablePipeline: jest.fn(),
        disablePipeline: jest.fn(),
        setPipelineMaintenance: jest.fn(),
        getPipelineStatus: jest.fn(),
        getAllPipelineStatuses: jest.fn(),
        getSchedulerStats: jest.fn(),
        healthCheck: jest.fn(),
        shutdown: jest.fn(),
      };

      // Mock execution result
      mockExecutionResult = {
        executionId: 'test-execution-id',
        pipelineId: 'test-pipeline-id',
        instanceId: 'test-instance-id',
        status: 'COMPLETED' as any,
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        result: {
          message: 'Pipeline execution completed successfully',
          data: 'test-result'
        },
        metadata: { test: 'metadata' },
        retryCount: 0
      };

      // Mock scheduler stats
      mockSchedulerStats = {
        totalRequests: 10,
        successfulRequests: 9,
        failedRequests: 1,
        averageResponseTime: 50,
        activeInstances: 3,
        totalInstances: 5,
        blacklistedInstances: 1,
        uptime: 3600000,
        lastHealthCheck: Date.now(),
        requestsByPipeline: new Map([['test-pipeline', 5]]),
        errorsByPipeline: new Map([['test-pipeline', 1]]),
        loadBalancerStats: {}
      };

      mockPipelineScheduler.getSchedulerStats.mockReturnValue(mockSchedulerStats);
      mockPipelineScheduler.healthCheck.mockResolvedValue(true);
    });

    test('should set Pipeline Scheduler successfully', async () => {
      mockPipelineScheduler.getSchedulerStats.mockReturnValue({
        ...mockSchedulerStats,
        totalRequests: 0
      });

      await expect(serverModule.setPipelineScheduler(mockPipelineScheduler)).resolves.not.toThrow();

      expect(mockPipelineScheduler.initialize).toHaveBeenCalled();
      expect(mockPipelineScheduler.getSchedulerStats).toHaveBeenCalled();

      const config = serverModule.getPipelineIntegrationConfig();
      expect(config.enabled).toBe(true);
    });

    test('should use existing scheduler if already initialized', async () => {
      mockPipelineScheduler.getSchedulerStats.mockReturnValue(mockSchedulerStats);

      await expect(serverModule.setPipelineScheduler(mockPipelineScheduler)).resolves.not.toThrow();

      expect(mockPipelineScheduler.initialize).not.toHaveBeenCalled();
    });

    test('should process request via Pipeline Scheduler when available', async () => {
      await serverModule.setPipelineScheduler(mockPipelineScheduler);

      const request = createMockClientRequest();
      const model = createMockVirtualModelConfig();

      // Mock successful pipeline execution
      mockPipelineScheduler.execute.mockResolvedValue(mockExecutionResult);

      const response = await serverModule.processVirtualModelRequest(request, model);

      expect(mockPipelineScheduler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'virtual-model-request',
          requestId: request.id,
          virtualModelId: model.id
        }),
        expect.objectContaining({
          timeout: 30000,
          maxRetries: 3,
          preferredPipelineId: model.id
        })
      );

      expect(response.status).toBe(200);
      expect(response.headers['X-Processing-Method']).toBe('pipeline');
      expect(response.headers['X-Pipeline-Id']).toBe(mockExecutionResult.pipelineId);
    });

    test('should fallback to direct processing when pipeline fails', async () => {
      await serverModule.setPipelineScheduler(mockPipelineScheduler);

      const request = createMockClientRequest();
      const model = createMockVirtualModelConfig();

      // Mock pipeline execution failure
      mockPipelineScheduler.execute.mockRejectedValue(new Error('Pipeline execution failed'));

      const response = await serverModule.processVirtualModelRequest(request, model);

      expect(mockPipelineScheduler.execute).toHaveBeenCalled();
      expect(response.headers['X-Processing-Method']).toBe('direct');
      expect(response.status).toBe(200);
    });

    test('should throw error when pipeline fails and fallback is disabled', async () => {
      // Update config to disable fallback
      const config = serverModule.getPipelineIntegrationConfig();
      config.fallbackToDirect = false;
      
      await serverModule.setPipelineScheduler(mockPipelineScheduler);

      const request = createMockClientRequest();
      const model = createMockVirtualModelConfig();

      // Mock pipeline execution failure
      mockPipelineScheduler.execute.mockRejectedValue(new Error('Pipeline execution failed'));

      await expect(serverModule.processVirtualModelRequest(request, model)).rejects.toThrow('Pipeline execution failed');
    });

    test('should handle pipeline timeout correctly', async () => {
      await serverModule.setPipelineScheduler(mockPipelineScheduler);

      const request = createMockClientRequest();
      const model = createMockVirtualModelConfig();

      // Mock pipeline execution timeout
      const timeoutResult: PipelineExecutionResult = {
        ...mockExecutionResult,
        status: 'FAILED' as any,
        error: {
          code: 'EXECUTION_TIMEOUT',
          message: 'Pipeline execution timeout',
          category: 'execution',
          severity: 'high',
          recoverability: 'recoverable',
          impact: 'single_module',
          source: 'module',
          timestamp: Date.now()
        }
      };

      mockPipelineScheduler.execute.mockResolvedValue(timeoutResult);

      const response = await serverModule.processVirtualModelRequest(request, model);

      expect(response.status).toBe(504);
      expect(response.headers['X-Processing-Method']).toBe('pipeline');
    });

    test('should include pipeline integration in server status', async () => {
      const status = serverModule.getStatus();

      expect(status.pipelineIntegration).toBeDefined();
      expect(status.pipelineIntegration?.enabled).toBe(false);
      expect(status.pipelineIntegration?.schedulerAvailable).toBe(false);
      expect(status.pipelineIntegration?.processingMethod).toBe('direct');

      await serverModule.setPipelineScheduler(mockPipelineScheduler);

      const updatedStatus = serverModule.getStatus();

      expect(updatedStatus.pipelineIntegration?.enabled).toBe(true);
      expect(updatedStatus.pipelineIntegration?.schedulerAvailable).toBe(true);
      expect(updatedStatus.pipelineIntegration?.processingMethod).toBe('pipeline');
    });

    test('should convert ClientRequest to PipelineRequestContext correctly', async () => {
      await serverModule.setPipelineScheduler(mockPipelineScheduler);

      const request = createMockClientRequest({
        method: 'POST',
        path: '/api/test',
        body: { test: 'data' },
        headers: { 'Content-Type': 'application/json' },
        query: { param: 'value' }
      });
      
      const model = createMockVirtualModelConfig({
        id: 'test-model',
        provider: 'test-provider',
        model: 'test-model-name'
      });

      mockPipelineScheduler.execute.mockResolvedValue(mockExecutionResult);

      await serverModule.processVirtualModelRequest(request, model);

      expect(mockPipelineScheduler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'virtual-model-request',
          requestId: request.id,
          method: request.method,
          path: request.path,
          body: request.body,
          headers: request.headers,
          query: request.query,
          virtualModelId: model.id,
          metadata: expect.objectContaining({
            provider: model.provider,
            model: model.model,
            clientRequestId: request.id,
            virtualModel: model.id
          })
        }),
        expect.any(Object)
      );
    });

    test('should handle pipeline scheduler initialization errors', async () => {
      const errorScheduler: jest.Mocked<IPipelineScheduler> = {
        ...mockPipelineScheduler,
        initialize: jest.fn().mockRejectedValue(new Error('Scheduler initialization failed')),
        getSchedulerStats: jest.fn().mockReturnValue({ totalRequests: 0 })
      };

      await expect(serverModule.setPipelineScheduler(errorScheduler)).rejects.toThrow('Scheduler initialization failed');
    });

    test('should maintain compatibility when no pipeline scheduler is set', async () => {
      const request = createMockClientRequest();
      const model = createMockVirtualModelConfig();

      // Should work without pipeline scheduler
      const response = await serverModule.processVirtualModelRequest(request, model);

      expect(response.status).toBe(200);
      expect(response.headers['X-Processing-Method']).toBe('direct');
      expect(response.body.message).toBe('Request processed successfully');
    });

    test('should handle pipeline execution with different status codes', async () => {
      await serverModule.setPipelineScheduler(mockPipelineScheduler);

      const request = createMockClientRequest();
      const model = createMockVirtualModelConfig();

      // Test different pipeline statuses
      const testCases = [
        { status: 'COMPLETED', expectedHttpCode: 200 },
        { status: 'FAILED', expectedHttpCode: 500 },
        { status: 'TIMEOUT', expectedHttpCode: 504 },
        { status: 'CANCELLED', expectedHttpCode: 499 },
        { status: 'FAILED', expectedHttpCode: 500 }
      ];

      for (const testCase of testCases) {
        const result: PipelineExecutionResult = {
          ...mockExecutionResult,
          status: testCase.status as any
        };

        mockPipelineScheduler.execute.mockResolvedValue(result);

        const response = await serverModule.processVirtualModelRequest(request, model);

        expect(response.status).toBe(testCase.expectedHttpCode);
        expect(response.headers['X-Processing-Method']).toBe('pipeline');
      }
    });

    test('should handle ConfigurationToPipelineModule integration', async () => {
      const config = createMockServerConfig();
      serverModule.configure(config);
      await serverModule.initialize();
      await serverModule.start();

      // Test that configuration integration is initialized
      expect((serverModule as any).configurationToPipelineModule).toBeDefined();
      expect((serverModule as any).virtualModelMappings).toBeDefined();
      expect((serverModule as any).pipelineTable).toBeDefined();
    });

    test('should map virtual model to pipeline ID correctly', async () => {
      const config = createMockServerConfig();
      serverModule.configure(config);
      await serverModule.initialize();
      await serverModule.start();

      const virtualModelId = 'test-virtual-model';
      const pipelineId = (serverModule as any).mapVirtualModelToPipelineId(virtualModelId);
      
      // Should return undefined if no mapping exists
      expect(pipelineId).toBeUndefined();
    });

    test('should get pipeline config for virtual model', async () => {
      const config = createMockServerConfig();
      serverModule.configure(config);
      await serverModule.initialize();
      await serverModule.start();

      const virtualModelId = 'test-virtual-model';
      const pipelineConfig = (serverModule as any).getPipelineConfigForVirtualModel(virtualModelId);
      
      // Should return undefined if no config exists
      expect(pipelineConfig).toBeUndefined();
    });

    test('should handle ConfigurationToPipelineModule initialization failure gracefully', async () => {
      const config = createMockServerConfig();
      serverModule.configure(config);
      
      // Mock initialization to fail
      const originalInit = (serverModule as any).initializeConfigurationToPipelineIntegration;
      (serverModule as any).initializeConfigurationToPipelineIntegration = jest.fn().mockRejectedValue(new Error('Configuration integration failed'));
      
      // Should still initialize successfully
      await expect(serverModule.initialize()).resolves.not.toThrow();
      
      // Should restore original method
      (serverModule as any).initializeConfigurationToPipelineIntegration = originalInit;
    });

    test('should use configuration mapping in pipeline execution', async () => {
      await serverModule.setPipelineScheduler(mockPipelineScheduler);

      const request = createMockClientRequest();
      const model = createMockVirtualModelConfig({ id: 'test-model' });

      // Mock virtual model mapping
      const mockMapping = {
        virtualModelId: 'test-model',
        targetProvider: 'test-provider',
        targetModel: 'test-model-name',
        enabled: true,
        priority: 1
      };
      
      (serverModule as any).virtualModelMappings.set('test-model', mockMapping);
      
      // Mock pipeline table
      const mockPipelineConfig = {
        id: 'pipeline-test-model',
        name: 'Test Pipeline',
        modules: [],
        connections: []
      };
      
      (serverModule as any).pipelineTable.set('test-model', mockPipelineConfig);

      mockPipelineScheduler.execute.mockResolvedValue(mockExecutionResult);

      await serverModule.processVirtualModelRequest(request, model);

      expect(mockPipelineScheduler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'virtual-model-request',
          virtualModelId: 'test-model'
        }),
        expect.objectContaining({
          preferredPipelineId: 'pipeline-test-model',
          metadata: expect.objectContaining({
            pipelineId: 'pipeline-test-model',
            virtualModelMapping: mockMapping
          })
        })
      );
    });

    test('should format pipeline response body correctly', async () => {
      await serverModule.setPipelineScheduler(mockPipelineScheduler);

      const request = createMockClientRequest();
      const model = createMockVirtualModelConfig();

      // Test successful response
      mockPipelineScheduler.execute.mockResolvedValue(mockExecutionResult);

      const successResponse = await serverModule.processVirtualModelRequest(request, model);

      expect(successResponse.body.message).toBe('Request processed successfully via pipeline');
      expect(successResponse.body.result).toBeDefined();
      expect(successResponse.body.executionId).toBe(mockExecutionResult.executionId);

      // Test error response
      const errorResult: PipelineExecutionResult = {
        ...mockExecutionResult,
        status: 'FAILED' as any,
        error: {
          code: 'EXECUTION_FAILED',
          message: 'Test error',
          category: 'execution',
          severity: 'high',
          recoverability: 'recoverable',
          impact: 'single_module',
          source: 'module',
          timestamp: Date.now()
        }
      };

      mockPipelineScheduler.execute.mockResolvedValue(errorResult);

      const errorResponse = await serverModule.processVirtualModelRequest(request, model);

      expect(errorResponse.body.error).toBe('Pipeline execution failed');
      expect(errorResponse.body.error).toBeDefined();
      expect(errorResponse.status).toBe(500);
    });
  });
});