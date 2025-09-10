import { PipelineAssembler, PipelineConfigFactory } from './index';
import { PipelineAssemblyConfig } from './interfaces/IPipelineAssembler';

/**
 * Pipeline Usage Examples
 * 
 * This file demonstrates how to use the RCC Pipeline system
 * with different configurations and scenarios.
 */

async function example1_BasicPipeline() {
  console.log('=== Example 1: Basic Pipeline Usage ===');
  
  // Create a pipeline assembler
  const assembler = new PipelineAssembler();
  
  // Create a standard OpenAI pipeline configuration
  const config = PipelineConfigFactory.createOpenAIPipeline(
    'your-openai-api-key-here',
    'gpt-4'
  );
  
  try {
    // Assemble the pipeline
    const pipeline = await assembler.assemble(config);
    
    // Activate the pipeline
    await pipeline.activate();
    
    // Prepare a sample request
    const request = {
      model: 'gpt-4',
      messages: [
        { role: 'user', content: 'Hello, how are you?' }
      ],
      max_tokens: 100,
      temperature: 0.7
    };
    
    // Process the request through the pipeline
    const response = await pipeline.process(request);
    
    console.log('Pipeline response:', response);
    
    // Deactivate the pipeline when done
    await pipeline.deactivate();
    
  } catch (error: any) {
    console.error('Pipeline error:', error.message);
  }
}

async function example2_StreamConversionPipeline() {
  console.log('=== Example 2: Stream Conversion Pipeline ===');
  
  const assembler = new PipelineAssembler();
  
  // Create an Anthropic pipeline with stream conversion
  const config = PipelineConfigFactory.createAnthropicPipeline(
    'your-anthropic-api-key-here',
    'claude-3-sonnet-20240229'
  );
  
  try {
    const pipeline = await assembler.assemble(config);
    await pipeline.activate();
    
    // Prepare a streaming request
    const streamRequest = {
      model: 'claude-3-sonnet-20240229',
      messages: [
        { role: 'user', content: 'What is the capital of France?' }
      ],
      max_tokens: 100,
      stream: true // This will be converted to non-stream
    };
    
    // Process the request
    const response = await pipeline.process(streamRequest);
    
    console.log('Stream conversion response:', response);
    
    await pipeline.deactivate();
    
  } catch (error: any) {
    console.error('Stream pipeline error:', error.message);
  }
}

async function example3_OAuth2Pipeline() {
  console.log('=== Example 3: OAuth2 Pipeline ===');
  
  const assembler = new PipelineAssembler();
  
  // Create a custom OAuth2 pipeline
  const config = PipelineConfigFactory.createOAuth2Pipeline(
    'your-client-id',
    'your-client-secret',
    'https://api.example.com/v1/completions',
    'https://auth.example.com/oauth2/token'
  );
  
  try {
    const pipeline = await assembler.assemble(config);
    await pipeline.activate();
    
    const request = {
      model: 'custom-model',
      messages: [
        { role: 'user', content: 'OAuth2 authenticated request' }
      ]
    };
    
    const response = await pipeline.process(request);
    
    console.log('OAuth2 pipeline response:', response);
    
    await pipeline.deactivate();
    
  } catch (error: any) {
    console.error('OAuth2 pipeline error:', error.message);
  }
}

async function example4_CustomConfiguration() {
  console.log('=== Example 4: Custom Pipeline Configuration ===');
  
  const assembler = new PipelineAssembler();
  
  // Create a completely custom pipeline configuration
  const customConfig: PipelineAssemblyConfig = {
    id: 'custom-pipeline',
    name: 'Custom Mixed Pipeline',
    version: '1.0.0',
    description: 'Pipeline with mixed providers and custom settings',
    modules: [
      {
        id: 'custom-llmswitch',
        type: 'llmswitch',
        config: {
          inputProtocol: 'openai',
          outputProtocol: 'custom',
          transformTable: 'openai-to-custom-v1',
          strictMode: false
        }
      },
      {
        id: 'custom-workflow',
        type: 'workflow',
        config: {
          conversionMode: 'non-stream-to-stream',
          streamConfig: {
            chunkSize: 2000,
            streamDelay: 100
          }
        }
      },
      {
        id: 'custom-compatibility',
        type: 'compatibility',
        config: {
          mappingTable: 'custom-compatibility-v1',
          strictMapping: false,
          preserveUnknownFields: true
        }
      },
      {
        id: 'custom-provider',
        type: 'provider',
        config: {
          provider: 'custom',
          endpoint: 'https://custom-api.example.com/v1/chat',
          auth: {
            type: 'jwt',
            token: 'your-jwt-token-here'
          },
          timeout: 45000,
          maxRetries: 5,
          retryDelay: 3000
        }
      }
    ],
    connections: [
      {
        source: 'custom-llmswitch',
        target: 'custom-workflow',
        type: 'request'
      },
      {
        source: 'custom-workflow',
        target: 'custom-compatibility',
        type: 'request'
      },
      {
        source: 'custom-compatibility',
        target: 'custom-provider',
        type: 'request'
      }
    ]
  };
  
  try {
    const pipeline = await assembler.assemble(customConfig);
    await pipeline.activate();
    
    const request = {
      model: 'gpt-4',
      messages: [
        { role: 'user', content: 'Custom pipeline request' }
      ],
      temperature: 0.8
    };
    
    const response = await pipeline.process(request);
    
    console.log('Custom pipeline response:', response);
    
    await pipeline.deactivate();
    
  } catch (error: any) {
    console.error('Custom pipeline error:', error.message);
  }
}

async function example5_PipelineManagement() {
  console.log('=== Example 5: Pipeline Management ===');
  
  const assembler = new PipelineAssembler();
  
  try {
    // Create and activate multiple pipelines
    const openaiConfig = PipelineConfigFactory.createOpenAIPipeline('key1', 'gpt-4');
    const anthropicConfig = PipelineConfigFactory.createAnthropicPipeline('key2', 'claude-3-sonnet-20240229');
    
    const openaiPipeline = await assembler.assemble(openaiConfig);
    const anthropicPipeline = await assembler.assemble(anthropicConfig);
    
    // Activate both pipelines
    await openaiPipeline.activate();
    await anthropicPipeline.activate();
    
    // Set active pipeline
    assembler.setActivePipeline('main-pipeline'); // This would be openaiPipeline
    
    // Get system status
    const status = assembler.getSystemStatus();
    console.log('System status:', status);
    
    // Get specific pipeline health
    const openaiHealth = openaiPipeline.getHealth();
    console.log('OpenAI pipeline health:', openaiHealth);
    
    // Switch pipelines
    assembler.setActivePipeline('stream-pipeline');
    
    // Remove a pipeline
    await assembler.removePipeline('main-pipeline');
    
    console.log('Removed main pipeline, updated status:', assembler.getSystemStatus());
    
    // Cleanup
    await assembler.deactivate();
    
  } catch (error: any) {
    console.error('Pipeline management error:', error.message);
  }
}

/**
 * Main runner function - demonstrates all examples
 */
export async function runAllExamples() {
  console.log('Running all pipeline examples...\n');
  
  try {
    // Run all examples
    await example1_BasicPipeline();
    console.log('\n');
    
    await example2_StreamConversionPipeline();
    console.log('\n');
    
    await example3_OAuth2Pipeline();
    console.log('\n');
    
    await example4_CustomConfiguration();
    console.log('\n');
    
    await example5_PipelineManagement();
    console.log('\n');
    
    console.log('All examples completed successfully!');
    
  } catch (error: any) {
    console.error('Error running examples:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Export individual examples for use in other files
export {
  example1_BasicPipeline,
  example2_StreamConversionPipeline,
  example3_OAuth2Pipeline,
  example4_CustomConfiguration,
  example5_PipelineManagement
};