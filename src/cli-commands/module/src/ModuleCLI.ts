#!/usr/bin/env node

/**
 * RCC Module CLI Tool
 * Command-line interface for managing RCC modules
 */

import { Command } from 'commander';
import { ModuleDiscoverySystem } from '../utils/ModuleDiscoverySystem';
import { ModuleConfigurationManager } from '../utils/ModuleConfigurationManager';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('rcc-module')
  .description('RCC Module Management CLI')
  .version('1.0.0');

// Configure paths
const modulesDir = path.join(process.cwd(), 'src', 'modules');
const configDir = path.join(process.cwd(), 'config', 'modules');

// Create instances
const moduleDiscovery = new ModuleDiscoverySystem({
  modulesDir,
  autoLoad: false,
  cacheEnabled: true
});

const configManager = new ModuleConfigurationManager({
  configDir,
  moduleDiscovery,
  autoSave: true
});

// Initialize configuration manager
configManager.initialize().catch(console.error);

/**
 * List all discovered modules
 */
program
  .command('list')
  .alias('ls')
  .description('List all discovered modules')
  .option('-t, --type <type>', 'Filter by module type')
  .option('-e, --enabled', 'Show only enabled modules')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (options) => {
    try {
      let modules = await moduleDiscovery.discoverModules();

      // Apply filters
      if (options.type) {
        modules = modules.filter(m => m.type === options.type);
      }
      if (options.enabled) {
        modules = modules.filter(m => m.enabled);
      }

      if (modules.length === 0) {
        console.log('No modules found.');
        return;
      }

      console.log('\\nDiscovered Modules:');
      console.log('='.repeat(80));

      modules.forEach((module, index) => {
        console.log(`${index + 1}. ${module.name}`);
        console.log(`   Type: ${module.type}`);
        console.log(`   Version: ${module.packageInfo.version}`);
        console.log(`   Enabled: ${module.enabled}`);
        console.log(`   Path: ${module.path}`);
        
        if (options.verbose) {
          console.log(`   Main: ${module.mainFile}`);
          console.log(`   Dependencies: ${module.dependencies.join(', ')}`);
          if (module.packageInfo.description) {
            console.log(`   Description: ${module.packageInfo.description}`);
          }
        }
        console.log();
      });

      console.log(`Total: ${modules.length} modules`);
    } catch (error) {
      console.error('Error listing modules:', error);
      process.exit(1);
    }
  });

/**
 * Show detailed module information
 */
program
  .command('info <moduleName>')
  .description('Show detailed information about a module')
  .action(async (moduleName) => {
    try {
      const module = await moduleDiscovery.getModule(moduleName);
      
      if (!module) {
        console.error(`Module not found: ${moduleName}`);
        process.exit(1);
      }

      console.log(`\\nModule Information: ${module.name}`);
      console.log('='.repeat(50));
      
      console.log(`Name: ${module.name}`);
      console.log(`Version: ${module.packageInfo.version}`);
      console.log(`Type: ${module.type}`);
      console.log(`Enabled: ${module.enabled}`);
      console.log(`Path: ${module.path}`);
      console.log(`Main File: ${module.mainFile}`);
      
      if (module.packageInfo.description) {
        console.log(`Description: ${module.packageInfo.description}`);
      }
      
      if (module.dependencies.length > 0) {
        console.log(`\\nDependencies:`);
        module.dependencies.forEach(dep => {
          console.log(`  - ${dep}`);
        });
      }
      
      if (module.packageInfo.keywords && module.packageInfo.keywords.length > 0) {
        console.log(`\\nKeywords:`);
        module.packageInfo.keywords.forEach((keyword: string) => {
          console.log(`  - ${keyword}`);
        });
      }

      // Show configuration
      const config = configManager.getModuleConfiguration(moduleName);
      if (config) {
        console.log(`\\nConfiguration:`);
        config.configs.forEach(conf => {
          const value = config.values[conf.key];
          console.log(`  ${conf.key}: ${value} ${conf.required ? '(required)' : ''}`);
          if (conf.description) {
            console.log(`    Description: ${conf.description}`);
          }
        });
      }

    } catch (error) {
      console.error('Error getting module info:', error);
      process.exit(1);
    }
  });

/**
 * Show module configuration
 */
program
  .command('config <moduleName>')
  .description('Show module configuration')
  .option('-k, --key <key>', 'Show specific configuration key')
  .option('-j, --json', 'Output as JSON')
  .action(async (moduleName, options) => {
    try {
      const config = configManager.getModuleConfiguration(moduleName);
      
      if (!config) {
        console.error(`Module configuration not found: ${moduleName}`);
        process.exit(1);
      }

      if (options.key) {
        const value = config.values[options.key];
        if (options.json) {
          console.log(JSON.stringify({ key: options.key, value }, null, 2));
        } else {
          console.log(`${options.key}: ${value}`);
        }
      } else {
        if (options.json) {
          console.log(JSON.stringify(config.values, null, 2));
        } else {
          console.log(`\\nConfiguration for ${moduleName}:`);
          console.log('='.repeat(40));
          Object.entries(config.values).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
          });
        }
      }

    } catch (error) {
      console.error('Error getting configuration:', error);
      process.exit(1);
    }
  });

/**
 * Set configuration value
 */
program
  .command('set <moduleName> <key> <value>')
  .description('Set configuration value for a module')
  .option('-t, --type <type>', 'Value type (string, number, boolean)', 'string')
  .action(async (moduleName, key, value, options) => {
    try {
      // Convert value based on type
      let convertedValue: any = value;
      switch (options.type) {
        case 'number':
          convertedValue = Number(value);
          break;
        case 'boolean':
          convertedValue = value.toLowerCase() === 'true';
          break;
        case 'object':
        case 'array':
          convertedValue = JSON.parse(value);
          break;
      }

      await configManager.setConfigurationValue(moduleName, key, convertedValue);
      console.log(`Set ${moduleName}.${key} = ${convertedValue}`);

    } catch (error) {
      console.error('Error setting configuration:', error);
      process.exit(1);
    }
  });

/**
 * Validate module configuration
 */
program
  .command('validate <moduleName>')
  .description('Validate module configuration')
  .action(async (moduleName) => {
    try {
      const result = configManager.validateModuleConfiguration(moduleName);
      
      if (result.valid) {
        console.log(`✓ Configuration for ${moduleName} is valid`);
      } else {
        console.log(`✗ Configuration for ${moduleName} has errors:`);
        result.errors.forEach(error => {
          console.log(`  - ${error}`);
        });
        process.exit(1);
      }

    } catch (error) {
      console.error('Error validating configuration:', error);
      process.exit(1);
    }
  });

/**
 * Load a module
 */
program
  .command('load <moduleName>')
  .description('Load a module dynamically')
  .action(async (moduleName) => {
    try {
      const moduleExports = await moduleDiscovery.loadModule(moduleName);
      console.log(`✓ Module ${moduleName} loaded successfully`);
      
      if (moduleExports.default) {
        console.log(`Default export: ${moduleExports.default.name || moduleExports.default.constructor.name}`);
      }
      
      const exports = Object.keys(moduleExports);
      if (exports.length > 0) {
        console.log(`Available exports: ${exports.join(', ')}`);
      }

    } catch (error) {
      console.error('Error loading module:', error);
      process.exit(1);
    }
  });

/**
 * Enable a module
 */
program
  .command('enable <moduleName>')
  .description('Enable a module')
  .action(async (moduleName) => {
    try {
      await configManager.setConfigurationValue(moduleName, 'enabled', true);
      console.log(`✓ Module ${moduleName} enabled`);

    } catch (error) {
      console.error('Error enabling module:', error);
      process.exit(1);
    }
  });

/**
 * Disable a module
 */
program
  .command('disable <moduleName>')
  .description('Disable a module')
  .action(async (moduleName) => {
    try {
      await configManager.setConfigurationValue(moduleName, 'enabled', false);
      console.log(`✓ Module ${moduleName} disabled`);

    } catch (error) {
      console.error('Error disabling module:', error);
      process.exit(1);
    }
  });

/**
 * Show module statistics
 */
program
  .command('stats')
  .description('Show module discovery statistics')
  .action(async () => {
    try {
      const stats = moduleDiscovery.getStatistics();
      
      console.log('\\nModule Discovery Statistics:');
      console.log('='.repeat(40));
      console.log(`Total modules: ${stats.totalModules}`);
      console.log(`Enabled modules: ${stats.enabledModules}`);
      console.log(`Cache valid: ${stats.cacheValid}`);
      console.log(`Cache timestamp: ${new Date(stats.cacheTimestamp).toISOString()}`);
      
      console.log('\\nModules by type:');
      Object.entries(stats.modulesByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });

    } catch (error) {
      console.error('Error getting statistics:', error);
      process.exit(1);
    }
  });

/**
 * Refresh module cache
 */
program
  .command('refresh')
  .description('Refresh module discovery cache')
  .action(async () => {
    try {
      const modules = await moduleDiscovery.refreshCache();
      console.log(`✓ Refreshed cache, found ${modules.length} modules`);

    } catch (error) {
      console.error('Error refreshing cache:', error);
      process.exit(1);
    }
  });

/**
 * Create a new module template
 */
program
  .command('create <moduleName>')
  .description('Create a new module template')
  .option('-t, --type <type>', 'Module type (provider, processor, transformer)', 'provider')
  .option('-d, --description <description>', 'Module description', 'RCC module')
  .action(async (moduleName, options) => {
    try {
      const moduleDir = path.join(modulesDir, moduleName);
      
      if (fs.existsSync(moduleDir)) {
        console.error(`Module directory already exists: ${moduleDir}`);
        process.exit(1);
      }

      // Create directory structure
      const directories = [
        moduleDir,
        path.join(moduleDir, 'src'),
        path.join(moduleDir, 'types'),
        path.join(moduleDir, '__test__'),
        path.join(moduleDir, 'config')
      ];

      directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      // Create package.json
      const packageJson = {
        name: `rcc-${moduleName}`,
        version: '0.1.0',
        description: options.description,
        main: 'dist/index.js',
        module: 'dist/index.esm.js',
        types: 'dist/index.d.ts',
        keywords: ['rcc', options.type, moduleName],
        author: 'RCC Development Team',
        license: 'MIT',
        dependencies: {
          'rcc-basemodule': '^0.1.3'
        },
        devDependencies: {
          '@types/jest': '^29.5.11',
          '@types/node': '^20.0.0',
          'typescript': '^5.4.5'
        },
        scripts: {
          build: 'tsc',
          test: 'jest',
          lint: 'eslint src/**/*.ts'
        }
      };

      fs.writeFileSync(
        path.join(moduleDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create main module file
      const mainModuleTemplate = `import { ModuleInfo } from 'rcc-basemodule';
import { BaseModule } from 'rcc-basemodule';

/**
 * ${moduleName} Module
 */
export class ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Module extends BaseModule {
  constructor(info: ModuleInfo) {
    super(info);
    console.log('${moduleName} module initialized');
  }

  public override async configure(config: any): Promise<void> {
    await super.configure(config);
    console.log('${moduleName} module configured');
  }

  public override async process(request: any): Promise<any> {
    // Module processing logic here
    return request;
  }
}

export default ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Module;
`;

      fs.writeFileSync(
        path.join(moduleDir, 'src', 'index.ts'),
        mainModuleTemplate
      );

      // Create types file
      const typesTemplate = `export interface ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Config {
  // Configuration interface here
  enabled?: boolean;
}
`;

      fs.writeFileSync(
        path.join(moduleDir, 'types', 'index.ts'),
        typesTemplate
      );

      // Create README
      const readmeTemplate = `# ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module

${options.description}

## Installation

\`\`\`bash
npm install rcc-${moduleName}
\`\`\`

## Usage

\`\`\`typescript
import { ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Module } from 'rcc-${moduleName}';

const module = new ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Module(moduleInfo);
await module.configure(config);
await module.initialize();
\`\`\`

## Configuration

See \`types/index.ts\` for available configuration options.

## Development

\`\`\`bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Lint
npm run lint
\`\`\`
`;

      fs.writeFileSync(
        path.join(moduleDir, 'README.md'),
        readmeTemplate
      );

      console.log(`✓ Created module template: ${moduleDir}`);
      console.log('Next steps:');
      console.log('  1. Edit the module files in src/');
      console.log('  2. Add your module logic');
      console.log('  3. Update configuration types');
      console.log('  4. Run tests and build');

    } catch (error) {
      console.error('Error creating module:', error);
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', (operands) => {
  console.error(`Unknown command: ${operands[0]}`);
  console.log('Available commands:');
  program.commands.forEach(cmd => {
    console.log(`  ${cmd.name()} - ${cmd.description()}`);
  });
  process.exit(1);
});

// Parse arguments
program.parse();