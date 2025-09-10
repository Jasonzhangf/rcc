/**
 * Example configurations for the Pipeline System
 * These are complete, working examples that can be used as templates
 */
import { PipelineAssemblyTable, PipelineSchedulerConfig } from './PipelineCompleteConfig';
/**
 * Simple API processing pipeline assembly table
 */
export declare const simpleApiAssemblyTable: PipelineAssemblyTable;
/**
 * Advanced scheduler configuration with comprehensive settings
 */
export declare const advancedSchedulerConfig: PipelineSchedulerConfig;
/**
 * Simple configuration for quick start and testing
 */
export declare const simpleSchedulerConfig: PipelineSchedulerConfig;
/**
 * Get configuration by environment
 */
export declare function getSchedulerConfig(environment: 'development' | 'staging' | 'production'): PipelineSchedulerConfig;
/**
 * Get assembly table by use case
 */
export declare function getAssemblyTable(useCase: 'simple-api' | 'complex-api' | 'batch-processing'): PipelineAssemblyTable;
