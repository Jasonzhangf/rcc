/**
 * Command Interface for RCC CLI Framework
 */

export interface CommandOption {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  default?: any;
  required?: boolean;
  choices?: string[];
}

export interface CommandFlag {
  name: string;
  alias?: string;
  description: string;
  default?: boolean;
}

export interface CommandContext {
  options: Record<string, any>;
  flags: Record<string, boolean>;
  args: string[];
  framework: any; // Will be typed as CLIFramework when imported
  logger: any; // Will be typed as Logger when imported
  config: Record<string, any>;
}

export interface ICommand {
  /**
   * Command name (used for invocation)
   */
  readonly name: string;
  
  /**
   * Command description for help text
   */
  readonly description: string;
  
  /**
   * Usage example
   */
  readonly usage: string;
  
  /**
   * Command version
   */
  readonly version?: string;
  
  /**
   * Command options (--option value)
   */
  readonly options?: CommandOption[];
  
  /**
   * Command flags (--flag)
   */
  readonly flags?: CommandFlag[];
  
  /**
   * Command aliases
   */
  readonly aliases?: string[];
  
  /**
   * Whether this command is hidden from help
   */
  readonly hidden?: boolean;
  
  /**
   * Execute the command
   */
  execute(context: CommandContext): Promise<void>;
  
  /**
   * Validate command arguments before execution
   */
  validate?(context: CommandContext): Promise<boolean>;
  
  /**
   * Get help text for this command
   */
  getHelp?(): string;
}

export interface CommandExecutionResult {
  success: boolean;
  exitCode: number;
  message?: string;
  data?: any;
}