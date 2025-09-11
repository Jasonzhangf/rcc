/**
 * Stop Command Module for RCC4 System
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

class StopModule {
  constructor() {
    this.metadata = {
      name: 'stop',
      version: '1.0.0',
      description: 'RCC4 system shutdown commands'
    };
  }

  async getCommands() {
    return [{
      name: 'stop',
      description: 'Stop the RCC4 system gracefully',
      usage: 'stop [options]',
      options: [
        {
          name: 'port',
          description: 'Port number of the running server',
          type: 'number',
          default: 5506
        },
        {
          name: 'timeout',
          description: 'Timeout in seconds to wait for graceful shutdown',
          type: 'number',
          default: 30
        }
      ],
      flags: [
        {
          name: 'force',
          alias: 'f',
          description: 'Force kill the process if graceful shutdown fails'
        },
        {
          name: 'all',
          alias: 'a',
          description: 'Stop all RCC4 processes'
        }
      ],
      execute: async (context) => {
        const { options, flags, logger } = context;
        
        logger.info('Stopping RCC4 system...');
        
        try {
          const pidFile = path.join(process.cwd(), '.rcc4.pid');
          let pid = null;

          // Try to get PID from file
          if (fs.existsSync(pidFile)) {
            pid = fs.readFileSync(pidFile, 'utf8').trim();
            logger.debug(`Found PID file with PID: ${pid}`);
          }

          // Try graceful shutdown via HTTP API first
          const port = options.port || 5506;
          const shutdownSuccess = await this.gracefulShutdown(port, logger);
          
          if (shutdownSuccess) {
            logger.info('RCC4 system stopped gracefully');
            
            // Clean up PID file
            if (fs.existsSync(pidFile)) {
              fs.unlinkSync(pidFile);
            }
            return;
          }

          // If graceful shutdown failed and we have a PID, try to kill the process
          if (pid) {
            await this.killProcess(pid, flags.force, options.timeout, logger);
            
            // Clean up PID file
            if (fs.existsSync(pidFile)) {
              fs.unlinkSync(pidFile);
            }
          } else if (flags.all) {
            // Kill all node processes that might be RCC4
            await this.killAllRCC4Processes(logger);
          } else {
            logger.warn('No running RCC4 process found');
            logger.info('Use --all flag to stop all potential RCC4 processes');
          }

        } catch (error) {
          logger.error(`Failed to stop RCC4 system: ${error.message}`);
          if (context.framework.options.devMode) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      }
    }];
  }

  async gracefulShutdown(port, logger) {
    return new Promise((resolve) => {
      logger.debug(`Attempting graceful shutdown via HTTP on port ${port}`);
      
      const req = http.request({
        hostname: 'localhost',
        port: port,
        path: '/code/stop',
        method: 'POST',
        timeout: 5000
      }, (res) => {
        logger.debug(`Shutdown request responded with status: ${res.statusCode}`);
        resolve(res.statusCode === 200);
      });

      req.on('error', (error) => {
        logger.debug(`Graceful shutdown request failed: ${error.message}`);
        resolve(false);
      });

      req.on('timeout', () => {
        logger.debug('Graceful shutdown request timed out');
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  async killProcess(pid, force, timeout, logger) {
    try {
      // Check if process exists
      process.kill(pid, 0);
      
      if (!force) {
        // Send SIGTERM for graceful shutdown
        logger.info(`Sending SIGTERM to process ${pid}...`);
        process.kill(pid, 'SIGTERM');
        
        // Wait for process to exit
        const startTime = Date.now();
        while (Date.now() - startTime < timeout * 1000) {
          try {
            process.kill(pid, 0);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (e) {
            logger.info(`Process ${pid} terminated gracefully`);
            return;
          }
        }
        
        logger.warn(`Process ${pid} did not terminate within ${timeout} seconds`);
        logger.info('Use --force flag to kill the process immediately');
      } else {
        // Force kill with SIGKILL
        logger.info(`Force killing process ${pid}...`);
        process.kill(pid, 'SIGKILL');
        logger.info(`Process ${pid} killed`);
      }
      
    } catch (error) {
      if (error.code === 'ESRCH') {
        logger.info(`Process ${pid} is not running`);
      } else {
        throw error;
      }
    }
  }

  async killAllRCC4Processes(logger) {
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      // Find all node processes that might be RCC4
      exec('ps aux | grep node | grep -E "(rcc4|RCC4)" | grep -v grep', (error, stdout) => {
        if (error || !stdout.trim()) {
          logger.info('No RCC4 processes found');
          resolve();
          return;
        }

        const lines = stdout.trim().split('\n');
        const pids = lines.map(line => {
          const parts = line.trim().split(/\s+/);
          return parts[1]; // PID is the second column
        });

        logger.info(`Found ${pids.length} potential RCC4 processes: ${pids.join(', ')}`);

        pids.forEach(pid => {
          try {
            process.kill(pid, 'SIGTERM');
            logger.info(`Sent SIGTERM to process ${pid}`);
          } catch (e) {
            logger.warn(`Failed to kill process ${pid}: ${e.message}`);
          }
        });

        resolve();
      });
    });
  }

  async initialize() {
    // Module initialization if needed
  }

  async cleanup() {
    // Module cleanup if needed
  }
}

module.exports = StopModule;