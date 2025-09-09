# DebugModule

The DebugModule is a specialized module for logging and debugging module communications. It extends the BaseModule class and provides functionality for simultaneous console output and file logging.

## Features

1. **Dual Logging**: Supports both console output and file logging
2. **Connection Routing**: Automatically routes module connections to the DebugModule for recording
3. **Data Flow Recording**: Records data flow between connected modules
4. **Detailed Logging**: Includes module information and call stack in log entries
5. **Configurable**: Supports various configuration options for logging behavior
6. **Flexible Directory Structure**: Supports both custom folder names and port-based directory structure
7. **Categorized Logging**: Separates logs by type (logs, errors, dataflow)
8. **Timestamp-based Naming**: Uses timestamps for unique log file names
9. **Log Rotation**: Automatically cleans up old log files
10. **Dynamic Port Updates**: Supports updating port configuration after initialization

## API

### Constructor
```typescript
constructor(info: ModuleInfo)
```
Creates a new instance of DebugModule.

### Public Methods

#### configure(config: Partial<DebugConfig>): void
Configures the debug module with initialization data. This method should be called before initialize().
- Throws an error if called after initialization.

#### updatePort(port: number): void
Updates the port configuration and recreates directory structure if needed.

#### initialize(): Promise<void>
Initializes the module. This method should be called after configure().
- Creates directory structure if file logging is enabled.

#### log(message: string, level: LogLevel = LogLevel.INFO, moduleInfo?: ModuleInfo): void
Logs a message with module information and call stack.
- Supports different log levels (DEBUG, INFO, WARN, ERROR)
- Outputs to console if enabled
- Writes to file if enabled
- Includes call stack information if enabled

#### recordDataFlow(sourceModuleId: string, targetModuleId: string, data: any): void
Records data flow between modules.
- Only records data flow for connected modules
- Includes call stack information if enabled

#### addModuleConnection(moduleId: string, connectionType: 'input' | 'output'): void
Adds a module connection for data flow recording.

#### removeModuleConnection(moduleId: string): void
Removes a module connection.

#### getLogs(): DebugLogEntry[]
Returns an array of all log entries.

#### clearLogs(): void
Clears all log entries.

#### getDebugConfig(): DebugConfig
Returns the debug configuration.

#### receiveData(dataTransfer: DataTransfer): Promise<void>
Receives data from connected modules.

#### destroy(): Promise<void>
Cleans up resources and connections.

### Static Methods

#### createInstance(info: ModuleInfo): DebugModule
Static factory method to create an instance of DebugModule.

## Configuration

The DebugModule can be configured with the following options:

```typescript
interface DebugConfig {
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
```

## Directory Structure

When file logging is enabled, the DebugModule creates the following directory structure:

With custom folder name:
```
{rootDir}/
└── {customFolderName}/
    ├── logs/
    ├── errors/
    └── dataflow/
```

With port-based naming (when customFolderName is not set):
```
{rootDir}/
└── port-{port}/
    ├── logs/
    ├── errors/
    └── dataflow/
```

- **logs**: Contains general log files (debug, info, warn)
- **errors**: Contains error log files
- **dataflow**: Contains data flow log files

## Log File Naming

Log files are named using the following pattern:

- General logs: `{level}-{YYYY-MM-DD}-{timestamp}.log`
- Data flow logs: `dataflow-{YYYY-MM-DD}-{timestamp}.log`

Where:
- `{level}` is the log level (debug, info, warn, error)
- `{YYYY-MM-DD}` is the current date
- `{timestamp}` is the Unix timestamp in milliseconds

## Log Entries

Log entries contain the following information:

```typescript
interface DebugLogEntry {
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
```

## Usage Example

### With Custom Folder Name
```typescript
// Create module information
const debugInfo: ModuleInfo = {
  id: 'debug-1',
  type: 'debug',
  name: 'Debug Module',
  version: '1.0.0',
  description: 'A debug module for logging and debugging'
};

// Create a debug module instance
const debugModule = DebugModule.createInstance(debugInfo);

// Configure the module with custom folder name
debugModule.configure({
  consoleOutput: true,
  rootDir: './logs',
  customFolderName: 'my-app-debug',
  fileLogging: true,
  logLevel: LogLevel.DEBUG,
  recordDataFlow: true,
  recordCallStack: true,
  maxLogFiles: 10
});

// Initialize the module
await debugModule.initialize();

// Log a message
debugModule.log('This is a debug message', LogLevel.DEBUG);

// Record data flow
debugModule.recordDataFlow('sender-1', 'receiver-1', { message: 'Hello' });

// Add module connection
debugModule.addModuleConnection('sender-1', 'output');

// Get logs
const logs = debugModule.getLogs();
console.log('Logs:', logs);

// Clean up
await debugModule.destroy();
```

### With Port-based Directory Structure
```typescript
// Configure the module with port-based directory structure
debugModule.configure({
  consoleOutput: true,
  rootDir: './logs',
  port: 3000,
  fileLogging: true,
  logLevel: LogLevel.DEBUG,
  recordDataFlow: true,
  recordCallStack: true,
  maxLogFiles: 10
});

// Initialize the module
await debugModule.initialize();

// Later, update the port if needed
debugModule.updatePort(3001);
```

## Integration with BaseModule

To integrate DebugModule with other modules:

1. Create a DebugModule instance
2. Set the debug module for other modules using `setDebugModule()`
3. The modules will automatically log information to the DebugModule

```typescript
// Create modules
const debugModule = DebugModule.createInstance(debugInfo);
const sourceModule = new SourceModule(sourceInfo);
const targetModule = new TargetModule(targetInfo);

// Set debug module for other modules
senderModule.setDebugModule(debugModule);
receiverModule.setDebugModule(debugModule);

// Initialize modules
await debugModule.initialize();
await senderModule.initialize();
await receiverModule.initialize();
```

When modules are connected and exchange data, the DebugModule will automatically record:
- Connection information
- Handshake operations
- Data flow between modules
- Module initialization and destruction

The logs will be organized in the directory structure based on the configured custom folder name or port, with separate folders for general logs, errors, and data flow records.