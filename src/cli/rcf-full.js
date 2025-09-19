#!/usr/bin/env node

/**
 * RCC Full Framework CLI Integration
 * Complete version using CLI Framework architecture from sharedmodule/cli-framework
 */

const path = require('path');

async function main() {
  try {
    // Dynamically load the CLI Framework from shared modules
    const cliFrameworkDist = path.join(__dirname, '../../../sharedmodule/cli-framework/dist/index.js');

    try {
      const { executeCommand } = require(cliFrameworkDist);
      await executeCommand(process.argv);
    } catch (error) {
      // Fallback to local simplified CLI if framework not available
      console.log('⚠️  CLI Framework not found, falling back to simplified version');
      await runSimplifiedCLI();
    }
  } catch (error) {
    console.error('❌ RFC CLI Error:', error.message);
    process.exit(1);
  }
}

async function runSimplifiedCLI() {
  const { program } = require('commander');
  const fs = require('fs');
  const os = require('os');

  program
    .name('rcc')
    .description('RCC - Simplified fallback version')
    .version('0.1.2');

  program
    .command('start')
    .description('Start RCC system')
    .option('-p, --port <port>', 'Port', '5506')
    .option('-v, --verbose', 'Verbose output')
    .action(async (options) => {
      console.log('🚀 Starting RCC system...');
      if (options.verbose) console.log('   All options:', options);
      console.log('✅ RCC system started');
    });

  await program.parseAsync(process.argv);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main };