import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
/**
 * LLMSwitch Module - Protocol conversion and field mapping
 * Does NOT handle model mapping or routing as per requirements
 */
export interface LLMSwitchConfig {
    /** Input protocol type */
    inputProtocol: string;
    /** Output protocol type */
    outputProtocol: string;
    /** Transform table name */
    transformTable: string;
    /** Enable strict mode for validation */
    strictMode?: boolean;
    /** Caching configuration */
    caching?: {
        enabled: boolean;
        ttlMs?: number;
        maxSize?: number;
    };
}
/**
 * Transform mapping configuration
 */
export interface TransformMapping {
    /** Target field name */
    field: string;
    /** Transform function (optional) */
    transform?: (value: any, context?: any) => any;
    /** Default value if source field is missing */
    defaultValue?: any;
    /** Condition function to determine if mapping should be applied */
    condition?: (value: any) => boolean;
}
/**
 * Transform table structure
 */
export interface TransformTable {
    /** Version of the transform table */
    version: string;
    /** Description of the transform table */
    description: string;
    /** Protocol mapping information */
    protocols: {
        input: string;
        output: string;
    };
    /** Request mappings */
    requestMappings: Record<string, string | TransformMapping>;
    /** Response mappings */
    responseMappings: Record<string, string | TransformMapping>;
    /** Validation rules */
    validation?: {
        required?: string[];
        types?: Record<string, string>;
        ranges?: Record<string, {
            min?: number;
            max?: number;
        }>;
    };
}
export declare class LLMSwitchModule extends BasePipelineModule {
    protected config: LLMSwitchConfig;
    private transformTable;
    private requestCache;
    private responseCache;
    constructor(info: ModuleInfo);
    /**
     * Configure the LLMSwitch module
     * @param config - Configuration object
     */
    configure(config: LLMSwitchConfig): Promise<void>;
    /**
     * Process request - Core interface implementation
     * Converts input protocol to output protocol format
     * @param request - Input request in source protocol format
     * @returns Promise<any> - Transformed request in target protocol format
     */
    process(request: any): Promise<any>;
    /**
     * Process response - Handle response transformation
     * @param response - Response in target protocol format
     * @returns Promise<any> - Transformed response in source protocol format
     */
    processResponse(response: any): Promise<any>;
    /**
     * Load transform table
     * @param tableName - Name of the transform table to load
     */
    private loadTransformTable;
    /**
     * Get transform table by name - load from JSON file
     * @param tableName - Name of the transform table
     * @returns Promise<TransformTable> - Transform table
     */
    private getTransformTable;
    /**
     * Validate transform table structure
     * @param transformTable - Transform table to validate
     * @param tableName - Name of the transform table
     */
    private validateTransformTableStructure;
    /**
     * Apply request transformation
     * @param request - Input request
     * @returns Promise<any> - Transformed request
     */
    private applyRequestTransformation;
    /**
     * Apply response transformation
     * @param response - Input response
     * @returns Promise<any> - Transformed response
     */
    private applyResponseTransformation;
    /**
     * Validate transformed request
     * @param request - Transformed request to validate
     */
    private validateTransformedRequest;
    /**
     * Validate transformed response
     * @param response - Transformed response to validate
     */
    private validateTransformedResponse;
    /**
     * Get nested value from object using dot notation path
     * @param obj - Source object
     * @param path - Dot notation path (e.g., 'user.profile.name')
     * @returns any - Value at the path, or undefined if not found
     */
    private getNestedValue;
    /**
     * Set nested value in object using dot notation path
     * @param obj - Target object
     * @param path - Dot notation path (e.g., 'user.profile.name')
     * @param value - Value to set
     */
    private setNestedValue;
    /**
     * Generate cache key for request/response
     * @param data - Data to generate key for
     * @param type - Type of data ('request' or 'response')
     * @returns string - Cache key
     */
    private generateCacheKey;
    /**
     * Initialize cache
     */
    private initializeCache;
    /**
     * Cache request result
     * @param key - Cache key
     * @param result - Result to cache
     */
    private cacheRequestResult;
    /**
     * Cache response result
     * @param key - Cache key
     * @param result - Result to cache
     */
    private cacheResponseResult;
    /**
     * Cleanup expired cache entries
     */
    private cleanupCache;
    /**
     * Resolve transform function from string reference to actual function
     * @param transformRef - Transform function reference (string)
     * @param value - Value to transform
     * @param context - Transformation context
     * @returns Promise<any> - Transformed value
     */
    private resolveTransformFunction;
    /**
     * Apply mapping transform
     * @param value - Value to transform
     * @param config - Transform configuration
     * @returns any - Transformed value
     */
    private applyMappingTransform;
    /**
     * Apply generic transform
     * @param value - Value to transform
     * @param config - Transform configuration
     * @returns any - Transformed value
     */
    private applyGenericTransform;
    /**
     * Apply array transform
     * @param value - Value to transform
     * @param config - Transform configuration
     * @returns any - Transformed value
     */
    private applyArrayTransform;
    /**
     * Apply function transform
     * @param value - Value to transform
     * @param config - Transform configuration
     * @returns any - Transformed value
     */
    private applyFunctionTransform;
    /**
     * Convert OpenAI content to Gemini parts
     * @param content - OpenAI content
     * @returns any - Gemini parts format
     */
    private convertContentToGeminiParts;
    /**
     * Extract text from Gemini parts
     * @param parts - Gemini parts
     * @returns string - Extracted text
     */
    private extractTextFromGeminiParts;
}
