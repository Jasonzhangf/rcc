export interface CLICommand {
  name: string;
  description: string;
  options: CommandOption[];
  examples: string[];
  execute: (context: CommandContext) => Promise<void>;
}

export interface CommandOption {
  name: string;
  alias?: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
}

export interface CommandContext {
  args: string[];
  options: Record<string, any>;
  logger: Logger;
  cwd: string;
  command: CLICommand;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  trace(message: string, ...args: any[]): void;
}
