/**
 * Status Command for RCC4 CLI
 */

class StatusCommand {
  constructor() {
    this.name = 'status';
    this.description = 'Show RCC4 system status and running instances';
    this.usage = 'rcc4 status [--port PORT] [--all] [--json]';
    this.version = '1.0.0';
    
    this.options = [
      {
        name: 'port',
        type: 'number',
        description: 'Check status of specific port'
      }
    ];
    
    this.flags = [
      {
        name: 'all',
        alias: 'a',
        description: 'Show all RCC4 instances'
      },
      {
        name: 'json',
        alias: 'j',
        description: 'Output in JSON format'
      },
      {
        name: 'verbose',
        alias: 'v',
        description: 'Show detailed information'
      }
    ];
    
    this.aliases = ['ps', 'list'];
  }

  async execute(context) {
    const { options, flags, logger, framework } = context;
    
    try {
      const processManager = framework.processManager;
      
      if (options.port) {
        await this.showInstanceStatus(processManager, logger, options.port, flags);
      } else {
        await this.showAllStatus(processManager, logger, flags);
      }
      
    } catch (error) {
      logger.error(`Failed to get status: ${error.message}`);
      throw error;
    }
  }

  async showInstanceStatus(processManager, logger, port, flags) {
    const processName = `rcc4-${port}`;
    const processInfo = await processManager.loadPid(processName);
    
    if (!processInfo) {
      if (flags.json) {
        console.log(JSON.stringify({
          port,
          status: 'stopped',
          running: false
        }, null, 2));
      } else {
        logger.info(`RCC4 is not running on port ${port}`);
      }
      return;
    }

    const isRunning = await processManager.isProcessRunning(processInfo.pid);
    const uptime = Date.now() - processInfo.startTime.getTime();
    
    // Try to get additional info from health endpoint
    let healthInfo = null;
    if (isRunning) {
      healthInfo = await this.getHealthInfo(port);
    }

    const status = {
      port,
      pid: processInfo.pid,
      status: isRunning ? 'running' : 'stopped',
      running: isRunning,
      startTime: processInfo.startTime.toISOString(),
      uptime: Math.floor(uptime / 1000),
      command: processInfo.command,
      args: processInfo.args,
      health: healthInfo
    };

    if (flags.json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      this.displayInstanceStatus(status, flags.verbose);
    }
  }

  async showAllStatus(processManager, logger, flags) {
    const allProcesses = processManager.getAllProcesses();
    const rcc4Processes = Array.from(allProcesses.entries())
      .filter(([name]) => name.startsWith('rcc4-'))
      .sort(([a], [b]) => a.localeCompare(b));

    if (rcc4Processes.length === 0) {
      if (flags.json) {
        console.log(JSON.stringify({ instances: [] }, null, 2));
      } else {
        logger.info('No RCC4 instances are currently running');
      }
      return;
    }

    const instances = [];
    
    for (const [processName, processInfo] of rcc4Processes) {
      const port = processInfo.port || parseInt(processName.split('-')[1]);
      const isRunning = await processManager.isProcessRunning(processInfo.pid);
      const uptime = Date.now() - processInfo.startTime.getTime();
      
      let healthInfo = null;
      if (isRunning) {
        healthInfo = await this.getHealthInfo(port);
      }
      
      instances.push({
        port,
        pid: processInfo.pid,
        status: isRunning ? 'running' : 'stopped',
        running: isRunning,
        startTime: processInfo.startTime.toISOString(),
        uptime: Math.floor(uptime / 1000),
        command: processInfo.command,
        args: processInfo.args,
        health: healthInfo
      });
    }

    if (flags.json) {
      console.log(JSON.stringify({ instances }, null, 2));
    } else {
      this.displayAllStatus(instances, flags.verbose);
    }
  }

  async getHealthInfo(port) {
    try {
      const http = require('http');
      
      return await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/health`, { timeout: 3000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              resolve(null);
            }
          });
        });
        
        req.on('error', () => resolve(null));
        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
      });
    } catch (error) {
      return null;
    }
  }

  displayInstanceStatus(status, verbose) {
    const { port, pid, running, startTime, uptime, health } = status;
    
    console.log(`\n🚀 RCC4 Instance - Port ${port}`);
    console.log(`Status: ${running ? '✅ Running' : '❌ Stopped'}`);
    console.log(`PID: ${pid}`);
    console.log(`Uptime: ${this.formatUptime(uptime)}`);
    console.log(`Started: ${new Date(startTime).toLocaleString()}`);
    
    if (health) {
      console.log(`Health: ✅ Healthy`);
      console.log(`Version: ${health.version || 'unknown'}`);
      if (verbose && health.uptime) {
        console.log(`Server Uptime: ${Math.floor(health.uptime)}s`);
      }
    } else if (running) {
      console.log(`Health: ⚠️  No response`);
    }
    
    if (verbose) {
      console.log(`Command: ${status.command}`);
      if (status.args.length > 0) {
        console.log(`Args: ${status.args.join(' ')}`);
      }
    }
  }

  displayAllStatus(instances, verbose) {
    console.log(`\n📊 RCC4 System Status`);
    console.log(`Total instances: ${instances.length}`);
    console.log(`Running: ${instances.filter(i => i.running).length}`);
    console.log(`Stopped: ${instances.filter(i => !i.running).length}`);
    
    console.log('\n' + '='.repeat(80));
    
    for (const instance of instances) {
      const status = instance.running ? '✅' : '❌';
      const health = instance.health ? '🟢' : (instance.running ? '🟡' : '⚪');
      const uptime = instance.running ? this.formatUptime(instance.uptime) : 'N/A';
      
      console.log(`${status} Port ${instance.port.toString().padEnd(6)} PID ${instance.pid.toString().padEnd(8)} ${health} ${uptime}`);
      
      if (verbose) {
        console.log(`   Started: ${new Date(instance.startTime).toLocaleString()}`);
        if (instance.health) {
          console.log(`   Version: ${instance.health.version || 'unknown'}`);
        }
      }
    }
  }

  formatUptime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  async validate(context) {
    const { options, logger } = context;
    
    if (options.port && (options.port < 1 || options.port > 65535)) {
      logger.error(`Invalid port number: ${options.port}. Must be between 1 and 65535.`);
      return false;
    }
    
    return true;
  }
}

module.exports = StatusCommand;