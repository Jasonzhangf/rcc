interface CLICommand {
    name: string;
    description: string;
    options: CommandOption[];
    examples: string[];
    execute: (context: CommandContext) => Promise<void>;
}
interface CommandOption {
    name: string;
    alias?: string;
    description: string;
    type: 'string' | 'number' | 'boolean';
    required: boolean;
}
interface CommandContext {
    args: string[];
    options: Record<string, any>;
    logger: Logger;
    cwd: string;
    command: CLICommand;
}
interface Logger {
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    trace(message: string, ...args: any[]): void;
}

type cliTypes_d_CLICommand = CLICommand;
type cliTypes_d_CommandContext = CommandContext;
type cliTypes_d_CommandOption = CommandOption;
type cliTypes_d_Logger = Logger;
declare namespace cliTypes_d {
  export type { cliTypes_d_CLICommand as CLICommand, cliTypes_d_CommandContext as CommandContext, cliTypes_d_CommandOption as CommandOption, cliTypes_d_Logger as Logger };
}

declare const stopCommand: CLICommand;

declare const codeCommand: CLICommand;

declare const restartCommand: CLICommand;

declare const defaultCLIConfig: {
    name: string;
    version: string;
    description: string;
    commandDiscovery: {
        commandDirs: string[];
        modulePatterns: string[];
        autoLoad: boolean;
        watchForChanges: boolean;
    };
    defaultCommand: string;
};

export { cliTypes_d as CLI_TYPES, codeCommand, defaultCLIConfig, restartCommand, stopCommand };
