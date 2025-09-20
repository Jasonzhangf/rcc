/**
 * Configuration CLI Tool - Command-line interface for configuration management
 * 配置CLI工具 - 配置管理命令行界面
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import {
  UnifiedConfigManager,
  ConfigValidator,
  ConfigMigrator,
  MigrationUtils,
  createConfigManager,
  createValidator,
  createMigrator,
} from './index.js';

/**
 * 配置CLI选项
 */
interface ConfigCLIOptions {
  config?: string;
  environment?: string;
  verbose?: boolean;
  dryRun?: boolean;
  backup?: boolean;
}

/**
 * 配置CLI类
 */
export class ConfigCLI {
  private program: Command;

  constructor() {
    this.program = new Command('rcc-config')
      .description('RCC Unified Configuration Management CLI')
      .version('1.0.0')
      .option('-c, --config <path>', 'Configuration file path')
      .option('-e, --environment <env>', 'Environment (development, staging, production)')
      .option('-v, --verbose', 'Verbose output')
      .option('--dry-run', 'Preview changes without applying them')
      .option('--no-backup', 'Skip creating backups')
      .hook('preAction', (thisCommand) => {
        thisCommand.opts();
      });

    this.setupCommands();
  }

  /**
   * 设置命令
   */
  private setupCommands(): void {
    this.setupValidateCommand();
    this.setupInitCommand();
    this.setupMigrateCommand();
    this.setupShowCommand();
    this.setupEditCommand();
    this.setupTemplateCommand();
    this.setupWatchCommand();
  }

  /**
   * 设置验证命令
   */
  private setupValidateCommand(): void {
    this.program
      .command('validate')
      .description('Validate configuration file')
      .option('-f, --file <path>', 'Configuration file to validate')
      .option('-s, --strict', 'Strict validation mode')
      .option('-a, --auto-fix', 'Auto-fix minor issues')
      .option('-o, --output <format>', 'Output format (json, table, yaml)', 'table')
      .action(async (options) => {
        try {
          console.log(chalk.blue('🔍 Validating configuration...'));

          const validator = createValidator();
          const configPath = options.file || this.findDefaultConfigPath();

          const validation = await validator.validateConfigFile(configPath);

          this.displayValidationResults(validation, options);

          if (validation.valid) {
            console.log(chalk.green('✅ Configuration is valid!'));
          } else {
            console.log(chalk.red('❌ Configuration validation failed!'));
            process.exit(1);
          }
        } catch (error) {
          console.error(
            chalk.red(
              `❌ Validation failed: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      });
  }

  /**
   * 设置初始化命令
   */
  private setupInitCommand(): void {
    this.program
      .command('init')
      .description('Initialize a new configuration file')
      .option('-f, --force', 'Overwrite existing configuration')
      .option(
        '-t, --template <type>',
        'Template type (minimal, full, development, production)',
        'development'
      )
      .option('-o, --output <path>', 'Output file path')
      .action(async (options) => {
        try {
          console.log(chalk.blue('🔧 Initializing configuration...'));

          const validator = createValidator();
          const outputPath = options.output || './rcc-config.json';

          // Check if config already exists
          const configExists = await this.fileExists(outputPath);
          if (configExists && !options.force) {
            console.log(chalk.yellow(`⚠️ Configuration file already exists: ${outputPath}`));
            console.log(
              chalk.yellow(
                `Use --force to overwrite or specify a different output path with --output`
              )
            );
            return;
          }

          // Generate template based on type and environment
          const template = validator.createConfigTemplate({
            environment: this.getEnvironment(),
            includeProviders: options.template !== 'minimal',
            includeVirtualModels: options.template === 'full',
            includePipeline: options.template === 'full' || options.template === 'production',
          });

          // Write configuration
          await this.writeConfigFile(template, outputPath);

          console.log(chalk.green(`✅ Configuration initialized: ${outputPath}`));

          // Auto-validate the created configuration
          const validation = await validator.validateConfig(template);
          if (!validation.valid) {
            console.log(chalk.yellow('⚠️ Created configuration has validation issues:'));
            this.displayValidationResults(validation, { output: 'table' });
          }
        } catch (error) {
          console.error(
            chalk.red(
              `❌ Initialization failed: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      });
  }

  /**
   * 设置迁移命令
   */
  private setupMigrateCommand(): void {
    this.program
      .command('migrate')
      .description('Migrate old configuration to new format')
      .option('-i, --input <path>', 'Input configuration file')
      .option('-o, --output <path>', 'Output configuration file')
      .option('-b, --no-backup', 'Skip creating backup')
      .option('-s, --scan <directory>', 'Scan directory for old configurations')
      .option('-p, --pattern <pattern>', 'File pattern for scanning', '*config*.json')
      .action(async (options) => {
        try {
          console.log(chalk.blue('🚀 Migrating configuration...'));

          const migrator = createMigrator({
            backup: options.backup,
            dryRun: options.dryRun,
            autoFixErrors: true,
            generateReport: true,
          });

          if (options.scan) {
            // Batch migration
            console.log(chalk.blue(`📁 Scanning directory: ${options.scan}`));
            const results = await migrator.batchMigrate(options.scan, options.pattern);

            console.log(chalk.green(`✅ Migration completed for ${results.length} files:`));

            for (const result of results) {
              const status = result.success ? chalk.green('✅') : chalk.red('❌');
              console.log(`${status} ${result.originalPath} → ${result.newPath}`);

              if (!result.success) {
                console.log(chalk.red(`   Error: ${result.validation.errors[0]?.message}`));
              }
            }
          } else if (options.input) {
            // Single file migration
            const result = await migrator.migrateConfigFile(options.input, options.output);

            console.log(chalk.green(`✅ Migration completed:`));
            console.log(`   From: ${result.originalPath}`);
            console.log(`   To: ${result.newPath}`);

            if (result.backupPath) {
              console.log(`   Backup: ${result.backupPath}`);
            }

            this.displayValidationResults(result.validation, options);

            if (result.report) {
              console.log(chalk.blue(`\n📊 Migration Report:`));
              console.log(`   Total changes: ${result.report.totalChanges}`);
              console.log(`   Breaking changes: ${result.report.breakingChanges}`);
              console.log(`   Compatible changes: ${result.report.compatibleChanges}`);

              if (result.report.requiredActions.length > 0) {
                console.log(chalk.yellow('\n⚠️ Required Actions:'));
                for (const action of result.report.requiredActions) {
                  console.log(`   • ${action}`);
                }
              }

              if (result.report.recommendations.length > 0) {
                console.log(chalk.blue('\n💡 Recommendations:'));
                for (const recommendation of result.report.recommendations) {
                  console.log(`   • ${recommendation}`);
                }
              }
            }
          } else {
            console.log(chalk.red('❌ Please specify either --input or --scan option'));
            process.exit(1);
          }
        } catch (error) {
          console.error(
            chalk.red(
              `❌ Migration failed: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      });
  }

  /**
   * 设置显示命令
   */
  private setupShowCommand(): void {
    this.program
      .command('show')
      .description('Display current configuration')
      .option('-s, --section <section>', 'Show specific section (rcc, modules, pipeline, global)')
      .option('-k, --key <key>', 'Show specific key (dot notation)')
      .option('-o, --output <format>', 'Output format (json, yaml, table)', 'json')
      .option('--pretty', 'Pretty print JSON output')
      .action(async (options) => {
        try {
          const configManager = createConfigManager(options.config);
          await configManager.loadConfig();

          const config = configManager.getConfig();
          let output: any;

          // Get specific section or key
          if (options.section) {
            output = configManager.getConfigSection(options.section as any);
          } else if (options.key) {
            output = configManager.getConfigValue(options.key);
          } else {
            output = config;
          }

          // Handle undefined output
          if (output === undefined) {
            console.log(
              chalk.yellow(`⚠️ Configuration not found: ${options.section || options.key}`)
            );
            return;
          }

          this.displayOutput(output, options.output, options.pretty);
        } catch (error) {
          console.error(
            chalk.red(
              `❌ Failed to display configuration: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      });
  }

  /**
   * 设置编辑命令
   */
  private setupEditCommand(): void {
    this.program
      .command('set')
      .description('Set configuration value')
      .argument('<path>', 'Configuration path (dot notation)')
      .argument('<value>', 'Value to set (JSON)')
      .option('-t, --type <type>', 'Value type (string, number, boolean, array, object)', 'auto')
      .action(async (path, value, options) => {
        try {
          const configManager = createConfigManager(options.config);
          await configManager.loadConfig();

          console.log(chalk.blue(`🔧 Setting ${path} = ${value}`));

          // Parse value based on type
          let parsedValue: any;
          switch (options.type) {
            case 'string':
              parsedValue = String(value);
              break;
            case 'number':
              parsedValue = Number(value);
              break;
            case 'boolean':
              parsedValue = value.toLowerCase() === 'true';
              break;
            case 'array':
              parsedValue = JSON.parse(value);
              break;
            case 'object':
              parsedValue = JSON.parse(value);
              break;
            default:
              // Auto-detect type
              try {
                parsedValue = JSON.parse(value);
              } catch {
                parsedValue = value;
              }
          }

          // Update configuration
          configManager.updateConfigValue(path, parsedValue);

          // Validate after update
          const validator = createValidator();
          const validation = await validator.validateConfig(configManager.getConfig());

          if (!validation.valid) {
            console.log(chalk.yellow('⚠️ Updated configuration has validation issues:'));
            this.displayValidationResults(validation, options);
            console.log(chalk.yellow('Consider using --dry-run to test changes first'));
          } else {
            console.log(chalk.green(`✅ Successfully set ${path}`));
          }
        } catch (error) {
          console.error(
            chalk.red(
              `❌ Failed to set configuration: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      });
  }

  /**
   * 设置模板命令
   */
  private setupTemplateCommand(): void {
    this.program
      .command('template')
      .description('Generate configuration templates')
      .option(
        '-e, --environment <env>',
        'Environment (development, staging, production)',
        'development'
      )
      .option('--providers', 'Include provider examples')
      .option('--virtual-models', 'Include virtual model examples')
      .option('--pipeline', 'Include pipeline configuration')
      .option('-o, --output <path>', 'Output file path')
      .action(async (options) => {
        try {
          console.log(chalk.blue('📝 Generating configuration template...'));

          const validator = createValidator();
          const template = validator.createConfigTemplate({
            environment: options.environment,
            includeProviders: options.providers,
            includeVirtualModels: options.virtualModels,
            includePipeline: options.pipeline,
          });

          const outputPath = options.output || `./rcc-config.template.${options.environment}.json`;
          await this.writeConfigFile(template, outputPath);

          console.log(chalk.green(`✅ Template generated: ${outputPath}`));
        } catch (error) {
          console.error(
            chalk.red(
              `❌ Failed to generate template: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      });
  }

  /**
   * 设置监听命令
   */
  private setupWatchCommand(): void {
    this.program
      .command('watch')
      .description('Watch configuration file for changes')
      .option('-i, --interval <ms>', 'Check interval in milliseconds', '5000')
      .action(async (options) => {
        try {
          console.log(chalk.blue('👁️ Starting configuration watcher...'));

          const configManager = createConfigManager(options.config, true);

          // Set up change listeners
          configManager.on('configChanged', (event) => {
            console.log(chalk.green(`\n🔄 Configuration changed: ${event.key}`));
            console.log(`   Old value: ${JSON.stringify(event.oldValue)}`);
            console.log(`   New value: ${JSON.stringify(event.newValue)}`);
            console.log(`   Source: ${event.source.type}`);
          });

          configManager.on('configLoaded', (config) => {
            console.log(chalk.green('\n✅ Configuration loaded successfully'));
          });

          configManager.on('configError', (error) => {
            console.error(chalk.red(`\n❌ Configuration error: ${error.message}`));
          });

          // Load initial configuration
          await configManager.loadConfig();
          console.log(chalk.green('✅ Initial configuration loaded'));
          console.log(chalk.blue(`Watching for changes every ${options.interval}ms...`));

          // Keep the process running
          process.on('SIGINT', () => {
            console.log(chalk.yellow('\n👋 Stopping configuration watcher...'));
            configManager.destroy();
            process.exit(0);
          });
        } catch (error) {
          console.error(
            chalk.red(
              `❌ Failed to start watcher: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          process.exit(1);
        }
      });
  }

  /**
   * 显示验证结果
   */
  private displayValidationResults(validation: any, options: any): void {
    if (validation.errors.length > 0) {
      console.log(chalk.red('\n❌ Errors:'));
      for (const error of validation.errors) {
        console.log(chalk.red(`   • ${error.path}: ${error.message}`));
      }
    }

    if (validation.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️ Warnings:'));
      for (const warning of validation.warnings) {
        console.log(chalk.yellow(`   • ${warning.path}: ${warning.message}`));
        if (warning.suggestion) {
          console.log(chalk.blue(`     Suggestion: ${warning.suggestion}`));
        }
      }
    }

    if (validation.suggestions && validation.suggestions.length > 0) {
      console.log(chalk.blue('\n💡 Suggestions:'));
      for (const suggestion of validation.suggestions) {
        console.log(chalk.blue(`   • ${suggestion.path}: ${suggestion.suggestion}`));
        if (suggestion.reason) {
          console.log(chalk.gray(`     Reason: ${suggestion.reason}`));
        }
      }
    }
  }

  /**
   * 显示输出
   */
  private displayOutput(data: any, format: string, pretty: boolean): void {
    switch (format) {
      case 'yaml':
        console.log(this.formatAsYaml(data));
        break;
      case 'table':
        console.log(this.formatAsTable(data));
        break;
      case 'json':
      default:
        console.log(JSON.stringify(data, null, pretty ? 2 : 0));
        break;
    }
  }

  /**
   * 格式化为YAML
   */
  private formatAsYaml(data: any, indent = 0): string {
    const space = '  '.repeat(indent);

    if (typeof data !== 'object' || data === null) {
      return String(data);
    }

    if (Array.isArray(data)) {
      return data.map((item) => `${space}- ${this.formatAsYaml(item, indent + 1)}`).join('\n');
    }

    return Object.entries(data)
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return `${space}${key}:\n${this.formatAsYaml(value, indent + 1)}`;
        }
        return `${space}${key}: ${this.formatAsYaml(value, 0)}`;
      })
      .join('\n');
  }

  /**
   * 格式化为表格
   */
  private formatAsTable(data: any): string {
    if (typeof data !== 'object' || Array.isArray(data)) {
      return JSON.stringify(data, null, 2);
    }

    const table = [];
    for (const [key, value] of Object.entries(data)) {
      table.push(`${key.padEnd(20)} | ${this.formatValue(value)}`);
    }

    return table.join('\n');
  }

  /**
   * 格式化值
   */
  private formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      return Array.isArray(value) ? `[${value.length} items]` : '{object}';
    }
    return String(value);
  }

  /**
   * 查找默认配置路径
   */
  private findDefaultConfigPath(): string {
    const possiblePaths = [
      './rcc-config.json',
      './rcc-config.dev.json',
      './rcc-config.local.json',
      '~/.rcc-config.json',
    ];

    for (const configPath of possiblePaths) {
      const expandedPath = configPath.startsWith('~')
        ? path.join(process.env.HOME || '', configPath.slice(1))
        : path.resolve(configPath);

      if (this.fileExists(expandedPath)) {
        return expandedPath;
      }
    }

    return './rcc-config.json'; // Default
  }

  /**
   * 获取当前环境
   */
  private getEnvironment(): 'development' | 'staging' | 'production' {
    const env = process.env.NODE_ENV || 'development';
    switch (env.toLowerCase()) {
      case 'staging':
        return 'staging';
      case 'production':
      case 'prod':
        return 'production';
      default:
        return 'development';
    }
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 写入配置文件
   */
  private async writeConfigFile(config: any, filePath: string): Promise<void> {
    const expandedPath = filePath.startsWith('~')
      ? path.join(process.env.HOME || '', filePath.slice(1))
      : path.resolve(filePath);

    const dir = path.dirname(expandedPath);
    await fs.mkdir(dir, { recursive: true });

    const content = JSON.stringify(config, null, 2);
    await fs.writeFile(expandedPath, content, 'utf8');
  }

  /**
   * 运行CLI
   */
  run(): void {
    this.program.parse();
  }
}

/**
 * 创建并运行配置CLI
 */
export function runConfigCLI(): void {
  const cli = new ConfigCLI();
  cli.run();
}

// 如果直接运行此文件，执行CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  runConfigCLI();
}
