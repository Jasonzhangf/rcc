/**
 * 存储服务
 *
 * 提供本地存储、用户偏好设置、文件管理等功能
 */
import { UIService } from '../types/ui.types';
/**
 * 存储服务类
 */
export declare class StorageService implements UIService {
    private initialized;
    private isLocalStorageAvailable;
    private memoryStorage;
    /**
     * 初始化服务
     */
    initialize(): Promise<void>;
    /**
     * 配置服务
     */
    configure(options: any): void;
    /**
     * 获取服务状态
     */
    getStatus(): any;
    /**
     * 检测 localStorage 是否可用
     */
    private checkLocalStorageAvailability;
    /**
     * 设置值
     */
    setValue(key: string, value: any): Promise<void>;
    /**
     * 获取值
     */
    getValue<T = any>(key: string, defaultValue?: T): Promise<T | undefined>;
    /**
     * 删除值
     */
    removeValue(key: string): Promise<void>;
    /**
     * 清空所有数据
     */
    clear(): Promise<void>;
    /**
     * 检查是否存在指定键
     */
    hasKey(key: string): Promise<boolean>;
    /**
     * 获取所有键
     */
    getKeys(): Promise<string[]>;
    /**
     * 加载用户偏好设置
     */
    private loadUserPreferences;
    /**
     * 获取用户偏好设置
     */
    getUserPreferences(): Promise<any>;
    /**
     * 设置用户偏好
     */
    setUserPreference(key: string, value: any): Promise<void>;
    /**
     * 获取最近文件列表
     */
    getRecentFiles(): Promise<any[]>;
    /**
     * 添加最近文件
     */
    addRecentFile(file: {
        name: string;
        type: string;
        size: number;
        lastModified: number;
        path?: string;
    }): Promise<void>;
    /**
     * 清理最近文件列表
     */
    clearRecentFiles(): Promise<void>;
    /**
     * 获取最近配置列表
     */
    getRecentConfigs(): Promise<any[]>;
    /**
     * 添加最近配置
     */
    addRecentConfig(config: {
        name: string;
        type: 'generated' | 'parsed';
        data: any;
        timestamp: number;
    }): Promise<void>;
    /**
     * 获取解析历史
     */
    getParseHistory(): Promise<any[]>;
    /**
     * 添加解析历史
     */
    addParseHistory(parseResult: any): Promise<void>;
    /**
     * 清理解析历史
     */
    clearParseHistory(): Promise<void>;
    /**
     * 获取表单草稿
     */
    getFormDrafts(): Promise<Record<string, any>>;
    /**
     * 保存表单草稿
     */
    saveFormDraft(formId: string, data: any): Promise<void>;
    /**
     * 获取表单草稿
     */
    getFormDraft(formId: string): Promise<any>;
    /**
     * 删除表单草稿
     */
    removeFormDraft(formId: string): Promise<void>;
    /**
     * 保存配置生成器数据
     */
    saveConfigGeneratorData(data: any): Promise<void>;
    /**
     * 获取配置生成器数据
     */
    getConfigGeneratorData(): Promise<any>;
    /**
     * 保存配置解析器数据
     */
    saveConfigParserData(data: any): Promise<void>;
    /**
     * 获取配置解析器数据
     */
    getConfigParserData(): Promise<any>;
    /**
     * 导出所有数据
     */
    exportAllData(): Promise<any>;
    /**
     * 导入数据
     */
    importData(exportedData: any): Promise<void>;
    /**
     * 获取存储统计信息
     */
    getStorageStats(): Promise<any>;
    /**
     * 清理过期数据
     */
    cleanupExpiredData(maxAge?: number): Promise<void>;
    /**
     * 压缩数据（简单实现）
     */
    private compressData;
    /**
     * 解压数据
     */
    private decompressData;
    /**
     * 备份数据
     */
    backupData(): Promise<string>;
    /**
     * 从文件恢复数据
     */
    restoreFromFile(file: File): Promise<void>;
}
