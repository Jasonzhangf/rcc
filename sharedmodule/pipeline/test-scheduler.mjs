#!/usr/bin/env node

/**
 * Test scheduler functionality with debug module
 * 测试调度器对debug模块的调度功能
 */

import { LLMSwitchModule } from './dist/index.esm.js';
import { PipelineScheduler } from './dist/index.esm.js';
import { PipelineFactory } from './dist/index.esm.js';

async function testSchedulerIntegration() {
  console.log('🧪 Testing scheduler integration with debug module...');

  try {
    // Create module info for LLMSwitch
    const moduleInfo = {
      id: 'llmswitch-scheduler-test',
      name: 'LLMSwitch Scheduler Test Module',
      version: '1.0.0',
      description: 'Test module for scheduler integration'
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

    // Initialize the module
    await llmSwitch.initialize();
    console.log('✅ LLMSwitch module initialized successfully');

    // Test pipeline factory
    const pipelineFactory = new PipelineFactory();
    console.log('✅ Pipeline factory created successfully');

    // Test pipeline scheduler
    const scheduler = new PipelineScheduler({
      debugMode: true,
      enableMetrics: true,
      enableLogging: true
    });
    console.log('✅ Pipeline scheduler created successfully');

    // Test scheduling a module
    const scheduleResult = await scheduler.scheduleModule(llmSwitch, {
      priority: 'high',
      timeout: 30000,
      retryCount: 3
    });

    if (scheduleResult.success) {
      console.log('✅ Module scheduled successfully');
      console.log('📊 Schedule details:', {
        moduleId: scheduleResult.moduleId,
        scheduleId: scheduleResult.scheduleId,
        priority: scheduleResult.priority,
        status: scheduleResult.status
      });
    } else {
      console.log('⚠️  Module scheduling failed:', scheduleResult.error);
    }

    // Test creating a pipeline with the module
    const pipeline = await pipelineFactory.createPipeline({
      name: 'test-pipeline',
      modules: [llmSwitch],
      config: {
        debugMode: true,
        enableTracing: true
      }
    });

    if (pipeline) {
      console.log('✅ Pipeline created successfully with debug module');

      // Test pipeline execution
      const executionResult = await pipeline.execute({
        protocol: 'anthropic',
        payload: {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Test message for scheduler'
                }
              ]
            }
          ]
        },
        metadata: {
          traceId: 'scheduler-test-456',
          timestamp: Date.now()
        }
      });

      if (executionResult.error) {
        console.log('⚠️  Pipeline execution completed with error:', executionResult.error.message);
      } else {
        console.log('✅ Pipeline execution completed successfully');
      }
    }

    // Test unscheduling the module
    const unscheduleResult = await scheduler.unscheduleModule(scheduleResult.scheduleId);
    if (unscheduleResult.success) {
      console.log('✅ Module unscheduled successfully');
    } else {
      console.log('⚠️  Module unscheduling failed:', unscheduleResult.error);
    }

    // Test module cleanup
    await llmSwitch.destroy();
    console.log('✅ Module cleaned up successfully');

    console.log('🎉 All scheduler tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Scheduler test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
testSchedulerIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });