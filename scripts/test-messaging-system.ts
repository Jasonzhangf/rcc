#!/usr/bin/env node

import { MessagingTestModule } from './src/modules/MessagingTestModule';

/**
 * Test script for the messaging system
 */
async function runMessagingTest(): Promise<void> {
  console.log('Running messaging system test...\n');
  
  try {
    // Run the unit test
    await MessagingTestModule.runUnitTest();
    
    console.log('\nMessaging system test completed successfully!');
  } catch (error) {
    console.error('Messaging system test failed:', error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  runMessagingTest();
}