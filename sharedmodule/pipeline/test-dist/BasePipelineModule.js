import { BaseModule } from 'rcc-basemodule';
/**
 * Abstract base class for all pipeline modules
 * Extends BaseModule with pipeline-specific functionality
 */
export class BasePipelineModule extends BaseModule {
    constructor(info) {
        super(info);
        this.moduleName = info.name || info.id || 'unknown';
        this.logInfo(`BasePipelineModule initialized: ${this.moduleName}`);
    }
    /**
     * Configure method - Configure the module with settings
     * @param config - Configuration object
     * @returns Promise<void>
     */
    configure(config) {
        super.configure(config);
        return Promise.resolve();
    }
    /**
     * Get module ID
     * @returns string - Module ID
     */
    getId() {
        return this.getInfo().id;
    }
    /**
     * Get module name
     * @returns string - Module name
     */
    getName() {
        return this.moduleName;
    }
    /**
     * Get module type
     * @returns string - Module type
     */
    getType() {
        return this.getInfo().type;
    }
    /**
     * Check if module is configured
     * @returns boolean - Whether module is configured
     */
    isConfigured() {
        const config = this.getConfig();
        return config !== undefined && Object.keys(config).length > 0;
    }
    /**
     * Log input data at input port
     * @param data - Input data
     * @param port - Input port name
     * @param source - Source module
     */
    logInputPort(data, port, source) {
        this.debug('info', `Input port data received: ${port} from ${source || 'unknown'}`);
    }
    /**
     * Log output data at output port
     * @param data - Output data
     * @param port - Output port name
     * @param target - Target module
     */
    logOutputPort(data, port, target) {
        this.debug('info', `Output port data sent: ${port} to ${target || 'unknown'}`);
    }
    /**
     * Generate unique request ID
     * @returns string - Unique request identifier
     */
    generateRequestId() {
        return `${this.moduleName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Validate input data with required fields
     * @param data - Data to validate
     * @param requiredFields - Required field names
     * @throws Error if validation fails
     */
    validateInputWithFields(data, requiredFields) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid input data: expected object');
        }
        for (const field of requiredFields) {
            if (!(field in data)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
    }
}
