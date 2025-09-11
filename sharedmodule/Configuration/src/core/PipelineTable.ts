/**
 * 简化的流水线表数据结构
 * 
 * 用于表示从配置生成的流水线表信息
 */

/**
 * 流水线条目
 */
export interface PipelineEntry {
  /** 虚拟模型ID */
  virtualModelId: string;
  /** 目标供应商 */
  targetProvider: string;
  /** 目标模型 */
  targetModel: string;
  /** 密钥索引 */
  keyIndex: number;
  /** 是否启用 */
  enabled: boolean;
  /** 优先级 */
  priority: number;
}

/**
 * 流水线表配置
 */
export interface PipelineTableConfig {
  /** 流水线条目列表 */
  entries: PipelineEntry[];
  /** 生成时间 */
  generatedAt: string;
  /** 配置版本 */
  configVersion: string;
}

/**
 * 流水线表
 */
export type PipelineTable = Map<string, PipelineEntry>;