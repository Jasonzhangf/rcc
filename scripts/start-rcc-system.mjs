#!/usr/bin/env node

/**
 * RCC System Startup Flow - Pipeline First Architecture
 *
 * This startup script implements the proper initialization order:
 * 1. Configuration Loading
 * 2. Pipeline Assembly and Provider Registration
 * 3. Scheduler Initialization
 * 4. Virtual Model Registration
 * 5. Server Startup with Prepared Pipeline System
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

class RCCSystemInitializer {
  constructor(options = {}) {
    this.port = options.port || 5506;
    this.configPath = options.config || path.join(os.homedir(), '.rcc', 'rcc-config.json');
    this.debugPath = options.debug || path.join(os.homedir(), '.rcc', 'debug-logs');
    this.verbose = options.verbose || false;
    this.pipelineManager = null;
    this.server = null;
    this.debugCenter = null;
    this.config = null;
    this.debugSessionId = null;

    // T3: 流水线优先架构 - 新增属性
    this.pipelineComponents = null;
    this.assembledPipelinePools = null;
    this.pipelineAssembler = null;
    this.pipelineTracker = null;
    this.currentPhase = null;

    // Debug logging setup
    this.initializeDebugLogging();
  }

  async initializeDebugLogging() {
    try {
      fs.mkdirSync(this.debugPath, { recursive: true });
      const systemStartDir = path.join(this.debugPath, 'systemstart');
      fs.mkdirSync(systemStartDir, { recursive: true });
      this.debugSessionId = `system-start-${Date.now()}`;

      this.log('system', 'RCC System Initializer created', {
        port: this.port,
        configPath: this.configPath,
        debugPath: this.debugPath,
        debugSessionId: this.debugSessionId
      });
    } catch (error) {
      console.warn('Debug logging setup failed:', error.message);
    }
  }

  log(component, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      sessionId: this.debugSessionId,
      phase: this.currentPhase || 'initialization',
      component,
      message,
      data
    };

    if (this.verbose) {
      console.log(`[${timestamp}] [${component}] ${message}`, data);
    }

    // Write to debug file
    try {
      const debugFile = path.join(this.debugPath, 'systemstart', 'startup-flow.jsonl');
      fs.appendFileSync(debugFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      // Silent fail for debug logging
    }
  }

  async start() {
    console.log('🚀 RCC System Startup - Pipeline First Architecture');
    console.log('================================================');
    console.log('📋 Execution Order: Configuration → Assembly → Scheduler → Server');

    try {
      // Phase 1: Configuration Loading
      this.currentPhase = 'configuration-loading';
      await this.loadConfiguration();

      // Phase 2: Pipeline Assembly (Provider Discovery + Pipeline Creation)
      this.currentPhase = 'pipeline-assembly';
      await this.initializePipelineSystem();

      // Phase 3: Virtual Model Scheduler Creation
      this.currentPhase = 'scheduler-initialization';
      await this.createVirtualModelScheduler();

      // Phase 4: Server Creation with Prepared Scheduler
      this.currentPhase = 'server-initialization';
      await this.createServerWithScheduler();

      // Phase 5: Virtual Model Router Configuration
      this.currentPhase = 'virtual-model-registration';
      await this.configureVirtualModelRouting();

      // Phase 6: Server Startup
      this.currentPhase = 'server-startup';
      await this.startServer();

      // Phase 7: System Ready
      this.currentPhase = 'system-ready';
      await this.finalizeSystemStartup();

      console.log('\n✅ RCC System Successfully Started!');
      console.log(`🌐 Server URL: http://localhost:${this.port}`);
      console.log(`🔧 API Endpoint: http://localhost:${this.port}/v1/messages`);
      console.log(`📊 Health Check: http://localhost:${this.port}/status`);

    } catch (error) {
      console.error('\n❌ RCC System Startup Failed:', error.message);
      this.log('system', 'Startup failed', {
        error: error.message,
        stack: error.stack,
        phase: this.currentPhase
      });
      throw error;
    }
  }

  async loadConfiguration() {
    this.log('configuration', 'Loading system configuration...', {
      configPath: this.configPath,
      exists: fs.existsSync(this.configPath)
    });

    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Configuration file not found: ${this.configPath}`);
      }

      this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));

      // Validate required configuration sections
      if (!this.config.providers) {
        throw new Error('Configuration missing providers section');
      }

      if (!this.config.virtualModels) {
        console.warn('⚠️ Configuration missing virtualModels section - using defaults');
        this.config.virtualModels = {};
      }

      if (!this.config.pipeline) {
        this.config.pipeline = {};
      }

      this.log('configuration', 'Configuration loaded successfully', {
        providers: Object.keys(this.config.providers || {}),
        virtualModels: Object.keys(this.config.virtualModels || {}),
        pipelineConfig: this.config.pipeline
      });

    } catch (error) {
      throw new Error(`Configuration loading failed: ${error.message}`);
    }
  }

  async initializePipelineSystem() {
    this.log('pipeline', 'Initializing pipeline system with complete assembly flow...');

    try {
      // Import Pipeline module components
      const pipelinePath = path.join(process.cwd(), 'sharedmodule', 'pipeline', 'dist', 'index.esm.js');

      this.log('pipeline', 'Loading pipeline module from', { pipelinePath });

      if (!fs.existsSync(pipelinePath)) {
        throw new Error(`Pipeline module not found at: ${pipelinePath}`);
      }

      const pipelineModule = await import(pipelinePath);

      this.log('pipeline', 'Pipeline module loaded', {
        exports: Object.keys(pipelineModule)
      });

      // Verify required Pipeline classes are available
      const requiredComponents = [
        'VirtualModelSchedulerManager',
        'PipelineAssembler',  // 新增：流水线组装器
        'ModuleScanner',     // 新增：模块扫描器
        'PipelineFactory',
        'PipelineTracker',
        'QwenProvider',
        'IFlowProvider'
      ];

      for (const component of requiredComponents) {
        if (!pipelineModule[component]) {
          throw new Error(`${component} not found in Pipeline module`);
        }
      }

      this.pipelineComponents = {
        VirtualModelSchedulerManager: pipelineModule.VirtualModelSchedulerManager,
        PipelineAssembler: pipelineModule.PipelineAssembler,  // 新增
        ModuleScanner: pipelineModule.ModuleScanner,         // 新增
        PipelineFactory: pipelineModule.PipelineFactory,
        PipelineTracker: pipelineModule.PipelineTracker,
        QwenProvider: pipelineModule.QwenProvider,
        IFlowProvider: pipelineModule.IFlowProvider,
        PipelineScheduler: pipelineModule.PipelineScheduler,
        BaseProvider: pipelineModule.BaseProvider
      };

      // Step 1: Create ModuleScanner and discover providers
      this.log('pipeline', 'Creating ModuleScanner for provider discovery...');
      const { ModuleScanner } = this.pipelineComponents;
      const moduleScanner = new ModuleScanner();

      const scannerOptions = {
        scanPaths: this.config.pipeline?.scanPaths || ['./sharedmodule'],
        providerPatterns: this.config.pipeline?.providerPatterns || ['*Provider.js', '*Provider.ts'],
        recursive: true
      };

      this.log('pipeline', 'Discovering providers with options', scannerOptions);
      const discoveredProviders = await moduleScanner.scan(scannerOptions);

      const providerCount = discoveredProviders.filter(p => p.status === 'available').length;
      this.log('pipeline', `Provider discovery completed`, {
        totalDiscovered: discoveredProviders.length,
        available: providerCount,
        providers: discoveredProviders.map(p => ({ id: p.info.id, status: p.status }))
      });

      // Step 2: Create PipelineAssembler and assemble pipeline pools
      this.log('pipeline', 'Creating PipelineAssembler for pipeline assembly...');
      const { PipelineAssembler, PipelineTracker } = this.pipelineComponents;

      // Create pipeline tracker for assembly
      const tracker = new PipelineTracker({
        enabled: true,
        logLevel: 'debug',
        enableMetrics: true,
        enableTracing: true,
        baseDirectory: path.join(this.debugPath, 'pipeline')
      });

      await tracker.initialize();

      // Create assembler configuration
      const assemblerConfig = {
        providerDiscoveryOptions: scannerOptions,
        pipelineFactoryConfig: {
          defaultTimeout: this.config.pipeline?.defaultTimeout || 30000,
          defaultHealthCheckInterval: this.config.pipeline?.healthCheckInterval || 60000,
          defaultMaxRetries: this.config.pipeline?.maxRetries || 3,
          defaultLoadBalancingStrategy: this.config.pipeline?.loadBalancingStrategy || 'round-robin',
          enableHealthChecks: true,
          metricsEnabled: true
        },
        enableAutoDiscovery: true,
        fallbackStrategy: 'first-available'
      };

      // Create assembler
      const assembler = new PipelineAssembler(assemblerConfig, tracker);

      // Prepare virtual model configurations
      const virtualModelConfigs = Object.entries(this.config.virtualModels || {}).map(([modelId, config]) => ({
        id: modelId,
        name: modelId,
        ...config,
        targets: config.targets || []
      }));

      this.log('pipeline', `Assembling pipelines for ${virtualModelConfigs.length} virtual models...`);

      // Assemble pipeline pools
      const assemblyResult = await assembler.assemblePipelines(virtualModelConfigs);

      this.log('pipeline', 'Pipeline assembly completed', {
        success: assemblyResult.success,
        poolsCreated: assemblyResult.pipelinePools.size,
        errors: assemblyResult.errors.length,
        warnings: assemblyResult.warnings.length,
        virtualModels: Array.from(assemblyResult.pipelinePools.keys())
      });

      if (assemblyResult.errors.length > 0) {
        this.log('pipeline', 'Assembly errors encountered', {
          errors: assemblyResult.errors
        });
      }

      if (!assemblyResult.success && assemblyResult.pipelinePools.size === 0) {
        throw new Error('Pipeline assembly failed - no pipelines could be created');
      }

      // Store the assembled pipeline pools and assembler for later use
      this.assembledPipelinePools = assemblyResult.pipelinePools;
      this.pipelineAssembler = assembler;
      this.pipelineTracker = tracker;

      this.log('pipeline', 'Pipeline system initialization completed successfully');

    } catch (error) {
      throw new Error(`Pipeline system initialization failed: ${error.message}`);
    }
  }

  async createVirtualModelScheduler() {
    this.log('scheduler', 'Creating VirtualModelSchedulerManager with assembled pipeline pools...');

    try {
      const { VirtualModelSchedulerManager } = this.pipelineComponents;

      // Verify we have assembled pipeline pools
      if (!this.assembledPipelinePools || this.assembledPipelinePools.size === 0) {
        throw new Error('No assembled pipeline pools available for scheduler creation');
      }

      const managerConfig = {
        maxSchedulers: 10,
        defaultSchedulerConfig: {
          maxConcurrentRequests: 50,
          requestTimeout: 30000,
          healthCheckInterval: 60000,
          retryStrategy: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2
          },
          loadBalancingStrategy: 'round-robin',
          enableCircuitBreaker: true,
          circuitBreakerThreshold: 5,
          circuitBreakerTimeout: 300000
        },
        enableAutoScaling: true,
        scalingThresholds: {
          minRequestsPerMinute: 10,
          maxRequestsPerMinute: 1000,
          scaleUpCooldown: 300000,
          scaleDownCooldown: 600000
        },
        healthCheckInterval: 30000,
        metricsRetentionPeriod: 86400000, // 24 hours
        enableMetricsExport: true
      };

      // Create VirtualModelSchedulerManager with pre-assembled pipeline pools
      this.pipelineManager = new VirtualModelSchedulerManager(
        this.assembledPipelinePools,
        managerConfig,
        this.pipelineTracker
      );

      this.log('scheduler', 'VirtualModelSchedulerManager created with assembled pipeline pools', {
        schedulerCount: this.pipelineManager.getManagerMetrics().totalSchedulers,
        activeSchedulers: this.pipelineManager.getManagerMetrics().activeSchedulers,
        pipelinePools: this.assembledPipelinePools.size,
        virtualModels: Array.from(this.assembledPipelinePools.keys())
      });

    } catch (error) {
      throw new Error(`VirtualModelSchedulerManager creation failed: ${error.message}`);
    }
  }

  async createServerWithScheduler() {
    this.log('server', 'Creating ServerModule with prepared VirtualModelSchedulerManager...');

    try {
      // Import ServerModule
      const serverPath = path.join(process.cwd(), 'sharedmodule', 'server', 'dist', 'index.js');

      this.log('server', 'Loading ServerModule', { serverPath });

      if (!fs.existsSync(serverPath)) {
        throw new Error(`ServerModule not found at: ${serverPath}`);
      }

      const serverModule = await import(serverPath);
      const ServerModule = serverModule.ServerModule || serverModule.default;

      // Create server configuration
      const serverConfig = {
        port: this.port,
        host: '0.0.0.0',
        cors: {
          origin: '*',
          credentials: true
        },
        compression: true,
        helmet: true,
        rateLimit: {
          windowMs: 900000,
          max: 1000
        },
        timeout: 60000,
        bodyLimit: '50mb',
        enableVirtualModels: true,
        enablePipeline: true,
        debug: {
          enabled: true,
          level: 'debug'
        },
        monitoring: {
          enabled: true,
          detailedMetrics: true,
          requestTracing: true,
          performanceMonitoring: true
        },
        // Include pipeline configuration and providers for reference
        providers: this.config.providers,
        virtualModels: this.config.virtualModels,
        pipeline: this.config.pipeline,
        parsedConfig: {
          providers: this.config.providers,
          virtualModels: this.config.virtualModels,
          pipeline: this.config.pipeline
        },
        basePath: this.debugPath,
        enableTwoPhaseDebug: true
      };

      // Create ServerModule instance with prepared scheduler manager (T3: 流水线优先架构)
      this.log('server', 'Creating ServerModule instance with VirtualModelSchedulerManager...');

      // Always try new constructor first
      try {
        this.log('server', 'Using new ServerModule constructor with scheduler injection');
        this.server = new ServerModule(this.pipelineManager, serverConfig);
        this.log('server', 'ServerModule created with scheduler injection');
      } catch (constructorError) {
        this.log('server', 'Constructor with parameters failed, trying legacy constructor', {
          error: constructorError.message
        });

        // Fallback to legacy constructor
        this.server = new ServerModule();
        this.log('server', 'Using legacy ServerModule constructor (no scheduler injection)');
      }

      this.log('server', 'ServerModule created successfully');

      // Configure server (for legacy constructor mode)
      this.log('server', 'Configuring ServerModule...');
      await this.server.configure(serverConfig);

      // For legacy mode: inject scheduler manager after creation
      if (this.server.setVirtualModelSchedulerManager) {
        this.server.setVirtualModelSchedulerManager(this.pipelineManager);
        this.log('server', 'VirtualModelSchedulerManager injected into ServerModule');
      }

      this.log('server', 'ServerModule configured and scheduler manager injected');

    } catch (error) {
      throw new Error(`Server creation failed: ${error.message}`);
    }
  }

  async configureVirtualModelRouting() {
    this.log('virtual-models', 'Configuring virtual model routing...');

    try {
      // Verify server has scheduler manager
      if (!this.server || !this.pipelineManager) {
        throw new Error('Server or scheduler manager not available for virtual model routing');
      }

      // Get virtual model mappings from scheduler manager
      const virtualModelMappings = this.pipelineManager.getVirtualModelMappings();

      this.log('virtual-models', 'Virtual model mappings from scheduler manager', {
        totalMappings: virtualModelMappings.length,
        virtualModels: virtualModelMappings.map(m => m.virtualModelId)
      });

      // Register virtual models with server (using mappings from scheduler)
      for (const mapping of virtualModelMappings) {
        try {
          // Convert scheduler manager mapping to ServerModule virtual model config
          const virtualModelConfig = {
            id: mapping.virtualModelId,
            name: mapping.config.name,
            provider: mapping.config.provider,
            model: mapping.config.modelId,
            endpoint: mapping.config.endpoint || '',
            apiKey: mapping.config.apiKey,
            capabilities: mapping.config.capabilities || ['chat'],
            maxTokens: mapping.config.maxTokens || 4096,
            temperature: mapping.config.temperature || 0.7,
            topP: mapping.config.topP || 1.0,
            enabled: mapping.enabled,
            routingRules: mapping.config.routingRules || [],
            targets: mapping.config.targets || []
          };

          await this.server.registerVirtualModel(virtualModelConfig);

          this.log('virtual-models', `Registered virtual model: ${mapping.virtualModelId}`, {
            provider: mapping.config.provider,
            model: mapping.config.modelId,
            enabled: mapping.enabled
          });

        } catch (error) {
          this.log('virtual-models', `Failed to register virtual model ${mapping.virtualModelId}`, {
            error: error.message
          });
        }
      }

      this.log('virtual-models', 'Virtual model routing configuration completed', {
        totalRegistered: virtualModelMappings.length,
        activeVirtualModels: virtualModelMappings.filter(m => m.enabled).length,
        schedulerMetrics: this.pipelineManager.getManagerMetrics()
      });

    } catch (error) {
      throw new Error(`Virtual model routing configuration failed: ${error.message}`);
    }
  }

  async startServer() {
    this.log('server', 'Starting RCC HTTP Server...');

    try {
      // Initialize the server
      this.log('server', 'Initializing ServerModule...');
      await this.server.initialize();

      // Start the server
      this.log('server', 'Starting ServerModule HTTP server...');
      await this.server.start();

      this.log('server', 'HTTP server started successfully', {
        port: this.port,
        host: '0.0.0.0'
      });

    } catch (error) {
      throw new Error(`Server startup failed: ${error.message}`);
    }
  }

  async startServerWithPreparedPipeline() {
    this.log('server', 'Starting server with prepared pipeline system... [DEPRECATED]');
    this.log('server', 'This method is deprecated. Use separate createServerWithScheduler + startServer methods.');

    // Delegate to new separate methods
    await this.createServerWithScheduler();
    await this.startServer();
  }

  async finalizeSystemStartup() {
    this.log('system', 'Finalizing system startup...');

    // Verify that virtual models are properly registered
    const virtualModels = this.server.getVirtualModels ? this.server.getVirtualModels() : [];
    const enabledModels = this.server.virtualModelRouter ?
      this.server.virtualModelRouter.getEnabledModels() : [];

    const metrics = this.pipelineManager.getManagerMetrics();

    this.log('system', 'System startup verification', {
      totalVirtualModels: virtualModels.length,
      enabledVirtualModels: enabledModels.length,
      pipelineSchedulers: metrics.totalSchedulers,
      activeSchedulers: metrics.activeSchedulers,
      serverStatus: this.server.getStatus ? await this.server.getStatus() : 'running'
    });

    // Verify no "No available targets" error - we have 6 enabled models with targets
    if (enabledModels.length === 0) {
      throw new Error('Critical startup failure: No virtual models available');
    }

    console.log('\n✅ RCC System Successfully Started!');
    console.log(`🌐 Server URL: http://localhost:${this.port}`);
    console.log(`🔧 API Endpoint: http://localhost:${this.port}/v1/messages`);
    console.log(`📊 Health Check: http://localhost:${this.port}/status`);
    console.log(`🎯 Virtual Models Available: ${enabledModels.length} models with targets`);

    this.log('system', 'System startup finalized successfully');
  }

  async stop() {
    this.log('system', 'Shutting down RCC system...');

    try {
      if (this.server) {
        await this.server.stop();
        this.log('server', 'HTTP server stopped');
      }

      if (this.pipelineManager) {
        await this.pipelineManager.destroy();
        this.log('pipeline', 'VirtualModelSchedulerManager destroyed');
      }

      this.log('system', 'RCC system shutdown completed');

    } catch (error) {
      throw new Error(`System shutdown failed: ${error.message}`);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    port: parseInt(args.find(arg => arg === '--port' || arg === '-p') && args[args.indexOf(args.find(arg => arg === '--port' || arg === '-p')) + 1]) || 5506,
    config: args.find(arg => arg === '--config' || arg === '-c') && args[args.indexOf(args.find(arg => arg === '--config' || arg === '-c')) + 1] || undefined,
    debug: args.find(arg => arg === '--debug' || arg === '-d') && args[args.indexOf(args.find(arg => arg === '--debug' || arg === '-d')) + 1] || undefined,
    verbose: args.includes('--verbose') || args.includes('-v')
  };

  const initializer = new RCCSystemInitializer(options);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Graceful shutdown requested...');
    await initializer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Termination signal received...');
    await initializer.stop();
    process.exit(0);
  });

  try {
    await initializer.start();

    // Keep the process running
    console.log('\n⏳ RCC System is running. Press Ctrl+C to stop.');

  } catch (error) {
    console.error('💥 Startup failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { RCCSystemInitializer };