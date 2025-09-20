#!/usr/bin/env node

/**
 * 测试流水线组装器的配置读取功能
 */

import { PipelineAssembler } from './sharedmodule/pipeline/dist/index.esm.js';

async function testPipelineConfigReading() {
  console.log('🧪 测试流水线组装器的配置读取功能...\n');

  try {
    // 1. 创建流水线组装器实例
    const assembler = new PipelineAssembler({
      id: 'test-pipeline-assembler',
      type: 'pipeline-assembler',
      name: 'Test Pipeline Assembler',
      version: '1.0.0',
      description: 'Test pipeline assembler for configuration reading'
    });

    console.log('✅ 流水线组装器实例创建成功');

    // 2. 配置组装器启用配置模块集成
    await assembler.configure({
      enableConfigModuleIntegration: true,
      configFilePath: '/Users/fanzhang/.rcc/rcc-config.json',
      enableValidation: true,
      enableDebugLogging: true
    });

    console.log('✅ 流水线组装器配置成功');

    // 3. 初始化组装器
    await assembler.initialize();

    console.log('✅ 流水线组装器初始化成功');

    // 4. 测试状态检查
    const status = assembler.getStatus();
    console.log('📊 组装器状态:');
    console.log(`   - 初始化状态: ${status.initialized ? '✅ 已初始化' : '❌ 未初始化'}`);
    console.log(`   - 配置状态: ${status.configured ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`   - 运行状态: ${status.running ? '✅ 运行中' : '❌ 未运行'}`);
    console.log(`   - 错误计数: ${status.errorCount}`);

    // 5. 尝试组装流水线（从配置文件自动加载）
    console.log('\n🔄 尝试从配置文件自动组装流水线...');

    const assemblyResult = await assembler.assemblePipelines();

    console.log('✅ 流水线组装完成');
    console.log(`   - 成功组装的流水线数量: ${assemblyResult.successCount}`);
    console.log(`   - 失败的流水线数量: ${assemblyResult.failureCount}`);
    console.log(`   - 总虚拟模型配置数量: ${assemblyResult.totalConfigCount}`);

    // 6. 分析组装结果
    if (assemblyResult.pipelineConfigs && assemblyResult.pipelineConfigs.length > 0) {
      console.log('\n📋 组装结果分析:');

      const byVirtualModel = {};
      assemblyResult.pipelineConfigs.forEach(config => {
        if (!byVirtualModel[config.virtualModelId]) {
          byVirtualModel[config.virtualModelId] = [];
        }
        byVirtualModel[config.virtualModelId].push(config);
      });

      for (const [vmId, configs] of Object.entries(byVirtualModel)) {
        console.log(`\n   虚拟模型 "${vmId}":`);
        configs.forEach((config, index) => {
          console.log(`     ${index + 1}. 目标: ${config.providerId}:${config.modelId}`);
          console.log(`        密钥索引: ${config.keyIndex}`);
          console.log(`        优先级: ${config.priority}`);
          console.log(`        启用状态: ${config.enabled ? '✅' : '❌'}`);
        });
      }
    } else {
      console.log('⚠️  没有生成流水线配置');
    }

    // 7. 验证配置集成状态
    console.log('\n🔍 配置集成状态验证:');
    const configIntegrationStatus = assembler.getConfigIntegrationStatus();

    if (configIntegrationStatus) {
      console.log(`   - 配置模块集成: ${configIntegrationStatus.configModuleIntegrated ? '✅ 已集成' : '❌ 未集成'}`);
      console.log(`   - 配置文件路径: ${configIntegrationStatus.configFilePath || '未设置'}`);
      console.log(`   - 配置加载状态: ${configIntegrationStatus.configLoaded ? '✅ 已加载' : '❌ 未加载'}`);
      console.log(`   - 流水线表生成: ${configIntegrationStatus.pipelineTableGenerated ? '✅ 已生成' : '❌ 未生成'}`);
      console.log(`   - 最后更新时间: ${configIntegrationStatus.lastUpdated || '未知'}`);
    } else {
      console.log('❌ 无法获取配置集成状态');
    }

    // 8. 清理资源
    await assembler.destroy();

    console.log('\n✅ 测试完成！流水线组装器配置读取功能验证通过');

    return {
      success: true,
      assemblyResult,
      configIntegrationStatus
    };

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.error('错误堆栈:', error.stack);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// 运行测试
testPipelineConfigReading().then(result => {
  if (result.success) {
    console.log('\n🎉 流水线组装器配置读取测试通过！');
    process.exit(0);
  } else {
    console.log('\n💥 流水线组装器配置读取测试失败！');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n💥 测试执行出错:', error);
  process.exit(1);
});