/**
 * Complete WebAuto Pipeline Integration Example
 *
 * This comprehensive example demonstrates all features of the enhanced WebAuto pipeline system,
 * including advanced routing, load balancing, error recovery, and metrics collection.
 */

// This is a TypeScript example that would require proper compilation
// For immediate testing, see the JavaScript version below

import {
  EnhancedPipelineFactory,
  PipelineUtils,
  WebAutoConfigurationAdapter,
  WebAutoPipelineBuilder
} from '../sharedmodule/pipeline/src/integration/WebAutoConfigurationAdapter';
import {
  RCCLoadBalancerNode,
  RCCErrorRecoveryNode,
  RCCMetricsNode,
  createEnhancedNode,
  EnhancedNodeTemplates
} from '../sharedmodule/pipeline/src/integration/WebAutoEnhancedNodes';
import {
  VirtualModelRouterNode,
  createVirtualModelRouter,
  VirtualModelRouterTemplates
} from '../sharedmodule/pipeline/src/integration/VirtualModelRouterNode';

async function demonstrateCompleteIntegration() {
  console.log('🚀 Complete WebAuto Pipeline Integration Demo');
  console.log('==========================================');

  // 1. System Validation
  console.log('\n📋 Step 1: System Validation');
  const validation = PipelineUtils.validateSystem();
  console.log('System validation:', validation.valid ? '✅ PASSED' : '❌ FAILED');
  if (!validation.valid) {
    console.log('Issues:', validation.issues);
    console.log('Recommendations:', validation.recommendations);
    return;
  }

  // 2. Get System Health
  console.log('\n💓 Step 2: System Health Check');
  const health = PipelineUtils.getSystemHealth();
  console.log('System Health:', JSON.stringify(health, null, 2));

  // 3. Create Core Components
  console.log('\n🏗️ Step 3: Creating Core Components');
  const adapter = new WebAutoConfigurationAdapter();
  const builder = new WebAutoPipelineBuilder({
    enableLoadBalancing: true,
    enableMetrics: true,
    enableErrorRecovery: true,
    enableCaching: true,
    defaultTimeout: 30000
  });

  console.log('✅ Components created successfully');
  console.log(`   - Adapter: ${adapter.constructor.name}`);
  console.log(`   - Builder: ${builder.constructor.name}`);

  // 4. Create Sample Configuration
  console.log('\n⚙️ Step 4: Creating Sample Configuration');
  const sampleConfig = createAdvancedSampleConfiguration();
  console.log('Configuration created with:');
  console.log(`   - Providers: ${Object.keys(sampleConfig.providers).length}`);
  console.log(`   - Virtual Models: ${Object.keys(sampleConfig.virtualModels).length}`);

  // 5. Configure Enhanced Pipeline with All Features
  console.log('\n🔧 Step 5: Building Enhanced Pipeline');
  const pipelineResult = builder
    .createPipeline({
      name: 'advanced-pipeline',
      inputProtocol: 'openai',
      provider: {
        name: 'openai',
        apiKey: 'demo-key',
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        providerName: 'openai'
      }
    })
    .withLoadBalancing({
      strategy: 'weighted',
      weights: {
        'openai': 70,
        'qwen': 30
      },
      healthCheckInterval: 30000,
      circuitBreakerConfig: {
        enabled: true,
        threshold: 3,
        timeout: 15000
      }
    })
    .withMetrics(['request', 'response', 'error', 'timeout', 'circuit-breaker'])
    .withErrorRecovery({
      maxRetries: 3,
      retryDelay: 1000,
      fallbackEnabled: true,
      exponentialBackoff: true
    })
    .withCaching({
      ttl: 300000, // 5 minutes
      maxSize: 1000
    })
    .build();

  console.log('Pipeline building result:', pipelineResult.success ? '✅ SUCCESS' : '❌ FAILED');
  if (pipelineResult.success) {
    console.log(`   - Pipeline ID: ${pipelineResult.pipelineId}`);
    console.log(`   - Nodes: ${pipelineResult.metrics?.nodeCount}`);
    console.log(`   - Build Time: ${pipelineResult.metrics?.buildTime}ms`);
  }

  // 6. Demonstrate Enhanced Node Creation
  console.log('\n🎛️ Step 6: Enhanced Node Creation');

  // Load Balancer Node
  const loadBalancer = createEnhancedNode('loadBalancer', EnhancedNodeTemplates.loadBalancer);
  loadBalancer.addInstance({ id: 'provider-1', endpoint: 'https://api.example.com' });
  loadBalancer.addInstance({ id: 'provider-2', endpoint: 'https://api.backup.com' });
  console.log('✅ Load Balancer Node created');

  // Error Recovery Node
  const errorRecovery = createEnhancedNode('errorRecovery', EnhancedNodeTemplates.errorRecovery);
  console.log('✅ Error Recovery Node created');

  // Metrics Node
  const metricsNode = createEnhancedNode('metrics', EnhancedNodeTemplates.metrics);
  console.log('✅ Metrics Node created');

  // Virtual Model Router
  const virtualModelRouter = createVirtualModelRouter({
    virtualModelId: 'gpt-4-router',
    strategy: 'priority',
    fallbackEnabled: true,
    circuitBreakerEnabled: true,
    targets: [
      {
        providerId: 'openai',
        modelId: 'gpt-4',
        weight: 70,
        priority: 10
      },
      {
        providerId: 'qwen',
        modelId: 'qwen-turbo',
        weight: 30,
        priority: 8
      }
    ]
  });
  console.log('✅ Virtual Model Router Node created');

  // 7. Demonstrate Advanced Features
  console.log('\n🚀 Step 7: Advanced Features Demonstration');

  // Configuration Conversion
  console.log('📊 Configuration Conversion:');
  const conversionResult = adapter.convertVirtualModelToPipelineConfig(
    'gpt-4-proxy',
    sampleConfig.virtualModels['gpt-4-proxy'],
    sampleConfig.providers
  );
  console.log(`   Conversion: ${conversionResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);

  // Node Statistics
  console.log('\n📈 Node Statistics:');
  const loadBalancerStats = loadBalancer.getStats();
  const routerStats = virtualModelRouter.getRoutingStats();
  const healthInfo = virtualModelRouter.getTargetHealth();

  console.log('   Load Balancer Stats:', JSON.stringify(loadBalancerStats, null, 2));
  console.log('   Router Stats:', JSON.stringify(routerStats, null, 2));
  console.log('   Health Info:', JSON.stringify(healthInfo, null, 2));

  // 8. Performance Monitoring
  console.log('\n📊 Step 8: Performance Monitoring');
  const metricsSummary = metricsNode.getMetricsSummary();
  console.log('Metrics Summary:', JSON.stringify(metricsSummary, null, 2));

  // 9. System Capabilities
  console.log('\n🔍 Step 9: System Capabilities');
  const capabilities = EnhancedPipelineFactory.getAvailableCapabilities();
  console.log('Available Capabilities:');
  capabilities.forEach(cap => console.log(`   - ${cap}`));

  // 10. Pipeline Execution Simulation
  console.log('\n🎯 Step 10: Pipeline Execution Simulation');

  const testRequest = {
    sourceProtocol: 'openai',
    targetProtocol: 'openai',
    data: {
      model: 'gpt-4',
      messages: [
        { role: 'user', content: 'Demonstrate advanced WebAuto pipeline capabilities!' }
      ],
      temperature: 0.7,
      max_tokens: 150
    }
  };

  console.log('Processing test request through enhanced pipeline...');
  console.log('Request:', JSON.stringify(testRequest, null, 2));

  // Simulate pipeline execution
  simulateEnhancedPipelineExecution(testRequest);

  console.log('\n🎉 Integration Demo Completed Successfully!');
  console.log('==========================================\n');
}

/**
 * Simulate enhanced pipeline execution
 */
function simulateEnhancedPipelineExecution(request: any) {
  console.log('\n🔄 Simulating Enhanced Pipeline Execution:');

  // Stage 1: Virtual Model Routing
  console.log('📍 Stage 1: Virtual Model Routing');
  console.log('   - Selecting optimal target based on.priority and health score');
  console.log('   - Selected: openai:gpt-4 (priority 10, health score 95)');

  // Stage 2: Load Balancing
  console.log('📍 Stage 2: Load Balancing');
  console.log('   - Strategy: weighted round robin');
  console.log('   - Selected instance: provider-1 (weight 70%)');

  // Stage 3: Metrics Collection
  console.log('📍 Stage 3: Metrics Collection');
  console.log('   - Recording request metrics');
  console.log('   - Tracking execution time and resource usage');

  // Stage 4: Protocol Transformation
  console.log('📍 Stage 4: Protocol Transformation');
  console.log('   - Converting OpenAI to OpenAI (passthrough)');
  console.log('   - No transformation required');

  // Stage 5: Provider Communication
  console.log('📍 Stage 5: Provider Communication');
  console.log('   - Sending request to OpenAI API');
  console.log('   - Processing response...');

  // Stage 6: Error Handling
  console.log('📍 Stage 6: Error Handling');
  console.log('   - No errors detected');
  console.log('   - Original response preserved');

  // Stage 7: Response Metrics
  console.log('📍 Stage 7: Response Metrics');
  console.log('   - Execution time: 850ms');
  console.log('   - Tokens used: 45 (input) / 105 (output)');

  // Stage 8: Result Processing
  console.log('📍 Stage 8: Result Processing');
  console.log('   - Caching result for future requests');
  console.log('   - Updating routing statistics');

  // Final Result
  console.log('✅ Execution Complete!');
  console.log(`Result: {
  "id": "chatcmpl-demo",
  "object": "chat.completion",
  "created": ${Date.now()},
  "model": "gpt-4",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "This is a simulated enhanced WebAuto pipeline response!"
    },
    "finish_reason": "stop"
  }],
}`);
}

/**
 * Create comprehensive sample configuration for demonstration
 */
function createAdvancedSampleConfiguration(): any {
  return {
    version: '1.0.0',
    providers: {
      openai: {
        enabled: true,
        apiKey: 'demo-openai-key',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        models: {
          'gpt-3.5-turbo': {
            temperature: 0.7,
            max_tokens: 2048
          },
          'gpt-4': {
            temperature: 0.5,
            max_tokens: 4096
          }
        }
      },
      qwen: {
        enabled: true,
        apiKey: 'demo-qwen-key',
        endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        models: {
          'qwen-turbo': {
            temperature: 0.7,
            max_tokens: 2048
          }
        }
      },
      anthropic: {
        enabled: true,
        apiKey: 'demo-anthropic-key',
        endpoint: 'https://api.anthropic.com/v1/messages',
        models: {
          'claude-3-opus': {
            temperature: 0.6,
            max_tokens: 4096
          }
        }
      }
    },
    virtualModels: {
      'gpt-4-proxy': {
        enabled: true,
        description: 'High-performance GPT-4 proxy with load balancing',
        targets: [
          {
            providerId: 'openai',
            modelId: 'gpt-4',
            weight: 70,
            priority: 10
          },
          {
            providerId: 'qwen',
            modelId: 'qwen-turbo',
            weight: 30,
            priority: 8
          }
        ],
        priority: 10,
        workflow: {
          name: 'gpt-4-workflow',
          rules: []
        }
      },
      'claude-3-proxy': {
        enabled: true,
        description: 'Claude 3 proxy for complex reasoning tasks',
        targets: [
          {
            providerId: 'anthropic',
            modelId: 'claude-3-opus',
            weight: 100,
            priority: 15
          }
        ],
        priority: 12,
        workflow: {
          name: 'claude-workflow'
        }
      },
      'balanced-proxy': {
        enabled: true,
        description: 'Balanced proxy with multiple providers',
        targets: [
          {
            providerId: 'openai',
            modelId: 'gpt-3.5-turbo',
            weight: 50,
            priority: 8
          },
          {
            providerId: 'qwen',
            modelId: 'qwen-turbo',
            weight: 30,
            priority: 6
          },
          {
            providerId: 'anthropic',
            modelId: 'claude-3-opus',
            weight: 20,
            priority: 5
          }
        ],
        priority: 9
      }
    },
    features: {
      loadBalancing: {
        enabled: true,
        strategy: 'weighted',
        healthCheckInterval: 30000
      },
      errorRecovery: {
        enabled: true,
        maxRetries: 3,
        fallbackEnabled: true
      },
      metrics: {
        enabled: true,
        events: ['request', 'response', 'error', 'timeout'],
        publishInterval: 30000
      },
      caching: {
        enabled: true,
        ttl: 300000,
        maxSize: 1000
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// Export for external use
export {
  demonstrateCompleteIntegration,
  createAdvancedSampleConfiguration,
  simulateEnhancedPipelineExecution
};

// Auto-run if this is the main module
if (typeof process !== 'undefined' && process.argv && process.argv[1] === __filename) {
  demonstrateCompleteIntegration().catch(console.error);
}