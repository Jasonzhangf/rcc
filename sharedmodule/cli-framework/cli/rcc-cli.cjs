#!/usr/bin/env node

/**
 * RCC CLI Framework Entry Point
 * 
 * This is a generic CLI entry point that can be used by any project
 * that uses the RCC CLI Framework.
 */

const { createCLIFramework } = require('../dist/index.cjs');
const path = require('path');
const fs = require('fs');

async function main() {
  try {
    // Get project root (where the CLI is being executed)
    const projectRoot = process.cwd();
    
    // Look for framework configuration
    const configPath = path.join(projectRoot, 'rcc-cli.config.json');
    
    // Default options
    const options = {
      name: 'rcc-cli',
      version: '0.1.0',
      projectRoot,
      modulePaths: [
        path.join(projectRoot, 'cli-commands/*/src/*Module.js'),
        path.join(projectRoot, 'commands/*/src/*Module.js')
      ],
      devMode: process.env.NODE_ENV === 'development',
      hotReload: process.env.NODE_ENV === 'development',
      logger: {
        level: process.env.LOG_LEVEL || 'info',
        console: true
      }
    };

    // Add config path if it exists
    if (fs.existsSync(configPath)) {
      options.configPath = configPath;
    }

    // Create and initialize framework
    const framework = createCLIFramework(options);
    await framework.initialize();
    
    // Execute command
    await framework.execute(process.argv.slice(2));
    
  } catch (error) {
    console.error(`[CLI ERROR] ${error.message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run main function
main().catch(console.error);