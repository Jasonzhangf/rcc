// Simple test to validate imports and basic structure
import { ConfigurationSystem } from './src/core/ConfigurationSystem';
import { ModuleInfo } from 'rcc-basemodule';

// Test basic instantiation
const moduleInfo: ModuleInfo = {
  id: 'test-id',
  name: 'test-name',
  version: '1.0.0',
  description: 'test description',
  type: 'configuration-system',
  metadata: {}
};

const system = new ConfigurationSystem(moduleInfo);

console.log('Test compilation successful');