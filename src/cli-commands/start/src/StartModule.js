/**
 * Start Command Module for RCC4 System
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class StartModule {
  constructor() {
    this.metadata = {
      name: 'start',
      version: '1.0.0',
      description: 'RCC4 system startup commands'
    };
  }

  async getCommands() {
    return [{
      name: 'start',
      description: 'Start the RCC4 system with Anthropic protocol',
      usage: 'start [options]',
      options: [
        {
          name: 'port',
          description: 'Port number to start the server on',
          type: 'number',
          default: 5506
        },
        {
          name: 'protocol',
          description: 'Protocol to use (anthropic, openai)',
          type: 'string',
          default: 'anthropic'
        },
        {
          name: 'config',
          description: 'Configuration file path',
          type: 'string',
          default: './config.json'
        }
      ],
      flags: [
        {
          name: 'daemon',
          alias: 'd',
          description: 'Run as daemon process'
        },
        {
          name: 'verbose',
          alias: 'v',
          description: 'Enable verbose logging'
        }
      ],
      execute: async (context) => {
        const { options, flags, logger } = context;
        
        logger.info('Starting RCC4 system...');
        
        try {
          // Check if system is already running
          const pidFile = path.join(process.cwd(), '.rcc4.pid');
          if (fs.existsSync(pidFile)) {
            const pid = fs.readFileSync(pidFile, 'utf8').trim();
            try {
              process.kill(pid, 0); // Check if process exists
              logger.warn(`RCC4 system is already running (PID: ${pid})`);
              return;
            } catch (e) {
              // Process doesn't exist, remove stale PID file
              fs.unlinkSync(pidFile);
            }
          }

          // Load configuration
          const configPath = options.config || './config.json';
          if (!fs.existsSync(configPath)) {
            throw new Error(`Configuration file not found: ${configPath}`);
          }

          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          
          // Extract current settings
          const currentPort = config.settings?.server?.port?.value || config.settings?.general?.port?.value || 5506;
          const currentProtocol = config.settings?.server?.protocol?.value || config.settings?.general?.protocol?.value || 'anthropic';
          
          // Use command line options or current config
          const port = options.port || currentPort;
          const protocol = options.protocol || currentProtocol;

          // Start the RCC4 system
          const startupScript = path.join(process.cwd(), 'rcc4-system-startup.js');
          if (!fs.existsSync(startupScript)) {
            throw new Error('RCC4 startup script not found: rcc4-system-startup.js');
          }

          const nodeArgs = [startupScript];
          const spawnOptions = {
            stdio: flags.daemon ? ['ignore', 'ignore', 'ignore'] : 'inherit',
            detached: flags.daemon,
            env: {
              ...process.env,
              RCC4_PORT: port.toString(),
              RCC4_PROTOCOL: protocol,
              RCC4_VERBOSE: flags.verbose ? 'true' : 'false'
            }
          };

          const child = spawn('node', nodeArgs, spawnOptions);

          if (flags.daemon) {
            // Save PID for daemon mode
            fs.writeFileSync(pidFile, child.pid.toString());
            child.unref();
            logger.info(`RCC4 system started as daemon (PID: ${child.pid})`);
            logger.info(`Server running on port ${port} with ${protocol} protocol`);
          } else {
            logger.info(`RCC4 system started on port ${port} with ${protocol} protocol`);
            logger.info('Press Ctrl+C to stop the server');
            
            // Handle graceful shutdown
            process.on('SIGINT', () => {
              logger.info('Shutting down RCC4 system...');
              child.kill('SIGTERM');
              process.exit(0);
            });

            // Wait for child process
            child.on('exit', (code) => {
              if (code !== 0) {
                logger.error(`RCC4 system exited with code ${code}`);
                process.exit(code);
              }
            });
          }

        } catch (error) {
          logger.error(`Failed to start RCC4 system: ${error.message}`);
          if (context.framework.options.devMode) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      },
      validate: async (context) => {
        const { options } = context;
        
        // Validate port number
        if (options.port && (isNaN(options.port) || options.port < 1 || options.port > 65535)) {
          context.logger.error('Port must be a number between 1 and 65535');
          return false;
        }
        
        // Validate protocol
        if (options.protocol && !['anthropic', 'openai'].includes(options.protocol)) {
          context.logger.error('Protocol must be either "anthropic" or "openai"');
          return false;
        }
        
        return true;
      }
    }];
  }

  async initialize() {
    // Module initialization if needed
  }

  async cleanup() {
    // Module cleanup if needed
  }
}

module.exports = StartModule;