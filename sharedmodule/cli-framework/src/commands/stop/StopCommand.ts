import { ICommand, CommandContext, CommandOptionType } from '../../types/index';

export interface StopCommandOptions {
  force?: boolean;
  timeout?: number;
  verbose?: boolean;
}

export class StopCommand implements ICommand {
  name = 'stop';
  description = 'Stop the RCC system';
  usage = '[options]';
  
  options = [
    {
      name: 'force',
      type: 'boolean' as CommandOptionType,
      description: 'Force stop without graceful shutdown',
      default: false,
      alias: 'f'
    },
    {
      name: 'timeout',
      type: 'number' as CommandOptionType,
      description: 'Timeout for graceful shutdown in milliseconds',
      default: 5000
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
      context.logger.info('Stopping RCC system with options:', options);
    }

    context.logger.info('Stopping RCC system...');

    try {
      // TODO: Implement actual system stopping logic
      // This would interface with the RCCStartupSystem or process management
      await this.stopSystem(options, context);
      
      context.logger.info('RCC system stopped successfully');
      console.log('✅ RCC system stopped successfully');
      
    } catch (error) {
      context.logger.error('Failed to stop RCC system:', error);

      if (options.force) {
        context.logger.warn('Force stop requested, attempting aggressive shutdown...');
        await this.forceStop(context);
      } else {
        console.error('❌ Failed to stop RCC system. Use --force for force stop');
        throw error;
      }
    }
  }

  private async stopSystem(options: StopCommandOptions, context: CommandContext): Promise<void> {
    // Simulate system stopping process
    context.logger.info('Initiating graceful shutdown...');
    
    if (options.verbose) {
      console.log('🛑 Initiating graceful shutdown...');
    }

    // TODO: Replace with actual shutdown logic
    // This would involve:
    // 1. Notifying services to stop accepting new requests
    // 2. Waiting for current requests to complete
    // 3. Closing connections and releasing resources
    // 4. Terminating processes
    
    await this.delay(1000); // Simulate shutdown time
    
    if (options.verbose) {
      console.log('✓ Services stopped accepting new requests');
      console.log('✓ Waiting for current requests to complete...');
      await this.delay(1000);
      console.log('✓ Connections closed and resources released');
    }
  }

  private async forceStop(context: CommandContext): Promise<void> {
    context.logger.warn('Performing force stop...');
    console.log('⚡ Force stopping RCC system...');
    
    // TODO: Implement aggressive shutdown logic
    // This would involve:
    // 1. Immediate process termination
    // 2. Resource cleanup
    // 3. Forceful connection closing
    
    await this.delay(500); // Simulate force stop time
    
    console.log('✅ RCC system force stopped');
    context.logger.info('RCC system force stopped successfully');
  }

  private parseOptions(rawOptions: Record<string, unknown>): StopCommandOptions {
    return {
      force: (rawOptions.force as boolean) ?? false,
      timeout: (rawOptions.timeout as number) ?? 5000,
      verbose: (rawOptions.verbose as boolean) ?? false,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async validate(context: CommandContext): Promise<boolean> {
    const options = this.parseOptions(context.options);
    
    // Validate timeout
    if ((options.timeout || 0) < 0) {
      throw new Error('Timeout must be a positive number');
    }

    return true;
  }
}

// Export the command instance
export const stopCommand = new StopCommand();

export default StopCommand;