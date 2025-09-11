/**
 * Process Manager for RCC CLI Framework
 */

import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface ProcessInfo {
  pid: number;
  port?: number;
  startTime: Date;
  command: string;
  args: string[];
}

export class ProcessManager extends BaseModule {
  private pidDir: string;
  private processes: Map<string, ProcessInfo> = new Map();

  constructor() {
    const moduleInfo: ModuleInfo = {
      id: 'ProcessManager',
      name: 'Process Manager',
      version: '1.0.0',
      description: 'Process lifecycle management for CLI framework',
      type: 'manager',

      metadata: {
        author: 'RCC Development Team',
        license: 'MIT'
      }
    };

    super(moduleInfo);
    this.pidDir = path.join(os.tmpdir(), 'rcc-cli');
  }

  async initialize(): Promise<void> {
    await super.initialize();
    
    // Ensure PID directory exists
    if (!fs.existsSync(this.pidDir)) {
      fs.mkdirSync(this.pidDir, { recursive: true });
      this.log(`Created PID directory: ${this.pidDir}`);
    }

    // Load existing process information
    await this.loadExistingProcesses();

    // Setup cleanup handlers
    this.setupCleanupHandlers();
  }

  async savePid(name: string, processInfo: ProcessInfo): Promise<string> {
    const pidFile = this.getPidFile(name);
    const pidData = {
      ...processInfo,
      startTime: processInfo.startTime.toISOString()
    };

    try {
      fs.writeFileSync(pidFile, JSON.stringify(pidData, null, 2), 'utf8');
      this.processes.set(name, processInfo);
      this.log(`Saved PID for ${name}: ${processInfo.pid}`);
      return pidFile;
    } catch (error) {
      this.error(`Failed to save PID file for ${name}: ${(error as Error).message}`);
      throw error;
    }
  }

  async loadPid(name: string): Promise<ProcessInfo | null> {
    const pidFile = this.getPidFile(name);
    
    if (!fs.existsSync(pidFile)) {
      return null;
    }

    try {
      const pidData = JSON.parse(fs.readFileSync(pidFile, 'utf8'));
      const processInfo: ProcessInfo = {
        ...pidData,
        startTime: new Date(pidData.startTime)
      };

      // Verify process is still running
      if (await this.isProcessRunning(processInfo.pid)) {
        this.processes.set(name, processInfo);
        return processInfo;
      } else {
        // Process is dead, remove stale PID file
        await this.removePid(name);
        return null;
      }
    } catch (error) {
      this.warn(`Failed to load PID file for ${name}: ${(error as Error).message}`);
      await this.removePid(name);
      return null;
    }
  }

  async removePid(name: string): Promise<void> {
    const pidFile = this.getPidFile(name);
    
    try {
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
        this.log(`Removed PID file for ${name}`);
      }
      this.processes.delete(name);
    } catch (error) {
      this.warn(`Failed to remove PID file for ${name}: ${(error as Error).message}`);
    }
  }

  async isProcessRunning(pid: number): Promise<boolean> {
    try {
      // Send signal 0 to check if process exists
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  async killProcess(pid: number, signal: NodeJS.Signals = 'SIGTERM'): Promise<boolean> {
    try {
      process.kill(pid, signal);
      this.log(`Sent ${signal} to process ${pid}`);
      return true;
    } catch (error) {
      this.warn(`Failed to kill process ${pid}: ${(error as Error).message}`);
      return false;
    }
  }

  async killProcessByName(name: string, signal: NodeJS.Signals = 'SIGTERM'): Promise<boolean> {
    const processInfo = await this.loadPid(name);
    if (!processInfo) {
      this.warn(`No process found with name: ${name}`);
      return false;
    }

    const killed = await this.killProcess(processInfo.pid, signal);
    if (killed) {
      await this.removePid(name);
    }
    return killed;
  }

  async killProcessByPort(port: number, signal: NodeJS.Signals = 'SIGTERM'): Promise<boolean> {
    // Find process by port using lsof or netstat
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Try lsof first (macOS/Linux)
      try {
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        const pids = stdout.trim().split('\n').filter(Boolean);
        
        if (pids.length > 0) {
          let killed = false;
          for (const pidStr of pids) {
            const pid = parseInt(pidStr, 10);
            if (!isNaN(pid)) {
              killed = await this.killProcess(pid, signal) || killed;
            }
          }
          return killed;
        }
      } catch (lsofError) {
        // lsof failed, process not found or not available
      }

      return false;
    } catch (error) {
      this.error(`Failed to kill process on port ${port}: ${(error as Error).message}`);
      return false;
    }
  }

  getProcessInfo(name: string): ProcessInfo | undefined {
    return this.processes.get(name);
  }

  getAllProcesses(): Map<string, ProcessInfo> {
    return new Map(this.processes);
  }

  private getPidFile(name: string): string {
    return path.join(this.pidDir, `${name}.pid`);
  }

  private async loadExistingProcesses(): Promise<void> {
    try {
      const pidFiles = fs.readdirSync(this.pidDir).filter(file => file.endsWith('.pid'));
      
      for (const pidFile of pidFiles) {
        const name = path.basename(pidFile, '.pid');
        await this.loadPid(name);
      }

      this.log(`Loaded ${this.processes.size} existing processes`);
    } catch (error) {
      this.warn(`Failed to load existing processes: ${(error as Error).message}`);
    }
  }

  private setupCleanupHandlers(): void {
    const cleanup = async () => {
      this.log('Cleaning up process manager...');
      // Cleanup logic if needed
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
  }

  async shutdown(): Promise<void> {
    this.log('Shutting down process manager...');
    
    // Optional: cleanup all tracked processes
    // for (const [name, processInfo] of this.processes) {
    //   await this.killProcess(processInfo.pid, 'SIGTERM');
    // }
    
    await super.destroy();
  }
}