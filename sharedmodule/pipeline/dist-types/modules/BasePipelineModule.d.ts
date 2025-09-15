import { BaseModule, ModuleInfo, ValidationRule } from 'rcc-basemodule';
/**
 * Abstract base class for all pipeline modules
 * Extends BaseModule with pipeline-specific functionality
 */
export declare abstract class BasePipelineModule extends BaseModule {
    protected moduleName: string;
    protected validationRules: ValidationRule[];
    constructor(info: ModuleInfo);
    /**
     * Process method - Core interface for all pipeline modules
     * This is a blocking interface that processes requests and returns responses
     * @param request - Input request data
     * @returns Promise<any> - Processed response data
     */
    abstract process(request: any): Promise<any>;
    /**
     * Configure method - Configure the module with settings
     * @param config - Configuration object
     * @returns Promise<void>
     */
    configure(config: any): Promise<void>;
    /**
     * Process response method - Handle response processing
     * @param response - Input response data
     * @returns Promise<any> - Processed response data
     */
    abstract processResponse?(response: any): Promise<any>;
    /**
     * Get module ID
     * @returns string - Module ID
     */
    getId(): string;
    /**
     * Get module name
     * @returns string - Module name
     */
    getName(): string;
    /**
     * Get module type
     * @returns string - Module type
     */
    getType(): string;
    /**
     * Check if module is configured
     * @returns boolean - Whether module is configured
     */
    isConfigured(): boolean;
    /**
     * Log input data at input port
     * @param data - Input data
     * @param port - Input port name
     * @param source - Source module
     */
    protected logInputPort(data: any, port: string, source?: string): void;
    /**
     * Log output data at output port
     * @param data - Output data
     * @param port - Output port name
     * @param target - Target module
     */
    protected logOutputPort(data: any, port: string, target?: string): void;
    /**
     * Generate unique request ID
     * @returns string - Unique request identifier
     */
    protected generateRequestId(): string;
    /**
     * Validate input data with required fields
     * @param data - Data to validate
     * @param requiredFields - Required field names
     * @throws Error if validation fails
     */
    protected validateInputWithFields(data: any, requiredFields: string[]): void;
    /**
     * Connect to another module
     * @param targetModule - Target module to connect to
     */
    connect(targetModule: BasePipelineModule): void;
    /**
     * Disconnect from another module
     * @param targetModule - Target module to disconnect from
     */
    disconnect(targetModule: BasePipelineModule): void;
    /**
     * Get module health status
     * @returns Object containing health information
     */
    getHealth(): {
        status: string;
        uptime: number;
        lastCheck: number;
    };
}
//# sourceMappingURL=BasePipelineModule.d.ts.map