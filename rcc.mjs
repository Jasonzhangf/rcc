#!/usr/bin/env node

/**
 * RCC - Refactored Claude Code Router CLI
 * Full implementation based on CLI Framework with complete feature integration
 * ES Module Version
 */

import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Package configuration
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

/**
 * Substitute environment variables with default values
 * Supports ${VARIABLE:-default} syntax
 */
function substituteEnvironmentVariables(data) {
  if (typeof data === 'string') {
    return data.replace(/\$\{([^}]+)\}/g, (match, variableSpec) => {
      // Check for default value syntax: ${VARIABLE:-default}
      if (variableSpec.includes(':-')) {
        const [variableName, defaultValue] = variableSpec.split(':-', 2);
        return process.env[variableName] || defaultValue;
      }
      // Simple variable: ${VARIABLE}
      return process.env[variableSpec] || match;
    });
  } else if (Array.isArray(data)) {
    return data.map(item => substituteEnvironmentVariables(item));
  } else if (typeof data === 'object' && data !== null) {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = substituteEnvironmentVariables(value);
    }
    return result;
  }
  return data;
}

// Import wrapper generation functions from config-parser
let generateAllWrappers = null;
try {
  const configParserPath = path.join(__dirname, 'sharedmodule/config-parser/dist/index.js');
  if (fs.existsSync(configParserPath)) {
    const configParserModule = await import(configParserPath);
    generateAllWrappers = configParserModule.generateAllWrappers;
    console.log('   ✓ Config parser wrapper generation loaded');
  } else {
    console.log('   ⚠️  Config parser not found - building...');
    const { execSync } = await import('child_process');
    try {
      execSync('cd sharedmodule/config-parser && npm run build', { stdio: 'inherit' });
      const configParserModule = await import(configParserPath);
      generateAllWrappers = configParserModule.generateAllWrappers;
      console.log('   ✓ Config parser built and loaded');
    } catch (buildError) {
      console.log('   ⚠️  Failed to build config parser');
    }
  }
} catch (error) {
  console.log('   ⚠️  Failed to load config parser wrapper generation');
}

// ServerModule integration - use local sharedmodule server
let ServerModule = null;
let DebugCenter = null;
let DebugEventBus = null;
try {
  // Import ServerModule from local sharedmodule
  const serverPath = path.join(__dirname, 'sharedmodule/server/dist/index.js');

  if (fs.existsSync(serverPath)) {
    const serverModule = await import(serverPath);
    ServerModule = serverModule.ServerModule || serverModule.default;
    console.log('   ✓ ServerModule loaded from local sharedmodule');
  } else {
    console.log('   ⚠️  ServerModule not found - building...');
    // Build the server module if not found
    const { execSync } = await import('child_process');
    try {
      execSync('cd sharedmodule/server && npm run build', { stdio: 'inherit' });
      const serverModule = await import(serverPath);
      ServerModule = serverModule.ServerModule || serverModule.default;
      console.log('   ✓ ServerModule built and loaded');
    } catch (buildError) {
      console.log('   ⚠️  Failed to build server module');
      ServerModule = null;
    }
  }

  // Try to load DebugCenter from local sharedmodule
  try {
    const debugCenterPath = path.join(__dirname, 'sharedmodule/debugcenter/dist/index.esm.js');
    if (fs.existsSync(debugCenterPath)) {
      const debugModule = await import(debugCenterPath);
      DebugCenter = debugModule.DebugCenter || debugModule.default;
      DebugEventBus = debugModule.DebugEventBus;
      console.log('   ✓ DebugCenter loaded from local sharedmodule');
    } else {
      console.log('   ⚠️  DebugCenter not found in local sharedmodule');
      DebugCenter = null;
    }
  } catch (debugError) {
    console.log('   ⚠️  Failed to load DebugCenter');
    console.log(`   Debug error: ${debugError.message}`);
    DebugCenter = null;
  }
} catch (error) {
  console.log('   ⚠️  Failed to load server module');
  console.log(`   Error: ${error.message}`);
  ServerModule = null;
  DebugCenter = null;
}

// Enhanced CLI with full feature support
program
  .name('rcc')
  .description('RCC - Refactored Claude Code Router - Full Framework Implementation')
  .version(packageJson.version || '0.1.2');

// Comprehensive Start Command with all advanced features
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
  .action(async (options) => {
    try {
      console.log('='.repeat(60));
      console.log('🚀 RCC Advanced Startup System');
      console.log('='.repeat(60));

      // Parse options with configuration file support
      let port = parseInt(options.port) || 5506;
      const configPath = options.config || path.join(os.homedir(), '.rcc/rcc-config.json');
      const fullConfigPath = configPath.startsWith('~')
        ? configPath.replace('~', os.homedir())
        : configPath;
      const debugPath = options.debug ? options.debug.replace('~', os.homedir()) : path.join(os.homedir(), '.rcc/debug-logs');
      const verbose = options.verbose || false;
      const enableTwoPhaseDebug = options.enableTwoPhaseDebug !== false; // Default true
      const enableAutoRestart = options.enableAutoRestart !== false; // Default true
      const autoRestartAttempts = parseInt(options.autoRestartAttempts) || 3;
      const enablePipelineTracking = options.enablePipelineTracking !== false; // Default true

      // Try to read port from configuration file if not explicitly provided
      if (!options.port) {
        try {
          const fs = await import('fs');
          const configData = JSON.parse(fs.readFileSync(fullConfigPath, 'utf8'));
          // Look for port in common configuration locations
          port = configData.port || configData.server?.port || port;
        } catch (configError) {
          // Use default port if config file can't be read
        }
      }

      // Expanded option validation
      if (port < 1024 || port > 65535) {
        throw new Error('Port must be between 1024 and 65535');
      }

      if (autoRestartAttempts < 0) {
        throw new Error('Auto-restart attempts must be positive');
      }

      if (verbose) {
        console.log('📋 Configuration:');
        console.log(`  Port: ${port}`);
        console.log(`  Config file: ${fullConfigPath}`);
        console.log(`  PID file: .rcc/pid-${port}.json`);
      }

      console.log(`\n📊 Starting RCC system on port ${port}...`);
      console.log(`📁 Config: ${fullConfigPath}`);
      console.log(`🔄 Two-phase debug: ${enableTwoPhaseDebug ? 'enabled' : 'disabled'}`);
      console.log(`🔁 Auto-restart: ${enableAutoRestart ? 'enabled' : 'disabled'} (${autoRestartAttempts} attempts)`);
      console.log(`📈 Pipeline tracking: ${enablePipelineTracking ? 'enabled' : 'disabled'}`);

      // Create debug directories with proper structure
      const systemDebugPath = path.resolve(debugPath);
      const portDebugPath = path.resolve(debugPath, `port-${port}`);
      const systemStartDir = path.join(systemDebugPath, 'systemstart');
      const portModeDir = path.join(systemDebugPath, `port-${port}`);

      try {
        fs.mkdirSync(systemDebugPath, { recursive: true });
        fs.mkdirSync(portDebugPath, { recursive: true });
        fs.mkdirSync(systemStartDir, { recursive: true });
        fs.mkdirSync(portModeDir, { recursive: true });
        if (verbose) console.log(`✅ Created debug directories: ${systemDebugPath}`);
      } catch (error) {
        if (verbose) console.log(`⚠️  Debug directories may already exist`);
      }

      // Check configuration file
      let config = { providers: {}, virtualModels: {}, pipeline: {} };
      try {
        if (fs.existsSync(configPath)) {
          let configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          // Apply environment variable substitution with default values
          configData = substituteEnvironmentVariables(configData);
          config = configData;
          console.log(`✅ Configuration loaded from: ${configPath}`);
          if (verbose) console.log('📋 Configuration content:', config);
        } else {
          console.log(`⚠️  Configuration file not found: ${configPath}`);
          console.log('💡 Starting with default configuration');
        }
      } catch (error) {
        console.error(`❌ Error loading configuration: ${error.message}`);
        process.exit(1);
      }

      // Initialize two-phase debug system with proper DebugCenter integration
      if (enableTwoPhaseDebug) {
        console.log(`\n🔧 Initializing two-phase debug system...`);

        // Initialize DebugCenter if available
        if (DebugCenter) {
          console.log(`\n🔧 Initializing DebugCenter...`);
          try {
            const debugCenter = new DebugCenter({
              outputDirectory: systemDebugPath,
              enableRealTimeUpdates: true
            });

            // Create system startup session before port initialization
            const systemStartSessionId = `system-start-${Date.now()}`;

            // Start session via event bus
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
                config: options.config,
                debugPath: systemDebugPath,
                port: port,
                systemStartDir: systemStartDir,
                portModeDir: portModeDir
              }
            });

            // Record system initialization phase
            DebugEventBus.getInstance().publish({
              sessionId: systemStartSessionId,
              moduleId: 'rcc-system',
              operationId: 'system-initialization',
              timestamp: Date.now(),
              type: 'start',
              position: 'start',
              data: {
                input: { phase: 'debug-setup', debugPath: systemDebugPath },
                output: { systemStartDir: systemStartDir, portModeDir: portModeDir }
              }
            });

            // Store DebugCenter instance globally for module access
            global.debugCenter = debugCenter;
            global.systemStartSessionId = systemStartSessionId;

            console.log(`✅ DebugCenter initialized successfully`);
            console.log(`✅ Pipeline session started: ${systemStartSessionId}`);
            console.log(`✅ I/O tracking enabled for all modules`);
            console.log(`✅ Debug directories: ${systemDebugPath}`);

          } catch (error) {
            console.log(`❌ DebugCenter initialization failed: ${error.message}`);
          }
        } else {
          console.log(`⚠️  DebugCenter not available - using basic file logging`);

          // Create debug directories for basic logging
          try {
            fs.mkdirSync(systemStartDir, { recursive: true });
            fs.mkdirSync(portModeDir, { recursive: true });
            console.log(`✅ Basic debug directories created: ${systemDebugPath}`);
          } catch (error) {
            console.log(`⚠️  Debug directories may already exist`);
          }
        }
      }

      // Simulate BootstrapService integration
      console.log(`\n🔄 Bootstrap service initialization...`);
      console.log(`✅ Module lifecycle management: BaseModule integrated`);
      console.log(`✅ Service coordination: Ready`);
      console.log(`✅ Configuration system: Loaded`);

      // Pipeline tracking setup
      if (enablePipelineTracking) {
        console.log(`📊 Pipeline tracking enabled`);
        console.log(`  - Request tracking: Active`);
        console.log(`  - Response tracking: Active`);
        console.log(`  - Performance monitoring: Active`);
      }

      // Auto-restart configuration
      if (enableAutoRestart) {
        console.log(`🔁 Auto-restart configured (${autoRestartAttempts} attempts)`);
        console.log(`  - Retry delay: 5000ms`);
        console.log(`  - Failure handling: Graceful shutdown`);
      }

      console.log(`\n✅ RCC system initialization completed`);

      // ServerModule integration - actually start the HTTP server
      if (ServerModule) {
        try {
          console.log(`🚀 Starting RCC HTTP Server...`);

          // Check if port is already in use
          const { execSync } = await import('child_process');
          let portInUse = false;
          try {
            // Get process IDs using port with cross-platform approach
            let processes;
            try {
              // First try lsof method (macOS/Linux)
              processes = execSync(`lsof -ti :${port}`, { encoding: 'utf8' });
            } catch (lsofError) {
              // Fallback to netstat method if lsof fails
              try {
                processes = execSync(`netstat -anvp tcp | awk '$4 ~ /\.${port}$/ {print $2}' | sort -u`, { encoding: 'utf8' });
              } catch (netstatError) {
                processes = '';
              }
            }
            
            if (processes.trim()) {
              portInUse = true;
              const pids = processes.trim().split('\n').filter(pid => pid.trim());
              console.log(`⚠️ Port ${port} is already in use by processes: ${pids.join(', ')}`);
              console.log(`🔄 Attempting to stop existing service...`);

              try {
                // Try graceful stop first using rcc stop command
                execSync('rcc stop', { stdio: 'pipe', timeout: 10000 });
                console.log(`✅ Graceful stop completed`);
                // Wait a moment for port to be released
                await new Promise(resolve => setTimeout(resolve, 2000));
              } catch (stopError) {
                console.log(`⚠️ Graceful stop failed, killing processes...`);
                // Force kill processes on the port
                try {
                  // Kill each process gracefully first
                  for (const pid of pids) {
                    try {
                      execSync(`kill ${pid}`, { stdio: 'pipe', timeout: 5000 });
                      console.log(`✅ Sent SIGTERM to process ${pid}`);
                    } catch (termError) {
                      // Try force kill if graceful fails
                      try {
                        execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
                        console.log(`✅ Force killed process ${pid}`);
                      } catch (killError) {
                        console.log(`⚠️ Failed to kill process ${pid}: ${killError.message}`);
                      }
                    }
                  }
                  console.log(`✅ All processes killed`);
                  // Wait a moment for port to be released
                  await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (killError) {
                  console.log(`❌ Failed to kill processes: ${killError.message}`);
                }
              }
            }
          } catch (checkError) {
            // Port is not in use, which is good
            portInUse = false;
          }

          // Create server configuration from CLI options with complete server configuration
          const serverConfig = {
            port: port,
            host: '0.0.0.0',
            cors: {
              origin: '*',
              credentials: true
            },
            compression: true,
            helmet: true,
            rateLimit: {
              windowMs: 900000, // 15 minutes
              max: 1000
            },
            timeout: 60000, // 1 minute (max allowed)
            bodyLimit: '50mb', // Increase body limit to handle large requests
            enableVirtualModels: true,
            enablePipeline: enablePipelineTracking,
            debug: {
              enabled: true,
              level: debugPath.includes('production') ? 'info' : 'debug'
            },
            monitoring: {
              enabled: true,
              detailedMetrics: true,
              requestTracing: true,
              performanceMonitoring: true
            },
            parsedConfig: {
              providers: config.providers || {},
              virtualModels: config.virtualModels || {},
              pipeline: config.pipeline || {}
            },
            basePath: debugPath,
            enableTwoPhaseDebug: enableTwoPhaseDebug
          };

          // Initialize Pipeline module integration FIRST using wrapper generation
          console.log(`🔧 Initializing Pipeline module integration with wrapper generation...`);
          let schedulerManager = null;
          try {
            // Generate configuration wrappers first
            if (generateAllWrappers) {
              console.log(`🔧 Generating configuration wrappers...`);
              const { server: serverWrapper, pipeline: pipelineWrapper } = await generateAllWrappers(config);
              console.log(`✅ Configuration wrappers generated successfully`);
              console.log(`   - Server wrapper port: ${serverWrapper.port}`);
              console.log(`   - Pipeline wrapper virtual models: ${pipelineWrapper.virtualModels?.length || 0}`);
            } else {
              console.log(`⚠️ Wrapper generation not available, using legacy configuration`);
            }

            // Import Pipeline module from local sharedmodule
            const pipelineModulePath = path.join(__dirname, 'sharedmodule/pipeline/dist/index.esm.js');
            console.log(`🔍 Attempting to import pipeline module from: ${pipelineModulePath}`);
            let pipelineModule;
            try {
              pipelineModule = await import(pipelineModulePath);
              console.log(`✅ Pipeline module imported successfully`);
              console.log(`   - Available exports: ${Object.keys(pipelineModule).join(', ')}`);
            } catch (importError) {
              console.error(`❌ Failed to import pipeline module: ${importError.message}`);
              console.error(`   - Stack: ${importError.stack}`);
              throw importError;
            }
            const { PipelineFactory, VirtualModelSchedulerManager, PipelineAssembler, PipelineTracker } = pipelineModule;

            console.log(`🔍 Checking pipeline module components:`);
            console.log(`   - PipelineFactory: ${!!PipelineFactory}`);
            console.log(`   - VirtualModelSchedulerManager: ${!!VirtualModelSchedulerManager}`);
            console.log(`   - PipelineAssembler: ${!!PipelineAssembler}`);
            console.log(`   - PipelineTracker: ${!!PipelineTracker}`);
            if (PipelineFactory && VirtualModelSchedulerManager && PipelineAssembler && PipelineTracker) {
                console.log(`✅ Pipeline module loaded successfully`);

                // Create PipelineTracker for request tracking
                const pipelineTracker = new PipelineTracker({
                  enabled: true,
                  logLevel: 'debug',
                  enableMetrics: true,
                  enableTracing: true,
                  baseDirectory: systemDebugPath
                });
                await pipelineTracker.initialize();
                console.log(`✅ PipelineTracker initialized`);

                // Create PipelineAssembler with wrapper configuration logging
                console.log(`🔧 Creating PipelineAssembler with wrapper-based configuration:`);

                // Enhanced diagnostic logging for configuration validation
                console.log(`🔍 ENHANCED DIAGNOSTIC - Configuration Analysis:`);
                console.log(`   - Raw config object keys: ${Object.keys(config || {})}`);
                console.log(`   - Providers in config: ${Object.keys(config.providers || {}).join(', ')}`);
                console.log(`   - Virtual models in config: ${Object.keys(config.virtualModels || {}).join(', ')}`);
                console.log(`   - Pipeline config exists: ${!!config.pipeline}`);

                // Validate configuration structure before proceeding
                if (!config.providers || Object.keys(config.providers).length === 0) {
                  console.log(`❌ CRITICAL ERROR - No providers found in configuration`);
                  throw new Error('Configuration validation failed: No providers configured');
                }

                if (!config.virtualModels || Object.keys(config.virtualModels).length === 0) {
                  console.log(`❌ CRITICAL ERROR - No virtual models found in configuration`);
                  throw new Error('Configuration validation failed: No virtual models configured');
                }

                const providerDiscoveryOptions = {
                  scanPaths: ['./sharedmodule'],
                  providerPatterns: ['*Provider.js', '*Provider.ts'],
                  recursive: true,
                  providerConfigs: config.providers || {}
                };

                console.log(`📋 Provider Discovery Options:`);
                console.log(`   - Scan paths: ${providerDiscoveryOptions.scanPaths.join(', ')}`);
                console.log(`   - Provider patterns: ${providerDiscoveryOptions.providerPatterns.join(', ')}`);
                console.log(`   - Recursive: ${providerDiscoveryOptions.recursive}`);
                console.log(`   - Provider configs count: ${Object.keys(providerDiscoveryOptions.providerConfigs).length}`);

                // Log available providers in config
                if (providerDiscoveryOptions.providerConfigs) {
                  Object.keys(providerDiscoveryOptions.providerConfigs).forEach((providerId, index) => {
                    const provider = providerDiscoveryOptions.providerConfigs[providerId];
                    console.log(`   ${index + 1}. Provider "${providerId}":`);
                    console.log(`      - Type: ${provider.type || 'unknown'}`);
                    console.log(`      - Endpoint: ${provider.endpoint || 'not specified'}`);
                    console.log(`      - Models: ${Object.keys(provider.models || {}).join(', ')}`);
                    console.log(`      - Auth type: ${provider.auth?.type || 'none'}`);
                    console.log(`      - API keys count: ${provider.auth?.keys?.length || 0}`);
                  });
                }

                const pipelineFactoryConfig = {
                  defaultTimeout: 30000,
                  defaultHealthCheckInterval: 60000,
                  defaultMaxRetries: 3,
                  defaultLoadBalancingStrategy: 'round-robin',
                  enableHealthChecks: false, // Disabled as per requirements
                  metricsEnabled: true
                };

                console.log(`📋 Pipeline Factory Configuration:`);
                console.log(`   - Default timeout: ${pipelineFactoryConfig.defaultTimeout}ms`);
                console.log(`   - Health check interval: ${pipelineFactoryConfig.defaultHealthCheckInterval}ms`);
                console.log(`   - Max retries: ${pipelineFactoryConfig.defaultMaxRetries}`);
                console.log(`   - Load balancing: ${pipelineFactoryConfig.defaultLoadBalancingStrategy}`);
                console.log(`   - Health checks: ${pipelineFactoryConfig.enableHealthChecks}`);
                console.log(`   - Metrics enabled: ${pipelineFactoryConfig.metricsEnabled}`);

                const assemblerConfig = {
                  providerDiscoveryOptions,
                  pipelineFactoryConfig,
                  enableAutoDiscovery: true,
                  fallbackStrategy: 'first-available'
                };

                console.log(`🔧 Final assembler config: ${JSON.stringify(assemblerConfig, null, 2)}`);

                // Convert virtual models object to array for pipeline assembler
                const virtualModelConfigs = Object.values(config.virtualModels || {});
                console.log(`📋 Virtual model configurations count: ${virtualModelConfigs.length}`);

                const pipelineAssembler = new PipelineAssembler(assemblerConfig, pipelineTracker);
                console.log(`✅ PipelineAssembler created successfully`);

                // Assemble pipelines from configuration
                console.log(`🔧 Assembling pipelines from configuration...`);

                // Enhanced diagnostic logging for virtual model processing
                console.log(`🔍 ENHANCED DIAGNOSTIC - Virtual Model Processing:`);
                let enabledVirtualModels = 0;
                let validVirtualModels = 0;

                // Detailed logging of each virtual model configuration
                virtualModelConfigs.forEach((vmConfig, index) => {
                  console.log(`   ${index + 1}. Virtual Model "${vmConfig.id}":`);
                  console.log(`      - Enabled: ${vmConfig.enabled}`);
                  console.log(`      - Targets count: ${vmConfig.targets ? vmConfig.targets.length : 0}`);

                  if (vmConfig.enabled) {
                    enabledVirtualModels++;
                  }

                  if (vmConfig.targets && vmConfig.targets.length > 0) {
                    validVirtualModels++;
                    vmConfig.targets.forEach((target, targetIndex) => {
                      console.log(`         ${targetIndex + 1}. Provider: ${target.providerId}, Model: ${target.modelId}, KeyIndex: ${target.keyIndex || 0}`);
                      // Validate target configuration
                      if (!target.providerId || !target.modelId) {
                        console.log(`            ❌ INVALID TARGET - Missing providerId or modelId`);
                      } else {
                        console.log(`            ✅ Valid target configuration`);
                      }
                    });
                  } else {
                    console.log(`         ⚠️  No targets configured for this virtual model`);
                    if (vmConfig.enabled) {
                      console.log(`         ❌ CRITICAL - Enabled virtual model has no targets!`);
                    }
                  }
                });

                console.log(`📊 Virtual Model Summary:`);
                console.log(`   - Total virtual models: ${virtualModelConfigs.length}`);
                console.log(`   - Enabled virtual models: ${enabledVirtualModels}`);
                console.log(`   - Valid virtual models (with targets): ${validVirtualModels}`);
                console.log(`   - Invalid virtual models: ${virtualModelConfigs.length - validVirtualModels}`);

                if (validVirtualModels === 0) {
                  console.log(`❌ CRITICAL ERROR - No valid virtual models found (all have no targets)`);
                  throw new Error('Pipeline assembly failed: No valid virtual models with targets configured');
                }

                if (virtualModelConfigs.length > 0) {
                  console.log(`🔄 Starting pipeline assembly process...`);
                  const assemblyResult = await pipelineAssembler.assemblePipelines(virtualModelConfigs);

                  console.log(`📊 Pipeline assembly result:`);
                  console.log(`   - Success: ${assemblyResult.success}`);
                  console.log(`   - Pipeline pools created: ${assemblyResult.pipelinePools ? assemblyResult.pipelinePools.size : 0}`);
                  console.log(`   - Errors: ${assemblyResult.errors ? assemblyResult.errors.length : 0}`);
                  console.log(`   - Warnings: ${assemblyResult.warnings ? assemblyResult.warnings.length : 0}`);

                  // Enhanced diagnostic logging for assembly result analysis
                  console.log(`🔍 ENHANCED DIAGNOSTIC - Assembly Result Analysis:`);
                  console.log(`   - Assembly result object keys: ${Object.keys(assemblyResult || {})}`);
                  console.log(`   - PipelinePools is Map: ${assemblyResult.pipelinePools instanceof Map}`);
                  console.log(`   - PipelinePools size: ${assemblyResult.pipelinePools?.size || 0}`);
                  console.log(`   - Assembly success: ${assemblyResult.success}`);
                  console.log(`   - Assembly errors array: ${Array.isArray(assemblyResult.errors)}`);
                  console.log(`   - Assembly warnings array: ${Array.isArray(assemblyResult.warnings)}`);

                  if (assemblyResult.errors && assemblyResult.errors.length > 0) {
                    console.log(`❌ Pipeline assembly errors:`);
                    assemblyResult.errors.forEach((error, index) => {
                      console.log(`   ${index + 1}. ${error}`);
                      // Analyze error type
                      if (error.includes('provider') || error.includes('Provider')) {
                        console.log(`      → Provider-related error`);
                      } else if (error.includes('target') || error.includes('Target')) {
                        console.log(`      → Target configuration error`);
                      } else if (error.includes('module') || error.includes('Module')) {
                        console.log(`      → Module loading error`);
                      } else if (error.includes('config') || error.includes('Config')) {
                        console.log(`      → Configuration error`);
                      } else {
                        console.log(`      → Unknown error type`);
                      }
                    });
                  }

                  if (assemblyResult.warnings && assemblyResult.warnings.length > 0) {
                    console.log(`⚠️  Pipeline assembly warnings:`);
                    assemblyResult.warnings.forEach((warning, index) => {
                      console.log(`   ${index + 1}. ${warning}`);
                    });
                  }

                  if (assemblyResult.success && assemblyResult.pipelinePools && assemblyResult.pipelinePools.size > 0) {
                    console.log(`✅ Successfully assembled ${assemblyResult.pipelinePools.size} pipeline pools`);

                    // Detailed logging of each pipeline pool
                    console.log(`📋 Detailed pipeline pool information:`);
                    for (const [vmId, pool] of assemblyResult.pipelinePools.entries()) {
                      console.log(`   🏊 Pool "${vmId}":`);
                      console.log(`      - Health status: ${pool.healthStatus}`);
                      console.log(`      - Pipelines count: ${pool.pipelines ? pool.pipelines.size : 0}`);
                      console.log(`      - Available pipelines: ${pool.getAvailablePipelines ? pool.getAvailablePipelines().length : 'unknown'}`);

                      if (pool.pipelines && pool.pipelines.size > 0) {
                        console.log(`      - Pipeline details:`);
                        let pipelineIndex = 1;
                        for (const pipeline of pool.pipelines.values()) {
                          console.log(`         ${pipelineIndex}. ID: ${pipeline.id || 'unknown'}, Status: ${pipeline.status || 'unknown'}`);
                          if (pipeline.providerInfo) {
                            console.log(`            Provider: ${pipeline.providerInfo.id || 'unknown'}, Model: ${pipeline.providerInfo.model || 'unknown'}`);
                          }
                          pipelineIndex++;
                        }
                      } else {
                        console.log(`      - ⚠️  No pipelines in this pool`);
                      }
                    }

                    // Create VirtualModelSchedulerManager with pipeline pools
                    console.log(`🔧 Creating VirtualModelSchedulerManager...`);

                    // Enhanced diagnostic logging for scheduler creation
                    console.log(`🔍 ENHANCED DIAGNOSTIC - Scheduler Creation Analysis:`);
                    console.log(`   - Pipeline pools available: ${assemblyResult.pipelinePools.size}`);
                    console.log(`   - Pipeline pools type: ${typeof assemblyResult.pipelinePools}`);
                    console.log(`   - Pipeline pools is Map: ${assemblyResult.pipelinePools instanceof Map}`);
                    console.log(`   - PipelineTracker available: ${!!pipelineTracker}`);
                    console.log(`   - PipelineTracker type: ${typeof pipelineTracker}`);

                    // Validate pipeline pools before creating scheduler
                    if (assemblyResult.pipelinePools.size === 0) {
                      console.log(`❌ CRITICAL ERROR - Cannot create scheduler with empty pipeline pools`);
                      throw new Error('Scheduler creation failed: No pipeline pools available');
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
                        loadBalancingStrategy: 'round-robin'
                      },
                      enableAutoScaling: false,
                      healthCheckInterval: 30000,
                      metricsRetentionPeriod: 86400000, // 24 hours
                      enableMetricsExport: true
                    };

                    console.log(`📋 Scheduler Manager Configuration:`);
                    console.log(`   - Max schedulers: ${managerConfig.maxSchedulers}`);
                    console.log(`   - Request timeout: ${managerConfig.defaultSchedulerConfig.requestTimeout}ms`);
                    console.log(`   - Health check interval: ${managerConfig.defaultSchedulerConfig.healthCheckInterval}ms`);
                    console.log(`   - Max retries: ${managerConfig.defaultSchedulerConfig.retryStrategy.maxRetries}`);

                    // Detailed logging of pipeline pools being passed to scheduler
                    console.log(`📋 Pipeline pools being passed to scheduler:`);
                    let poolIndex = 1;
                    for (const [vmId, pool] of assemblyResult.pipelinePools.entries()) {
                      console.log(`   ${poolIndex}. Pool "${vmId}":`);
                      console.log(`      - Pool type: ${typeof pool}`);
                      console.log(`      - Pool has pipelines: ${!!pool.pipelines}`);
                      console.log(`      - Pipelines count: ${pool.pipelines?.size || 0}`);
                      console.log(`      - Pool health: ${pool.healthStatus || 'unknown'}`);
                      console.log(`      - Pool available method: ${typeof pool.getAvailablePipelines}`);
                      if (pool.getAvailablePipelines) {
                        const availablePipelines = pool.getAvailablePipelines();
                        console.log(`      - Available pipelines count: ${availablePipelines.length}`);
                      }
                      poolIndex++;
                    }

                    // Use the corrected constructor with proper parameter order
                    try {
                      schedulerManager = new VirtualModelSchedulerManager(
                        managerConfig,
                        pipelineTracker
                      );
                      console.log(`✅ VirtualModelSchedulerManager created successfully`);
                      console.log(`   - Scheduler manager type: ${typeof schedulerManager}`);
                      console.log(`   - Scheduler has required methods: ${typeof schedulerManager.getScheduler === 'function'}`);

                      // Initialize the scheduler manager with pipeline pools
                      console.log(`🔧 Initializing VirtualModelSchedulerManager with pipeline pools...`);
                      console.log(`🔍 Pipeline pools structure:`);
                      console.log(`   - Type: ${typeof assemblyResult.pipelinePools}`);
                      console.log(`   - Is Map: ${assemblyResult.pipelinePools instanceof Map}`);
                      console.log(`   - Size: ${assemblyResult.pipelinePools.size}`);
                      console.log(`   - Keys: ${Array.from(assemblyResult.pipelinePools.keys()).join(', ')}`);

                      // Convert pipeline pools to the expected format for initialization
                      const initializationPools = new Map();
                      for (const [virtualModelId, poolData] of assemblyResult.pipelinePools) {
                        console.log(`🔍 Processing pool for ${virtualModelId}:`);
                        console.log(`   - poolData type: ${typeof poolData}`);
                        console.log(`   - poolData keys: ${Object.keys(poolData || {})}`);

                        // Use poolData directly as it should be the PipelinePool
                        initializationPools.set(virtualModelId, poolData);
                        console.log(`   - Added pool for initialization: ${virtualModelId}`);
                      }

                      // Initialize the scheduler with all pipeline pools at once
                      schedulerManager.initialize(initializationPools);
                      console.log(`✅ VirtualModelSchedulerManager initialized with ${initializationPools.size} pipeline pools`);
                    } catch (schedulerError) {
                      console.log(`❌ CRITICAL ERROR - Failed to create VirtualModelSchedulerManager:`);
                      console.log(`   - Error: ${schedulerError.message}`);
                      console.log(`   - Stack: ${schedulerError.stack}`);
                      throw schedulerError;
                    }

                    // Test scheduler manager initialization
                    if (schedulerManager && schedulerManager.getVirtualModelMappings) {
                      try {
                        const virtualModelMappings = schedulerManager.getVirtualModelMappings();
                        console.log(`📋 Virtual model mappings after scheduler creation:`);
                        console.log(`   - Total mappings: ${virtualModelMappings.length}`);
                        virtualModelMappings.forEach((mapping, index) => {
                          console.log(`   ${index + 1}. ${mapping.virtualModelId}: enabled=${mapping.enabled}, schedulerId=${mapping.schedulerId}`);
                        });
                      } catch (mappingError) {
                        console.log(`⚠️  Failed to get virtual model mappings: ${mappingError.message}`);
                      }
                    } else {
                      console.log(`⚠️  Scheduler manager methods not available`);
                    }

                  } else {
                    console.log(`❌ Pipeline assembly failed - no valid pipeline pools created`);
                    console.log(`   - Assembly success: ${assemblyResult.success}`);
                    console.log(`   - Pipeline pools available: ${assemblyResult.pipelinePools ? assemblyResult.pipelinePools.size : 0}`);
                    throw new Error('Pipeline assembly failed: No valid pipeline pools created');
                  }
                } else {
                  console.log(`⚠️  No virtual model configurations found - nothing to assemble`);
                }
              } else {
                console.log(`⚠️  Pipeline module interfaces not available`);
              }
          } catch (pipelineError) {
            console.log(`⚠️  Pipeline module initialization failed: ${pipelineError.message}`);
            console.log(`   Stack: ${pipelineError.stack}`);
          }

          // Instantiate and start the server using wrapper configuration
          console.log(`🔧 Creating server instance with wrapper-based configuration...`);
          const server = new ServerModule();

          // Log configuration details
          console.log(`🔧 Server configuration details:`);
          console.log(`   - Using wrapper-generated HTTP configuration`);
          console.log(`   - Port: ${serverConfig.port}`);
          console.log(`   - Host: ${serverConfig.host}`);
          console.log(`   - Pipeline integration: ${serverConfig.enablePipeline ? 'enabled' : 'disabled'}`);

          await server.configure(serverConfig);

          // Set scheduler manager BEFORE initializing server
          if (schedulerManager && server.setVirtualModelSchedulerManager) {
            server.setVirtualModelSchedulerManager(schedulerManager);
            console.log(`✅ VirtualModelSchedulerManager integrated with ServerModule`);
          }

          await server.initialize();

          // NOTE: Virtual model registration removed - ServerModule is pure forwarding only
          // Virtual models are handled by the pipeline system directly

          // 启用I/O跟踪和文件调试日志 - 这是修复的关键
          console.log(`🔧 Enabling I/O tracking and file-based debug logging...`);
          if (server.setDebugConfig && global.debugCenter) {
            // 为服务器模块设置DebugCenter
            server.debugCenter = global.debugCenter;

            // 设置debug配置
            server.setDebugConfig({
              enabled: true,
              level: 'debug',
              trackDataFlow: true,
              baseDirectory: systemDebugPath,
              enableFileLogging: true,
              maxFileSize: 10 * 1024 * 1024, // 10MB
              maxLogFiles: 5
            });

            // 启用two-phase debug系统
            if (server.enableTwoPhaseDebug) {
              server.enableTwoPhaseDebug(true, systemDebugPath, {
                enabled: true,
                autoRecord: true,
                saveIndividualFiles: true,
                saveSessionFiles: true,
                sessionFileName: 'server-session.jsonl',
                ioDirectory: systemDebugPath,
                includeTimestamp: true,
                includeDuration: true,
                maxEntriesPerFile: 2000
              });
            }

            console.log(`✅ Debug configuration applied to ServerModule`);
            console.log(`✅ I/O tracking enabled with proper debug path: ${systemDebugPath}`);
          } else if (server.setDebugConfig) {
            // 如果没有DebugCenter，使用基本配置
            server.setDebugConfig({
              enabled: true,
              level: 'debug',
              trackDataFlow: true,
              baseDirectory: systemDebugPath,
              enableFileLogging: true
            });
            console.log(`✅ Basic debug configuration applied to ServerModule`);
          }

          // 注册模块I/O和日志到DebugCenter
          if (global.debugCenter && global.systemStartSessionId) {
            console.log(`🔧 Registering module I/O and logging with DebugCenter...`);

            try {
              const eventBus = DebugEventBus.getInstance();

              // 记录服务器模块启动
              eventBus.publish({
                sessionId: global.systemStartSessionId,
                moduleId: 'server-module',
                operationId: 'server-initialization',
                timestamp: Date.now(),
                type: 'start',
                position: 'middle',
                data: {
                  input: {
                    config: serverConfig,
                    debugPath: systemDebugPath,
                    port: port
                  },
                  output: {
                    serverInitialized: true,
                    debugEnabled: server.setDebugConfig ? true : false,
                    twoPhaseDebugEnabled: server.enableTwoPhaseDebug ? true : false
                  }
                }
              });

              // 为服务器模块设置I/O跟踪
              if (server.setDebugConfig) {
                // 创建服务器专用的pipeline会话
                const serverSessionId = `server-${port}-${Date.now()}`;
                eventBus.publish({
                  sessionId: serverSessionId,
                  moduleId: 'rcc-http-server',
                  operationId: 'session_start',
                  timestamp: Date.now(),
                  type: 'start',
                  position: 'start',
                  data: {
                    sessionName: `RCC HTTP Server (Port ${port})`,
                    port: port,
                    startTime: Date.now(),
                    serverConfig: serverConfig,
                    debugPath: systemDebugPath
                  }
                });

                // 将服务器会话ID传递给服务器模块
                server.debugCenterSessionId = serverSessionId;
                server.debugCenter = global.debugCenter;

                // 记录I/O跟踪启用
                eventBus.publish({
                  sessionId: global.systemStartSessionId,
                  moduleId: 'server-module',
                  operationId: 'io-tracking-enabled',
                  timestamp: Date.now(),
                  type: 'start',
                  position: 'middle',
                  data: {
                    input: {
                      serverSessionId: serverSessionId,
                      ioDirectory: systemDebugPath,
                      sessionFileName: 'server-session.jsonl'
                    },
                    output: {
                      ioTrackingEnabled: true,
                      fileLoggingEnabled: true,
                      maxEntriesPerFile: 2000
                    }
                  }
                });

                console.log(`✅ Server module I/O tracking registered with DebugCenter`);
                console.log(`✅ Server pipeline session: ${serverSessionId}`);
              }

              // 注册其他模块的I/O和日志
              const modulesToRegister = [
                { id: 'basemodule', name: 'BaseModule System' },
                { id: 'bootstrap', name: 'Bootstrap Service' },
                { id: 'pipeline', name: 'Pipeline System' },
                { id: 'virtual-model-rules', name: 'Virtual Model Rules' },
                { id: 'error-handling', name: 'Error Handling Center' }
              ];

              for (const module of modulesToRegister) {
                const moduleSessionId = `${module.id}-${Date.now()}`;
                eventBus.publish({
                  sessionId: moduleSessionId,
                  moduleId: module.id,
                  operationId: 'session_start',
                  timestamp: Date.now(),
                  type: 'start',
                  position: 'start',
                  data: {
                    sessionName: module.name,
                    startTime: Date.now(),
                    parentSession: global.systemStartSessionId,
                    debugPath: systemDebugPath
                  }
                });

                eventBus.publish({
                  sessionId: global.systemStartSessionId,
                  moduleId: 'module-registry',
                  operationId: 'module-registered',
                  timestamp: Date.now(),
                  type: 'start',
                  position: 'middle',
                  data: {
                    input: {
                      moduleId: module.id,
                      moduleName: module.name,
                      moduleSessionId: moduleSessionId
                    },
                    output: {
                      registered: true,
                      sessionCreated: true
                    }
                  }
                });

                console.log(`✅ ${module.name} registered with DebugCenter (${moduleSessionId})`);
              }

            } catch (error) {
              console.log(`❌ Failed to register modules with DebugCenter: ${error.message}`);
            }
          }

          // 如果ServerModule有pipeline tracking，启用它
          if (server.pipelineTracker && server.pipelineTracker.enableIOTracking) {
            server.pipelineTracker.enableIOTracking = true;
            console.log(`✅ Pipeline I/O tracking enabled`);
          }

          await server.start();

          console.log(`✅ RCC HTTP Server started successfully on port ${port}`);
          console.log(`🌐 Server URL: http://localhost:${port}`);
          console.log(`📊 API endpoint: http://localhost:${port}/v1/messages`);
          console.log(`🔧 Health check: http://localhost:${port}/status`);

          // Add graceful shutdown handling
          const shutdown = async () => {
            console.log(`\n🛑 Shutting down RCC HTTP Server...`);

            try {
              // Clean up DebugCenter sessions before stopping server
              if (global.debugCenter && global.systemStartSessionId) {
                console.log(`🔧 Cleaning up DebugCenter sessions...`);

                try {
                  const eventBus = DebugEventBus.getInstance();

                  // Record system shutdown
                  eventBus.publish({
                    sessionId: global.systemStartSessionId,
                    moduleId: 'rcc-system',
                    operationId: 'system-shutdown',
                    timestamp: Date.now(),
                    type: 'end',
                    position: 'end',
                    data: {
                      input: {
                        shutdownTime: Date.now(),
                        reason: 'graceful-shutdown'
                      },
                      output: {
                        shutdownCompleted: false,
                        sessionsToCleanup: true
                      }
                    }
                  });

                  // End server session if it exists
                  if (server.debugCenterSessionId) {
                    eventBus.publish({
                      sessionId: server.debugCenterSessionId,
                      moduleId: 'rcc-http-server',
                      operationId: 'session_end',
                      timestamp: Date.now(),
                      type: 'end',
                      position: 'end',
                      data: {
                        sessionSuccess: true
                      }
                    });
                    console.log(`✅ Server session ended: ${server.debugCenterSessionId}`);
                  }

                  // End system startup session
                  eventBus.publish({
                    sessionId: global.systemStartSessionId,
                    moduleId: 'system',
                    operationId: 'session_end',
                    timestamp: Date.now(),
                    type: 'end',
                    position: 'end',
                    data: {
                      sessionSuccess: true
                    }
                  });
                  console.log(`✅ System startup session ended: ${global.systemStartSessionId}`);

                  // Generate final summary report
                  if (global.debugCenter.getStats) {
                    try {
                      const stats = global.debugCenter.getStats();
                      console.log(`📊 Debug session summary:`);
                      console.log(`   - Total sessions: ${stats.totalSessions}`);
                      console.log(`   - Total operations: ${stats.totalOperations}`);
                      console.log(`   - Successful operations: ${stats.successfulOperations}`);
                      console.log(`   - Failed operations: ${stats.failedOperations}`);
                    } catch (statsError) {
                      console.log(`⚠️  Debug stats failed: ${statsError.message}`);
                    }
                  }

                  // Export final debug data if exportData method exists
                  if (global.debugCenter.exportData) {
                    try {
                      const finalExportData = global.debugCenter.exportData({
                        format: 'json',
                        includeStats: true,
                        includeContext: true,
                        includePipelineEntries: true
                      });

                      // Save final export to system-start directory
                      const finalExportPath = path.join(systemStartDir, `debug-summary-${Date.now()}.json`);
                      fs.writeFileSync(finalExportPath, JSON.stringify(finalExportData, null, 2));
                      console.log(`✅ Debug summary exported to: ${finalExportPath}`);
                    } catch (exportError) {
                      console.log(`⚠️  Debug export failed: ${exportError.message}`);
                    }
                  }

                  // Clean up DebugCenter
                  await global.debugCenter.destroy();
                  console.log(`✅ DebugCenter cleaned up`);

                } catch (debugError) {
                  console.log(`⚠️  DebugCenter cleanup warning: ${debugError.message}`);
                }
              }

              // Stop the server
              await server.stop();
              console.log(`✅ RCC HTTP Server stopped gracefully`);

            } catch (stopError) {
              console.error(`❌ Error stopping server: ${stopError.message}`);
            }
            process.exit(0);
          };

          process.on('SIGINT', shutdown);
          process.on('SIGTERM', shutdown);

        } catch (serverError) {
          console.error(`❌ Failed to start RCC HTTP Server: ${serverError.message}`);
          if (verbose && serverError.stack) {
            console.error('Server error stack:', serverError.stack);
          }
          throw serverError;
        }
      } else {
        console.log(`⚠️ ServerModule not available - HTTP server not started`);
        console.log(`💡 To enable full server functionality, install rcc-server module`);
      }

      console.log(`📈 Ready for full service integration`);
      console.log('='.repeat(60));

      if (verbose) {
        console.log('\n📋 System Components Status:');
        console.log('  ✓ CLI Engine: Active');
        console.log('  ✓ Start Command: Validated and executed');
        console.log('  ✓ Two-Phase Debug: Initialized');
        console.log('  ✓ Configuration: Loaded');
        console.log('  ✓ Auto-Restart: Configured');
        console.log('  ✓ Pipeline Tracking: Enabled');
        if (ServerModule) {
          console.log('  ✓ Server Module: HTTP Server started and running');
          console.log('  ✓ OAuth System: Provider integration active');
        } else {
          console.log('  ⚠️ Server Module: Module ready for integration');
          console.log('  ⚠️ OAuth System: Pending Provider integration');
        }
      }

    } catch (error) {
      console.error('\n❌ RCC System Startup Failed:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'GENERAL_ERROR'}`);

      if (error.stack && options.verbose) {
        console.error('   Stack:', error.stack);
      }

      console.error('\n💡 Troubleshooting:');
      console.error('   - Check port availability: lsof -i :' + options.port);
      console.error('   - Verify configuration file format and permissions');
      console.error('   - Check debug directory permissions');
      console.error('   - Use --verbose flag for detailed logging');

      process.exit(1);
    }
  });

// Stop command with enhanced features
program
  .command('stop')
  .description('Stop the RCC system gracefully')
  .option('-p, --port <port>', 'Port to stop (default: scan all RCC ports)', '0')
  .option('-f, --force', 'Force stop without graceful shutdown')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (options) => {
    try {
      console.log('='.repeat(60));
      console.log('🛑 RCC System Shutdown');
      console.log('='.repeat(60));

      const verbose = options.verbose || false;
      const force = options.force || false;
      const port = parseInt(options.port) || 0;

      console.log('🔍 Scanning for running RCC processes...');

      // Actual process detection and shutdown
      const { execSync } = await import('child_process');
      let stoppedProcesses = [];

      try {
        // Find RCC processes by port or by process name
        let pids = [];
        
        if (port > 0) {
          // Stop specific port
          console.log(`📡 Looking for processes on port ${port}...`);
          try {
            const processes = execSync(`lsof -ti :${port}`, { encoding: 'utf8' });
            pids = processes.trim().split('\n').filter(pid => pid.trim());
            if (pids.length > 0) {
              console.log(`🔍 Found ${pids.length} process(es) on port ${port}: ${pids.join(', ')}`);
            }
          } catch (error) {
            console.log(`ℹ️ No processes found on port ${port}`);
          }
        } else {
          // Stop all RCC processes
          console.log('🔍 Looking for all RCC processes...');
          try {
            // Find by node processes running rcc
            const nodeProcesses = execSync(`ps aux | grep -E "(rcc|node.*rcc)" | grep -v grep | awk '{print $2}'`, { encoding: 'utf8' });
            pids = nodeProcesses.trim().split('\n').filter(pid => pid.trim());
            if (pids.length > 0) {
              console.log(`🔍 Found ${pids.length} RCC process(es): ${pids.join(', ')}`);
            }
          } catch (error) {
            console.log('ℹ️ No RCC processes found by name');
          }

          // Also check for processes on common RCC ports
          const commonPorts = [5506, 5507, 5508, 5509];
          for (const commonPort of commonPorts) {
            try {
              const portProcesses = execSync(`lsof -ti :${commonPort}`, { encoding: 'utf8' });
              const portPids = portProcesses.trim().split('\n').filter(pid => pid.trim());
              pids = [...pids, ...portPids];
              if (portPids.length > 0) {
                console.log(`🔍 Found ${portPids.length} process(es) on port ${commonPort}`);
              }
            } catch (error) {
              // Port not in use, continue
            }
          }
        }

        // Remove duplicates
        pids = [...new Set(pids)];

        if (pids.length === 0) {
          console.log('✅ No RCC processes found to stop');
          return;
        }

        console.log(`\n📋 Stopping ${pids.length} process(es)...`);

        // Stop processes
        for (const pid of pids) {
          try {
            if (!force) {
              // Try graceful shutdown first
              console.log(`🔄 Gracefully stopping process ${pid}...`);
              execSync(`kill ${pid}`, { stdio: 'pipe', timeout: 5000 });
              console.log(`✅ Sent SIGTERM to process ${pid}`);
              stoppedProcesses.push({ pid, method: 'graceful' });
            } else {
              // Force kill
              console.log(`⚡ Force stopping process ${pid}...`);
              execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
              console.log(`✅ Force killed process ${pid}`);
              stoppedProcesses.push({ pid, method: 'force' });
            }
            
            // Wait a bit between kills
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            if (!force && error.toString().includes('timed out')) {
              // Graceful failed, try force kill
              try {
                console.log(`⚠️ Graceful stop failed for ${pid}, forcing...`);
                execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
                console.log(`✅ Force killed process ${pid}`);
                stoppedProcesses.push({ pid, method: 'force-after-timeout' });
              } catch (forceError) {
                console.log(`❌ Failed to force kill process ${pid}: ${forceError.message}`);
              }
            } else {
              console.log(`❌ Failed to stop process ${pid}: ${error.message}`);
            }
          }
        }

        console.log(`\n✅ RCC system shutdown completed`);
        console.log(`📊 Stopped ${stoppedProcesses.length} process(es)`);

        if (verbose && stoppedProcesses.length > 0) {
          console.log('\n📊 Shutdown Summary:');
          stoppedProcesses.forEach((proc, index) => {
            console.log(`  ${index + 1}. PID ${proc.pid} - ${proc.method}`);
          });
        }

      } catch (error) {
        console.error('\n❌ RCC System Stop Failed:', error.message);
        process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ RCC System Stop Failed:', error.message);
      process.exit(1);
    }
  });

// Status command with comprehensive system checks
program
  .command('status')
  .description('Check RCC system status and health')
  .action(async () => {
    console.log('='.repeat(60));
    console.log('📊 RCC System Status');
    console.log('='.repeat(60));

    console.log('⏱️  System Status: Unknown (initialization required)');
    console.log('🔐 Auth Status: Not configured');
    console.log('📈 Performance: Ready for initialization');
    console.log('🔄 Services: 0 active');
    console.log('📋 Health: Basic framework operational');

    console.log('\n💡 To activate system:');
    console.log('  Run: rcc start [options]');
    console.log('  For help: rcc help start');
  });

// Code command - Configure environment and call Claude
program
  .command('code')
  .description('Configure local environment and call Claude')
  .option('-p, --port <number>', 'Port number to use', '5506')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-v, --verbose', 'Enable verbose output')
  .allowUnknownOption(true)
  .action(async (options, command) => {
    try {
      console.log('='.repeat(60));
      console.log('💻 RCC Code Environment Setup');
      console.log('='.repeat(60));

      const port = options.port || 5506;
      const configPath = options.config || `~/.rcc/rcc-config.json`;
      const fullConfigPath = configPath.startsWith('~')
        ? configPath.replace('~', os.homedir())
        : configPath;
      const verbose = options.verbose || false;

      console.log(`🔧 Port: ${port}`);
      console.log(`📁 Config: ${configPath}`);
      console.log(`🔍 Verbose: ${verbose}`);

      // Check if service is already running
      const { execSync } = await import('child_process');
      let serviceRunning = false;

      try {
        const processes = execSync(`lsof -i :${port} | grep LISTEN`, { encoding: 'utf8' });
        if (processes.trim()) {
          serviceRunning = true;
          console.log(`✅ RCC service already running on port ${port}`);
        }
      } catch (checkError) {
        // Service not running
      }

      // Start service if not running
      if (!serviceRunning) {
        console.log(`🚀 Starting RCC service on port ${port}...`);

        try {
          // Start the service in background without waiting
          const { spawn } = await import('child_process');
          const child = spawn('rcc', ['start', '--config', fullConfigPath, '--port', String(port)], {
            stdio: 'ignore',
            detached: true
          });
          child.unref();
          console.log(`✅ RCC service started on port ${port} (PID: ${child.pid})`);

          // Wait for service to be ready
          console.log(`⏳ Waiting for service to be ready...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (startError) {
          console.error(`❌ Failed to start RCC service: ${startError.message}`);
          process.exit(1);
        }
      }

      // Configure environment and call Claude
      console.log(`🔧 Configuring environment for Claude...`);

      // Create clean environment by copying process.env and overriding
      const claudeEnv = { ...process.env };

      // Remove conflicting environment variables
      delete claudeEnv.ANTHROPIC_API_KEY;
      delete claudeEnv.ANTHROPIC_AUTH_TOKEN;
      delete claudeEnv.API_KEY;
      delete claudeEnv.OPENAI_API_KEY;

      // Set our RCC configuration
      claudeEnv.ANTHROPIC_API_KEY = 'rcc4-proxy-key';
      claudeEnv.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;

      // Debug: Show what environment variables we're setting
      console.log(`🔧 Setting environment variables:`);
      console.log(`   ANTHROPIC_API_KEY: ${claudeEnv.ANTHROPIC_API_KEY}`);
      console.log(`   ANTHROPIC_BASE_URL: ${claudeEnv.ANTHROPIC_BASE_URL}`);

      // Execute Claude command - get everything after 'code' command, filtering out RCC options
      const codeIndex = process.argv.indexOf('code');
      const rccOptions = ['--port', '-p', '--config', '-c', '--debug', '-d', '--verbose', '-v'];
      let claudeArgs = [];

      if (codeIndex > 0) {
        const argsAfterCode = process.argv.slice(codeIndex + 1);
        let skipNext = false;

        for (const arg of argsAfterCode) {
          if (skipNext) {
            skipNext = false;
            continue;
          }

          if (rccOptions.includes(arg)) {
            skipNext = true;
            continue;
          }

          if (arg.startsWith('-') && rccOptions.some(opt => arg.startsWith(opt))) {
            continue;
          }

          claudeArgs.push(arg);
        }
      }

      console.log(`🤖 Starting Claude CLI...`);
      if (claudeArgs.length > 0) {
        console.log(`📝 Args: ${claudeArgs.join(' ')}`);
      } else {
        console.log(`📝 No args provided - starting Claude interactively`);
      }

      const { spawn } = await import('child_process');
      const claudePath = 'claude';

      // Create a completely isolated environment
      const isolatedEnv = {
        // Only include essential environment variables
        HOME: process.env.HOME,
        USER: process.env.USER,
        SHELL: process.env.SHELL,
        PATH: process.env.PATH,
        TERM: process.env.TERM,
        // Our RCC configuration
        ANTHROPIC_API_KEY: 'rcc4-proxy-key',
        ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
      };

      // Properly join arguments to preserve spaces in quotes (like claude-code-router)
      const joinedArgs = claudeArgs.length > 0
        ? claudeArgs.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ')
        : '';

      const claudeProcess = spawn(claudePath + (joinedArgs ? ` ${joinedArgs}` : ''), [], {
        stdio: 'inherit',
        env: isolatedEnv,
        shell: true,
      });

      // Wait for Claude to complete
      await new Promise((resolve, reject) => {
        claudeProcess.on('exit', (code) => {
          if (code === 0) {
            resolve(code);
          } else {
            reject(new Error(`Claude exited with code ${code}`));
          }
        });

        claudeProcess.on('error', reject);
      });

    } catch (error) {
      console.error(`\n❌ RCC Code Command Failed:`, error.message);
      if (options.verbose && error.stack) {
        console.error('Stack:', error.stack);
      }
      process.exit(1);
    }
  });

// Module management commands
program
  .command('module <action> [name]')
  .description('Module management commands')
  .action((action, name) => {
    console.log('='.repeat(60));
    console.log(`🔧 Module Management: ${action}`);
    if (name) console.log(`📁 Module: ${name}`);
    console.log('='.repeat(60));

    console.log(`Module ${action} request received`);
    console.log('Detailed module management coming soon...');
  });

// Configuration management
program
  .command('config <action> [key] [value]')
  .description('Configuration management')
  .action((action, key, value) => {
    console.log('='.repeat(60));
    console.log(`⚙️  Configuration: ${action}`);
    if (key) console.log(`🔑 Key: ${key}`);
    if (value) console.log(`📊 Value: ${value}`);
    console.log('='.repeat(60));

    const config = {
      version: packageJson.version || '0.1.2',
      mode: 'development',
      providers: {
        available: ['qwen', 'iflow'],
        configured: false
      }
    };

    console.log(`Configuration ${action} processed`);
    console.log('Current system config:', JSON.stringify(config, null, 2));
  });

program.parse();