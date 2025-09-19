import { BaseModule, AppError } from 'rcc-basemodule';

export interface ICommand {
  name: string;
  description: string;
  usage?: string;
  aliases?: string[];
  options?: CommandOption[];
  execute(context: CommandContext): Promise<void>;
  validate?(context: CommandContext): Promise<boolean>;
}

export type CommandOptionType = 'string' | 'number' | 'boolean' | 'array';

export interface CommandOption {
  name: string;
  type: CommandOptionType;
  description: string;
  required?: boolean;
  default?: any;
  alias?: string;
}

export interface ILogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  trace(message: string, ...args: any[]): void;
}

export interface CommandContext {
  args: string[];
  options: Record<string, any>;
  logger: ILogger;
  cwd: string;
  command: ICommand;
}

export interface CommandDiscoveryOptions {
  commandDirs?: string[];
  modulePatterns?: string[];
  autoLoad?: boolean;
  watchForChanges?: boolean;
}

export interface CLIEngineConfig {
  name: string;
  version: string;
  description?: string;
  commandDiscovery?: CommandDiscoveryOptions;
  defaultCommand?: string;
}

export interface ParsedCommand {
  command?: string;
  args: string[];
  options: Record<string, any>;
}