/**
 * Complete pipeline system configuration
 * This file exports the complete configuration for the pipeline system
 */

// Import the configuration JSON files
import assemblyTableConfig from './CompletePipelineConfigOutput.json';
import schedulerConfig from './CompleteSchedulerConfigOutput.json';
import validationReport from './ConfigurationValidationReport.json';

// Export configurations
export const COMPLETE_ASSEMBLY_TABLE_CONFIG = assemblyTableConfig;
export const COMPLETE_SCHEDULER_CONFIG = schedulerConfig;
export const CONFIGURATION_VALIDATION_REPORT = validationReport;

// Export configuration types
export type {
  PipelineAssemblyTable,
  PipelineSchedulerConfig,
  CompleteConfigValidationResult
} from './PipelineCompleteConfig';

// Configuration utility functions
export class PipelineConfigUtils {
  /**
   * Get a pipeline template by ID
   */
  static getPipelineTemplate(templateId: string) {
    return COMPLETE_ASSEMBLY_TABLE_CONFIG.pipelineTemplates.find(
      template => template.templateId === templateId
    );
  }

  /**
   * Get a routing rule by ID
   */
  static getRoutingRule(ruleId: string) {
    return COMPLETE_ASSEMBLY_TABLE_CONFIG.routingRules.find(
      rule => rule.ruleId === ruleId
    );
  }

  /**
   * Get a module from registry by ID
   */
  static getModuleFromRegistry(moduleId: string) {
    return COMPLETE_ASSEMBLY_TABLE_CONFIG.moduleRegistry.find(
      module => module.moduleId === moduleId
    );
  }

  /**
   * Get pipeline weights from scheduler config
   */
  static getPipelineWeights() {
    if (COMPLETE_SCHEDULER_CONFIG.loadBalancing.strategy === 'weighted') {
      return COMPLETE_SCHEDULER_CONFIG.loadBalancing.strategyConfig?.weighted?.weights || {};
    }
    return {};
  }

  /**
   * Check if configuration is valid
   */
  static isConfigurationValid(): boolean {
    return CONFIGURATION_VALIDATION_REPORT.summary.overallValid;
  }

  /**
   * Get configuration validation summary
   */
  static getValidationSummary() {
    return CONFIGURATION_VALIDATION_REPORT.summary;
  }
}

// Export all configurations as a single object
export const COMPLETE_PIPELINE_CONFIG = {
  assemblyTable: COMPLETE_ASSEMBLY_TABLE_CONFIG,
  scheduler: COMPLETE_SCHEDULER_CONFIG,
  validationReport: CONFIGURATION_VALIDATION_REPORT
};

export default COMPLETE_PIPELINE_CONFIG;