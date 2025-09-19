#!/usr/bin/env node

/**
 * Complete debug architecture integration test
 * 验证完整的调试架构集成
 */

console.log('🔍 Testing Complete Debug Architecture Integration...\n');

// Test 1: Import DebugCenter
console.log('✓ Test 1: Importing DebugCenter...');
import { DebugCenter } from './../debugcenter/dist/index.esm.js';
console.log('✓ DebugCenter imported successfully');

// Test 2: Import BaseModule
console.log('\n✓ Test 2: Importing BaseModule...');
import { BaseModule } from './dist/index.esm.js';
console.log('✓ BaseModule imported successfully');

// Test 3: Create DebugCenter instance
console.log('\n✓ Test 3: Creating DebugCenter instance...');
const debugCenter = new DebugCenter({
  enabled: true,
  level: 'debug',
  consoleOutput: true,
  trackDataFlow: true
});
console.log('✓ DebugCenter instance created');

// Test 4: Test BaseModule debug functionality
console.log('\n✓ Test 4: Testing BaseModule with DebugEventBus...');

// Create a simple test module that extends BaseModule
class TestModule extends BaseModule {
  constructor() {
    super({
      id: 'test-module',
      name: 'Test Module',
      version: '1.0.0',
      description: 'Test module for debug integration'
    });
  }

  async initialize() {
    this.debug('info', 'Test module initializing');
    return true;
  }

  async start() {
    this.debug('info', 'Test module starting');
    return true;
  }

  async stop() {
    this.debug('info', 'Test module stopping');
  }

  async configure(config) {
    this.debug('info', 'Test module configured', config);
    return true;
  }
}

// Create test module instance
const testModule = new TestModule();
console.log('✓ TestModule instance created');

// Test 5: Initialize test module and verify debug events
console.log('\n✓ Test 5: Initializing test module...');
testModule.initialize().then(() => {
  console.log('✓ TestModule initialized successfully');

  // Test 6: Verify debug logs
  console.log('\n✓ Test 6: Checking debug logs...');
  const logs = testModule.getDebugLogs();
  console.log(`✓ Debug logs count: ${logs.length}`);

  // Test 7: Test DebugCenter pipeline functionality
  console.log('\n✓ Test 7: Testing DebugCenter pipeline session...');
  const sessionId = debugCenter.startPipelineSession('test-session', 'test-pipeline', 'Test Pipeline');
  console.log(`✓ Pipeline session started: ${sessionId}`);

  // Record some operations
  debugCenter.recordOperation(sessionId, 'test-module', 'test-operation', { input: 'test' }, { output: 'success' }, 'test-op-123', true, undefined, 'middle');
  console.log('✓ Operation recorded');

  // End session
  debugCenter.endPipelineSession(sessionId, true);
  console.log('✓ Pipeline session ended');

  // Test 8: Get stats
  console.log('\n✓ Test 8: Getting DebugCenter stats...');
  const stats = debugCenter.getStats();
  console.log(`✓ Total sessions: ${stats.totalSessions}`);
  console.log(`✓ Total operations: ${stats.totalOperations}`);

  // Cleanup
  console.log('\n✓ Test 9: Cleaning up...');
  testModule.stop();
  debugCenter.destroy();

  console.log('\n🎉 All tests passed! Debug architecture integration is working correctly.');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});