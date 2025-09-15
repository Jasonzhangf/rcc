/**
 * 配置加载器
 * 
 * 负责配置文件的加载和保存
 */

import { ConfigData } from './ConfigData';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 配置加载器类
 */
export class ConfigLoader {
  private initialized = false;

  /**
   * 初始化加载器
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    console.log('ConfigLoader initialized successfully');
  }

  /**
   * 加载配置文件
   */
  public async loadConfig(configPath: string): Promise<any> {
    try {
      // 检查文件是否存在
      await fs.access(configPath);
      
      // 读取文件内容
      const content = await fs.readFile(configPath, 'utf-8');
      
      // 解析JSON
      const config = JSON.parse(content);
      
      console.log(`Configuration loaded from ${configPath}`);
      return config;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        console.log(`Configuration file not found at ${configPath}, creating empty config`);
        return this.createEmptyConfig();
      } else if (nodeError instanceof SyntaxError) {
        // 如果是JSON解析错误，重新抛出错误
        console.error(`Invalid JSON in configuration file ${configPath}:`, error);
        throw new Error(`Invalid JSON in configuration file ${configPath}: ${error.message}`);
      }
      console.error(`Failed to load configuration from ${configPath}:`, error);
      throw error;
    }
  }

  /**
   * 保存配置文件
   */
  public async saveConfig(config: ConfigData | any, configPath: string): Promise<void> {
    try {
      // 确保目录存在
      const dir = path.dirname(configPath);
      await fs.mkdir(dir, { recursive: true });
      
      // 格式化并保存配置
      const content = JSON.stringify(config, null, 2);
      await fs.writeFile(configPath, content, 'utf-8');
      
      console.log(`Configuration saved to ${configPath}`);
    } catch (error) {
      console.error(`Failed to save configuration to ${configPath}:`, error);
      throw error;
    }
  }

  /**
   * 创建空配置
   */
  private createEmptyConfig(): any {
    const now = new Date().toISOString();
    
    return {
      version: '1.0.0',
      providers: {},
      virtualModels: {},
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * 检查配置文件是否存在
   */
  public async configFileExists(configPath: string): Promise<boolean> {
    try {
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取配置文件信息
   */
  public async getConfigFileInfo(configPath: string): Promise<{ 
    exists: boolean; 
    size?: number; 
    modified?: Date 
  }> {
    try {
      const stats = await fs.stat(configPath);
      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * 销毁加载器
   */
  public async destroy(): Promise<void> {
    this.initialized = false;
    console.log('ConfigLoader destroyed successfully');
  }
}