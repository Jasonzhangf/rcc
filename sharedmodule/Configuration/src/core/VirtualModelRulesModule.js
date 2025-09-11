/**
 * 虚拟模型规则模块
 *
 * 用于验证虚拟模型配置的简单规则模块
 */
/**
 * 虚拟模型规则模块
 */
export class VirtualModelRulesModule {
    constructor() {
        this.initialized = false;
        this.fixedVirtualModels = [
            'default',
            'longcontext',
            'thinking',
            'background',
            'websearch',
            'vision',
            'coding'
        ];
    }
    /**
     * 初始化规则模块
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        console.log('VirtualModelRulesModule initialized successfully');
    }
    /**
     * 验证虚拟模型配置
     */
    async validateVirtualModels(config) {
        const errors = [];
        const warnings = [];
        // 检查必需的虚拟模型
        for (const requiredVm of this.fixedVirtualModels) {
            if (!config.virtualModels[requiredVm]) {
                errors.push(`Missing required virtual model: ${requiredVm}`);
            }
        }
        // 验证每个虚拟模型
        for (const [vmId, virtualModel] of Object.entries(config.virtualModels)) {
            // 验证每个目标
            virtualModel.targets.forEach((target, index) => {
                // 检查目标供应商是否存在
                if (target.providerId && !config.providers[target.providerId]) {
                    errors.push(`Virtual model ${vmId} target ${index} references unknown provider: ${target.providerId}`);
                }
                // 检查目标模型是否存在
                if (target.providerId && target.modelId) {
                    const provider = config.providers[target.providerId];
                    if (provider && !provider.models[target.modelId]) {
                        warnings.push(`Virtual model ${vmId} target ${index} references unknown model: ${target.modelId}`);
                    }
                }
            });
            // 检查优先级范围
            if (virtualModel.priority !== undefined && (virtualModel.priority < 1 || virtualModel.priority > 10)) {
                warnings.push(`Virtual model ${vmId} has priority out of range (1-10): ${virtualModel.priority}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    /**
     * 获取固定虚拟模型列表
     */
    getFixedVirtualModels() {
        return [...this.fixedVirtualModels];
    }
    /**
     * 销毁规则模块
     */
    async destroy() {
        this.initialized = false;
        console.log('VirtualModelRulesModule destroyed successfully');
    }
}
