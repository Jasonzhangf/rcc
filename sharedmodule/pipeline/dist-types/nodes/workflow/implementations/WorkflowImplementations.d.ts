import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../../modules/BasePipelineModule';
import { WorkflowConfig } from '../../../modules/WorkflowModule';
/**
 * Stream Converter Implementation
 * Converts between streaming and non-streaming formats
 */
export declare class StreamConverterModule extends BasePipelineModule {
    protected config: WorkflowConfig;
    constructor(info: ModuleInfo);
    configure(config: WorkflowConfig): Promise<void>;
    process(request: any): Promise<any>;
    processResponse(response: any): Promise<any>;
    private convertStreamToNonStream;
    private convertNonStreamToStream;
    private createChunks;
    private chunkString;
    private chunkArray;
    private chunkObject;
    private combineData;
}
/**
 * Batch Processor Implementation
 * Processes multiple requests in batch mode
 */
export declare class BatchProcessorModule extends BasePipelineModule {
    protected config: WorkflowConfig;
    private batchQueue;
    private processingBatch;
    constructor(info: ModuleInfo);
    configure(config: WorkflowConfig): Promise<void>;
    process(request: any): Promise<any>;
    processResponse(response: any): Promise<any>;
    private processBatch;
    private processBatchQueue;
    private processBatchItem;
    private processBatchResponse;
    private generateBatchId;
    private delay;
}
/**
 * Default Workflow Implementation
 * A flexible implementation that can handle various workflow processing tasks
 */
export declare class DefaultWorkflowModule extends BasePipelineModule {
    protected config: WorkflowConfig;
    constructor(info: ModuleInfo);
    configure(config: WorkflowConfig): Promise<void>;
    process(request: any): Promise<any>;
    processResponse(response: any): Promise<any>;
    private handleStreamToNonStream;
    private handleNonStreamToStream;
    private handlePassthrough;
    private createChunks;
    private combineData;
}
//# sourceMappingURL=WorkflowImplementations.d.ts.map