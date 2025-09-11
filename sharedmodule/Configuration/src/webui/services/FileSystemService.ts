/**
 * 文件系统服务
 * 
 * 提供配置文件读取、写入、监控等文件系统操作功能
 */

import { UIService } from '../types/ui.types';

/**
 * 文件系统服务类
 */
export class FileSystemService implements UIService {
  private initialized = false;
  private fileWatchers: Map<string, any> = new Map();
  private isNodeEnvironment = false;

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    try {
      // 检测运行环境
      this.isNodeEnvironment = this.detectNodeEnvironment();
      
      this.initialized = true;
      console.log('FileSystemService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FileSystemService:', error);
      throw error;
    }
  }

  /**
   * 配置服务
   */
  public configure(options: any): void {
    console.log('FileSystemService configured with options:', options);
  }

  /**
   * 获取服务状态
   */
  public getStatus(): any {
    return {
      initialized: this.initialized,
      isNodeEnvironment: this.isNodeEnvironment,
      watchedFiles: this.fileWatchers.size
    };
  }

  /**
   * 检测是否在Node.js环境中
   */
  private detectNodeEnvironment(): boolean {
    // 在浏览器环境中，process可能不存在或不是Node.js的process
    return typeof process !== 'undefined' && 
           process.versions && 
           process.versions.node !== undefined;
  }

  /**
   * 读取配置文件
   */
  public async readConfigFile(filePath: string): Promise<any> {
    try {
      if (this.isNodeEnvironment) {
        // Node.js环境使用文件系统
        const fs = await import('fs');
        const path = await import('path');
        
        // 解析真实路径
        const resolvedPath = path.resolve(filePath);
        
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`配置文件不存在: ${resolvedPath}`);
        }
        
        const content = fs.readFileSync(resolvedPath, 'utf8');
        return this.parseConfigContent(content, resolvedPath);
      } else {
        // 浏览器环境，尝试从localStorage或模拟
        console.warn('浏览器环境中无法直接读取文件系统，使用模拟数据');
        return this.getMockConfigData();
      }
    } catch (error) {
      console.error(`读取配置文件失败 ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * 解析配置文件内容
   */
  private parseConfigContent(content: string, filePath: string): any {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    try {
      switch (ext) {
        case 'json':
          return JSON.parse(content);
        case 'yaml':
        case 'yml':
          // 这里需要YAML解析器，暂时用JSON解析作为示例
          return JSON.parse(content);
        case 'toml':
          // 这里需要TOML解析器，暂时用JSON解析作为示例
          return JSON.parse(content);
        default:
          // 默认尝试JSON解析
          return JSON.parse(content);
      }
    } catch (error) {
      throw new Error(`解析配置文件失败 ${filePath}: ${error}`);
    }
  }

  /**
   * 写入配置文件
   */
  public async writeConfigFile(filePath: string, data: any, format: 'json' | 'yaml' | 'toml' = 'json'): Promise<void> {
    try {
      if (this.isNodeEnvironment) {
        const fs = await import('fs');
        const path = await import('path');
        
        // 确保目录存在
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        let content: string;
        switch (format) {
          case 'json':
            content = JSON.stringify(data, null, 2);
            break;
          case 'yaml':
          case 'toml':
            // 这里需要相应的序列化器，暂时用JSON
            content = JSON.stringify(data, null, 2);
            break;
          default:
            content = JSON.stringify(data, null, 2);
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`配置文件已保存到: ${filePath}`);
      } else {
        // 浏览器环境保存到localStorage
        const key = `rcc_config_${filePath}`;
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`配置已保存到localStorage: ${key}`);
      }
    } catch (error) {
      console.error(`写入配置文件失败 ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * 监控配置文件变化
   */
  public async watchConfigFile(filePath: string, callback: (data: any) => void): Promise<void> {
    if (!this.isNodeEnvironment) {
      console.warn('浏览器环境不支持文件监控');
      return;
    }
    
    try {
      const fs = await import('fs');
      
      // 如果已存在监控器，先停止
      if (this.fileWatchers.has(filePath)) {
        const watcher = this.fileWatchers.get(filePath);
        watcher.close();
        this.fileWatchers.delete(filePath);
      }
      
      // 创建文件监控器
      const watcher = fs.watch(filePath, async (eventType: string) => {
        if (eventType === 'change') {
          try {
            console.log(`检测到配置文件变化: ${filePath}`);
            const data = await this.readConfigFile(filePath);
            callback(data);
          } catch (error) {
            console.error(`读取变化的配置文件失败:`, error);
          }
        }
      });
      
      this.fileWatchers.set(filePath, watcher);
      console.log(`开始监控配置文件: ${filePath}`);
    } catch (error) {
      console.error(`监控配置文件失败 ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * 停止监控配置文件
   */
  public async unwatchConfigFile(filePath: string): Promise<void> {
    if (this.fileWatchers.has(filePath)) {
      const watcher = this.fileWatchers.get(filePath);
      watcher.close();
      this.fileWatchers.delete(filePath);
      console.log(`停止监控配置文件: ${filePath}`);
    }
  }

  /**
   * 查找默认配置文件
   */
  public async findDefaultConfigFiles(): Promise<string[]> {
    const defaultPaths = [
      './config/rcc-config.json',
      './config.json',
      './rcc-config.json',
      './configs/rcc-config.json'
    ];
    
    const foundFiles: string[] = [];
    
    if (this.isNodeEnvironment) {
      const fs = await import('fs');
      const path = await import('path');
      
      for (const configPath of defaultPaths) {
        try {
          const resolvedPath = path.resolve(configPath);
          if (fs.existsSync(resolvedPath)) {
            foundFiles.push(resolvedPath);
          }
        } catch (error) {
          // 文件不存在，继续检查下一个
          continue;
        }
      }
    }
    
    return foundFiles;
  }

  /**
   * 列出配置目录中的所有配置文件
   */
  public async listConfigFiles(): Promise<string[]> {
    try {
      if (this.isNodeEnvironment) {
        const fs = await import('fs');
        const path = await import('path');
        
        // 默认配置目录
        const configDir = path.resolve('./config');
        
        if (fs.existsSync(configDir)) {
          const files = fs.readdirSync(configDir);
          return files
            .filter(file => file.endsWith('.json') || file.endsWith('.yaml') || file.endsWith('.yml'))
            .map(file => path.join(configDir, file));
        }
      }
      
      return [];
    } catch (error) {
      console.error('列出配置文件失败:', error);
      return [];
    }
  }

  /**
   * 删除配置文件
   */
  public async deleteConfigFile(filePath: string): Promise<void> {
    try {
      if (this.isNodeEnvironment) {
        const fs = await import('fs');
        const path = await import('path');
        
        const resolvedPath = path.resolve(filePath);
        if (fs.existsSync(resolvedPath)) {
          fs.unlinkSync(resolvedPath);
          console.log(`配置文件已删除: ${resolvedPath}`);
        } else {
          throw new Error(`文件不存在: ${resolvedPath}`);
        }
      } else {
        // 浏览器环境从localStorage删除
        const key = `rcc_config_${filePath}`;
        localStorage.removeItem(key);
        console.log(`配置已从localStorage删除: ${key}`);
      }
    } catch (error) {
      console.error(`删除配置文件失败 ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * 备份配置文件
   */
  public async backupConfigFile(filePath: string): Promise<string> {
    try {
      if (this.isNodeEnvironment) {
        const fs = await import('fs');
        const path = await import('path');
        
        const resolvedPath = path.resolve(filePath);
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`源文件不存在: ${resolvedPath}`);
        }
        
        // 创建备份文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = resolvedPath.replace(/(\.[^.]+)?$/, `.${timestamp}.backup$1`);
        
        // 复制文件
        fs.copyFileSync(resolvedPath, backupPath);
        console.log(`配置文件已备份到: ${backupPath}`);
        
        return backupPath;
      } else {
        // 浏览器环境不支持文件备份
        throw new Error('浏览器环境不支持文件备份');
      }
    } catch (error) {
      console.error(`备份配置文件失败 ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * 获取配置文件信息
   */
  public async getConfigFileInfo(filePath: string): Promise<any> {
    try {
      if (this.isNodeEnvironment) {
        const fs = await import('fs');
        const path = await import('path');
        
        const resolvedPath = path.resolve(filePath);
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`文件不存在: ${resolvedPath}`);
        }
        
        const stats = fs.statSync(resolvedPath);
        
        return {
          path: resolvedPath,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory()
        };
      } else {
        // 浏览器环境返回模拟信息
        return {
          path: filePath,
          size: 0,
          createdAt: new Date(),
          modifiedAt: new Date(),
          isFile: true,
          isDirectory: false
        };
      }
    } catch (error) {
      console.error(`获取文件信息失败 ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * 获取模拟配置数据
   */
  private getMockConfigData(): any {
    return {
      metadata: {
        name: "RCC Configuration",
        description: "模拟配置数据",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: "Mock Data Generator"
      },
      settings: {
        general: {
          port: { value: 5506, type: "number", required: true },
          debug: { value: true, type: "boolean", required: false }
        },
        providers: {
          openai: {
            name: "OpenAI",
            type: "openai",
            endpoint: "https://api.openai.com/v1",
            models: {
              "gpt-4": {
                name: "GPT-4",
                contextLength: 8192,
                supportsFunctions: true
              }
            },
            auth: {
              type: "api-key",
              keys: ["sk-xxx"]
            }
          }
        }
      },
      version: "1.0.0"
    };
  }

  /**
   * 销毁服务
   */
  public async destroy(): Promise<void> {
    // 关闭所有文件监控器
    for (const [filePath, watcher] of this.fileWatchers) {
      try {
        watcher.close();
        console.log(`关闭文件监控器: ${filePath}`);
      } catch (error) {
        console.error(`关闭文件监控器失败 ${filePath}:`, error);
      }
    }
    
    this.fileWatchers.clear();
    this.initialized = false;
    console.log('FileSystemService destroyed');
  }
}