/**
 * 流水线配置生成器 - 核心功能模块
 * 
 * 负责将配置数据转换为流水线表格式
 */

import { ConfigData, VirtualModelConfig } from './ConfigData';
import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { PipelineExecutionRecord } from '../types';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * 流水线表条目
 */
export interface PipelineTableEntry {
  /** 虚拟模型ID */
  virtualModelId: string;
  /** 目标供应商ID */
  providerId: string;
  /** 目标模型ID */
  modelId: string;
  /** API密钥索引 */
  keyIndex: number;
  /** 优先级 */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
  /** 权重 */
  weight?: number;
  /** 负载均衡策略 */
  strategy?: 'round-robin' | 'weighted' | 'random' | 'least-connections';
}

/**
 * 流水线表
 */
export class PipelineTable {
  private entries: PipelineTableEntry[] = [];
  private metadata: {
    generatedAt: string;
    configVersion: string;
    totalEntries: number;
  };

  constructor(entries: PipelineTableEntry[] = [], configVersion = '1.0.0') {
    this.entries = entries;
    this.metadata = {
      generatedAt: new Date().toISOString(),
      configVersion,
      totalEntries: entries.length
    };
  }

  /**
   * 添加条目
   */
  public addEntry(entry: PipelineTableEntry): void {
    this.entries.push(entry);
    this.metadata.totalEntries = this.entries.length;
  }

  /**
   * 获取所有条目
   */
  public getEntries(): PipelineTableEntry[] {
    return [...this.entries];
  }

  /**
   * 根据虚拟模型ID获取条目
   */
  public getEntriesByVirtualModel(virtualModelId: string): PipelineTableEntry[] {
    return this.entries.filter(entry => entry.virtualModelId === virtualModelId);
  }

  /**
   * 获取表格大小
   */
  public get size(): number {
    return this.entries.length;
  }

  /**
   * 转换为JSON
   */
  public toJSON(): any {
    return {
      metadata: this.metadata,
      entries: this.entries
    };
  }
}

/**
 * 流水线配置生成器
 */
export class PipelineConfigGenerator extends BaseModule {
  private executionRecords: Map<string, PipelineExecutionRecord> = new Map();

  constructor(info: ModuleInfo = {
    id: 'pipeline-config-generator',
    type: 'pipeline-config-generator',
    name: 'Pipeline Config Generator Module',
    version: '0.1.0',
    description: 'RCC Pipeline Configuration Generator Module'
  }) {
    super(info);
  }

  /**
   * 初始化生成器
   */
  public async initialize(): Promise<void> {
    await super.initialize();

    this.logInfo('PipelineConfigGenerator initialized successfully');
  }

  /**
   * 创建执行记录
   */
  private createExecutionRecord(
    virtualModelId: string,
    providerId: string,
    modelId: string,
    input?: any
  ): PipelineExecutionRecord {
    const record: PipelineExecutionRecord = {
      id: uuidv4(),
      virtualModelId,
      providerId,
      modelId,
      startTime: Date.now(),
      status: 'running',
      input,
      performance: {
        processingTime: 0,
        memoryUsage: process.memoryUsage().heapUsed
      }
    };

    this.executionRecords.set(record.id, record);
    this.logInfo(`Pipeline execution record created - recordId: ${record.id}, virtualModelId: ${virtualModelId}, providerId: ${providerId}, modelId: ${modelId}`);

    return record;
  }

  /**
   * 完成执行记录
   */
  private completeExecutionRecord(
    recordId: string,
    output?: any,
    error?: string
  ): void {
    const record = this.executionRecords.get(recordId);
    if (!record) {
      this.warn(`Execution record not found - recordId: ${recordId}`);
      return;
    }

    record.endTime = Date.now();
    record.status = error ? 'failed' : 'completed';
    record.output = output;
    record.error = error;

    if (record.performance) {
      record.performance.processingTime = record.endTime - record.startTime;
      record.performance.memoryUsage = process.memoryUsage().heapUsed;
    }

    this.logInfo(`Pipeline execution record completed - recordId: ${recordId}, status: ${record.status}, processingTime: ${record.performance?.processingTime}`);
  }

  /**
   * 获取执行记录
   */
  public getExecutionRecord(recordId: string): PipelineExecutionRecord | undefined {
    return this.executionRecords.get(recordId);
  }

  /**
   * 获取所有执行记录
   */
  public getAllExecutionRecords(): PipelineExecutionRecord[] {
    return Array.from(this.executionRecords.values());
  }

  /**
   * 清理执行记录
   */
  public clearExecutionRecords(): void {
    const count = this.executionRecords.size;
    this.executionRecords.clear();
    this.logInfo(`Cleared ${count} execution records`);
  }

  /**
   * 生成流水线表
   */
  public async generatePipelineTable(config: ConfigData): Promise<PipelineTable> {
    let record: PipelineExecutionRecord | undefined;

    try {
      this.logInfo(`Starting pipeline table generation - configVersion: ${config.version}, virtualModelCount: ${Object.keys(config.virtualModels).length}`);

      // 创建执行记录
      record = this.createExecutionRecord(
        'pipeline-generator',
        'config-parser',
        'pipeline-table',
        { configVersion: config.version }
      );

      const entries: PipelineTableEntry[] = [];

      // 遍历虚拟模型配置
      for (const [vmId, vmConfig] of Object.entries(config.virtualModels)) {
        // 跳过禁用的虚拟模型
        if (!vmConfig.enabled) {
          continue;
        }

        // 为每个目标创建流水线条目
        for (const target of vmConfig.targets) {
          const entry: PipelineTableEntry = {
            virtualModelId: vmId,
            providerId: target.providerId,
            modelId: target.modelId,
            keyIndex: target.keyIndex || 0,
            priority: vmConfig.priority || 1,
            enabled: vmConfig.enabled,
            weight: 1,
            strategy: 'round-robin'
          };

          entries.push(entry);
        }
      }

      const table = new PipelineTable(entries, config.version);

      // 完成执行记录
      this.completeExecutionRecord(record.id, { table, entryCount: entries.length });

      this.logInfo(`Pipeline table generated with ${entries.length} entries`);
      return table;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.warn(`Failed to generate pipeline table - error: ${errorMessage}`);

      // 完成执行记录（失败状态）
      if (record) {
        this.completeExecutionRecord(record.id, undefined, errorMessage);
      }

      throw error;
    }
  }

  /**
   * 销毁生成器
   */
  public async destroy(): Promise<void> {
    this.logInfo('Destroying PipelineConfigGenerator');

    // 清理执行记录
    this.clearExecutionRecords();

    // Clean up resources
    this.logInfo('PipelineConfigGenerator destroyed successfully');
  }
}