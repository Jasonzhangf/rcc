import { PipelineScheduler, ErrorHandlerCenter, PipelineInstance } from './dist/index.esm.js';

async function testBasicFunctionality() {
  console.log('Starting basic functionality test...');
  
  try {
    // Test ErrorHandlerCenter
    const errorHandler = new ErrorHandlerCenter({});
    await errorHandler.initialize();
    console.log('✓ ErrorHandlerCenter initialized successfully');
    
    // Test PipelineInstance
    const pipelineInstance = new PipelineInstance({ id: 'test-pipeline' });
    await pipelineInstance.initialize();
    console.log('✓ PipelineInstance initialized successfully');
    
    // Test PipelineScheduler
    const scheduler = new PipelineScheduler({
      loadBalancer: { strategy: 'round-robin' },
      errorHandler: errorHandler
    });
    await scheduler.initialize();
    console.log('✓ PipelineScheduler initialized successfully');
    
    // Test pipeline execution
    const result = await scheduler.execute('test-pipeline', { test: 'data' });
    console.log('✓ Pipeline execution successful:', result);
    
    console.log('\n🎉 All basic tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testBasicFunctionality()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test crashed:', error);
    process.exit(1);
  });