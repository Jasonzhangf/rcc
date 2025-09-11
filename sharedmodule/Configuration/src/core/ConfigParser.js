/**
 * 配置解析器
 *
 * 负责将原始配置数据解析为标准化的ConfigData结构
 */
/**
 * 配置解析器类
 */
export class ConfigParser {
    constructor() {
        this.initialized = false;
    }
    /**
     * 初始化解析器
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        console.log('ConfigParser initialized successfully');
    }
    /**
     * 解析配置数据
     */
    async parseConfig(rawData) {
        try {
            // 解析基本配置信息
            const config = {
                version: rawData.version || '1.0.0',
                providers: {},
                virtualModels: {},
                createdAt: rawData.createdAt || new Date().toISOString(),
                updatedAt: rawData.updatedAt || new Date().toISOString()
            };
            // 解析供应商配置
            if (rawData.providers) {
                config.providers = this.parseProviders(rawData.providers);
            }
            // 解析虚拟模型配置
            if (rawData.virtualModels) {
                config.virtualModels = this.parseVirtualModels(rawData.virtualModels);
            }
            // 更新时间戳
            config.updatedAt = new Date().toISOString();
            console.log('Configuration parsed successfully');
            return config;
        }
        catch (error) {
            console.error('Failed to parse configuration:', error);
            throw error;
        }
    }
    /**
     * 解析供应商配置
     */
    parseProviders(rawProviders) {
        const providers = {};
        for (const [providerId, rawProvider] of Object.entries(rawProviders)) {
            if (typeof rawProvider !== 'object' || rawProvider === null) {
                continue;
            }
            const provider = {
                id: providerId,
                name: rawProvider.name || providerId,
                type: rawProvider.type || 'unknown',
                endpoint: rawProvider.endpoint,
                models: {},
                auth: {
                    type: rawProvider.auth?.type || 'api-key',
                    keys: Array.isArray(rawProvider.auth?.keys) ? rawProvider.auth.keys : []
                }
            };
            // 解析模型配置
            if (rawProvider.models) {
                provider.models = this.parseModels(rawProvider.models);
            }
            providers[providerId] = provider;
        }
        return providers;
    }
    /**
     * 解析模型配置
     */
    parseModels(rawModels) {
        const models = {};
        for (const [modelId, rawModel] of Object.entries(rawModels)) {
            if (typeof rawModel !== 'object' || rawModel === null) {
                continue;
            }
            const model = {
                id: modelId,
                name: rawModel.name || modelId,
                contextLength: rawModel.contextLength,
                supportsFunctions: rawModel.supportsFunctions
            };
            models[modelId] = model;
        }
        return models;
    }
    /**
     * 解析虚拟模型配置
     */
    parseVirtualModels(rawVirtualModels) {
        const virtualModels = {};
        for (const [vmId, rawVm] of Object.entries(rawVirtualModels)) {
            if (typeof rawVm !== 'object' || rawVm === null) {
                continue;
            }
            // 处理targets数组
            let targets = [];
            if (Array.isArray(rawVm.targets)) {
                targets = rawVm.targets.map((target) => ({
                    providerId: target.providerId || '',
                    modelId: target.modelId || '',
                    keyIndex: target.keyIndex || 0
                }));
            }
            else if (rawVm.targetProvider && rawVm.targetModel) {
                // 兼容旧格式，转换为新格式
                targets = [{
                        providerId: rawVm.targetProvider || '',
                        modelId: rawVm.targetModel || '',
                        keyIndex: rawVm.keyIndex || 0
                    }];
            }
            else {
                // 默认空目标
                targets = [{
                        providerId: '',
                        modelId: '',
                        keyIndex: 0
                    }];
            }
            const virtualModel = {
                id: vmId,
                targets: targets,
                enabled: rawVm.enabled !== false,
                priority: rawVm.priority || 1
            };
            virtualModels[vmId] = virtualModel;
        }
        return virtualModels;
    }
    /**
     * 销毁解析器
     */
    async destroy() {
        this.initialized = false;
        console.log('ConfigParser destroyed successfully');
    }
}
