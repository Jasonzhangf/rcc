/**
 * Pipeline Usage Examples
 * demonstrates how to use the PipelineAssembler to create and manage pipelines
 */

import { 
  createPipeline, 
  PipelineAssembler, 
  PipelineBuilder,
  PipelineConfig,
  LLMSwitchConfig,
  WorkflowConfig,
  CompatibilityConfig,
  ProviderConfig
} from '../index';

/**
 * Example 1: Using the Pipeline Builder (recommended)
 */
export async function example1_BuilderPattern() {
  console.log('=== Example 1: Pipeline Builder Pattern ===');

  try {
    // Create a pipeline using the builder pattern
    const pipeline = await createPipeline()
      .setInfo('example-pipeline-1', 'Example Pipeline', '1.0.0', 'Demonstrates builder pattern')
      .addLLMSwitch('llm-switch-1', {
        protocolConversion: {
          enabled: true,
          targetProtocol: 'openai'
        }
      })
      .addWorkflow('workflow-1', {
        conversionMode: 'stream-to-non-stream',
        enableStreamProcessing: true
      })
      .addCompatibility('compatibility-1', {
        mappingTable: 'openai-compatibility-v1',
        strictMapping: false
      })
      .addProvider('provider-1', {
        provider: 'openai',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        auth: {
          type: 'api_key',
          apiKey: 'your-api-key'
        },
        timeout: 30000
      })
      .addConnection('llm-switch-1', 'workflow-1', 'request')
      .addConnection('workflow-1', 'compatibility-1', 'request')
      .addConnection('compatibility-1', 'provider-1', 'request')
      .addConnection('provider-1', 'compatibility-1', 'response')
      .addConnection('compatibility-1', 'workflow-1', 'response')
      .addConnection('workflow-1', 'llm-switch-1', 'response')
      .build();

    console.log('Pipeline created successfully:', pipeline.getPipelineInfo());
    
    // Activate the pipeline
    await pipeline.activate();
    console.log('Pipeline activated successfully');

    // Process a request
    const request = {
      messages: [
        { role: 'user', content: 'Hello, how are you?' }
      ]
    };

    console.log('Processing request:', request);
    const processedRequest = await pipeline.process(request);
    console.log('Processed request:', processedRequest);

    // Process a response (simulated)
    const response = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'I am doing well, thank you for asking!'
          }
        }
      ],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 10
      }
    };

    console.log('Processing response:', response);
    const processedResponse = await pipeline.processResponse(response);
    console.log('Processed response:', processedResponse);

    // Deactivate the pipeline
    await pipeline.deactivate();
    console.log('Pipeline deactivated successfully');

  } catch (error: any) {
    console.error('Example 1 failed:', error.message);
  }
}

/**
 * Example 2: Using the Pipeline Assembler directly
 */
export async function example2_DirectAssembler() {
  console.log('=== Example 2: Direct Pipeline Assembler ===');

  try {
    const assembler = new PipelineAssembler();

    const config = {
      id: 'example-pipeline-2',
      name: 'Direct Assembler Example',
      version: '1.0.0',
      description: 'Demonstrates direct assembler usage',
      modules: [
        {
          id: 'compatibility-2',
          type: 'Compatibility',
          config: {
            mappingTable: 'openai-compatibility-v1',
            strictMapping: true
          }
        },
        {
          id: 'provider-2',
          type: 'Provider',
          config: {
            provider: 'anthropic',
            endpoint: 'https://api.anthropic.com/v1/messages',
            auth: {
              type: 'api_key',
              apiKey: 'your-anthropic-key'
            }
          }
        }
      ],
      connections: [
        { source: 'compatibility-2', target: 'provider-2', type: 'request' },
        { source: 'provider-2', target: 'compatibility-2', type: 'response' }
      ]
    };

    const pipeline = await assembler.assemble(config);
    console.log('Pipeline created successfully:', pipeline.getPipelineInfo());

    // Activate the pipeline
    await assembler.activate();
    console.log('Pipeline activated successfully');

    // Get pipeline status
    const status = assembler.getPipelineStatus();
    console.log('Pipeline status:', status);

    // Process a request
    const request = {
      user_id: 'user123',
      query: 'What is the weather like today?'
    };

    console.log('Processing request:', request);
    const processedRequest = await pipeline.process(request);
    console.log('Processed request:', processedRequest);

    // Deactivate the pipeline
    await assembler.deactivate();
    console.log('Pipeline deactivated successfully');

  } catch (error: any) {
    console.error('Example 2 failed:', error.message);
  }
}

/**
 * Example 3: Advanced Configuration with Error Handling
 */
export async function example3_AdvancedConfiguration() {
  console.log('=== Example 3: Advanced Configuration ===');

  try {
    const assembler = new PipelineAssembler();

    const config = {
      id: 'advanced-pipeline',
      name: 'Advanced Pipeline Example',
      version: '1.0.0',
      description: 'Complex pipeline with multiple modules and configurations',
      modules: [
        {
          id: 'llm-switch-3',
          type: 'LLMSwitch',
          config: {
            protocolConversion: {
              enabled: true,
              targetProtocol: 'openai',
              preserveFields: ['temperature', 'max_tokens']
            },
            errorHandling: {
              continueOnError: true,
              fallbackValues: {}
            }
          }
        },
        {
          id: 'workflow-3',
          type: 'Workflow',
          config: {
            conversionMode: 'non-stream-to-stream',
            enableStreamProcessing: true,
            streamConfig: {
              chunkSize: 500,
              streamDelay: 100
            }
          }
        },
        {
          id: 'compatibility-3',
          type: 'Compatibility',
          config: {
            mappingTable: 'custom-mapping-v2',
            strictMapping: false,
            preserveUnknownFields: true,
            validation: {
              enabled: true,
              required: ['model', 'messages'],
              types: {
                model: 'string',
                temperature: 'number'
              }
            }
          }
        },
        {
          id: 'provider-3',
          type: 'Provider',
          config: {
            provider: 'custom',
            endpoint: 'https://api.example.com/v1/chat',
            auth: {
              type: 'oauth2',
              oauth2: {
                clientId: 'your-client-id',
                clientSecret: 'your-client-secret',
                tokenEndpoint: 'https://oauth.example.com/token',
                refreshToken: 'your-refresh-token'
              }
            },
            timeout: 60000,
            maxRetries: 5,
            retryDelay: 2000,
            headers: {
              'X-Custom-Header': 'custom-value'
            },
            enableLogging: true
          }
        }
      ],
      connections: [
        { source: 'llm-switch-3', target: 'workflow-3', type: 'request' },
        { source: 'workflow-3', target: 'compatibility-3', type: 'request' },
        { source: 'compatibility-3', target: 'provider-3', type: 'request' },
        { source: 'provider-3', target: 'compatibility-3', type: 'response' },
        { source: 'compatibility-3', target: 'workflow-3', type: 'response' },
        { source: 'workflow-3', target: 'llm-switch-3', type: 'response' }
      ]
    };

    const pipeline = await assembler.assemble(config);
    console.log('Advanced pipeline created:', pipeline.getPipelineInfo());

    // Display module details
    console.log('Modules in pipeline:');
    pipeline.getModules().forEach(module => {
      console.log(`- ${module.getId()}: ${module.getName()} (${module.getType()}) - Configured: ${module.isConfigured()}`);
    });

    // Activate pipeline
    await assembler.activate();
    console.log('Advanced pipeline activated');

    // Process complex request
    const complexRequest = {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Explain quantum computing in simple terms.' }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      timestamp: Date.now()
    };

    console.log('Processing complex request...');
    const processedRequest = await pipeline.process(complexRequest);
    console.log('Processed complex request:', JSON.stringify(processedRequest, null, 2));

    // Deactivate
    await assembler.deactivate();

  } catch (error: any) {
    console.error('Example 3 failed:', error.message);
  }
}

/**
 * Example 4: Error Handling and Recovery
 */
export async function example4_ErrorHandling() {
  console.log('=== Example 4: Error Handling ===');

  try {
    const assembler = new PipelineAssembler();

    // Config with intentional errors to demonstrate handling
    const config = {
      id: 'error-test-pipeline',
      name: 'Error Testing Pipeline',
      version: '1.0.0',
      modules: [
        {
          id: 'compatibility-4',
          type: 'Compatibility',
          config: {
            mappingTable: 'non-existent-mapping', // This will cause an error
            strictMapping: true
          }
        }
      ],
      connections: []
    };

    // This will fail due to invalid configuration
    try {
      await assembler.assemble(config);
    } catch (assemblyError: any) {
      console.log('Expected assembly error caught:', assemblyError.message);
    }

    // Now try with valid config but demonstrate runtime errors
    const validConfig = {
      id: 'error-test-pipeline-2',
      name: 'Error Testing Pipeline 2',
      version: '1.0.0',
      modules: [
        {
          id: 'provider-4',
          type: 'Provider',
          config: {
            provider: 'example',
            endpoint: 'https://invalid.example.com/api',
            auth: {
              type: 'api_key',
              apiKey: 'invalid-key'
            }
          }
        }
      ],
      connections: []
    };

    const pipeline = await assembler.assemble(validConfig);
    await assembler.activate();

    // This will fail due to network/connection error
    try {
      const request = { input: 'test' };
      await pipeline.process(request);
    } catch (processingError: any) {
      console.log('Expected processing error caught:', processingError.message);
    }

    await assembler.deactivate();

  } catch (error: any) {
    console.error('Example 4 failed:', error.message);
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('Running all Pipeline Assembler examples...\n');

  await example1_BuilderPattern();
  console.log('\n');

  await example2_DirectAssembler();
  console.log('\n');

  await example3_AdvancedConfiguration();
  console.log('\n');

  await example4_ErrorHandling();
  console.log('\nAll examples completed!');
}

// Auto-run if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}