/**
 * Configuration System Performance Tests
 * 
 * Comprehensive performance testing suite for the Configuration System
 * focusing on benchmarks, load testing, memory usage, and scalability.
 * 
 * Test Categories:
 * - Load Performance: Large file handling, concurrent operations
 * - Memory Efficiency: Memory usage patterns, leak detection
 * - Network Performance: WebSocket throughput, API response times
 * - Scalability: Multi-user scenarios, resource limits
 * - Stress Testing: System behavior under extreme conditions
 * 
 * @author RCC Testing Framework
 * @version 1.0.0
 */

import { describe, beforeEach, afterEach, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { performance, PerformanceObserver } from 'perf_hooks';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Worker } from 'worker_threads';

// Import Configuration System modules
import { ConfigLoaderModule } from '../src/ConfigLoaderModule';
import { ConfigValidatorModule } from '../src/ConfigValidatorModule';
import { ConfigPersistenceModule } from '../src/ConfigPersistenceModule';
import { ConfigUIModule } from '../src/ConfigUIModule';
import { StatusLineModule } from '../../StatusLine/src/StatusLineModule';

// Import module registry
import { ModuleRegistry } from '../../../registry/ModuleRegistry';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';

// Import test data
import { testData } from './fixtures/test-data';

// Performance measurement interfaces
interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface BenchmarkResult {
  name: string;
  iterations: number;
  duration: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  throughput: number;
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
    delta: number;
  };
  cpuUsage?: number;
  metadata?: Record<string, any>;
}

interface LoadTestResult {
  scenario: string;
  users: number;
  duration: number;
  totalOperations: number;
  successfulOperations: number;
  errorRate: number;
  avgResponseTime: number;
  throughput: number;
  resourceUsage: {
    memory: number;
    cpu: number;
  };
}

/**
 * Performance Testing Suite for Configuration System
 */
describe('Configuration System Performance Tests', () => {
  let registry: ModuleRegistry;
  let testDir: string;
  let modules: {
    loader: ConfigLoaderModule;
    validator: ConfigValidatorModule;
    persistence: ConfigPersistenceModule;
    ui: ConfigUIModule;
    statusLine: StatusLineModule;
  };

  // Performance tracking
  let performanceObserver: PerformanceObserver;
  let performanceMetrics: PerformanceMetric[] = [];
  let benchmarkResults: BenchmarkResult[] = [];

  beforeAll(async () => {
    console.log('⚡ Starting Configuration System Performance Tests...');
    
    // Setup performance monitoring
    performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        performanceMetrics.push({
          name: entry.name,
          value: entry.duration,
          unit: 'ms',
          timestamp: entry.startTime,
          metadata: { type: entry.entryType }
        });
      }
    });
    performanceObserver.observe({ entryTypes: ['measure', 'mark'] });

    // Create test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rcc-perf-tests-'));
    console.log(`📁 Performance test directory: ${testDir}`);
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up Performance Tests...');
    
    if (performanceObserver) {
      performanceObserver.disconnect();
    }

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`⚠️ Failed to clean up test directory: ${error}`);
    }

    // Generate performance report
    await generatePerformanceReport();
  });

  beforeEach(async () => {
    // Initialize modules
    registry = ModuleRegistry.getInstance();
    registry.clear();

    const moduleInfos = {
      loader: createModuleInfo('config-loader-perf', 'config-loader'),
      validator: createModuleInfo('config-validator-perf', 'config-validator'),
      persistence: createModuleInfo('config-persistence-perf', 'config-persistence'),
      ui: createModuleInfo('config-ui-perf', 'config-ui'),
      statusLine: createModuleInfo('status-line-perf', 'status-line')
    };

    modules = {
      loader: new ConfigLoaderModule(moduleInfos.loader),
      validator: new ConfigValidatorModule(moduleInfos.validator),
      persistence: new ConfigPersistenceModule(moduleInfos.persistence),
      ui: new ConfigUIModule(moduleInfos.ui),
      statusLine: new StatusLineModule(moduleInfos.statusLine)
    };

    // Initialize all modules
    await Promise.all([
      modules.loader.initialize(),
      modules.validator.initialize(),
      modules.persistence.initialize(),
      modules.ui.initialize(),
      modules.statusLine.initialize()
    ]);

    // Clear performance metrics for this test
    performance.clearMarks();
    performance.clearMeasures();
  });

  afterEach(async () => {
    // Clean up modules
    await Promise.all([
      modules.loader.destroy(),
      modules.validator.destroy(),
      modules.persistence.destroy(),
      modules.ui.destroy(),
      modules.statusLine.destroy()
    ]);
  });

  /**
   * Load Performance Tests
   */
  describe('Load Performance Tests', () => {
    it('should handle large configuration files efficiently', async () => {
      const startMark = 'large-config-start';
      const endMark = 'large-config-end';
      
      performance.mark(startMark);
      
      // Create large configuration (10MB)
      const largeConfig = generateLargeConfiguration(10 * 1024 * 1024); // 10MB
      const configPath = path.join(testDir, 'large-config.json');
      await fs.writeFile(configPath, JSON.stringify(largeConfig, null, 2));

      const memoryBefore = getMemoryUsage();
      
      // Load large configuration
      const loadResult = await modules.loader.loadFromFile(configPath);
      
      performance.mark(endMark);
      performance.measure('large-config-load', startMark, endMark);
      
      const memoryAfter = getMemoryUsage();
      const loadTime = performance.getEntriesByName('large-config-load')[0].duration;
      
      // Assertions
      expect(loadResult.parsed).toBeDefined();
      expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
      expect(memoryAfter - memoryBefore).toBeLessThan(100 * 1024 * 1024); // Memory increase < 100MB
      
      console.log(`📊 Large config loaded in ${loadTime.toFixed(2)}ms`);
      console.log(`💾 Memory usage: +${((memoryAfter - memoryBefore) / 1024 / 1024).toFixed(2)}MB`);

      // Record benchmark
      benchmarkResults.push({
        name: 'Large Configuration Loading',
        iterations: 1,
        duration: loadTime,
        avgTime: loadTime,
        minTime: loadTime,
        maxTime: loadTime,
        throughput: (10 * 1024 * 1024) / (loadTime / 1000), // bytes per second
        memoryUsage: {
          initial: memoryBefore,
          peak: memoryAfter,
          final: getMemoryUsage(),
          delta: memoryAfter - memoryBefore
        },
        metadata: { fileSize: '10MB', format: 'JSON' }
      });
    });

    it('should handle concurrent file loading efficiently', async () => {
      const concurrentLoads = 20;
      const configSize = 1024 * 1024; // 1MB each
      
      performance.mark('concurrent-loads-start');
      
      // Create multiple config files
      const loadPromises = [];
      for (let i = 0; i < concurrentLoads; i++) {
        const config = generateLargeConfiguration(configSize);
        const configPath = path.join(testDir, `concurrent-config-${i}.json`);
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        
        loadPromises.push(modules.loader.loadFromFile(configPath));
      }
      
      const memoryBefore = getMemoryUsage();
      
      // Execute concurrent loads
      const results = await Promise.all(loadPromises);
      
      performance.mark('concurrent-loads-end');
      performance.measure('concurrent-loads', 'concurrent-loads-start', 'concurrent-loads-end');
      
      const memoryAfter = getMemoryUsage();
      const totalTime = performance.getEntriesByName('concurrent-loads')[0].duration;
      
      // Verify all loads succeeded
      expect(results).toHaveLength(concurrentLoads);
      results.forEach((result, index) => {
        expect(result.parsed).toBeDefined();
      });
      
      const avgTimePerLoad = totalTime / concurrentLoads;
      const throughput = (concurrentLoads * configSize) / (totalTime / 1000); // bytes per second
      
      console.log(`📊 ${concurrentLoads} concurrent loads in ${totalTime.toFixed(2)}ms`);
      console.log(`⚡ Average per load: ${avgTimePerLoad.toFixed(2)}ms`);
      console.log(`🚀 Throughput: ${(throughput / 1024 / 1024).toFixed(2)} MB/s`);
      
      expect(totalTime).toBeLessThan(10000); // Should complete in under 10 seconds
      expect(avgTimePerLoad).toBeLessThan(500); // Each load should average under 500ms

      benchmarkResults.push({
        name: 'Concurrent File Loading',
        iterations: concurrentLoads,
        duration: totalTime,
        avgTime: avgTimePerLoad,
        minTime: 0, // Would need individual timing to get actual min/max
        maxTime: 0,
        throughput,
        memoryUsage: {
          initial: memoryBefore,
          peak: memoryAfter,
          final: getMemoryUsage(),
          delta: memoryAfter - memoryBefore
        }
      });
    });
  });

  /**
   * Validation Performance Tests
   */
  describe('Validation Performance Tests', () => {
    it('should validate complex configurations efficiently', async () => {
      const iterations = 100;
      const complexConfig = testData.sampleConfigurations.complex;
      
      performance.mark('validation-benchmark-start');
      const memoryBefore = getMemoryUsage();
      
      const validationTimes: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const result = await modules.validator.validateComplete(complexConfig, {
          level: 'comprehensive' as any,
          validateDefaults: true
        });
        const end = performance.now();
        
        expect(result.isValid).toBe(true);
        validationTimes.push(end - start);
      }
      
      performance.mark('validation-benchmark-end');
      performance.measure('validation-benchmark', 'validation-benchmark-start', 'validation-benchmark-end');
      
      const memoryAfter = getMemoryUsage();
      const totalTime = performance.getEntriesByName('validation-benchmark')[0].duration;
      
      const avgTime = validationTimes.reduce((a, b) => a + b, 0) / validationTimes.length;
      const minTime = Math.min(...validationTimes);
      const maxTime = Math.max(...validationTimes);
      const throughput = iterations / (totalTime / 1000); // validations per second
      
      console.log(`📊 ${iterations} validations in ${totalTime.toFixed(2)}ms`);
      console.log(`⚡ Average: ${avgTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
      console.log(`🚀 Throughput: ${throughput.toFixed(2)} validations/sec`);
      
      expect(avgTime).toBeLessThan(100); // Average validation should be under 100ms
      expect(maxTime).toBeLessThan(500); // No single validation should exceed 500ms

      benchmarkResults.push({
        name: 'Configuration Validation',
        iterations,
        duration: totalTime,
        avgTime,
        minTime,
        maxTime,
        throughput,
        memoryUsage: {
          initial: memoryBefore,
          peak: memoryAfter,
          final: getMemoryUsage(),
          delta: memoryAfter - memoryBefore
        }
      });
    });

    it('should handle validation under concurrent load', async () => {
      const concurrentValidations = 50;
      const testConfigs = Array.from({ length: concurrentValidations }, (_, i) => ({
        ...testData.sampleConfigurations.basic,
        id: i,
        timestamp: Date.now()
      }));
      
      performance.mark('concurrent-validation-start');
      const memoryBefore = getMemoryUsage();
      
      const validationPromises = testConfigs.map(config => 
        modules.validator.validateComplete(config)
      );
      
      const results = await Promise.all(validationPromises);
      
      performance.mark('concurrent-validation-end');
      performance.measure('concurrent-validation', 'concurrent-validation-start', 'concurrent-validation-end');
      
      const memoryAfter = getMemoryUsage();
      const totalTime = performance.getEntriesByName('concurrent-validation')[0].duration;
      
      // Verify all validations succeeded
      const successfulValidations = results.filter(r => r.isValid).length;
      expect(successfulValidations).toBe(concurrentValidations);
      
      const avgTimePerValidation = totalTime / concurrentValidations;
      const throughput = concurrentValidations / (totalTime / 1000);
      
      console.log(`📊 ${concurrentValidations} concurrent validations in ${totalTime.toFixed(2)}ms`);
      console.log(`⚡ Average per validation: ${avgTimePerValidation.toFixed(2)}ms`);
      console.log(`🚀 Throughput: ${throughput.toFixed(2)} validations/sec`);
      
      expect(totalTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(avgTimePerValidation).toBeLessThan(100); // Each should average under 100ms
    });
  });

  /**
   * Persistence Performance Tests
   */
  describe('Persistence Performance Tests', () => {
    it('should handle rapid save operations efficiently', async () => {
      const saveOperations = 100;
      const configs = Array.from({ length: saveOperations }, (_, i) => ({
        ...testData.sampleConfigurations.basic,
        id: i,
        timestamp: Date.now() + i
      }));
      
      performance.mark('rapid-saves-start');
      const memoryBefore = getMemoryUsage();
      
      const savePromises = configs.map(config => 
        modules.persistence.saveConfiguration(config)
      );
      
      const results = await Promise.all(savePromises);
      
      performance.mark('rapid-saves-end');
      performance.measure('rapid-saves', 'rapid-saves-start', 'rapid-saves-end');
      
      const memoryAfter = getMemoryUsage();
      const totalTime = performance.getEntriesByName('rapid-saves')[0].duration;
      
      // Verify all saves succeeded
      const successfulSaves = results.filter(r => r.success).length;
      expect(successfulSaves).toBe(saveOperations);
      
      const avgTimePerSave = totalTime / saveOperations;
      const throughput = saveOperations / (totalTime / 1000);
      
      console.log(`📊 ${saveOperations} save operations in ${totalTime.toFixed(2)}ms`);
      console.log(`⚡ Average per save: ${avgTimePerSave.toFixed(2)}ms`);
      console.log(`🚀 Throughput: ${throughput.toFixed(2)} saves/sec`);
      
      expect(totalTime).toBeLessThan(10000); // Should complete in under 10 seconds
      expect(avgTimePerSave).toBeLessThan(100); // Each save should average under 100ms

      benchmarkResults.push({
        name: 'Rapid Save Operations',
        iterations: saveOperations,
        duration: totalTime,
        avgTime: avgTimePerSave,
        minTime: 0,
        maxTime: 0,
        throughput,
        memoryUsage: {
          initial: memoryBefore,
          peak: memoryAfter,
          final: getMemoryUsage(),
          delta: memoryAfter - memoryBefore
        }
      });
    });

    it('should maintain performance with large backup operations', async () => {
      const largeConfig = generateLargeConfiguration(5 * 1024 * 1024); // 5MB
      const configPath = path.join(testDir, 'backup-perf-config.json');
      await fs.writeFile(configPath, JSON.stringify(largeConfig, null, 2));
      
      const backupOperations = 10;
      
      performance.mark('backup-operations-start');
      const memoryBefore = getMemoryUsage();
      
      const backupPromises = [];
      for (let i = 0; i < backupOperations; i++) {
        backupPromises.push(
          modules.persistence.createBackup(configPath, `perf-backup-${i}`)
        );
      }
      
      const results = await Promise.all(backupPromises);
      
      performance.mark('backup-operations-end');
      performance.measure('backup-operations', 'backup-operations-start', 'backup-operations-end');
      
      const memoryAfter = getMemoryUsage();
      const totalTime = performance.getEntriesByName('backup-operations')[0].duration;
      
      // Verify all backups succeeded
      const successfulBackups = results.filter(r => r.success).length;
      expect(successfulBackups).toBe(backupOperations);
      
      const avgTimePerBackup = totalTime / backupOperations;
      
      console.log(`📊 ${backupOperations} backup operations (5MB each) in ${totalTime.toFixed(2)}ms`);
      console.log(`⚡ Average per backup: ${avgTimePerBackup.toFixed(2)}ms`);
      
      expect(totalTime).toBeLessThan(30000); // Should complete in under 30 seconds
      expect(avgTimePerBackup).toBeLessThan(3000); // Each backup should be under 3 seconds
    });
  });

  /**
   * UI Performance Tests
   */
  describe('UI Performance Tests', () => {
    let serverPort: number;

    beforeEach(async () => {
      serverPort = await findFreePort();
      modules.ui.configure({ port: serverPort, host: 'localhost' });
    });

    afterEach(async () => {
      try {
        await modules.ui.stopWebServer();
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should handle high-frequency API requests', async () => {
      await modules.ui.startWebServer(serverPort);
      
      const requestCount = 200;
      const testData = { name: 'api-perf-test', value: Math.random() };
      
      performance.mark('api-requests-start');
      
      const requestPromises = Array.from({ length: requestCount }, (_, i) =>
        fetch(`http://localhost:${serverPort}/api/v1/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...testData, id: i })
        })
      );
      
      const responses = await Promise.all(requestPromises);
      
      performance.mark('api-requests-end');
      performance.measure('api-requests', 'api-requests-start', 'api-requests-end');
      
      const totalTime = performance.getEntriesByName('api-requests')[0].duration;
      
      // Verify all requests succeeded
      const successfulRequests = responses.filter(r => r.ok).length;
      expect(successfulRequests).toBe(requestCount);
      
      const avgResponseTime = totalTime / requestCount;
      const throughput = requestCount / (totalTime / 1000);
      
      console.log(`📊 ${requestCount} API requests in ${totalTime.toFixed(2)}ms`);
      console.log(`⚡ Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`🚀 Throughput: ${throughput.toFixed(2)} requests/sec`);
      
      expect(avgResponseTime).toBeLessThan(100); // Average response under 100ms
      expect(throughput).toBeGreaterThan(20); // At least 20 requests/sec

      benchmarkResults.push({
        name: 'API Request Performance',
        iterations: requestCount,
        duration: totalTime,
        avgTime: avgResponseTime,
        minTime: 0,
        maxTime: 0,
        throughput,
        memoryUsage: {
          initial: 0,
          peak: getMemoryUsage(),
          final: 0,
          delta: 0
        }
      });
    });

    it('should handle multiple WebSocket connections efficiently', async () => {
      await modules.ui.startWebServer(serverPort);
      
      const connectionCount = 50;
      const messagesPerConnection = 10;
      
      performance.mark('websocket-test-start');
      const memoryBefore = getMemoryUsage();
      
      // Create WebSocket connections (simulated)
      const connections = Array.from({ length: connectionCount }, (_, i) => ({
        id: i,
        connected: true,
        messageCount: 0
      }));
      
      // Simulate message broadcasting
      for (let msg = 0; msg < messagesPerConnection; msg++) {
        const broadcastStart = performance.now();
        
        // Simulate broadcasting to all connections
        const broadcastPromises = connections.map(conn => 
          modules.ui.handleConfigurationRequest({
            action: 'UPDATE' as any,
            data: { message: `broadcast-${msg}`, connectionId: conn.id },
            sessionId: `session-${conn.id}`,
            timestamp: Date.now()
          })
        );
        
        await Promise.all(broadcastPromises);
        
        const broadcastTime = performance.now() - broadcastStart;
        console.log(`📡 Broadcast ${msg + 1}/${messagesPerConnection} to ${connectionCount} connections: ${broadcastTime.toFixed(2)}ms`);
        
        expect(broadcastTime).toBeLessThan(1000); // Each broadcast should be under 1 second
      }
      
      performance.mark('websocket-test-end');
      performance.measure('websocket-test', 'websocket-test-start', 'websocket-test-end');
      
      const memoryAfter = getMemoryUsage();
      const totalTime = performance.getEntriesByName('websocket-test')[0].duration;
      const totalMessages = connectionCount * messagesPerConnection;
      
      const avgTimePerMessage = totalTime / totalMessages;
      const throughput = totalMessages / (totalTime / 1000);
      
      console.log(`📊 ${totalMessages} WebSocket messages in ${totalTime.toFixed(2)}ms`);
      console.log(`⚡ Average per message: ${avgTimePerMessage.toFixed(2)}ms`);
      console.log(`🚀 Throughput: ${throughput.toFixed(2)} messages/sec`);
      
      expect(totalTime).toBeLessThan(30000); // Should complete in under 30 seconds
      expect(avgTimePerMessage).toBeLessThan(50); // Each message should be under 50ms
    });
  });

  /**
   * Memory Efficiency Tests
   */
  describe('Memory Efficiency Tests', () => {
    it('should not have memory leaks during repeated operations', async () => {
      const iterations = 1000;
      const memoryCheckpoints: number[] = [];
      
      // Initial memory reading
      global.gc && global.gc(); // Force garbage collection if available
      const initialMemory = getMemoryUsage();
      memoryCheckpoints.push(initialMemory);
      
      performance.mark('memory-leak-test-start');
      
      for (let i = 0; i < iterations; i++) {
        // Perform various operations that could potentially leak memory
        const config = testData.generators.randomConfig('small');
        
        // Load, validate, and persist
        const configPath = path.join(testDir, `memory-test-${i}.json`);
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        
        const loadResult = await modules.loader.loadFromFile(configPath);
        const validationResult = await modules.validator.validateComplete(loadResult.parsed);
        
        if (validationResult.isValid) {
          await modules.persistence.saveConfiguration(loadResult.parsed);
        }
        
        // Check memory every 100 iterations
        if (i % 100 === 0) {
          global.gc && global.gc(); // Force garbage collection
          memoryCheckpoints.push(getMemoryUsage());
          
          // Clean up file to prevent disk space issues
          try {
            await fs.unlink(configPath);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      }
      
      performance.mark('memory-leak-test-end');
      performance.measure('memory-leak-test', 'memory-leak-test-start', 'memory-leak-test-end');
      
      const totalTime = performance.getEntriesByName('memory-leak-test')[0].duration;
      const finalMemory = getMemoryUsage();
      
      // Analyze memory usage pattern
      const memoryGrowth = finalMemory - initialMemory;
      const maxMemory = Math.max(...memoryCheckpoints);
      const memoryGrowthPercentage = ((finalMemory - initialMemory) / initialMemory) * 100;
      
      console.log(`📊 Memory analysis after ${iterations} operations:`);
      console.log(`💾 Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`💾 Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`💾 Peak: ${(maxMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`📈 Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB (${memoryGrowthPercentage.toFixed(2)}%)`);
      
      // Memory should not grow excessively (less than 50% increase)
      expect(memoryGrowthPercentage).toBeLessThan(50);
      
      // Memory should not exceed 500MB
      expect(maxMemory).toBeLessThan(500 * 1024 * 1024);

      benchmarkResults.push({
        name: 'Memory Leak Test',
        iterations,
        duration: totalTime,
        avgTime: totalTime / iterations,
        minTime: 0,
        maxTime: 0,
        throughput: iterations / (totalTime / 1000),
        memoryUsage: {
          initial: initialMemory,
          peak: maxMemory,
          final: finalMemory,
          delta: memoryGrowth
        },
        metadata: { 
          memoryGrowthPercentage: memoryGrowthPercentage.toFixed(2) + '%',
          checkpoints: memoryCheckpoints.length
        }
      });
    });
  });

  /**
   * Stress Testing
   */
  describe('Stress Testing', () => {
    it('should handle extreme load conditions', async () => {
      const extremeConfig = generateLargeConfiguration(50 * 1024 * 1024); // 50MB
      const configPath = path.join(testDir, 'extreme-config.json');
      
      console.log('⚠️  Starting extreme load test - this may take several minutes...');
      
      performance.mark('extreme-load-start');
      const memoryBefore = getMemoryUsage();
      
      // Write extreme configuration
      console.log('📝 Writing 50MB configuration file...');
      await fs.writeFile(configPath, JSON.stringify(extremeConfig, null, 2));
      
      // Load extreme configuration
      console.log('📖 Loading extreme configuration...');
      const loadResult = await modules.loader.loadFromFile(configPath);
      expect(loadResult.parsed).toBeDefined();
      
      // Validate extreme configuration
      console.log('✅ Validating extreme configuration...');
      const validationResult = await modules.validator.validateComplete(loadResult.parsed);
      expect(validationResult.isValid).toBe(true);
      
      // Persist extreme configuration
      console.log('💾 Persisting extreme configuration...');
      const persistResult = await modules.persistence.saveConfiguration(loadResult.parsed);
      expect(persistResult.success).toBe(true);
      
      performance.mark('extreme-load-end');
      performance.measure('extreme-load', 'extreme-load-start', 'extreme-load-end');
      
      const memoryAfter = getMemoryUsage();
      const totalTime = performance.getEntriesByName('extreme-load')[0].duration;
      
      console.log(`📊 Extreme load test completed in ${(totalTime / 1000).toFixed(2)} seconds`);
      console.log(`💾 Memory usage: +${((memoryAfter - memoryBefore) / 1024 / 1024).toFixed(2)}MB`);
      
      // System should survive extreme load (may take up to 2 minutes)
      expect(totalTime).toBeLessThan(120000); // 2 minutes
      
      // Memory should not exceed 1GB
      expect(memoryAfter).toBeLessThan(1024 * 1024 * 1024);

      benchmarkResults.push({
        name: 'Extreme Load Test',
        iterations: 1,
        duration: totalTime,
        avgTime: totalTime,
        minTime: totalTime,
        maxTime: totalTime,
        throughput: (50 * 1024 * 1024) / (totalTime / 1000), // bytes per second
        memoryUsage: {
          initial: memoryBefore,
          peak: memoryAfter,
          final: getMemoryUsage(),
          delta: memoryAfter - memoryBefore
        },
        metadata: { 
          configSize: '50MB',
          testType: 'extreme-load'
        }
      });
    });
  });

  // Helper Functions

  function createModuleInfo(id: string, type: string): ModuleInfo {
    return {
      id,
      name: `${type} Performance Test Module`,
      version: '1.0.0',
      description: `Performance testing module for ${type}`,
      type
    };
  }

  function generateLargeConfiguration(targetSize: number): any {
    const config: any = {
      metadata: {
        name: 'performance-test-config',
        version: '1.0.0',
        generated: true,
        targetSize: targetSize,
        timestamp: Date.now()
      },
      sections: {}
    };

    let currentSize = JSON.stringify(config).length;
    let sectionIndex = 0;

    while (currentSize < targetSize) {
      const sectionName = `section_${sectionIndex}`;
      config.sections[sectionName] = {};

      // Add properties to reach target size
      let propIndex = 0;
      while (currentSize < targetSize && propIndex < 100) {
        const propName = `property_${propIndex}`;
        const propValue = {
          value: `test_value_${sectionIndex}_${propIndex}_${Math.random().toString(36).substr(2, 20)}`,
          type: 'string',
          metadata: {
            created: Date.now(),
            section: sectionIndex,
            property: propIndex,
            data: new Array(100).fill(0).map(() => Math.random().toString(36)).join('')
          }
        };

        config.sections[sectionName][propName] = propValue;
        currentSize = JSON.stringify(config).length;
        propIndex++;
      }

      sectionIndex++;
      
      // Prevent infinite loop
      if (sectionIndex > 10000) break;
    }

    return config;
  }

  function getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  async function findFreePort(): Promise<number> {
    return new Promise((resolve) => {
      const server = require('net').createServer();
      server.listen(0, () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
    });
  }

  async function generatePerformanceReport(): Promise<void> {
    console.log('\n📊 Performance Test Summary Report');
    console.log('=' .repeat(60));
    
    // Overall statistics
    const totalBenchmarks = benchmarkResults.length;
    const totalOperations = benchmarkResults.reduce((sum, b) => sum + b.iterations, 0);
    const totalTime = benchmarkResults.reduce((sum, b) => sum + b.duration, 0);
    
    console.log(`Total Benchmarks: ${totalBenchmarks}`);
    console.log(`Total Operations: ${totalOperations.toLocaleString()}`);
    console.log(`Total Time: ${(totalTime / 1000).toFixed(2)} seconds`);
    console.log(`Overall Throughput: ${(totalOperations / (totalTime / 1000)).toFixed(2)} ops/sec`);
    console.log('');

    // Individual benchmark results
    benchmarkResults.forEach((benchmark, index) => {
      console.log(`${index + 1}. ${benchmark.name}`);
      console.log(`   Iterations: ${benchmark.iterations.toLocaleString()}`);
      console.log(`   Duration: ${(benchmark.duration / 1000).toFixed(2)}s`);
      console.log(`   Avg Time: ${benchmark.avgTime.toFixed(2)}ms`);
      console.log(`   Throughput: ${benchmark.throughput.toFixed(2)} ops/sec`);
      console.log(`   Memory Delta: ${(benchmark.memoryUsage.delta / 1024 / 1024).toFixed(2)}MB`);
      
      if (benchmark.metadata) {
        Object.entries(benchmark.metadata).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }
      console.log('');
    });

    // Performance thresholds check
    console.log('🎯 Performance Threshold Analysis');
    console.log('-'.repeat(40));
    
    const thresholds = {
      'Large Configuration Loading': { maxTime: 3000, benchmark: benchmarkResults.find(b => b.name === 'Large Configuration Loading') },
      'Configuration Validation': { maxAvgTime: 100, benchmark: benchmarkResults.find(b => b.name === 'Configuration Validation') },
      'API Request Performance': { maxAvgTime: 100, benchmark: benchmarkResults.find(b => b.name === 'API Request Performance') },
      'Memory Leak Test': { maxMemoryGrowth: 50, benchmark: benchmarkResults.find(b => b.name === 'Memory Leak Test') }
    };

    let allThresholdsPassed = true;
    
    Object.entries(thresholds).forEach(([name, threshold]) => {
      if (threshold.benchmark) {
        let passed = true;
        let message = '';
        
        if ('maxTime' in threshold && threshold.benchmark.duration > threshold.maxTime) {
          passed = false;
          message = `Duration ${threshold.benchmark.duration.toFixed(2)}ms > ${threshold.maxTime}ms`;
        } else if ('maxAvgTime' in threshold && threshold.benchmark.avgTime > threshold.maxAvgTime) {
          passed = false;
          message = `Avg time ${threshold.benchmark.avgTime.toFixed(2)}ms > ${threshold.maxAvgTime}ms`;
        } else if ('maxMemoryGrowth' in threshold) {
          const growthPercent = parseFloat(threshold.benchmark.metadata?.memoryGrowthPercentage?.replace('%', '') || '0');
          if (growthPercent > threshold.maxMemoryGrowth) {
            passed = false;
            message = `Memory growth ${growthPercent}% > ${threshold.maxMemoryGrowth}%`;
          }
        }
        
        if (!passed) allThresholdsPassed = false;
        
        console.log(`${passed ? '✅' : '❌'} ${name}: ${passed ? 'PASS' : 'FAIL'} ${message}`);
      }
    });
    
    console.log('');
    console.log(`🎯 Overall Performance: ${allThresholdsPassed ? '✅ ALL THRESHOLDS PASSED' : '❌ SOME THRESHOLDS FAILED'}`);
    
    // Save detailed report
    const reportPath = path.join(testDir, '../performance-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalBenchmarks,
        totalOperations,
        totalTime,
        overallThroughput: totalOperations / (totalTime / 1000),
        allThresholdsPassed
      },
      benchmarks: benchmarkResults,
      thresholds,
      environment: {
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        memory: os.totalmem(),
        uptime: os.uptime()
      }
    };
    
    try {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Detailed report saved: ${reportPath}`);
    } catch (error) {
      console.warn(`⚠️ Failed to save performance report: ${error}`);
    }
  }
});