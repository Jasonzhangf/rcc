declare module 'rcc-pipeline' {
  import { ModuleInfo } from 'rcc-basemodule';

  export interface OpenAIChatRequest {
    model: string;
    messages: Array<{role: string; content: string}>;
    max_tokens?: number;
    temperature?: number;
  }

  export interface OpenAIChatResponse {
    id: string;
    object: string;
    created: number;
    choices: Array<{
      index: number;
      message: {role: string; content: string};
      finish_reason: string;
    }>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }

  export interface ChatMessage {
    role: string;
    content: string;
  }

  export interface ProviderConfig {
    name: string;
    apiKey?: string;
    baseUrl?: string;
    model: string;
  }

  export interface BaseProviderConfig {
    name: string;
    apiKey?: string;
    baseUrl?: string;
    model: string;
  }

  export class BaseProvider {
    constructor(config: BaseProviderConfig, moduleInfo: ModuleInfo);
    getId(): string;
    executeChat(request: OpenAIChatRequest): Promise<OpenAIChatResponse>;
  }

  export interface ErrorHandlerCenter {
    handleError(error: Error, context?: any): void;
  }

  export interface PipelineError {
    code: string;
    message: string;
    details?: any;
  }

  export interface PipelineErrorCode {
    UNKNOWN_ERROR: string;
    CONFIGURATION_ERROR: string;
    EXECUTION_ERROR: string;
  }

  export interface PipelineExecutionContext {
    pipelineId: string;
    instanceId: string;
    startTime: number;
  }

  export interface ErrorHandlingAction {
    type: 'retry' | 'fallback' | 'fail';
    maxRetries?: number;
    fallbackHandler?: string;
  }
}