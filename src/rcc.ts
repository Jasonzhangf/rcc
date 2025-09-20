#!/usr/bin/env node

/**
 * RCC - Refactored Claude Code Router CLI
 * TypeScript implementation with type safety and JSON validation
 * Enhanced with SafeJSON validation framework
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { safeJson } from './utils/safe-json';
import { DynamicImportManager } from './utils/dynamic-import-manager';
import {
  RccConfig,
  ProviderConfig,
  VirtualModelConfig,
  PackageJson,
  ServerModuleConfig,
  DebugCenterModule,
  ServerModuleModule,
  PipelineModule,
} from './types';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Safe JSON-based package.json loading with validation
 */
function loadPackageJson(): PackageJson {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = safeJson.parseFile<PackageJson>(packagePath, {
    required: true,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        version: { type: 'string' },
        description: { type: 'string' },
        bin: { type: 'object' },
        dependencies: { type: 'object' },
      },
      required: ['name', 'version'],
    },
  });

  return packageJson || { name: 'rcc', version: '0.1.2' };
}

/**
 * Substitute environment variables with default values
 * Supports ${VARIABLE:-default} syntax
 */
function substituteEnvironmentVariables<T>(data: T): T {
  if (typeof data === 'string') {
    return data.replace(/\$\{([^}]+)\}/g, (match, variableSpec) => {
      // Check for default value syntax: ${VARIABLE:-default}
      if (variableSpec.includes(':-')) {
        const [variableName, defaultValue] = variableSpec.split(':-', 2);
        return process.env[variableName] || defaultValue;
      }
      // Simple variable: ${VARIABLE}
      return process.env[variableSpec] || match;
    }) as unknown as T;
  } else if (Array.isArray(data)) {
    return data.map((item) => substituteEnvironmentVariables(item)) as unknown as T;
  } else if (typeof data === 'object' && data !== null) {
    const result = {} as T;
    for (const [key, value] of Object.entries(data)) {
      result[key as keyof T] = substituteEnvironmentVariables(value) as T[keyof T];
    }
    return result;
  }
  return data;
}

/**
 * Load and validate RCC configuration from file
 */
async function loadRccConfig(configPath: string): Promise<RccConfig> {
  try {
    const configData = safeJson.parseFile<RccConfig>(configPath, {
      required: false,
      schema: {
        type: 'object',
        properties: {
          port: { type: 'number' },
          server: {
            type: 'object',
            properties: {
              port: { type: 'number' },
            },
          },
          providers: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                endpoint: { type: 'string' },
                models: { type: 'object' },
                auth: { type: 'object' },
              },
            },
          },
          virtualModels: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                enabled: { type: 'boolean' },
                targets: { type: 'array' },
                capabilities: { type: 'array' },
                maxTokens: { type: 'number' },
              },
            },
          },
          pipeline: { type: 'object' },
        },
      },
    });

    return (
      configData || {
        providers: {},
        virtualModels: {},
        pipeline: {},
      }
    );
  } catch (error) {
    console.warn(`⚠️ Configuration file not found or invalid: ${configPath}`);
    return {
      providers: {},
      virtualModels: {},
      pipeline: {},
    };
  }
}

/**
 * Initialize server module with type-safe dynamic import
 */
async function initializeServerModules() {
  const importManager = DynamicImportManager.getInstance();

  const serverPath = path.join(__dirname, '..', 'sharedmodule', 'server', 'dist', 'index.js');
  const debugCenterPath = path.join(
    __dirname,
    '..',
    'sharedmodule',
    'debugcenter',
    'dist',
    'index.esm.js'
  );

  // ServerModule import with type safety
  const serverModuleResult = await importManager.import<{
    ServerModule: ServerModuleModule;
    default?: ServerModuleModule;
  }>(serverPath, {
    fallback: async () => {
      console.log('   ⚠️  ServerModule not found - building...');
      return importManager.buildAndImport(serverPath, 'cd sharedmodule/server && npm run build');
    },
    validate: (module) => !!(module.ServerModule || module.default),
  });

  const ServerModule = serverModuleResult.ServerModule || serverModuleResult.default;
  console.log('   ✓ ServerModule loaded from local sharedmodule');

  // DebugCenter import with type safety
  const debugCenterResult = await importManager.import<{
    DebugCenter: DebugCenterModule;
    DebugEventBus?: any;
    default?: DebugCenterModule;
  }>(debugCenterPath, {
    required: false,
    validate: (module) => !!(module.DebugCenter || module.default),
  });

  const DebugCenter = debugCenterResult?.DebugCenter || debugCenterResult?.default;
  const DebugEventBus = debugCenterResult?.DebugEventBus;

  if (DebugCenter) {
    console.log('   ✓ DebugCenter loaded from local sharedmodule');
  }

  return { ServerModule, DebugCenter, DebugEventBus };
}

/**
 * Terminal options interface
 */
interface StartOptions {
  port: string;
  config?: string;
  debug?: string;
  enableTwoPhaseDebug?: boolean;
  enableAutoRestart?: boolean;
  autoRestartAttempts?: string;
  enablePipelineTracking?: boolean;
  verbose?: boolean;
}

/**
 * Initialize ServerModule with comprehensive configuration
 */
async function initializeServer(
  ServerModule: ServerModuleModule,
  config: RccConfig,
  options: {
    port: number;
    debugPath: string;
    systemDebugPath: string;
    enablePipelineTracking: boolean;
    enableTwoPhaseDebug: boolean;
  }
): Promise<any> {
  const { port, debugPath, systemDebugPath, enablePipelineTracking, enableTwoPhaseDebug } = options;

  // Port conflict detection
  const portInUse = await checkPortConflict(port);
  if (portInUse) {
    await resolvePortConflict(port);
  }

  // Server configuration with type safety
  const serverConfig: ServerModuleConfig = {
    port,
    host: '0.0.0.0',
    cors: {
      origin: '*',
      credentials: true,
    },
    compression: true,
    helmet: true,
    rateLimit: {
      windowMs: 900000, // 15 minutes
      max: 1000,
    },
    timeout: 60000,
    bodyLimit: '50mb',
    enableVirtualModels: true,
    enablePipeline: enablePipelineTracking,
    debug: {
      enabled: true,
      level: debugPath.includes('production') ? 'info' : 'debug',
    },
    monitoring: {
      enabled: true,
      detailedMetrics: true,
      requestTracing: true,
      performanceMonitoring: true,
    },
    parsedConfig: {
      providers: config.providers || {},
      virtualModels: config.virtualModels || {},
      pipeline: config.pipeline || {},
    },
    basePath: debugPath,
    enableTwoPhaseDebug,
  };

  return { serverConfig, systemDebugPath, debugPath };
}

/**
 * Check if port is in use
 */
async function checkPortConflict(port: number): Promise<boolean> {
  const importManager = DynamicImportManager.getInstance();

  try {
    const { execSync } = await importManager.import<{ execSync: Function }>('child_process');

    try {
      // Try lsof method (macOS/Linux)
      const processes = execSync(`lsof -ti :${port}`, { encoding: 'utf8' });
      return !!processes.trim();
    } catch {
      // Fallback to netstat method
      try {
        const processes = execSync(
          `netstat -anvp tcp | awk '$4 ~ /\.${port}$/ {print $2}' | sort -u`,
          { encoding: 'utf8' }
        );
        return !!processes.trim();
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
}

/**
 * Resolve port conflicts by stopping existing processes
 */
async function resolvePortConflict(port: number): Promise<void> {
  const importManager = DynamicImportManager.getInstance();
  const { execSync } = await importManager.import<{ execSync: Function }>('child_process');

  console.log(`⚠️ Port ${port} is already in use, attempting to stop existing services...`);

  try {
    // Try graceful stop first
    execSync('rcc stop', { stdio: 'pipe', timeout: 10000 });
    console.log(`✅ Graceful stop completed`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch {
    // Force kill if graceful fails
    const processes = execSync(`lsof -ti :${port}`, { encoding: 'utf8' });
    const pids = processes
      .trim()
      .split('\n')
      .filter((pid) => pid.trim());

    for (const pid of pids) {
      try {
        execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
        console.log(`✅ Force killed process ${pid}`);
      } catch (error) {
        console.log(`⚠️ Failed to kill process ${pid}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

/**
 * Initialize Pipeline system with type-safe imports
 */
async function initializePipelineSystem(
  config: RccConfig,
  systemDebugPath: string,
  verbose: boolean = false
): Promise<any> {
  const importManager = DynamicImportManager.getInstance();

  try {
    // Pipeline module import with type safety
    const pipelineModule = await importManager.import<PipelineModule>('rcc-pipeline', {
      validate: (module) =>
        !!(
          module.Pipeline &&
          module.VirtualModelSchedulerManager &&
          module.PipelineAssembler &&
          module.PipelineTracker
        ),
    });

    const { Pipeline, VirtualModelSchedulerManager, PipelineAssembler, PipelineTracker } =
      pipelineModule;
    console.log(`✅ Pipeline module loaded successfully`);

    // Create PipelineTracker
    const pipelineTracker = new PipelineTracker({
      enabled: true,
      logLevel: 'debug',
      enableMetrics: true,
      enableTracing: true,
      baseDirectory: systemDebugPath,
    });
    await pipelineTracker.initialize();
    console.log(`✅ PipelineTracker initialized`);

    // Validate configuration
    const providerKeys = Object.keys(config.providers || {});
    const virtualModelKeys = Object.keys(config.virtualModels || {});

    if (providerKeys.length === 0) {
      throw new Error('Configuration validation failed: No providers configured');
    }

    if (virtualModelKeys.length === 0) {
      throw new Error('Configuration validation failed: No virtual models configured');
    }

    // Provider discovery options
    const providerDiscoveryOptions = {
      scanPaths: ['./sharedmodule'],
      providerPatterns: ['*Provider.js', '*Provider.ts'],
      recursive: true,
      providerConfigs: config.providers || {},
    };

    if (verbose) {
      console.log(`📋 Providers found: ${providerKeys.join(', ')}`);
      console.log(`📋 Virtual models found: ${virtualModelKeys.join(', ')}`);
    }

    // Pipeline factory configuration
    const pipelineFactoryConfig = {
      defaultTimeout: 30000,
      defaultHealthCheckInterval: 60000,
      defaultMaxRetries: 3,
      defaultLoadBalancingStrategy: 'round-robin',
      enableHealthChecks: false,
      metricsEnabled: true,
    };

    // Assembler configuration
    const assemblerConfig = {
      providerDiscoveryOptions,
      pipelineFactoryConfig,
      enableAutoDiscovery: true,
      fallbackStrategy: 'first-available',
    };

    // Convert virtual models to array format
    const virtualModelConfigs = Object.values(config.virtualModels || {});

    return { PipelineAssembler, pipelineTracker, assemblerConfig, virtualModelConfigs };
  } catch (error) {
    console.log(`⚠️  Pipeline module initialization failed: ${error.message}`);
    throw error;
  }
}

/**
 * Setup debugging system with DebugCenter integration
 */
async function setupDebugSystem(
  DebugCenter: DebugCenterModule,
  DebugEventBus: any,
  options: {
    systemDebugPath: string;
    systemStartDir: string;
    portModeDir: string;
    port: number;
    enableTwoPhaseDebug: boolean;
    verbose: boolean;
  }
): Promise<{ systemStartSessionId: string; debugCenter: any }> {
  const { systemDebugPath, systemStartDir, portModeDir, port, enableTwoPhaseDebug, verbose } =
    options;

  if (!enableTwoPhaseDebug) {
    return { systemStartSessionId: '', debugCenter: null };
  }

  try {
    // Initialize DebugCenter
    const debugCenter = new DebugCenter({
      outputDirectory: systemDebugPath,
      enableRealTimeUpdates: true,
    });

    // System startup session
    const systemStartSessionId = `system-start-${Date.now()}`;

    // Publish startup event
    DebugEventBus.getInstance().publish({
      sessionId: systemStartSessionId,
      moduleId: 'system',
      operationId: 'session_start',
      timestamp: Date.now(),
      type: 'start',
      position: 'start',
      data: {
        sessionName: 'RCC System Startup',
        startTime: Date.now(),
        debugPath: systemDebugPath,
        port,
        systemStartDir,
        portModeDir,
      },
    });

    if (verbose) {
      console.log(`✅ Two-phase debug system initialized: ${systemStartSessionId}`);
    }

    return { systemStartSessionId, debugCenter };
  } catch (error) {
    console.log(`⚠️  Two-phase debug initialization failed: ${error.message}`);
    return { systemStartSessionId: '', debugCenter: null };
  }
}

/**
 * Main CLI program
 */
const packageJson = loadPackageJson();
const program = new Command();

// Enhanced CLI with full feature support
program
  .name('rcc')
  .description('RCC - Refactored Claude Code Router - Full Framework Implementation')
  .version(packageJson.version || '0.1.2');

// Start command with comprehensive features
program
  .command('start')
  .description('Start the RCC system with full framework capabilities')
  .option('-p, --port <port>', 'Port to run on', '5506')
  .option('-c, --config <config>', 'Configuration file path')
  .option('-d, --debug <path>', 'Debug base path', '~/.rcc/debug-logs')
  .option('--enable-two-phase-debug', 'Enable two-phase debugging system', true)
  .option('--enable-auto-restart', 'Enable automatic restart on failure', true)
  .option('--auto-restart-attempts <number>', 'Maximum auto-restart attempts', '3')
  .option('--enable-pipeline-tracking', 'Enable pipeline execution tracking', true)
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (options: StartOptions) => {
    try {
      console.log('='.repeat(60));
      console.log('🚀 RCC Advanced Startup System (TypeScript Edition)');
      console.log('='.repeat(60));

      // Parse options with validation
      let port = safeJson.parseNumber(options.port, { defaultValue: 5506, min: 1024, max: 65535 });
      const configPath = options.config || path.join(os.homedir(), '.rcc', 'rcc-config.json');
      const fullConfigPath = configPath.startsWith('~')
        ? configPath.replace('~', os.homedir())
        : configPath;
      const debugPath = options.debug
        ? options.debug.replace('~', os.homedir())
        : path.join(os.homedir(), '.rcc', 'debug-logs');
      const verbose = options.verbose || false;
      const enableTwoPhaseDebug = options.enableTwoPhaseDebug !== false;
      const enableAutoRestart = options.enableAutoRestart !== false;
      const autoRestartAttempts = safeJson.parseNumber(options.autoRestartAttempts, {
        defaultValue: 3,
        min: 0,
      });
      const enablePipelineTracking = options.enablePipelineTracking !== false;

      if (verbose) {
        console.log('📋 Configuration:');
        console.log(`  Port: ${port}`);
        console.log(`  Config file: ${fullConfigPath}`);
        console.log(`  Debug path: ${debugPath}`);
      }

      // Create debug directories
      const systemDebugPath = path.resolve(debugPath);
      const portDebugPath = path.resolve(debugPath, `port-${port}`);
      const systemStartDir = path.join(systemDebugPath, 'systemstart');
      const portModeDir = path.join(systemDebugPath, `port-${port}`);

      // Ensure directories exist
      await fs.ensureDir(systemDebugPath);
      await fs.ensureDir(portDebugPath);
      await fs.ensureDir(systemStartDir);
      await fs.ensureDir(portModeDir);

      // Load configuration
      const config = await loadRccConfig(fullConfigPath);
      console.log(`✅ Configuration loaded from: ${fullConfigPath}`);

      // Check port from config file if not explicitly provided
      if (!options.port && config.port) {
        port = config.port;
      }

      // Import server modules with type safety
      const { ServerModule, DebugCenter, DebugEventBus } = await initializeServerModules();

      // Setup debug system
      const { systemStartSessionId, debugCenter } = await setupDebugSystem(
        DebugCenter,
        DebugEventBus,
        {
          systemDebugPath,
          systemStartDir,
          portModeDir,
          port,
          enableTwoPhaseDebug,
          verbose,
        }
      );

      if (debugCenter) {
        global.debugCenter = debugCenter;
        global.systemStartSessionId = systemStartSessionId;
      }

      // Initialize server
      const { serverConfig } = await initializeServer(ServerModule, config, {
        port,
        debugPath,
        systemDebugPath,
        enablePipelineTracking,
        enableTwoPhaseDebug,
      });

      // Initialize Pipeline system
      const pipelineData = await initializePipelineSystem(config, systemDebugPath, verbose);

      // Create server instance
      const server = new ServerModule();
      await server.configure(serverConfig);

      if (debugCenter) {
        server.debugCenter = debugCenter;
        server.debugCenterSessionId = systemStartSessionId;
      }

      await server.initialize();
      await server.start();

      console.log(`✅ RCC HTTP Server started successfully on port ${port}`);
      console.log(`🌐 Server URL: http://localhost:${port}`);
      console.log(`📊 API endpoint: http://localhost:${port}/v1/messages`);
      console.log(`🔧 Health check: http://localhost:${port}/status`);

      // Graceful shutdown handling
      const shutdown = async () => {
        console.log(`\n🛑 Shutting down RCC HTTP Server...`);
        await server.stop();
        // Additional cleanup here (debug sessions, etc.)
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    } catch (error) {
      console.error('\n❌ RCC System Startup Failed:');
      console.error(`   Error: ${error.message}`);
      if (options.verbose && error.stack) {
        console.error('   Stack:', error.stack);
      }
      process.exit(1);
    }
  });

// Other commands... (stop, status, code, etc.)

program.parse();
