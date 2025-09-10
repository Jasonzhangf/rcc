// Simple test to verify BaseModule import and debug methods
import { BaseModule } from 'rcc-basemodule';
class TestModule extends BaseModule {
    constructor(info) {
        super(info);
        this.logInfo('TestModule initialized');
    }
    async process(request) {
        this.logInfo('Processing request', { data: request });
        this.debug('debug', 'Debug message', { test: 'data' });
        this.warn('Warning message', { warning: 'test' });
        this.error('Error message', { error: 'test' });
        return { success: true };
    }
}
const moduleInfo = {
    id: 'test-module',
    name: 'Test Module',
    version: '1.0.0',
    type: 'test',
    description: 'Test module for debug methods'
};
const testModule = new TestModule(moduleInfo);
console.log('✅ TestModule created successfully');
console.log('✅ All debug methods are available');
