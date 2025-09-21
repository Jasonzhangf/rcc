/**
 * 流水线配置生成器 - 核心功能模块
 *
 * 负责将配置数据转换为流水线表格式
 */
import { ConfigData } from './ConfigData';
import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { PipelineExecutionRecord } from '../types';
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
export declare class PipelineTable {
    private entries;
    private metadata;
    constructor(entries?: PipelineTableEntry[], configVersion?: string);
    /**
     * 添加条目
     */
    addEntry(entry: PipelineTableEntry): void;
    /**
     * 获取所有条目
     */
    getEntries(): PipelineTableEntry[];
    /**
     * 根据虚拟模型ID获取条目
     */
    getEntriesByVirtualModel(virtualModelId: string): PipelineTableEntry[];
    /**
     * 获取表格大小
     */
    get size(): number;
    /**
     * 转换为JSON
     */
    toJSON(): any;
}
/**
 * 流水线配置生成器
 */
export declare class PipelineConfigGenerator extends BaseModule {
    private executionRecords;
    constructor(info?: ModuleInfo);
    /**
     * 初始化生成器
     */
    initialize(): Promise<void>;
    /**
     * 创建执行记录
     */
    private createExecutionRecord;
    /**
     * 完成执行记录
     */
    private completeExecutionRecord;
    /**
     * 获取执行记录
     */
    getExecutionRecord(recordId: string): PipelineExecutionRecord | undefined;
    /**
     * 获取所有执行记录
     */
    getAllExecutionRecords(): PipelineExecutionRecord[];
    /**
     * 清理执行记录
     */
    clearExecutionRecords(): void;
    /**
     * 生成流水线表
     */
    generatePipelineTable(config: ConfigData): Promise<PipelineTable>;
    /**
     * 销毁生成器
     */
    destroy(): Promise<void>;
}
//# sourceMappingURL=PipelineConfigGenerator.d.ts.map