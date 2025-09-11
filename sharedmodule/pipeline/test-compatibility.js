/**
 * Test script for iFlow compatibility module
 */

import { IFlowCompatibilityModule } from '../src/modules/iFlowCompatibilityModule';
import { LMStudioCompatibilityModule } from '../src/modules/LMStudioCompatibilityModule';

// Test data
const testOpenAIRequest = {
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ],
  temperature: 0.7
};

const testiFlowResponse = {
  taskId: 'test-task-123',
  result: 'Hello! I am doing well, thank you for asking.',
  agentResponse: {
    content: 'Hello! I am doing well, thank you for asking.',
    role: 'assistant'
  },
  usage: {
    prompt_tokens: 10,
    completion_tokens: 15,
    total_tokens: 25
  }
};

async function testIFlowCompatibility() {
  console.log('Testing iFlow compatibility module...');
  
  // Create module instance
  const moduleInfo = {
    id: 'iflow-compatibility-test',
    name: 'iFlow Compatibility Test',
    version: '0.1.0',
    description: 'Test module for iFlow compatibility'
  };
  
  const iFlowModule = new IFlowCompatibilityModule(moduleInfo);
  
  try {
    // Configure module
    await iFlowModule.configure({
      direction: 'openai-to-iflow',
      mappingTable: 'openai-to-iflow',
      strictMapping: false,
      preserveUnknownFields: true,
      enableAgents: true,
      agentConfig: {
        enableImageAgent: false,
        enableCodeAgent: false,
        enableToolAgent: false,
        defaultAgent: 'general'
      }
    });
    
    console.log('✓ iFlow module configured successfully');
    
    // Test OpenAI to iFlow conversion
    const iFlowRequest = await iFlowModule.convertOpenAIToIFlow(testOpenAIRequest);
    console.log('✓ OpenAI to iFlow conversion successful');
    console.log('Converted request:', JSON.stringify(iFlowRequest, null, 2));
    
    // Test iFlow to OpenAI conversion
    const openAIResponse = await iFlowModule.convertIFlowToOpenAI(testiFlowResponse);
    console.log('✓ iFlow to OpenAI conversion successful');
    console.log('Converted response:', JSON.stringify(openAIResponse, null, 2));
    
  } catch (error) {
    console.error('✗ iFlow compatibility test failed:', error);
  }
}

async function testLMStudioCompatibility() {
  console.log('\nTesting LMStudio compatibility module...');
  
  // Create module instance
  const moduleInfo = {
    id: 'lmstudio-compatibility-test',
    name: 'LMStudio Compatibility Test',
    version: '0.1.0',
    description: 'Test module for LMStudio compatibility'
  };
  
  const lmStudioModule = new LMStudioCompatibilityModule(moduleInfo);
  
  try {
    // Configure module
    await lmStudioModule.configure({
      direction: 'openai-to-lmstudio',
      mappingTable: 'openai-to-lmstudio',
      strictMapping: false,
      preserveUnknownFields: true,
      enableLMStudioOptimizations: true
    });
    
    console.log('✓ LMStudio module configured successfully');
    
    // Test OpenAI to LMStudio conversion
    const lmStudioRequest = await lmStudioModule.convertOpenAIToLMStudio(testOpenAIRequest);
    console.log('✓ OpenAI to LMStudio conversion successful');
    console.log('Converted request:', JSON.stringify(lmStudioRequest, null, 2));
    
    // Test LMStudio to OpenAI conversion (LMStudio responses are OpenAI-compatible)
    const openAIResponse = await lmStudioModule.convertLMStudioToOpenAI(testiFlowResponse, 'gpt-4');
    console.log('✓ LMStudio to OpenAI conversion successful');
    console.log('Converted response:', JSON.stringify(openAIResponse, null, 2));
    
  } catch (error) {
    console.error('✗ LMStudio compatibility test failed:', error);
  }
}

async function runTests() {
  console.log('🚀 Starting compatibility module tests...\n');
  
  await testIFlowCompatibility();
  await testLMStudioCompatibility();
  
  console.log('\n✅ Compatibility module tests completed');
}

// Run tests
runTests().catch(console.error);