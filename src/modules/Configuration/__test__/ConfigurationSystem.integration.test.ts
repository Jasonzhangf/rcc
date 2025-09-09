/**
 * Configuration System Integration Tests
 * 
 * Comprehensive testing suite for the complete Configuration System with all 5 modules:
 * - ConfigLoaderModule → ConfigValidatorModule → ConfigPersistenceModule flow
 * - ConfigUIModule integration with all other modules  
 * - StatusLineModule integration
 * - End-to-end configuration lifecycle testing
 * - Real-time updates and WebSocket communication testing
 * - Error handling and recovery testing across modules
 * 
 * @author RCC Testing Framework
 * @version 1.0.0
 */

import { describe, beforeEach, afterEach, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { WebSocket, Server as WSServer } from 'ws';
import * as http from 'http';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Import all Configuration System modules
import { ConfigLoaderModule } from '../src/ConfigLoaderModule';
import { ConfigValidatorModule } from '../src/ConfigValidatorModule';
import { ConfigPersistenceModule } from '../src/ConfigPersistenceModule';
import { ConfigUIModule } from '../src/ConfigUIModule';
import { StatusLineModule } from '../../StatusLine/src/StatusLineModule';

// Import module registry and base types
import { ModuleRegistry } from '../../../registry/ModuleRegistry';
import { BaseModule } from '../../../core/BaseModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { DataTransfer, ConnectionInfo } from '../../../interfaces/Connection';

// Import test data and utilities
import { testData } from './fixtures/test-data';

/**
 * Integration test suite for the complete Configuration System
 */
describe('Configuration System Integration Tests', () => {
  // Test infrastructure
  let registry: ModuleRegistry;
  let testDir: string;
  let configLoader: ConfigLoaderModule;
  let configValidator: ConfigValidatorModule;
  let configPersistence: ConfigPersistenceModule;
  let configUI: ConfigUIModule;
  let statusLine: StatusLineModule;
  
  // WebSocket test infrastructure
  let httpServer: http.Server;
  let wsServer: WSServer;
  let wsClients: WebSocket[] = [];
  let serverPort: number;

  // Performance tracking
  let performanceMetrics: {
    testStartTime: number;
    operationTimes: Record<string, number>;
    memoryUsage: Record<string, number>;
  };

  beforeAll(async () => {
    console.log('🚀 Starting Configuration System Integration Tests...');
    performanceMetrics = {
      testStartTime: Date.now(),
      operationTimes: {},
      memoryUsage: {}
    };
    
    // Setup test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rcc-config-tests-'));
    console.log(`📁 Created test directory: ${testDir}`);
    
    // Setup WebSocket server for UI testing
    serverPort = await findFreePort();
    httpServer = http.createServer();
    wsServer = new WSServer({ server: httpServer });
    
    await new Promise<void>((resolve) => {
      httpServer.listen(serverPort, () => {
        console.log(`🌐 WebSocket server started on port ${serverPort}`);
        resolve();
      });
    });

    // Setup WebSocket connection handling
    wsServer.on('connection', (ws) => {
      wsClients.push(ws);
      console.log(`🔌 WebSocket client connected (${wsClients.length} total)`);
      
      ws.on('close', () => {
        const index = wsClients.indexOf(ws);
        if (index > -1) {
          wsClients.splice(index, 1);
        }
        console.log(`🔌 WebSocket client disconnected (${wsClients.length} remaining)`);
      });
    });
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up Configuration System Integration Tests...');
    
    // Close WebSocket connections
    wsClients.forEach(ws => ws.terminate());
    wsServer.close();
    httpServer.close();
    
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log(`🗑️ Cleaned up test directory: ${testDir}`);
    } catch (error) {
      console.warn(`⚠️ Failed to clean up test directory: ${error}`);
    }

    // Report performance metrics
    const totalTime = Date.now() - performanceMetrics.testStartTime;
    console.log(`📊 Integration tests completed in ${totalTime}ms`);
    console.log('📊 Operation Performance:', performanceMetrics.operationTimes);
    console.log('📊 Memory Usage:', performanceMetrics.memoryUsage);
  });

  beforeEach(async () => {
    // Initialize module registry
    registry = ModuleRegistry.getInstance();
    
    // Clear any existing modules
    registry.clear();
    
    // Create module instances with proper info
    const loaderInfo: ModuleInfo = {
      id: 'config-loader-integration',
      name: 'Config Loader Integration Test',
      version: '1.0.0',
      description: 'Configuration loader for integration testing',
      type: 'config-loader'
    };

    const validatorInfo: ModuleInfo = {
      id: 'config-validator-integration',
      name: 'Config Validator Integration Test',
      version: '1.0.0',
      description: 'Configuration validator for integration testing',
      type: 'config-validator'
    };

    const persistenceInfo: ModuleInfo = {
      id: 'config-persistence-integration',
      name: 'Config Persistence Integration Test',
      version: '1.0.0',
      description: 'Configuration persistence for integration testing',
      type: 'config-persistence'
    };

    const uiInfo: ModuleInfo = {
      id: 'config-ui-integration',
      name: 'Config UI Integration Test',
      version: '1.0.0',
      description: 'Configuration UI for integration testing',
      type: 'config-ui'
    };

    const statusLineInfo: ModuleInfo = {
      id: 'status-line-integration',
      name: 'Status Line Integration Test',
      version: '1.0.0',
      description: 'Status line for integration testing',
      type: 'status-line'
    };

    // Create module instances
    configLoader = new ConfigLoaderModule(loaderInfo);
    configValidator = new ConfigValidatorModule(validatorInfo);
    configPersistence = new ConfigPersistenceModule(persistenceInfo);
    configUI = new ConfigUIModule(uiInfo);
    statusLine = new StatusLineModule(statusLineInfo);

    // Register module types with registry
    registry.registerModuleType('config-loader', ConfigLoaderModule);
    registry.registerModuleType('config-validator', ConfigValidatorModule);
    registry.registerModuleType('config-persistence', ConfigPersistenceModule);
    registry.registerModuleType('config-ui', ConfigUIModule);
    registry.registerModuleType('status-line', StatusLineModule);

    // Initialize all modules
    await Promise.all([
      configLoader.initialize(),
      configValidator.initialize(),
      configPersistence.initialize(),
      configUI.initialize(),
      statusLine.initialize()
    ]);

    console.log('✅ All modules initialized for integration test');
  });

  afterEach(async () => {
    // Clean up modules
    if (configLoader) await configLoader.destroy();
    if (configValidator) await configValidator.destroy();
    if (configPersistence) await configPersistence.destroy();
    if (configUI) await configUI.destroy();
    if (statusLine) await statusLine.destroy();
    
    // Clear registry
    registry.clear();
    
    // Record memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      performanceMetrics.memoryUsage[`test-${Date.now()}`] = memory.heapUsed;
    }
  });

  /**
   * Test Suite 1: Complete Configuration Flow Integration
   * Tests: ConfigLoaderModule → ConfigValidatorModule → ConfigPersistenceModule
   */
  describe('Complete Configuration Flow Integration', () => {
    it('should load, validate, and persist configuration end-to-end', async () => {
      const startTime = Date.now();
      
      // Step 1: Create test configuration file
      const testConfig = testData.sampleConfigurations.complex;
      const testConfigPath = path.join(testDir, 'test-config.json');
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

      // Step 2: Establish module connections
      await establishModuleConnections(configLoader, configValidator, configPersistence);

      // Step 3: Load configuration
      console.log('📖 Loading configuration...');
      const loadedConfig = await configLoader.loadFromFile(testConfigPath, {
        watchForChanges: true,
        environmentOverrides: { TEST_ENV: 'integration' }
      });

      expect(loadedConfig).toBeDefined();
      expect(loadedConfig.parsed).toEqual(expect.objectContaining(testConfig));
      expect(loadedConfig.metadata.filePath).toBe(path.resolve(testConfigPath));

      // Step 4: Validate configuration through module connection
      console.log('✅ Validating configuration...');
      const validationResult = await configValidator.validateComplete(loadedConfig.parsed, {
        level: 'comprehensive' as any,
        validateDefaults: true
      });

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      expect(validationResult.performance.totalTime).toBeLessThan(1000);

      // Step 5: Persist validated configuration
      console.log('💾 Persisting configuration...');
      const persistResult = await configPersistence.saveConfiguration(loadedConfig.parsed);

      expect(persistResult.success).toBe(true);
      expect(persistResult.metadata.version).toBeDefined();
      expect(persistResult.backupInfo).toBeDefined();

      // Step 6: Verify complete flow performance
      const totalTime = Date.now() - startTime;
      performanceMetrics.operationTimes['complete-flow'] = totalTime;
      console.log(`⚡ Complete flow completed in ${totalTime}ms`);
      
      expect(totalTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should handle configuration file changes with real-time updates', async () => {
      const testConfigPath = path.join(testDir, 'watch-config.json');
      const initialConfig = { name: 'initial', value: 1 };
      const updatedConfig = { name: 'updated', value: 2 };

      // Write initial config
      await fs.writeFile(testConfigPath, JSON.stringify(initialConfig, null, 2));

      // Setup file watching with change handler
      const changeEvents: any[] = [];
      configLoader.watchFile(testConfigPath, (event) => {
        changeEvents.push(event);
      });

      // Load initial config
      const initialLoad = await configLoader.loadFromFile(testConfigPath, { watchForChanges: true });
      expect(initialLoad.parsed).toEqual(initialConfig);

      // Wait a moment then update the file
      await new Promise(resolve => setTimeout(resolve, 100));
      await fs.writeFile(testConfigPath, JSON.stringify(updatedConfig, null, 2));

      // Wait for file system change detection (with debouncing)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify change was detected
      expect(changeEvents.length).toBeGreaterThan(0);
      expect(changeEvents[0]).toMatchObject({
        type: 'modified',
        filePath: testConfigPath,
        timestamp: expect.any(Number)
      });

      configLoader.stopWatching(testConfigPath);
    });

    it('should handle validation errors and recovery gracefully', async () => {
      // Create invalid configuration
      const invalidConfig = {
        name: '', // Invalid: empty name
        version: 'invalid-version-format',
        settings: {
          timeout: -1, // Invalid: negative timeout
          enabled: 'not-a-boolean' // Invalid: wrong type
        }
      };

      // Validate invalid config
      const validationResult = await configValidator.validateComplete(invalidConfig);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
      expect(validationResult.errors.some(error => error.includes('name'))).toBe(true);

      // Test recovery with corrected config
      const correctedConfig = {
        name: 'corrected-config',
        version: '1.0.0',
        settings: {
          timeout: 5000,
          enabled: true
        }
      };

      const correctedValidation = await configValidator.validateComplete(correctedConfig);
      expect(correctedValidation.isValid).toBe(true);
      expect(correctedValidation.errors).toHaveLength(0);
    });
  });

  /**
   * Test Suite 2: ConfigUIModule Integration with All Modules
   */
  describe('ConfigUIModule Integration with All Modules', () => {
    let uiServerUrl: string;

    beforeEach(async () => {
      // Configure UI module with test server
      configUI.configure({
        port: serverPort + 1,
        host: 'localhost',
        theme: 'default',
        enableExtensions: true
      });

      uiServerUrl = `http://localhost:${serverPort + 1}`;
    });

    it('should start web server and serve configuration UI', async () => {
      const startTime = Date.now();

      // Start web server
      const serverResult = await configUI.startWebServer(serverPort + 1);
      expect(serverResult.success).toBe(true);
      expect(serverResult.serverInfo.isRunning).toBe(true);
      expect(serverResult.serverInfo.port).toBe(serverPort + 1);

      // Test server responsiveness
      const response = await fetch(`${uiServerUrl}/api/v1/health`);
      expect(response.ok).toBe(true);
      
      const healthData = await response.json();
      expect(healthData.status).toBe('healthy');
      expect(healthData.uptime).toBeDefined();

      performanceMetrics.operationTimes['ui-server-start'] = Date.now() - startTime;
      console.log(`🌐 UI server started in ${Date.now() - startTime}ms`);

      await configUI.stopWebServer();
    });

    it('should handle configuration requests through REST API', async () => {
      await configUI.startWebServer(serverPort + 1);

      // Test GET configuration
      const getResponse = await fetch(`${uiServerUrl}/api/v1/config`);
      expect(getResponse.ok).toBe(true);
      
      const configData = await getResponse.json();
      expect(configData).toBeDefined();

      // Test POST configuration update
      const updateConfig = { name: 'api-test', version: '1.0.0' };
      const postResponse = await fetch(`${uiServerUrl}/api/v1/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateConfig)
      });

      expect(postResponse.ok).toBe(true);
      const updateResult = await postResponse.json();
      expect(updateResult.success).toBe(true);

      await configUI.stopWebServer();
    });

    it('should establish WebSocket connections and handle real-time updates', async () => {
      await configUI.startWebServer(serverPort + 1);
      
      const wsUrl = `ws://localhost:${serverPort + 1}/ws`;
      const messages: any[] = [];
      
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          console.log('🔌 WebSocket connection established');
          resolve();
        });
        ws.on('error', reject);
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        messages.push(message);
        console.log('📨 WebSocket message received:', message);
      });

      // Trigger a configuration update to test real-time notifications
      const updateResult = await configUI.handleConfigurationRequest({
        action: 'UPDATE' as any,
        data: { name: 'websocket-test', value: 123 },
        sessionId: 'test-session',
        timestamp: Date.now()
      });

      expect(updateResult.success).toBe(true);

      // Wait for WebSocket message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify real-time notification was sent
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some(msg => msg.event === 'config-updated')).toBe(true);

      ws.close();
      await configUI.stopWebServer();
    });

    it('should integrate with all other modules for complete UI functionality', async () => {
      // Establish connections between UI and all other modules
      await establishModuleConnections(configUI, configLoader, configValidator, configPersistence, statusLine);

      await configUI.startWebServer(serverPort + 1);

      // Create comprehensive test configuration
      const testConfig = testData.sampleConfigurations.complex;
      const testConfigPath = path.join(testDir, 'ui-integration-config.json');
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

      // Test complete UI workflow:
      // 1. Load configuration through UI → Loader
      const loadRequest = {
        action: 'LOAD' as any,
        filePath: testConfigPath,
        sessionId: 'ui-integration-session',
        timestamp: Date.now()
      };

      const loadResult = await configUI.handleConfigurationRequest(loadRequest);
      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toBeDefined();

      // 2. Validate configuration through UI → Validator
      const validateRequest = {
        action: 'VALIDATE' as any,
        data: testConfig,
        options: { level: 'strict' },
        sessionId: 'ui-integration-session',
        timestamp: Date.now()
      };

      const validateResult = await configUI.handleConfigurationRequest(validateRequest);
      expect(validateResult.success).toBe(true);

      // 3. Save configuration through UI → Persistence
      const saveRequest = {
        action: 'SAVE' as any,
        data: testConfig,
        sessionId: 'ui-integration-session',
        timestamp: Date.now()
      };

      const saveResult = await configUI.handleConfigurationRequest(saveRequest);
      expect(saveResult.success).toBe(true);

      await configUI.stopWebServer();
    });
  });

  /**
   * Test Suite 3: StatusLineModule Integration
   */
  describe('StatusLineModule Integration', () => {
    it('should integrate with configuration system for status line theming', async () => {
      // Create status line theme configuration
      const themeConfig = {
        id: 'integration-theme',
        name: 'Integration Test Theme',
        type: 'custom' as any,
        colors: {
          background: '#2d3748',
          foreground: '#ffffff',
          accent: '#4299e1',
          inactive: '#718096'
        },
        fonts: {
          family: 'Monaco, monospace',
          size: 12,
          weight: 400
        },
        animations: {
          enabled: true,
          duration: 200,
          easing: 'ease-in-out'
        }
      };

      // Set theme through status line module
      const themeResult = await statusLine.setTheme(themeConfig);
      expect(themeResult.success).toBe(true);
      expect(themeResult.theme).toEqual(themeConfig);

      // Verify theme is applied
      const currentTheme = statusLine.getCurrentTheme();
      expect(currentTheme.id).toBe('integration-theme');
      expect(currentTheme.colors.background).toBe('#2d3748');
    });

    it('should generate status line preview with configuration data', async () => {
      const previewConfig = {
        enabled: true,
        realTime: true,
        duration: 5000,
        showTooltips: true,
        highlightChanges: true,
        sampleData: {
          MODE: 'NORMAL',
          FILE_NAME: 'test-config.json',
          POSITION: '10:5',
          ENCODING: 'UTF-8',
          BRANCH: 'main'
        }
      };

      const previewResult = await statusLine.generatePreview(previewConfig);
      expect(previewResult.success).toBe(true);
      expect(previewResult.preview).toBeDefined();
      expect(previewResult.preview.html).toContain('status-line');
      expect(previewResult.preview.css).toContain('background-color');
      expect(previewResult.preview.mode).toBe('realtime');
    });

    it('should handle status line configuration import/export', async () => {
      // Export current configuration
      const exportResult = await statusLine.exportConfiguration('json');
      expect(exportResult.success).toBe(true);
      expect(exportResult.exportData).toBeDefined();
      expect(exportResult.exportData.content).toContain('"theme"');
      expect(exportResult.exportData.format).toBe('json');

      // Reset to defaults
      await statusLine.resetToDefaults();

      // Import previously exported configuration
      const importResult = await statusLine.importConfiguration(exportResult.exportData.content, 'json');
      expect(importResult.success).toBe(true);
      expect(importResult.stats.themesImported).toBeGreaterThan(0);

      // Verify imported configuration
      const config = statusLine.validateConfiguration({
        theme: statusLine.getCurrentTheme(),
        layout: statusLine.getCurrentLayout(),
        components: statusLine.getComponents()
      });
      expect(config.isValid).toBe(true);
    });
  });

  /**
   * Test Suite 4: End-to-End Configuration Lifecycle Testing
   */
  describe('End-to-End Configuration Lifecycle Testing', () => {
    it('should handle complete configuration lifecycle with all modules', async () => {
      const startTime = Date.now();
      console.log('🔄 Starting complete configuration lifecycle test...');

      // Step 1: Create complex configuration
      const lifecycleConfig = {
        application: {
          name: 'lifecycle-test-app',
          version: '2.0.0',
          environment: 'integration'
        },
        features: {
          authentication: true,
          logging: {
            level: 'debug',
            format: 'json'
          },
          monitoring: {
            enabled: true,
            metrics: ['cpu', 'memory', 'disk']
          }
        },
        ui: {
          theme: 'dark',
          language: 'en',
          statusLine: {
            position: 'bottom',
            components: ['mode', 'file', 'position', 'branch']
          }
        }
      };

      // Step 2: Setup complete module chain
      await establishFullModuleChain([configLoader, configValidator, configPersistence, configUI, statusLine]);

      // Step 3: Create configuration file
      const lifecycleConfigPath = path.join(testDir, 'lifecycle-config.json');
      await fs.writeFile(lifecycleConfigPath, JSON.stringify(lifecycleConfig, null, 2));

      // Step 4: Load configuration
      const loadResult = await configLoader.loadFromFile(lifecycleConfigPath);
      console.log('✅ Configuration loaded');

      // Step 5: Validate configuration
      const validationResult = await configValidator.validateComplete(loadResult.parsed);
      expect(validationResult.isValid).toBe(true);
      console.log('✅ Configuration validated');

      // Step 6: Persist configuration
      const persistResult = await configPersistence.saveConfiguration(loadResult.parsed);
      expect(persistResult.success).toBe(true);
      console.log('✅ Configuration persisted');

      // Step 7: Configure UI with the configuration
      await configUI.startWebServer(serverPort + 2);
      const uiResult = await configUI.handleConfigurationRequest({
        action: 'UPDATE' as any,
        data: lifecycleConfig,
        sessionId: 'lifecycle-session',
        timestamp: Date.now()
      });
      expect(uiResult.success).toBe(true);
      console.log('✅ UI configured');

      // Step 8: Apply configuration to status line
      if (lifecycleConfig.ui.statusLine) {
        const statusLineLayout = {
          position: lifecycleConfig.ui.statusLine.position as any,
          height: 24,
          width: '100%' as any,
          zIndex: 1000,
          sticky: true,
          components: { left: [], center: [], right: [] },
          responsive: {
            enabled: true,
            breakpoints: { mobile: 480, tablet: 768, desktop: 1024 },
            hideComponents: []
          }
        };

        const layoutResult = await statusLine.updateLayout(statusLineLayout);
        expect(layoutResult.success).toBe(true);
        console.log('✅ Status line configured');
      }

      // Step 9: Create backup
      const backupResult = await configPersistence.createBackup(lifecycleConfigPath, 'lifecycle-test');
      expect(backupResult.success).toBe(true);
      console.log('✅ Backup created');

      // Step 10: Verify complete system state
      const finalValidation = await configValidator.validateComplete(lifecycleConfig);
      expect(finalValidation.isValid).toBe(true);

      const storageStats = await configPersistence.getStorageStatistics();
      expect(storageStats.totalConfigurationFiles).toBeGreaterThan(0);

      await configUI.stopWebServer();

      const totalTime = Date.now() - startTime;
      performanceMetrics.operationTimes['complete-lifecycle'] = totalTime;
      console.log(`🎉 Complete lifecycle test completed in ${totalTime}ms`);

      expect(totalTime).toBeLessThan(10000); // Should complete in under 10 seconds
    });

    it('should handle concurrent operations across all modules', async () => {
      const startTime = Date.now();
      const concurrentOperations = 5;
      const operations: Promise<any>[] = [];

      console.log(`⚡ Starting ${concurrentOperations} concurrent operations...`);

      for (let i = 0; i < concurrentOperations; i++) {
        const testConfig = testData.generators.randomConfig('medium');
        const testConfigPath = path.join(testDir, `concurrent-config-${i}.json`);
        
        const operation = async () => {
          // Write config file
          await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
          
          // Load, validate, and persist concurrently
          const loadPromise = configLoader.loadFromFile(testConfigPath);
          const validatePromise = configValidator.validateComplete(testConfig);
          const [loadResult, validationResult] = await Promise.all([loadPromise, validatePromise]);
          
          if (validationResult.isValid) {
            await configPersistence.saveConfiguration(loadResult.parsed);
          }
          
          return { loadResult, validationResult };
        };

        operations.push(operation());
      }

      // Wait for all operations to complete
      const results = await Promise.all(operations);
      
      // Verify all operations succeeded
      results.forEach((result, index) => {
        expect(result.loadResult.parsed).toBeDefined();
        expect(result.validationResult.isValid).toBe(true);
        console.log(`✅ Concurrent operation ${index + 1} completed`);
      });

      const totalTime = Date.now() - startTime;
      performanceMetrics.operationTimes['concurrent-operations'] = totalTime;
      console.log(`⚡ All concurrent operations completed in ${totalTime}ms`);

      expect(totalTime).toBeLessThan(15000); // Should complete in under 15 seconds
    });
  });

  /**
   * Test Suite 5: Real-time Updates and WebSocket Communication Testing
   */
  describe('Real-time Updates and WebSocket Communication Testing', () => {
    let wsConnections: WebSocket[] = [];

    afterEach(() => {
      wsConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
      wsConnections = [];
    });

    it('should broadcast configuration changes to all WebSocket clients', async () => {
      await configUI.startWebServer(serverPort + 3);
      
      // Create multiple WebSocket connections
      const connectionCount = 3;
      const messageCollectors: any[][] = [];

      for (let i = 0; i < connectionCount; i++) {
        const ws = new WebSocket(`ws://localhost:${serverPort + 3}/ws`);
        const messages: any[] = [];
        
        await new Promise<void>((resolve, reject) => {
          ws.on('open', resolve);
          ws.on('error', reject);
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          messages.push(message);
        });

        wsConnections.push(ws);
        messageCollectors.push(messages);
      }

      console.log(`🔌 Established ${connectionCount} WebSocket connections`);

      // Trigger configuration update
      const updateData = {
        name: 'broadcast-test',
        timestamp: Date.now(),
        value: 'realtime-update'
      };

      const updateResult = await configUI.handleConfigurationRequest({
        action: 'UPDATE' as any,
        data: updateData,
        sessionId: 'broadcast-session',
        timestamp: Date.now()
      });

      expect(updateResult.success).toBe(true);

      // Wait for WebSocket messages
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify all clients received the update
      messageCollectors.forEach((messages, index) => {
        expect(messages.length).toBeGreaterThan(0);
        expect(messages.some(msg => 
          msg.event === 'config-updated' && 
          msg.data.name === 'broadcast-test'
        )).toBe(true);
        console.log(`✅ Client ${index + 1} received update notification`);
      });

      await configUI.stopWebServer();
    });

    it('should handle WebSocket reconnection and state synchronization', async () => {
      await configUI.startWebServer(serverPort + 4);

      // Initial connection and configuration
      let ws = new WebSocket(`ws://localhost:${serverPort + 4}/ws`);
      let messages: any[] = [];

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        messages.push(message);
      });

      // Set initial configuration
      const initialConfig = { name: 'reconnection-test', version: '1.0.0' };
      await configUI.handleConfigurationRequest({
        action: 'UPDATE' as any,
        data: initialConfig,
        sessionId: 'reconnection-session',
        timestamp: Date.now()
      });

      // Wait for initial message
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(messages.length).toBeGreaterThan(0);

      // Simulate disconnection
      ws.close();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update configuration while disconnected
      const updatedConfig = { name: 'reconnection-test', version: '2.0.0' };
      await configUI.handleConfigurationRequest({
        action: 'UPDATE' as any,
        data: updatedConfig,
        sessionId: 'reconnection-session',
        timestamp: Date.now()
      });

      // Reconnect
      ws = new WebSocket(`ws://localhost:${serverPort + 4}/ws`);
      messages = []; // Reset message collector

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        messages.push(message);
      });

      wsConnections.push(ws);

      // Request state synchronization
      ws.send(JSON.stringify({ action: 'sync-state' }));

      // Wait for sync message
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify client received current state
      expect(messages.some(msg => 
        msg.event === 'state-sync' && 
        msg.data.version === '2.0.0'
      )).toBe(true);

      console.log('✅ WebSocket reconnection and state sync successful');

      await configUI.stopWebServer();
    });
  });

  /**
   * Test Suite 6: Error Handling and Recovery Testing
   */
  describe('Error Handling and Recovery Testing', () => {
    it('should handle and recover from module failures gracefully', async () => {
      // Simulate loader module failure
      const originalLoadFromFile = configLoader.loadFromFile.bind(configLoader);
      let loaderFailureCount = 0;
      
      configLoader.loadFromFile = jest.fn().mockImplementation(async (filePath, options) => {
        loaderFailureCount++;
        if (loaderFailureCount <= 2) {
          throw new Error('Simulated loader failure');
        }
        return originalLoadFromFile(filePath, options);
      });

      // Create test configuration
      const testConfig = testData.sampleConfigurations.basic;
      const testConfigPath = path.join(testDir, 'recovery-test-config.json');
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

      // Attempt to load (should fail first two times)
      await expect(configLoader.loadFromFile(testConfigPath)).rejects.toThrow('Simulated loader failure');
      await expect(configLoader.loadFromFile(testConfigPath)).rejects.toThrow('Simulated loader failure');

      // Third attempt should succeed (recovery)
      const loadResult = await configLoader.loadFromFile(testConfigPath);
      expect(loadResult.parsed).toEqual(testConfig);

      console.log('✅ Module failure recovery successful');

      // Restore original method
      configLoader.loadFromFile = originalLoadFromFile;
    });

    it('should handle validation errors and provide detailed feedback', async () => {
      const invalidConfigs = [
        { /* empty config */ },
        { name: '' }, // Invalid name
        { name: 'test', version: null }, // Invalid version
        { name: 'test', version: '1.0.0', settings: 'invalid' } // Invalid settings type
      ];

      const validationResults = await Promise.all(
        invalidConfigs.map(config => configValidator.validateComplete(config))
      );

      validationResults.forEach((result, index) => {
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('validation');
        console.log(`✅ Invalid config ${index + 1} properly rejected:`, result.errors[0]);
      });

      // Test error correction workflow
      const correctedConfig = { name: 'corrected', version: '1.0.0', settings: { enabled: true } };
      const correctedResult = await configValidator.validateComplete(correctedConfig);
      
      expect(correctedResult.isValid).toBe(true);
      expect(correctedResult.errors).toHaveLength(0);
      console.log('✅ Error correction workflow successful');
    });

    it('should handle persistence failures and maintain data integrity', async () => {
      const testConfig = testData.sampleConfigurations.basic;
      
      // Simulate write permission failure
      const originalSaveConfiguration = configPersistence.saveConfiguration.bind(configPersistence);
      let saveAttempts = 0;
      
      configPersistence.saveConfiguration = jest.fn().mockImplementation(async (config) => {
        saveAttempts++;
        if (saveAttempts === 1) {
          throw new Error('Permission denied');
        }
        return originalSaveConfiguration(config);
      });

      // First attempt should fail
      await expect(configPersistence.saveConfiguration(testConfig)).rejects.toThrow('Permission denied');

      // Second attempt should succeed (after permission fix simulation)
      const saveResult = await configPersistence.saveConfiguration(testConfig);
      expect(saveResult.success).toBe(true);

      // Verify data integrity
      const stats = await configPersistence.getStorageStatistics();
      expect(stats.totalConfigurationFiles).toBeGreaterThan(0);

      console.log('✅ Persistence failure recovery and data integrity maintained');

      // Restore original method
      configPersistence.saveConfiguration = originalSaveConfiguration;
    });

    it('should handle UI server failures and maintain service availability', async () => {
      // Start server
      await configUI.startWebServer(serverPort + 5);

      // Simulate server error
      const originalHandleConfigurationRequest = configUI.handleConfigurationRequest.bind(configUI);
      let requestCount = 0;

      configUI.handleConfigurationRequest = jest.fn().mockImplementation(async (request) => {
        requestCount++;
        if (requestCount === 1) {
          throw new Error('Server internal error');
        }
        return originalHandleConfigurationRequest(request);
      });

      // First request should fail
      await expect(configUI.handleConfigurationRequest({
        action: 'GET' as any,
        sessionId: 'error-test-session',
        timestamp: Date.now()
      })).rejects.toThrow('Server internal error');

      // Second request should succeed (after recovery)
      const result = await configUI.handleConfigurationRequest({
        action: 'GET' as any,
        sessionId: 'error-test-session',
        timestamp: Date.now()
      });

      expect(result.success).toBe(true);
      console.log('✅ UI server error recovery successful');

      // Restore original method
      configUI.handleConfigurationRequest = originalHandleConfigurationRequest;
      
      await configUI.stopWebServer();
    });
  });

  /**
   * Test Suite 7: Performance and Load Testing
   */
  describe('Performance and Load Testing', () => {
    it('should handle large configuration files efficiently', async () => {
      const startTime = Date.now();
      
      // Create large configuration
      const largeConfig = testData.sampleConfigurations.large;
      const largeConfigPath = path.join(testDir, 'large-config.json');
      const configContent = JSON.stringify(largeConfig, null, 2);
      
      console.log(`📊 Large config size: ${Math.round(configContent.length / 1024)}KB`);
      
      await fs.writeFile(largeConfigPath, configContent);

      // Load large configuration
      const loadStartTime = Date.now();
      const loadResult = await configLoader.loadFromFile(largeConfigPath);
      const loadTime = Date.now() - loadStartTime;
      
      expect(loadResult.parsed).toBeDefined();
      expect(loadTime).toBeLessThan(2000); // Should load in under 2 seconds
      console.log(`⚡ Large config loaded in ${loadTime}ms`);

      // Validate large configuration
      const validateStartTime = Date.now();
      const validationResult = await configValidator.validateComplete(loadResult.parsed);
      const validateTime = Date.now() - validateStartTime;
      
      expect(validationResult.isValid).toBe(true);
      expect(validateTime).toBeLessThan(3000); // Should validate in under 3 seconds
      console.log(`⚡ Large config validated in ${validateTime}ms`);

      // Persist large configuration
      const persistStartTime = Date.now();
      const persistResult = await configPersistence.saveConfiguration(loadResult.parsed);
      const persistTime = Date.now() - persistStartTime;
      
      expect(persistResult.success).toBe(true);
      expect(persistTime).toBeLessThan(1000); // Should persist in under 1 second
      console.log(`⚡ Large config persisted in ${persistTime}ms`);

      const totalTime = Date.now() - startTime;
      performanceMetrics.operationTimes['large-config-processing'] = totalTime;
      
      expect(totalTime).toBeLessThan(5000); // Total processing should be under 5 seconds
      console.log(`🎯 Large config processing completed in ${totalTime}ms`);
    });

    it('should handle high-frequency configuration updates', async () => {
      await configUI.startWebServer(serverPort + 6);
      
      const updateCount = 50;
      const updates: Promise<any>[] = [];
      const startTime = Date.now();

      console.log(`🔄 Starting ${updateCount} rapid configuration updates...`);

      for (let i = 0; i < updateCount; i++) {
        const updatePromise = configUI.handleConfigurationRequest({
          action: 'UPDATE' as any,
          data: { name: `rapid-update-${i}`, timestamp: Date.now(), value: i },
          sessionId: `rapid-session-${i}`,
          timestamp: Date.now()
        });
        
        updates.push(updatePromise);
      }

      const results = await Promise.all(updates);
      const totalTime = Date.now() - startTime;
      
      // Verify all updates succeeded
      const successfulUpdates = results.filter(result => result.success).length;
      expect(successfulUpdates).toBe(updateCount);

      const averageUpdateTime = totalTime / updateCount;
      performanceMetrics.operationTimes['rapid-updates-average'] = averageUpdateTime;
      
      console.log(`⚡ ${updateCount} updates completed in ${totalTime}ms (avg: ${averageUpdateTime.toFixed(2)}ms per update)`);
      
      expect(averageUpdateTime).toBeLessThan(100); // Average should be under 100ms per update

      await configUI.stopWebServer();
    });

    it('should maintain performance under memory pressure', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const operations = [];

      // Create memory pressure by loading multiple configurations
      for (let i = 0; i < 20; i++) {
        const config = testData.generators.randomConfig('large');
        const configPath = path.join(testDir, `memory-test-${i}.json`);
        
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        
        operations.push(async () => {
          const loadResult = await configLoader.loadFromFile(configPath);
          const validateResult = await configValidator.validateComplete(loadResult.parsed);
          if (validateResult.isValid) {
            await configPersistence.saveConfiguration(loadResult.parsed);
          }
          return { loadResult, validateResult };
        });
      }

      // Execute all operations
      const startTime = Date.now();
      const results = await Promise.all(operations.map(op => op()));
      const executionTime = Date.now() - startTime;
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      console.log(`💾 Memory usage increased by ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      console.log(`⚡ ${operations.length} operations completed in ${executionTime}ms under memory pressure`);
      
      // Verify all operations succeeded
      expect(results.every(result => result.validateResult.isValid)).toBe(true);
      expect(executionTime).toBeLessThan(30000); // Should complete in under 30 seconds
      
      performanceMetrics.operationTimes['memory-pressure-test'] = executionTime;
      performanceMetrics.memoryUsage['memory-pressure-increase'] = memoryIncrease;
    });
  });

  // Helper Functions

  /**
   * Establishes connections between modules
   */
  async function establishModuleConnections(...modules: BaseModule[]): Promise<void> {
    for (let i = 0; i < modules.length - 1; i++) {
      const sourceModule = modules[i];
      const targetModule = modules[i + 1];
      
      // Establish handshake
      const handshakeResult = await sourceModule.handshake(targetModule);
      expect(handshakeResult).toBe(true);
      
      // Create connection info
      const connection: ConnectionInfo = {
        id: `connection-${sourceModule.getInfo().id}-to-${targetModule.getInfo().id}`,
        sourceModuleId: sourceModule.getInfo().id,
        targetModuleId: targetModule.getInfo().id,
        dataTypes: ['configuration', 'validation-result', 'persistence-event'],
        metadata: {
          established: Date.now(),
          type: 'integration-test'
        }
      };

      // Add output connection to source
      sourceModule.addOutputConnection(connection);
      
      // Add input connection to target
      targetModule.addInputConnection(connection);
    }
    
    console.log(`🔗 Established connections between ${modules.length} modules`);
  }

  /**
   * Establishes full module chain with all-to-all connections
   */
  async function establishFullModuleChain(modules: BaseModule[]): Promise<void> {
    for (let i = 0; i < modules.length; i++) {
      for (let j = 0; j < modules.length; j++) {
        if (i !== j) {
          const sourceModule = modules[i];
          const targetModule = modules[j];
          
          await sourceModule.handshake(targetModule);
          
          const connection: ConnectionInfo = {
            id: `full-chain-${i}-to-${j}`,
            sourceModuleId: sourceModule.getInfo().id,
            targetModuleId: targetModule.getInfo().id,
            dataTypes: ['*'],
            metadata: { type: 'full-chain' }
          };
          
          sourceModule.addOutputConnection(connection);
          targetModule.addInputConnection(connection);
        }
      }
    }
    
    console.log(`🌐 Established full module chain with ${modules.length} modules`);
  }

  /**
   * Finds a free port for testing
   */
  async function findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = http.createServer();
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          const port = address.port;
          server.close(() => resolve(port));
        } else {
          server.close(() => reject(new Error('Unable to determine port')));
        }
      });
    });
  }
});