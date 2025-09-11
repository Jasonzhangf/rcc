/**
 * Start Command for RCC4 CLI
 */

class StartCommand {
  constructor() {
    this.name = 'start';
    this.description = 'Start RCC4 system and wait for Ctrl+C (Anthropic Protocol)';
    this.usage = 'rcc4 start [--port PORT] [--protocol anthropic|openai] [--daemon] [--debug]';
    this.version = '1.0.0';
    
    this.options = [
      {
        name: 'port',
        type: 'number',
        default: 5506,
        description: 'Server port to listen on'
      },
      {
        name: 'protocol',
        type: 'string',
        default: 'anthropic',
        choices: ['anthropic', 'openai'],
        description: 'API protocol to use'
      },
      {
        name: 'host',
        type: 'string',
        default: '0.0.0.0',
        description: 'Server host to bind to'
      },
      {
        name: 'config',
        type: 'string',
        description: 'Path to configuration file'
      }
    ];
    
    this.flags = [
      {
        name: 'daemon',
        alias: 'd',
        description: 'Run in daemon mode (background)'
      },
      {
        name: 'debug',
        description: 'Enable debug mode with verbose logging'
      },
      {
        name: 'force',
        alias: 'f',
        description: 'Force start even if another instance is running'
      }
    ];
    
    this.aliases = ['s'];
  }

  async execute(context) {
    const { options, flags, logger, framework } = context;
    
    logger.info(`🚀 Starting RCC4 system...`);
    logger.info(`📡 Protocol: ${options.protocol.toUpperCase()}`);
    logger.info(`🌐 Server: ${options.host}:${options.port}`);
    
    if (flags.debug) {
      logger.info('🐛 Debug mode enabled');
    }
    
    if (flags.daemon) {
      logger.info('👻 Running in daemon mode');
    }

    try {
      // Get process manager from framework
      const processManager = framework.processManager;
      
      // Check if already running
      const existingProcess = await processManager.loadPid(`rcc4-${options.port}`);
      if (existingProcess && !flags.force) {
        logger.warn(`RCC4 is already running on port ${options.port} (PID: ${existingProcess.pid})`);
        logger.info('Use --force to override or run "rcc4 stop" first');
        return;
      }

      // Prepare environment
      const env = {
        ...process.env,
        RCC4_CONFIG: options.config || process.env.RCC4_CONFIG || './config.json',
        RCC4_PORT: options.port.toString(),
        RCC4_PROTOCOL: options.protocol,
        RCC4_HOST: options.host,
        RCC4_DEBUG: flags.debug.toString()
      };

      // Start system using the startup script
      const { spawn } = require('child_process');
      const path = require('path');
      
      const startupScript = path.join(process.cwd(), 'rcc4-system-startup.js');
      
      logger.debug(`Starting process: ${startupScript}`);
      
      const child = spawn('node', [startupScript], {
        env,
        stdio: flags.daemon ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'],
        detached: flags.daemon
      });

      // Save process info
      await processManager.savePid(`rcc4-${options.port}`, {
        pid: child.pid,
        port: options.port,
        startTime: new Date(),
        command: 'start',
        args: process.argv.slice(2)
      });

      if (flags.daemon) {
        child.unref();
        logger.info(`✅ RCC4 started in daemon mode (PID: ${child.pid})`);
        logger.info(`📝 Logs: ${framework.getConfig().logging.file || 'console'}`);
        return;
      }

      // Setup graceful shutdown for non-daemon mode
      const cleanup = async () => {
        logger.info('\n📦 Shutting down RCC4 system...');
        try {
          await processManager.killProcess(child.pid, 'SIGTERM');
          await processManager.removePid(`rcc4-${options.port}`);
          logger.info('✅ RCC4 system stopped gracefully');
        } catch (error) {
          logger.error(`Error stopping RCC4: ${error.message}`);
        }
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      // Handle child process events
      child.on('exit', async (code) => {
        await processManager.removePid(`rcc4-${options.port}`);
        if (code !== 0) {
          logger.error(`RCC4 system exited with code ${code}`);
          process.exit(code);
        }
      });

      child.on('error', async (error) => {
        logger.error(`Failed to start RCC4: ${error.message}`);
        await processManager.removePid(`rcc4-${options.port}`);
        process.exit(1);
      });

      logger.info(`✅ RCC4 system started (PID: ${child.pid})`);
      logger.info('📝 Press Ctrl+C to stop the system gracefully');

      // Wait for process to exit
      await new Promise((resolve) => {
        child.on('exit', resolve);
      });

    } catch (error) {
      logger.error(`Failed to start RCC4 system: ${error.message}`);
      throw error;
    }
  }

  async validate(context) {
    const { options, flags, logger } = context;
    
    // Validate port range
    if (options.port < 1 || options.port > 65535) {
      logger.error(`Invalid port number: ${options.port}. Must be between 1 and 65535.`);
      return false;
    }
    
    // Validate protocol
    if (!['anthropic', 'openai'].includes(options.protocol)) {
      logger.error(`Invalid protocol: ${options.protocol}. Must be 'anthropic' or 'openai'.`);
      return false;
    }
    
    return true;
  }
}

module.exports = StartCommand;