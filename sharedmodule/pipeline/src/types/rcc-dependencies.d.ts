/**
 * Type declaration file for RCC pipeline module dependencies
 * RCC流水线模块依赖项的类型声明文件
 */

// Type declaration for rcc-basemodule to fix missing declarations
declare module 'rcc-basemodule' {
  import { v4 as uuidv4 } from 'uuid';

  // Basic type definitions
  export interface ModuleInfo {
    id: string;
    name: string;
    version: string;
    description: string;
    type: string;
  }

  export interface DebugConfig {
    enabled: boolean;
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    recordStack: boolean;
    maxLogEntries: number;
    consoleOutput: boolean;
    trackDataFlow: boolean;
    enableFileLogging: boolean;
    maxFileSize: number;
    maxLogFiles: number;
    pipelinePosition?: 'start' | 'middle' | 'end';
  }

  export interface BaseModuleRecordingConfig {
    enabled: boolean;
    basePath?: string;
    port?: number;
    level?: string;
  }

  export interface ValidationRule {
    field: string;
    type: 'required' | 'string' | 'number' | 'boolean' | 'object' | 'array' | 'custom';
    message: string;
    validator?: (value: any) => boolean;
  }

  export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    data: any;
  }

  export interface ConnectionInfo {
    id: string;
    type: 'input' | 'output';
    targetModuleId: string;
    metadata?: Record<string, any>;
  }

  export interface DataTransfer {
    id: string;
    sourceConnectionId: string;
    targetConnectionId: string;
    data: any;
    timestamp: number;
    metadata?: Record<string, any>;
  }

  export interface Message {
    id: string;
    type: string;
    source: string;
    target?: string;
    payload: any;
    timestamp: number;
    correlationId?: string;
    metadata?: Record<string, any>;
    ttl?: number;
    priority?: number;
  }

  export interface MessageResponse {
    messageId: string;
    correlationId: string;
    success: boolean;
    data?: any;
    error?: string;
    timestamp: number;
  }

  export interface MessageHandler {
    handleMessage(message: Message): Promise<MessageResponse | void>;
    onModuleRegistered(moduleId: string): void;
    onModuleUnregistered(moduleId: string): void;
  }

  export interface DebugLogEntry {
    timestamp: number;
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: any;
    stack?: string;
    moduleId: string;
    method?: string;
  }

  export interface DebugEvent {
    sessionId: string;
    moduleId: string;
    operationId: string;
    timestamp: number;
    type: 'start' | 'end' | 'error';
    position: 'start' | 'middle' | 'end';
    data: any;
  }

  export abstract class BaseModule implements MessageHandler {
    protected info: ModuleInfo;
    protected debugConfig: DebugConfig;
    protected debugLogs: DebugLogEntry[];

    constructor(info: ModuleInfo);

    // Public methods
    public setDebugConfig(config: Partial<DebugConfig>): void;
    public getDebugConfig(): DebugConfig;
    public getDebugLogs(level?: 'trace' | 'debug' | 'info' | 'warn' | 'error', limit?: number): DebugLogEntry[];
    public clearDebugLogs(): void;
    public configure(config: Record<string, any>): void;
    public getInfo(): ModuleInfo;
    public getConfig(): Record<string, any>;
    public async initialize(): Promise<void>;
    public async destroy(): Promise<void>;

    // Logging methods
    protected trace(message: string, data?: any, method?: string): void;
    protected log(message: string, data?: any, method?: string): void;
    protected logInfo(message: string, data?: any, method?: string): void;
    protected warn(message: string, data?: any, method?: string): void;
    protected error(message: string, data?: any, method?: string): void;
    protected debug(level: 'trace' | 'debug' | 'info' | 'warn' | 'error', message: string, data?: any, method?: string): void;

    // Connection methods
    public addInputConnection(connection: ConnectionInfo): void;
    public addOutputConnection(connection: ConnectionInfo): void;
    public removeInputConnection(connectionId: string): void;
    public removeOutputConnection(connectionId: string): void;
    public getInputConnections(): ConnectionInfo[];
    public getOutputConnections(): ConnectionInfo[];
    protected validateInput(data: any): ValidationResult;

    // Message methods
    protected sendMessage(type: string, payload: any, target?: string, metadata?: Record<string, any>, ttl?: number, priority?: number): void;
    protected async sendRequest(type: string, payload: any, target: string, timeout?: number, metadata?: Record<string, any>, ttl?: number, priority?: number): Promise<MessageResponse>;
    protected sendRequestAsync(type: string, payload: any, target: string, callback: (response: MessageResponse) => void, timeout?: number, metadata?: Record<string, any>, ttl?: number, priority?: number): void;
    protected broadcastMessage(type: string, payload: any, metadata?: Record<string, any>, ttl?: number, priority?: number): void;
    public abstract handleMessage(message: Message): Promise<MessageResponse | void>;

    // Pipeline methods
    public setPipelinePosition(position: 'start' | 'middle' | 'end'): void;
    public setCurrentSession(sessionId: string): void;
    public startPipelineSession(sessionId: string, pipelineConfig: any): void;
    public endPipelineSession(sessionId: string, success?: boolean): void;
    public startIOTracking(operationId: string, input: any, method?: string): void;
    public endIOTracking(operationId: string, output: any, success?: boolean, error?: string): void;

    // Event handlers
    public onModuleRegistered(moduleId: string): void;
    public onModuleUnregistered(moduleId: string): void;
  }
}

// Type declaration for rcc-debugcenter
declare module 'rcc-debugcenter' {
  export interface DebugCenter {
    recordOperation(
      trackingId: string,
      moduleId: string,
      operationId: string,
      inputData?: unknown,
      outputData?: unknown,
      operationType?: string,
      success?: boolean,
      error?: string,
      stage?: string
    ): void;

    recordPipelineStart(
      requestId: string,
      pipelineId: string,
      description: string,
      inputData: unknown,
      metadata?: Record<string, unknown>,
      operation?: Record<string, unknown>
    ): void;

    recordPipelineEnd(
      requestId: string,
      pipelineId: string,
      description: string,
      outputData: unknown,
      success: boolean,
      error?: string,
      metadata?: Record<string, unknown>
    ): void;

    getPipelineEntries(config: { pipelineId: string; limit: number }): any[];
    getIOFiles?(): string[];

    subscribe(event: string, callback: (data: any) => void): void;
    updateConfig(config: any): void;

    destroy?(): Promise<void>;
  }

  export interface PipelinePosition {
    position: 'start' | 'middle' | 'end';
  }

  export interface PipelineOperationType {
    type: string;
  }
}

// Type declaration for rcc-errorhandling
declare module 'rcc-errorhandling' {
  export interface ErrorHandlingCenter {
    handleError(error: {
      error: Error;
      source: string;
      severity: string;
      timestamp: number;
      context?: Record<string, unknown>;
    }): void;

    destroy?(): Promise<void>;
  }
}

// Type declaration for rcc-config-parser
declare module 'rcc-config-parser' {
  export interface ConfigParser {
    parseConfig(configPath: string): Promise<any>;
    validateConfig(config: any): boolean;
  }
}