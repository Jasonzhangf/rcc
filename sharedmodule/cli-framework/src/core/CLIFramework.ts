/**
 * RCC CLI Framework Core Implementation
 */

import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { ICLIFramework, CLIFrameworkOptions, CLIFrameworkConfig } from '../interfaces/ICLIFramework';
import { ICommand, CommandContext } from '../interfaces/ICommand';
import { ICommandModule } from '../interfaces/ICommandModule';
import { CommandRegistry } from './CommandRegistry';
import { ModuleLoader } from './ModuleLoader';
import { ConfigManager } from './ConfigManager';
import { ArgumentParser } from '../utils/ArgumentParser';
import { Logger } from '../utils/Logger';
import { ProcessManager } from '../utils/ProcessManager';

export class CLIFramework extends BaseModule implements ICLIFramework {
  private commandRegistry: CommandRegistry;
  private moduleLoader: ModuleLoader;
  private configManager: ConfigManager;
  private argumentParser: ArgumentParser;
  private logger: Logger;
  public processManager: ProcessManager;
  private frameworkConfig: CLIFrameworkConfig | null = null;
  private isInitialized = false;

  constructor(private options: CLIFrameworkOptions) {
    const moduleInfo: ModuleInfo = {
      id: 'CLIFramework',
      name: 'RCC CLI Framework',
      version: options.version || '0.1.0',
      description: 'Universal command-line interface framework based on BaseModule',
      type: 'framework',

      metadata: {
        author: 'RCC Development Team',
        license: 'MIT',
        repository: 'https://github.com/rcc/rcc-cli-framework'
      }
    };

    super(moduleInfo);

    // Initialize components
    this.commandRegistry = new CommandRegistry(this);
    this.moduleLoader = new ModuleLoader(this, options.modulePaths);
    this.configManager = new ConfigManager(this, options.configPath);
    this.argumentParser = new ArgumentParser();
    this.logger = new Logger({
      level: options.logger?.level || 'info',
      file: options.logger?.file,
      console: options.logger?.console !== false
    });
    this.processManager = new ProcessManager();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('CLI Framework already initialized');
      return;
    }

    this.logger.info('Initializing RCC CLI Framework...');

    try {
      // Initialize BaseModule
      await super.initialize();

      // Load configuration
      this.frameworkConfig = await this.configManager.load();
      this.logger.info(`Loaded configuration: ${this.frameworkConfig.framework.name} v${this.frameworkConfig.framework.version}`);

      // Initialize process manager
      await this.processManager.initialize();

      // Load command modules
      const loadResults = await this.moduleLoader.loadModules();
      let successCount = 0;
      let errorCount = 0;

      for (const result of loadResults) {
        if (result.success && result.module) {
          await this.registerModule(result.module);
          successCount++;
        } else {
          this.logger.error(`Failed to load module: ${result.error}`);
          errorCount++;
        }
      }

      this.logger.info(`Loaded ${successCount} command modules successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`);

      // Setup hot reload if enabled
      if (this.options.hotReload && this.options.devMode) {
        await this.setupHotReload();
      }

      this.isInitialized = true;
      this.logger.info('CLI Framework initialized successfully');

    } catch (error: any) {
      this.logger.error(`Failed to initialize CLI Framework: ${error.message}`);
      throw error;
    }
  }

  async registerModule(module: ICommandModule): Promise<void> {
    this.logger.debug(`Registering module: ${module.metadata.name}`);

    try {
      // Initialize module if needed
      if (module.initialize) {
        await module.initialize();
      }

      // Get commands from module
      const commands = await module.getCommands();
      
      // Register each command
      for (const command of commands) {
        await this.commandRegistry.register(command.name, command);
        
        // Register aliases
        if (command.aliases) {
          for (const alias of command.aliases) {
            await this.commandRegistry.registerAlias(alias, command.name);
          }
        }
      }

      this.logger.info(`Registered module '${module.metadata.name}' with ${commands.length} commands`);

    } catch (error) {
      this.logger.error(`Failed to register module '${module.metadata.name}': ${(error as Error).message}`);
      throw error;
    }
  }

  async unregisterModule(moduleName: string): Promise<void> {
    this.logger.debug(`Unregistering module: ${moduleName}`);
    
    // Find and cleanup module
    const module = this.moduleLoader.getModule(moduleName);
    if (module && module.cleanup) {
      await module.cleanup();
    }

    // Remove commands from registry
    await this.commandRegistry.unregisterByModule(moduleName);
    
    this.logger.info(`Unregistered module: ${moduleName}`);
  }

  getCommand(name: string): ICommand | undefined {
    return this.commandRegistry.get(name);
  }

  getCommands(): Map<string, ICommand> {
    return this.commandRegistry.getAll();
  }

  async execute(args: string[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('CLI Framework not initialized');
    }

    try {
      const parsed = this.argumentParser.parse(args);
      
      // Handle global flags
      if (parsed.flags.help || parsed.flags.h) {
        this.showHelp(parsed.command);
        return;
      }

      if (parsed.flags.version || parsed.flags.v) {
        console.log(`${this.frameworkConfig?.framework.name || 'rcc-cli'} v${this.frameworkConfig?.framework.version || '1.0.0'}`);
        return;
      }

      // Get command
      const command = this.getCommand(parsed.command);
      if (!command) {
        this.logger.error(`Unknown command: ${parsed.command}`);
        this.showHelp();
        process.exit(1);
      }

      // Create command context
      const context: CommandContext = {
        options: { ...this.frameworkConfig?.defaults, ...parsed.options },
        flags: parsed.flags,
        args: parsed.args,
        framework: this,
        logger: this.logger,
        config: this.frameworkConfig || {}
      };

      // Validate command if validator exists
      if (command.validate) {
        const isValid = await command.validate(context);
        if (!isValid) {
          this.logger.error('Command validation failed');
          process.exit(1);
        }
      }

      // Execute command
      this.logger.debug(`Executing command: ${command.name}`);
      await command.execute(context);

    } catch (error) {
      this.logger.error(`Command execution failed: ${(error as Error).message}`);
      if (this.options.devMode) {
        console.error((error as Error).stack);
      }
      process.exit(1);
    }
  }

  showHelp(commandName?: string): void {
    if (commandName) {
      const command = this.getCommand(commandName);
      if (command) {
        console.log(this.generateCommandHelp(command));
      } else {
        console.log(`Unknown command: ${commandName}`);
      }
    } else {
      console.log(this.generateGlobalHelp());
    }
  }

  getConfig(): CLIFrameworkConfig {
    return this.frameworkConfig || {} as CLIFrameworkConfig;
  }

  async reloadModules(): Promise<void> {
    if (!this.options.devMode) {
      throw new Error('Module reloading is only available in development mode');
    }

    this.logger.info('Reloading modules...');
    
    // Clear current modules
    await this.commandRegistry.clear();
    
    // Reload modules
    await this.moduleLoader.reloadModules();
    const loadResults = await this.moduleLoader.loadModules();
    
    // Re-register modules
    for (const result of loadResults) {
      if (result.success && result.module) {
        await this.registerModule(result.module);
      }
    }
    
    this.logger.info('Modules reloaded successfully');
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down CLI Framework...');
    
    try {
      // Cleanup all modules
      const modules = this.moduleLoader.getAllModules();
      for (const module of modules) {
        if (module.cleanup) {
          await module.cleanup();
        }
      }

      // Shutdown process manager
      await this.processManager.shutdown();

      // Shutdown BaseModule
      await super.destroy();

      this.isInitialized = false;
      this.logger.info('CLI Framework shutdown completed');

    } catch (error) {
      this.logger.error(`Error during shutdown: ${(error as Error).message}`);
      throw error;
    }
  }

  private async setupHotReload(): Promise<void> {
    this.logger.info('Setting up hot reload...');
    // Implementation for hot reload using chokidar
    // This would watch module files and reload them when changed
  }

  private generateGlobalHelp(): string {
    const config = this.frameworkConfig;
    const commands = this.getCommands();
    
    let help = `${config?.framework.name || 'rcc-cli'} v${config?.framework.version || '1.0.0'}\n`;
    if (config?.framework.description) {
      help += `${config.framework.description}\n`;
    }
    help += '\nUsage: <command> [options]\n\n';
    help += 'Commands:\n';
    
    for (const [name, command] of commands) {
      if (!command.hidden) {
        help += `  ${name.padEnd(20)} ${command.description}\n`;
      }
    }
    
    help += '\nGlobal Options:\n';
    help += '  --help, -h           Show help\n';
    help += '  --version, -v        Show version\n';
    
    return help;
  }

  private generateCommandHelp(command: ICommand): string {
    let help = `${command.name} - ${command.description}\n\n`;
    help += `Usage: ${command.usage}\n`;
    
    if (command.options && command.options.length > 0) {
      help += '\nOptions:\n';
      for (const option of command.options) {
        const required = option.required ? ' (required)' : '';
        const defaultValue = option.default !== undefined ? ` (default: ${option.default})` : '';
        help += `  --${option.name.padEnd(15)} ${option.description}${required}${defaultValue}\n`;
      }
    }
    
    if (command.flags && command.flags.length > 0) {
      help += '\nFlags:\n';
      for (const flag of command.flags) {
        const alias = flag.alias ? `, -${flag.alias}` : '';
        help += `  --${flag.name}${alias.padEnd(12)} ${flag.description}\n`;
      }
    }
    
    return help;
  }
}