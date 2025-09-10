import { LLMSwitchModule } from './sharedmodule/pipeline/src/modules/LLMSwitchModule.ts';
import { ModuleInfo } from 'rcc-basemodule';

// Create a simple test for the LLMSwitchModule
const moduleInfo: ModuleInfo = {
  id: 'test-llmswitch',
  type: 'transform',
  name: 'Test LLMSwitch',
  version: '1.0.0',
  description: 'Test LLMSwitch module',
  metadata: {
    author: 'Test Author',
    dependencies: [],
    capabilities: ['protocol-conversion']
  }
};

const config = {
  inputProtocol: 'openai',
  outputProtocol: 'anthropic',
  transformTable: 'openai-to-anthropic',
  strictMode: true,
  caching: {
    enabled: true,
    ttlMs: 300000,
    maxSize: 1000
  }
};

const llmSwitch = new LLMSwitchModule(moduleInfo);

// Test configuration
llmSwitch.configure(config).then(() => {
  console.log('LLMSwitch module configured successfully');
  
  // Test a simple transformation
  const testRequest = {
    model: 'gpt-4',
    messages: [
      { role: 'user', content: 'Hello, world!' }
    ],
    max_tokens: 100,
    temperature: 0.7
  };
  
  return llmSwitch.process(testRequest);
}).then((result: any) => {
  console.log('Transformation successful:', JSON.stringify(result, null, 2));
}).catch((error: any) => {
  console.error('Error:', error);
});