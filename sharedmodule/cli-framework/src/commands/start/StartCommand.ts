import { ICommand, CommandContext, CommandOptionType } from '../../types/index';

export interface StartCommandOptions {
  port?: number;
  configPath?: string;
  debugBasePath?: string;
  enablePipelineTracking?: boolean;
  enableAutoRestart?: boolean;
  autoRestartAttempts?: number;
  autoRestartDelay?: number;
  enableTwoPhaseDebug?: boolean;
  verbose?: boolean;
}

export class StartCommand implements ICommand {
  name = 'start';
  description = 'Start the RCC system';
  usage = '[options]';

  options = [
    {
      name: 'port',
      type: 'number' as CommandOptionType,
      description: 'Port number to start the RCC system on',
      default: 5506,
      alias: 'p'
    },
    {
      name: 'configPath',
      type: 'string' as CommandOptionType,
      description: 'Path to configuration file',
      default: '~/.route-claudecode/config'
    },
    {
      name: 'debugBasePath',
      type: 'string' as CommandOptionType,
      description: 'Base path for debug logs',
      default: '~/.rcc/debug-logs'
    },
    {
      name: 'enablePipelineTracking',
      type: 'boolean' as CommandOptionType,
      description: 'Enable pipeline execution tracking',
      default: true
    },
    {
      name: 'enableAutoRestart',
      type: 'boolean' as CommandOptionType,
      description: 'Enable automatic restart on failure',
      default: true
    },
    {
      name: 'autoRestartAttempts',
      type: 'number' as CommandOptionType,
      description: 'Maximum number of auto-restart attempts',
      default: 3
    },
    {
      name: 'autoRestartDelay',
      type: 'number' as CommandOptionType,
      description: 'Delay between auto-restart attempts (ms)',
      default: 5000
    },
    {
      name: 'enableTwoPhaseDebug',
      type: 'boolean' as CommandOptionType,
      description: 'Enable two-phase debugging system',
      default: true
    },
    {
      name: 'verbose',
      type: 'boolean' as CommandOptionType,
      description: 'Enable verbose output',
      default: false,
      alias: 'v'
    }
  ];

  async execute(context: CommandContext): Promise<void> {
    const options = this.parseOptions(context.options);

    if (options.verbose) {
      context.logger.info(`Starting RCC system with options: ${JSON.stringify(options, null, 2)}`);
    }

    context.logger.info(`RCC system start command executed (port: ${options.port})`);
    context.logger.info('Note: Full startup system integration requires RCCStartupSystem module');
  }

  private parseOptions(rawOptions: Record<string, unknown>): StartCommandOptions {
    return {
      port: (rawOptions.port as number) || 5506,
      configPath: (rawOptions.configPath as string) || '~/.route-claudecode/config',
      debugBasePath: (rawOptions.debugBasePath as string) || '~/.rcc/debug-logs',
      enablePipelineTracking: (rawOptions.enablePipelineTracking as boolean) ?? true,
      enableAutoRestart: (rawOptions.enableAutoRestart as boolean) ?? true,
      autoRestartAttempts: (rawOptions.autoRestartAttempts as number) ?? 3,
      autoRestartDelay: (rawOptions.autoRestartDelay as number) ?? 5000,
      enableTwoPhaseDebug: (rawOptions.enableTwoPhaseDebug as boolean) ?? true,
      verbose: (rawOptions.verbose as boolean) ?? false,
    };
  }

  async validate(context: CommandContext): Promise<boolean> {
    const options = this.parseOptions(context.options);

    // Validate port number
    if ((options.port || 0) < 1024 || (options.port || 0) > 65535) {
      throw new Error('Port must be between 1024 and 65535');
    }

    // Validate restart attempts
    if (options.autoRestartAttempts !== undefined && options.autoRestartAttempts < 0) {
      throw new Error('Auto-restart attempts must be a positive number');
    }

    // Validate restart delay
    if (options.autoRestartDelay !== undefined && options.autoRestartDelay < 0) {
      throw new Error('Auto-restart delay must be a positive number');
    }

    return true;
  }
}

// Export the command instance
export const startCommand = new StartCommand();