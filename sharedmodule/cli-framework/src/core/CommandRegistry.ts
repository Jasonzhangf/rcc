import { ICommand, CommandDiscoveryOptions, ILogger } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export class CommandRegistry {
  private commands = new Map<string, ICommand>();
  private aliases = new Map<string, string>();
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  register(command: ICommand): void {
    if (this.commands.has(command.name)) {
      throw new Error(`Command '${command.name}' is already registered`);
    }

    this.commands.set(command.name, command);
    this.logger.debug(`Command registered: ${command.name}`);

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        if (this.aliases.has(alias)) {
          this.logger.warn(`Alias '${alias}' is already registered for another command`);
          continue;
        }
        this.aliases.set(alias, command.name);
        this.logger.debug(`Alias registered: ${alias} -> ${command.name}`);
      }
    }
  }

  unregister(commandName: string): void {
    const command = this.commands.get(commandName);
    if (!command) {
      return;
    }

    this.commands.delete(commandName);
    
    // Remove aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.delete(alias);
      }
    }

    this.logger.debug(`Command unregistered: ${commandName}`);
  }

  getCommand(name: string): ICommand | undefined {
    // Check direct command name
    const directCommand = this.commands.get(name);
    if (directCommand) {
      return directCommand;
    }

    // Check aliases
    const aliasedCommandName = this.aliases.get(name);
    if (aliasedCommandName) {
      return this.commands.get(aliasedCommandName);
    }

    return undefined;
  }

  getAllCommands(): ICommand[] {
    return Array.from(this.commands.values());
  }

  async discoverCommands(options: CommandDiscoveryOptions): Promise<void> {
    const { commandDirs = [], modulePatterns = [], autoLoad = true } = options;

    this.logger.info('Discovering commands...');

    // Discover from file system directories
    for (const dir of commandDirs) {
      await this.discoverFromDirectory(dir);
    }

    // Discover from module patterns
    for (const pattern of modulePatterns) {
      await this.discoverFromModules(pattern);
    }

    this.logger.info(`Discovered ${this.commands.size} commands`);
  }

  private async discoverFromDirectory(dirPath: string): Promise<void> {
    try {
      const absolutePath = path.resolve(dirPath);
      
      if (!fs.existsSync(absolutePath)) {
        this.logger.warn(`Command directory not found: ${absolutePath}`);
        return;
      }

      // Look for JavaScript/TypeScript files
      const files = glob.sync('**/*.{js,ts,mjs,cjs}', {
        cwd: absolutePath,
        ignore: ['**/*.d.ts', '**/__tests__/**', '**/*.test.*']
      });

      for (const file of files) {
        const fullPath = path.join(absolutePath, file);
        await this.loadCommandFromFile(fullPath);
      }

    } catch (error) {
      this.logger.error(`Error discovering commands from directory ${dirPath}:`, error);
    }
  }

  private async discoverFromModules(pattern: string): Promise<void> {
    try {
      const modules = glob.sync(pattern, {
        cwd: process.cwd()
      });

      for (const modulePath of modules) {
        await this.loadCommandFromModule(modulePath);
      }

    } catch (error) {
      this.logger.error(`Error discovering commands from modules ${pattern}:`, error);
    }
  }

  private async loadCommandFromFile(filePath: string): Promise<void> {
    try {
      // Use dynamic import to load the module
      const module = await import(filePath);
      
      // Look for default export or named exports that implement ICommand
      const exports = Object.values(module);
      for (const exportItem of exports) {
        if (this.isCommand(exportItem)) {
          this.register(exportItem);
        }
      }

    } catch (error) {
      this.logger.error(`Error loading command from file ${filePath}:`, error);
    }
  }

  private async loadCommandFromModule(modulePath: string): Promise<void> {
    try {
      const module = await import(modulePath);
      
      // Check if module has a registerCommands function
      if (typeof module.registerCommands === 'function') {
        await module.registerCommands(this);
      }
      
      // Also check for default exports that are commands
      const exports = Object.values(module);
      for (const exportItem of exports) {
        if (this.isCommand(exportItem)) {
          this.register(exportItem);
        }
      }

    } catch (error) {
      this.logger.error(`Error loading commands from module ${modulePath}:`, error);
    }
  }

  private isCommand(obj: unknown): obj is ICommand {
    return !!(
      obj &&
      typeof obj === 'object' &&
      'name' in obj &&
      typeof obj.name === 'string' &&
      'description' in obj &&
      typeof obj.description === 'string' &&
      'execute' in obj &&
      typeof obj.execute === 'function'
    );
  }

  clear(): void {
    this.commands.clear();
    this.aliases.clear();
    this.logger.debug('Command registry cleared');
  }

  getCommandCount(): number {
    return this.commands.size;
  }
}