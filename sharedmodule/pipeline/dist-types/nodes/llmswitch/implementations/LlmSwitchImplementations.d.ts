import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../../modules/BasePipelineModule';
import { LLMSwitchConfig } from '../../../modules/LLMSwitchModule';
/**
 * OpenAI to Gemini Protocol Converter Implementation
 */
export declare class OpenAIToGeminiModule extends BasePipelineModule {
    protected config: LLMSwitchConfig;
    constructor(info: ModuleInfo);
    configure(config: LLMSwitchConfig): Promise<void>;
    process(request: any): Promise<any>;
    processResponse(response: any): Promise<any>;
    private convertMessagesToContents;
    private convertGenerationConfig;
    private convertTools;
    private convertGeminiContentToMessage;
    private convertFinishReason;
    private convertUsage;
}
/**
 * Gemini to OpenAI Protocol Converter Implementation
 */
export declare class GeminiToOpenAIModule extends BasePipelineModule {
    protected config: LLMSwitchConfig;
    constructor(info: ModuleInfo);
    configure(config: LLMSwitchConfig): Promise<void>;
    process(request: any): Promise<any>;
    processResponse(response: any): Promise<any>;
    private convertContentsToMessages;
    private convertGeminiTools;
    private convertMessageToGeminiContent;
    private convertToGeminiFinishReason;
    private convertToGeminiUsage;
}
/**
 * Default LLM Switch Implementation
 * A flexible implementation that can handle various protocol conversions
 */
export declare class DefaultLLMSwitchModule extends BasePipelineModule {
    protected config: LLMSwitchConfig;
    constructor(info: ModuleInfo);
    configure(config: LLMSwitchConfig): Promise<void>;
    process(request: any): Promise<any>;
    processResponse(response: any): Promise<any>;
    private convertOpenAIToGemini;
    private convertGeminiToOpenAI;
    private genericTransform;
}
//# sourceMappingURL=LlmSwitchImplementations.d.ts.map