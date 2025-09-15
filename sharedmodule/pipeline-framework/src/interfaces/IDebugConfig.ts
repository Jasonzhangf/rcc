/**
 * Debug Configuration Interface
 * 调试配置接口
 */

import { DebugConfig, ConfigValidationResult } from '../types/debug-types';

/**
 * Debug Configuration Interface
 * 调试配置接口
 */
export interface IDebugConfig {
  /**
   * Get the current configuration
   * 获取当前配置
   */
  getConfig(): DebugConfig;

  /**
   * Update configuration with validation
   * 更新配置并进行验证
   */
  updateConfig(newConfig: Partial<DebugConfig>): ConfigValidationResult;

  /**
   * Validate configuration
   * 验证配置
   */
  validateConfig(config: DebugConfig): ConfigValidationResult;

  /**
   * Enable or disable debug logging
   * 启用或禁用调试日志
   */
  setEnabled(enabled: boolean): void;

  /**
   * Check if debug logging is enabled
   * 检查调试日志是否启用
   */
  isEnabled(): boolean;

  /**
   * Set log level
   * 设置日志级别
   */
  setLogLevel(level: DebugConfig['logLevel']): void;

  /**
   * Get log level
   * 获取日志级别
   */
  getLogLevel(): DebugConfig['logLevel'];

  /**
   * Set base directory
   * 设置基础目录
   */
  setBaseDirectory(directory: string): void;

  /**
   * Get base directory
   * 获取基础目录
   */
  getBaseDirectory(): string;

  /**
   * Add sensitive field to filter
   * 添加敏感字段进行过滤
   */
  addSensitiveField(field: string): void;

  /**
   * Remove sensitive field from filter
   * 从过滤中移除敏感字段
   */
  removeSensitiveField(field: string): void;

  /**
   * Get sensitive fields
   * 获取敏感字段列表
   */
  getSensitiveFields(): string[];

  /**
   * Reset to default configuration
   * 重置为默认配置
   */
  resetToDefault(): void;

  /**
   * Export configuration to JSON
   * 导出配置为JSON
   */
  exportConfig(): string;

  /**
   * Import configuration from JSON
   * 从JSON导入配置
   */
  importConfig(jsonConfig: string): ConfigValidationResult;
}