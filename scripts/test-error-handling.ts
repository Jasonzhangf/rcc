#!/usr/bin/env node

import { ConfigLoaderModule } from '../src/modules/Configuration/src/ConfigLoaderModule';
import { ErrorHandlerModule } from '../src/modules/ErrorHandlerModule';
import { ModuleInfo } from '../src/interfaces/ModuleInfo';

/**
 * Test script for error handling between configuration module and error handler
 */
async function runErrorHandlingTest(): Promise<void> {
  console.log('Running error handling test between ConfigLoaderModule and ErrorHandlerModule...\n');
  
  try {
    // Create module instances
    const errorHandlerInfo: ModuleInfo = {
      id: 'error-handler',
      type: 'error_handler',
      name: 'Error Handler Module',
      version: '1.0.0',
      description: 'Centralized error handling module'
    };
    
    const configLoaderInfo: ModuleInfo = {
      id: 'config-loader',
      type: 'configuration',
      name: 'Configuration Loader Module',
      version: '1.0.0',
      description: 'Configuration file loading module'
    };
    
    const errorHandler = ErrorHandlerModule.createInstance(errorHandlerInfo);
    const configLoader = ConfigLoaderModule.createInstance(configLoaderInfo);
    
    // Initialize modules
    await errorHandler.initialize();
    await configLoader.initialize();
    
    console.log('--- Test 1: Configuration file not found error ---');
    try {
      // Try to load a non-existent configuration file
      await configLoader.loadFromFile('./non-existent-config.json');
    } catch (error) {
      console.log('Caught expected error:', error instanceof Error ? error.message : String(error));
    }
    
    // Wait a bit for message processing
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check if error was reported to error handler
    const errorLog = errorHandler.getErrorLog();
    console.log('Error handler log entries:', errorLog.length);
    
    if (errorLog.length > 0) {
      console.log('First error entry:', errorLog[0]);
    }
    
    console.log('\n--- Test 2: Invalid JSON configuration file ---');
    try {
      // Try to load an invalid JSON file
      await configLoader.loadFromFile('./test-config.json5');
    } catch (error) {
      console.log('Caught expected error:', error instanceof Error ? error.message : String(error));
    }
    
    // Wait a bit for message processing
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check updated error log
    const updatedErrorLog = errorHandler.getErrorLog();
    console.log('Updated error handler log entries:', updatedErrorLog.length);
    
    // Clean up
    await configLoader.destroy();
    await errorHandler.destroy();
    
    console.log('\nError handling test completed successfully!');
    
  } catch (error) {
    console.error('Error handling test failed:', error);
  }
}

// Run the test
runErrorHandlingTest();