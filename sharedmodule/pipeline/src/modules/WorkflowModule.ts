import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';

/**
 * Workflow Module Configuration
 */
export interface WorkflowConfig {
  /** Stream conversion mode */
  conversionMode: 'stream-to-non-stream' | 'non-stream-to-stream' | 'none';
  /** Stream configuration */
  streamConfig?: {
    /** Chunk size for stream conversion */
    chunkSize?: number;
    /** Simulate streaming delay (ms) */
    streamDelay?: number;
    /** Buffer size for stream processing */
    bufferSize?: number;
    /** Enable chunk encoding */
    enableChunkEncoding?: boolean;
  };
  /** Enable stream processing */
  enableStreamProcessing?: boolean;
  /** Validation configuration */
  validation?: {
    /** Enable strict mode */
    strictMode?: boolean;
    /** Allowed content types */
    allowedContentTypes?: string[];
    /** Maximum content length */
    maxContentLength?: number;
  };
}

/**
 * Stream conversion needs
 */
export interface StreamConversionNeeds {
  /** Whether conversion is needed */
  requiresConversion: boolean;
  /** Source format */
  sourceFormat: 'stream' | 'non-stream' | 'none';
  /** Target format */
  targetFormat: 'stream' | 'non-stream' | 'none';
  /** Conversion mode */
  conversionMode: 'stream-to-non-stream' | 'non-stream-to-stream' | 'none';
}

/**
 * Stream chunk structure
 */
export interface StreamChunk {
  /** Chunk identifier */
  id: string;
  /** Chunk data */
  data: any;
  /** Chunk index */
  index: number;
  /** Total chunks expected */
  totalChunks: number;
  /** Is last chunk */
  isLast: boolean;
  /** Chunk metadata */
  metadata?: any;
}

/**
 * Stream processing context
 */
export interface StreamProcessingContext {
  /** Context identifier */
  contextId: string;
  /** Original request/response */
  originalData: any;
  /** Processing start time */
  startTime: number;
  /** Current chunk index */
  currentChunk: number;
  /** Total chunks */
  totalChunks: number;
  /** Processing metadata */
  metadata: any;
}

export class WorkflowModule extends BasePipelineModule {
  protected override config: WorkflowConfig = {} as WorkflowConfig;
  private activeStreams: Map<string, StreamProcessingContext> = new Map();

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('WorkflowModule initialized', { module: this.moduleName }, 'constructor');
  }

  /**
   * Configure the Workflow module
   * @param config - Configuration object
   */
  override async configure(config: WorkflowConfig): Promise<void> {
    this.logInfo('Configuring WorkflowModule', config, 'configure');
    
    this.config = config;
    
    // Validate configuration
    this.validateConfig(config);
    
    await super.configure(config);
    this.logInfo('WorkflowModule configured successfully', config, 'configure');
  }

  /**
   * Process request - Handle stream/non-stream conversion
   * @param request - Input request data
   * @returns Promise<any> - Converted request data
   */
  override async process(request: any): Promise<any> {
    this.logInfo('Processing WorkflowModule request', {
      conversionMode: this.config?.conversionMode,
      enableStreamProcessing: this.config?.enableStreamProcessing,
      requestSize: JSON.stringify(request).length
    }, 'process');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(request, 'workflow-input', 'previous-module');
      
      // Validate configuration
      if (!this.config) {
        throw new Error('WorkflowModule not configured');
      }
      
      // Validate input data if validation is enabled
      if (this.config.validation) {
        await this.validateInputData(request);
      }
      
      // Check if stream conversion is needed
      const conversionNeeds = this.analyzeConversionNeeds(request);
      
      // Apply stream conversion if needed
      const convertedRequest = await this.applyStreamConversion(request, conversionNeeds);
      
      // Log output data at output port
      this.logOutputPort(convertedRequest, 'workflow-output', 'next-module');
      
      this.debug('debug', 'WorkflowModule request processing complete', { data: convertedRequest, processingTime: Date.now() - startTime }, 'process');
      
      return convertedRequest;
    } catch (error) {
      this.error('Error processing request', { error: error as Error, operation: 'process' }, 'process');
      throw error;
    }
  }

  /**
   * Process response - Handle stream/non-stream conversion for responses
   * @param response - Input response data
   * @returns Promise<any> - Converted response data
   */
  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing WorkflowModule response', {
      conversionMode: this.config?.conversionMode,
      enableStreamProcessing: this.config?.enableStreamProcessing,
      responseSize: JSON.stringify(response).length
    }, 'processResponse');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(response, 'workflow-response-input', 'previous-module');
      
      // Validate configuration
      if (!this.config) {
        throw new Error('WorkflowModule not configured');
      }
      
      // Check if stream conversion is needed for response
      const conversionNeeds = this.analyzeConversionNeeds(response);
      
      // Apply stream conversion if needed
      const convertedResponse = await this.applyStreamConversion(response, conversionNeeds);
      
      // Log output data at output port
      this.logOutputPort(convertedResponse, 'workflow-response-output', 'next-module');
      
      this.debug('debug', 'WorkflowModule response processing complete', { data: convertedResponse, processingTime: Date.now() - startTime }, 'processResponse');
      
      return convertedResponse;
    } catch (error) {
      this.error('Error processing response', { error: error as Error, operation: 'processResponse' }, 'processResponse');
      throw error;
    }
  }

  /**
   * Validate configuration
   * @param config - Configuration to validate
   */
  private validateConfig(config: WorkflowConfig): void {
    if (!config.conversionMode) {
      throw new Error('Conversion mode is required');
    }
    
    const validModes = ['stream-to-non-stream', 'non-stream-to-stream', 'none'];
    if (!validModes.includes(config.conversionMode)) {
      throw new Error(`Invalid conversion mode: ${config.conversionMode}`);
    }
    
    if (config.streamConfig?.chunkSize && config.streamConfig.chunkSize < 1) {
      throw new Error('Chunk size must be at least 1');
    }
    
    if (config.streamConfig?.streamDelay && config.streamConfig.streamDelay < 0) {
      throw new Error('Stream delay must be non-negative');
    }
  }

  /**
   * Analyze stream conversion needs
   * @param data - Data to analyze
   * @returns StreamConversionNeeds - Conversion requirements
   */
  private analyzeConversionNeeds(data: any): StreamConversionNeeds {
    const conversionMode = this.config?.conversionMode || 'none';
    
    switch (conversionMode) {
      case 'stream-to-non-stream':
        return {
          requiresConversion: this.isStreamData(data),
          sourceFormat: this.isStreamData(data) ? 'stream' : 'non-stream',
          targetFormat: 'non-stream',
          conversionMode: 'stream-to-non-stream'
        };
      
      case 'non-stream-to-stream':
        return {
          requiresConversion: !this.isStreamData(data),
          sourceFormat: this.isStreamData(data) ? 'stream' : 'non-stream',
          targetFormat: 'stream',
          conversionMode: 'non-stream-to-stream'
        };
      
      case 'none':
      default:
        return {
          requiresConversion: false,
          sourceFormat: this.isStreamData(data) ? 'stream' : 'non-stream',
          targetFormat: this.isStreamData(data) ? 'stream' : 'non-stream',
          conversionMode: 'none'
        };
    }
  }

  /**
   * Apply stream conversion
   * @param data - Data to convert
   * @param conversionNeeds - Conversion requirements
   * @returns Promise<any> - Converted data
   */
  private async applyStreamConversion(data: any, conversionNeeds: StreamConversionNeeds): Promise<any> {
    if (!conversionNeeds.requiresConversion) {
      this.logInfo('Stream conversion not required', conversionNeeds, 'applyStreamConversion');
      return data;
    }
    
    this.logInfo('Applying stream conversion', conversionNeeds, 'applyStreamConversion');
    
    switch (conversionNeeds.conversionMode) {
      case 'stream-to-non-stream':
        return await this.convertStreamToNonStream(data);
      
      case 'non-stream-to-stream':
        return await this.convertNonStreamToStream(data);
      
      default:
        return data;
    }
  }

  /**
   * Convert stream data to non-stream format
   * @param streamData - Stream data to convert
   * @returns Promise<any> - Non-stream data
   */
  private async convertStreamToNonStream(streamData: any): Promise<any> {
    this.logInfo('Converting stream to non-stream', { streamType: typeof streamData }, 'convertStreamToNonStream');
    
    // If data is already an array-like stream, collect it
    if (Array.isArray(streamData)) {
      return await this.processStreamChunks(streamData);
    }
    
    // If data is a stream object, process it
    if (this.isStreamData(streamData)) {
      return await this.processStreamObject(streamData);
    }
    
    // Return as-is if not stream data
    return streamData;
  }

  /**
   * Convert non-stream data to stream format
   * @param nonStreamData - Non-stream data to convert
   * @returns Promise<any> - Stream data
   */
  private async convertNonStreamToStream(nonStreamData: any): Promise<any> {
    this.logInfo('Converting non-stream to stream', { dataType: typeof nonStreamData }, 'convertNonStreamToStream');
    
    const streamConfig = this.config?.streamConfig || {};
    const chunkSize = streamConfig.chunkSize || 100;
    const streamDelay = streamConfig.streamDelay || 10;
    
    // Convert data to stream chunks
    const chunks = this.createStreamChunks(nonStreamData, chunkSize);
    
    // Simulate streaming with chunks
    const streamChunks: StreamChunk[] = chunks.map((chunk, index) => ({
      id: `chunk_${Date.now()}_${index}`,
      data: chunk,
      index,
      totalChunks: chunks.length,
      isLast: index === chunks.length - 1,
      metadata: {
        timestamp: Date.now() + (index * streamDelay),
        chunkSize: chunk.length
      }
    }));
    
    // Create stream processing context
    const contextId = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context: StreamProcessingContext = {
      contextId,
      originalData: nonStreamData,
      startTime: Date.now(),
      currentChunk: 0,
      totalChunks: streamChunks.length,
      metadata: {
        chunkSize,
        streamDelay,
        totalProcessed: 0
      }
    };
    
    // Store active stream context
    this.activeStreams.set(contextId, context);
    
    this.logInfo('Created stream context', {
      contextId,
      totalChunks: streamChunks.length,
      dataSize: JSON.stringify(nonStreamData).length
    }, 'convertNonStreamToStream');
    
    // Return stream data
    return {
      type: 'stream',
      chunks: streamChunks,
      contextId,
      metadata: {
        totalChunks: streamChunks.length,
        streamConfig
      }
    };
  }

  /**
   * Process stream chunks
   * @param chunks - Stream chunks to process
   * @returns Promise<any> - Combined data
   */
  private async processStreamChunks(chunks: any[]): Promise<any> {
    this.logInfo('Processing stream chunks', { chunkCount: chunks.length }, 'processStreamChunks');
    
    let combinedData: any = null;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Simulate streaming delay if configured
      if (this.config?.streamConfig?.streamDelay) {
        await this.delay(this.config.streamConfig.streamDelay);
      }
      
      // Process chunk
      const processedChunk = await this.processStreamChunk(chunk, i, chunks.length);
      
      // Combine with previous chunks
      if (combinedData === null) {
        combinedData = processedChunk;
      } else {
        combinedData = this.combineChunks(combinedData, processedChunk);
      }
    }
    
    return combinedData;
  }

  /**
   * Process stream object
   * @param streamObject - Stream object to process
   * @returns Promise<any> - Combined data
   */
  private async processStreamObject(streamObject: any): Promise<any> {
    this.logInfo('Processing stream object', { streamType: typeof streamObject }, 'processStreamObject');
    
    // Handle async generator or stream
    if (typeof streamObject[Symbol.asyncIterator] === 'function') {
      const chunks = [];
      for await (const chunk of streamObject) {
        chunks.push(chunk);
        
        // Simulate streaming delay if configured
        if (this.config?.streamConfig?.streamDelay) {
          await this.delay(this.config.streamConfig.streamDelay);
        }
      }
      
      return await this.processStreamChunks(chunks);
    }
    
    // Handle stream with on method (Node.js stream)
    if (typeof streamObject.on === 'function') {
      return await this.processNodeStream(streamObject);
    }
    
    // Return as-is if not recognized stream
    return streamObject;
  }

  /**
   * Process single stream chunk
   * @param chunk - Chunk to process
   * @param index - Chunk index
   * @param totalChunks - Total chunks expected
   * @returns Promise<any> - Processed chunk
   */
  private async processStreamChunk(chunk: any, index: number, totalChunks: number): Promise<any> {
    this.logInfo('Processing stream chunk', {
      chunkIndex: index,
      totalChunks,
      chunkSize: JSON.stringify(chunk).length
    }, 'processStreamChunk');
    
    // Process chunk data
    let processedChunk = chunk;
    
    // Apply chunk encoding if enabled
    if (this.config?.streamConfig?.enableChunkEncoding) {
      processedChunk = await this.encodeChunk(chunk, index, totalChunks);
    }
    
    return processedChunk;
  }

  /**
   * Create stream chunks from data
   * @param data - Data to chunk
   * @param chunkSize - Target chunk size
   * @returns any[] - Array of chunks
   */
  private createStreamChunks(data: any, chunkSize: number): any[] {
    this.logInfo('Creating stream chunks', { dataSize: JSON.stringify(data).length, chunkSize }, 'createStreamChunks');
    
    if (typeof data === 'string') {
      return this.chunkString(data, chunkSize);
    } else if (Array.isArray(data)) {
      return this.chunkArray(data, chunkSize);
    } else if (typeof data === 'object' && data !== null) {
      return this.chunkObject(data, chunkSize);
    } else {
      return [data];
    }
  }

  /**
   * Chunk string data
   * @param str - String to chunk
   * @param chunkSize - Chunk size
   * @returns string[] - Array of string chunks
   */
  private chunkString(str: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < str.length; i += chunkSize) {
      chunks.push(str.substring(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Chunk array data
   * @param arr - Array to chunk
   * @param chunkSize - Chunk size
   * @returns any[] - Array of array chunks
   */
  private chunkArray(arr: any[], chunkSize: number): any[] {
    const chunks: any[] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      chunks.push(arr.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Chunk object data
   * @param obj - Object to chunk
   * @param chunkSize - Chunk size (number of properties)
   * @returns any[] - Array of object chunks
   */
  private chunkObject(obj: any, chunkSize: number): any[] {
    const keys = Object.keys(obj);
    const chunks: any[] = [];
    
    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunkKeys = keys.slice(i, i + chunkSize);
      const chunk: any = {};
      chunkKeys.forEach(key => {
        chunk[key] = obj[key];
      });
      chunks.push(chunk);
    }
    
    return chunks;
  }

  /**
   * Combine chunks
   * @param chunk1 - First chunk
   * @param chunk2 - Second chunk
   * @returns any - Combined chunk
   */
  private combineChunks(chunk1: any, chunk2: any): any {
    if (typeof chunk1 === 'string' && typeof chunk2 === 'string') {
      return chunk1 + chunk2;
    } else if (Array.isArray(chunk1) && Array.isArray(chunk2)) {
      return [...chunk1, ...chunk2];
    } else if (typeof chunk1 === 'object' && typeof chunk2 === 'object' && chunk1 !== null && chunk2 !== null) {
      return { ...chunk1, ...chunk2 };
    } else {
      return [chunk1, chunk2];
    }
  }

  /**
   * Encode chunk (base64, encryption, etc.)
   * @param chunk - Chunk to encode
   * @param index - Chunk index
   * @param totalChunks - Total chunks
   * @returns Promise<any> - Encoded chunk
   */
  private async encodeChunk(chunk: any, index: number, totalChunks: number): Promise<any> {
    this.logInfo('Encoding chunk', { chunkIndex: index, totalChunks }, 'encodeChunk');
    
    // For now, just add metadata to chunk
    return {
      data: chunk,
      encoding: 'raw',
      index,
      totalChunks,
      timestamp: Date.now()
    };
  }

  /**
   * Process Node.js stream
   * @param stream - Node.js stream object
   * @returns Promise<any> - Combined data
   */
  private async processNodeStream(stream: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      
      stream.on('data', (chunk: any) => {
        this.logInfo('Received stream chunk', { chunkSize: chunk.length }, 'processNodeStream');
        chunks.push(chunk);
      });
      
      stream.on('end', async () => {
        try {
          const combinedData = await this.processStreamChunks(chunks);
          resolve(combinedData);
        } catch (error) {
          reject(error);
        }
      });
      
      stream.on('error', (error: Error) => {
        this.error('Error processing Node.js stream', { error, operation: 'processNodeStream' }, 'processNodeStream');
        reject(error);
      });
    });
  }

  /**
   * Check if data is stream data
   * @param data - Data to check
   * @returns boolean - Whether data is stream data
   */
  private isStreamData(data: any): boolean {
    if (!data) return false;
    
    // Check for array (stream chunks)
    if (Array.isArray(data)) return true;
    
    // Check for async iterable
    if (typeof data[Symbol.asyncIterator] === 'function') return true;
    
    // Check for Node.js stream
    if (typeof data.on === 'function' && typeof data.pipe === 'function') return true;
    
    // Check for stream object
    if (typeof data === 'object' && data.type === 'stream') return true;
    
    return false;
  }

  /**
   * Validate input data
   * @param data - Data to validate
   */
  private async validateInputData(data: any): Promise<void> {
    this.logInfo('Validating input data', { dataType: typeof data }, 'validateInputData');
    
    const validation = this.config?.validation;
    if (!validation) return;
    
    // Validate content type
    if (validation.allowedContentTypes) {
      const contentType = this.getContentType(data);
      if (!validation.allowedContentTypes.includes(contentType)) {
        throw new Error(`Content type not allowed: ${contentType}`);
      }
    }
    
    // Validate content length
    if (validation.maxContentLength) {
      const contentLength = JSON.stringify(data).length;
      if (contentLength > validation.maxContentLength) {
        throw new Error(`Content length exceeds maximum: ${contentLength} > ${validation.maxContentLength}`);
      }
    }
    
    // Additional validation logic can be added here
    if (validation.strictMode) {
      await this.strictValidation(data);
    }
  }

  /**
   * Get content type of data
   * @param data - Data to analyze
   * @returns string - Content type
   */
  private getContentType(data: any): string {
    if (typeof data === 'string') return 'text/plain';
    if (Array.isArray(data)) return 'application/array';
    if (typeof data === 'object' && data !== null) return 'application/json';
    return 'application/octet-stream';
  }

  /**
   * Strict validation
   * @param data - Data to validate
   */
  private async strictValidation(data: any): Promise<void> {
    // Add strict validation logic here
    this.logInfo('Applying strict validation', { dataType: typeof data }, 'strictValidation');
  }

  /**
   * Delay execution
   * @param ms - Milliseconds to delay
   * @returns Promise<void>
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}