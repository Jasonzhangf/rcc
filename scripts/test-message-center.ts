#!/usr/bin/env node

// Add this to see console output
process.env.DEBUG = '*';

import { MessageCenter } from '../src/core/MessageCenter';
import { Message, MessageResponse, MessageHandler } from '../src/interfaces/Message';

/**
 * Simple test module for the message center
 */
class TestModule implements MessageHandler {
  private moduleId: string;
  
  constructor(moduleId: string) {
    this.moduleId = moduleId;
    console.log(`TestModule ${this.moduleId} created`);
  }
  
  async handleMessage(message: Message): Promise<MessageResponse | void> {
    console.log(`Module ${this.moduleId} received message:`, message);
    
    // For request/response messages, return a response
    if (message.correlationId) {
      return {
        messageId: message.id,
        correlationId: message.correlationId,
        success: true,
        data: { 
          message: `Processed by ${this.moduleId}`,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      };
    }
  }
  
  onModuleRegistered(moduleId: string): void {
    console.log(`Module ${this.moduleId} notified of registration: ${moduleId}`);
  }
  
  onModuleUnregistered(moduleId: string): void {
    console.log(`Module ${this.moduleId} notified of unregistration: ${moduleId}`);
  }
}

/**
 * Test script for the message center
 */
async function runMessageCenterTest(): Promise<void> {
  console.log('Running message center test...\n');
  
  try {
    // Get message center instance
    const messageCenter = MessageCenter.getInstance();
    console.log('Message center instance obtained');
    
    // Create test modules
    const module1 = new TestModule('test-module-1');
    const module2 = new TestModule('test-module-2');
    
    // Register modules
    console.log('Registering modules...');
    messageCenter.registerModule('test-module-1', module1);
    messageCenter.registerModule('test-module-2', module2);
    
    // Test 1: Send a one-way message
    console.log('--- Test 1: One-way message ---');
    messageCenter.sendMessage({
      id: 'msg-1',
      type: 'test_message',
      source: 'test-module-1',
      target: 'test-module-2',
      payload: { data: 'Hello from module 1' },
      timestamp: Date.now()
    });
    
    // Wait a bit for message processing
    console.log('Waiting for message processing...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test 2: Send a request and wait for response (blocking)
    console.log('\n--- Test 2: Blocking request ---');
    try {
      const response = await messageCenter.sendRequest({
        id: 'msg-2',
        type: 'test_request',
        source: 'test-module-1',
        target: 'test-module-2',
        payload: { command: 'echo', data: 'Hello, response test!' },
        timestamp: Date.now()
      });
      console.log('Received response:', response);
    } catch (error) {
      console.error('Request failed:', error);
    }
    
    // Test 3: Send a request with callback (non-blocking)
    console.log('\n--- Test 3: Non-blocking request ---');
    messageCenter.sendRequestAsync({
      id: 'msg-3',
      type: 'test_request',
      source: 'test-module-1',
      target: 'test-module-2',
      payload: { command: 'async_echo', data: 'Hello, async test!' },
      timestamp: Date.now()
    }, (response: MessageResponse) => {
      console.log('Received async response:', response);
    });
    
    // Wait for async response
    console.log('Waiting for async response...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test 4: Broadcast message
    console.log('\n--- Test 4: Broadcast message ---');
    messageCenter.broadcastMessage({
      id: 'msg-4',
      type: 'test_broadcast',
      source: 'test-module-1',
      payload: { notification: 'This is a broadcast message' },
      timestamp: Date.now()
    });
    
    // Wait for broadcast processing
    console.log('Waiting for broadcast processing...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test 5: Get statistics
    console.log('\n--- Test 5: Message center statistics ---');
    const stats = messageCenter.getStats();
    console.log('Message center stats:', stats);
    
    // Unregister modules
    console.log('Unregistering modules...');
    messageCenter.unregisterModule('test-module-1');
    messageCenter.unregisterModule('test-module-2');
    
    console.log('\nMessage center test completed successfully!');
  } catch (error) {
    console.error('Message center test failed:', error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  runMessageCenterTest();
}