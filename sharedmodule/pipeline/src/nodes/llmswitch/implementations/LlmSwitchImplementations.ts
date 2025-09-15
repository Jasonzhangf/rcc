import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../../modules/BasePipelineModule';
import { NodeImplementationInfo } from '../../../core/NodeImplementationInfo';
import { LLMSwitchConfig } from '../../../modules/LLMSwitchModule';

/**
 * OpenAI to Gemini Protocol Converter Implementation
 */
export class OpenAIToGeminiModule extends BasePipelineModule {
  protected override config: LLMSwitchConfig = {} as LLMSwitchConfig;

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('OpenAIToGeminiModule initialized', { module: this.moduleName }, 'constructor');
  }

  override async configure(config: LLMSwitchConfig): Promise<void> {
    this.config = config;
    await super.configure(config);
    this.logInfo('OpenAIToGeminiModule configured', config, 'configure');
  }

  override async process(request: any): Promise<any> {
    this.logInfo('Converting OpenAI request to Gemini format', request, 'process');
    
    // Convert OpenAI format to Gemini format
    const geminiRequest = {
      contents: this.convertMessagesToContents(request.messages || []),
      generationConfig: this.convertGenerationConfig(request),
      safetySettings: request.safetySettings || [],
      tools: this.convertTools(request.tools || [])
    };
    
    this.logInfo('OpenAI to Gemini conversion complete', geminiRequest, 'process');
    return geminiRequest;
  }

  override async processResponse(response: any): Promise<any> {
    this.logInfo('Converting Gemini response to OpenAI format', response, 'processResponse');
    
    // Convert Gemini format back to OpenAI format
    const openaiResponse = {
      id: response.candidates?.[0]?.content?.parts?.[0]?.functionCall?.name || `gemini-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: this.config.inputProtocol || 'gemini-pro',
      choices: [{
        index: 0,
        message: this.convertGeminiContentToMessage(response.candidates?.[0]?.content),
        finish_reason: this.convertFinishReason(response.candidates?.[0]?.finishReason)
      }],
      usage: this.convertUsage(response.usageMetadata)
    };
    
    this.logInfo('Gemini to OpenAI conversion complete', openaiResponse, 'processResponse');
    return openaiResponse;
  }

  private convertMessagesToContents(messages: any[]): any[] {
    return messages.map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{
        text: message.content
      }]
    }));
  }

  private convertGenerationConfig(request: any): any {
    return {
      temperature: request.temperature,
      topP: request.top_p,
      topK: request.top_k,
      maxOutputTokens: request.max_tokens
    };
  }

  private convertTools(tools: any[]): any {
    if (!tools.length) return undefined;
    
    return {
      functionDeclarations: tools.map(tool => tool.function)
    };
  }

  private convertGeminiContentToMessage(content: any): any {
    if (!content) {
      return { role: 'assistant', content: '' };
    }
    
    const parts = content.parts || [];
    const textParts = parts.filter((part: any) => part.text);
    const functionCalls = parts.filter((part: any) => part.functionCall);
    
    let content_value = '';
    let tool_calls: any[] = [];
    
    if (textParts.length > 0) {
      content_value = textParts.map((part: any) => part.text).join('');
    }
    
    if (functionCalls.length > 0) {
      tool_calls = functionCalls.map((call: any) => ({
        id: `call_${call.functionCall.name}_${Date.now()}`,
        type: 'function',
        function: {
          name: call.functionCall.name,
          arguments: JSON.stringify(call.functionCall.args || {})
        }
      }));
    }
    
    return {
      role: 'assistant',
      content: content_value,
      tool_calls: tool_calls.length > 0 ? tool_calls : undefined
    };
  }

  private convertFinishReason(finishReason?: string): string {
    const mapping: Record<string, string> = {
      'STOP': 'stop',
      'MAX_TOKENS': 'length',
      'SAFETY': 'content_filter',
      'RECITATION': 'content_filter'
    };
    return mapping[finishReason || ''] || 'stop';
  }

  private convertUsage(usageMetadata?: any): any {
    if (!usageMetadata) return undefined;
    
    return {
      prompt_tokens: usageMetadata.promptTokenCount,
      completion_tokens: usageMetadata.candidatesTokenCount,
      total_tokens: usageMetadata.totalTokenCount
    };
  }
}

/**
 * Gemini to OpenAI Protocol Converter Implementation
 */
export class GeminiToOpenAIModule extends BasePipelineModule {
  protected override config: LLMSwitchConfig = {} as LLMSwitchConfig;

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('GeminiToOpenAIModule initialized', { module: this.moduleName }, 'constructor');
  }

  override async configure(config: LLMSwitchConfig): Promise<void> {
    this.config = config;
    await super.configure(config);
    this.logInfo('GeminiToOpenAIModule configured', config, 'configure');
  }

  override async process(request: any): Promise<any> {
    this.logInfo('Converting Gemini request to OpenAI format', request, 'process');
    
    // Convert Gemini format to OpenAI format
    const openaiRequest = {
      model: this.config.outputProtocol || 'gpt-3.5-turbo',
      messages: this.convertContentsToMessages(request.contents || []),
      temperature: request.generationConfig?.temperature,
      top_p: request.generationConfig?.topP,
      max_tokens: request.generationConfig?.maxOutputTokens,
      tools: this.convertGeminiTools(request.tools),
      tool_choice: request.tool_choice
    };
    
    this.logInfo('Gemini to OpenAI conversion complete', openaiRequest, 'process');
    return openaiRequest;
  }

  override async processResponse(response: any): Promise<any> {
    this.logInfo('Converting OpenAI response to Gemini format', response, 'processResponse');
    
    // Convert OpenAI format back to Gemini format
    const geminiResponse = {
      candidates: [{
        content: this.convertMessageToGeminiContent(response.choices?.[0]?.message),
        finishReason: this.convertToGeminiFinishReason(response.choices?.[0]?.finish_reason),
        index: 0
      }],
      usageMetadata: this.convertToGeminiUsage(response.usage)
    };
    
    this.logInfo('OpenAI to Gemini conversion complete', geminiResponse, 'processResponse');
    return geminiResponse;
  }

  private convertContentsToMessages(contents: any[]): any[] {
    return contents.map(content => ({
      role: content.role === 'model' ? 'assistant' : 'user',
      content: content.parts?.[0]?.text || ''
    }));
  }

  private convertGeminiTools(tools?: any): any {
    if (!tools?.functionDeclarations) return undefined;
    
    return [{
      type: 'function',
      function: tools.functionDeclarations[0]
    }];
  }

  private convertMessageToGeminiContent(message?: any): any {
    if (!message) {
      return { role: 'model', parts: [{ text: '' }] };
    }
    
    const parts: any[] = [];
    
    if (message.content) {
      parts.push({ text: message.content });
    }
    
    if (message.tool_calls) {
      message.tool_calls.forEach((call: any) => {
        parts.push({
          functionCall: {
            name: call.function.name,
            args: JSON.parse(call.function.arguments || '{}')
          }
        });
      });
    }
    
    return {
      role: 'model',
      parts: parts.length > 0 ? parts : [{ text: '' }]
    };
  }

  private convertToGeminiFinishReason(finishReason?: string): string {
    const mapping: Record<string, string> = {
      'stop': 'STOP',
      'length': 'MAX_TOKENS',
      'content_filter': 'SAFETY'
    };
    return mapping[finishReason || ''] || 'STOP';
  }

  private convertToGeminiUsage(usage?: any): any {
    if (!usage) return undefined;
    
    return {
      promptTokenCount: usage.prompt_tokens,
      candidatesTokenCount: usage.completion_tokens,
      totalTokenCount: usage.total_tokens
    };
  }
}

/**
 * Default LLM Switch Implementation
 * A flexible implementation that can handle various protocol conversions
 */
export class DefaultLLMSwitchModule extends BasePipelineModule {
  protected override config: LLMSwitchConfig = {} as LLMSwitchConfig;

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('DefaultLLMSwitchModule initialized', { module: this.moduleName }, 'constructor');
  }

  override async configure(config: LLMSwitchConfig): Promise<void> {
    this.config = config;
    await super.configure(config);
    this.logInfo('DefaultLLMSwitchModule configured', config, 'configure');
  }

  override async process(request: any): Promise<any> {
    this.logInfo('Processing request with default LLM switch', {
      inputProtocol: this.config.inputProtocol,
      outputProtocol: this.config.outputProtocol
    }, 'process');
    
    // Generic protocol conversion logic
    if (this.config.inputProtocol === 'openai' && this.config.outputProtocol === 'gemini') {
      return this.convertOpenAIToGemini(request);
    } else if (this.config.inputProtocol === 'gemini' && this.config.outputProtocol === 'openai') {
      return this.convertGeminiToOpenAI(request);
    } else {
      // Pass through or apply generic transformation
      return this.genericTransform(request);
    }
  }

  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing response with default LLM switch', {
      inputProtocol: this.config.inputProtocol,
      outputProtocol: this.config.outputProtocol
    }, 'processResponse');
    
    // Reverse the conversion for response
    if (this.config.inputProtocol === 'openai' && this.config.outputProtocol === 'gemini') {
      return this.convertGeminiToOpenAI(response);
    } else if (this.config.inputProtocol === 'gemini' && this.config.outputProtocol === 'openai') {
      return this.convertOpenAIToGemini(response);
    } else {
      // Pass through or apply generic transformation
      return this.genericTransform(response);
    }
  }

  private convertOpenAIToGemini(request: any): any {
    // Simplified OpenAI to Gemini conversion
    return {
      contents: request.messages?.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })) || [],
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.max_tokens
      }
    };
  }

  private convertGeminiToOpenAI(request: any): any {
    // Simplified Gemini to OpenAI conversion
    return {
      model: 'gpt-3.5-turbo',
      messages: request.contents?.map((content: any) => ({
        role: content.role === 'model' ? 'assistant' : 'user',
        content: content.parts?.[0]?.text || ''
      })) || [],
      temperature: request.generationConfig?.temperature,
      max_tokens: request.generationConfig?.maxOutputTokens
    };
  }

  private genericTransform(data: any): any {
    // Generic transformation - can be extended for specific protocols
    this.logInfo('Applying generic transformation', data, 'genericTransform');
    return { ...data }; // Simple pass-through for now
  }
}