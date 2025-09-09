# Communication Center Design Document

## Overview
This document outlines the design of a Communication Center system that will handle all inter-module messaging with support for both blocking and non-blocking message responses. The system will replace the current direct connection-based approach with a centralized message broker.

## Current Architecture Issues
1. Modules directly manage connections to other modules
2. No centralized message routing
3. No support for request/response patterns
4. No message queuing or buffering
5. No standardized message format

## Proposed Architecture

### Core Components

1. **MessageCenter** - Central message broker
2. **Message** - Standardized message format
3. **MessageHandler** - Interface for message handling in modules
4. **MessageResponse** - Standardized response format

### Key Features

1. **Message Types**:
   - One-way messages (fire and forget)
   - Request/response messages (with blocking and non-blocking options)
   - Broadcast messages (to multiple modules)

2. **Delivery Guarantees**:
   - At-most-once delivery
   - At-least-once delivery (with retries)
   - Exactly-once delivery (with deduplication)

3. **Message Patterns**:
   - Synchronous (blocking) requests
   - Asynchronous (non-blocking) requests
   - Event notifications
   - Broadcast messages

### Message Structure

```typescript
interface Message {
  id: string;                    // Unique message ID
  type: string;                  // Message type identifier
  source: string;                // Source module ID
  target?: string;               // Target module ID (optional for broadcasts)
  payload: any;                  // Message payload
  timestamp: number;             // Creation timestamp
  correlationId?: string;        // For request/response correlation
  ttl?: number;                  // Time to live in milliseconds
  priority?: number;             // Message priority (0-9)
  metadata?: Record<string, any>; // Additional metadata
}

interface MessageResponse {
  messageId: string;             // ID of the original message
  correlationId: string;         // Correlation ID for matching
  success: boolean;              // Whether the operation was successful
  data?: any;                    // Response data (if successful)
  error?: string;                // Error message (if failed)
  timestamp: number;             // Response timestamp
}
```

### Message Center Interface

```typescript
class MessageCenter {
  // Send a one-way message (fire and forget)
  public sendMessage(message: Message): void;
  
  // Send a message and wait for response (blocking)
  public sendRequest(message: Message): Promise<MessageResponse>;
  
  // Send a message with callback for response (non-blocking)
  public sendRequestAsync(message: Message, callback: (response: MessageResponse) => void): void;
  
  // Broadcast a message to all modules
  public broadcastMessage(message: Message): void;
  
  // Register a module to receive messages
  public registerModule(moduleId: string, handler: MessageHandler): void;
  
  // Unregister a module
  public unregisterModule(moduleId: string): void;
  
  // Get message statistics
  public getStats(): MessageCenterStats;
}
```

### Module Integration

Modules will implement a `MessageHandler` interface:

```typescript
interface MessageHandler {
  // Handle incoming messages
  handleMessage(message: Message): Promise<MessageResponse | void>;
  
  // Handle module lifecycle events
  onModuleRegistered(moduleId: string): void;
  onModuleUnregistered(moduleId: string): void;
}
```

### BaseModule Modifications

The `BaseModule` class will be enhanced to:

1. Automatically register with the MessageCenter on initialization
2. Provide default message handling implementation
3. Offer convenience methods for sending messages
4. Support both blocking and non-blocking message sending

```typescript
abstract class BaseModule {
  // Send a one-way message
  protected sendMessage(type: string, payload: any, target?: string): void;
  
  // Send a request and wait for response (blocking)
  protected sendRequest(type: string, payload: any, target: string): Promise<MessageResponse>;
  
  // Send a request with callback (non-blocking)
  protected sendRequestAsync(type: string, payload: any, target: string, callback: (response: MessageResponse) => void): void;
  
  // Broadcast a message to all modules
  protected broadcastMessage(type: string, payload: any): void;
  
  // Abstract method for handling incoming messages
  protected abstract handleMessage(message: Message): Promise<MessageResponse | void>;
}
```

## Implementation Plan

1. Create Message interfaces and types
2. Implement MessageCenter class
3. Modify BaseModule to integrate with MessageCenter
4. Update existing modules to use the new messaging system
5. Create tests for the messaging system
6. Update documentation

## Benefits

1. **Decoupling**: Modules no longer need direct connections to each other
2. **Scalability**: Centralized message routing enables better scaling
3. **Reliability**: Built-in message queuing and retry mechanisms
4. **Flexibility**: Support for various messaging patterns
5. **Observability**: Centralized message tracking and monitoring
6. **Maintainability**: Standardized messaging interface

## Migration Strategy

1. Implement the new MessageCenter alongside existing connection system
2. Update BaseModule to support both systems
3. Gradually migrate modules to use the new system
4. Remove old connection system once all modules are migrated