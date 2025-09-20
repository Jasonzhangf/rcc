// Dynamic import for ES module compatibility
let BaseModule: any;

async function loadBaseModule() {
  if (!BaseModule) {
    const module = await import('rcc-basemodule');
    BaseModule = module.BaseModule;
  }
  return { BaseModule };
}

import { ICommand, CLIEngineConfig, CommandDiscoveryOptions, ILogger } from '../types';
import { CommandRegistry } from './CommandRegistry';
import { ArgumentParser } from './ArgumentParser';
import * as path from 'path';
import * as url from 'url';

// Get current directory for ES modules
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SimpleLogger implements ILogger {
  info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }
  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }
  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }
  debug(message: string, ...args: any[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
  trace(message: string, ...args: any[]): void {
    console.trace(`[TRACE] ${message}`, ...args);
  }
}

class ConfigurationError extends Error {
  constructor(message: string, public code?: string, public cause?: Error) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class CLIEngine {
  private registry: CommandRegistry;
  private parser: ArgumentParser;
  protected config: CLIEngineConfig;
  private logger: ILogger;
  private baseModule: any | null;

  constructor(config: CLIEngineConfig) {
    this.config = config;
    this.logger = new SimpleLogger();
    this.registry = new CommandRegistry(this.logger);
    this.parser = new ArgumentParser();
  }

  async initialize(): Promise<void> {
    // Load BaseModule dynamically
    const { BaseModule } = await loadBaseModule();

    // Initialize BaseModule
    this.baseModule = new BaseModule({
      id: 'cli-engine',
      name: 'CLI Engine',
      version: this.config.version,
      type: 'system',
      description: 'RCC Command Line Interface Engine'
    });

    await this.baseModule.initialize();
    
    this.logger.info(`Initializing RCC CLI Engine ${this.config.name} v${this.config.version}`);
    
    // Discover and register commands
    await this.discoverCommands(this.config.commandDiscovery);
    
    this.logger.info(`CLI Engine ready with ${this.registry.getCommandCount()} commands`);
  }

  async execute(argv: string[] = process.argv): Promise<void> {
    const parsed = this.parser.parse(argv);
    
    if (!parsed.command) {
      // No command specified, show help
      this.showGlobalHelp();
      return;
    }

    // Handle help flag
    if (parsed.options.help || parsed.options.h) {
      if (parsed.args.length > 0) {
        // Show help for specific command
        const commandName = parsed.args[0];
        const command = this.registry.getCommand(commandName);
        if (command) {
          this.showCommandHelp(command);
        } else {
          this.showGlobalHelp();
        }
      } else {
        // Show global help
        this.showGlobalHelp();
      }
      return;
    }

    // Handle version flag
    if (parsed.options.version || parsed.options.v) {
      this.showVersion();
      return;
    }

    // Execute the command
    await this.executeCommand(parsed.command, parsed.args, parsed.options);
  }

  async executeCommand(commandName: string, args: string[] = [], options: Record<string, unknown> = {}): Promise<void> {
    const command = this.registry.getCommand(commandName);
    
    if (!command) {
      throw new ConfigurationError(`Command '${commandName}' not found`, 'COMMAND_NOT_FOUND');
    }

    this.logger.info(`Executing command: ${commandName}`);
    
    try {
      // Validate command if validation method exists
      if (command.validate) {
        const isValid = await command.validate({
          args,
          options,
          logger: this.logger,
          cwd: process.cwd(),
          command
        });
        
        if (!isValid) {
          throw new ConfigurationError(`Command validation failed for '${commandName}'`, 'COMMAND_VALIDATION_FAILED');
        }
      }

      // Execute the command
      await command.execute({
        args,
        options,
        logger: this.logger,
        cwd: process.cwd(),
        command
      });

      this.logger.info(`Command '${commandName}' executed successfully`);
      
    } catch (error) {
      this.logger.error(`Command '${commandName}' execution failed:`, error);
      
      // Re-throw the error for proper handling
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      throw new ConfigurationError(
        `Command execution failed: ${error instanceof Error ? error.message : String(error)}`,
        'COMMAND_EXECUTION_FAILED',
        error instanceof Error ? error : undefined
      );
    }
  }

  async discoverCommands(options?: CommandDiscoveryOptions): Promise<void> {
    const discoveryOptions: CommandDiscoveryOptions = {
      commandDirs: [
        // Default command directories
        path.join(__dirname, '../commands'),
        // Project-specific command directories
        path.join(process.cwd(), 'commands'),
        path.join(process.cwd(), 'src/commands')
      ],
      modulePatterns: [
        // Module patterns for plugin discovery
        'rcc-command-*',
        '@rcc/command-*'
      ],
      autoLoad: true,
      watchForChanges: process.env.NODE_ENV === 'development',
      ...options
    };

    await this.registry.discoverCommands(discoveryOptions);
  }

  registerCommand(command: ICommand): void {
    this.registry.register(command);
  }

  unregisterCommand(commandName: string): void {
    this.registry.unregister(commandName);
  }

  getCommand(commandName: string): ICommand | undefined {
    return this.registry.getCommand(commandName);
  }

  getAllCommands(): ICommand[] {
    return this.registry.getAllCommands();
  }

  showCommandHelp(command: ICommand): void {
    const helpText = this.parser.generateHelp(command);
    console.log(helpText);
  }

  showGlobalHelp(): void {
    const commands = this.getAllCommands();
    const helpText = this.parser.generateGlobalHelp(commands);
    console.log(helpText);
  }

  showVersion(): void {
    console.log(`${this.config.name} v${this.config.version}`);
    if (this.config.description) {
      console.log(this.config.description);
    }
  }

  async destroy(): Promise<void> {
    this.logger.info('Shutting down CLI Engine');
    if (this.baseModule) {
      await this.baseModule.destroy();
    }
  }
}

// Factory function for easy creation
export function createCLIEngine(config: CLIEngineConfig): CLIEngine {
  return new CLIEngine(config);
}