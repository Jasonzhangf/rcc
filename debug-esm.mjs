#!/usr/bin/env node

/**
 * ESM调试脚本：使用已构建的rcc-configuration模块
 */

// 先检查模块是否可以正确导入
console.log('开始导入rcc-configuration模块...');

try {
  // 使用动态导入
  const configModule = await import('rcc-configuration');
  console.log('模块导入成功!');
  console.log('模块类型:', typeof configModule);
  console.log('createConfigurationSystem存在:', typeof configModule.createConfigurationSystem);

  // 尝试使用createConfigurationSystem函数
  const { createConfigurationSystem } = configModule;

  if (typeof createConfigurationSystem === 'function') {
    console.log('createConfigurationSystem函数可用');

    try {
      // 创建配置系统
      const configurationSystem = await createConfigurationSystem({
        id: 'debug-configuration-system',
        name: 'Debug Configuration System',
        enablePipelineIntegration: true
      });

      console.log('配置系统创建成功!');
      console.log('配置系统类型:', typeof configurationSystem);

      // 检查配置系统的方法
      console.log('配置系统方法:');
      console.log('  initialize:', typeof configurationSystem.initialize);
      console.log('  loadConfiguration:', typeof configurationSystem.loadConfiguration);
      console.log('  generatePipelineTable:', typeof configurationSystem.generatePipelineTable);
      console.log('  destroy:', typeof configurationSystem.destroy);

      // 清理资源
      if (configurationSystem && typeof configurationSystem.destroy === 'function') {
        await configurationSystem.destroy();
        console.log('配置系统已清理');
      }
    } catch (createError) {
      console.error('创建配置系统时出错:', createError);
    }
  } else {
    console.log('createConfigurationSystem函数不可用');
    console.log('可用的导出:', Object.keys(configModule));
  }
} catch (importError) {
  console.error('模块导入失败:', importError);
}

console.log('调试脚本执行完成');