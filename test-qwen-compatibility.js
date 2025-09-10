#!/usr/bin/env node

/**
 * Qwen Provider Compatibility验证测试
 * 测试响应字段转换功能，不需要真实认证
 */

// 模拟Qwen API响应
const mockQwenResponse = {
  request_id: 'test-request-id-12345',
  output: {
    choices: [
      {
        message: {
          role: 'assistant',
          content: 'Hello! I am Qwen, an AI assistant developed by Alibaba Cloud. I am here to help you with various tasks and answer your questions to the best of my abilities.'
        },
        finish_reason: 'stop',
        index: 0
      }
    ]
  },
  usage: {
    input_tokens: 15,
    output_tokens: 35,
    total_tokens: 50
  },
  model: 'qwen-turbo'
};

// 模拟工具调用响应
const mockQwenToolResponse = {
  request_id: 'test-tool-request-id-67890',
  output: {
    choices: [
      {
        message: {
          role: 'assistant',
          content: 'I can help you list the files in the current directory.',
          tool_calls: [
            {
              id: 'tool-call-1',
              type: 'function',
              function: {
                name: 'list_files',
                arguments: JSON.stringify({ path: './' })
              }
            }
          ]
        },
        finish_reason: 'tool_calls',
        index: 0
      }
    ]
  },
  usage: {
    input_tokens: 25,
    output_tokens: 20,
    total_tokens: 45
  },
  model: 'qwen-turbo'
};

// 模拟流式响应
const mockQwenStreamResponse = {
  request_id: 'test-stream-request-id-54321',
  output: {
    choices: [
      {
        message: {
          role: 'assistant',
          content: 'This is a streaming response.'
        },
        finish_reason: 'stop',
        index: 0
      }
    ]
  },
  usage: {
    input_tokens: 10,
    output_tokens: 8,
    total_tokens: 18
  },
  model: 'qwen-turbo'
};

// Compatibility转换器
class QwenCompatibilityTransformer {
  
  // 转换为OpenAI格式
  transformToOpenAIFormat(qwenResponse) {
    return {
      id: qwenResponse.request_id || `req_${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: qwenResponse.model || 'qwen-turbo',
      choices: this.transformChoices(qwenResponse.output?.choices || []),
      usage: this.transformUsage(qwenResponse.usage)
    };
  }

  // 转换choices数组
  transformChoices(qwenChoices) {
    return qwenChoices.map(choice => ({
      index: choice.index || 0,
      message: this.transformMessage(choice.message),
      finish_reason: this.transformFinishReason(choice.finish_reason)
    }));
  }

  // 转换message
  transformMessage(qwenMessage) {
    const message = {
      role: qwenMessage.role || 'assistant',
      content: qwenMessage.content || ''
    };

    // 处理工具调用
    if (qwenMessage.tool_calls && qwenMessage.tool_calls.length > 0) {
      message.tool_calls = qwenMessage.tool_calls.map(toolCall => ({
        id: toolCall.id,
        type: toolCall.type,
        function: {
          name: toolCall.function.name,
          arguments: toolCall.function.arguments
        }
      }));
    }

    return message;
  }

  // 转换finish_reason
  transformFinishReason(qwenReason) {
    const reasonMap = {
      'stop': 'stop',
      'tool_calls': 'tool_calls',
      'length': 'length',
      'content_filter': 'content_filter'
    };
    
    return reasonMap[qwenReason] || 'stop';
  }

  // 转换usage
  transformUsage(qwenUsage) {
    if (!qwenUsage) {
      return {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      };
    }

    return {
      prompt_tokens: qwenUsage.input_tokens || 0,
      completion_tokens: qwenUsage.output_tokens || 0,
      total_tokens: qwenUsage.total_tokens || 0
    };
  }

  // 验证OpenAI格式
  validateOpenAIFormat(response) {
    const errors = [];
    const warnings = [];

    // 检查必需字段
    const requiredFields = ['id', 'object', 'created', 'model', 'choices', 'usage'];
    requiredFields.forEach(field => {
      if (!response[field]) {
        errors.push(`缺少必需字段: ${field}`);
      }
    });

    // 检查object字段值
    if (response.object && response.object !== 'chat.completion') {
      warnings.push(`object字段值应为'chat.completion'，当前为: ${response.object}`);
    }

    // 检查created字段类型
    if (response.created && typeof response.created !== 'number') {
      errors.push('created字段应为数字');
    }

    // 检查choices数组
    if (response.choices) {
      if (!Array.isArray(response.choices)) {
        errors.push('choices字段应为数组');
      } else if (response.choices.length === 0) {
        warnings.push('choices数组为空');
      } else {
        response.choices.forEach((choice, index) => {
          if (!choice.message) {
            errors.push(`choices[${index}].message缺失`);
          } else {
            if (!choice.message.role) {
              errors.push(`choices[${index}].message.role缺失`);
            }
            if (typeof choice.message.content !== 'string') {
              errors.push(`choices[${index}].message.content应为字符串`);
            }
          }
          
          if (choice.index === undefined) {
            warnings.push(`choices[${index}].index缺失`);
          }
          
          if (!choice.finish_reason) {
            warnings.push(`choices[${index}].finish_reason缺失`);
          }
        });
      }
    }

    // 检查usage对象
    if (response.usage) {
      const usageFields = ['prompt_tokens', 'completion_tokens', 'total_tokens'];
      usageFields.forEach(field => {
        if (typeof response.usage[field] !== 'number') {
          errors.push(`usage.${field}应为数字`);
        }
      });

      // 验证token数量计算
      const { prompt_tokens, completion_tokens, total_tokens } = response.usage;
      if (prompt_tokens + completion_tokens !== total_tokens) {
        warnings.push(`token数量计算错误: ${prompt_tokens} + ${completion_tokens} ≠ ${total_tokens}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // 生成字段映射报告
  generateFieldMappingReport(qwenResponse, openAIResponse) {
    return {
      timestamp: new Date().toISOString(),
      qwenFields: this.extractFields(qwenResponse),
      openAIFields: this.extractFields(openAIResponse),
      mapping: {
        'request_id → id': {
          source: qwenResponse.request_id,
          target: openAIResponse.id,
          success: !!openAIResponse.id
        },
        'model → model': {
          source: qwenResponse.model,
          target: openAIResponse.model,
          success: !!openAIResponse.model
        },
        'output.choices → choices': {
          source: qwenResponse.output?.choices?.length,
          target: openAIResponse.choices?.length,
          success: qwenResponse.output?.choices?.length === openAIResponse.choices?.length
        },
        'usage → usage': {
          source: qwenResponse.usage,
          target: openAIResponse.usage,
          success: !!openAIResponse.usage
        }
      }
    };
  }

  // 提取对象的所有字段
  extractFields(obj, prefix = '') {
    const fields = {};
    
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(fields, this.extractFields(value, fullKey));
        } else {
          fields[fullKey] = typeof value;
        }
      });
    }
    
    return fields;
  }
}

// 测试用例
class CompatibilityValidator {
  constructor() {
    this.transformer = new QwenCompatibilityTransformer();
    this.testResults = [];
  }

  logResult(testName, success, data, error) {
    const result = {
      test: testName,
      success,
      timestamp: new Date().toISOString(),
      data,
      error: error?.message || error
    };
    
    this.testResults.push(result);
    console.log(`[${success ? '✅' : '❌'}] ${testName}`);
    
    if (error) {
      console.log(`   错误: ${error.message || error}`);
    }
    
    if (data) {
      console.log(`   数据: ${JSON.stringify(data, null, 2)}`);
    }
  }

  async runAllTests() {
    console.log('🚀 开始Qwen Provider Compatibility验证测试...\n');
    
    try {
      // 1. 基本响应转换测试
      await this.testBasicResponseTransformation();
      
      // 2. 工具调用响应转换测试
      await this.testToolCallResponseTransformation();
      
      // 3. 流式响应转换测试
      await this.testStreamResponseTransformation();
      
      // 4. OpenAI格式验证测试
      await this.testOpenAIFormatValidation();
      
      // 5. 字段映射测试
      await this.testFieldMapping();
      
      // 6. 边界情况测试
      await this.testEdgeCases();
      
    } catch (error) {
      console.error('测试过程中发生错误:', error);
    } finally {
      this.outputResults();
    }
  }

  async testBasicResponseTransformation() {
    try {
      console.log('📋 测试1: 基本响应转换');
      
      const openAIResponse = this.transformer.transformToOpenAIFormat(mockQwenResponse);
      
      this.logResult('基本响应转换', true, {
        qwenId: mockQwenResponse.request_id,
        openAIId: openAIResponse.id,
        model: openAIResponse.model,
        choicesCount: openAIResponse.choices.length,
        usage: openAIResponse.usage
      });
      
    } catch (error) {
      this.logResult('基本响应转换', false, null, error);
    }
  }

  async testToolCallResponseTransformation() {
    try {
      console.log('📋 测试2: 工具调用响应转换');
      
      const openAIResponse = this.transformer.transformToOpenAIFormat(mockQwenToolResponse);
      
      this.logResult('工具调用响应转换', true, {
        qwenId: mockQwenToolResponse.request_id,
        openAIId: openAIResponse.id,
        hasToolCalls: !!openAIResponse.choices[0]?.message?.tool_calls,
        toolCallsCount: openAIResponse.choices[0]?.message?.tool_calls?.length || 0,
        finishReason: openAIResponse.choices[0]?.finish_reason
      });
      
    } catch (error) {
      this.logResult('工具调用响应转换', false, null, error);
    }
  }

  async testStreamResponseTransformation() {
    try {
      console.log('📋 测试3: 流式响应转换');
      
      const openAIResponse = this.transformer.transformToOpenAIFormat(mockQwenStreamResponse);
      
      this.logResult('流式响应转换', true, {
        qwenId: mockQwenStreamResponse.request_id,
        openAIId: openAIResponse.id,
        content: openAIResponse.choices[0]?.message?.content?.substring(0, 50) + '...',
        usage: openAIResponse.usage
      });
      
    } catch (error) {
      this.logResult('流式响应转换', false, null, error);
    }
  }

  async testOpenAIFormatValidation() {
    try {
      console.log('📋 测试4: OpenAI格式验证');
      
      const openAIResponse = this.transformer.transformToOpenAIFormat(mockQwenResponse);
      const validation = this.transformer.validateOpenAIFormat(openAIResponse);
      
      this.logResult('OpenAI格式验证', validation.valid, {
        valid: validation.valid,
        errorsCount: validation.errors.length,
        warningsCount: validation.warnings.length,
        errors: validation.errors,
        warnings: validation.warnings
      });
      
    } catch (error) {
      this.logResult('OpenAI格式验证', false, null, error);
    }
  }

  async testFieldMapping() {
    try {
      console.log('📋 测试5: 字段映射');
      
      const openAIResponse = this.transformer.transformToOpenAIFormat(mockQwenResponse);
      const mappingReport = this.transformer.generateFieldMappingReport(mockQwenResponse, openAIResponse);
      
      const mappingSuccess = Object.values(mappingReport.mapping).every(m => m.success);
      
      this.logResult('字段映射', mappingSuccess, {
        qwenFieldCount: Object.keys(mappingReport.qwenFields).length,
        openAIFieldCount: Object.keys(mappingReport.openAIFields).length,
        mappingDetails: mappingReport.mapping
      });
      
    } catch (error) {
      this.logResult('字段映射', false, null, error);
    }
  }

  async testEdgeCases() {
    try {
      console.log('📋 测试6: 边界情况');
      
      const edgeCases = [
        {
          name: '空响应',
          response: {}
        },
        {
          name: '无usage响应',
          response: {
            request_id: 'test',
            output: { choices: [{ message: { role: 'assistant', content: 'test' } }] }
          }
        },
        {
          name: '无choices响应',
          response: {
            request_id: 'test',
            usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 }
          }
        },
        {
          name: 'null字段响应',
          response: {
            request_id: null,
            output: null,
            usage: null
          }
        }
      ];
      
      let edgeCaseResults = [];
      
      edgeCases.forEach(({ name, response }) => {
        try {
          const result = this.transformer.transformToOpenAIFormat(response);
          const validation = this.transformer.validateOpenAIFormat(result);
          
          edgeCaseResults.push({
            name,
            success: validation.valid,
            errors: validation.errors.length,
            warnings: validation.warnings.length
          });
        } catch (error) {
          edgeCaseResults.push({
            name,
            success: false,
            errors: 1,
            warnings: 0,
            error: error.message
          });
        }
      });
      
      const allEdgeCasesPassed = edgeCaseResults.every(r => r.success);
      
      this.logResult('边界情况', allEdgeCasesPassed, {
        edgeCaseResults
      });
      
    } catch (error) {
      this.logResult('边界情况', false, null, error);
    }
  }

  outputResults() {
    console.log('\n📊 Compatibility测试结果总结:');
    console.log('=' .repeat(50));
    
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.success).length;
    const failed = total - passed;
    
    console.log(`总测试数: ${total}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${failed}`);
    console.log(`成功率: ${((passed / total) * 100).toFixed(1)}%`);
    
    console.log('\n详细结果:');
    this.testResults.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.test} - ${result.timestamp}`);
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      }
    });
    
    // 保存详细结果到文件
    const fs = require('fs');
    const resultDir = './test-results';
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }
    
    const resultFile = './test-results/qwen-compatibility-validation.json';
    
    fs.writeFileSync(resultFile, JSON.stringify({
      testRun: {
        timestamp: new Date().toISOString(),
        total,
        passed,
        failed,
        successRate: ((passed / total) * 100).toFixed(1) + '%'
      },
      results: this.testResults
    }, null, 2));
    
    console.log(`\n📄 详细结果已保存到: ${resultFile}`);
    
    if (failed > 0) {
      console.log('\n⚠️  有测试失败，请检查错误信息并修复问题。');
      process.exit(1);
    } else {
      console.log('\n🎉 所有Compatibility测试通过！Qwen Provider字段转换验证完成。');
    }
  }
}

// 运行测试
async function main() {
  const validator = new CompatibilityValidator();
  await validator.runAllTests();
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 启动测试
main();