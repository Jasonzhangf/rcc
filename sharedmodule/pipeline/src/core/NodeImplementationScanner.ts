import { NodeImplementationInfo } from './NodeImplementationInfo';
import { NodeImplementationRegistry } from './NodeImplementationRegistry';
import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../modules/BasePipelineModule';

/**
 * Node Implementation Scanner
 * Discovers and registers pipeline node implementations
 */
export class NodeImplementationScanner {
  private static readonly DEFAULT_PRIORITY = 100;
  private static readonly DEFAULT_WEIGHT = 100;
  
  /**
   * Scan and register all default implementations
   */
  static async scanAndRegister(): Promise<void> {
    const registry = NodeImplementationRegistry.getInstance();
    
    console.log('Scanning and registering node implementations...');
    
    // Discover all implementations
    const implementations = await this.discoverImplementations();
    
    // Register each implementation
    for (const impl of implementations) {
      registry.register(impl.nodeType, impl);
    }
    
    // Log registration summary
    const stats = registry.getStatistics();
    console.log('Node implementation scan complete:', {
      totalImplementations: stats.totalImplementations,
      nodeTypes: stats.nodeTypes,
      implementationsByType: stats.implementationsByType
    });
  }
  
  /**
   * Discover all available implementations
   * @returns Array of implementation information
   */
  private static async discoverImplementations(): Promise<NodeImplementationInfo[]> {
    // Import implementation modules
    const {
      OpenAIToGeminiModule,
      GeminiToOpenAIModule,
      DefaultLLMSwitchModule
    } = await import('../nodes/llmswitch/implementations/LlmSwitchImplementations');
    
    const {
      StreamConverterModule,
      BatchProcessorModule,
      DefaultWorkflowModule
    } = await import('../nodes/workflow/implementations/WorkflowImplementations');
    
    const {
      JSONCompatibilityModule,
      DefaultCompatibilityModule
    } = await import('../nodes/compatibility/implementations/CompatibilityImplementations');
    
    const {
      OpenAIProviderModule,
      GeminiProviderModule,
      DefaultProviderModule
    } = await import('../nodes/provider/implementations/ProviderImplementations');
    
    return [
      // LLM Switch implementations
      {
        id: 'llmswitch-openai-to-gemini',
        name: 'OpenAI to Gemini Protocol Converter',
        version: '1.0.0',
        description: 'Converts OpenAI protocol requests to Gemini protocol format',
        nodeType: 'llmswitch',
        supportedProtocols: ['openai'],
        supportedFormats: ['json'],
        priority: 100,
        weight: this.DEFAULT_WEIGHT,
        moduleClass: OpenAIToGeminiModule,
        tags: ['protocol-conversion', 'openai', 'gemini'],
        author: 'RCC Team',
        license: 'MIT',
        matches: (input, context) => {
          return input.protocol === 'openai' && context.targetProtocol === 'gemini';
        }
      },
      {
        id: 'llmswitch-gemini-to-openai',
        name: 'Gemini to OpenAI Protocol Converter',
        version: '1.0.0',
        description: 'Converts Gemini protocol responses to OpenAI protocol format',
        nodeType: 'llmswitch',
        supportedProtocols: ['gemini'],
        supportedFormats: ['json'],
        priority: 100,
        weight: this.DEFAULT_WEIGHT,
        moduleClass: GeminiToOpenAIModule,
        tags: ['protocol-conversion', 'gemini', 'openai'],
        author: 'RCC Team',
        license: 'MIT',
        matches: (input, context) => {
          return input.protocol === 'gemini' && context.targetProtocol === 'openai';
        }
      },
      {
        id: 'llmswitch-default',
        name: 'Default LLM Switch',
        version: '1.0.0',
        description: 'Default LLM switch implementation with configurable protocol conversion',
        nodeType: 'llmswitch',
        supportedProtocols: ['openai', 'gemini', 'generic'],
        supportedFormats: ['json'],
        priority: 50, // Lower priority as fallback
        weight: this.DEFAULT_WEIGHT,
        moduleClass: DefaultLLMSwitchModule,
        tags: ['protocol-conversion', 'fallback', 'default'],
        author: 'RCC Team',
        license: 'MIT'
      },
      
      // Workflow implementations
      {
        id: 'workflow-stream-converter',
        name: 'Stream Format Converter',
        version: '1.0.0',
        description: 'Converts between streaming and non-streaming formats',
        nodeType: 'workflow',
        supportedProtocols: ['generic'],
        supportedFormats: ['stream', 'non-stream'],
        priority: 100,
        weight: this.DEFAULT_WEIGHT,
        moduleClass: StreamConverterModule,
        tags: ['stream-processing', 'format-conversion'],
        author: 'RCC Team',
        license: 'MIT'
      },
      {
        id: 'workflow-batch-processor',
        name: 'Batch Request Processor',
        version: '1.0.0',
        description: 'Processes multiple requests in batch mode',
        nodeType: 'workflow',
        supportedProtocols: ['generic'],
        supportedFormats: ['batch'],
        priority: 80,
        weight: this.DEFAULT_WEIGHT,
        moduleClass: BatchProcessorModule,
        tags: ['batch-processing', 'performance'],
        author: 'RCC Team',
        license: 'MIT'
      },
      {
        id: 'workflow-default',
        name: 'Default Workflow Processor',
        version: '1.0.0',
        description: 'Default workflow implementation with flexible processing capabilities',
        nodeType: 'workflow',
        supportedProtocols: ['generic'],
        supportedFormats: ['stream', 'non-stream', 'batch'],
        priority: 50, // Lower priority as fallback
        weight: this.DEFAULT_WEIGHT,
        moduleClass: DefaultWorkflowModule,
        tags: ['workflow', 'fallback', 'default'],
        author: 'RCC Team',
        license: 'MIT'
      },
      
      // Compatibility implementations
      {
        id: 'compatibility-json-mapper',
        name: 'JSON Field Mapper',
        version: '1.0.0',
        description: 'Maps JSON fields between different schemas',
        nodeType: 'compatibility',
        supportedProtocols: ['generic'],
        supportedFormats: ['json'],
        priority: 100,
        weight: this.DEFAULT_WEIGHT,
        moduleClass: JSONCompatibilityModule,
        tags: ['json', 'field-mapping', 'schema'],
        author: 'RCC Team',
        license: 'MIT'
      },
      {
        id: 'compatibility-default',
        name: 'Default Compatibility Layer',
        version: '1.0.0',
        description: 'Default compatibility implementation with configurable field mapping',
        nodeType: 'compatibility',
        supportedProtocols: ['generic'],
        supportedFormats: ['json', 'xml'],
        priority: 50, // Lower priority as fallback
        weight: this.DEFAULT_WEIGHT,
        moduleClass: DefaultCompatibilityModule,
        tags: ['compatibility', 'fallback', 'default'],
        author: 'RCC Team',
        license: 'MIT'
      },
      
      // Provider implementations
      {
        id: 'provider-openai',
        name: 'OpenAI Provider',
        version: '1.0.0',
        description: 'OpenAI API provider with full feature support',
        nodeType: 'provider',
        supportedProtocols: ['openai'],
        supportedFormats: ['json'],
        priority: 100,
        weight: this.DEFAULT_WEIGHT,
        moduleClass: OpenAIProviderModule,
        tags: ['openai', 'api', 'ai-provider'],
        author: 'RCC Team',
        license: 'MIT'
      },
      {
        id: 'provider-gemini',
        name: 'Gemini Provider',
        version: '1.0.0',
        description: 'Google Gemini API provider with authentication support',
        nodeType: 'provider',
        supportedProtocols: ['gemini'],
        supportedFormats: ['json'],
        priority: 100,
        weight: this.DEFAULT_WEIGHT,
        moduleClass: GeminiProviderModule,
        tags: ['gemini', 'google', 'ai-provider'],
        author: 'RCC Team',
        license: 'MIT'
      },
      {
        id: 'provider-default',
        name: 'Default Provider',
        version: '1.0.0',
        description: 'Default provider implementation with configurable HTTP client',
        nodeType: 'provider',
        supportedProtocols: ['generic'],
        supportedFormats: ['json'],
        priority: 50, // Lower priority as fallback
        weight: this.DEFAULT_WEIGHT,
        moduleClass: DefaultProviderModule,
        tags: ['provider', 'fallback', 'default'],
        author: 'RCC Team',
        license: 'MIT'
      }
    ];
  }
  
  /**
   * Validate implementation information
   * @param impl - Implementation to validate
   * @returns Validation result
   */
  static validateImplementation(impl: NodeImplementationInfo): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Required fields
    if (!impl.id) errors.push('Missing implementation ID');
    if (!impl.name) errors.push('Missing implementation name');
    if (!impl.version) errors.push('Missing implementation version');
    if (!impl.nodeType) errors.push('Missing node type');
    if (!impl.moduleClass) errors.push('Missing module class');
    
    // Valid node types
    const validNodeTypes = ['llmswitch', 'workflow', 'compatibility', 'provider'];
    if (!validNodeTypes.includes(impl.nodeType)) {
      errors.push(`Invalid node type: ${impl.nodeType}`);
    }
    
    // Arrays should not be empty
    if (!impl.supportedProtocols || impl.supportedProtocols.length === 0) {
      errors.push('Supported protocols cannot be empty');
    }
    if (!impl.supportedFormats || impl.supportedFormats.length === 0) {
      errors.push('Supported formats cannot be empty');
    }
    
    // Priority and weight should be positive
    if (impl.priority < 0) errors.push('Priority cannot be negative');
    if (impl.weight < 0) errors.push('Weight cannot be negative');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}