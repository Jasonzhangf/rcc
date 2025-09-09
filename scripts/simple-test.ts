#!/usr/bin/env node

import { ModuleInfo } from '../src/interfaces/ModuleInfo';
import { BaseModule } from '../src/core/BaseModule/src/BaseModule';

/**
 * Simple test module for error handling
 */
export class TestModule extends BaseModule {
  constructor(info: ModuleInfo) {
    super(info);
  }
  
  public async initialize(): Promise<void> {
    await super.initialize();
    console.log(`TestModule ${this.info.id} initialized`);
  }
  
  public testSendMessage(): void {
    // This should work
    this.sendMessage('test_message', { data: 'test' }, 'target-module');
    console.log('Message sent successfully');
  }
  
  public async destroy(): Promise<void> {
    console.log(`TestModule ${this.info.id} destroyed`);
    await super.destroy();
  }
}

async function runSimpleTest(): Promise<void> {
  console.log('Running simple test...');
  
  const testModuleInfo: ModuleInfo = {
    id: 'test-module',
    type: 'test',
    name: 'Test Module',
    version: '1.0.0',
    description: 'Simple test module'
  };
  
  const testModule = new TestModule(testModuleInfo);
  await testModule.initialize();
  testModule.testSendMessage();
  await testModule.destroy();
  
  console.log('Simple test completed');
}

runSimpleTest();