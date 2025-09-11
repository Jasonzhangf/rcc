#!/usr/bin/env node

/**
 * RCC CLI Application
 * Uses the RCC CLI Framework to provide start/stop/status/code commands
 */

const path = require('path');
const { createCLIFramework } = require('./sharedmodule/cli-framework/dist/index.cjs');

async function main() {
  try {
    // Create CLI framework instance
    const cli = createCLIFramework({
      name: 'rcc-cli',
      version: '1.0.0',
      projectRoot: __dirname,
      modulePaths: ['./cli-commands/*/src/*Module.js'],
      configPath: './rcc-cli.config.json',
      devMode: process.env.NODE_ENV === 'development',
      logger: {
        level: process.env.DEBUG ? 'debug' : 'info',
        console: true
      }
    });

    // Initialize framework
    await cli.initialize();

    // Execute command
    await cli.execute(process.argv.slice(2));

  } catch (error) {
    console.error(`CLI Error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

main();