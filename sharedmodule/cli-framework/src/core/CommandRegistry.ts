/**
 * Command Registry for RCC CLI Framework
 */

import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { ICommand } from '../interfaces/ICommand';

export class CommandRegistry extends BaseModule {
  private commands: Map<string, ICommand> = new Map();
  private aliases: Map<string, string> = new Map();
  private moduleCommands: Map<string, string[]> = new Map();

  constructor(_framework: any) {
    const moduleInfo: ModuleInfo = {
      id: 'CommandRegistry',
      name: 'Command Registry',
      version: '1.0.0',
      description: 'Registry for CLI commands',
      type: 'registry',

      metadata: {
        author: 'RCC Development Team',
        license: 'MIT'
      }
    };

    super(moduleInfo);
  }

  async register(name: string, command: ICommand): Promise<void> {
    if (this.commands.has(name)) {
      throw new Error(`Command '${name}' is already registered`);
    }

    this.commands.set(name, command);
    this.log(`Registered command: ${name}`);
  }

  async registerAlias(alias: string, commandName: string): Promise<void> {
    if (this.aliases.has(alias) || this.commands.has(alias)) {
      throw new Error(`Alias '${alias}' conflicts with existing command or alias`);
    }

    this.aliases.set(alias, commandName);
    this.log(`Registered alias: ${alias} -> ${commandName}`);
  }

  get(name: string): ICommand | undefined {
    // Check direct command first
    if (this.commands.has(name)) {
      return this.commands.get(name);
    }

    // Check aliases
    const aliasTarget = this.aliases.get(name);
    if (aliasTarget) {
      return this.commands.get(aliasTarget);
    }

    return undefined;
  }

  getAll(): Map<string, ICommand> {
    return new Map(this.commands);
  }

  has(name: string): boolean {
    return this.commands.has(name) || this.aliases.has(name);
  }

  async unregister(name: string): Promise<void> {
    if (this.commands.has(name)) {
      this.commands.delete(name);
      
      // Remove any aliases pointing to this command
      for (const [alias, target] of this.aliases.entries()) {
        if (target === name) {
          this.aliases.delete(alias);
        }
      }
      
      this.log(`Unregistered command: ${name}`);
    }
  }

  async unregisterByModule(moduleName: string): Promise<void> {
    const moduleCommandNames = this.moduleCommands.get(moduleName);
    if (moduleCommandNames) {
      for (const commandName of moduleCommandNames) {
        await this.unregister(commandName);
      }
      this.moduleCommands.delete(moduleName);
    }
  }

  async clear(): Promise<void> {
    this.commands.clear();
    this.aliases.clear();
    this.moduleCommands.clear();
    this.log('Cleared all commands');
  }

  getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  getAliases(): Map<string, string> {
    return new Map(this.aliases);
  }

  getStats(): { commands: number; aliases: number; modules: number } {
    return {
      commands: this.commands.size,
      aliases: this.aliases.size,
      modules: this.moduleCommands.size
    };
  }
}