#!/usr/bin/env node

/**
 * 测试配置模块的流水线表生成功能
 */

async function testConfigPipelineGeneration() {
  // 使用动态导入来处理CommonJS/ESM兼容性
  const configModule = await import('./sharedmodule/config-parser/dist/index.js');
  const {
    createConfigLoader,
    createConfigParser,
    createPipelineConfigGenerator
  } = configModule;
  console.log('🧪 测试配置模块流水线表生成功能...\n');

  try {
    // 1. 创建配置模块实例
    const configLoader = createConfigLoader();
    const configParser = createConfigParser();
    const pipelineGenerator = createPipelineConfigGenerator();

    console.log('✅ 配置模块实例创建成功');

    // 2. 初始化模块
    await configLoader.initialize();
    await configParser.initialize();
    await pipelineGenerator.initialize();

    console.log('✅ 配置模块初始化成功');

    // 3. 加载配置文件
    const configPath = '/Users/fanzhang/.rcc/rcc-config.json';
    console.log(`📂 加载配置文件: ${configPath}`);

    const rawData = await configLoader.loadFromFile(configPath);
    console.log(`✅ 原始配置数据加载成功，大小: ${JSON.stringify(rawData).length} 字符`);

    // 4. 解析配置
    const configData = await configParser.parseConfig(rawData);
    console.log('✅ 配置解析成功');
    console.log(`   - 版本: ${configData.version}`);
    console.log(`   - 提供商数量: ${Object.keys(configData.providers).length}`);
    console.log(`   - 虚拟模型数量: ${Object.keys(configData.virtualModels).length}`);

    // 5. 生成流水线表
    console.log('\n🔄 生成流水线表...');
    const pipelineTable = await pipelineGenerator.generatePipelineTable(configData);

    console.log('✅ 流水线表生成成功');
    console.log(`   - 表条目数量: ${pipelineTable.size}`);
    console.log(`   - 配置版本: ${pipelineTable.metadata.configVersion}`);
    console.log(`   - 生成时间: ${pipelineTable.metadata.generatedAt}`);

    // 6. 分析流水线表内容
    console.log('\n📊 流水线表内容分析:');
    const entries = pipelineTable.getEntries();

    // 按虚拟模型分组
    const byVirtualModel = {};
    entries.forEach(entry => {
      if (!byVirtualModel[entry.virtualModelId]) {
        byVirtualModel[entry.virtualModelId] = [];
      }
      byVirtualModel[entry.virtualModelId].push(entry);
    });

    for (const [vmId, vmEntries] of Object.entries(byVirtualModel)) {
      console.log(`\n   虚拟模型 "${vmId}":`);
      vmEntries.forEach((entry, index) => {
        console.log(`     ${index + 1}. ${entry.providerId}:${entry.modelId} (keyIndex: ${entry.keyIndex}, priority: ${entry.priority})`);
      });
    }

    // 7. 验证数据完整性
    console.log('\n🔍 数据完整性验证:');
    let hasErrors = false;

    entries.forEach((entry, index) => {
      if (!entry.virtualModelId) {
        console.log(`❌ 条目 ${index}: 缺少 virtualModelId`);
        hasErrors = true;
      }
      if (!entry.providerId) {
        console.log(`❌ 条目 ${index}: 缺少 providerId`);
        hasErrors = true;
      }
      if (!entry.modelId) {
        console.log(`❌ 条目 ${index}: 缺少 modelId`);
        hasErrors = true;
      }
      if (typeof entry.keyIndex !== 'number') {
        console.log(`❌ 条目 ${index}: keyIndex 不是数字`);
        hasErrors = true;
      }
    });

    if (!hasErrors) {
      console.log('✅ 所有条目数据完整性验证通过');
    }

    // 8. 转换为JSON格式验证
    console.log('\n📋 JSON格式验证:');
    const pipelineJson = pipelineTable.toJSON();
    console.log(`   - JSON结构有效: ${!!pipelineJson.metadata && !!pipelineJson.entries}`);
    console.log(`   - 元数据字段: ${Object.keys(pipelineJson.metadata).join(', ')}`);
    console.log(`   - 条目字段示例: ${Object.keys(pipelineJson.entries[0] || {}).join(', ')}`);

    // 9. 清理资源
    await configLoader.destroy();
    await configParser.destroy();
    await pipelineGenerator.destroy();

    console.log('\n✅ 测试完成！配置模块流水线表生成功能正常');
    console.log(`📈 生成了 ${pipelineTable.size} 个流水线条目`);

    return {
      success: true,
      entryCount: pipelineTable.size,
      virtualModels: Object.keys(byVirtualModel),
      pipelineTable: pipelineJson
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
testConfigPipelineGeneration().then(result => {
  if (result.success) {
    console.log('\n🎉 配置模块流水线表生成测试通过！');
    process.exit(0);
  } else {
    console.log('\n💥 配置模块流水线表生成测试失败！');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n💥 测试执行出错:', error);
  process.exit(1);
});