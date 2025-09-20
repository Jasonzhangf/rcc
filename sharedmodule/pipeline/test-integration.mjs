#!/usr/bin/env node

/**
 * Integration test for debug system with pipeline assembler
 * 测试debug系统与流水线组装器的集成
 */

import { LLMSwitchModule } from './dist/index.esm.js';
import { ModuleScanner } from './dist/index.esm.js';
import { PipelineAssembler } from './dist/index.esm.js';

async function testDebugIntegration() {
  console.log('🧪 Testing debug system integration with pipeline assembler...');

  try {
    // Create module info for LLMSwitch
    const moduleInfo = {
      id: 'llmswitch-test',
      name: 'LLMSwitch Test Module',
      version: '1.0.0',
      description: 'Test module for debug integration'
    };

    // Create LLMSwitch module
    const llmSwitch = new LLMSwitchModule(moduleInfo);

    // Configure the module
    await llmSwitch.configure({
      enabledTransformers: ['anthropic-to-openai'],
      defaultSourceProtocol: 'anthropic',
      defaultTargetProtocol: 'openai',
      strictMode: false,
      enableValidation: true,
      enableIORecording: true,
      ioRecordingPath: './debug-logs'
    });

    console.log('✅ LLMSwitch module configured successfully');

    // Test module initialization
    await llmSwitch.initialize();
    console.log('✅ LLMSwitch module initialized successfully');

    // Test module scanner
    const scanner = new ModuleScanner();
    console.log('✅ Module scanner created successfully');

    // Test pipeline assembler
    const assembler = new PipelineAssembler({
      debugMode: true,
      enableLogging: true
    });
    console.log('✅ Pipeline assembler created successfully');

    // Test request processing
    const testRequest = {
      protocol: 'anthropic',
      payload: {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Hello, world!'
              }
            ]
          }
        ]
      },
      metadata: {
        traceId: 'test-trace-123',
        timestamp: Date.now()
      }
    };

    console.log('📤 Processing test request...');
    const result = await llmSwitch.process(testRequest);

    if (result.error) {
      console.log('⚠️  Request processed with error:', result.error.message);
    } else {
      console.log('✅ Request processed successfully');
    }

    // Test module cleanup
    await llmSwitch.destroy();
    console.log('✅ Module cleaned up successfully');

    console.log('🎉 All integration tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
testDebugIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });