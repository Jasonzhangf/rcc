/**
 * RCC Config Management - 配置管理和 Web UI 模块
 * 
 * 主要调用 config-parser 的核心功能，并提供 Web UI 管理界面
 */

// 导出主要模块
export { ConfigurationModule } from './core/ConfigurationModule';

// 导出类型
export type { WebUIConfig } from './core/ConfigurationModule';

// 便捷函数
import { ConfigurationModule } from './core/ConfigurationModule';
import type { WebUIConfig } from './core/ConfigurationModule';

/**
 * 创建配置管理模块实例
 */
export function createConfigurationModule(webUIConfig?: Partial<WebUIConfig>): ConfigurationModule {
  return new ConfigurationModule(webUIConfig);
}

/**
 * 快速启动配置管理服务
 */
export async function startConfigManagement(options?: {
  configFile?: string;
  webUI?: Partial<WebUIConfig>;
}): Promise<ConfigurationModule> {
  const module = createConfigurationModule(options?.webUI);
  
  await module.initialize();
  
  if (options?.configFile) {
    await module.loadConfig(options.configFile);
  }
  
  await module.startWebUI();
  
  return module;
}