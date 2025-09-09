import { ModuleRegistry } from './registry/ModuleRegistry';
import { ExampleModule } from './modules/ExampleModule';
import { ApiIsolation } from './utils/ApiIsolation';
import { ModuleInfo } from './interfaces/ModuleInfo';

/**
 * Main entry point demonstrating the modular architecture
 */
async function main() {
  console.log('Initializing modular architecture...');
  
  // Get the module registry instance
  const registry = ModuleRegistry.getInstance();
  
  // Register module types
  registry.registerModuleType('example', ExampleModule);
  
  // Create module information
  const moduleInfo: ModuleInfo = {
    id: 'example-1',
    name: 'Example Module 1',
    version: '1.0.0',
    description: 'An example module for demonstration',
    type: 'example'
  };
  
  try {
    // Create a module through the registry
    const module = await registry.createModule<ExampleModule>(moduleInfo);
    
    // Create a restricted API interface for the module
    // Only expose specific methods and properties
    const moduleApi = ApiIsolation.createModuleInterface(module, {
      methods: ['processMessage', 'receiveData'],
      properties: []
    });
    
    // Use the restricted API
    await moduleApi.processMessage('Hello, modular architecture!');
    
    // Try to access internal method (should throw an error)
    // Uncomment the following line to see the API isolation in action
    // (module as any).processReceivedData({ test: 'data' });
    
    console.log('Module created and used successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the main function
main().catch(console.error);