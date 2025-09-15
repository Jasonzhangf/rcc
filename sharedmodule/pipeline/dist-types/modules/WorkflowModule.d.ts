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
export declare class WorkflowModule extends BasePipelineModule {
    protected config: WorkflowConfig;
    private activeStreams;
    constructor(info: ModuleInfo);
    /**
     * Configure the Workflow module
     * @param config - Configuration object
     */
    configure(config: WorkflowConfig): Promise<void>;
    /**
     * Process request - Handle stream/non-stream conversion
     * @param request - Input request data
     * @returns Promise<any> - Converted request data
     */
    process(request: any): Promise<any>;
    /**
     * Process response - Handle stream/non-stream conversion for responses
     * @param response - Input response data
     * @returns Promise<any> - Converted response data
     */
    processResponse(response: any): Promise<any>;
    /**
     * Validate configuration
     * @param config - Configuration to validate
     */
    private validateConfig;
    /**
     * Analyze stream conversion needs
     * @param data - Data to analyze
     * @returns StreamConversionNeeds - Conversion requirements
     */
    private analyzeConversionNeeds;
    /**
     * Apply stream conversion
     * @param data - Data to convert
     * @param conversionNeeds - Conversion requirements
     * @returns Promise<any> - Converted data
     */
    private applyStreamConversion;
    /**
     * Convert stream data to non-stream format
     * @param streamData - Stream data to convert
     * @returns Promise<any> - Non-stream data
     */
    private convertStreamToNonStream;
    /**
     * Convert non-stream data to stream format
     * @param nonStreamData - Non-stream data to convert
     * @returns Promise<any> - Stream data
     */
    private convertNonStreamToStream;
    /**
     * Process stream chunks
     * @param chunks - Stream chunks to process
     * @returns Promise<any> - Combined data
     */
    private processStreamChunks;
    /**
     * Process stream object
     * @param streamObject - Stream object to process
     * @returns Promise<any> - Combined data
     */
    private processStreamObject;
    /**
     * Process single stream chunk
     * @param chunk - Chunk to process
     * @param index - Chunk index
     * @param totalChunks - Total chunks expected
     * @returns Promise<any> - Processed chunk
     */
    private processStreamChunk;
    /**
     * Create stream chunks from data
     * @param data - Data to chunk
     * @param chunkSize - Target chunk size
     * @returns any[] - Array of chunks
     */
    private createStreamChunks;
    /**
     * Chunk string data
     * @param str - String to chunk
     * @param chunkSize - Chunk size
     * @returns string[] - Array of string chunks
     */
    private chunkString;
    /**
     * Chunk array data
     * @param arr - Array to chunk
     * @param chunkSize - Chunk size
     * @returns any[] - Array of array chunks
     */
    private chunkArray;
    /**
     * Chunk object data
     * @param obj - Object to chunk
     * @param chunkSize - Chunk size (number of properties)
     * @returns any[] - Array of object chunks
     */
    private chunkObject;
    /**
     * Combine chunks
     * @param chunk1 - First chunk
     * @param chunk2 - Second chunk
     * @returns any - Combined chunk
     */
    private combineChunks;
    /**
     * Encode chunk (base64, encryption, etc.)
     * @param chunk - Chunk to encode
     * @param index - Chunk index
     * @param totalChunks - Total chunks
     * @returns Promise<any> - Encoded chunk
     */
    private encodeChunk;
    /**
     * Process Node.js stream
     * @param stream - Node.js stream object
     * @returns Promise<any> - Combined data
     */
    private processNodeStream;
    /**
     * Check if data is stream data
     * @param data - Data to check
     * @returns boolean - Whether data is stream data
     */
    private isStreamData;
    /**
     * Validate input data
     * @param data - Data to validate
     */
    private validateInputData;
    /**
     * Get content type of data
     * @param data - Data to analyze
     * @returns string - Content type
     */
    private getContentType;
    /**
     * Strict validation
     * @param data - Data to validate
     */
    private strictValidation;
    /**
     * Delay execution
     * @param ms - Milliseconds to delay
     * @returns Promise<void>
     */
    private delay;
}
//# sourceMappingURL=WorkflowModule.d.ts.map