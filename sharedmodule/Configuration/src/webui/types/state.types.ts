/**
 * 配置加载状态管理类型定义
 */

/**
 * 配置加载状态
 */
export interface ConfigLoadingState {
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否正在解析 */
  isParsing: boolean;
  /** 是否已加载配置 */
  hasConfig: boolean;
  /** 当前状态描述 */
  statusText: string;
  /** 错误信息 */
  error?: string;
  /** 警告信息 */
  warnings?: string[];
}

/**
 * 状态变更回调函数
 */
export type StateChangeListener = (state: ConfigLoadingState) => void;

/**
 * 配置中心UI选项
 */
export interface ConfigurationCenterOptions {
  /** 容器元素ID */
  containerId: string;
  /** UI主题 */
  theme?: 'light' | 'dark' | 'auto';
  /** 默认视图 */
  defaultView?: 'generator' | 'parser';
  /** 版本号 */
  version?: string;
}