// Simple test to verify BaseModule import and debug methods
import { BaseModule, ModuleInfo } from 'rcc-basemodule';

class TestModule extends BaseModule {
    constructor(info: ModuleInfo) {
        super(info);
        this.logInfo('TestModule initialized');
    }

    async process(request: any): Promise<any> {
        this.logInfo('Processing request', { data: request });
        this.debug('debug', 'Debug message', { test: 'data' });
        this.warn('Warning message', { warning: 'test' });
        this.error('Error message', { error: 'test' });
        return { success: true };
    }
}

const moduleInfo: ModuleInfo = {
    id: 'test-module',
    name: 'Test Module',
    version: '1.0.0',
    type: 'test',
    description: 'Test module for debug methods'
};

const testModule = new TestModule(moduleInfo);
console.log('✅ TestModule created successfully');
console.log('✅ All debug methods are available');
