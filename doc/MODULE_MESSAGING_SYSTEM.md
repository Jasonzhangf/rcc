# Module Messaging System

## Overview

The RCC framework now includes a centralized messaging system that handles all inter-module communication. This system provides support for both blocking and non-blocking message responses, replacing the previous direct connection-based approach.

## Key Components

### MessageCenter
The `MessageCenter` is a singleton class that acts as the central message broker for all module communication. It provides methods for sending messages, handling requests, and broadcasting messages to all modules.

Key features of the MessageCenter:
- **Centralized Routing**: All messages pass through a single point for routing
- **Message Queuing**: Messages are processed asynchronously with proper queuing
- **Request/Response Handling**: Support for both blocking and non-blocking request/response patterns
- **Broadcasting**: Ability to send messages to all registered modules
- **Statistics Tracking**: Built-in monitoring of message flow and system performance
- **Timeout Management**: Automatic timeout handling for request/response operations
- **Error Handling**: Comprehensive error handling and propagation

### Message
The `Message` interface defines the structure of all messages exchanged between modules:
- `id`: Unique message identifier
- `type`: Message type identifier
- `source`: Source module ID
- `target`: Target module ID (optional for broadcasts)
- `payload`: Message payload data
- `timestamp`: Creation timestamp
- `correlationId`: For request/response correlation
- `ttl`: Time to live in milliseconds
- `priority`: Message priority (0-9)
- `metadata`: Additional metadata

### MessageResponse
The `MessageResponse` interface defines the structure of responses to messages:
- `messageId`: ID of the original message
- `correlationId`: Correlation ID for matching
- `success`: Whether the operation was successful
- `data`: Response data (if successful)
- `error`: Error message (if failed)
- `timestamp`: Response timestamp

### MessageHandler
The `MessageHandler` interface defines the contract that all modules must implement to participate in the messaging system:
- `handleMessage`: Process incoming messages
- `onModuleRegistered`: Handle module registration events
- `onModuleUnregistered`: Handle module unregistration events

## Architecture Design

### Message Flow
1. **Message Creation**: Modules create messages using the Message interface
2. **Message Sending**: Messages are sent to the MessageCenter via various methods
3. **Message Routing**: MessageCenter routes messages to appropriate targets
4. **Message Processing**: Target modules process messages through their handleMessage method
5. **Response Handling**: Responses are sent back through the MessageCenter to originating modules

### Asynchronous Processing
All messages are processed asynchronously to prevent blocking:
- Messages are queued using `setImmediate()` for non-blocking processing
- Request/response operations use Promises for clean async handling
- Broadcast messages are sent to multiple modules concurrently

### Error Handling
The messaging system implements comprehensive error handling:
- Message validation at send time
- Timeout handling for request/response operations
- Error propagation through response messages
- Statistics tracking for monitoring error rates

## Usage

### Sending Messages

#### One-way Messages (Fire and Forget)
```typescript
// Send a one-way message to a specific module
this.sendMessage('message_type', { data: 'payload' }, 'target_module_id');

// Broadcast a message to all modules
this.broadcastMessage('notification_type', { notification: 'payload' });
```

#### Request/Response Messages (Blocking)
```typescript
// Send a request and wait for response
try {
  const response = await this.sendRequest('request_type', { data: 'payload' }, 'target_module_id');
  console.log('Response:', response);
} catch (error) {
  console.error('Request failed:', error);
}
```

#### Request/Response Messages (Non-blocking)
```typescript
// Send a request with callback for response
this.sendRequestAsync(
  'request_type', 
  { data: 'payload' }, 
  'target_module_id', 
  (response) => {
    console.log('Response:', response);
  }
);
```

### Handling Messages

Modules must implement the `handleMessage` method to process incoming messages:

```typescript
public async handleMessage(message: Message): Promise<MessageResponse | void> {
  switch (message.type) {
    case 'data_request':
      // Process the request and return a response
      return {
        messageId: message.id,
        correlationId: message.correlationId!,
        success: true,
        data: { processed: true, result: 'success' },
        timestamp: Date.now()
      };
      
    case 'notification_type':
      // Handle notification
      console.log('Received notification:', message.payload);
      break;
      
    default:
      console.warn(`Unknown message type: ${message.type}`);
  }
  
  // For request/response messages, return a response
  if (message.correlationId) {
    return {
      messageId: message.id,
      correlationId: message.correlationId,
      success: true,
      data: { message: 'Message received' },
      timestamp: Date.now()
    };
  }
}
```

### Module Lifecycle Events

Modules can also handle module registration and unregistration events:

```typescript
public onModuleRegistered(moduleId: string): void {
  console.log(`Module ${moduleId} has been registered`);
  // Perform any necessary initialization for the new module
}

public onModuleUnregistered(moduleId: string): void {
  console.log(`Module ${moduleId} has been unregistered`);
  // Clean up any resources associated with the unregistered module
}
```

## Migration from Previous Connection System

The new messaging system replaces the previous connection-based approach. Modules no longer need to manage direct connections to other modules. Instead, they use the centralized messaging system for all communication.

### Before (Connection-based)
```typescript
// Add connection
const connection: ConnectionInfo = {
  id: 'connection-1',
  sourceModuleId: 'sender-1',
  targetModuleId: 'receiver-1',
  type: 'output',
  status: 'pending'
};
sender.addOutputConnection(connection);

// Transfer data
await sender.transferData(data);
```

### After (Message-based)
```typescript
// Send message
this.sendMessage('data_transfer', data, 'receiver-1');

// Or send request and wait for response
const response = await this.sendRequest('data_request', data, 'receiver-1');
```

## Benefits

1. **Decoupling**: Modules no longer need direct connections to each other
2. **Scalability**: Centralized message routing enables better scaling
3. **Reliability**: Built-in message queuing and retry mechanisms
4. **Flexibility**: Support for various messaging patterns
5. **Observability**: Centralized message tracking and monitoring
6. **Maintainability**: Standardized messaging interface
7. **Performance**: Asynchronous processing prevents blocking
8. **Error Handling**: Comprehensive error management and propagation

## Security Considerations

1. **Message Validation**: All messages are validated for required fields
2. **Timeout Protection**: Automatic timeout handling prevents hanging requests
3. **Error Isolation**: Errors in one module don't affect others
4. **Access Control**: Modules only receive messages they're intended to process

## Performance Characteristics

1. **Asynchronous Processing**: Non-blocking message handling
2. **Efficient Routing**: Direct routing to target modules
3. **Memory Management**: Proper cleanup of pending requests
4. **Statistics Tracking**: Real-time monitoring of system performance

## Testing

The messaging system includes comprehensive tests that can be run with:
```bash
npm run test:messaging
npm run test:messaging-communication
```

### Test Coverage Areas
1. **Message Sending**: Verify all message types are sent correctly
2. **Message Receiving**: Ensure messages are properly routed and processed
3. **Request/Response**: Test both blocking and non-blocking patterns
4. **Broadcasting**: Validate broadcast messages reach all modules
5. **Error Handling**: Confirm errors are properly handled and reported
6. **Timeout Handling**: Verify timeout mechanisms work correctly
7. **Statistics**: Check that statistics are accurately tracked
8. **Module Lifecycle**: Test module registration and unregistration events

## Best Practices

1. **Message Design**: Keep messages small and focused on single responsibilities
2. **Error Handling**: Always handle potential errors in message processing
3. **Timeout Configuration**: Set appropriate timeouts for request/response operations
4. **Message Types**: Use descriptive, consistent message type identifiers
5. **Payload Structure**: Define clear, well-documented payload structures
6. **Logging**: Log important message events for debugging and monitoring
7. **Resource Cleanup**: Properly clean up resources in module destroy methods