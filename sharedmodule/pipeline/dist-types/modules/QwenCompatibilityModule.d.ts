/**
 * Qwen Compatibility Module
 * Handles OpenAI ↔ Qwen protocol conversion using field mapping tables
 */
import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import { FieldMapping, CompatibilityConfig } from './CompatibilityModule';
/**
 * OpenAI Tool Call
 */
export interface OpenAIToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}
/**
 * OpenAI Tool
 */
export interface OpenAITool {
    type: 'function';
    function: {
        name: string;
        description?: string;
        parameters: {
            type: 'object';
            properties?: Record<string, any>;
            required?: string[];
        };
    };
}
/**
 * OpenAI Chat Completion Request with Tools
 */
export interface OpenAIChatRequest {
    model: string;
    messages: Array<{
        role: 'system' | 'user' | 'assistant' | 'tool';
        content?: string;
        name?: string;
        tool_call_id?: string;
        tool_calls?: OpenAIToolCall[];
    }>;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string | string[];
    stream?: boolean;
    n?: number;
    user?: string;
    tools?: OpenAITool[];
    tool_choice?: 'auto' | 'none' | 'required' | {
        type: 'function';
        function: {
            name: string;
        };
    };
}
/**
 * Qwen Tool Call
 */
export interface QwenToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}
/**
 * Qwen Tool
 */
export interface QwenTool {
    type: 'function';
    function: {
        name: string;
        description?: string;
        parameters: {
            type: 'object';
            properties?: Record<string, any>;
            required?: string[];
        };
    };
}
/**
 * Qwen Chat Completion Request
 */
export interface QwenChatRequest {
    model: string;
    input: {
        messages: Array<{
            role: 'system' | 'user' | 'assistant' | 'tool';
            content?: string;
            name?: string;
            tool_call_id?: string;
            tool_calls?: QwenToolCall[];
        }>;
    };
    parameters?: {
        temperature?: number;
        max_tokens?: number;
        top_p?: number;
        frequency_penalty?: number;
        presence_penalty?: number;
        stop?: string | string[];
    };
    stream?: boolean;
    user?: string;
    tools?: QwenTool[];
    tool_choice?: 'auto' | 'none' | 'required' | {
        type: 'function';
        function: {
            name: string;
        };
    };
}
/**
 * OpenAI Chat Completion Response
 */
export interface OpenAIChatResponse {
    id: string;
    object: 'chat.completion';
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: 'assistant';
            content?: string;
            tool_calls?: OpenAIToolCall[];
        };
        finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls';
        logprobs?: any;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
/**
 * Qwen Chat Completion Response
 */
export interface QwenChatResponse {
    request_id: string;
    output: {
        choices: Array<{
            message: {
                role: 'assistant';
                content?: string;
                tool_calls?: QwenToolCall[];
            };
            finish_reason: 'stop' | 'length' | 'tool_calls';
            index: number;
        }>;
    };
    usage?: {
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
    };
}
/**
 * Qwen Compatibility Module Configuration
 */
export interface QwenCompatibilityConfig extends CompatibilityConfig {
    /** Conversion direction */
    direction: 'openai-to-qwen' | 'qwen-to-openai' | 'bidirectional';
    /** Enable Qwen-specific optimizations */
    enableQwenOptimizations?: boolean;
    /** Model mapping configuration */
    modelMapping?: {
        /** Map OpenAI models to Qwen models */
        openaiToQwen?: Record<string, string>;
        /** Map Qwen models to OpenAI models */
        qwenToOpenai?: Record<string, string>;
    };
}
/**
 * Qwen Compatibility Module
 */
export declare class QwenCompatibilityModule extends BasePipelineModule {
    protected config: QwenCompatibilityConfig;
    private mappingTable;
    private fieldMappings;
    private reverseFieldMappings;
    private mappingValidationRules;
    constructor(info: ModuleInfo);
    /**
     * Initialize the compatibility module
     */
    initialize(): Promise<void>;
    /**
     * Validate configuration
     */
    private validateConfig;
    /**
     * Load mapping table
     */
    private loadMappingTable;
    /**
     * Get mapping table by name - load from JSON file
     */
    private getMappingTable;
    /**
     * Validate mapping table structure
     */
    private validateMappingTableStructure;
    /**
     * Process field mappings
     */
    private processFieldMappings;
    /**
     * Create transform function from JSON definition
     */
    private createTransformFunction;
    /**
     * Apply mapping transform
     */
    private applyMappingTransform;
    /**
     * Apply string transform
     */
    private applyStringTransform;
    /**
     * Apply array transform
     */
    private applyArrayTransform;
    /**
     * Apply object transform
     */
    private applyObjectTransform;
    /**
     * Apply function transform
     */
    private applyFunctionTransform;
    /**
     * Apply validation transform
     */
    private applyValidationTransform;
    /**
     * Apply field mapping helper for nested transforms
     */
    private applyFieldMappingHelper;
    /**
     * Convert OpenAI request to Qwen request using field mapping
     */
    convertOpenAIToQwen(openaiRequest: OpenAIChatRequest): QwenChatRequest;
    /**
     * Convert Qwen response to OpenAI response using field mapping
     */
    convertQwenToOpenAI(qwenResponse: QwenChatResponse, model: string): OpenAIChatResponse;
    /**
     * Apply field mapping to data
     */
    private applyFieldMapping;
    /**
     * Set nested value in object
     */
    private setNestedValue;
    /**
     * Validate field value
     */
    private validateFieldValue;
    /**
     * Model mapping helpers
     */
    private mapOpenAIModelToQwen;
    private mapQwenModelToOpenAI;
    /**
     * Tool conversion helpers
     */
    private convertOpenAIToolToQwen;
    private convertQwenToolToOpenAI;
    private convertOpenAIToolCallToQwen;
    private convertQwenToolCallToOpenAI;
    private convertOpenAIToolChoiceToQwen;
    /**
     * Message conversion helpers
     */
    private convertOpenAIMessageToQwen;
    private convertQwenMessageToOpenAI;
    /**
     * Finish reason mapping
     */
    private mapQwenFinishReason;
    /**
     * Process method - Required by BasePipelineModule
     */
    process(request: any): Promise<any>;
    /**
     * Process response method - Optional for BasePipelineModule
     */
    processResponse(response: any): Promise<any>;
    /**
     * Get compatibility module info
     */
    getCompatibilityInfo(): {
        direction: string;
        mappingTable: string;
        strictMapping: boolean;
        modelMappings: Record<string, string>;
        supportedConversions: string[];
    };
    /**
     * Get field mappings for inspection
     */
    getFieldMappings(): {
        openaiToQwen: Record<string, FieldMapping>;
        qwenToOpenAI: Record<string, FieldMapping>;
    };
    /**
     * Validation methods
     */
    validateOpenAIRequest(request: OpenAIChatRequest): ValidationResult;
    validateQwenResponse(response: QwenChatResponse): ValidationResult;
}
/**
 * Validation Result
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
//# sourceMappingURL=QwenCompatibilityModule.d.ts.map