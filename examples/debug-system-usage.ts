/**
 * Debug System Usage Example
 * 展示如何使用新的调试系统
 */

import { BaseModule } from '../sharedmodule/basemodule';
import { DebugCenter } from '../sharedmodule/debug-center';
import { v4 as uuidv4 } from 'uuid';

// 示例流水线模块
class LLMSwitchModule extends BaseModule {
  constructor() {
    super({
      id: 'llmswitch-module',
      name: 'LLM Switch Module',
      version: '1.0.0',
      description: 'Converts Anthropic format to OpenAI format',
      type: 'transformer'
    });

    // 设置流水线位置
    this.setPipelinePosition('start');
  }

  async processAnthropicRequest(request: any): Promise<any> {
    const sessionId = uuidv4();

    // 开始流水线会话
    this.startPipelineSession(sessionId, {
      pipelineId: 'anthropic-processing-pipeline',
      startModule: 'llmswitch-module',
      middleModules: ['compatibility-module'],
      endModule: 'provider-module',
      recordingMode: 'unified'
    });

    // 开始跟踪操作
    this.startIOTracking('anthropic-conversion', request, 'processAnthropicRequest');

    try {
      // 模拟处理
      const convertedRequest = {
        model: 'gpt-3.5-turbo',
        messages: request.messages,
        temperature: request.temperature || 0.7
      };

      // 结束跟踪操作
      this.endIOTracking('anthropic-conversion', convertedRequest);

      // 结束会话
      this.endPipelineSession(sessionId, true);

      return convertedRequest;
    } catch (error) {
      // 结束跟踪操作（失败）
      this.endIOTracking('anthropic-conversion', null, false, error.message);

      // 结束会话（失败）
      this.endPipelineSession(sessionId, false);

      throw error;
    }
  }
}

class CompatibilityModule extends BaseModule {
  constructor() {
    super({
      id: 'compatibility-module',
      name: 'Compatibility Module',
      version: '1.0.0',
      description: 'Checks compatibility and applies transformations',
      type: 'validator'
    });

    this.setPipelinePosition('middle');
  }

  async validateRequest(request: any): Promise<any> {
    this.startIOTracking('compatibility-check', request, 'validateRequest');

    try {
      // 模拟兼容性检查
      const compatibilityResult = {
        isCompatible: true,
        appliedTransformations: [],
        warnings: []
      };

      this.endIOTracking('compatibility-check', compatibilityResult);
      return compatibilityResult;
    } catch (error) {
      this.endIOTracking('compatibility-check', null, false, error.message);
      throw error;
    }
  }
}

// 使用示例
async function exampleUsage() {
  // 创建调试中心
  const debugCenter = new DebugCenter({
    outputDirectory: './debug-logs',
    maxSessions: 100,
    retentionDays: 7,
    enableRealTimeUpdates: true
  });

  // 创建模块
  const llmSwitch = new LLMSwitchModule();
  const compatibility = new CompatibilityModule();

  // 设置会话ID以便模块之间共享
  const sessionId = uuidv4();
  llmSwitch.setCurrentSession(sessionId);
  compatibility.setCurrentSession(sessionId);

  try {
    // 模拟处理Anthropic请求
    const anthropicRequest = {
      model: 'claude-3-sonnet-20240229',
      messages: [
        {
          role: 'user',
          content: '列出本目录中所有文件夹'
        }
      ],
      temperature: 0.7
    };

    console.log('Processing Anthropic request...');

    // LLMSwitch处理
    const convertedRequest = await llmSwitch.processAnthropicRequest(anthropicRequest);
    console.log('Converted request:', convertedRequest);

    // 兼容性检查
    const compatibilityResult = await compatibility.validateRequest(convertedRequest);
    console.log('Compatibility result:', compatibilityResult);

    // 查看活动会话
    const activeSessions = debugCenter.getActiveSessions();
    console.log(`Active sessions: ${activeSessions.length}`);

    // 查看特定会话
    const session = debugCenter.getSession(sessionId);
    if (session) {
      console.log(`Session ${sessionId} has ${session.operations.length} operations`);
    }

  } catch (error) {
    console.error('Error in example:', error);
  } finally {
    // 清理资源
    await debugCenter.destroy();
  }
}

// 运行示例
if (require.main === module) {
  exampleUsage().catch(console.error);
}

export { LLMSwitchModule, CompatibilityModule, exampleUsage };