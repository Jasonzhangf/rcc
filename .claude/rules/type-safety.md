# Type Safety and Validation Rules

This document defines the type safety and validation standards for the RCC modular system.

## TypeScript Strict Mode Requirements

### Rule 1.1: Strict TypeScript Configuration
- **Requirement**: All TypeScript code MUST use strict compilation settings
- **Rationale**: Ensures maximum type safety and prevents type-related bugs
- **Implementation**: Configure tsconfig.json with strict settings

```typescript
// ✅ Correct tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": false,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}

// ❌ Violation tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": false, // Must be strict
    "noImplicitAny": false, // Must be true
    "strictNullChecks": false // Must be true
  }
}
```

### Rule 1.2: Type Coverage Requirement
- **Requirement**: All code MUST achieve 100% TypeScript type coverage
- **Rationale**: Eliminates runtime type errors and improves developer experience
- **Implementation**: Use precise types everywhere, avoid `any` and `unknown`

```typescript
// ✅ Correct Implementation
interface UserData {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  preferences: UserPreferences;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
}

class UserService {
  public async createUser(userData: UserData): Promise<User> {
    const validatedData = this.validateUserData(userData);
    return new User(validatedData);
  }
  
  private validateUserData(data: UserData): UserData {
    // Validation logic with type safety
    return data;
  }
}

// ❌ Violation - Type Coverage Issues
class UnsafeUserService {
  public async createUser(userData: any): Promise<any> { // Uses 'any' type
    return userData; // No type safety
  }
  
  public processData(data: unknown): void { // Uses 'unknown' without proper type guard
    console.log(data); // Could be anything, type unsafe
  }
}
```

### Rule 1.3: Generic Type Safety
- **Requirement**: All generic types MUST have proper constraints and documentation
- **Rationale**: Ensures generic types are used safely and appropriately
- **Implementation**: Use type constraints and clear generic type naming

```typescript
// ✅ Correct Generic Implementation
interface Identifiable {
  id: string;
}

interface Pageable {
  page: number;
  limit: number;
}

class Repository<T extends Identifiable> {
  private items: Map<string, T> = new Map();
  
  public async save(item: T): Promise<T> {
    if (!item.id || typeof item.id !== 'string') {
      throw new Error('Item must have a valid string ID');
    }
    
    this.items.set(item.id, item);
    return item;
  }
  
  public async findById(id: string): Promise<T | null> {
    return this.items.get(id) || null;
  }
  
  public async findAll<P extends Pageable>(pagination: P): Promise<T[]> {
    const offset = (pagination.page - 1) * pagination.limit;
    return Array.from(this.items.values()).slice(offset, offset + pagination.limit);
  }
}

interface Searchable {
  search(term: string): boolean;
}

class SearchRepository<T extends Identifiable & Searchable> extends Repository<T> {
  public async search(term: string): Promise<T[]> {
    const allItems = Array.from((this.items as any).values());
    return allItems.filter(item => item.search(term));
  }
}

// ❌ Violation - Unsafe Generic Usage
class UnsafeRepository<T> { // No constraints
  private items: any[] = [];
  
  public save(item: T): void {
    this.items.push(item); // No ID validation
  }
  
  public find(id: any): T | undefined { // Loose typing
    return this.items.find((item: any) => item.id === id); // Unsafe access
  }
}
```

## Input Validation Standards

### Rule 2.1: Comprehensive Input Validation
- **Requirement**: All public API inputs MUST be validated before processing
- **Rationale**: Prevents invalid data from corrupting system state
- **Implementation**: Use structured validation with clear error messages

```typescript
// ✅ Correct Input Validation
interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'custom';
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  validator?: (value: any) => boolean;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  validatedData: any;
}

class InputValidator {
  private rules: ValidationRule[] = [];
  
  public addRule(rule: ValidationRule): this {
    this.rules.push(rule);
    return this;
  }
  
  public validate(data: any): ValidationResult {
    const errors: string[] = [];
    const validatedData: any = {};
    
    // Apply all validation rules
    for (const rule of this.rules) {
      const value = data[rule.field];
      
      // Check required fields
      if (rule.required && (value === undefined || value === null)) {
        errors.push(rule.message);
        continue;
      }
      
      // Skip validation for optional fields that are missing
      if (!rule.required && (value === undefined || value === null)) {
        continue;
      }
      
      // Apply type-specific validation
      const typeError = this.validateType(value, rule);
      if (typeError) {
        errors.push(typeError);
        continue;
      }
      
      // Apply additional constraints
      const constraintError = this.validateConstraints(value, rule);
      if (constraintError) {
        errors.push(constraintError);
        continue;
      }
      
      // If validation passed, include in validated data
      validatedData[rule.field] = value;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      validatedData
    };
  }
  
  private validateType(value: any, rule: ValidationRule): string | null {
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return rule.message;
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return rule.message;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return rule.message;
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return rule.message;
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return rule.message;
        }
        break;
      case 'custom':
        if (rule.validator && !rule.validator(value)) {
          return rule.message;
        }
        break;
    }
    return null;
  }
  
  private validateConstraints(value: any, rule: ValidationRule): string | null {
    // String constraints
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return `${rule.field} must be at least ${rule.minLength} characters`;
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return `${rule.field} must be at most ${rule.maxLength} characters`;
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        return `${rule.field} format is invalid`;
      }
    }
    
    // Number constraints
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return `${rule.field} must be at least ${rule.min}`;
      }
      if (rule.max !== undefined && value > rule.max) {
        return `${rule.field} must be at most ${rule.max}`;
      }
    }
    
    return null;
  }
}

// Usage example
const userValidator = new InputValidator()
  .addRule({
    field: 'username',
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: 'Username must be 3-50 characters and contain only letters, numbers, and underscores'
  })
  .addRule({
    field: 'email',
    type: 'string',
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Invalid email format'
  })
  .addRule({
    field: 'age',
    type: 'number',
    required: false,
    min: 0,
    max: 120,
    message: 'Age must be between 0 and 120'
  });

// ❌ Violation - No Input Validation
class UnsafeModule extends BaseModule {
  public async processUser(userData: any): Promise<void> {
    // No validation, directly using input
    console.log(`Processing user: ${userData.username}`); // Could be undefined
    this.saveToDatabase(userData); // Could contain invalid data
  }
}
```

### Rule 2.2: Type Guard Implementation
- **Requirement**: All type narrowing MUST use proper type guards
- **Rationale**: Ensures type safety during runtime type checking
- **Implementation**: User-defined type guards for custom types

```typescript
// ✅ Correct Type Guard Implementation
interface User {
  id: string;
  username: string;
  email: string;
}

interface Admin extends User {
  permissions: string[];
  accessLevel: number;
}

function isUser(obj: any): obj is User {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.username === 'string' &&
    typeof obj.email === 'string';
}

function isAdmin(obj: any): obj is Admin {
  return isUser(obj) &&
    Array.isArray(obj.permissions) &&
    typeof obj.accessLevel === 'number';
}

function processUser(user: unknown): void {
  if (isUser(user)) {
    console.log(`User: ${user.username}`);
    
    if (isAdmin(user)) {
      console.log(`Admin with permissions: ${user.permissions.join(', ')}`);
      console.log(`Access level: ${user.accessLevel}`);
    }
  } else {
    throw new Error('Invalid user data');
  }
}

class DatabaseService {
  private data: Map<string, User> = new Map();
  
  public saveUser(userData: unknown): void {
    if (!isUser(userData)) {
      throw new Error('Invalid user data provided');
    }
    
    this.data.set(userData.id, userData);
  }
  
  public getUser(id: string): User | null {
    return this.data.get(id) || null;
  }
}

// ❌ Violation - Unsafe Type Assumptions
class UnsafeService {
  public processUser(userData: any): void {
    // Unsafe type assumption
    console.log(userData.username); // Could be undefined
    
    // Unsafe type casting
    const user = userData as User; // No validation
    console.log(user.email); // Could be invalid
  }
}
```

## Interface Definitions and Contracts

### Rule 3.1: Interface-First Development
- **Requirement**: All public APIs MUST be defined using interfaces first
- **Rationale**: Ensures clear contracts and enables better testing and mocking
- **Implementation**: Define interfaces before implementation

```typescript
// ✅ Correct Interface-First Approach
interface DataProcessor {
  process(data: ProcessableData): Promise<ProcessingResult>;
  getStatus(): ProcessorStatus;
  configure(options: ProcessorConfig): Promise<void>;
}

interface ProcessableData {
  id: string;
  content: any;
  metadata: DataMetadata;
  priority: number;
}

interface ProcessingResult {
  success: boolean;
  processedData?: any;
  error?: string;
  timestamp: number;
  processingTime: number;
}

interface ProcessorStatus {
  state: 'idle' | 'processing' | 'error' | 'maintenance';
  queueSize: number;
  lastProcessed?: Date;
  errorCount: number;
}

interface ProcessorConfig {
  maxConcurrentProcesses: number;
  timeoutMs: number;
  retryAttempts: number;
  enableLogging: boolean;
}

// Implementation follows interface
class DataProcessorImpl implements DataProcessor {
  private status: ProcessorStatus = {
    state: 'idle',
    queueSize: 0,
    errorCount: 0
  };
  
  private config: ProcessorConfig = {
    maxConcurrentProcesses: 1,
    timeoutMs: 10000,
    retryAttempts: 3,
    enableLogging: false
  };
  
  public async process(data: ProcessableData): Promise<ProcessingResult> {
    this.status.state = 'processing';
    this.status.queueSize--;
    
    const startTime = Date.now();
    
    try {
      // Process data with timeout
      const result = await this.processWithTimeout(data);
      
      this.status.state = 'idle';
      this.status.lastProcessed = new Date();
      
      return {
        success: true,
        processedData: result,
        timestamp: Date.now(),
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      this.status.state = 'error';
      this.status.errorCount++;
      
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        processingTime: Date.now() - startTime
      };
    }
  }
  
  public getStatus(): ProcessorStatus {
    return { ...this.status }; // Return copy to prevent external modification
  }
  
  public async configure(options: ProcessorConfig): Promise<void> {
    // Validate configuration
    if (!this.validateConfig(options)) {
      throw new Error('Invalid configuration provided');
    }
    
    this.config = { ...options };
  }
  
  private async processWithTimeout(data: ProcessableData): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Processing timeout'));
      }, this.config.timeoutMs);
      
      try {
        const result = this.doProcess(data);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
  
  private doProcess(data: ProcessableData): any {
    // Actual processing logic
    return data;
  }
  
  private validateConfig(config: ProcessorConfig): boolean {
    return !!(
      config.maxConcurrentProcesses > 0 &&
      config.timeoutMs > 0 &&
      config.retryAttempts >= 0
    );
  }
}

// ❌ Violation - No Interface Definition
class DataProcessorWithoutInterface {
  private status: any;
  private config: any;
  
  public async process(data: any): Promise<any> {
    // No interface contracts, unclear input/output types
    return data;
  }
  
  public getStatus(): any {
    return this.status;
  }
}
```

### Rule 3.2: Interface Segregation
- **Requirement**: Interfaces MUST be small and focused on single responsibility
- **Rationale**: Promotes loose coupling and prevents interface pollution
- **Implementation**: Split large interfaces into focused, smaller ones

```typescript
// ✅ Correct Interface Segregation
// Small, focused interfaces
interface Identifiable {
  readonly id: string;
}

interface Nameable {
  readonly name: string;
}

interface Configurable<T> {
  configure(config: T): Promise<void>;
  getConfiguration(): T;
}

interface Processable<T, R> {
  process(input: T): Promise<R>;
}

interface Initializable {
  initialize(): Promise<void>;
  isInitialized(): boolean;
}

interface Destroyable {
  destroy(): Promise<void>;
  isDestroyed(): boolean;
}

interface Loggable {
  enableLogging(): void;
  disableLogging(): void;
  isLoggingEnabled(): boolean;
}

// Compose interfaces for complex objects
interface DataProcessor 
  extends Processable<ProcessData, ProcessResult>,
          Configurable<ProcessorConfig>,
          Initializable,
          Destroyable,
          Loggable {
  
}

interface User 
  extends Identifiable, 
          Nameable {
  
  readonly email: string;
  readonly createdAt: Date;
}

// Implementation uses specific interfaces
class UserProcessor implements 
  Processable<User, ProcessedUser>,
  Configurable<UserProcessorConfig>,
  Initializable,
  Destroyable {
  
  private config: UserProcessorConfig;
  private initialized: boolean = false;
  private destroyed: boolean = false;
  
  constructor(config: UserProcessorConfig) {
    this.config = config;
  }
  
  public async process(user: User): Promise<ProcessedUser> {
    this.ensureInitialized();
    this.ensureNotDestroyed();
    
    return {
      id: user.id,
      name: user.name.toUpperCase(),
      email: user.email.toLowerCase(),
      processedAt: new Date()
    };
  }
  
  public async configure(config: UserProcessorConfig): Promise<void> {
    this.config = { ...config };
  }
  
  public getConfiguration(): UserProcessorConfig {
    return { ...this.config };
  }
  
  public async initialize(): Promise<void> {
    // Initialization logic
    this.initialized = true;
  }
  
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  public async destroy(): Promise<void> {
    // Cleanup logic
    this.destroyed = true;
    this.initialized = false;
  }
  
  public isDestroyed(): boolean {
    return this.destroyed;
  }
  
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Processor is not initialized');
    }
  }
  
  private ensureNotDestroyed(): void {
    if (this.destroyed) {
      throw new Error('Processor is destroyed');
    }
  }
}

// Supporting interfaces
interface ProcessData {
  user: User;
  options?: any;
}

interface ProcessedUser {
  id: string;
  name: string;
  email: string;
  processedAt: Date;
}

interface UserProcessorConfig {
  maxBatchSize: number;
  enableValidation: boolean;
  processingTimeout: number;
}

// ❌ Violation - Monolithic Interface
interface MonolithicProcessor {
  readonly id: string;
  readonly name: string;
  
  process(data: any): Promise<any>;
  configure(config: any): Promise<void>;
  getConfiguration(): any;
  initialize(): Promise<void>;
  isInitialized(): boolean;
  destroy(): Promise<void>;
  isDestroyed(): boolean;
  enableLogging(): void;
  disableLogging(): void;
  isLoggingEnabled(): boolean;
  getStatus(): any;
  getStats(): any;
  reset(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  
  // This interface is too large and violates single responsibility
}
```

## Error Handling and Data Integrity

### Rule 4.1: Structured Error Handling
- **Requirement**: All methods MUST have structured error handling with proper types
- **Rationale**: Ensures consistent error reporting and handling across the system
- **Implementation**: Use typed error classes and error codes

```typescript
// ✅ Correct Structured Error Handling
interface ErrorDetails {
  code: string;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  stack?: string;
}

abstract class BaseError extends Error {
  public readonly code: string;
  public readonly timestamp: number;
  public readonly context?: Record<string, any>;
  
  constructor(
    code: string,
    message: string,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = Date.now();
    this.context = context;
    
    // Ensure stack trace is available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  public toErrorDetails(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack
    };
  }
}

class ValidationError extends BaseError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: any,
    context?: Record<string, any>
  ) {
    super('VALIDATION_ERROR', message, {
      ...context,
      field,
      value
    });
  }
}

class ConfigurationError extends BaseError {
  constructor(
    message: string,
    public readonly configKey: string,
    context?: Record<string, any>
  ) {
    super('CONFIGURATION_ERROR', message, {
      ...context,
      configKey
    });
  }
}

class NetworkError extends BaseError {
  constructor(
    message: string,
    public readonly url: string,
    public readonly statusCode?: number,
    context?: Record<string, any>
  ) {
    super('NETWORK_ERROR', message, {
      ...context,
      url,
      statusCode
    });
  }
}

class ProcessingError extends BaseError {
  constructor(
    message: string,
    public readonly step: string,
    public readonly inputData: any,
    context?: Record<string, any>
  ) {
    super('PROCESSING_ERROR', message, {
      ...context,
      step,
      inputData
    });
  }
}

// Error handling utility
class ErrorHandler {
  public static handleKnownError(error: BaseError): ErrorDetails {
    return error.toErrorDetails();
  }
  
  public static handleUnknownError(error: unknown): ErrorDetails {
    if (error instanceof BaseError) {
      return error.toErrorDetails();
    }
    
    if (error instanceof Error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        timestamp: Date.now(),
        stack: error.stack
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      timestamp: Date.now()
    };
  }
  
  public static isRetryableError(error: BaseError): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'TEMPORARY_ERROR'
    ];
    
    return retryableCodes.includes(error.code);
  }
}

// Usage in services
class DataService {
  public async processData(data: any): Promise<ProcessResult> {
    try {
      // Validate input
      this.validateInput(data);
      
      // Process data
      return await this.doProcessData(data);
      
    } catch (error) {
      // Re-throw known errors
      if (error instanceof BaseError) {
        throw error;
      }
      
      // Convert unknown errors to structured errors
      throw new ProcessingError(
        'Failed to process data',
        'data_processing',
        data,
        { originalError: ErrorHandler.handleUnknownError(error) }
      );
    }
  }
  
  private validateInput(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new ValidationError(
        'Input data must be an object',
        'data',
        data
      );
    }
    
    if (!data.id) {
      throw new ValidationError(
        'Data ID is required',
        'id',
        data.id
      );
    }
  }
  
  private async doProcessData(data: any): Promise<ProcessResult> {
    // Actual processing logic
    return {
      success: true,
      processedData: data,
      processedAt: new Date()
    };
  }
}

// ❌ Violation - Unstructured Error Handling
class UnsafeDataService {
  public async processData(data: any): Promise<any> {
    try {
      if (!data.id) {
        throw new Error('ID is required'); // Generic error
      }
      
      return this.process(data);
    } catch (error) {
      console.error(error);
      throw error; // Re-throwing without structure
    }
  }
  
  private process(data: any): any {
    // No error handling
    return data;
  }
}
```

### Rule 4.2: Data Integrity Validation
- **Requirement**: All data operations MUST ensure data integrity
- **Rationale**: Prevents data corruption and ensures system consistency
- **Implementation**: Use transaction-like operations and data validation

```typescript
// ✅ Correct Data Integrity Implementation
interface DataOperation<T> {
  validate(data: T): ValidationResult;
  transform(data: T): T;
  persist(data: T): Promise<void>;
}

interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

class DataIntegrityService<T> implements DataOperation<T> {
  private validator: InputValidator;
  private dataStore: Map<string, T> = new Map();
  
  constructor(validator: InputValidator) {
    this.validator = validator;
  }
  
  public async executeTransaction(data: T): Promise<TransactionResult<T>> {
    try {
      // Start transaction
      const originalData = this.dataStore.get((data as any).id);
      
      // Validate data
      const validation = this.validate(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }
      
      // Transform data
      const transformedData = this.transform(validation.validatedData);
      
      // Persist data
      await this.persist(transformedData);
      
      return {
        success: true,
        data: transformedData,
        metadata: {
          operation: 'create_update',
          timestamp: Date.now(),
          hadOriginal: !!originalData
        }
      };
      
    } catch (error) {
      // Rollback on error
      return {
        success: false,
        error: this.formatErrorMessage(error)
      };
    }
  }
  
  public validate(data: T): ValidationResult {
    return this.validator.validate(data as any);
  }
  
  public transform(data: T): T {
    // Apply data transformations and sanitization
    return this.sanitizeData(data);
  }
  
  public async persist(data: T): Promise<void> {
    // Simulate persistence with validation
    const id = (data as any).id;
    if (!id) {
      throw new Error('Data must have an ID for persistence');
    }
    
    this.dataStore.set(id, data);
  }
  
  private sanitizeData(data: T): T {
    // Implement data sanitization logic
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeString(value);
        } else {
          sanitized[key] = value;
        }
      }
      
      return sanitized as T;
    }
    
    return data;
  }
  
  private sanitizeString(value: string): string {
    return value
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[<>]/g, '');
  }
  
  private formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

// ❌ Violation - No Data Integrity
class UnsafeDataIntegrityService<T> {
  private dataStore: Map<string, T> = new Map();
  
  public async saveData(data: T): Promise<void> {
    // No validation
    // No transformation
    // No transaction handling
    // Direct persistence
    this.dataStore.set((data as any).id, data);
  }
}
```

These type safety and validation rules ensure that the RCC modular system maintains strong type safety, data integrity, and error handling consistency throughout the codebase.