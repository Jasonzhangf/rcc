import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
/**
 * Compatibility Module Configuration
 */
export interface CompatibilityConfig {
    /** Field mapping table name */
    mappingTable: string;
    /** Enable strict mapping */
    strictMapping?: boolean;
    /** Preserve unknown fields */
    preserveUnknownFields?: boolean;
    /** Validation configuration */
    validation?: {
        /** Enable validation */
        enabled: boolean;
        /** Required fields */
        required?: string[];
        /** Field type constraints */
        types?: Record<string, string>;
        /** Field value constraints */
        constraints?: Record<string, any>;
    };
}
/**
 * Field Mapping Configuration
 */
export interface FieldMapping {
    /** Target field name */
    targetField: string;
    /** Transform function */
    transform?: (value: any, context?: any) => any;
    /** Default value */
    defaultValue?: any;
    /** Required field */
    required?: boolean;
    /** Validation constraints */
    validation?: {
        /** Allow empty values */
        allowEmpty?: boolean;
        /** Minimum length */
        minLength?: number;
        /** Maximum length */
        maxLength?: number;
        /** Minimum value */
        min?: number;
        /** Maximum value */
        max?: number;
        /** Allowed values */
        allowed?: any[];
        /** Regular expression pattern */
        pattern?: string;
    };
}
/**
 * Mapping Table
 */
export interface MappingTable {
    /** Table version */
    version: string;
    /** Table description */
    description: string;
    /** Field mappings */
    fieldMappings: Record<string, string | FieldMapping>;
    /** Validation rules */
    validationRules?: {
        /** Global required fields */
        required?: string[];
        /** Global type constraints */
        types?: Record<string, string>;
        /** Global field constraints */
        constraints?: Record<string, any>;
    };
    /** Source and target format information */
    formats?: {
        source: string;
        target: string;
    };
}
/**
 * Validation context
 */
export interface ValidationContext {
    /** Data being validated */
    data: any;
    /** Validation mode */
    mode: 'request' | 'response';
    /** Mapping rules */
    mapping: Record<string, FieldMapping>;
    /** Validation configuration */
    validation: CompatibilityConfig['validation'];
}
/**
 * Validation result
 */
export interface ValidationResult {
    /** Whether validation passed */
    isValid: boolean;
    /** Validation errors */
    errors: string[];
    /** Validation warnings */
    warnings: string[];
    /** Transformed data */
    transformedData: any;
}
export declare class CompatibilityModule extends BasePipelineModule {
    protected config: CompatibilityConfig;
    private mappingTable;
    private fieldMappings;
    private mappingValidationRules;
    constructor(info: ModuleInfo);
    /**
     * Configure the Compatibility module
     * @param config - Configuration object
     */
    configure(config: CompatibilityConfig): Promise<void>;
    /**
     * Process request - Apply field mapping and validation
     * @param request - Input request data
     * @returns Promise<any> - Mapped and validated request data
     */
    process(request: any): Promise<any>;
    /**
     * Process response - Apply field mapping and validation for response
     * @param response - Input response data
     * @returns Promise<any> - Mapped and validated response data
     */
    processResponse(response: any): Promise<any>;
    /**
     * Validate configuration
     * @param config - Configuration to validate
     */
    private validateConfig;
    /**
     * Load mapping table
     * @param tableName - Name of the mapping table to load
     */
    private loadMappingTable;
    /**
     * Get mapping table by name (mock implementation)
     * @param tableName - Name of the mapping table
     * @returns Promise<MappingTable> - Mapping table
     */
    private getMappingTable;
    /**
     * Process field mappings
     */
    private processFieldMappings;
    /**
     * Apply field mapping to data
     * @param data - Data to map
     * @returns Promise<any> - Mapped data
     */
    private applyFieldMapping;
    /**
     * Validate field value
     * @param value - Value to validate
     * @param validation - Validation constraints
     * @param field - Field name
     */
    private validateFieldValue;
    /**
     * Validate data
     * @param data - Data to validate
     * @param mode - Validation mode ('request' or 'response')
     * @returns Promise<any> - Validated data
     */
    private validateData;
    /**
     * Perform validation
     * @param context - Validation context
     * @returns Promise<ValidationResult> - Validation result
     */
    private performValidation;
    /**
     * Validate field constraints
     * @param value - Field value
     * @param constraints - Field constraints
     * @param field - Field name
     * @param result - Validation result to update
     */
    private validateFieldConstraints;
    /**
     * Apply final transformations
     * @param data - Data to transform
     * @returns Promise<any> - Transformed data
     */
    private applyFinalTransformations;
}
