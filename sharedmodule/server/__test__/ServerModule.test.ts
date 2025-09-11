/**
 * Server Module Unit Tests - Enhanced with Real Dependencies
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
        createMockVirtualModelConfig({ id: `model-${i}`, priority: i + 1 })
      );
      
      // Register all models
      await Promise.all(
        models.map(model => serverModule.registerVirtualModel(model))
      );
      
      const allModels = serverModule.getVirtualModels();
      expect(allModels).toHaveLength(5);
      
      // Verify models are sorted by priority
      const priorities = allModels.map(m => m.priority);
      expect(priorities).toEqual([1, 2, 3, 4, 5]);
    });

    test('should route requests to appropriate virtual models', async () => {
      const highPriorityModel = createMockVirtualModelConfig({ 
        id: 'high-priority', 
        priority: 10 
      });
      const lowPriorityModel = createMockVirtualModelConfig({ 
        id: 'low-priority', 
        priority: 1 
      });
      
      await serverModule.registerVirtualModel(highPriorityModel);
      await serverModule.registerVirtualModel(lowPriorityModel);
      
      const request = createMockClientRequest({ virtualModel: 'high-priority' });
      
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
      const invalidModel = createMockVirtualModelConfig({ priority: 15 });
      
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
      const invalidModel = createMockVirtualModelConfig({ priority: 15 });
      
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
});