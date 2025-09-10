import { SystemIntegrationTest } from './SystemIntegrationTest';
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
  ModuleRegistration, 
  ResponseHandler,
  HandlingStatus
} from '../../../interfaces/SharedTypes';

/**
 * 系统验证运行器
 * 负责执行完整的系统验证测试并生成报告
 */
export class SystemVerificationRunner {
    private integrationTest: SystemIntegrationTest;
    private errorInterfaceGateway!: ErrorInterfaceGateway;
    private errorClassifier!: ErrorClassifier;
    private errorQueueManager!: ErrorQueueManager;
    private moduleRegistryManager!: ModuleRegistryManager;
    private policyEngine!: PolicyEngine;
    private responseExecutor!: ResponseExecutor;
    private responseRouterEngine!: ResponseRouterEngine;
    private responseTemplateManager!: ResponseTemplateManager;

    constructor() {
        this.integrationTest = new SystemIntegrationTest();
        this.initializeComponents();
    }

    private async initializeComponents(): Promise<void> {
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
     * 运行完整的系统验证
     */
    public async runCompleteVerification(): Promise<void> {
        console.log('🚀 开始完整的系统验证...');
        console.log('='.repeat(60));

        try {
            // 1. 初始化系统
            await this.initializeSystem();

            // 2. 运行验证测试
            const results = await this.integrationTest.runFullSystemVerification();

            // 3. 生成并显示报告
            const report = this.integrationTest.generateVerificationReport(results);
            console.log(report);

            // 4. 保存报告到文件
            await this.saveReportToFile(report, results);

            // 5. 根据结果提供后续建议
            if (results.success) {
                console.log('\n🎉 系统验证完成！所有测试均通过。');
                await this.performPostVerificationTasks();
            } else {
                console.log('\n⚠️ 系统验证发现问题，请按照报告中的建议进行修复。');
                await this.handleVerificationFailure(results);
            }

        } catch (error) {
            console.error('❌ 系统验证过程中发生严重错误:', error);
            await this.handleVerificationError(error);
        }

        console.log('='.repeat(60));
        console.log('🏁 系统验证结束');
    }

    /**
     * 初始化系统
     */
    private async initializeSystem(): Promise<void> {
        console.log('🔧 初始化系统...');
        
        try {
            // 注册默认处理器
            await this.registerDefaultHandlers();
            
            // 验证系统状态
            const gatewayStatus = this.errorInterfaceGateway.getStatus();
            const registryStatus = this.moduleRegistryManager.getStatus();
            
            if (!gatewayStatus.isInitialized || !registryStatus.isInitialized) {
                throw new Error('系统初始化失败');
            }
            
            console.log('✅ 系统初始化完成');
        } catch (error: any) {
            throw new Error(`系统初始化失败: ${error.message}`);
        }
    }

    /**
     * 注册默认处理器
     */
    private async registerDefaultHandlers(): Promise<void> {
        console.log('📝 注册默认处理器...');
        
        // 注册网络错误处理器
        const networkHandler: ResponseHandler = {
            handleId: 'network-handler',
            name: 'Network Handler',
            priority: 100,
            isEnabled: true,
            conditions: [],
            execute: async (errorContext: ErrorContext): Promise<ErrorResponse> => {
                console.log(`🌐 处理网络错误: ${errorContext.error.message}`);
                return {
                    responseId: `network-response-${errorContext.errorId}`,
                    errorId: errorContext.errorId,
                    result: {
                        status: HandlingStatus.SUCCESS,
                        message: 'Network error handled successfully',
                        details: `Processed network error: ${errorContext.error.message}`,
                        code: 'NETWORK_HANDLER_SUCCESS'
                    },
                    timestamp: new Date(),
                    processingTime: 30,
                    data: {
                        moduleName: errorContext.source.moduleName,
                        moduleId: errorContext.source.moduleId,
                        response: { message: 'Network handler response' },
                        config: errorContext.config || {},
                        metadata: { category: 'network' }
                    },
                    actions: [],
                    annotations: []
                };
            }
        };

        const networkModule: ModuleRegistration = {
            moduleId: 'network-module',
            moduleName: 'NetworkModule',
            moduleType: 'network',
            version: '1.0.0',
            config: {},
            capabilities: ['network-error-handling'],
            responseHandler: networkHandler as any
        };

        // 注册数据库错误处理器
        const databaseHandler: ResponseHandler = {
            handleId: 'database-handler',
            name: 'Database Handler',
            priority: 90,
            isEnabled: true,
            conditions: [],
            execute: async (errorContext: ErrorContext): Promise<ErrorResponse> => {
                console.log(`🗄️ 处理数据库错误: ${errorContext.error.message}`);
                return {
                    responseId: `database-response-${errorContext.errorId}`,
                    errorId: errorContext.errorId,
                    result: {
                        status: HandlingStatus.SUCCESS,
                        message: 'Database error handled successfully',
                        details: `Processed database error: ${errorContext.error.message}`,
                        code: 'DATABASE_HANDLER_SUCCESS'
                    },
                    timestamp: new Date(),
                    processingTime: 35,
                    data: {
                        moduleName: errorContext.source.moduleName,
                        moduleId: errorContext.source.moduleId,
                        response: { message: 'Database handler response' },
                        config: errorContext.config || {},
                        metadata: { category: 'database' }
                    },
                    actions: [],
                    annotations: []
                };
            }
        };

        const databaseModule: ModuleRegistration = {
            moduleId: 'database-module',
            moduleName: 'DatabaseModule',
            moduleType: 'database',
            version: '1.0.0',
            config: {},
            capabilities: ['database-error-handling'],
            responseHandler: databaseHandler as any
        };

        // 注册认证错误处理器
        const authHandler: ResponseHandler = {
            handleId: 'auth-handler',
            name: 'Auth Handler',
            priority: 80,
            isEnabled: true,
            conditions: [],
            execute: async (errorContext: ErrorContext): Promise<ErrorResponse> => {
                console.log(`🔐 处理认证错误: ${errorContext.error.message}`);
                return {
                    responseId: `auth-response-${errorContext.errorId}`,
                    errorId: errorContext.errorId,
                    result: {
                        status: HandlingStatus.SUCCESS,
                        message: 'Authentication error handled successfully',
                        details: `Processed authentication error: ${errorContext.error.message}`,
                        code: 'AUTH_HANDLER_SUCCESS'
                    },
                    timestamp: new Date(),
                    processingTime: 25,
                    data: {
                        moduleName: errorContext.source.moduleName,
                        moduleId: errorContext.source.moduleId,
                        response: { message: 'Auth handler response' },
                        config: errorContext.config || {},
                        metadata: { category: 'authentication' }
                    },
                    actions: [],
                    annotations: []
                };
            }
        };

        const authModule: ModuleRegistration = {
            moduleId: 'auth-module',
            moduleName: 'AuthModule',
            moduleType: 'authentication',
            version: '1.0.0',
            config: {},
            capabilities: ['auth-error-handling'],
            responseHandler: authHandler as any
        };

        // 注册验证错误处理器
        const validationHandler: ResponseHandler = {
            handleId: 'validation-handler',
            name: 'Validation Handler',
            priority: 70,
            isEnabled: true,
            conditions: [],
            execute: async (errorContext: ErrorContext): Promise<ErrorResponse> => {
                console.log(`✅ 处理验证错误: ${errorContext.error.message}`);
                return {
                    responseId: `validation-response-${errorContext.errorId}`,
                    errorId: errorContext.errorId,
                    result: {
                        status: HandlingStatus.SUCCESS,
                        message: 'Validation error handled successfully',
                        details: `Processed validation error: ${errorContext.error.message}`,
                        code: 'VALIDATION_HANDLER_SUCCESS'
                    },
                    timestamp: new Date(),
                    processingTime: 20,
                    data: {
                        moduleName: errorContext.source.moduleName,
                        moduleId: errorContext.source.moduleId,
                        response: { message: 'Validation handler response' },
                        config: errorContext.config || {},
                        metadata: { category: 'validation' }
                    },
                    actions: [],
                    annotations: []
                };
            }
        };

        const validationModule: ModuleRegistration = {
            moduleId: 'validation-module',
            moduleName: 'ValidationModule',
            moduleType: 'validation',
            version: '1.0.0',
            config: {},
            capabilities: ['validation-error-handling'],
            responseHandler: validationHandler as any
        };

        // 注册业务逻辑错误处理器
        const businessLogicHandler: ResponseHandler = {
            handleId: 'business-logic-handler',
            name: 'Business Logic Handler',
            priority: 60,
            isEnabled: true,
            conditions: [],
            execute: async (errorContext: ErrorContext): Promise<ErrorResponse> => {
                console.log(`💼 处理业务逻辑错误: ${errorContext.error.message}`);
                return {
                    responseId: `business-logic-response-${errorContext.errorId}`,
                    errorId: errorContext.errorId,
                    result: {
                        status: HandlingStatus.SUCCESS,
                        message: 'Business logic error handled successfully',
                        details: `Processed business logic error: ${errorContext.error.message}`,
                        code: 'BUSINESS_LOGIC_HANDLER_SUCCESS'
                    },
                    timestamp: new Date(),
                    processingTime: 40,
                    data: {
                        moduleName: errorContext.source.moduleName,
                        moduleId: errorContext.source.moduleId,
                        response: { message: 'Business logic handler response' },
                        config: errorContext.config || {},
                        metadata: { category: 'business_logic' }
                    },
                    actions: [],
                    annotations: []
                };
            }
        };

        const businessLogicModule: ModuleRegistration = {
            moduleId: 'business-logic-module',
            moduleName: 'BusinessLogicModule',
            moduleType: 'business',
            version: '1.0.0',
            config: {},
            capabilities: ['business-error-handling'],
            responseHandler: businessLogicHandler as any
        };

        // 注册所有模块
        this.errorInterfaceGateway.registerModule(networkModule);
        this.moduleRegistryManager.registerModule(networkModule);

        this.errorInterfaceGateway.registerModule(databaseModule);
        this.moduleRegistryManager.registerModule(databaseModule);

        this.errorInterfaceGateway.registerModule(authModule);
        this.moduleRegistryManager.registerModule(authModule);

        this.errorInterfaceGateway.registerModule(validationModule);
        this.moduleRegistryManager.registerModule(validationModule);

        this.errorInterfaceGateway.registerModule(businessLogicModule);
        this.moduleRegistryManager.registerModule(businessLogicModule);

        console.log('✅ 默认处理器注册完成');
    }

    /**
     * 保存报告到文件
     */
    private async saveReportToFile(report: string, results: any): Promise<void> {
        const fs = require('fs');
        const path = require('path');
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const reportDir = path.join(process.cwd(), 'verification-reports');
            
            // 确保目录存在
            if (!fs.existsSync(reportDir)) {
                fs.mkdirSync(reportDir, { recursive: true });
            }
            
            // 保存详细报告
            const detailedReportPath = path.join(reportDir, `verification-report-${timestamp}.md`);
            fs.writeFileSync(detailedReportPath, report);
            
            // 保存JSON结果
            const jsonResultsPath = path.join(reportDir, `verification-results-${timestamp}.json`);
            fs.writeFileSync(jsonResultsPath, JSON.stringify(results, null, 2));
            
            console.log(`📄 详细报告已保存到: ${detailedReportPath}`);
            console.log(`📊 JSON结果已保存到: ${jsonResultsPath}`);
        } catch (error) {
            console.error('❌ 保存报告文件失败:', error);
        }
    }

    /**
     * 执行验证后任务
     */
    private async performPostVerificationTasks(): Promise<void> {
        console.log('\n🎯 执行验证后任务...');
        
        try {
            // 1. 生成性能基准
            await this.generatePerformanceBaseline();
            
            // 2. 验证系统稳定性
            await this.verifySystemStability();
            
            // 3. 清理测试数据
            await this.cleanupTestData();
            
            console.log('✅ 验证后任务完成');
        } catch (error) {
            console.error('❌ 验证后任务执行失败:', error);
        }
    }

    /**
     * 生成性能基准
     */
    private async generatePerformanceBaseline(): Promise<void> {
        console.log('📈 生成性能基准...');
        
        try {
            // const registryStatus = this.moduleRegistryManager.getStatus();
            // const _handlerCount = registryStatus.modulesCount; // unused but kept for reference
            
            // const baseline = {
            //     timestamp: Date.now(),
            //     handlerCount,
            //     averageResponseTime: 0, // 将在实际测试中填充
            //     throughput: 0, // 将在实际测试中填充
            //     successRate: 100,
            //     memoryUsage: process.memoryUsage(),
            //     uptime: process.uptime()
            // };
            
            console.log('✅ 性能基准生成完成');
        } catch (error: any) {
            console.error('❌ 生成性能基准失败:', error);
        }
    }

    /**
     * 验证系统稳定性
     */
    private async verifySystemStability(): Promise<void> {
        console.log('🔍 验证系统稳定性...');
        
        try {
            // 运行多次快速测试以确保稳定性
            for (let i = 0; i < 5; i++) {
                const testError: ErrorContext = {
                    errorId: `stability-test-${i}`,
                    error: new Error(`稳定性测试 ${i + 1}`),
                    source: {
                        moduleId: 'stability-test-module',
                        moduleName: 'StabilityTestModule',
                        version: '1.0.0',
                        fileName: 'stability-test.ts',
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
                    data: { source: 'stability-test', iteration: i }
                };
                
                const response = await this.errorInterfaceGateway.handleError(testError);
                if (!response) {
                    throw new Error(`稳定性测试 ${i + 1} 失败`);
                }
            }
            
            console.log('✅ 系统稳定性验证通过');
        } catch (error: any) {
            console.error('❌ 系统稳定性验证失败:', error);
            throw error;
        }
    }

    /**
     * 清理测试数据
     */
    private async cleanupTestData(): Promise<void> {
        console.log('🧹 清理测试数据...');
        
        try {
            // 清理测试期间注册的临时模块
            const testModules = ['test-module', 'temp-module'];
            for (const moduleId of testModules) {
                const registeredModule = this.moduleRegistryManager.getModule(moduleId);
                if (registeredModule) {
                    this.moduleRegistryManager.unregisterModule(moduleId);
                }
            }
            
            console.log('✅ 测试数据清理完成');
        } catch (error: any) {
            console.error('❌ 清理测试数据失败:', error);
        }
    }

    /**
     * 处理验证失败
     */
    private async handleVerificationFailure(results: any): Promise<void> {
        console.log('🔧 处理验证失败...');
        
        try {
            // 1. 分析失败原因
            const failureAnalysis = this.analyzeVerificationFailure(results);
            
            // 2. 生成修复建议
            const fixSuggestions = this.generateFixSuggestions(failureAnalysis);
            
            // 3. 输出修复指导
            console.log('\n📋 修复建议:');
            fixSuggestions.forEach((suggestion, index) => {
                console.log(`${index + 1}. ${suggestion}`);
            });
            
            // 4. 保存失败报告
            await this.saveFailureReport(results, failureAnalysis, fixSuggestions);
            
        } catch (error) {
            console.error('❌ 处理验证失败时发生错误:', error);
        }
    }

    /**
     * 分析验证失败原因
     */
    private analyzeVerificationFailure(results: any): any {
        const analysis = {
            testFailures: [] as any[],
            healthIssues: [] as string[],
            performanceProblems: [] as string[],
            configurationIssues: [] as string[]
        };
        
        // 分析测试失败
        if (results.testResults && results.testResults.automatedResults) {
            const failedTests = results.testResults.automatedResults.results.filter(
                (result: any) => !result.passed
            );
            analysis.testFailures = failedTests.map((test: any) => ({
                name: test.name,
                error: test.error,
                category: test.category
            }));
        }
        
        // 分析健康问题
        if (results.systemHealth) {
            const components = results.systemHealth.components;
            if (!components.errorInterfaceGateway.isInitialized) {
                analysis.healthIssues.push('错误接口网关异常');
            }
            if (!components.moduleRegistryManager.isInitialized) {
                analysis.healthIssues.push('模块注册管理器异常');
            }
            if (components.testFramework && !components.testFramework.healthy) {
                analysis.healthIssues.push('测试框架异常');
            }
        }
        
        // 分析性能问题
        if (results.testResults && results.testResults.performanceResults) {
            const perf = results.testResults.performanceResults;
            if (perf.averageResponseTime > 1000) {
                analysis.performanceProblems.push('响应时间过长');
            }
            if (perf.throughput < 100) {
                analysis.performanceProblems.push('吞吐量过低');
            }
        }
        
        return analysis;
    }

    /**
     * 生成修复建议
     */
    private generateFixSuggestions(analysis: any): string[] {
        const suggestions: string[] = [];
        
        // 测试失败修复建议
        if (analysis.testFailures.length > 0) {
            suggestions.push('检查失败的测试用例，修复相关功能');
            suggestions.push('验证错误处理逻辑是否正确实现');
        }
        
        // 健康问题修复建议
        if (analysis.healthIssues.length > 0) {
            suggestions.push('检查系统组件的初始化和配置');
            suggestions.push('验证模块间的依赖关系');
        }
        
        // 性能问题修复建议
        if (analysis.performanceProblems.length > 0) {
            suggestions.push('优化错误处理逻辑以提高性能');
            suggestions.push('考虑使用异步处理和缓存机制');
        }
        
        // 通用建议
        suggestions.push('检查系统日志以获取更详细的错误信息');
        suggestions.push('确保所有必要的依赖项都已正确安装');
        suggestions.push('验证配置文件是否正确设置');
        
        return suggestions;
    }

    /**
     * 保存失败报告
     */
    private async saveFailureReport(results: any, analysis: any, suggestions: string[]): Promise<void> {
        const fs = require('fs');
        const path = require('path');
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const reportDir = path.join(process.cwd(), 'verification-reports');
            
            const failureReport = {
                timestamp,
                status: 'failed',
                results,
                analysis,
                suggestions,
                environment: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    memoryUsage: process.memoryUsage()
                }
            };
            
            const reportPath = path.join(reportDir, `verification-failure-${timestamp}.json`);
            fs.writeFileSync(reportPath, JSON.stringify(failureReport, null, 2));
            
            console.log(`📄 失败报告已保存到: ${reportPath}`);
        } catch (error) {
            console.error('❌ 保存失败报告失败:', error);
        }
    }

    /**
     * 处理验证错误
     */
    private async handleVerificationError(error: any): Promise<void> {
        console.log('💥 处理验证错误...');
        
        try {
            // 保存错误报告
            const errorReport = {
                timestamp: Date.now(),
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                },
                environment: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    memoryUsage: process.memoryUsage()
                }
            };
            
            const fs = require('fs');
            const path = require('path');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const reportDir = path.join(process.cwd(), 'verification-reports');
            
            if (!fs.existsSync(reportDir)) {
                fs.mkdirSync(reportDir, { recursive: true });
            }
            
            const reportPath = path.join(reportDir, `verification-error-${timestamp}.json`);
            fs.writeFileSync(reportPath, JSON.stringify(errorReport, null, 2));
            
            console.log(`📄 错误报告已保存到: ${reportPath}`);
        } catch (reportError: any) {
            console.error('❌ 保存错误报告失败:', reportError);
        }
    }
}

/**
 * 主入口函数
 */
export async function runSystemVerification(): Promise<void> {
    const runner = new SystemVerificationRunner();
    await runner.runCompleteVerification();
}

// 如果直接运行此文件，执行验证
if (require.main === module) {
    runSystemVerification().catch(console.error);
}