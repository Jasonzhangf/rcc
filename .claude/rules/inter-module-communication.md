# Inter-Module Communication Standards

This document defines the standards and protocols for inter-module communication in the RCC modular system.

## Connection Management Protocols

### Rule 1.1: Mandatory Connection Registration
- **Requirement**: All module connections MUST be registered with proper metadata
- **Rationale**: Ensures proper tracking and management of module dependencies
- **Implementation**: Use `ConnectionInfo` interface with complete metadata

```typescript
// ✅ Correct Implementation
export interface ConnectionInfo {
  id: string;
  sourceModuleId: string;
  targetModuleId: string;
  type: 'input' | 'output';
  status: 'pending' | 'connected' | 'disconnected' | 'error';
  metadata?: Record<string, any>;
}

class ModuleConnectionManager {
  private connections: Map<string, ConnectionInfo> = new Map();
  
  public async registerConnection(connection: ConnectionInfo): Promise<void> {
    // Validate connection data
    if (!this.validateConnection(connection)) {
      throw new Error(`Invalid connection: ${connection.id}`);
    }
    
    // Check for duplicate connections
    if (this.connections.has(connection.id)) {
      throw new Error(`Connection ${connection.id} already exists`);
    }
    
    connection.status = 'pending';
    this.connections.set(connection.id, connection);
    
    // Attempt to establish connection
    await this.establishConnection(connection);
  }
  
  private validateConnection(connection: ConnectionInfo): boolean {
    return !!(
      connection.id &&
      connection.sourceModuleId &&
      connection.targetModuleId &&
      (connection.type === 'input' || connection.type === 'output')
    );
  }
  
  private async establishConnection(connection: ConnectionInfo): Promise<void> {
    // Connection establishment logic
    connection.status = 'connected';
  }
}

// ❌ Violation
class UnsafeConnectionManager {
  public addConnection(id: string, source: string, target: string): void {
    // No validation, no status tracking
    // No metadata support
    // No connection lifecycle management
  }
}
```

### Rule 1.2: Connection Lifecycle States
- **Requirement**: All connections MUST follow defined lifecycle states
- **Rationale**: Ensures proper connection management and error handling
- **Implementation**: Implement state transitions with validation

```typescript
// ✅ Correct Implementation
type ConnectionState = 'pending' | 'connected' | 'disconnected' | 'error';

class ConnectionLifecycleManager {
  private transitions: Map<ConnectionState, ConnectionState[]> = new Map([
    ['pending', ['connected', 'disconnected', 'error']],
    ['connected', ['disconnected', 'error']],
    ['disconnected', ['connected', 'error']],
    ['error', ['disconnected']]
  ]);
  
  public transitionState(
    connection: ConnectionInfo, 
    newState: ConnectionState
  ): boolean {
    const currentState = connection.status as ConnectionState;
    const allowedTransitions = this.transitions.get(currentState) || [];
    
    if (!allowedTransitions.includes(newState)) {
      throw new Error(
        `Invalid state transition from ${currentState} to ${newState}`
      );
    }
    
    connection.status = newState;
    this.logStateTransition(connection, currentState, newState);
    
    return true;
  }
  
  private logStateTransition(
    connection: ConnectionInfo,
    oldState: ConnectionState,
    newState: ConnectionState
  ): void {
    console.log(
      `[Connection] ${connection.id}: ${oldState} -> ${newState}`
    );
  }
}

// Usage with BaseModule
export class ConnectionAwareModule extends BaseModule {
  private lifecycleManager = new ConnectionLifecycleManager();
  
  public async addInputConnection(connection: ConnectionInfo): Promise<void> {
    super.addInputConnection(connection);
    
    try {
      await this.establishConnection(connection);
      this.lifecycleManager.transitionState(connection, 'connected');
    } catch (error) {
      this.lifecycleManager.transitionState(connection, 'error');
      throw error;
    }
  }
  
  private async establishConnection(connection: ConnectionInfo): Promise<void> {
    const targetModule = ModuleRegistry.getInstance().getModule(connection.targetModuleId);
    if (!targetModule) {
      throw new Error(`Target module ${connection.targetModuleId} not found`);
    }
    
    // Establish connection with handshake
    const handshakeResult = await this.handshake(targetModule);
    if (!handshakeResult) {
      throw new Error(`Handshake failed with module ${connection.targetModuleId}`);
    }
  }
}

// ❌ Violation
export class UnsafeConnectionModule extends BaseModule {
  public addInputConnection(connection: ConnectionInfo): void {
    // No state management
    // No error handling
    // No handshake validation
    this.inputConnections.set(connection.id, connection);
    connection.status = 'connected'; // Direct assignment
  }
}
```

### Rule 1.3: Connection Validation and Verification
- **Requirement**: All connections MUST be validated before establishment
- **Rationale**: Prevents invalid or potentially harmful connections
- **Implementation**: Implement comprehensive connection validation

```typescript
// ✅ Correct Implementation
interface ConnectionValidator {
  validate(connection: ConnectionInfo): ValidationResult;
  verifyCompatibility(sourceModule: BaseModule, targetModule: BaseModule): Promise<boolean>;
}

class StandardConnectionValidator implements ConnectionValidator {
  private rules: ConnectionValidationRule[] = [
    {
      name: 'module_exists',
      validate: (connection) => ({
        isValid: !!connection.sourceModuleId && !!connection.targetModuleId,
        error: 'Source and target module IDs are required'
      })
    },
    {
      name: 'compatible_types',
      validate: (connection) => {
        // Validate that connection types are compatible
        return {
          isValid: connection.type === 'input' || connection.type === 'output',
          error: 'Connection type must be "input" or "output"'
        };
      }
    }
  ];
  
  public validate(connection: ConnectionInfo): ValidationResult {
    const errors: string[] = [];
    
    for (const rule of this.rules) {
      const result = rule.validate(connection);
      if (!result.isValid) {
        errors.push(result.error);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  public async verifyCompatibility(
    sourceModule: BaseModule, 
    targetModule: BaseModule
  ): Promise<boolean> {
    const sourceInfo = sourceModule.getInfo();
    const targetInfo = targetModule.getInfo();
    
    // Check if modules are compatible for connection
    const handshakeResult = await this.performCompatibilityHandshake(sourceModule, targetModule);
    
    return handshakeResult;
  }
  
  private async performCompatibilityHandshake(
    source: BaseModule, 
    target: BaseModule
  ): Promise<boolean> {
    try {
      // Attempt handshake to verify compatibility
      const result1 = await source.handshake(target);
      const result2 = await target.handshake(source);
      
      return result1 && result2;
    } catch (error) {
      return false;
    }
  }
}

interface ConnectionValidationRule {
  name: string;
  validate: (connection: ConnectionInfo) => { isValid: boolean; error: string };
}

// ❌ Violation
class NoValidationConnection {
  public addConnection(connection: ConnectionInfo): void {
    // No validation performed
    // No compatibility verification
    // Direct addition without checks
  }
}
```

## Data Transfer and Validation

### Rule 2.1: Structured Data Transfer
- **Requirement**: All data transfers MUST use the `DataTransfer` interface
- **Rationale**: Ensures consistent data packaging and metadata handling
- **Implementation**: Use structured data transfer objects with complete metadata

```typescript
// ✅ Correct Implementation
export interface DataTransfer {
  id: string;
  sourceConnectionId: string;
  targetConnectionId: string;
  data: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

class DataTransferManager {
  private transferCounter = 0;
  
  public createDataTransfer(
    sourceConnectionId: string,
    targetConnectionId: string,
    data: any,
    metadata?: Record<string, any>
  ): DataTransfer {
    this.transferCounter++;
    
    const transfer: DataTransfer = {
      id: `transfer-${this.transferCounter}-${Date.now()}`,
      sourceConnectionId,
      targetConnectionId,
      data,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        sequence: this.transferCounter,
        generatedAt: new Date().toISOString()
      }
    };
    
    // Validate transfer structure
    if (!this.validateDataTransfer(transfer)) {
      throw new Error('Invalid data transfer structure');
    }
    
    return transfer;
  }
  
  public async sendTransfer(transfer: DataTransfer): Promise<TransferResult> {
    try {
      // Send data transfer to target
      const targetModule = this.getModuleByConnection(transfer.targetConnectionId);
      if (!targetModule) {
        throw new Error(`Target module not found for connection: ${transfer.targetConnectionId}`);
      }
      
      // Log transfer for debugging
      this.logTransfer(transfer);
      
      // Send data to target module
      await targetModule.receiveData(transfer);
      
      return {
        success: true,
        transferId: transfer.id,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        transferId: transfer.id,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
  
  private validateDataTransfer(transfer: DataTransfer): boolean {
    return !!(
      transfer.id &&
      transfer.sourceConnectionId &&
      transfer.targetConnectionId &&
      transfer.data !== undefined &&
      transfer.timestamp > 0
    );
  }
  
  private logTransfer(transfer: DataTransfer): void {
    console.log(`[DataTransfer] ${transfer.id}: ${transfer.sourceConnectionId} -> ${transfer.targetConnectionId}`);
  }
  
  private getModuleByConnection(connectionId: string): BaseModule | undefined {
    // Find module by connection ID
    const registry = ModuleRegistry.getInstance();
    const allModules = registry.getAllModules();
    
    for (const module of allModules) {
      const connections = [...module.getInputConnections(), ...module.getOutputConnections()];
      if (connections.some(conn => conn.id === connectionId)) {
        return module;
      }
    }
    
    return undefined;
  }
}

interface TransferResult {
  success: boolean;
  transferId: string;
  timestamp: number;
  error?: string;
}

// ❌ Violation
class UnsafeDataTransfer {
  public sendData(fromConnection: string, toConnection: string, data: any): void {
    // No structured transfer interface
    // No validation
    // No metadata
    // No error handling
    // Direct method call without transfer tracking
  }
}
```

### Rule 2.2: Data Transfer Validation
- **Requirement**: All data transfers MUST validate data integrity and format
- **Rationale**: Ensures data consistency and prevents corruption
- **Implementation**: Add validation layers to data transfer process

```typescript
// ✅ Correct Implementation
interface DataValidator {
  validate(data: any, dataType?: string): ValidationResult;
  sanitize(data: any): any;
}

class ComprehensiveDataValidator implements DataValidator {
  private validationSchemas: Map<string, ValidationSchema> = new Map();
  
  public registerSchema(dataType: string, schema: ValidationSchema): void {
    this.validationSchemas.set(dataType, schema);
  }
  
  public validate(data: any, dataType?: string): ValidationResult {
    if (dataType) {
      const schema = this.validationSchemas.get(dataType);
      if (schema) {
        return this.validateAgainstSchema(data, schema);
      }
    }
    
    // Default validation
    return this.validateBasicStructure(data);
  }
  
  public sanitize(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitize(value);
      }
      return sanitized;
    }
    
    return data;
  }
  
  private validateAgainstSchema(data: any, schema: ValidationSchema): ValidationResult {
    const errors: string[] = [];
    
    // Validate required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }
    
    // Validate field types
    if (schema.fields) {
      for (const [field, type] of Object.entries(schema.fields)) {
        if (field in data) {
          this.validateFieldType(data[field], type, field, errors);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: this.sanitize(data)
    };
  }
  
  private validateFieldType(value: any, expectedType: string, fieldName: string, errors: string[]): void {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    if (actualType !== expectedType) {
      errors.push(
        `Field '${fieldName}' expected type '${expectedType}', got '${actualType}'`
      );
    }
  }
  
  private validateBasicStructure(data: any): ValidationResult {
    const errors: string[] = [];
    
    if (data === undefined || data === null) {
      errors.push('Data cannot be null or undefined');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: this.sanitize(data)
    };
  }
  
  private sanitizeString(value: string): string {
    return value
      .replace(/\0/g, '') // Remove null bytes
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .trim(); // Remove extra whitespace
  }
}

interface ValidationSchema {
  required?: string[];
  fields: Record<string, string>;
}

// Usage in data transfer
class ValidatingDataTransferManager extends DataTransferManager {
  private validator: DataValidator = new ComprehensiveDataValidator();
  
  public async sendTransfer(transfer: DataTransfer): Promise<TransferResult> {
    // Validate data before transfer
    const validation = this.validator.validate(
      transfer.data, 
      transfer.metadata?.dataType
    );
    
    if (!validation.isValid) {
      return {
        success: false,
        transferId: transfer.id,
        error: `Data validation failed: ${validation.errors.join(', ')}`,
        timestamp: Date.now()
      };
    }
    
    // Sanitize data
    transfer.data = validation.data;
    
    return super.sendTransfer(transfer);
  }
}

// ❌ Violation
class NoValidationTransfer {
  public transferData(connectionId: string, data: any): void {
    // No data validation
    // No sanitization
    // No schema checks
    // Direct data transfer
  }
}
```

### Rule 2.3: Error Handling and Recovery
- **Requirement**: All data transfers MUST have comprehensive error handling
- **Rationale**: Ensures system stability and graceful failure handling
- **Implementation**: Implement retry logic and error recovery mechanisms

```typescript
// ✅ Correct Implementation
interface TransferRetryPolicy {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  maxBackoffTime: number;
}

class ResilientDataTransferManager extends DataTransferManager {
  private retryPolicy: TransferRetryPolicy = {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    maxBackoffTime: 30000
  };
  
  public async sendTransferWithRetry(transfer: DataTransfer): Promise<TransferResult> {
    let attempt = 0;
    let lastError: string | undefined;
    
    while (attempt < this.retryPolicy.maxRetries) {
      attempt++;
      
      try {
        const result = await this.sendTransfer(transfer);
        
        if (result.success) {
          return result;
        }
        
        lastError = result.error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(result.error)) {
          return result;
        }
        
      } catch (error) {
        lastError = error.message;
        
        if (this.isNonRetryableError(error.message)) {
          return {
            success: false,
            transferId: transfer.id,
            error: error.message,
            timestamp: Date.now()
          };
        }
      }
      
      if (attempt < this.retryPolicy.maxRetries) {
        const delay = this.calculateRetryDelay(attempt);
        await this.delay(delay);
        
        console.log(
          `[Transfer] Retrying transfer ${transfer.id}, attempt ${attempt + 1}/${this.retryPolicy.maxRetries}`
        );
      }
    }
    
    return {
      success: false,
      transferId: transfer.id,
      error: `Transfer failed after ${attempt} attempts: ${lastError}`,
      timestamp: Date.now()
    };
  }
  
  private calculateRetryDelay(attempt: number): number {
    if (!this.retryPolicy.exponentialBackoff) {
      return this.retryPolicy.retryDelay;
    }
    
    const delay = this.retryPolicy.retryDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, this.retryPolicy.maxBackoffTime);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private isNonRetryableError(error: string): boolean {
    const nonRetryablePatterns = [
      'validation failed',
      'permission denied',
      'invalid connection',
      'target module not found'
    ];
    
    return nonRetryablePatterns.some(pattern => 
      error.toLowerCase().includes(pattern)
    );
  }
}

// ❌ Violation
class NoErrorHandlingTransfer {
  public sendTransfer(transfer: DataTransfer): Promise<void> {
    // No try-catch blocks
    // No retry logic
    // Direct call without error handling
    return Promise.resolve();
  }
}
```

## Handshake Mechanisms

### Rule 3.1: Mandatory Handshake Protocol
- **Requirement**: All module connections MUST implement handshake protocol
- **Rationale**: Ensures compatibility and establishes trust between modules
- **Implementation**: Implement bidirectional handshake with verification

```typescript
// ✅ Correct Implementation
interface HandshakeChallenge {
  challengeId: string;
  timestamp: number;
  capabilities: string[];
  protocolVersion: string;
  nonce: string;
}

interface HandshakeResponse {
  challengeId: string;
  response: string;
  capabilities: string[];
  protocolVersion: string;
  signature?: string;
}

class HandshakeManager {
  private supportedProtocols = ['1.0.0', '1.1.0'];
  private currentProtocol = '1.1.0';
  
  public async initiateHandshake(
    sourceModule: BaseModule, 
    targetModule: BaseModule
  ): Promise<boolean> {
    try {
      // Create challenge
      const challenge = this.createHandshakeChallenge();
      
      // Send challenge to target module
      const response = await targetModule['respondToHandshakeChallenge'](challenge);
      
      // Verify response
      if (!this.validateHandshakeResponse(challenge, response)) {
        throw new Error('Handshake response validation failed');
      }
      
      // Check protocol compatibility
      if (!this.supportedProtocols.includes(response.protocolVersion)) {
        throw new Error(`Unsupported protocol version: ${response.protocolVersion}`);
      }
      
      // Check capability compatibility
      if (!this.validateCapabilities(response.capabilities, sourceModule)) {
        throw new Error('Capability compatibility check failed');
      }
      
      // Complete handshake
      await this.completeHandshake(sourceModule, targetModule);
      
      return true;
    } catch (error) {
      console.error(`Handshake failed: ${error.message}`);
      return false;
    }
  }
  
  private createHandshakeChallenge(): HandshakeChallenge {
    return {
      challengeId: this.generateUniqueId(),
      timestamp: Date.now(),
      capabilities: this.getModuleCapabilities(),
      protocolVersion: this.currentProtocol,
      nonce: this.generateNonce()
    };
  }
  
  private validateHandshakeResponse(
    challenge: HandshakeChallenge, 
    response: HandshakeResponse
  ): boolean {
    // Verify challenge ID matches
    if (challenge.challengeId !== response.challengeId) {
      return false;
    }
    
    // Verify timestamp is recent (within 5 seconds)
    const now = Date.now();
    if (Math.abs(now - challenge.timestamp) > 5000) {
      return false;
    }
    
    // Verify response is properly formed
    if (!response.response || !response.capabilities || !response.protocolVersion) {
      return false;
    }
    
    return true;
  }
  
  private validateCapabilities(
    remoteCapabilities: string[], 
    module: BaseModule
  ): boolean {
    const localCapabilities = this.getModuleCapabilities();
    
    // Check for required capability overlap
    const requiredCapabilities = ['data-transfer', 'connection-management'];
    
    return requiredCapabilities.every(cap => 
      localCapabilities.includes(cap) && remoteCapabilities.includes(cap)
    );
  }
  
  private async completeHandshake(
    sourceModule: BaseModule, 
    targetModule: BaseModule
  ): Promise<void> {
    // Store handshake completion
    const completionTime = Date.now();
    
    // Log successful handshake
    console.log(
      `[Handshake] Successful between ${sourceModule.getInfo().id} and ${targetModule.getInfo().id}`
    );
    
    // Update connection status
    this.updateConnectionStatus(sourceModule, targetModule, 'connected');
  }
  
  private generateUniqueId(): string {
    return `handshake-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateNonce(): string {
    return Math.random().toString(36).substr(2, 16);
  }
  
  private getModuleCapabilities(): string[] {
    return ['data-transfer', 'connection-management', 'handshake-protocol'];
  }
  
  private updateConnectionStatus(
    sourceModule: BaseModule, 
    targetModule: BaseModule, 
    status: string
  ): void {
    // Update connection status in both modules
    console.log(`[Connection] Status updated to ${status}`);
  }
}

// Enhanced BaseModule with handshake support
export class HandshakeAwareModule extends BaseModule {
  private handshakeManager = new HandshakeManager();
  
  public async handshake(targetModule: BaseModule): Promise<boolean> {
    const baseResult = await super.handshake(targetModule);
    
    if (!baseResult) {
      return false;
    }
    
    // Perform enhanced handshake
    return this.handshakeManager.initiateHandshake(this, targetModule);
  }
  
  public async respondToHandshakeChallenge(challenge: HandshakeChallenge): Promise<HandshakeResponse> {
    // Validate incoming challenge
    if (!this.handshakeManager.validateHandshakeChallenge(challenge)) {
      throw new Error('Invalid handshake challenge');
    }
    
    // Generate response
    return {
      challengeId: challenge.challengeId,
      response: 'handshake-accepted',
      capabilities: this.getModuleCapabilities(),
      protocolVersion: '1.1.0'
    };
  }
  
  private getModuleCapabilities(): string[] {
    return ['data-transfer', 'connection-management', 'handshake-protocol'];
  }
}

// ❌ Violation
export class NoHandshakeModule extends BaseModule {
  public async handshake(targetModule: BaseModule): Promise<boolean> {
    // No actual handshake protocol
    // Just returns true without verification
    return true;
  }
}
```

### Rule 3.2: Security in Handshake
- **Requirement**: Handshake protocols MUST include security verification
- **Rationale**: Prevents unauthorized module connections
- **Implementation**: Add authentication and security checks

```typescript
// ✅ Correct Implementation
interface SecurityToken {
  moduleId: string;
  timestamp: number;
  signature: string;
  publicKey: string;
}

class SecureHandshakeManager extends HandshakeManager {
  private securityKeys: Map<string, string> = new Map();
  
  public async initiateSecureHandshake(
    sourceModule: BaseModule, 
    targetModule: BaseModule
  ): Promise<boolean> {
    // Verify both modules have security keys
    if (!this.verifyModuleSecurity(sourceModule) || !this.verifyModuleSecurity(targetModule)) {
      throw new Error('Security verification failed');
    }
    
    // Perform basic handshake first
    const basicHandshakeResult = await this.initiateHandshake(sourceModule, targetModule);
    if (!basicHandshakeResult) {
      return false;
    }
    
    // Perform security handshake
    const securityResult = await this.performSecurityHandshake(sourceModule, targetModule);
    
    return securityResult;
  }
  
  private verifyModuleSecurity(module: BaseModule): boolean {
    const moduleId = module.getInfo().id;
    
    // Check if module has registered security key
    if (!this.securityKeys.has(moduleId)) {
      console.error(`Module ${moduleId} has no registered security key`);
      return false;
    }
    
    return true;
  }
  
  private async performSecurityHandshake(
    sourceModule: BaseModule, 
    targetModule: BaseModule
  ): Promise<boolean> {
    try {
      // Exchange security tokens
      const sourceToken = this.createSecurityToken(sourceModule);
      const targetToken = await targetModule['exchangeSecurityToken'](sourceToken);
      
      // Verify target token signature
      if (!this.verifySecurityToken(targetToken)) {
        throw new Error('Target module security token verification failed');
      }
      
      // Complete secure handshake
      await this.completeSecureHandshake(sourceModule, targetModule);
      
      return true;
    } catch (error) {
      console.error(`Security handshake failed: ${error.message}`);
      return false;
    }
  }
  
  private createSecurityToken(module: BaseModule): SecurityToken {
    const moduleId = module.getInfo().id;
    const publicKey = this.securityKeys.get(moduleId)!;
    
    const token: SecurityToken = {
      moduleId,
      timestamp: Date.now(),
      signature: 'sign-data-placeholder', // In production, use actual cryptographic signing
      publicKey
    };
    
    return token;
  }
  
  private verifySecurityToken(token: SecurityToken): boolean {
    // Verify token timestamp is recent
    if (Date.now() - token.timestamp > 30000) { // 30 seconds validity
      return false;
    }
    
    // Verify token has required fields
    if (!token.moduleId || !token.signature || !token.publicKey) {
      return false;
    }
    
    // Verify module is registered
    if (!this.securityKeys.has(token.moduleId)) {
      return false;
    }
    
    // In production, add cryptographic signature verification
    return true;
  }
  
  private async completeSecureHandshake(
    sourceModule: BaseModule, 
    targetModule: BaseModule
  ): Promise<void> {
    console.log(
      `[SecureHandshake] Completed between ${sourceModule.getInfo().id} and ${targetModule.getInfo().id}`
    );
  }
}

// ❌ Violation
class InsecureHandshakeManager extends HandshakeManager {
  public async initiateHandshake(sourceModule: BaseModule, targetModule: BaseModule): Promise<boolean> {
    // No security verification
    // No authentication
    // No token exchange
    return true;
  }
}
```

## Routing and Request Distribution

### Rule 4.1: Registry-Based Routing
- **Requirement**: All inter-module communication MUST route through ModuleRegistry
- **Rationale**: Centralizes routing logic and enables monitoring
- **Implementation**: Use registry for module discovery and communication routing

```typescript
// ✅ Correct Implementation
class CommunicationRouter {
  private registry: ModuleRegistry;
  
  constructor(registry: ModuleRegistry) {
    this.registry = registry;
  }
  
  public async routeMessage(
    sourceModuleId: string,
    targetModuleId: string,
    message: any
  ): Promise<RoutingResult> {
    // Validate source module exists
    const sourceModule = this.registry.getModule(sourceModuleId);
    if (!sourceModule) {
      return {
        success: false,
        error: `Source module ${sourceModuleId} not found`
      };
    }
    
    // Validate target module exists
    const targetModule = this.registry.getModule(targetModuleId);
    if (!targetModule) {
      return {
        success: false,
        error: `Target module ${targetModuleId} not found`
      };
    }
    
    // Check if connection exists between modules
    const connection = this.findConnection(sourceModuleId, targetModuleId);
    if (!connection) {
      return {
        success: false,
        error: `No connection exists between ${sourceModuleId} and ${targetModuleId}`
      };
    }
    
    // Validate connection status
    if (connection.status !== 'connected') {
      return {
        success: false,
        error: `Connection status is ${connection.status}`
      };
    }
    
    // Route message
    try {
      const transfer = this.createDataTransfer(connection, message);
      await targetModule.receiveData(transfer);
      
      return {
        success: true,
        messageId: transfer.id,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
  
  private findConnection(
    sourceModuleId: string, 
    targetModuleId: string
  ): ConnectionInfo | undefined {
    const sourceModule = this.registry.getModule(sourceModuleId)!;
    const connections = sourceModule.getOutputConnections();
    
    return connections.find(conn => 
      conn.sourceModuleId === sourceModuleId && 
      conn.targetModuleId === targetModuleId
    );
  }
  
  private createDataTransfer(connection: ConnectionInfo, message: any): DataTransfer {
    return {
      id: `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceConnectionId: connection.id,
      targetConnectionId: connection.id,
      data: message,
      timestamp: Date.now(),
      metadata: {
        routingSource: connection.sourceModuleId,
        routingTarget: connection.targetModuleId
      }
    };
  }
}

interface RoutingResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: number;
}

// ❌ Violation
class DirectMessageRouter {
  public async sendMessage(fromModule: BaseModule, toModule: BaseModule, message: any): Promise<void> {
    // No registry validation
    // No connection checking
    // Direct method call
    await toModule.receiveData(message);
  }
}
```

These inter-module communication standards ensure that the RCC modular system maintains robust, secure, and efficient communication patterns between modules while providing proper error handling, security, and monitoring capabilities.