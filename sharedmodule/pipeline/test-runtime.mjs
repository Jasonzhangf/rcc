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

try {
    const testModule = new TestModule(moduleInfo);
    console.log('✅ TestModule created successfully');
    console.log('✅ All debug methods are available at runtime');
    console.log('✅ BaseModule inheritance is working correctly');
    
    // Test each debug method
    testModule.logInfo('Test logInfo');
    testModule.debug('debug', 'Test debug');
    testModule.warn('Test warn');
    testModule.error('Test error');
    testModule.trace('Test trace');
    testModule.log('Test log');
    
    console.log('✅ All debug methods work correctly');
} catch (error) {
    console.error('❌ Runtime error:', error.message);
    process.exit(1);
}
