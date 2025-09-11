/**
 * Stop Command for RCC4 CLI
 */

class StopCommand {
  constructor() {
    this.name = 'stop';
    this.description = 'Stop RCC4 system gracefully';
    this.usage = 'rcc4 stop [--port PORT] [--force] [--all]';
    this.version = '1.0.0';
    
    this.options = [
      {
        name: 'port',
        type: 'number',
        default: 5506,
        description: 'Port of the RCC4 instance to stop'
      }
    ];
    
    this.flags = [
      {
        name: 'force',
        alias: 'f',
        description: 'Force stop (SIGKILL) if graceful stop fails'
      },
      {
        name: 'all',
        alias: 'a',
        description: 'Stop all running RCC4 instances'
      }
    ];
    
    this.aliases = ['kill', 'shutdown'];
  }

  async execute(context) {
    const { options, flags, logger, framework } = context;
    
    try {
      const processManager = framework.processManager;
      
      if (flags.all) {
        await this.stopAllInstances(processManager, logger, flags.force);
      } else {
        await this.stopInstance(processManager, logger, options.port, flags.force);
      }
      
    } catch (error) {
      logger.error(`Failed to stop RCC4: ${error.message}`);
      throw error;
    }
  }

  async stopInstance(processManager, logger, port, force) {
    const processName = `rcc4-${port}`;
    
    logger.info(`🛑 Stopping RCC4 system on port ${port}...`);
    
    const existingProcess = await processManager.loadPid(processName);
    if (!existingProcess) {
      logger.info(`No RCC4 instance running on port ${port}`);
      return;
    }
    
    logger.info(`Found RCC4 instance (PID: ${existingProcess.pid})`);
    
    try {
      // Try graceful shutdown first
      const killed = await processManager.killProcess(existingProcess.pid, 'SIGTERM');
      
      if (killed) {
        // Wait a moment for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if still running
        const stillRunning = await processManager.isProcessRunning(existingProcess.pid);
        if (stillRunning && force) {
          logger.warn('Graceful shutdown failed, forcing stop...');
          await processManager.killProcess(existingProcess.pid, 'SIGKILL');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        await processManager.removePid(processName);
        logger.info('✅ RCC4 system stopped successfully');
      } else {
        // Try killing by port as fallback
        logger.warn('Failed to stop by PID, trying port-based stop...');
        const portKilled = await processManager.killProcessByPort(port, force ? 'SIGKILL' : 'SIGTERM');
        
        if (portKilled) {
          await processManager.removePid(processName);
          logger.info('✅ RCC4 system stopped successfully');
        } else {
          logger.error('Failed to stop RCC4 system');
          if (!force) {
            logger.info('Try using --force flag for forceful shutdown');
          }
        }
      }
      
    } catch (error) {
      logger.error(`Error during shutdown: ${error.message}`);
      throw error;
    }
  }

  async stopAllInstances(processManager, logger, force) {
    logger.info('🛑 Stopping all RCC4 instances...');
    
    const allProcesses = processManager.getAllProcesses();
    const rcc4Processes = Array.from(allProcesses.entries())
      .filter(([name]) => name.startsWith('rcc4-'));
    
    if (rcc4Processes.length === 0) {
      logger.info('No RCC4 instances are currently running');
      return;
    }
    
    logger.info(`Found ${rcc4Processes.length} RCC4 instances`);
    
    let stoppedCount = 0;
    let failedCount = 0;
    
    for (const [processName, processInfo] of rcc4Processes) {
      try {
        const port = processInfo.port || processName.split('-')[1];
        logger.info(`Stopping instance on port ${port} (PID: ${processInfo.pid})...`);
        
        await this.stopInstance(processManager, logger, parseInt(port), force);
        stoppedCount++;
        
      } catch (error) {
        logger.error(`Failed to stop ${processName}: ${error.message}`);
        failedCount++;
      }
    }
    
    logger.info(`Stopped ${stoppedCount} instances${failedCount > 0 ? `, ${failedCount} failed` : ''}`);
  }

  async validate(context) {
    const { options, logger } = context;
    
    // Validate port range
    if (options.port < 1 || options.port > 65535) {
      logger.error(`Invalid port number: ${options.port}. Must be between 1 and 65535.`);
      return false;
    }
    
    return true;
  }
}

module.exports = StopCommand;