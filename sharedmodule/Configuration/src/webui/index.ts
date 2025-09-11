/**
 * RCC Configuration Web UI 入口文件
 * 
 * 提供配置中心UI的初始化和使用接口
 */

import { ConfigurationCenterUI } from './ConfigurationCenterUI';
import { ConfigLoadingManager } from './managers/ConfigLoadingManager';
import { ConfigParserMain } from './components/ConfigParser/ConfigParserMain';
import { UIConfig } from './types/state.types';

/**
 * 初始化配置中心UI
 * @param options UI配置选项
 */
export async function initializeConfigurationUI(options: {
  containerId: string;
  theme?: 'light' | 'dark' | 'auto';
  defaultView?: 'generator' | 'parser';
}): Promise<ConfigurationCenterUI> {
  try {
    const ui = ConfigurationCenterUI.getInstance();
    await ui.initialize({
      containerId: options.containerId,
      theme: options.theme || 'auto',
      defaultView: options.defaultView || 'parser'
    });
    return ui;
  } catch (error) {
    console.error('Failed to initialize Configuration UI:', error);
    throw error;
  }
}

/**
 * 获取配置加载管理器实例
 */
export function getConfigLoadingManager(): ConfigLoadingManager {
  const ui = ConfigurationCenterUI.getInstance();
  return ui.getConfigLoadingManager();
}

/**
 * 获取当前UI状态
 */
export function getCurrentUIState(): any {
  const ui = ConfigurationCenterUI.getInstance();
  return ui.getState();
}

// 导出主要类供外部使用
export { ConfigurationCenterUI };
export { ConfigLoadingManager } from './managers/ConfigLoadingManager';
export { ConfigParserMain } from './components/ConfigParser/ConfigParserMain';

// 导出类型定义
export type { UIConfig } from './types/state.types';
export type { ParseResult, UserConfig, PipelineConfig } from './types/ui.types';

/**
 * 销毁配置中心UI
 */
export async function destroyConfigurationUI(): Promise<void> {
  try {
    const ui = ConfigurationCenterUI.getInstance();
    await ui.destroy();
  } catch (error) {
    console.error('Failed to destroy Configuration UI:', error);
    throw error;
  }
}

// 全局暴露初始化函数（如果需要）
if (typeof window !== 'undefined') {
  (window as any).initializeRCCConfigurationUI = initializeConfigurationUI;
  (window as any).destroyRCCConfigurationUI = destroyConfigurationUI;
}

export default {
  initialize: initializeConfigurationUI,
  destroy: destroyConfigurationUI,
  getConfigLoadingManager,
  getCurrentUIState
};