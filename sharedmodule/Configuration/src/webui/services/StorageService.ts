/**
 * 存储服务
 * 
 * 提供本地存储、用户偏好设置、文件管理等功能
 */

import { UIService, STORAGE_KEYS } from '../types/ui.types';

/**
 * 存储服务类
 */
export class StorageService implements UIService {
  private initialized = false;
  private isLocalStorageAvailable = false;
  private memoryStorage = new Map<string, any>();

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    try {
      // 检测 localStorage 是否可用
      this.isLocalStorageAvailable = this.checkLocalStorageAvailability();
      
      // 加载用户偏好设置
      await this.loadUserPreferences();
      
      this.initialized = true;
      console.log('StorageService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize StorageService:', error);
      throw error;
    }
  }

  /**
   * 配置服务
   */
  public configure(options: any): void {
    console.log('StorageService configured with options:', options);
  }

  /**
   * 获取服务状态
   */
  public getStatus(): any {
    return {
      initialized: this.initialized,
      localStorageAvailable: this.isLocalStorageAvailable,
      memoryStorageSize: this.memoryStorage.size
    };
  }

  /**
   * 检测 localStorage 是否可用
   */
  private checkLocalStorageAvailability(): boolean {
    try {
      const testKey = '__test_localStorage__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('localStorage is not available, falling back to memory storage');
      return false;
    }
  }

  /**
   * 设置值
   */
  public async setValue(key: string, value: any): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      
      if (this.isLocalStorageAvailable) {
        localStorage.setItem(key, serializedValue);
      } else {
        this.memoryStorage.set(key, value);
      }
    } catch (error) {
      console.error(`Failed to set value for key '${key}':`, error);
      // 降级到内存存储
      this.memoryStorage.set(key, value);
    }
  }

  /**
   * 获取值
   */
  public async getValue<T = any>(key: string, defaultValue?: T): Promise<T | undefined> {
    try {
      let value: any;
      
      if (this.isLocalStorageAvailable) {
        const stored = localStorage.getItem(key);
        if (stored !== null) {
          value = JSON.parse(stored);
        }
      } else {
        value = this.memoryStorage.get(key);
      }
      
      return value !== undefined ? value : defaultValue;
    } catch (error) {
      console.error(`Failed to get value for key '${key}':`, error);
      return defaultValue;
    }
  }

  /**
   * 删除值
   */
  public async removeValue(key: string): Promise<void> {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.removeItem(key);
      } else {
        this.memoryStorage.delete(key);
      }
    } catch (error) {
      console.error(`Failed to remove value for key '${key}':`, error);
    }
  }

  /**
   * 清空所有数据
   */
  public async clear(): Promise<void> {
    try {
      if (this.isLocalStorageAvailable) {
        // 只清空我们的存储项
        for (const key of Object.values(STORAGE_KEYS)) {
          localStorage.removeItem(key);
        }
      } else {
        this.memoryStorage.clear();
      }
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  /**
   * 检查是否存在指定键
   */
  public async hasKey(key: string): Promise<boolean> {
    try {
      if (this.isLocalStorageAvailable) {
        return localStorage.getItem(key) !== null;
      } else {
        return this.memoryStorage.has(key);
      }
    } catch (error) {
      console.error(`Failed to check key '${key}':`, error);
      return false;
    }
  }

  /**
   * 获取所有键
   */
  public async getKeys(): Promise<string[]> {
    try {
      if (this.isLocalStorageAvailable) {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && Object.values(STORAGE_KEYS).includes(key as any)) {
            keys.push(key);
          }
        }
        return keys;
      } else {
        return Array.from(this.memoryStorage.keys());
      }
    } catch (error) {
      console.error('Failed to get keys:', error);
      return [];
    }
  }

  /**
   * 加载用户偏好设置
   */
  private async loadUserPreferences(): Promise<void> {
    const preferences = await this.getUserPreferences();
    if (preferences) {
      // 应用用户偏好设置
      console.log('User preferences loaded:', preferences);
    }
  }

  /**
   * 获取用户偏好设置
   */
  public async getUserPreferences(): Promise<any> {
    return await this.getValue(STORAGE_KEYS.USER_PREFERENCES, {
      theme: 'auto',
      language: 'zh-CN',
      autoSave: true,
      showTips: true
    });
  }

  /**
   * 设置用户偏好
   */
  public async setUserPreference(key: string, value: any): Promise<void> {
    const preferences = await this.getUserPreferences();
    preferences[key] = value;
    await this.setValue(STORAGE_KEYS.USER_PREFERENCES, preferences);
  }

  /**
   * 获取最近文件列表
   */
  public async getRecentFiles(): Promise<any[]> {
    return await this.getValue(STORAGE_KEYS.RECENT_FILES, []);
  }

  /**
   * 添加最近文件
   */
  public async addRecentFile(file: {
    name: string;
    type: string;
    size: number;
    lastModified: number;
    path?: string;
  }): Promise<void> {
    const recentFiles = await this.getRecentFiles();
    
    // 移除重复的文件
    const filteredFiles = recentFiles.filter(f => 
      f.name !== file.name || f.lastModified !== file.lastModified
    );
    
    // 添加到列表开头
    filteredFiles.unshift({
      ...file,
      accessedAt: Date.now()
    });
    
    // 保持最多10个最近文件
    const limitedFiles = filteredFiles.slice(0, 10);
    
    await this.setValue(STORAGE_KEYS.RECENT_FILES, limitedFiles);
  }

  /**
   * 清理最近文件列表
   */
  public async clearRecentFiles(): Promise<void> {
    await this.setValue(STORAGE_KEYS.RECENT_FILES, []);
  }

  /**
   * 获取最近配置列表
   */
  public async getRecentConfigs(): Promise<any[]> {
    return await this.getValue(STORAGE_KEYS.RECENT_CONFIGS, []);
  }

  /**
   * 添加最近配置
   */
  public async addRecentConfig(config: {
    name: string;
    type: 'generated' | 'parsed';
    data: any;
    timestamp: number;
  }): Promise<void> {
    const recentConfigs = await this.getRecentConfigs();
    
    // 移除重复的配置
    const filteredConfigs = recentConfigs.filter(c => 
      c.name !== config.name || c.timestamp !== config.timestamp
    );
    
    // 添加到列表开头
    filteredConfigs.unshift(config);
    
    // 保持最多20个最近配置
    const limitedConfigs = filteredConfigs.slice(0, 20);
    
    await this.setValue(STORAGE_KEYS.RECENT_CONFIGS, limitedConfigs);
  }

  /**
   * 获取解析历史
   */
  public async getParseHistory(): Promise<any[]> {
    return await this.getValue(STORAGE_KEYS.PARSE_HISTORY, []);
  }

  /**
   * 添加解析历史
   */
  public async addParseHistory(parseResult: any): Promise<void> {
    const history = await this.getParseHistory();
    
    // 添加时间戳
    const historyItem = {
      ...parseResult,
      timestamp: Date.now(),
      id: `parse_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    };
    
    history.unshift(historyItem);
    
    // 保持最多50条历史记录
    const limitedHistory = history.slice(0, 50);
    
    await this.setValue(STORAGE_KEYS.PARSE_HISTORY, limitedHistory);
  }

  /**
   * 清理解析历史
   */
  public async clearParseHistory(): Promise<void> {
    await this.setValue(STORAGE_KEYS.PARSE_HISTORY, []);
  }

  /**
   * 获取表单草稿
   */
  public async getFormDrafts(): Promise<Record<string, any>> {
    return await this.getValue(STORAGE_KEYS.FORM_DRAFTS, {});
  }

  /**
   * 保存表单草稿
   */
  public async saveFormDraft(formId: string, data: any): Promise<void> {
    const drafts = await this.getFormDrafts();
    drafts[formId] = {
      data,
      timestamp: Date.now()
    };
    await this.setValue(STORAGE_KEYS.FORM_DRAFTS, drafts);
  }

  /**
   * 获取表单草稿
   */
  public async getFormDraft(formId: string): Promise<any> {
    const drafts = await this.getFormDrafts();
    return drafts[formId]?.data || null;
  }

  /**
   * 删除表单草稿
   */
  public async removeFormDraft(formId: string): Promise<void> {
    const drafts = await this.getFormDrafts();
    delete drafts[formId];
    await this.setValue(STORAGE_KEYS.FORM_DRAFTS, drafts);
  }

  /**
   * 保存配置生成器数据
   */
  public async saveConfigGeneratorData(data: any): Promise<void> {
    await this.setValue('config_generator_data', data);
  }

  /**
   * 获取配置生成器数据
   */
  public async getConfigGeneratorData(): Promise<any> {
    return await this.getValue('config_generator_data', null);
  }

  /**
   * 保存配置解析器数据
   */
  public async saveConfigParserData(data: any): Promise<void> {
    await this.setValue('config_parser_data', data);
  }

  /**
   * 获取配置解析器数据
   */
  public async getConfigParserData(): Promise<any> {
    return await this.getValue('config_parser_data', null);
  }

  /**
   * 导出所有数据
   */
  public async exportAllData(): Promise<any> {
    const data: any = {};
    const keys = await this.getKeys();
    
    for (const key of keys) {
      data[key] = await this.getValue(key);
    }
    
    return {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      data
    };
  }

  /**
   * 导入数据
   */
  public async importData(exportedData: any): Promise<void> {
    if (!exportedData || !exportedData.data) {
      throw new Error('无效的导入数据格式');
    }
    
    const confirm = window.confirm('导入数据将覆盖现有数据，确定继续吗？');
    if (!confirm) {
      return;
    }
    
    for (const [key, value] of Object.entries(exportedData.data)) {
      await this.setValue(key, value);
    }
  }

  /**
   * 获取存储统计信息
   */
  public async getStorageStats(): Promise<any> {
    const keys = await this.getKeys();
    let totalSize = 0;
    const itemStats: any = {};
    
    for (const key of keys) {
      const value = await this.getValue(key);
      const size = JSON.stringify(value).length;
      totalSize += size;
      itemStats[key] = {
        size,
        type: typeof value,
        isArray: Array.isArray(value)
      };
    }
    
    return {
      totalItems: keys.length,
      totalSize,
      averageSize: totalSize / keys.length || 0,
      storageType: this.isLocalStorageAvailable ? 'localStorage' : 'memory',
      items: itemStats
    };
  }

  /**
   * 清理过期数据
   */
  public async cleanupExpiredData(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const keys = await this.getKeys();
    
    for (const key of keys) {
      const value = await this.getValue(key);
      
      // 检查是否有时间戳
      if (value && typeof value === 'object' && value.timestamp) {
        if (now - value.timestamp > maxAge) {
          await this.removeValue(key);
          console.log(`Removed expired data for key: ${key}`);
        }
      }
    }
  }

  /**
   * 压缩数据（简单实现）
   */
  private compressData(data: any): string {
    // 这里可以实现更复杂的压缩算法
    const jsonString = JSON.stringify(data);
    
    // 简单的字符串压缩（移除多余空格）
    return jsonString.replace(/\s+/g, ' ').trim();
  }

  /**
   * 解压数据
   */
  private decompressData(compressedData: string): any {
    return JSON.parse(compressedData);
  }

  /**
   * 备份数据
   */
  public async backupData(): Promise<string> {
    const allData = await this.exportAllData();
    const compressed = this.compressData(allData);
    
    // 生成备份文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `rcc-config-backup-${timestamp}.json`;
    
    // 创建下载链接
    const blob = new Blob([compressed], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return filename;
  }

  /**
   * 从文件恢复数据
   */
  public async restoreFromFile(file: File): Promise<void> {
    try {
      const content = await file.text();
      const data = this.decompressData(content);
      await this.importData(data);
    } catch (error) {
      throw new Error(`数据恢复失败: ${error}`);
    }
  }
}