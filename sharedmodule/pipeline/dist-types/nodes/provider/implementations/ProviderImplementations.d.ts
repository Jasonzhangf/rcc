import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../../modules/BasePipelineModule';
import { ProviderConfig } from '../../../modules/ProviderModule';
import { AxiosInstance } from 'axios';
/**
 * OpenAI Provider Implementation
 */
export declare class OpenAIProviderModule extends BasePipelineModule {
    protected config: ProviderConfig;
    protected httpClient: AxiosInstance;
    constructor(info: ModuleInfo);
    configure(config: ProviderConfig): Promise<void>;
    process(request: any): Promise<any>;
    processResponse(response: any): Promise<any>;
    private processOpenAIResponse;
}
/**
 * Gemini Provider Implementation
 */
export declare class GeminiProviderModule extends BasePipelineModule {
    protected config: ProviderConfig;
    protected httpClient: AxiosInstance;
    constructor(info: ModuleInfo);
    configure(config: ProviderConfig): Promise<void>;
    process(request: any): Promise<any>;
    processResponse(response: any): Promise<any>;
    private processGeminiResponse;
}
/**
 * Qwen Provider Implementation
 */
export declare class QwenProviderModule extends BasePipelineModule {
    protected config: ProviderConfig;
    protected httpClient: AxiosInstance;
    private tokenCache;
    constructor(info: ModuleInfo);
    configure(config: ProviderConfig): Promise<void>;
    process(request: any): Promise<any>;
    processResponse(response: any): Promise<any>;
    private getAuthToken;
    private isTokenValid;
    private processQwenResponse;
}
/**
 * Default Provider Implementation
 * A flexible implementation that can handle various HTTP-based providers
 */
export declare class DefaultProviderModule extends BasePipelineModule {
    protected config: ProviderConfig;
    protected httpClient: AxiosInstance;
    constructor(info: ModuleInfo);
    configure(config: ProviderConfig): Promise<void>;
    process(request: any): Promise<any>;
    processResponse(response: any): Promise<any>;
    private processDefaultResponse;
}
//# sourceMappingURL=ProviderImplementations.d.ts.map