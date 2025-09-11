/**
 * RCC Configuration Web UI 使用示例
 * 
 * 展示如何使用重构后的配置Web UI系统
 */

import { ConfigurationCenterUI } from './src/webui/index';
import { ConfigLoadingManager } from './src/webui/managers/ConfigLoadingManager';

// 初始化配置中心UI
async function initializeConfigCenter() {
  try {
    // 获取UI实例
    const ui = ConfigurationCenterUI.getInstance();
    
    // 创建容器元素
    const container = document.createElement('div');
    container.id = 'rcc-config-center';
    document.body.appendChild(container);
    
    // 初始化UI
    await ui.initialize({
      containerId: 'rcc-config-center',
      theme: 'auto',
      defaultView: 'parser',
      version: '1.0.0'
    });
    
    console.log('配置中心UI初始化成功');
    
    // 监听配置加载状态
    const loadingManager = new ConfigLoadingManager();
    loadingManager.addStateListener((state) => {
      console.log('配置加载状态更新:', state);
    });
    
  } catch (error) {
    console.error('配置中心初始化失败:', error);
  }
}

// 测试配置解析功能
async function testConfigParsing() {
  try {
    // 获取UI实例
    const ui = ConfigurationCenterUI.getInstance();
    
    // 获取解析器组件
    const parser = ui.getParserComponent();
    if (parser) {
      console.log('解析器组件已就绪');
    }
    
  } catch (error) {
    console.error('测试配置解析失败:', error);
  }
}

// 导出功能示例
async function exportPipelineConfiguration() {
  try {
    const ui = ConfigurationCenterUI.getInstance();
    const parser = ui.getParserComponent();
    
    if (parser) {
      // 生成流水线配置
      const pipelineConfig = await parser.generatePipelineConfig();
      if (pipelineConfig) {
        console.log('流水线配置生成成功:', pipelineConfig);
        
        // 导出为JSON
        const jsonExport = await parser.exportPipelineConfig('json');
        if (jsonExport) {
          console.log('流水线配置导出成功 (JSON)');
          // 这里可以保存到文件或发送到服务器
        }
      }
    }
  } catch (error) {
    console.error('导出流水线配置失败:', error);
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  await initializeConfigCenter();
  await testConfigParsing();
});

// 导出函数供外部使用
export {
  initializeConfigCenter,
  testConfigParsing,
  exportPipelineConfiguration
};