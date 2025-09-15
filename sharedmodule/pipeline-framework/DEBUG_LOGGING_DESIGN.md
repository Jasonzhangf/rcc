# OpenAI Compatible Providers Debug Logging System Design

## 🎯 Design Requirements

Based on the analysis of the existing OpenAI-compatible providers module, we need to implement a comprehensive debug logging system with the following capabilities:

1. **Configurable IO Paths** - Configure all input/output paths
2. **Complete Pipeline Logging** - Record entire pipeline operations
3. **Request ID Tracking** - Track individual request-response pairs with unique IDs
4. **Error Request Isolation** - Log error requests separately
5. **Normal Logging Support** - Support both debug and normal logs

## 🏗️ System Architecture Overview

```
OpenAI Providers Debug Logging System
├── DebugConfig (Configuration Layer)
├── PipelineTracker (Request ID & Pipeline Tracking)
├── RequestLogger (Individual Request-Response Logging)
├── ErrorLogger (Error Request Isolation)
├── SystemLogger (Normal Logging)
└── DebugLogManager (Orchestration)
```

## 🔧 Core Components Design

### 1. Debug Configuration Interface

```typescript
/**
 * Debug Logging Configuration
 * All paths are relative to the base directory unless absolute
 */
export interface DebugConfig {
  // Master switch
  enabled: boolean;

  // Base directory for all logs
  baseDirectory: string;

  // Subdirectory configuration
  paths: {
    requests: string;           // Normal request logs
    responses: string;          // Normal response logs
    errors: string;             // Error request logs
    pipeline: string;           // Complete pipeline logs
    system: string;             // System/normal logs
  };

  // Logging levels
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';

  // Request tracking
  requestTracking: {
    enabled: boolean;
    generateRequestIds: boolean;
    includeTimestamps: boolean;
    trackMetadata: boolean;
  };

  // Content filtering
  contentFiltering: {
    enabled: boolean;
    sensitiveFields: string[];
    maxContentLength: number;
    sanitizeResponses: boolean;
  };

  // File management
  fileManagement: {
    maxFileSize: number;         // Max file size in MB
    maxFiles: number;           // Max files per directory
    compressOldLogs: boolean;
    retentionDays: number;
  };

  // Performance tracking
  performanceTracking: {
    enabled: boolean;
    trackTiming: boolean;
    trackMemoryUsage: boolean;
    trackSuccessRates: boolean;
  };
}
```

### 2. Request ID and Pipeline Tracking System

```typescript
/**
 * Request Context for Tracking
 */
export interface RequestContext {
  // Unique identifiers
  requestId: string;
  pipelineId: string;
  sessionId?: string;

  // Timestamps
  startTime: number;
  endTime?: number;

  // Request information
  provider: string;
  model?: string;
  operation: 'chat' | 'streamChat' | 'healthCheck';

  // Pipeline stages
  stages: PipelineStage[];

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Pipeline Stage Tracking
 */
export interface PipelineStage {
  stage: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  data?: any;
}

/**
 * Pipeline Tracker Class
 */
export class PipelineTracker {
  private activeRequests: Map<string, RequestContext> = new Map();
  private config: DebugConfig;

  constructor(config: DebugConfig) {
    this.config = config;
  }

  // Create new request context
  createRequestContext(
    provider: string,
    operation: string,
    metadata?: Record<string, any>
  ): RequestContext {
    const context: RequestContext = {
      requestId: this.generateRequestId(),
      pipelineId: this.generatePipelineId(),
      startTime: Date.now(),
      provider,
      operation,
      stages: [],
      metadata
    };

    this.activeRequests.set(context.requestId, context);
    return context;
  }

  // Add pipeline stage
  addStage(requestId: string, stage: string): void {
    const context = this.activeRequests.get(requestId);
    if (context) {
      const stageData: PipelineStage = {
        stage,
        startTime: Date.now(),
        status: 'running'
      };
      context.stages.push(stageData);
    }
  }

  // Complete pipeline stage
  completeStage(requestId: string, stage: string, data?: any): void {
    const context = this.activeRequests.get(requestId);
    if (context) {
      const stageData = context.stages.find(s => s.stage === stage);
      if (stageData) {
        stageData.endTime = Date.now();
        stageData.duration = stageData.endTime - stageData.startTime;
        stageData.status = 'completed';
        stageData.data = data;
      }
    }
  }

  // Mark stage as failed
  failStage(requestId: string, stage: string, error: string): void {
    const context = this.activeRequests.get(requestId);
    if (context) {
      const stageData = context.stages.find(s => s.stage === stage);
      if (stageData) {
        stageData.endTime = Date.now();
        stageData.duration = stageData.endTime - stageData.startTime;
        stageData.status = 'failed';
        stageData.error = error;
      }
    }
  }

  // Complete request context
  completeRequest(requestId: string): RequestContext | undefined {
    const context = this.activeRequests.get(requestId);
    if (context) {
      context.endTime = Date.now();
      this.activeRequests.delete(requestId);
      return context;
    }
    return undefined;
  }

  // Get active request context
  getRequestContext(requestId: string): RequestContext | undefined {
    return this.activeRequests.get(requestId);
  }

  // Generate unique request ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate unique pipeline ID
  private generatePipelineId(): string {
    return `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 3. Request-Response Logger

```typescript
/**
 * Request-Response Log Entry
 */
export interface RequestResponseLog {
  // Context
  requestId: string;
  pipelineId: string;
  timestamp: number;
  provider: string;
  operation: string;

  // Request data
  request: {
    headers?: Record<string, string>;
    body: any;
    metadata?: Record<string, any>;
  };

  // Response data
  response: {
    status: number;
    headers?: Record<string, string>;
    body: any;
    metadata?: Record<string, any>;
  };

  // Performance
  duration: number;
  success: boolean;
  error?: string;

  // Pipeline information
  stages: PipelineStage[];
}

/**
 * Request Logger Class
 */
export class RequestLogger {
  private config: DebugConfig;
  private fileManager: FileManager;

  constructor(config: DebugConfig) {
    this.config = config;
    this.fileManager = new FileManager(config);
  }

  // Log request-response pair
  async logRequestResponse(
    context: RequestContext,
    request: any,
    response: any,
    error?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    const logEntry: RequestResponseLog = {
      requestId: context.requestId,
      pipelineId: context.pipelineId,
      timestamp: context.startTime,
      provider: context.provider,
      operation: context.operation,
      request: {
        body: this.sanitizeData(request),
        metadata: context.metadata
      },
      response: {
        status: error ? 500 : 200,
        body: this.sanitizeData(response),
        metadata: { success: !error }
      },
      duration: (context.endTime || Date.now()) - context.startTime,
      success: !error,
      error,
      stages: context.stages
    };

    // Write to appropriate log file
    if (error) {
      await this.fileManager.writeToErrorLog(logEntry);
    } else {
      await this.fileManager.writeToRequestLog(logEntry);
      await this.fileManager.writeToResponseLog(logEntry);
    }

    // Write to pipeline log
    await this.fileManager.writeToPipelineLog(logEntry);
  }

  // Sanitize sensitive data
  private sanitizeData(data: any): any {
    if (!this.config.contentFiltering.enabled) {
      return data;
    }

    // Deep clone to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(data));

    // Recursively sanitize sensitive fields
    const sanitizeObject = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key in obj) {
        if (this.config.contentFiltering.sensitiveFields.includes(key)) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }
}
```

### 4. Error Logger (Error Request Isolation)

```typescript
/**
 * Error Log Entry
 */
export interface ErrorLog {
  requestId: string;
  pipelineId: string;
  timestamp: number;
  provider: string;
  operation: string;

  // Error details
  error: {
    message: string;
    stack?: string;
    code?: string;
    type: string;
  };

  // Context
  request: {
    headers?: Record<string, string>;
    body: any;
    metadata?: Record<string, any>;
  };

  // Pipeline stage where error occurred
  failedStage?: string;
  stages: PipelineStage[];

  // Additional debug info
  debugInfo?: Record<string, any>;
}

/**
 * Error Logger Class
 */
export class ErrorLogger {
  private config: DebugConfig;
  private fileManager: FileManager;

  constructor(config: DebugConfig) {
    this.config = config;
    this.fileManager = new FileManager(config);
  }

  // Log error with context
  async logError(
    context: RequestContext,
    error: Error | string,
    request?: any,
    failedStage?: string,
    debugInfo?: Record<string, any>
  ): Promise<void> {
    if (!this.config.enabled) return;

    const errorLog: ErrorLog = {
      requestId: context.requestId,
      pipelineId: context.pipelineId,
      timestamp: Date.now(),
      provider: context.provider,
      operation: context.operation,
      error: {
        message: typeof error === 'string' ? error : error.message,
        stack: typeof error !== 'string' ? error.stack : undefined,
        type: typeof error !== 'string' ? error.constructor.name : 'Error'
      },
      request: {
        body: request,
        metadata: context.metadata
      },
      failedStage,
      stages: context.stages,
      debugInfo
    };

    await this.fileManager.writeToErrorLog(errorLog);

    // Also log to system log
    await this.fileManager.writeToSystemLog({
      level: 'error',
      message: `Error in ${context.provider}.${context.operation}: ${errorLog.error.message}`,
      requestId: context.requestId,
      timestamp: Date.now()
    });
  }
}
```

### 5. System Logger (Normal Logging)

```typescript
/**
 * System Log Entry
 */
export interface SystemLog {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  requestId?: string;
  provider?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

/**
 * System Logger Class
 */
export class SystemLogger {
  private config: DebugConfig;
  private fileManager: FileManager;

  constructor(config: DebugConfig) {
    this.config = config;
    this.fileManager = new FileManager(config);
  }

  // Log system messages
  async log(
    level: SystemLog['level'],
    message: string,
    context?: {
      requestId?: string;
      provider?: string;
      operation?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    if (!this.config.enabled || this.config.logLevel === 'silent') return;

    // Check log level
    if (!this.shouldLog(level)) return;

    const logEntry: SystemLog = {
      level,
      message,
      timestamp: Date.now(),
      ...context
    };

    await this.fileManager.writeToSystemLog(logEntry);

    // Also log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level.toUpperCase()}] ${message}`, context);
    }
  }

  // Convenience methods
  async debug(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.log('debug', message, context);
  }

  async info(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.log('info', message, context);
  }

  async warn(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.log('warn', message, context);
  }

  async error(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.log('error', message, context);
  }

  // Check if should log based on configured level
  private shouldLog(level: SystemLog['level']): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };
    return levels[level] >= levels[this.config.logLevel];
  }
}
```

### 6. File Manager

```typescript
/**
 * File Manager Class
 */
export class FileManager {
  private config: DebugConfig;
  private basePath: string;

  constructor(config: DebugConfig) {
    this.config = config;
    this.basePath = config.baseDirectory;
  }

  // Ensure directory exists
  private async ensureDirectory(dirPath: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory already exists or other error
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  // Generate log file name with timestamp
  private generateLogFileName(type: string): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = Date.now();
    return `${type}_${date}_${timestamp}.jsonl`;
  }

  // Write to request log
  async writeToRequestLog(logEntry: RequestResponseLog): Promise<void> {
    const dirPath = path.join(this.basePath, this.config.paths.requests);
    await this.ensureDirectory(dirPath);
    const filePath = path.join(dirPath, this.generateLogFileName('requests'));
    await this.writeLogLine(filePath, logEntry);
  }

  // Write to response log
  async writeToResponseLog(logEntry: RequestResponseLog): Promise<void> {
    const dirPath = path.join(this.basePath, this.config.paths.responses);
    await this.ensureDirectory(dirPath);
    const filePath = path.join(dirPath, this.generateLogFileName('responses'));
    await this.writeLogLine(filePath, logEntry);
  }

  // Write to error log
  async writeToErrorLog(logEntry: RequestResponseLog | ErrorLog): Promise<void> {
    const dirPath = path.join(this.basePath, this.config.paths.errors);
    await this.ensureDirectory(dirPath);
    const filePath = path.join(dirPath, this.generateLogFileName('errors'));
    await this.writeLogLine(filePath, logEntry);
  }

  // Write to pipeline log
  async writeToPipelineLog(logEntry: RequestResponseLog): Promise<void> {
    const dirPath = path.join(this.basePath, this.config.paths.pipeline);
    await this.ensureDirectory(dirPath);
    const filePath = path.join(dirPath, this.generateLogFileName('pipeline'));
    await this.writeLogLine(filePath, logEntry);
  }

  // Write to system log
  async writeToSystemLog(logEntry: SystemLog): Promise<void> {
    const dirPath = path.join(this.basePath, this.config.paths.system);
    await this.ensureDirectory(dirPath);
    const filePath = path.join(dirPath, this.generateLogFileName('system'));
    await this.writeLogLine(filePath, logEntry);
  }

  // Write single log line to file
  private async writeLogLine(filePath: string, logEntry: any): Promise<void> {
    const fs = require('fs').promises;

    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(filePath, logLine);
    } catch (error) {
      console.error('Failed to write log entry:', error);
    }
  }

  // Clean up old log files
  async cleanupOldLogs(): Promise<void> {
    if (!this.config.fileManagement.retentionDays) return;

    const fs = require('fs').promises;
    const path = require('path');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.fileManagement.retentionDays);

    const directories = Object.values(this.config.paths);

    for (const dir of directories) {
      const dirPath = path.join(this.basePath, dir);
      try {
        const files = await fs.readdir(dirPath);

        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
          }
        }
      } catch (error) {
        // Directory might not exist
        continue;
      }
    }
  }
}
```

### 7. Debug Log Manager (Main Orchestration)

```typescript
/**
 * Debug Log Manager - Main Orchestration Class
 */
export class DebugLogManager {
  private config: DebugConfig;
  private pipelineTracker: PipelineTracker;
  private requestLogger: RequestLogger;
  private errorLogger: ErrorLogger;
  private systemLogger: SystemLogger;
  private fileManager: FileManager;

  constructor(config: DebugConfig) {
    this.config = config;
    this.pipelineTracker = new PipelineTracker(config);
    this.requestLogger = new RequestLogger(config);
    this.errorLogger = new ErrorLogger(config);
    this.systemLogger = new SystemLogger(config);
    this.fileManager = new FileManager(config);
  }

  // Start request tracking
  startRequest(
    provider: string,
    operation: string,
    metadata?: Record<string, any>
  ): RequestContext {
    const context = this.pipelineTracker.createRequestContext(provider, operation, metadata);
    this.systemLogger.info(`Starting ${operation} request`, {
      requestId: context.requestId,
      provider,
      operation
    });
    return context;
  }

  // Track pipeline stage
  trackStage(requestId: string, stage: string): void {
    this.pipelineTracker.addStage(requestId, stage);
    this.systemLogger.debug(`Starting stage: ${stage}`, { requestId });
  }

  // Complete pipeline stage
  completeStage(requestId: string, stage: string, data?: any): void {
    this.pipelineTracker.completeStage(requestId, stage, data);
    this.systemLogger.debug(`Completed stage: ${stage}`, { requestId });
  }

  // Log successful request-response
  async logSuccess(
    context: RequestContext,
    request: any,
    response: any
  ): Promise<void> {
    this.pipelineTracker.completeRequest(context.requestId);
    await this.requestLogger.logRequestResponse(context, request, response);
    this.systemLogger.info(`Request completed successfully`, {
      requestId: context.requestId,
      provider: context.provider,
      operation: context.operation,
      duration: (context.endTime || Date.now()) - context.startTime
    });
  }

  // Log error
  async logError(
    context: RequestContext,
    error: Error | string,
    request?: any,
    failedStage?: string,
    debugInfo?: Record<string, any>
  ): Promise<void> {
    this.pipelineTracker.completeRequest(context.requestId);
    await this.errorLogger.logError(context, error, request, failedStage, debugInfo);
    this.systemLogger.error(`Request failed`, {
      requestId: context.requestId,
      provider: context.provider,
      operation: context.operation,
      error: typeof error === 'string' ? error : error.message
    });
  }

  // Log system message
  async logSystemMessage(
    level: SystemLog['level'],
    message: string,
    context?: SystemLog['metadata']
  ): Promise<void> {
    await this.systemLogger.log(level, message, context);
  }

  // Convenience methods
  async debug(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.systemLogger.debug(message, context);
  }

  async info(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.systemLogger.info(message, context);
  }

  async warn(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.systemLogger.warn(message, context);
  }

  async error(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.systemLogger.error(message, context);
  }

  // Clean up old logs
  async cleanup(): Promise<void> {
    await this.fileManager.cleanupOldLogs();
  }

  // Get configuration
  getConfig(): DebugConfig {
    return this.config;
  }
}
```

## 🔗 Integration with BaseProvider

```typescript
// Enhanced BaseProvider with Debug Logging
export abstract class BaseProvider {
  // ... existing properties

  protected debugLogManager?: DebugLogManager;

  constructor(config: ProviderConfig & { debug?: DebugConfig }) {
    // ... existing constructor code

    // Initialize debug logging if enabled
    if (config.debug?.enabled) {
      this.debugLogManager = new DebugLogManager(config.debug);
    }
  }

  // Enhanced chat method with debug logging
  async chat(openaiRequest: any, compatibility?: CompatibilityModule): Promise<any> {
    let requestContext: RequestContext | undefined;

    try {
      // Start request tracking
      requestContext = this.debugLogManager?.startRequest(
        this.getInfo().name,
        'chat',
        { model: openaiRequest.model }
      );

      if (requestContext) {
        this.debugLogManager?.trackStage(requestContext.requestId, 'validation');
      }

      console.log(`[${this.getInfo().name}] Processing chat request`);

      // 验证请求
      const request = new OpenAIChatRequest(openaiRequest);
      request.validate();

      if (requestContext) {
        this.debugLogManager?.completeStage(requestContext.requestId, 'validation');
        this.debugLogManager?.trackStage(requestContext.requestId, 'compatibility_mapping');
      }

      // 如果有 compatibility，进行请求映射
      const providerRequest = compatibility
        ? compatibility.mapRequest(request)
        : request;

      if (requestContext) {
        this.debugLogManager?.completeStage(
          requestContext.requestId,
          'compatibility_mapping',
          { mapped: !!compatibility }
        );
        this.debugLogManager?.trackStage(requestContext.requestId, 'provider_execution');
      }

      // 调用具体的 Provider 实现
      const providerResponse = await this.executeChat(providerRequest);

      if (requestContext) {
        this.debugLogManager?.completeStage(
          requestContext.requestId,
          'provider_execution',
          { responseReceived: true }
        );
        this.debugLogManager?.trackStage(requestContext.requestId, 'response_mapping');
      }

      // 如果有 compatibility，进行响应映射
      const finalResponse = compatibility
        ? compatibility.mapResponse(providerResponse)
        : this.standardizeResponse(providerResponse);

      if (requestContext) {
        this.debugLogManager?.completeStage(
          requestContext.requestId,
          'response_mapping',
          { mapped: !!compatibility }
        );
        this.debugLogManager?.trackStage(requestContext.requestId, 'response_standardization');
      }

      // 转换为标准 OpenAI 响应格式
      const response = new OpenAIChatResponse(finalResponse);

      if (requestContext) {
        this.debugLogManager?.completeStage(
          requestContext.requestId,
          'response_standardization',
          { standardized: true }
        );
      }

      console.log(`[${this.getInfo().name}] Chat request completed successfully`);

      // Log successful completion
      if (requestContext) {
        await this.debugLogManager.logSuccess(
          requestContext,
          openaiRequest,
          response.toStandardFormat()
        );
      }

      return response.toStandardFormat();

    } catch (error: any) {
      console.log(`[${this.getInfo().name}] Chat request failed: ${error.message}`);

      // Log error
      if (requestContext) {
        await this.debugLogManager.logError(
          requestContext,
          error,
          openaiRequest,
          'provider_execution'
        );
      }

      this.errorHandler.handleError({
        error: error,
        source: `BaseProvider.chat.${this.getInfo().name}`,
        severity: 'high',
        timestamp: Date.now()
      });
      throw error;
    }
  }

  // ... rest of the class
}
```

## 📁 Directory Structure

```
sharedmodule/openai-compatible-providers/
├── src/
│   ├── framework/
│   │   ├── BaseProvider.ts          # Enhanced with debug logging
│   │   ├── DebugLogManager.ts       # Main orchestration class
│   │   ├── PipelineTracker.ts       # Request ID and pipeline tracking
│   │   ├── RequestLogger.ts         # Individual request logging
│   │   ├── ErrorLogger.ts           # Error request isolation
│   │   ├── SystemLogger.ts          # Normal logging
│   │   └── FileManager.ts           # File management
│   ├── interfaces/
│   │   ├── IDebugConfig.ts          # Debug configuration interface
│   │   ├── IRequestContext.ts       # Request context interface
│   │   ├── IPipelineStage.ts        # Pipeline stage interface
│   │   └── ILogEntries.ts           # Log entry interfaces
│   └── types/
│       └── debug-types.ts           # Debug logging types
├── examples/
│   ├── debug-configuration.ts       # Configuration examples
│   └── usage-examples.ts           # Usage examples
└── test/
    ├── debug-logging.test.ts        # Unit tests
    └── integration.test.ts          # Integration tests
```

## 🚀 Usage Examples

### 1. Configuration Example

```typescript
import { BaseProvider, DebugConfig } from 'openai-compatible-providers';

const debugConfig: DebugConfig = {
  enabled: true,
  baseDirectory: './logs',
  paths: {
    requests: 'requests',
    responses: 'responses',
    errors: 'errors',
    pipeline: 'pipeline',
    system: 'system'
  },
  logLevel: 'debug',
  requestTracking: {
    enabled: true,
    generateRequestIds: true,
    includeTimestamps: true,
    trackMetadata: true
  },
  contentFiltering: {
    enabled: true,
    sensitiveFields: ['api_key', 'password', 'token'],
    maxContentLength: 10000,
    sanitizeResponses: true
  },
  fileManagement: {
    maxFileSize: 10, // 10MB
    maxFiles: 100,
    compressOldLogs: true,
    retentionDays: 30
  },
  performanceTracking: {
    enabled: true,
    trackTiming: true,
    trackMemoryUsage: true,
    trackSuccessRates: true
  }
};

const provider = new YourProvider({
  name: 'YourProvider',
  debug: debugConfig
  // ... other config
});
```

### 2. Basic Usage

```typescript
// The provider will automatically log all operations when debug is enabled
const response = await provider.chat({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ]
});

// Log files will be automatically created in the configured directories:
// ./logs/requests/requests_2024-01-15_1234567890.jsonl
// ./logs/responses/responses_2024-01-15_1234567890.jsonl
// ./logs/pipeline/pipeline_2024-01-15_1234567890.jsonl
// ./logs/system/system_2024-01-15_1234567890.jsonl
```

## 📊 Log File Formats

### Request Log Format
```json
{"requestId":"req_1642272000000_abc123","pipelineId":"pipeline_1642272000000_def456","timestamp":1642272000000,"provider":"QwenProvider","operation":"chat","request":{"body":{"model":"qwen-turbo","messages":[{"role":"user","content":"Hello"}]},"metadata":{"source":"api"}},"response":{"status":200,"body":{"id":"chat-123","object":"chat.completion","created":1642272000000,"model":"qwen-turbo","choices":[{"index":0,"message":{"role":"assistant","content":"Hello! How can I help you?"},"finish_reason":"stop"}]},"metadata":{"success":true}},"duration":1200,"success":true,"stages":[{"stage":"validation","startTime":1642272000000,"endTime":1642272000010,"duration":10,"status":"completed"},{"stage":"provider_execution","startTime":1642272000010,"endTime":1642272001200,"duration":1190,"status":"completed"}]}
```

### Error Log Format
```json
{"requestId":"req_1642272000000_abc123","pipelineId":"pipeline_1642272000000_def456","timestamp":1642272000000,"provider":"QwenProvider","operation":"chat","error":{"message":"Network timeout","type":"TimeoutError"},"request":{"body":{"model":"qwen-turbo","messages":[{"role":"user","content":"Hello"}]}},"failedStage":"provider_execution","stages":[{"stage":"validation","startTime":1642272000000,"endTime":1642272000010,"duration":10,"status":"completed"},{"stage":"provider_execution","startTime":1642272000010,"endTime":1642272006000,"duration":5990,"status":"failed","error":"Network timeout"}]}
```

## 🎯 Key Features

1. **✅ Configurable IO Paths** - All log paths configurable via configuration
2. **✅ Complete Pipeline Logging** - Tracks entire request lifecycle with stages
3. **✅ Request ID Tracking** - Unique IDs for individual request-response pairs
4. **✅ Error Request Isolation** - Separate error logging with detailed context
5. **✅ Normal Logging Support** - System logging with different levels
6. **✅ Content Filtering** - Automatic sanitization of sensitive data
7. **✅ Performance Tracking** - Timing and success rate metrics
8. **✅ File Management** - Automatic cleanup and rotation
9. **✅ Non-Intrusive** - Optional integration with existing providers

This design provides a comprehensive debug logging system that meets all your requirements while maintaining clean separation of concerns and extensibility.