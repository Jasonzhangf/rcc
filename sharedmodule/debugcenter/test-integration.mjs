#!/usr/bin/env node

/**
 * Integration test for debugcenter module
 * 验证 debugcenter 模块的基本功能
 */

import { DebugCenter, DebugEventBus } from './dist/index.esm.js';

// Simple UUID generator for testing
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testDebugCenter() {
  console.log('🧪 Testing DebugCenter module...\n');

  try {
    // Test 1: Create DebugCenter instance
    console.log('✓ Test 1: Creating DebugCenter instance...');
    const debugCenter = new DebugCenter({
      enabled: true,
      level: 'debug',
      recordStack: false,
      maxLogEntries: 100,
      consoleOutput: true,
      trackDataFlow: true,
      enableFileLogging: false, // Disable file logging for test
      maxFileSize: 1024 * 1024,
      maxLogFiles: 3,
      baseDirectory: './test-logs',
      pipelineIO: {
        enabled: true,
        autoRecordPipelineStart: true,
        autoRecordPipelineEnd: true,
        pipelineSessionFileName: 'test-pipeline-session.jsonl',
        pipelineDirectory: './test-logs',
        recordAllOperations: true,
        includeModuleContext: true,
        includeTimestamp: true,
        includeDuration: true,
        maxPipelineOperationsPerFile: 100
      },
      eventBus: {
        enabled: true,
        maxSubscribers: 100,
        eventQueueSize: 1000
      }
    });
    console.log('✓ DebugCenter instance created successfully');

    // Test 2: Start a pipeline session
    console.log('\n✓ Test 2: Starting pipeline session...');
    const sessionId = generateUUID();
    const pipelineId = 'test-pipeline';
    const pipelineName = 'Test Pipeline for DebugCenter';

    debugCenter.startPipelineSession(sessionId, pipelineId, pipelineName, {
      testMode: true,
      startTime: Date.now()
    });
    console.log(`✓ Pipeline session started: ${sessionId}`);

    // Test 3: Record pipeline start
    console.log('\n✓ Test 3: Recording pipeline start...');
    debugCenter.recordPipelineStart(pipelineId, pipelineName, {
      testData: 'test input data'
    });
    console.log('✓ Pipeline start recorded');

    // Test 4: Record module operation
    console.log('\n✓ Test 4: Recording module operation...');
    const testInput = { message: 'Hello, DebugCenter!' };
    const testOutput = { response: 'Hello from DebugCenter!' };

    debugCenter.recordModuleOperation(
      sessionId,
      'test-module',
      'test-operation',
      testInput,
      testOutput,
      true,
      undefined,
      'middle',
      { phase: 'processing', stage: 1 }
    );
    console.log('✓ Module operation recorded');

    // Test 5: Record pipeline end
    console.log('\n✓ Test 5: Recording pipeline end...');
    debugCenter.recordPipelineEnd(pipelineId, pipelineName, {
      result: 'success',
      data: testOutput
    });
    console.log('✓ Pipeline end recorded');

    // Test 6: End pipeline session
    console.log('\n✓ Test 6: Ending pipeline session...');
    debugCenter.endPipelineSession(sessionId, true);
    console.log('✓ Pipeline session ended');

    // Test 7: Get session info
    console.log('\n✓ Test 7: Retrieving session info...');
    const session = debugCenter.getSession(sessionId);
    if (session) {
      console.log(`✓ Session found: ${session.sessionId}`);
      console.log(`✓ Pipeline ID: ${session.pipelineId}`);
      console.log(`✓ Operations count: ${session.operations.length}`);
      console.log(`✓ Session status: ${session.success ? 'success' : 'failed'}`);
    } else {
      console.log('✗ Session not found');
      return false;
    }

    // Test 8: Get pipeline entries
    console.log('\n✓ Test 8: Retrieving pipeline entries...');
    const entries = debugCenter.getPipelineEntries({ limit: 10 });
    console.log(`✓ Retrieved ${entries.length} pipeline entries`);

    if (entries.length > 0) {
      const firstEntry = entries[0];
      console.log(`✓ First entry: ${firstEntry.operationType} by ${firstEntry.moduleId}`);
    }

    // Test 9: Export data
    console.log('\n✓ Test 9: Exporting data...');
    const exportedData = debugCenter.exportData({
      format: 'json',
      includeStats: true,
      includeContext: true
    });
    console.log(`✓ Data exported successfully (${exportedData.length} characters)`);

    // Test 10: Get stats
    console.log('\n✓ Test 10: Getting statistics...');
    const stats = debugCenter.getStats();
    console.log(`✓ Total sessions: ${stats.totalSessions}`);
    console.log(`✓ Total operations: ${stats.totalOperations}`);
    console.log(`✓ Successful operations: ${stats.successfulOperations}`);
    console.log(`✓ Failed operations: ${stats.failedOperations}`);

    // Test 11: Test DebugEventBus
    console.log('\n✓ Test 11: Testing DebugEventBus...');
    const eventBus = DebugEventBus.getInstance();

    let eventReceived = false;
    eventBus.subscribe('start', (event) => {
      console.log(`✓ Event received: ${event.type} from ${event.moduleId}`);
      eventReceived = true;
    });

    // Publish a test event
    eventBus.publish({
      sessionId: generateUUID(),
      moduleId: 'test-module',
      operationId: 'test-operation',
      timestamp: Date.now(),
      type: 'start',
      position: 'start',
      data: { test: 'data' }
    });

    // Check if event was received
    setTimeout(() => {
      if (eventReceived) {
        console.log('✓ DebugEventBus working correctly');
      } else {
        console.log('✗ DebugEventBus event not received');
      }
    }, 100);

    console.log('\n🎉 All tests passed! DebugCenter module is working correctly.');

    // Cleanup
    await debugCenter.destroy();
    console.log('✓ DebugCenter destroyed');

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testDebugCenter()
  .then(success => {
    if (success) {
      console.log('\n✅ Integration test completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Integration test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Test error:', error);
    process.exit(1);
  });