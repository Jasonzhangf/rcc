#!/usr/bin/env node

/**
 * RCC System Startup Script
 * This script initializes and starts the complete RCC system
 */

import { BootstrapService } from './sharedmodule/bootstrap/dist/esm/index.js';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

console.log('🚀 Starting RCC Integrated System...');

// Load configuration
const configPath = process.env.RCC4_CONFIG || '/Users/fanzhang/.rcc/rcc-config.json';
const port = process.env.RCC4_PORT || 5506;

console.log(`📁 Using config: ${configPath}`);
console.log(`🔌 Using port: ${port}`);

// Default configuration with proper services and debug settings
const defaultConfig = {
  metadata: {
    name: "RCC4 Configuration",
    description: "RCC Claude Code Router Configuration - Debug Version",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: "Configuration System",
    environment: "development"
  },
  settings: {
    general: {
      port: {
        value: parseInt(port),
        type: "number",
        required: true,
        description: "Server port for RCC4 system"
      },
      host: {
        value: "0.0.0.0",
        type: "string",
        required: false,
        description: "Server host address"
      },
      debug: {
        value: true,
        type: "boolean",
        required: false,
        description: "Enable debug mode"
      }
    },
    providers: {},
    routes: {},
    security: {
      rateLimiting: {
        enabled: {
          value: false,
          type: "boolean",
          required: false
        }
      },
      authentication: {
        required: {
          value: false,
          type: "boolean",
          required: false
        }
      }
    },
    monitoring: {
      logging: {
        level: {
          value: "debug",
          type: "string",
          required: false
        }
      },
      metrics: {
        enabled: {
          value: false,
          type: "boolean",
          required: false
        }
      }
    }
  },
  version: "4.0.0",
  services: [
    {
      id: 'rcc-server',
      type: 'http-server',
      name: 'RCC HTTP Server',
      description: 'Main HTTP API server for RCC system',
      config: {
        port: parseInt(port),
        host: '0.0.0.0',
        enableVirtualModels: true,
        enablePipeline: true,
        debug: {
          enabled: true,
          logDirectory: '/Users/fanzhang/.rcc/debug',
          maxLogSize: 10485760,
          maxLogFiles: 10,
          logLevel: 'debug',
          logRequests: true,
          logResponses: true,
          logErrors: true,
          logPerformance: true,
          logToolCalls: true,
          logAuth: true,
          logPipelineState: true,
          filterSensitiveData: true
        }
      }
    }
  ]
};

async function startRCCSystem() {
  try {
    // Initialize bootstrap service
    console.log('🔧 Initializing Bootstrap Service...');
    const bootstrap = new BootstrapService();

    // Load configuration
    let config = defaultConfig;
    if (existsSync(configPath)) {
      try {
        const configContent = readFileSync(configPath, 'utf8');
        config = JSON.parse(configContent);
        console.log('✅ Configuration loaded successfully');
      } catch (error) {
        console.warn('⚠️  Failed to parse config file, using default config:', error.message);
      }
    } else {
      console.log('📝 Config file not found, using default configuration');
    }

    // Add configuration path to config if not already present
    if (!config.configurationPath) {
      config.configurationPath = configPath;
    }

    // Add default services if not already present
    if (!config.services || config.services.length === 0) {
      config.services = defaultConfig.services;
    }

    // Configure bootstrap service
    await bootstrap.configure(config);

    // Start bootstrap service
    console.log('🚀 Starting Bootstrap Service...');
    await bootstrap.start();

    console.log('✅ RCC System started successfully');
    console.log(`📡 HTTP Server running on port ${port}`);
    console.log('📝 Press Ctrl+C to stop the system gracefully');

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n📦 Shutting down RCC system...');
      try {
        await bootstrap.stop();
        console.log('✅ RCC system stopped gracefully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error stopping RCC system:', error);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      console.log('\n📦 Shutting down RCC system...');
      try {
        await bootstrap.stop();
        console.log('✅ RCC system stopped gracefully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error stopping RCC system:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Failed to start RCC system:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Run the system
startRCCSystem().catch(console.error);