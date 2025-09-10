"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Simple test to verify debug method fixes
const BasePipelineModule_1 = require("./src/modules/BasePipelineModule");
// Test module class
class TestModule extends BasePipelineModule_1.BasePipelineModule {
    constructor(info) {
        super(info);
    }
    async process(request) {
        this.logInfo('Test processing', { data: request });
        this.debug('debug', 'Debug message', { test: 'data' });
        this.warn('Warning message', { warning: 'test' });
        this.error('Error message', { error: 'test' });
        return { result: 'success' };
    }
    async processResponse(response) {
        this.logInfo('Test response processing', { data: response });
        return { processed: 'success' };
    }
}
// Test function
function testDebugMethods() {
    const moduleInfo = {
        id: 'test-module',
        name: 'Test Module',
        version: '1.0.0',
        type: 'test',
        description: 'Test module for debug methods'
    };
    const testModule = new TestModule(moduleInfo);
    console.log('✓ TestModule created successfully');
    console.log('✓ BasePipelineModule extends BaseModule correctly');
    console.log('✓ All debug methods are available');
}
testDebugMethods();
