/**
 * 配置加载器 - 核心功能模块
 *
 * 负责从各种来源加载配置数据
 */
import { ConfigData } from './ConfigData';
import { BaseModule, ModuleInfo } from 'rcc-basemodule';
/**
 * 配置来源类型
 */
export type ConfigSource = {
    type: 'file';
    path: string;
} | {
    type: 'url';
    url: string;
} | {
    type: 'env';
    prefix?: string;
} | {
    type: 'memory';
    data: any;
};
/**
 * 加载选项
 */
export interface LoadOptions {
    /** 是否启用缓存 */
    enableCache?: boolean;
    /** 缓存过期时间（毫秒） */
    cacheExpiry?: number;
    /** 是否监听文件变化 */
    watchChanges?: boolean;
    /** 备份选项 */
    backup?: {
        enabled: boolean;
        maxBackups: number;
        backupDir: string;
    };
}
/**
 * 配置加载器类
 */
export declare class ConfigLoader extends BaseModule {
    private cache;
    private watchers;
    constructor(info?: ModuleInfo);
    /**
     * 初始化加载器
     */
    initialize(): Promise<void>;
    /**
     * 从文件加载配置
     */
    loadFromFile(filePath: string, options?: LoadOptions): Promise<ConfigData>;
    /**
     * 保存配置到文件
     */
    saveConfig(config: ConfigData, filePath: string, options?: {
        backup?: boolean;
    }): Promise<void>;
    /**
     * 创建配置备份
     */
    private createBackup;
    /**
     * 销毁加载器
     */
    destroy(): Promise<void>;
    /**
     * 处理系统消息
     */
    handleMessage(message: any): Promise<any>;
}
//# sourceMappingURL=ConfigLoader.d.ts.map