import { BaseModule } from '../../../core/BaseModule/src/BaseModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../../../interfaces/Connection';
import { IDebugModule, LogLevel } from '../interfaces/IDebugModule';
import * as fs from 'fs';
import * as path from 'path';



/**
 * Configuration for DebugModule
 */
export interface DebugConfig {
  // Whether to enable console output
  consoleOutput: boolean;
  
  // Root directory for logs
  rootDir: string;
  
  // Custom folder name for this module's logs (instead of port-based naming)
  customFolderName?: string;
  
  // Port for the debug module (used for directory structure when customFolderName is not set)
  port?: number;
  
  // Whether to enable file logging
  fileLogging: boolean;
  
  // Log level
  logLevel: LogLevel;
  
  // Whether to record data flow
  recordDataFlow: boolean;
  
  // Whether to record call stack
  recordCallStack: boolean;
  
  // Maximum number of log files to keep
  maxLogFiles: number;
}

/**
 * Debug log entry
 */
export interface DebugLogEntry {
  // Timestamp
  timestamp: number;
  
  // Log level
  level: LogLevel;
  
  // Message content
  message: string;
  
  // Module information (optional)
  moduleInfo?: ModuleInfo;
  
  // Call stack (optional)
  callStack?: string;
  
  // Data flow information (optional)
  dataFlow?: {
    sourceModuleId: string;
    targetModuleId: string;
    data: any;
  };
  
  // Port information (optional)
  port?: number;
  
  // Custom folder name (optional)
  customFolderName?: string;
}

/**
 * DebugModule for logging and debugging module communications
 * This module supports simultaneous console output and file logging
 */
export class DebugModule extends BaseModule implements IDebugModule {
  /**
   * Debug configuration
   */
  private debugConfig: DebugConfig = {
    consoleOutput: true,
    rootDir: './logs',
    customFolderName: undefined,
    port: undefined,
    fileLogging: true,
    logLevel: LogLevel.DEBUG,
    recordDataFlow: true,
    recordCallStack: true,
    maxLogFiles: 10
  };
  
  /**
   * Log entries
   */
  private logEntries: DebugLogEntry[] = [];
  
  /**
   * Connected modules for data flow recording
   */
  private connectedModules: Set<string> = new Set();
  
  /**
   * Creates an instance of DebugModule
   * @param info - Module information
   */
  constructor(info: ModuleInfo) {
    super(info);
  }
  
  /**
   * Configures the debug module
   * @param config - Debug configuration
   */
  public configure(config: Partial<DebugConfig>): void {
    if (this['initialized']) {
      throw new Error('Cannot configure module after initialization');
    }
    
    this.debugConfig = { ...this.debugConfig, ...config };
    this['configured'] = true;
  }
  
  /**
   * Updates the port configuration
   * @param port - New port number
   */
  public updatePort(port: number): void {
    this.debugConfig.port = port;
    
    // If we don't have a custom folder name, recreate directory structure with new port
    if (!this.debugConfig.customFolderName && this.debugConfig.fileLogging) {
      this.createDirectoryStructure();
    }
  }
  
  /**
   * Initializes the module
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    
    const folderName = this.debugConfig.customFolderName || (this.debugConfig.port ? `port-${this.debugConfig.port}` : 'default');
    console.log(`DebugModule ${this['info'].id} initialized in folder ${folderName}`);
    
    // Create directory structure if file logging is enabled
    if (this.debugConfig.fileLogging) {
      this.createDirectoryStructure();
    }
  }
  
  /**
   * Creates the directory structure for logging
   */
  private createDirectoryStructure(): void {
    try {
      // Create root directory if it doesn't exist
      if (!fs.existsSync(this.debugConfig.rootDir)) {
        fs.mkdirSync(this.debugConfig.rootDir, { recursive: true });
      }
      
      // Determine folder name
      const folderName = this.debugConfig.customFolderName || (this.debugConfig.port ? `port-${this.debugConfig.port}` : 'default');
      
      // Create module directory
      const moduleDir = path.join(this.debugConfig.rootDir, folderName);
      if (!fs.existsSync(moduleDir)) {
        fs.mkdirSync(moduleDir, { recursive: true });
      }
      
      // Create logs directory
      const logsDir = path.join(moduleDir, 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      // Create errors directory
      const errorsDir = path.join(moduleDir, 'errors');
      if (!fs.existsSync(errorsDir)) {
        fs.mkdirSync(errorsDir, { recursive: true });
      }
      
      // Create dataflow directory
      const dataflowDir = path.join(moduleDir, 'dataflow');
      if (!fs.existsSync(dataflowDir)) {
        fs.mkdirSync(dataflowDir, { recursive: true });
      }
      
      console.log(`Directory structure created for folder ${folderName}`);
    } catch (error) {
      console.error(`Failed to create directory structure: ${error}`);
    }
  }
  
  /**
   * Gets the log file path based on log level and current date
   * @param level - Log level
   * @returns Path to the log file
   */
  private getLogFilePath(level: LogLevel): string {
    const date = new Date();
    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    const timestamp = Date.now();
    
    // Determine folder name
    const folderName = this.debugConfig.customFolderName || (this.debugConfig.port ? `port-${this.debugConfig.port}` : 'default');
    
    // Determine directory based on log level
    let dir: string;
    if (level === LogLevel.ERROR) {
      dir = path.join(this.debugConfig.rootDir, folderName, 'errors');
    } else {
      dir = path.join(this.debugConfig.rootDir, folderName, 'logs');
    }
    
    // Create filename with timestamp
    const levelStr = LogLevel[level].toLowerCase();
    return path.join(dir, `${levelStr}-${dateString}-${timestamp}.log`);
  }
  
  /**
   * Gets the data flow log file path
   * @returns Path to the data flow log file
   */
  private getDataFlowLogFilePath(): string {
    const date = new Date();
    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    const timestamp = Date.now();
    
    // Determine folder name
    const folderName = this.debugConfig.customFolderName || (this.debugConfig.port ? `port-${this.debugConfig.port}` : 'default');
    
    const dir = path.join(this.debugConfig.rootDir, folderName, 'dataflow');
    return path.join(dir, `dataflow-${dateString}-${timestamp}.log`);
  }
  
  /**
   * Cleans up old log files to maintain maxLogFiles limit
   * @param dir - Directory to clean up
   */
  private cleanupOldLogFiles(dir: string): void {
    try {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      if (files.length <= this.debugConfig.maxLogFiles) return;
      
      // Sort files by modification time (oldest first)
      const sortedFiles = files
        .map(file => ({ name: file, time: fs.statSync(path.join(dir, file)).mtime.getTime() }))
        .sort((a, b) => a.time - b.time);
      
      // Remove oldest files
      const filesToRemove = sortedFiles.length - this.debugConfig.maxLogFiles;
      for (let i = 0; i < filesToRemove; i++) {
        fs.unlinkSync(path.join(dir, sortedFiles[i].name));
      }
    } catch (error) {
      console.error(`Failed to cleanup old log files in ${dir}: ${error}`);
    }
  }
  
  /**
   * Logs a message with module information and call stack
   * @param message - Message to log
   * @param level - Log level
   * @param moduleInfo - Module information (optional)
   */
  public log(message: string, level: LogLevel = LogLevel.INFO, moduleInfo?: ModuleInfo): void {
    // Check if log level is enabled
    if (level < this.debugConfig.logLevel) {
      return;
    }
    
    // Get call stack if enabled
    let callStack: string | undefined;
    if (this.debugConfig.recordCallStack) {
      const stack = new Error().stack;
      if (stack) {
        // Parse call stack to get caller information
        const stackLines = stack.split('\n');
        // Skip the first two lines (Error and this function)
        callStack = stackLines.slice(2, 4).join('\n');
      }
    }
    
    // Create log entry
    const logEntry: DebugLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      moduleInfo,
      callStack,
      port: this.debugConfig.port,
      customFolderName: this.debugConfig.customFolderName
    };
    
    // Add to log entries
    this.logEntries.push(logEntry);
    
    // Output to console if enabled
    if (this.debugConfig.consoleOutput) {
      const levelStr = LogLevel[level];
      const timestamp = new Date(logEntry.timestamp).toISOString();
      const folderName = this.debugConfig.customFolderName || (this.debugConfig.port ? `port-${this.debugConfig.port}` : 'default');
      let output = `[${timestamp}] [${levelStr}] [${folderName}] ${message}`;
      
      if (moduleInfo) {
        output += ` [Module: ${moduleInfo.id}]`;
      }
      
      if (callStack) {
        output += `\n${callStack}`;
      }
      
      switch (level) {
        case LogLevel.DEBUG:
        case LogLevel.INFO:
          console.log(output);
          break;
        case LogLevel.WARN:
          console.warn(output);
          break;
        case LogLevel.ERROR:
          console.error(output);
          break;
      }
    }
    
    // Write to file if enabled
    if (this.debugConfig.fileLogging) {
      this.writeToFile(logEntry);
    }
  }
  
  /**
   * Records data flow between modules
   * @param sourceModuleId - Source module ID
   * @param targetModuleId - Target module ID
   * @param data - Data being transferred
   */
  public recordDataFlow(sourceModuleId: string, targetModuleId: string, data: any): void {
    if (!this.debugConfig.recordDataFlow) {
      return;
    }
    
    // Check if modules are connected for data flow recording
    if (!this.connectedModules.has(sourceModuleId) && !this.connectedModules.has(targetModuleId)) {
      return;
    }
    
    // Get call stack if enabled
    let callStack: string | undefined;
    if (this.debugConfig.recordCallStack) {
      const stack = new Error().stack;
      if (stack) {
        // Parse call stack to get caller information
        const stackLines = stack.split('\n');
        // Skip the first two lines (Error and this function)
        callStack = stackLines.slice(2, 4).join('\n');
      }
    }
    
    // Create log entry
    const logEntry: DebugLogEntry = {
      timestamp: Date.now(),
      level: LogLevel.DEBUG,
      message: `Data flow from ${sourceModuleId} to ${targetModuleId}`,
      dataFlow: {
        sourceModuleId,
        targetModuleId,
        data: this.sanitizeData(data)
      },
      callStack,
      port: this.debugConfig.port,
      customFolderName: this.debugConfig.customFolderName
    };
    
    // Add to log entries
    this.logEntries.push(logEntry);
    
    // Output to console if enabled
    if (this.debugConfig.consoleOutput) {
      const timestamp = new Date(logEntry.timestamp).toISOString();
      const folderName = this.debugConfig.customFolderName || (this.debugConfig.port ? `port-${this.debugConfig.port}` : 'default');
      let output = `[${timestamp}] [DATA_FLOW] [${folderName}] ${logEntry.message}`;
      
      if (callStack) {
        output += `\n${callStack}`;
      }
      
      console.log(output);
    }
    
    // Write to file if enabled
    if (this.debugConfig.fileLogging) {
      this.writeDataFlowToFile(logEntry);
    }
  }
  
  /**
   * Adds a module connection for data flow recording
   * @param moduleId - Module ID
   * @param connectionType - Connection type
   */
  public addModuleConnection(moduleId: string, connectionType: 'input' | 'output'): void {
    this.connectedModules.add(moduleId);
    this.log(`Added ${connectionType} connection for module ${moduleId}`, LogLevel.DEBUG);
  }
  
  /**
   * Removes a module connection
   * @param moduleId - Module ID
   */
  public removeModuleConnection(moduleId: string): void {
    this.connectedModules.delete(moduleId);
    this.log(`Removed connection for module ${moduleId}`, LogLevel.DEBUG);
  }
  
  /**
   * Gets all log entries
   * @returns Array of log entries
   */
  public getLogs(): DebugLogEntry[] {
    return [...this.logEntries];
  }
  
  /**
   * Clears all log entries
   */
  public clearLogs(): void {
    this.logEntries = [];
    this.log('Logs cleared', LogLevel.INFO);
  }
  
  /**
   * Gets the debug configuration
   * @returns Debug configuration
   */
  public getDebugConfig(): DebugConfig {
    return { ...this.debugConfig };
  }
  
  /**
   * Writes a log entry to file
   * @param logEntry - Log entry to write
   */
  private writeToFile(logEntry: DebugLogEntry): void {
    try {
      // Get log file path
      const logFilePath = this.getLogFilePath(logEntry.level);
      
      // Format log entry as JSON string
      const logString = JSON.stringify({
        ...logEntry,
        timestamp: new Date(logEntry.timestamp).toISOString()
      }) + '\n';
      
      // Write to log file
      fs.appendFileSync(logFilePath, logString);
      
      // Clean up old log files
      const dir = path.dirname(logFilePath);
      this.cleanupOldLogFiles(dir);
    } catch (error) {
      console.error(`Failed to write to log file: ${error}`);
    }
  }
  
  /**
   * Writes a data flow log entry to file
   * @param logEntry - Log entry to write
   */
  private writeDataFlowToFile(logEntry: DebugLogEntry): void {
    try {
      // Get data flow log file path
      const logFilePath = this.getDataFlowLogFilePath();
      
      // Format log entry as JSON string
      const logString = JSON.stringify({
        ...logEntry,
        timestamp: new Date(logEntry.timestamp).toISOString()
      }) + '\n';
      
      // Write to log file
      fs.appendFileSync(logFilePath, logString);
      
      // Clean up old log files
      const dir = path.dirname(logFilePath);
      this.cleanupOldLogFiles(dir);
    } catch (error) {
      console.error(`Failed to write data flow to log file: ${error}`);
    }
  }
  
  /**
   * Sanitizes data for logging (removes sensitive information)
   * @param data - Data to sanitize
   * @returns Sanitized data
   */
  private sanitizeData(data: any): any {
    // For now, just return a clone of the data
    // In a real implementation, you might want to remove sensitive fields
    return JSON.parse(JSON.stringify(data));
  }
  
  /**
   * Receives data from connected modules
   * @param dataTransfer - Data transfer information
   */
  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    await super.receiveData(dataTransfer);
    this.log(`Received data from ${dataTransfer.sourceConnectionId}`, LogLevel.DEBUG, this['info']);
  }
  
  /**
   * Cleans up resources and connections
   */
  public async destroy(): Promise<void> {
    this.log(`DebugModule ${this['info'].id} destroyed`, LogLevel.INFO);
    this.connectedModules.clear();
    await super.destroy();
  }
}