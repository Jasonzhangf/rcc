/**
 * Status Command Module for RCC4 System
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

class StatusModule {
  constructor() {
    this.metadata = {
      name: 'status',
      version: '1.0.0',
      description: 'RCC4 system status and health check commands'
    };
  }

  async getCommands() {
    return [{
      name: 'status',
      description: 'Check RCC4 system status and health',
      usage: 'status [options]',
      options: [
        {
          name: 'port',
          description: 'Port number to check',
          type: 'number',
          default: 5506
        },
        {
          name: 'format',
          description: 'Output format (table, json)',
          type: 'string',
          default: 'table'
        }
      ],
      flags: [
        {
          name: 'detailed',
          alias: 'd',
          description: 'Show detailed system information'
        },
        {
          name: 'health',
          alias: 'h',
          description: 'Perform health check'
        },
        {
          name: 'processes',
          alias: 'p',
          description: 'Show all RCC4 processes'
        }
      ],
      execute: async (context) => {
        const { options, flags, logger } = context;
        
        try {
          const status = await this.getSystemStatus(options.port, flags.detailed);
          
          if (flags.health) {
            const healthStatus = await this.performHealthCheck(options.port);
            status.health = healthStatus;
          }

          if (flags.processes) {
            const processes = await this.getRCC4Processes();
            status.processes = processes;
          }

          this.displayStatus(status, options.format, logger);

        } catch (error) {
          logger.error(`Failed to get system status: ${error.message}`);
          if (context.framework.options.devMode) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      }
    }];
  }

  async getSystemStatus(port, detailed = false) {
    const status = {
      timestamp: new Date().toISOString(),
      port: port,
      running: false,
      pid: null,
      uptime: null,
      version: null,
      config: null
    };

    // Check PID file
    const pidFile = path.join(process.cwd(), '.rcc4.pid');
    if (fs.existsSync(pidFile)) {
      const pid = fs.readFileSync(pidFile, 'utf8').trim();
      status.pid = parseInt(pid);
      
      try {
        process.kill(pid, 0); // Check if process exists
        status.running = true;
        
        // Get process uptime
        if (detailed) {
          status.uptime = await this.getProcessUptime(pid);
        }
      } catch (e) {
        // Process doesn't exist, but PID file does
        status.running = false;
        status.stale_pid_file = true;
      }
    }

    // Check if server is responding on port
    const serverResponding = await this.checkServerHealth(port);
    status.server_responding = serverResponding;

    // If server is responding but we don't have PID, it might be running without PID file
    if (serverResponding && !status.running) {
      status.running = true;
      status.pid = await this.findProcessByPort(port);
    }

    // Load configuration if available
    if (detailed) {
      try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
          status.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
      } catch (e) {
        // Ignore config loading errors
      }
    }

    return status;
  }

  async checkServerHealth(port) {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: port,
        path: '/health',
        method: 'GET',
        timeout: 3000
      }, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  async performHealthCheck(port) {
    const health = {
      server: false,
      endpoints: {},
      response_time: null
    };

    const startTime = Date.now();
    health.server = await this.checkServerHealth(port);
    health.response_time = Date.now() - startTime;

    if (health.server) {
      // Check specific endpoints
      const endpoints = ['/health', '/v1/chat/completions'];
      
      for (const endpoint of endpoints) {
        health.endpoints[endpoint] = await this.checkEndpoint(port, endpoint);
      }
    }

    return health;
  }

  async checkEndpoint(port, endpoint) {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: port,
        path: endpoint,
        method: 'GET',
        timeout: 5000
      }, (res) => {
        resolve({
          status: res.statusCode,
          accessible: true
        });
      });

      req.on('error', (error) => {
        resolve({
          status: null,
          accessible: false,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          status: null,
          accessible: false,
          error: 'timeout'
        });
      });

      req.end();
    });
  }

  async getProcessUptime(pid) {
    return new Promise((resolve) => {
      exec(`ps -o etime= -p ${pid}`, (error, stdout) => {
        if (error) {
          resolve(null);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  async findProcessByPort(port) {
    return new Promise((resolve) => {
      exec(`lsof -ti :${port}`, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(null);
        } else {
          resolve(parseInt(stdout.trim()));
        }
      });
    });
  }

  async getRCC4Processes() {
    return new Promise((resolve) => {
      exec('ps aux | grep node | grep -E "(rcc4|RCC4)" | grep -v grep', (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve([]);
          return;
        }

        const processes = stdout.trim().split('\n').map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            pid: parseInt(parts[1]),
            cpu: parts[2],
            memory: parts[3],
            command: parts.slice(10).join(' ')
          };
        });

        resolve(processes);
      });
    });
  }

  displayStatus(status, format, logger) {
    if (format === 'json') {
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    // Table format
    console.log('\n🔍 RCC4 System Status');
    console.log('═'.repeat(50));
    
    const statusIcon = status.running ? '🟢' : '🔴';
    const statusText = status.running ? 'RUNNING' : 'STOPPED';
    
    console.log(`${statusIcon} Status: ${statusText}`);
    console.log(`📡 Port: ${status.port}`);
    console.log(`🆔 PID: ${status.pid || 'N/A'}`);
    
    if (status.uptime) {
      console.log(`⏱️  Uptime: ${status.uptime}`);
    }
    
    console.log(`🌐 Server Responding: ${status.server_responding ? '✅ Yes' : '❌ No'}`);
    
    if (status.stale_pid_file) {
      console.log('⚠️  Warning: Stale PID file found');
    }

    if (status.health) {
      console.log('\n🏥 Health Check');
      console.log('─'.repeat(20));
      console.log(`Response Time: ${status.health.response_time}ms`);
      
      if (status.health.endpoints) {
        console.log('Endpoints:');
        for (const [endpoint, result] of Object.entries(status.health.endpoints)) {
          const icon = result.accessible ? '✅' : '❌';
          console.log(`  ${icon} ${endpoint}: ${result.status || 'N/A'}`);
        }
      }
    }

    if (status.processes && status.processes.length > 0) {
      console.log('\n🔧 RCC4 Processes');
      console.log('─'.repeat(20));
      console.log('PID\t\tCPU%\tMEM%\tCOMMAND');
      status.processes.forEach(proc => {
        console.log(`${proc.pid}\t\t${proc.cpu}\t${proc.memory}\t${proc.command.substring(0, 50)}...`);
      });
    }

    if (status.config) {
      console.log('\n⚙️  Configuration');
      console.log('─'.repeat(20));
      console.log(`Framework: ${status.config.metadata?.name || 'N/A'} v${status.config.metadata?.version || 'N/A'}`);
      console.log(`Protocol: ${status.config.settings?.server?.protocol || 'N/A'}`);
      console.log(`Port: ${status.config.settings?.server?.port || 'N/A'}`);
    }

    console.log('\n');
  }

  async initialize() {
    // Module initialization if needed
  }

  async cleanup() {
    // Module cleanup if needed
  }
}

module.exports = StatusModule;