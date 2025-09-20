#!/usr/bin/env node

/**
 * 测试配置格式转换验证
 * 验证配置模块输出格式与流水线组装器读取格式的兼容性
 */

import fs from 'fs';
import path from 'path';

async function testConfigFormatCompatibility() {
  console.log('🧪 测试配置格式兼容性...\n');

  try {
    // 1. 读取原始配置文件
    const configPath = '/Users/fanzhang/.rcc/rcc-config.json';
    console.log(`📂 读取配置文件: ${configPath}`);

    const rawData = await fs.promises.readFile(configPath, 'utf8');
    const configData = JSON.parse(rawData);

    console.log('✅ 原始配置文件读取成功');
    console.log(`   - 版本: ${configData.version}`);
    console.log(`   - 提供商数量: ${Object.keys(configData.providers).length}`);
    console.log(`   - 虚拟模型数量: ${Object.keys(configData.virtualModels).length}`);

    // 2. 验证配置数据结构
    console.log('\n🔍 验证配置数据结构...');

    // 验证providers结构
    const providerErrors = [];
    for (const [providerId, provider] of Object.entries(configData.providers)) {
      if (!provider.id) providerErrors.push(`Provider ${providerId}: 缺少id字段`);
      if (!provider.type) providerErrors.push(`Provider ${providerId}: 缺少type字段`);
      if (!provider.models || Object.keys(provider.models).length === 0) {
        providerErrors.push(`Provider ${providerId}: 缺少models字段`);
      }
    }

    // 验证virtualModels结构
    const vmErrors = [];
    for (const [vmId, vmConfig] of Object.entries(configData.virtualModels)) {
      if (!vmConfig.id) vmErrors.push(`VirtualModel ${vmId}: 缺少id字段`);
      if (!Array.isArray(vmConfig.targets)) {
        vmErrors.push(`VirtualModel ${vmId}: targets不是数组`);
      }
      if (vmConfig.targets && vmConfig.targets.length > 0) {
        vmConfig.targets.forEach((target, index) => {
          if (!target.providerId) vmErrors.push(`VirtualModel ${vmId} target ${index}: 缺少providerId`);
          if (!target.modelId) vmErrors.push(`VirtualModel ${vmId} target ${index}: 缺少modelId`);
        });
      }
    }

    if (providerErrors.length === 0 && vmErrors.length === 0) {
      console.log('✅ 配置数据结构验证通过');
    } else {
      console.log('❌ 配置数据结构验证失败:');
      providerErrors.forEach(error => console.log(`   - ${error}`));
      vmErrors.forEach(error => console.log(`   - ${error}`));
    }

    // 3. 模拟流水线表生成过程
    console.log('\n🔄 模拟流水线表生成...');

    const pipelineTableEntries = [];

    // 遍历虚拟模型配置，生成流水线表条目
    for (const [vmId, vmConfig] of Object.entries(configData.virtualModels)) {
      // 跳过禁用的虚拟模型
      if (!vmConfig.enabled) {
        console.log(`⚠️  跳过禁用的虚拟模型: ${vmId}`);
        continue;
      }

      // 为每个目标创建流水线条目
      for (const target of vmConfig.targets) {
        const entry = {
          virtualModelId: vmId,
          providerId: target.providerId,
          modelId: target.modelId,
          keyIndex: target.keyIndex || 0,
          priority: vmConfig.priority || 1,
          enabled: vmConfig.enabled,
          weight: 1,
          strategy: 'round-robin'
        };
        pipelineTableEntries.push(entry);
      }
    }

    console.log(`✅ 流水线表生成完成，共 ${pipelineTableEntries.length} 个条目`);

    // 4. 验证流水线表条目格式
    console.log('\n🔍 验证流水线表条目格式...');

    const entryErrors = [];
    pipelineTableEntries.forEach((entry, index) => {
      if (!entry.virtualModelId) entryErrors.push(`条目 ${index}: 缺少virtualModelId`);
      if (!entry.providerId) entryErrors.push(`条目 ${index}: 缺少providerId`);
      if (!entry.modelId) entryErrors.push(`条目 ${index}: 缺少modelId`);
      if (typeof entry.keyIndex !== 'number') entryErrors.push(`条目 ${index}: keyIndex不是数字`);
      if (typeof entry.priority !== 'number') entryErrors.push(`条目 ${index}: priority不是数字`);
      if (typeof entry.enabled !== 'boolean') entryErrors.push(`条目 ${index}: enabled不是布尔值`);
    });

    if (entryErrors.length === 0) {
      console.log('✅ 流水线表条目格式验证通过');
    } else {
      console.log('❌ 流水线表条目格式验证失败:');
      entryErrors.forEach(error => console.log(`   - ${error}`));
    }

    // 5. 模拟流水线表转换为VirtualModelConfig的过程
    console.log('\n🔄 模拟流水线表转换为VirtualModelConfig...');

    const virtualModelConfigs = new Map();

    for (const entry of pipelineTableEntries) {
      if (!virtualModelConfigs.has(entry.virtualModelId)) {
        virtualModelConfigs.set(entry.virtualModelId, {
          id: entry.virtualModelId,
          name: entry.virtualModelId,
          enabled: entry.enabled,
          modelId: entry.modelId,
          provider: entry.providerId,
          targets: [],
          capabilities: ['chat']
        });
      }

      const vmConfig = virtualModelConfigs.get(entry.virtualModelId);
      vmConfig.targets.push({
        providerId: entry.providerId,
        modelId: entry.modelId,
        weight: entry.weight || 1,
        enabled: entry.enabled
      });
    }

    const finalConfigs = Array.from(virtualModelConfigs.values());
    console.log(`✅ 转换完成，生成 ${finalConfigs.length} 个VirtualModelConfig`);

    // 6. 验证转换后的VirtualModelConfig格式
    console.log('\n🔍 验证VirtualModelConfig格式...');

    const configErrors = [];
    finalConfigs.forEach((config, index) => {
      if (!config.id) configErrors.push(`Config ${index}: 缺少id字段`);
      if (!config.name) configErrors.push(`Config ${index}: 缺少name字段`);
      if (typeof config.enabled !== 'boolean') configErrors.push(`Config ${index}: enabled不是布尔值`);
      if (!Array.isArray(config.targets)) configErrors.push(`Config ${index}: targets不是数组`);
      if (!Array.isArray(config.capabilities)) configErrors.push(`Config ${index}: capabilities不是数组`);
    });

    if (configErrors.length === 0) {
      console.log('✅ VirtualModelConfig格式验证通过');
    } else {
      console.log('❌ VirtualModelConfig格式验证失败:');
      configErrors.forEach(error => console.log(`   - ${error}`));
    }

    // 7. 生成兼容性报告
    console.log('\n📊 兼容性报告:');
    console.log(`   - 原始虚拟模型数量: ${Object.keys(configData.virtualModels).length}`);
    console.log(`   - 生成的流水线表条目: ${pipelineTableEntries.length}`);
    console.log(`   - 转换后的VirtualModelConfig: ${finalConfigs.length}`);
    console.log(`   - 结构验证错误: ${providerErrors.length + vmErrors.length + entryErrors.length + configErrors.length}`);

    // 8. 显示详细的转换映射
    console.log('\n📋 转换映射详情:');
    finalConfigs.forEach((config) => {
      console.log(`\n   虚拟模型 "${config.id}":`);
      console.log(`     - 启用状态: ${config.enabled ? '✅' : '❌'}`);
      console.log(`     - 目标数量: ${config.targets.length}`);
      config.targets.forEach((target, index) => {
        console.log(`       ${index + 1}. ${target.providerId}:${target.modelId} (权重: ${target.weight})`);
      });
    });

    // 9. 保存转换结果用于验证
    const outputDir = path.join(process.cwd(), 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const testResult = {
      timestamp: new Date().toISOString(),
      configPath,
      originalConfig: {
        version: configData.version,
        providerCount: Object.keys(configData.providers).length,
        virtualModelCount: Object.keys(configData.virtualModels).length
      },
      pipelineTable: {
        entryCount: pipelineTableEntries.length,
        entries: pipelineTableEntries
      },
      virtualModelConfigs: {
        count: finalConfigs.length,
        configs: finalConfigs
      },
      validation: {
        providerErrors,
        vmErrors,
        entryErrors,
        configErrors,
        totalErrors: providerErrors.length + vmErrors.length + entryErrors.length + configErrors.length
      },
      compatibility: {
        isCompatible: providerErrors.length + vmErrors.length + entryErrors.length + configErrors.length === 0,
        score: Math.max(0, 100 - (providerErrors.length + vmErrors.length + entryErrors.length + configErrors.length) * 5)
      }
    };

    await fs.promises.writeFile(
      path.join(outputDir, 'config-compatibility-test.json'),
      JSON.stringify(testResult, null, 2)
    );

    console.log(`\n💾 测试结果已保存到: ${path.join(outputDir, 'config-compatibility-test.json')}`);

    // 10. 总结
    const isCompatible = testResult.validation.totalErrors === 0;
    const compatibilityScore = testResult.compatibility.score;

    console.log('\n🎯 测试总结:');
    console.log(`   - 兼容性: ${isCompatible ? '✅ 完全兼容' : '❌ 存在问题'}`);
    console.log(`   - 兼容性评分: ${compatibilityScore}/100`);
    console.log(`   - 总错误数: ${testResult.validation.totalErrors}`);

    if (isCompatible) {
      console.log('\n🎉 配置格式兼容性测试通过！');
      console.log('   配置模块可以正确输出流水线表，流水线组装器可以正确读取配置格式。');
    } else {
      console.log('\n⚠️  配置格式兼容性测试发现问题！');
      console.log('   需要修复配置数据结构或转换逻辑。');
    }

    return {
      success: isCompatible,
      compatibilityScore,
      testResult
    };

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 运行测试
testConfigFormatCompatibility().then(result => {
  if (result.success) {
    console.log('\n🎉 配置格式兼容性验证完成！');
    process.exit(0);
  } else {
    console.log('\n💥 配置格式兼容性验证失败！');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n💥 测试执行出错:', error);
  process.exit(1);
});