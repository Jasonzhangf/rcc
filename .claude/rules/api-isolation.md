# API Isolation and Security Rules

This document defines the security and isolation rules for module APIs in the RCC modular system.

## Proxy-Based Access Control

### Rule 1.1: Mandatory Proxy Usage
- **Requirement**: All external module access MUST go through `ApiIsolation` proxy
- **Rationale**: Prevents unauthorized access to internal module methods and properties
- **Implementation**: Create restricted interfaces using `ApiIsolation.createModuleInterface()`

```typescript
// ✅ Correct Implementation
const registry = ModuleRegistry.getInstance();
const module = await registry.createModule<MyModule>(moduleInfo);

// Create restricted API proxy
const moduleApi = ApiIsolation.createModuleInterface(module, {
  methods: ['processMessage', 'getStatus'], // Only safe methods
  properties: [] // No property access
});

// Use restricted API
await moduleApi.processMessage('Hello World');

// ❌ Violation
const registry = ModuleRegistry.getInstance();
const module = await registry.createModule<MyModule>(moduleInfo);

// Direct access bypasses security controls
await module.internalProcessing('malicious');
await module.anyPrivateMethod();
```

### Rule 1.2: Proxy Interface Definition
- **Requirement**: All proxy interfaces MUST explicitly define exposed methods and properties
- **Rationale**: Ensures only intentional functionality is accessible
- **Implementation**: Use structured interface definition objects

```typescript
// ✅ Correct Implementation
interface ModuleInterface {
  methods: string[];
  properties: string[];
}

const interfaceDefinition: ModuleInterface = {
  methods: ['processData', 'getStatus', 'logEvent'],
  properties: ['name', 'version'] // Only read-safe properties
};

const moduleApi = ApiIsolation.createModuleInterface(module, interfaceDefinition);

// ❌ Violation
// Empty interface definition (no access control)
const moduleApi = ApiIsolation.createModuleInterface(module, {
  methods: [],
  properties: []
});

// Missing definition (defaults to no access)
const moduleApi = ApiIsolation.createModuleInterface(module);
```

### Rule 1.3: Proxy Validation
- **Requirement**: All proxy creation MUST validate exposure safety
- **Rationale**: Prevents accidental exposure of sensitive methods
- **Implementation**: Add validation before proxy creation

```typescript
// ✅ Correct Implementation
public static createModuleInterface<T extends object>(
  module: T,
  interfaceDefinition: {
    methods?: string[];
    properties?: string[];
  }
): T {
  // Validate exposed methods
  if (interfaceDefinition.methods) {
    for (const method of interfaceDefinition.methods) {
      if (method.startsWith('_') || method.startsWith('internal')) {
        throw new Error(`Cannot expose internal method: ${method}`);
      }
    }
  }
  
  // Validate exposed properties
  if (interfaceDefinition.properties) {
    for (const property of interfaceDefinition.properties) {
      if (property.startsWith('_')) {
        throw new Error(`Cannot expose private property: ${property}`);
      }
    }
  }
  
  return this.createApiProxy(
    module,
    interfaceDefinition.methods || [],
    interfaceDefinition.properties || []
  );
}

// ❌ Violation
public static createModuleInterface<T extends object>(
  module: T,
  interfaceDefinition: {
    methods?: string[];
    properties?: string[];
  }
): T {
  // No validation, direct proxy creation
  return this.createApiProxy(
    module,
    interfaceDefinition.methods || [],
    interfaceDefinition.properties || []
  );
}
```

## Method and Property Exposure Whitelisting

### Rule 2.1: Whitelist-Only Policy
- **Requirement**: Only explicitly whitelisted methods and properties can be exposed
- **Rationale**: Prevents accidental exposure of sensitive functionality
- **Implementation**: Use strict white lists for all module interfaces

```typescript
// ✅ Correct Implementation
const safeMethods = [
  'processMessage',
  'getStatus',
  'receiveData',
  'handshake'
];

const safeProperties = [
  'name',
  'version',
  'description'
];

const moduleApi = ApiIsolation.createModuleInterface(module, {
  methods: safeMethods,
  properties: safeProperties
});

// ❌ Violation
// Exposing all methods (dangerous)
const allMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(module));
const moduleApi = ApiIsolation.createModuleInterface(module, {
  methods: allMethods,
  properties: Object.keys(module)
});
```

### Rule 2.2: Method Safety Classification
- **Requirement**: All module methods MUST be classified for exposure safety
- **Rationale**: Ensures only safe methods are accessible through public API
- **Implementation**: Use method naming conventions and decorators

```typescript
// ✅ Correct Implementation
interface SafeMethod {
  name: string;
  description: string;
  requiresAuth?: boolean;
  exposureLevel: 'safe' | 'restricted' | 'internal';
}

const safeMethods: SafeMethod[] = [
  { name: 'processMessage', description: 'Processes incoming messages', exposureLevel: 'safe' },
  { name: 'getStatus', description: 'Gets current module status', exposureLevel: 'safe' },
  { name: 'updateConfig', description: 'Updates module configuration', exposureLevel: 'restricted', requiresAuth: true },
  { name: 'internalProcessing', description: 'Internal processing logic', exposureLevel: 'internal' }
];

const exposedMethods = safeMethods
  .filter(method => method.exposureLevel === 'safe')
  .map(method => method.name);

// ❌ Violation
// No safety classification, exposing all methods
const methods = ['processMessage', 'configUpdate', 'internalProcessing', 'destroy'];
const moduleApi = ApiIsolation.createModuleInterface(module, { methods, properties: [] });
```

### Rule 2.3: Property Access Control
- **Requirement**: Property exposure MUST be strictly controlled and read-only
- **Rationale**: Prevents unauthorized state modification
- **Implementation**: Use getters instead of direct property access

```typescript
// ✅ Correct Implementation
export class MyModule extends BaseModule {
  private _status: string = 'ready';
  private _config: Record<string, any> = {};
  
  // Read-only access to status
  public get status(): string {
    return this._status;
  }
  
  // Config access through controlled method
  public getConfig(): Record<string, any> {
    return { ...this._config }; // Return copy
  }
  
  public updateConfig(newConfig: Record<string, any>): void {
    this._config = { ...newConfig };
  }
}

// Safe property exposure
const moduleApi = ApiIsolation.createModuleInterface(module, {
  methods: ['getConfig', 'updateConfig'],
  properties: [] // Properties use getters for read-only access
});

// ❌ Violation
export class MyModule extends BaseModule {
  public status: string = 'ready';
  public config: Record<string, any> = {};
}

// Direct property access allows modification
const moduleApi = ApiIsolation.createModuleInterface(module, {
  methods: [],
  properties: ['status', 'config'] // Direct access allows modification
});

// External code can modify state
moduleApi.status = 'modified';
moduleApi.config.secretKey = 'stolen';
```

## Internal vs External Method Separation

### Rule 3.1: Clear Method Boundary
- **Requirement**: Internal and external methods MUST be clearly separated
- **Rationale**: Prevents confusion about which methods are safe for external use
- **Implementation**: Use access modifiers and naming conventions

```typescript
// ✅ Correct Implementation
export class MyModule extends BaseModule {
  // Public API methods (safe for external use)
  public async processMessage(message: string): Promise<void> {
    const validation = this._validateInput(message);
    if (!validation.isValid) {
      throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
    }
    await this._internalProcessing(message);
  }
  
  public getStatus(): string {
    return this._status;
  }
  
  // Protected methods (accessible to subclasses)
  protected _validateInput(input: string): ValidationResult {
    // Validation logic
    return { isValid: true, errors: [], data: input };
  }
  
  // Private methods (internal only)
  private async _internalProcessing(message: string): Promise<void> {
    this._status = 'processing';
    // Internal processing logic
    this._status = 'ready';
  }
  
  private _status: string = 'ready';
}

// ❌ Violation
export class MyModule extends BaseModule {
  // Mixed access levels, unclear boundaries
  public async processMessage(message: string): Promise<void> {
    this.internalProcessing(message);
  }
  
  public async internalProcessing(message: string): Promise<void> {
    // Should be private, but public
  }
  
  private state: string = 'ready';
  
  public getState(): string {
    return this.state;
  }
}
```

### Rule 3.2: Internal Method Protection
- **Requirement**: Internal implementation methods MUST be protected from external access
- **Rationale**: Ensures implementation details remain hidden and secure
- **Implementation**: Use private access modifiers and naming conventions

```typescript
// ✅ Correct Implementation
export class MyModule extends BaseModule {
  // Public API
  public async processData(data: any): Promise<ProcessResult> {
    const validatedData = this._validateAndSanitize(data);
    return this._executeProcessing(validatedData);
  }
  
  // Protected utilities
  protected _validateAndSanitize(data: any): any {
    // Validation and sanitization logic
    return data;
  }
  
  // Private implementation
  private async _executeProcessing(data: any): Promise<ProcessResult> {
    // Core processing logic, hidden from external access
    return { success: true, result: data };
  }
}

// Proxy configuration
const moduleApi = ApiIsolation.createModuleInterface(module, {
  methods: ['processData'], // Only public API method exposed
  properties: []
});

// ❌ Violation
export class MyModule extends BaseModule {
  // All methods public, no separation
  public async processData(data: any): Promise<ProcessResult> {
    const result = this.executeProcessing(data);
    return result;
  }
  
  public executeProcessing(data: any): Promise<ProcessResult> {
    // Should be private, but accessible externally
    return { success: true, result: data };
  }
}

// Dangerous proxy exposes internal methods
const moduleApi = ApiIsolation.createModuleInterface(module, {
  methods: ['processData', 'executeProcessing'], // Internal method exposed
  properties: []
});
```

### Rule 3.3: External Interface Contracts
- **Requirement**: External interfaces MUST have clear contracts and documentation
- **Rationale**: Ensures proper usage and prevents misuse
- **Implementation**: Define explicit interfaces for all public methods

```typescript
// ✅ Correct Implementation
interface ProcessMessageContract {
  /**
   * Processes a message through the module
   * @param message - The message to process (max 1000 chars)
   * @returns Promise resolving when processing is complete
   * @throws Error if message is invalid or processing fails
   */
  processMessage(message: string): Promise<void>;
}

interface GetStatusContract {
  /**
   * Gets the current status of the module
   * @returns Current status string
   */
  getStatus(): string;
}

// Module implements contracts
export class MyModule extends BaseModule implements ProcessMessageContract, GetStatusContract {
  public async processMessage(message: string): Promise<void> {
    if (message.length > 1000) {
      throw new Error('Message too long (max 1000 characters)');
    }
    // Processing logic
  }
  
  public getStatus(): string {
    return 'ready';
  }
}

// ❌ Violation
export class MyModule extends BaseModule {
  // No clear contracts or documentation
  public async processMessage(msg: string): Promise<void> {
    // Unclear parameter name, no validation
    if (msg.length > 1000) {
      throw new Error('Too long');
    }
  }
  
  public getStatus(): string {
    // No clear return type contract
    return this.state;
  }
}
```

## Security Boundaries and Access Control

### Rule 4.1: Authentication and Authorization
- **Requirement**: Sensitive operations MUST implement authentication and authorization
- **Rationale**: Prevents unauthorized access to critical functionality
- **Implementation**: Add authentication layers to restricted methods

```typescript
// ✅ Correct Implementation
interface AuthContext {
  token?: string;
  permissions?: string[];
}

class SecureModule extends BaseModule {
  private _requirePermission(permissions: string[], context: AuthContext): boolean {
    if (!context.permissions) {
      return false;
    }
    return permissions.every(perm => context.permissions!.includes(perm));
  }
  
  public async updateConfig(config: any, authContext: AuthContext): Promise<void> {
    if (!this._requirePermission(['config.update'], authContext)) {
      throw new Error('Permission denied: config.update required');
    }
    
    // Update configuration
  }
  
  public async getSensitiveData(authContext: AuthContext): Promise<any> {
    if (!this._requirePermission(['data.read.sensitive'], authContext)) {
      throw new Error('Permission denied: data.read.sensitive required');
    }
    
    // Return sensitive data
  }
}

// Proxy with authentication awareness
const moduleApi = ApiIsolation.createModuleInterface(module, {
  methods: ['updateConfig', 'getSensitiveData'],
  properties: []
});

// ❌ Violation
class InsecureModule extends BaseModule {
  public async updateConfig(config: any): Promise<void> {
    // No authentication, open to anyone
  }
  
  public async getSensitiveData(): Promise<any> {
    // Sensitive data exposed without protection
  }
}
```

### Rule 4.2: Input Sanitization
- **Requirement**: All external inputs MUST be sanitized and validated
- **Rationale**: Prevents injection attacks and ensures data integrity
- **Implementation**: Add input validation layers to all public methods

```typescript
// ✅ Correct Implementation
export class SecureModule extends BaseModule {
  private _sanitizeString(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  
  private _validateMessage(message: string): ValidationResult {
    const errors: string[] = [];
    
    if (typeof message !== 'string') {
      errors.push('Message must be a string');
    }
    
    if (message.length > 1000) {
      errors.push('Message too long (max 1000 characters)');
    }
    
    const dangerousPatterns = [
      /javascript:/i,
      /<script/i,
      /on\w+\s*=/i
    ];
    
    if (dangerousPatterns.some(pattern => pattern.test(message))) {
      errors.push('Message contains dangerous patterns');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: message
    };
  }
  
  public async processMessage(message: string): Promise<void> {
    const validation = this._validateMessage(message);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    const sanitized = this._sanitizeString(validation.data);
    await this._safeProcessing(sanitized);
  }
  
  private async _safeProcessing(sanitized: string): Promise<void> {
    // Safe processing logic
  }
}

// ❌ Violation
export class InsecureModule extends BaseModule {
  public async processMessage(message: string): Promise<void> {
    // Direct processing without sanitization
    console.log(message); // Potential for script injection
    await this.processRawMessage(message);
  }
  
  private async processRawMessage(message: string): Promise<void> {
    // Vulnerable to injection attacks
  }
}
```

### Rule 4.3: Error Information Control
- **Requirement**: External APIs MUST not expose sensitive internal information in errors
- **Rationale**: Prevents information leakage to attackers
- **Implementation**: Use safe error messages for external errors

```typescript
// ✅ Correct Implementation
export class SecureModule extends BaseModule {
  private _databaseConfig: { host: string; password: string; } = {
    host: 'internal-db.company.com',
    password: 'secret_password'
  };
  
  private _internalOperation(): Promise<void> {
    // Simulate internal error
    return Promise.reject(new Error(`Database connection failed to ${this._databaseConfig.host}`));
  }
  
  public async processRequest(request: any): Promise<void> {
    try {
      await this._internalOperation();
    } catch (internalError) {
      // Log detailed error internally
      console.error('Internal error:', internalError.message);
      
      // Return generic error to caller
      throw new Error('Operation failed due to internal error');
    }
  }
}

// ❌ Violation
export class InsecureModule extends BaseModule {
  private _databaseConfig: { host: string; password: string; } = {
    host: 'internal-db.company.com',
    password: 'secret_password'
  };
  
  public async processRequest(request: any): Promise<void> {
    try {
      await this._internalOperation();
    } catch (internalError) {
      // Exposing internal details
      throw new Error(`Database connection failed to ${this._databaseConfig.host}: ${internalError.message}`);
    }
  }
    
  private _internalOperation(): Promise<void> {
    return Promise.reject(new Error(`Database connection failed to ${this._databaseConfig.host}`));
  }
}
```

## Security Monitoring and Auditing

### Rule 5.1: Access Logging
- **Requirement**: All external API access MUST be logged for auditing
- **Rationale**: Enables security monitoring and forensic analysis
- **Implementation**: Add logging layer to proxy creation

```typescript
// ✅ Correct Implementation
export class SecurityAwareApiIsolation extends ApiIsolation {
  public static createSecureModuleInterface<T extends object>(
    module: T,
    interfaceDefinition: {
      methods?: string[];
      properties?: string[];
    },
    logger?: (event: SecurityEvent) => void
  ): T {
    const eventLogger = logger || console.log;
    
    const secureProxy: any = {};
    
    // Wrap methods with logging
    for (const method of interfaceDefinition.methods || []) {
      if (typeof (module as any)[method] === 'function') {
        secureProxy[method] = (...args: any[]) => {
          const event: SecurityEvent = {
            timestamp: Date.now(),
            method,
            moduleId: (module as any).info?.id || 'unknown',
            args: args.length // Don't log sensitive data
          };
          
          eventLogger(event);
          
          try {
            const result = (module as any)[method].apply(module, args);
            
            // Handle async methods
            if (result instanceof Promise) {
              return result.catch(error => {
                eventLogger({ ...event, error: error.message });
                throw error;
              });
            }
            
            return result;
          } catch (error) {
            eventLogger({ ...event, error: error.message });
            throw error;
          }
        };
      }
    }
    
    // Handle properties safely
    for (const property of interfaceDefinition.properties || []) {
      if (property in module) {
        Object.defineProperty(secureProxy, property, {
          get: () => {
            eventLogger({
              timestamp: Date.now(),
              property,
              moduleId: (module as any).info?.id || 'unknown',
              access: 'read'
            });
            return (module as any)[property];
          }
        });
      }
    }
    
    return secureProxy as T;
  }
}

interface SecurityEvent {
  timestamp: number;
  method?: string;
  property?: string;
  moduleId: string;
  args?: number;
  access?: 'read';
  error?: string;
}

// ❌ Violation
export class InsecureApiIsolation extends ApiIsolation {
  public static createModuleInterface<T extends object>(
    module: T,
    interfaceDefinition: {
      methods?: string[];
      properties?: string[];
    }
  ): T {
    // No logging, no security monitoring
    const restricted: any = {};
    
    for (const method of interfaceDefinition.methods || []) {
      if (typeof (module as any)[method] === 'function') {
        restricted[method] = (...args: any[]) => 
          (module as any)[method].apply(module, args);
      }
    }
    
    return restricted as T;
  }
}
```

These API isolation and security rules ensure that the RCC modular system maintains strong security boundaries while providing controlled, safe access to module functionality.