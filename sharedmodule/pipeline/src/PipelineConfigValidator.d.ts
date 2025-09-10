/**
 * Complete configuration validator for the Pipeline System
 * Validates both assembly table and scheduler configurations
 */
import { PipelineAssemblyTable, PipelineSchedulerConfig, CompleteConfigValidationResult } from './PipelineCompleteConfig';
/**
 * Comprehensive configuration validator
 */
export declare class PipelineConfigValidator {
    /**
     * Validate complete pipeline assembly table
     */
    validateAssemblyTable(config: PipelineAssemblyTable): CompleteConfigValidationResult;
    /**
     * Validate scheduler configuration
     */
    validateSchedulerConfig(config: PipelineSchedulerConfig): CompleteConfigValidationResult;
    /**
     * Validate both configurations together
     */
    validateCompleteSystem(assemblyTable: PipelineAssemblyTable, schedulerConfig: PipelineSchedulerConfig): CompleteConfigValidationResult;
    /**
     * Validate basic structure of assembly table
     */
    private validateBasicStructure;
    /**
     * Validate routing rules
     */
    private validateRoutingRules;
    /**
     * Validate conditions
     */
    private validateConditions;
    /**
     * Validate pipeline selection
     */
    private validatePipelineSelection;
    /**
     * Validate pipeline templates
     */
    private validatePipelineTemplates;
    /**
     * Validate module assembly
     */
    private validateModuleAssembly;
    /**
     * Validate connections
     */
    private validateConnections;
    /**
     * Validate execution strategy
     */
    private validateExecutionStrategy;
    /**
     * Validate module registry
     */
    private validateModuleRegistry;
    /**
     * Validate assembly strategies
     */
    private validateAssemblyStrategies;
    /**
     * Validate scheduler basic structure
     */
    private validateSchedulerBasicStructure;
    /**
     * Validate load balancing configuration
     */
    private validateLoadBalancing;
    /**
     * Validate health check configuration
     */
    private validateHealthCheck;
    /**
     * Validate error handling configuration
     */
    private validateErrorHandling;
    /**
     * Validate performance configuration
     */
    private validatePerformance;
    /**
     * Validate monitoring configuration
     */
    private validateMonitoring;
    /**
     * Validate security configuration
     */
    private validateSecurity;
    /**
     * Validate cross-references between assembly table and scheduler config
     */
    private validateCrossReferences;
}
