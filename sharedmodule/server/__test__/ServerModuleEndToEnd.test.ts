/**
 * Complete End-to-End Integration Tests for Server and Pipeline Scheduler
 * 
 * This test file validates the complete integration between:
 * 1. ServerModule receiving requests
 * 2. Virtual model routing
 * 3. ConfigurationToPipelineModule integration
 * 4. PipelineScheduler execution
 * 5. Response conversion and return
 */

import { jest } from '@jest/globals';
import { ServerModule } from '../src/ServerModule';
import { PipelineScheduler } from '../../../pipeline/src/PipelineScheduler';
import { ConfigurationToPipelineModule } from '../../../Configuration/src/integration/ConfigurationToPipelineModule';
import { ConfigurationSystem } from '../../../Configuration/src/core/ConfigurationSystem';
import { PipelineAssembler } from '../../../pipeline/src/PipelineAssembler';
import { VirtualModelRulesModule } from '../../../virtual-model-rules/src/VirtualModelRulesModule';
import { 
  createMockServerConfig, 
  createMockClientRequest, 
  createMockVirtualModelConfig
} from './test-utils';

// Pipeline types for testing
import { 
  IPipelineScheduler, 
  PipelineExecutionResult, 
  ExecutionOptions,
  SchedulerStats
} from '../../../pipeline/src/PipelineScheduler';

describe('Complete End-to-End Integration', () => {
  let serverModule: ServerModule;
  let mockPipelineScheduler: jest.Mocked<IPipelineScheduler>;
  let mockConfigurationSystem: any;
  let mockPipelineAssembler: any;
  let mockVirtualModelRulesModule: any;
  let mockConfigurationToPipelineModule: any;

  beforeEach(async () => {
    // Create fresh server module
    serverModule = new ServerModule();
    
    // Create mock dependencies
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

    mockConfigurationSystem = {
      initialize: jest.fn().mockResolvedValue(undefined),
      getConfiguration: jest.fn().mockReturnValue({
        settings: {
          virtualModels: {
            'test-virtual-model': {
              targetProvider: 'test-provider',
              targetModel: 'test-model',
              enabled: true,
              priority: 1
            }
          },
          providers: {
            'test-provider': {
              models: {
                'test-model': {
                  name: 'Test Model',
                  capabilities: ['text-generation']
                }
              }
            }
          }
        }
      }),
      destroy: jest.fn().mockResolvedValue(undefined)
    };

    mockPipelineAssembler = {
      assemble: jest.fn().mockResolvedValue({
        id: 'test-pipeline',
        name: 'Test Pipeline',
        modules: [],
        connections: []
      }),
      activate: jest.fn().mockResolvedValue(undefined),
      deactivate: jest.fn().mockResolvedValue(undefined),
      getActivePipeline: jest.fn().mockReturnValue('test-pipeline')
    };

    mockVirtualModelRulesModule = {
      initialize: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined)
    };

    mockConfigurationToPipelineModule = {
      initialize: jest.fn().mockResolvedValue(undefined),
      parseVirtualModelMappings: jest.fn().mockResolvedValue([
        {
          virtualModelId: 'test-virtual-model',
          targetProvider: 'test-provider',
          targetModel: 'test-model',
          enabled: true,
          priority: 1
        }
      ]),
      generatePipelineTable: jest.fn().mockResolvedValue(new Map([
        ['test-virtual-model', {
          id: 'pipeline-test-virtual-model',
          name: 'Test Virtual Model Pipeline',
          modules: [],
          connections: []
        }]
      ])),
      getPipelineConfig: jest.fn(),
      getAllPipelineConfigs: jest.fn(),
      getPipeline: jest.fn(),
      destroy: jest.fn().mockResolvedValue(undefined)
    };

    // Mock the modules in the server
    (serverModule as any).configurationSystem = mockConfigurationSystem;
    (serverModule as any).pipelineAssembler = mockPipelineAssembler;
    (serverModule as any).virtualModelRulesModule = mockVirtualModelRulesModule;
    (serverModule as any).configurationToPipelineModule = mockConfigurationToPipelineModule;
  });

  afterEach(async () => {
    if (serverModule) {
      await serverModule.destroy();
    }
  });

  describe('Complete Request Flow', () => {
    test('should handle complete end-to-end request flow', async () => {
      // Configure server
      const serverConfig = createMockServerConfig();
      serverModule.configure(serverConfig);
      
      // Initialize server
      await serverModule.initialize();
      await serverModule.start();
      
      // Set up pipeline scheduler
      await serverModule.setPipelineScheduler(mockPipelineScheduler);
      
      // Create test request
      const request = createMockClientRequest({
        id: 'end-to-end-test-request',
        method: 'POST',
        path: '/api/chat',
        body: {
          messages: [
            { role: 'user', content: 'Hello, world!' }
          ]
        }
      });
      
      // Create virtual model
      const virtualModel = createMockVirtualModelConfig({
        id: 'test-virtual-model',
        provider: 'test-provider',
        model: 'test-model'
      });
      
      // Mock successful pipeline execution
      const mockExecutionResult: PipelineExecutionResult = {
        executionId: 'test-execution-id',
        pipelineId: 'pipeline-test-virtual-model',
        instanceId: 'test-instance-id',
        status: 'COMPLETED' as any,
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        result: {
          message: 'Pipeline execution completed successfully',
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Hello! How can I help you today?'
                }
              }
            ]
          }
        },
        metadata: { test: 'metadata' },
        retryCount: 0
      };

      mockPipelineScheduler.execute.mockResolvedValue(mockExecutionResult);
      
      // Execute request
      const response = await serverModule.handleRequest(request);
      
      // Verify complete flow
      expect(response).toBeDefined();
      expect(response.id).toBe(request.id);
      expect(response.status).toBe(200);
      expect(response.headers['X-Processing-Method']).toBe('pipeline');
      expect(response.headers['X-Virtual-Model']).toBe('test-virtual-model');
      expect(response.headers['X-Pipeline-Id']).toBe('pipeline-test-virtual-model');
      expect(response.headers['X-Instance-Id']).toBe('test-instance-id');
      expect(response.headers['X-Execution-Id']).toBe('test-execution-id');
      
      // Verify response body
      expect(response.body.message).toBe('Request processed successfully via pipeline');
      expect(response.body.result).toBeDefined();
      expect(response.body.executionId).toBe('test-execution-id');
      expect(response.body.pipelineId).toBe('pipeline-test-virtual-model');
      expect(response.body.instanceId).toBe('test-instance-id');
      expect(response.body.duration).toBe(100);
      expect(response.body.retryCount).toBe(0);
      
      // Verify pipeline scheduler was called correctly
      expect(mockPipelineScheduler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'virtual-model-request',
          requestId: request.id,
          method: request.method,
          path: request.path,
          body: request.body,
          virtualModelId: virtualModel.id
        }),
        expect.objectContaining({
          preferredPipelineId: 'pipeline-test-virtual-model',
          timeout: 30000,
          maxRetries: 3,
          metadata: expect.objectContaining({
            clientRequestId: request.id,
            virtualModel: virtualModel.id,
            provider: virtualModel.provider,
            pipelineId: 'pipeline-test-virtual-model'
          })
        })
      );
    });

    test('should handle pipeline failure with fallback to direct processing', async () => {
      // Configure server
      const serverConfig = createMockServerConfig();
      serverModule.configure(serverConfig);
      
      // Initialize server
      await serverModule.initialize();
      await serverModule.start();
      
      // Set up pipeline scheduler
      await serverModule.setPipelineScheduler(mockPipelineScheduler);
      
      // Create test request
      const request = createMockClientRequest({
        id: 'fallback-test-request'
      });
      
      // Create virtual model
      const virtualModel = createMockVirtualModelConfig({
        id: 'test-virtual-model'
      });
      
      // Mock pipeline execution failure
      mockPipelineScheduler.execute.mockRejectedValue(new Error('Pipeline execution failed'));
      
      // Execute request
      const response = await serverModule.handleRequest(request);
      
      // Verify fallback to direct processing
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
      expect(response.headers['X-Processing-Method']).toBe('direct');
      expect(response.headers['X-Fallback-Reason']).toBe('pipeline-unavailable');
      expect(response.body.message).toBe('Request processed successfully via direct processing');
      expect(response.body.processingMethod).toBe('direct');
      
      // Verify pipeline scheduler was called first
      expect(mockPipelineScheduler.execute).toHaveBeenCalled();
    });

    test('should handle configuration integration during request processing', async () => {
      // Configure server
      const serverConfig = createMockServerConfig();
      serverModule.configure(serverConfig);
      
      // Initialize server
      await serverModule.initialize();
      await serverModule.start();
      
      // Verify configuration integration was initialized
      expect(mockConfigurationSystem.initialize).toHaveBeenCalled();
      expect(mockPipelineAssembler.assemble).toHaveBeenCalled();
      expect(mockConfigurationToPipelineModule.parseVirtualModelMappings).toHaveBeenCalled();
      expect(mockConfigurationToPipelineModule.generatePipelineTable).toHaveBeenCalled();
      
      // Verify virtual model mappings are loaded
      const mappings = (serverModule as any).virtualModelMappings;
      expect(mappings).toBeDefined();
      expect(mappings.get('test-virtual-model')).toBeDefined();
      
      // Verify pipeline table is loaded
      const pipelineTable = (serverModule as any).pipelineTable;
      expect(pipelineTable).toBeDefined();
      expect(pipelineTable.get('test-virtual-model')).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle pipeline scheduler initialization failure', async () => {
      // Configure server
      const serverConfig = createMockServerConfig();
      serverModule.configure(serverConfig);
      
      // Initialize server
      await serverModule.initialize();
      await serverModule.start();
      
      // Create failing pipeline scheduler
      const failingScheduler = {
        ...mockPipelineScheduler,
        initialize: jest.fn().mockRejectedValue(new Error('Scheduler initialization failed')),
        getSchedulerStats: jest.fn().mockReturnValue({ totalRequests: 0 })
      };
      
      // Should throw when setting failing scheduler
      await expect(serverModule.setPipelineScheduler(failingScheduler)).rejects.toThrow('Scheduler initialization failed');
    });

    test('should handle configuration integration initialization failure', async () => {
      // Mock configuration integration to fail
      (serverModule as any).initializeConfigurationToPipelineIntegration = jest.fn().mockRejectedValue(new Error('Configuration integration failed'));
      
      const serverConfig = createMockServerConfig();
      serverModule.configure(serverConfig);
      
      // Should still initialize successfully
      await expect(serverModule.initialize()).resolves.not.toThrow();
      
      // Should be able to start
      await expect(serverModule.start()).resolves.not.toThrow();
    });

    test('should handle virtual model mapping not found', async () => {
      // Configure server
      const serverConfig = createMockServerConfig();
      serverModule.configure(serverConfig);
      
      // Initialize server
      await serverModule.initialize();
      await serverModule.start();
      
      // Set up pipeline scheduler
      await serverModule.setPipelineScheduler(mockPipelineScheduler);
      
      // Create request with unknown virtual model
      const request = createMockClientRequest({
        id: 'unknown-model-test'
      });
      
      // Create virtual model with unknown ID
      const virtualModel = createMockVirtualModelConfig({
        id: 'unknown-virtual-model'
      });
      
      // Mock pipeline execution
      const mockExecutionResult: PipelineExecutionResult = {
        executionId: 'test-execution-id',
        pipelineId: 'unknown-virtual-model', // Fallback to virtual model ID
        instanceId: 'test-instance-id',
        status: 'COMPLETED' as any,
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        result: { message: 'Success' },
        metadata: {},
        retryCount: 0
      };

      mockPipelineScheduler.execute.mockResolvedValue(mockExecutionResult);
      
      // Should still work with fallback to virtual model ID
      const response = await serverModule.handleRequest(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
      expect(response.headers['X-Virtual-Model']).toBe('unknown-virtual-model');
      
      // Verify pipeline was called with virtual model ID as fallback
      expect(mockPipelineScheduler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          virtualModelId: 'unknown-virtual-model'
        }),
        expect.objectContaining({
          preferredPipelineId: 'unknown-virtual-model' // Fallback to virtual model ID
        })
      );
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent requests efficiently', async () => {
      // Configure server
      const serverConfig = createMockServerConfig();
      serverModule.configure(serverConfig);
      
      // Initialize server
      await serverModule.initialize();
      await serverModule.start();
      
      // Set up pipeline scheduler
      await serverModule.setPipelineScheduler(mockPipelineScheduler);
      
      // Mock successful pipeline execution
      const mockExecutionResult: PipelineExecutionResult = {
        executionId: 'test-execution-id',
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance-id',
        status: 'COMPLETED' as any,
        startTime: Date.now() - 50,
        endTime: Date.now(),
        duration: 50,
        result: { message: 'Success' },
        metadata: {},
        retryCount: 0
      };

      mockPipelineScheduler.execute.mockResolvedValue(mockExecutionResult);
      
      // Create concurrent requests
      const concurrentRequests = 20;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => 
        createMockClientRequest({ id: `concurrent-test-${i}` })
      );
      
      const virtualModel = createMockVirtualModelConfig({
        id: 'test-virtual-model'
      });
      
      // Execute concurrent requests
      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map(request => serverModule.handleRequest(request))
      );
      const totalTime = Date.now() - startTime;
      
      // Verify all requests were handled
      expect(responses).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(3000); // Should handle 20 requests in under 3 seconds
      
      // Verify all responses are successful
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBe(concurrentRequests);
      
      // Verify pipeline scheduler was called for each request
      expect(mockPipelineScheduler.execute).toHaveBeenCalledTimes(concurrentRequests);
    });

    test('should handle mixed success and failure scenarios', async () => {
      // Configure server
      const serverConfig = createMockServerConfig();
      serverModule.configure(serverConfig);
      
      // Initialize server
      await serverModule.initialize();
      await serverModule.start();
      
      // Set up pipeline scheduler
      await serverModule.setPipelineScheduler(mockPipelineScheduler);
      
      // Mock mixed results - some success, some failure
      let callCount = 0;
      mockPipelineScheduler.execute.mockImplementation(async () => {
        callCount++;
        if (callCount % 3 === 0) {
          // Every third request fails
          throw new Error('Pipeline execution failed');
        }
        
        return {
          executionId: `test-execution-id-${callCount}`,
          pipelineId: 'test-pipeline',
          instanceId: 'test-instance-id',
          status: 'COMPLETED' as any,
          startTime: Date.now() - 50,
          endTime: Date.now(),
          duration: 50,
          result: { message: 'Success' },
          metadata: {},
          retryCount: 0
        };
      });
      
      // Create requests
      const requestCount = 9;
      const requests = Array.from({ length: requestCount }, (_, i) => 
        createMockClientRequest({ id: `mixed-test-${i}` })
      );
      
      const virtualModel = createMockVirtualModelConfig({
        id: 'test-virtual-model'
      });
      
      // Execute requests
      const responses = await Promise.all(
        requests.map(request => serverModule.handleRequest(request))
      );
      
      // Verify all requests were handled
      expect(responses).toHaveLength(requestCount);
      
      // Verify mixed processing methods
      const pipelineResponses = responses.filter(r => r.headers['X-Processing-Method'] === 'pipeline');
      const directResponses = responses.filter(r => r.headers['X-Processing-Method'] === 'direct');
      
      expect(pipelineResponses.length).toBe(6); // 2/3 should succeed via pipeline
      expect(directResponses.length).toBe(3); // 1/3 should fallback to direct
      
      // Verify all responses are successful (either pipeline or direct)
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBe(requestCount);
    });
  });

  describe('Cleanup and Resource Management', () => {
    test('should clean up all resources properly', async () => {
      // Configure server
      const serverConfig = createMockServerConfig();
      serverModule.configure(serverConfig);
      
      // Initialize server
      await serverModule.initialize();
      await serverModule.start();
      
      // Set up pipeline scheduler
      await serverModule.setPipelineScheduler(mockPipelineScheduler);
      
      // Verify resources are initialized
      expect((serverModule as any).configurationSystem).toBeDefined();
      expect((serverModule as any).pipelineAssembler).toBeDefined();
      expect((serverModule as any).virtualModelRulesModule).toBeDefined();
      expect((serverModule as any).configurationToPipelineModule).toBeDefined();
      expect((serverModule as any).pipelineScheduler).toBeDefined();
      
      // Destroy server
      await serverModule.destroy();
      
      // Verify cleanup methods were called
      expect(mockConfigurationSystem.destroy).toHaveBeenCalled();
      expect(mockVirtualModelRulesModule.destroy).toHaveBeenCalled();
      expect(mockConfigurationToPipelineModule.destroy).toHaveBeenCalled();
      expect(mockPipelineAssembler.deactivate).toHaveBeenCalled();
      expect(mockPipelineScheduler.shutdown).toHaveBeenCalled();
    });
  });
});