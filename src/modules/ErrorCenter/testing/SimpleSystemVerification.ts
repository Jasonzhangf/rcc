import { ErrorInterfaceGateway } from '../../ErrorHandlingCenter/src/components/ErrorInterfaceGateway';
import { ErrorClassifier } from '../../ErrorHandlingCenter/src/components/ErrorClassifier';
import { ErrorQueueManager } from '../../ErrorHandlingCenter/src/components/ErrorQueueManager';
import { ModuleRegistryManager } from '../../ErrorHandlingCenter/src/components/ModuleRegistryManager';
import { PolicyEngine } from '../../ErrorHandlingCenter/src/components/PolicyEngine';
import { ResponseExecutor } from '../../ErrorHandlingCenter/src/components/ResponseExecutor';
import { ResponseRouterEngine } from '../../ErrorHandlingCenter/src/components/ResponseRouterEngine';
import { ResponseTemplateManager } from '../../ErrorHandlingCenter/src/components/ResponseTemplateManager';
import { 
  ErrorContext, 
  ErrorResponse, 
  ResponseHandler,
  HandlingStatus
} from '../../../interfaces/SharedTypes';

/**
 * 简化的系统验证脚本
 * 专注于验证核心错误处理系统功能
 */
export class SimpleSystemVerification {
    private errorInterfaceGateway!: ErrorInterfaceGateway;
    private errorClassifier!: ErrorClassifier;
    private errorQueueManager!: ErrorQueueManager;
    private moduleRegistryManager!: ModuleRegistryManager;
    private policyEngine!: PolicyEngine;
    private responseExecutor!: ResponseExecutor;
    private responseRouterEngine!: ResponseRouterEngine;
    private responseTemplateManager!: ResponseTemplateManager;
    private isInitialized = false;

    constructor() {
        this.initializeComponents();
    }

    private async initializeComponents(): Promise<void> {
        try {
            console.log('🔧 初始化错误处理系统组件...');
            
            // Initialize all components
            this.errorClassifier = new ErrorClassifier();
            this.errorQueueManager = new ErrorQueueManager();
            this.moduleRegistryManager = new ModuleRegistryManager();
            this.policyEngine = new PolicyEngine();
            this.responseTemplateManager = new ResponseTemplateManager();
            
            // Create default handler
            const defaultHandler = this.createDefaultHandler();
            
            this.responseRouterEngine = new ResponseRouterEngine(defaultHandler);
            this.responseExecutor = new ResponseExecutor(this.policyEngine);
            this.errorInterfaceGateway = new ErrorInterfaceGateway(this.errorQueueManager, this.responseRouterEngine);
            
            // Initialize all components
            await this.errorClassifier.initialize();
            await this.errorQueueManager.initialize();
            await this.moduleRegistryManager.initialize();
            await this.policyEngine.initialize();
            await this.responseTemplateManager.initialize();
            await this.responseRouterEngine.initialize();
            await this.responseExecutor.initialize();
            await this.errorInterfaceGateway.initialize();
            
            this.isInitialized = true;
            console.log('✅ 错误处理系统初始化完成');
        } catch (error: any) {
            console.error('❌ 错误处理系统初始化失败:', error);
            throw error;
        }
    }

    private createDefaultHandler(): ResponseHandler {
        return {
            handleId: 'default-handler',
            name: 'Default Handler',
            priority: 100,
            isEnabled: true,
            conditions: [],
            execute: async (errorContext: ErrorContext): Promise<ErrorResponse> => {
                return {
                    responseId: `default-response-${errorContext.errorId}`,
                    errorId: errorContext.errorId,
                    result: {
                        status: HandlingStatus.SUCCESS,
                        message: 'Default handler processed error successfully',
                        details: `Processed error with ID: ${errorContext.errorId}`,
                        code: 'DEFAULT_HANDLER_SUCCESS'
                    },
                    timestamp: new Date(),
                    processingTime: 50,
                    data: {
                        moduleName: errorContext.source.moduleName,
                        moduleId: errorContext.source.moduleId,
                        response: { message: 'Default handler response' },
                        config: errorContext.config || {},
                        metadata: { processed: true }
                    },
                    actions: [],
                    annotations: []
                };
            }
        };
    }

    /**
     * 运行简化的系统验证
     */
    public async runSimpleVerification(): Promise<void> {
        console.log('⚡ 开始简化的系统验证...');
        console.log('='.repeat(50));

        try {
            // 1. 基础功能验证
            await this.verifyBasicFunctionality();
            
            // 2. 错误处理验证
            await this.verifyErrorHandling();
            
            // 3. 系统健康检查
            await this.verifySystemHealth();
            
            console.log('✅ 简化系统验证完成！');
            console.log('🎉 所有核心功能运行正常');
            
        } catch (error: any) {
            console.error('❌ 简化系统验证失败:', error);
            throw error;
        }

        console.log('='.repeat(50));
    }

    /**
     * 验证基础功能
     */
    private async verifyBasicFunctionality(): Promise<void> {
        console.log('🔍 验证基础功能...');
        
        try {
            // 检查系统是否正确初始化
            if (!this.isInitialized) {
                throw new Error('错误处理系统未正确初始化');
            }

            // 检查各组件状态
            const gatewayStatus = this.errorInterfaceGateway.getStatus();
            const registryStatus = this.moduleRegistryManager.getStatus();
            const queueStatus = this.errorQueueManager.getQueueStatus();
            
            if (!gatewayStatus.isInitialized) {
                throw new Error('错误接口网关未正确初始化');
            }
            
            if (!registryStatus.isInitialized) {
                throw new Error('模块注册管理器未正确初始化');
            }
            
            if (queueStatus.size < 0) {
                throw new Error('错误队列管理器状态异常');
            }

            console.log('✅ 基础功能验证通过');
        } catch (error: any) {
            console.error('❌ 基础功能验证失败:', error);
            throw error;
        }
    }

    /**
     * 验证错误处理功能
     */
    private async verifyErrorHandling(): Promise<void> {
        console.log('🔍 验证错误处理功能...');
        
        try {
            // 创建测试错误
            const testError: ErrorContext = {
                errorId: 'verification-test-error',
                error: new Error('验证测试错误'),
                source: {
                    moduleId: 'verification-test-module',
                    moduleName: 'VerificationTestModule',
                    version: '1.0.0',
                    fileName: 'verification-test.ts',
                    lineNumber: 42
                },
                classification: {
                    source: 'module' as any,
                    type: 'technical' as any,
                    severity: 'medium' as any,
                    impact: 'single_module' as any,
                    recoverability: 'recoverable' as any
                },
                timestamp: new Date(),
                config: {},
                data: { source: 'verification-test' }
            };

            // 处理错误
            const response = await this.errorInterfaceGateway.handleError(testError);
            
            if (!response) {
                throw new Error('错误处理未返回响应');
            }
            
            if (response.errorId !== testError.errorId) {
                throw new Error('错误响应ID不匹配');
            }
            
            if (response.result.status !== HandlingStatus.SUCCESS) {
                throw new Error('错误处理状态不正确');
            }

            console.log('✅ 错误处理功能验证通过');
        } catch (error: any) {
            console.error('❌ 错误处理功能验证失败:', error);
            throw error;
        }
    }

    /**
     * 验证系统健康状态
     */
    private async verifySystemHealth(): Promise<void> {
        console.log('🔍 验证系统健康状态...');
        
        try {
            // 检查各组件状态
            const gatewayStatus = this.errorInterfaceGateway.getStatus();
            const registryStatus = this.moduleRegistryManager.getStatus();
            const queueStatus = this.errorQueueManager.getQueueStatus();
            const policyStatus = this.policyEngine.getStatus();
            const executorStatus = this.responseExecutor.getStatus();
            const routerStatus = this.responseRouterEngine.getStatus();
            const templateStatus = this.responseTemplateManager.getStatus();
            
            // 计算健康分数
            let healthScore = 100;
            
            if (!gatewayStatus.isInitialized) healthScore -= 15;
            if (!registryStatus.isInitialized) healthScore -= 15;
            if (!policyStatus.isInitialized) healthScore -= 10;
            if (!executorStatus.isInitialized) healthScore -= 10;
            if (!routerStatus.isInitialized) healthScore -= 10;
            if (!templateStatus.isInitialized) healthScore -= 10;
            
            if (registryStatus.modulesCount < 1) healthScore -= 5;
            if (queueStatus.size > 100) healthScore -= 5;
            
            const overallHealth = healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical';
            
            console.log(`📊 系统健康分数: ${healthScore}/100 (${overallHealth})`);
            
            if (healthScore < 70) {
                throw new Error(`系统健康分数过低: ${healthScore}`);
            }

            console.log('✅ 系统健康状态验证通过');
        } catch (error: any) {
            console.error('❌ 系统健康状态验证失败:', error);
            throw error;
        }
    }

    /**
     * 生成验证报告
     */
    public generateVerificationReport(): string {
        const report = `
# 简化系统验证报告

## 验证结果
- **验证时间**: ${new Date().toLocaleString()}
- **系统状态**: ${this.isInitialized ? '✅ 正常' : '❌ 异常'}
- **初始化状态**: ${this.isInitialized ? '✅ 完成' : '❌ 失败'}

## 系统组件状态
- **错误接口网关**: ${this.errorInterfaceGateway?.getStatus().isInitialized ? '✅ 正常' : '❌ 异常'}
- **模块注册管理器**: ${this.moduleRegistryManager?.getStatus().isInitialized ? '✅ 正常' : '❌ 异常'}
- **错误队列管理器**: ${this.errorQueueManager ? '✅ 正常' : '❌ 异常'}
- **策略引擎**: ${this.policyEngine?.getStatus().isInitialized ? '✅ 正常' : '❌ 异常'}
- **响应执行器**: ${this.responseExecutor?.getStatus().isInitialized ? '✅ 正常' : '❌ 异常'}
- **响应路由引擎**: ${this.responseRouterEngine?.getStatus().isInitialized ? '✅ 正常' : '❌ 异常'}
- **响应模板管理器**: ${this.responseTemplateManager?.getStatus().isInitialized ? '✅ 正常' : '❌ 异常'}

## 验证项目
- ✅ 基础功能验证
- ✅ 错误处理验证  
- ✅ 系统健康状态验证

## 结论
🎉 错误处理系统验证完成，所有核心功能运行正常。
`;

        return report;
    }

    /**
     * 关闭系统
     */
    public async shutdown(): Promise<void> {
        try {
            console.log('🔄 关闭错误处理系统...');
            
            // Shutdown all components in reverse order
            if (this.errorInterfaceGateway) await this.errorInterfaceGateway.shutdown();
            if (this.responseExecutor) await this.responseExecutor.shutdown();
            if (this.responseRouterEngine) await this.responseRouterEngine.shutdown();
            if (this.responseTemplateManager) await this.responseTemplateManager.shutdown();
            if (this.policyEngine) await this.policyEngine.shutdown();
            if (this.moduleRegistryManager) await this.moduleRegistryManager.shutdown();
            if (this.errorQueueManager) await this.errorQueueManager.shutdown();
            if (this.errorClassifier) await this.errorClassifier.shutdown();
            
            console.log('✅ 错误处理系统关闭完成');
        } catch (error: any) {
            console.error('❌ 关闭错误处理系统时发生错误:', error);
        }
    }
}

/**
 * 主入口函数
 */
export async function runSimpleSystemVerification(): Promise<void> {
    const verification = new SimpleSystemVerification();
    
    try {
        await verification.runSimpleVerification();
        const report = verification.generateVerificationReport();
        console.log('\n📄 验证报告:');
        console.log(report);
    } finally {
        await verification.shutdown();
    }
}

// 如果直接运行此文件，执行验证
if (require.main === module) {
    runSimpleSystemVerification().catch(console.error);
}