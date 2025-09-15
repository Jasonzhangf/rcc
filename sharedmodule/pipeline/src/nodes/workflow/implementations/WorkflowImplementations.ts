import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../../modules/BasePipelineModule';
import { WorkflowConfig } from '../../../modules/WorkflowModule';

/**
 * Stream Converter Implementation
 * Converts between streaming and non-streaming formats
 */
export class StreamConverterModule extends BasePipelineModule {
  protected override config: WorkflowConfig = {} as WorkflowConfig;

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('StreamConverterModule initialized', { module: this.moduleName }, 'constructor');
  }

  override async configure(config: WorkflowConfig): Promise<void> {
    this.config = config;
    await super.configure(config);
    this.logInfo('StreamConverterModule configured', config, 'configure');
  }

  override async process(request: any): Promise<any> {
    this.logInfo('Converting stream format for request', request, 'process');
    
    const conversionMode = this.config.conversionMode;
    
    switch (conversionMode) {
      case 'stream-to-non-stream':
        return await this.convertStreamToNonStream(request);
      
      case 'non-stream-to-stream':
        return await this.convertNonStreamToStream(request);
      
      case 'none':
      default:
        return request; // Pass through
    }
  }

  override async processResponse(response: any): Promise<any> {
    this.logInfo('Converting stream format for response', response, 'processResponse');
    
    const conversionMode = this.config.conversionMode;
    
    switch (conversionMode) {
      case 'stream-to-non-stream':
        return await this.convertStreamToNonStream(response);
      
      case 'non-stream-to-stream':
        return await this.convertNonStreamToStream(response);
      
      case 'none':
      default:
        return response; // Pass through
    }
  }

  private async convertStreamToNonStream(streamData: any): Promise<any> {
    this.logInfo('Converting stream to non-stream', { dataType: typeof streamData }, 'convertStreamToNonStream');
    
    if (Array.isArray(streamData)) {
      // Collect all stream chunks
      const collectedData = streamData.reduce((acc, chunk) => {
        if (chunk && chunk.data) {
          return this.combineData(acc, chunk.data);
        }
        return this.combineData(acc, chunk);
      }, null);
      
      return collectedData;
    }
    
    // If it's already non-stream, return as-is
    return streamData;
  }

  private async convertNonStreamToStream(nonStreamData: any): Promise<any> {
    this.logInfo('Converting non-stream to stream', { dataType: typeof nonStreamData }, 'convertNonStreamToStream');
    
    const streamConfig = this.config.streamConfig || {};
    const chunkSize = streamConfig.chunkSize || 100;
    
    // Create stream chunks
    const chunks = this.createChunks(nonStreamData, chunkSize);
    
    return {
      type: 'stream',
      chunks: chunks.map((chunk, index) => ({
        id: `chunk_${Date.now()}_${index}`,
        data: chunk,
        index,
        totalChunks: chunks.length,
        isLast: index === chunks.length - 1,
        metadata: {
          timestamp: Date.now(),
          chunkSize: JSON.stringify(chunk).length
        }
      })),
      metadata: {
        totalChunks: chunks.length,
        originalSize: JSON.stringify(nonStreamData).length
      }
    };
  }

  private createChunks(data: any, chunkSize: number): any[] {
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

  private chunkString(str: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < str.length; i += chunkSize) {
      chunks.push(str.substring(i, i + chunkSize));
    }
    return chunks;
  }

  private chunkArray(arr: any[], chunkSize: number): any[] {
    const chunks: any[] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      chunks.push(arr.slice(i, i + chunkSize));
    }
    return chunks;
  }

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

  private combineData(data1: any, data2: any): any {
    if (data1 === null) return data2;
    if (data2 === null) return data1;
    
    if (typeof data1 === 'string' && typeof data2 === 'string') {
      return data1 + data2;
    } else if (Array.isArray(data1) && Array.isArray(data2)) {
      return [...data1, ...data2];
    } else if (typeof data1 === 'object' && typeof data2 === 'object' && data1 !== null && data2 !== null) {
      return { ...data1, ...data2 };
    } else {
      return [data1, data2];
    }
  }
}

/**
 * Batch Processor Implementation
 * Processes multiple requests in batch mode
 */
export class BatchProcessorModule extends BasePipelineModule {
  protected override config: WorkflowConfig = {} as WorkflowConfig;
  private batchQueue: any[] = [];
  private processingBatch: boolean = false;

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('BatchProcessorModule initialized', { module: this.moduleName }, 'constructor');
  }

  override async configure(config: WorkflowConfig): Promise<void> {
    this.config = config;
    await super.configure(config);
    this.logInfo('BatchProcessorModule configured', config, 'configure');
  }

  override async process(request: any): Promise<any> {
    this.logInfo('Processing request in batch mode', { 
      batchSize: Array.isArray(request) ? request.length : 1 
    }, 'process');
    
    // If request is already an array, process as batch
    if (Array.isArray(request)) {
      return await this.processBatch(request);
    }
    
    // Single request - add to batch queue
    this.batchQueue.push(request);
    
    // Process batch if we have enough items or if queue is getting large
    const batchSize = this.config.streamConfig?.chunkSize || 10;
    if (this.batchQueue.length >= batchSize || this.batchQueue.length > 50) {
      return await this.processBatchQueue();
    }
    
    // Return acknowledgment for single request
    return {
      status: 'queued',
      batchId: this.generateBatchId(),
      position: this.batchQueue.length
    };
  }

  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing batch response', response, 'processResponse');
    
    // Handle batch response
    if (response && response.batchId) {
      return await this.processBatchResponse(response);
    }
    
    // Handle individual response
    return response;
  }

  private async processBatch(batch: any[]): Promise<any> {
    this.logInfo('Processing batch', { batchSize: batch.length }, 'processBatch');
    
    const startTime = Date.now();
    const results: any[] = [];
    
    // Process each item in the batch
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      
      try {
        // Process individual item
        const result = await this.processBatchItem(item, i);
        results.push({
          success: true,
          data: result,
          index: i,
          processingTime: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          success: false,
          error: (error as Error).message,
          index: i,
          processingTime: Date.now() - startTime
        });
      }
    }
    
    const batchResult = {
      batchId: this.generateBatchId(),
      totalItems: batch.length,
      successfulItems: results.filter(r => r.success).length,
      failedItems: results.filter(r => !r.success).length,
      results,
      metadata: {
        processingTime: Date.now() - startTime,
        averageProcessingTime: (Date.now() - startTime) / batch.length
      }
    };
    
    this.logInfo('Batch processing complete', batchResult, 'processBatch');
    return batchResult;
  }

  private async processBatchQueue(): Promise<any> {
    if (this.processingBatch || this.batchQueue.length === 0) {
      return { status: 'no_batch_to_process' };
    }
    
    this.processingBatch = true;
    const batch = [...this.batchQueue];
    this.batchQueue = [];
    
    try {
      const result = await this.processBatch(batch);
      this.processingBatch = false;
      return result;
    } catch (error) {
      this.processingBatch = false;
      // Re-queue failed batch
      this.batchQueue.unshift(...batch);
      throw error;
    }
  }

  private async processBatchItem(item: any, index: number): Promise<any> {
    // Simulate processing delay for batch items
    const delay = this.config.streamConfig?.streamDelay || 1;
    if (delay > 0) {
      await this.delay(delay);
    }
    
    // Process the item (can be customized based on requirements)
    return {
      ...item,
      processed: true,
      timestamp: Date.now(),
      batchIndex: index
    };
  }

  private async processBatchResponse(response: any): Promise<any> {
    // Handle batch-specific response processing
    if (response.results && Array.isArray(response.results)) {
      // Extract successful results
      const successfulResults = response.results
        .filter((r: any) => r.success)
        .map((r: any) => r.data);
      
      return successfulResults.length === 1 ? successfulResults[0] : successfulResults;
    }
    
    return response;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Default Workflow Implementation
 * A flexible implementation that can handle various workflow processing tasks
 */
export class DefaultWorkflowModule extends BasePipelineModule {
  protected override config: WorkflowConfig = {} as WorkflowConfig;

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('DefaultWorkflowModule initialized', { module: this.moduleName }, 'constructor');
  }

  override async configure(config: WorkflowConfig): Promise<void> {
    this.config = config;
    await super.configure(config);
    this.logInfo('DefaultWorkflowModule configured', config, 'configure');
  }

  override async process(request: any): Promise<any> {
    this.logInfo('Processing request with default workflow', {
      conversionMode: this.config.conversionMode,
      enableStreamProcessing: this.config.enableStreamProcessing
    }, 'process');
    
    // Generic workflow processing logic
    switch (this.config.conversionMode) {
      case 'stream-to-non-stream':
        return await this.handleStreamToNonStream(request);
      
      case 'non-stream-to-stream':
        return await this.handleNonStreamToStream(request);
      
      case 'none':
      default:
        return await this.handlePassthrough(request);
    }
  }

  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing response with default workflow', {
      conversionMode: this.config.conversionMode,
      enableStreamProcessing: this.config.enableStreamProcessing
    }, 'processResponse');
    
    // Response processing logic (reverse of request processing)
    switch (this.config.conversionMode) {
      case 'stream-to-non-stream':
        return await this.handleStreamToNonStream(response);
      
      case 'non-stream-to-stream':
        return await this.handleNonStreamToStream(response);
      
      case 'none':
      default:
        return await this.handlePassthrough(response);
    }
  }

  private async handleStreamToNonStream(data: any): Promise<any> {
    if (Array.isArray(data)) {
      // Collect stream data
      return data.reduce((acc, item) => {
        if (item && item.data) {
          return this.combineData(acc, item.data);
        }
        return this.combineData(acc, item);
      }, null);
    }
    
    return data;
  }

  private async handleNonStreamToStream(data: any): Promise<any> {
    const chunkSize = this.config.streamConfig?.chunkSize || 100;
    const chunks = this.createChunks(data, chunkSize);
    
    return {
      type: 'stream',
      chunks: chunks.map((chunk, index) => ({
        id: `chunk_${Date.now()}_${index}`,
        data: chunk,
        index,
        totalChunks: chunks.length,
        isLast: index === chunks.length - 1
      }))
    };
  }

  private async handlePassthrough(data: any): Promise<any> {
    // Simple pass-through with metadata
    return {
      ...data,
      processedBy: 'DefaultWorkflowModule',
      timestamp: Date.now()
    };
  }

  private createChunks(data: any, chunkSize: number): any[] {
    if (typeof data === 'string') {
      const chunks: string[] = [];
      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.substring(i, i + chunkSize));
      }
      return chunks;
    }
    
    return [data];
  }

  private combineData(data1: any, data2: any): any {
    if (data1 === null) return data2;
    if (data2 === null) return data1;
    
    if (typeof data1 === 'string' && typeof data2 === 'string') {
      return data1 + data2;
    } else if (Array.isArray(data1) && Array.isArray(data2)) {
      return [...data1, ...data2];
    } else if (typeof data1 === 'object' && typeof data2 === 'object' && data1 !== null && data2 !== null) {
      return { ...data1, ...data2 };
    } else {
      return [data1, data2];
    }
  }
}