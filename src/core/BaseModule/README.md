# BaseModule

The BaseModule is the abstract base class for all modules in the system. It provides foundational functionality for module management, connections, validation, and communication.

## API

### Constructor
```typescript
constructor(info: ModuleInfo)
```
Creates a new instance of BaseModule.

### Public Methods

#### configure(config: Record<string, any>): void
Configures the module with initialization data. This method should be called before initialize().
- Throws an error if called after initialization.

#### initialize(): Promise<void>
Initializes the module. This method should be called after configure().
- Logs a warning if called without prior configuration.

#### addInputConnection(connection: ConnectionInfo): void
Adds an input connection to the module.
- Validates that the connection type is 'input'.

#### addOutputConnection(connection: ConnectionInfo): void
Adds an output connection to the module.
- Validates that the connection type is 'output'.

#### removeInputConnection(connectionId: string): void
Removes an input connection from the module.

#### removeOutputConnection(connectionId: string): void
Removes an output connection from the module.

#### getInputConnections(): ConnectionInfo[]
Returns an array of all input connections.

#### getOutputConnections(): ConnectionInfo[]
Returns an array of all output connections.

#### getInfo(): ModuleInfo
Returns the module information.

#### getConfig(): Record<string, any>
Returns the module configuration.

#### getSentData(): any[]
Returns an array of all data that has been sent by this module (for testing purposes).

#### getReceivedData(): any[]
Returns an array of all data that has been received by this module (for testing purposes).

#### handshake(targetModule: BaseModule): Promise<boolean>
Performs a handshake with another module.
- Returns a Promise that resolves to a boolean indicating success.

#### destroy(): Promise<void>
Cleans up resources and connections.

### Protected Methods

#### validateInput(data: any): ValidationResult
Validates input data against the module's validation rules.
- Returns a ValidationResult object with validation status and errors.

#### transferData(data: any, targetConnectionId?: string): Promise<void>
Transfers data to connected modules.
- Records sent data for testing purposes.
- If targetConnectionId is provided, only sends to that specific connection.
- Otherwise, sends to all output connections.

#### receiveData(dataTransfer: DataTransfer): Promise<void>
Receives data from connected modules.
- Records received data for testing purposes.
- Should be overridden by subclasses for specific receive logic.

### Static Methods

#### createInstance<T extends BaseModule>(info: ModuleInfo): T
Static factory method to create an instance of the module.

## Usage Example

```typescript
// Create a custom module that extends BaseModule
class CustomModule extends BaseModule {
  constructor(info: ModuleInfo) {
    super(info);
  }
  
  // Override initialize method
  public async initialize(): Promise<void> {
    await super.initialize();
    console.log(`CustomModule ${this.info.id} initialized`);
  }
  
  // Override receiveData method
  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    await super.receiveData(dataTransfer);
    console.log(`CustomModule ${this.info.id} received data:`, dataTransfer.data);
  }
}

// Create module information
const moduleInfo: ModuleInfo = {
  id: 'custom-1',
  type: 'custom',
  name: 'Custom Module',
  version: '1.0.0'
};

// Create a module instance
const module = CustomModule.createInstance(moduleInfo);

// Configure the module (optional)
module.configure({
  maxRetries: 3,
  timeout: 5000
});

// Initialize the module
await module.initialize();

// Create connections
const inputConnection: ConnectionInfo = {
  id: 'input-1',
  sourceModuleId: 'sender-1',
  targetModuleId: 'custom-1',
  type: 'input',
  status: 'pending'
};

const outputConnection: ConnectionInfo = {
  id: 'output-1',
  sourceModuleId: 'custom-1',
  targetModuleId: 'receiver-1',
  type: 'output',
  status: 'pending'
};

// Add connections
module.addInputConnection(inputConnection);
module.addOutputConnection(outputConnection);

// Perform handshake with another module
// const handshakeResult = await module.handshake(otherModule);

// Clean up
await module.destroy();
```