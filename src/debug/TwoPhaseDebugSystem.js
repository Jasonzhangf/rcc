/**
 * Simplified Two-Phase Debug System for RCC4
 * Phase 1: systemstart (before port initialization)
 * Phase 2: port-specific (after port initialization)
 */

const fs = require('fs');
const path = require('path');

/**
 * Two-phase debug system for RCC4
 */
class TwoPhaseDebugSystem {
  constructor(baseDirectory = './debug-logs') {
    this.baseDirectory = baseDirectory;
    this.systemStartDirectory = path.join(baseDirectory, 'systemstart');
    this.portDirectory = null;
    this.port = null;
    this.phase = 'systemstart';
    this.enabled = true;
    this.level = 'debug';
    this.enableFileLogging = true;
    this.enableConsoleLogging = true;
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = 5;
    
    this.initializeDirectories();
  }
  
  /**
   * Initialize debug directories
   */
  initializeDirectories() {
    try {
      // Create base directory
      if (!fs.existsSync(this.baseDirectory)) {
        fs.mkdirSync(this.baseDirectory, { recursive: true });
      }
      
      // Create system start directory
      if (!fs.existsSync(this.systemStartDirectory)) {
        fs.mkdirSync(this.systemStartDirectory, { recursive: true });
      }
      
      this.log('info', 'Debug directories initialized', {
        baseDirectory: this.baseDirectory,
        systemStartDirectory: this.systemStartDirectory
      }, 'initializeDirectories');
    } catch (error) {
      console.error('Failed to initialize debug directories:', error);
    }
  }
  
  /**
   * Switch to port-specific logging
   * @param port - Port number
   */
  switchToPortMode(port) {
    this.phase = 'port';
    this.port = port;
    this.portDirectory = path.join(this.baseDirectory, `port-${port}`);
    
    // Create port directory
    if (!fs.existsSync(this.portDirectory)) {
      fs.mkdirSync(this.portDirectory, { recursive: true });
    }
    
    this.log('info', 'Debug system switched to port mode', {
      port,
      portDirectory: this.portDirectory
    }, 'switchToPortMode');
  }
  
  /**
   * Get current log directory
   */
  getCurrentLogDirectory() {
    return this.phase === 'systemstart' 
      ? this.systemStartDirectory 
      : this.portDirectory || this.systemStartDirectory;
  }
  
  /**
   * Get current log file path
   */
  getCurrentLogFilePath() {
    const directory = this.getCurrentLogDirectory();
    const date = new Date().toISOString().split('T')[0];
    return path.join(directory, `${date}.jsonl`);
  }
  
  /**
   * Log a message
   * @param level - Log level
   * @param message - Log message
   * @param data - Additional data
   * @param method - Method name
   */
  log(level, message, data = null, method = null) {
    if (!this.enabled) return;
    
    const levelOrder = ['trace', 'debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levelOrder.indexOf(this.level);
    const messageLevelIndex = levelOrder.indexOf(level);
    
    if (messageLevelIndex < currentLevelIndex) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      method,
      phase: this.phase,
      port: this.port,
      directory: this.getCurrentLogDirectory()
    };
    
    // Console output
    if (this.enableConsoleLogging) {
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.phase.toUpperCase()}]${method ? ` [${method}]` : ''}`;
      const messageText = `${prefix} ${message}`;
      
      switch (level) {
        case 'trace':
        case 'debug':
        case 'info':
          console.log(messageText, data || '');
          break;
        case 'warn':
          console.warn(messageText, data || '');
          break;
        case 'error':
          console.error(messageText, data || '');
          break;
      }
    }
    
    // File output
    if (this.enableFileLogging) {
      this.writeToFile(logEntry);
    }
  }
  
  /**
   * Write log entry to file
   * @param logEntry - Log entry to write
   */
  writeToFile(logEntry) {
    try {
      const logFilePath = this.getCurrentLogFilePath();
      
      // Check file size and rotate if needed
      if (fs.existsSync(logFilePath)) {
        const stats = fs.statSync(logFilePath);
        if (stats.size >= this.maxFileSize) {
          this.rotateLogFile(logFilePath);
        }
      }
      
      // Write log entry
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(logFilePath, logLine);
      
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }
  
  /**
   * Rotate log file
   * @param currentFilePath - Current log file path
   */
  rotateLogFile(currentFilePath) {
    try {
      const directory = path.dirname(currentFilePath);
      const baseName = path.basename(currentFilePath, '.jsonl');
      
      // Find existing rotated files
      const files = fs.readdirSync(directory)
        .filter(file => file.startsWith(`${baseName}.`) && file.endsWith('.jsonl'))
        .sort();
      
      // Remove old files if we have too many
      while (files.length >= this.maxLogFiles) {
        const oldestFile = files.shift();
        if (oldestFile) {
          fs.unlinkSync(path.join(directory, oldestFile));
        }
      }
      
      // Rename current file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = path.join(directory, `${baseName}.${timestamp}.jsonl`);
      fs.renameSync(currentFilePath, rotatedPath);
      
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }
  
  /**
   * Get configuration
   */
  getConfig() {
    return {
      phase: this.phase,
      baseDirectory: this.baseDirectory,
      systemStartDirectory: this.systemStartDirectory,
      portDirectory: this.portDirectory,
      port: this.port,
      enabled: this.enabled,
      level: this.level,
      enableFileLogging: this.enableFileLogging,
      enableConsoleLogging: this.enableConsoleLogging,
      maxFileSize: this.maxFileSize,
      maxLogFiles: this.maxLogFiles
    };
  }
  
  /**
   * Update configuration
   * @param updates - Configuration updates
   */
  updateConfig(updates) {
    Object.assign(this, updates);
  }
  
  /**
   * Get log files in current directory
   */
  getLogFiles() {
    try {
      const directory = this.getCurrentLogDirectory();
      return fs.readdirSync(directory)
        .filter(file => file.endsWith('.jsonl'))
        .map(file => path.join(directory, file));
    } catch (error) {
      console.error('Failed to get log files:', error);
      return [];
    }
  }
  
  /**
   * Read log file content
   * @param filePath - Log file path
   * @param limit - Optional limit on number of entries
   */
  readLogFile(filePath, limit) {
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      const entries = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(entry => entry !== null);
      
      if (limit && limit > 0) {
        return entries.slice(-limit);
      }
      
      return entries;
    } catch (error) {
      console.error('Failed to read log file:', error);
      return [];
    }
  }
  
  /**
   * Clean up old log files
   * @param daysToKeep - Number of days to keep logs
   */
  cleanupOldLogs(daysToKeep = 30) {
    try {
      const directories = [
        this.systemStartDirectory,
        ...(this.portDirectory ? [this.portDirectory] : [])
      ];
      
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      
      for (const directory of directories) {
        if (!fs.existsSync(directory)) continue;
        
        const files = fs.readdirSync(directory);
        for (const file of files) {
          const filePath = path.join(directory, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filePath);
          }
        }
      }
      
      this.log('info', 'Cleaned up old log files', { daysToKeep }, 'cleanupOldLogs');
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }
}

module.exports = TwoPhaseDebugSystem;