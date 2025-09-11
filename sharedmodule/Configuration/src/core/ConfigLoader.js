/**
 * 配置加载器
 *
 * 负责配置文件的加载和保存
 */
import * as fs from 'fs/promises';
import * as path from 'path';
/**
 * 配置加载器类
 */
export class ConfigLoader {
    constructor() {
        this.initialized = false;
    }
    /**
     * 初始化加载器
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        console.log('ConfigLoader initialized successfully');
    }
    /**
     * 加载配置文件
     */
    async loadConfig(configPath) {
        try {
            // 检查文件是否存在
            await fs.access(configPath);
            // 读取文件内容
            const content = await fs.readFile(configPath, 'utf-8');
            // 解析JSON
            const config = JSON.parse(content);
            console.log(`Configuration loaded from ${configPath}`);
            return config;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`Configuration file not found at ${configPath}, creating empty config`);
                return this.createEmptyConfig();
            }
            console.error(`Failed to load configuration from ${configPath}:`, error);
            throw error;
        }
    }
    /**
     * 保存配置文件
     */
    async saveConfig(config, configPath) {
        try {
            // 确保目录存在
            const dir = path.dirname(configPath);
            await fs.mkdir(dir, { recursive: true });
            // 格式化并保存配置
            const content = JSON.stringify(config, null, 2);
            await fs.writeFile(configPath, content, 'utf-8');
            console.log(`Configuration saved to ${configPath}`);
        }
        catch (error) {
            console.error(`Failed to save configuration to ${configPath}:`, error);
            throw error;
        }
    }
    /**
     * 创建空配置
     */
    createEmptyConfig() {
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
    async configFileExists(configPath) {
        try {
            await fs.access(configPath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * 获取配置文件信息
     */
    async getConfigFileInfo(configPath) {
        try {
            const stats = await fs.stat(configPath);
            return {
                exists: true,
                size: stats.size,
                modified: stats.mtime
            };
        }
        catch {
            return { exists: false };
        }
    }
    /**
     * 销毁加载器
     */
    async destroy() {
        this.initialized = false;
        console.log('ConfigLoader destroyed successfully');
    }
}
