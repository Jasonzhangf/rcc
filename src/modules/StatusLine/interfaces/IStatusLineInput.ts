/**
 * Status line module input data interface
 * Defines all possible input data structures for the StatusLineModule
 */

import { IStatusLineTheme, IStatusLineLayout, IStatusLineComponent, IStatusLineTemplate, IStatusLinePreview } from './IStatusLineModule';

/**
 * Base input interface for all status line operations
 */
export interface IStatusLineBaseInput {
  /**
   * Unique identifier for the operation
   */
  operationId?: string;

  /**
   * Timestamp of the operation
   */
  timestamp?: number;

  /**
   * Additional metadata for the operation
   */
  metadata?: Record<string, any>;
}

/**
 * Input for configuring the status line module
 */
export interface IStatusLineConfigureInput extends IStatusLineBaseInput {
  action: 'configure';
  
  /**
   * Initial theme configuration
   */
  theme?: IStatusLineTheme;
  
  /**
   * Initial layout configuration
   */
  layout?: IStatusLineLayout;
  
  /**
   * Initial components configuration
   */
  components?: IStatusLineComponent[];
  
  /**
   * Configuration options
   */
  options?: {
    enablePreview?: boolean;
    enableRealTimeUpdates?: boolean;
    enableTemplates?: boolean;
    enableCustomThemes?: boolean;
  };
}

/**
 * Input for setting status line theme
 */
export interface IStatusLineSetThemeInput extends IStatusLineBaseInput {
  action: 'setTheme';
  
  /**
   * Theme configuration to apply
   */
  theme: IStatusLineTheme;
  
  /**
   * Whether to generate preview after setting theme
   */
  generatePreview?: boolean;
}

/**
 * Input for updating status line layout
 */
export interface IStatusLineUpdateLayoutInput extends IStatusLineBaseInput {
  action: 'updateLayout';
  
  /**
   * Layout configuration to apply
   */
  layout: IStatusLineLayout;
  
  /**
   * Whether to preserve existing components
   */
  preserveComponents?: boolean;
}

/**
 * Input for adding status line component
 */
export interface IStatusLineAddComponentInput extends IStatusLineBaseInput {
  action: 'addComponent';
  
  /**
   * Component configuration to add
   */
  component: IStatusLineComponent;
  
  /**
   * Position where to insert the component
   */
  insertPosition?: {
    section: 'left' | 'center' | 'right';
    index?: number;
  };
}

/**
 * Input for removing status line component
 */
export interface IStatusLineRemoveComponentInput extends IStatusLineBaseInput {
  action: 'removeComponent';
  
  /**
   * Component ID to remove
   */
  componentId: string;
}

/**
 * Input for updating status line component
 */
export interface IStatusLineUpdateComponentInput extends IStatusLineBaseInput {
  action: 'updateComponent';
  
  /**
   * Component ID to update
   */
  componentId: string;
  
  /**
   * Component updates to apply
   */
  updates: Partial<IStatusLineComponent>;
}

/**
 * Input for generating status line preview
 */
export interface IStatusLinePreviewInput extends IStatusLineBaseInput {
  action: 'preview';
  
  /**
   * Preview configuration
   */
  preview: IStatusLinePreview;
  
  /**
   * Custom sample data for preview
   */
  sampleData?: Record<string, any>;
}

/**
 * Input for applying configuration template
 */
export interface IStatusLineApplyTemplateInput extends IStatusLineBaseInput {
  action: 'applyTemplate';
  
  /**
   * Template to apply
   */
  template: IStatusLineTemplate;
  
  /**
   * Whether to merge with existing configuration
   */
  mergeWithExisting?: boolean;
}

/**
 * Input for exporting status line configuration
 */
export interface IStatusLineExportInput extends IStatusLineBaseInput {
  action: 'export';
  
  /**
   * Export format
   */
  format: 'json' | 'yaml' | 'css' | 'html';
  
  /**
   * Export options
   */
  options?: {
    includeMetadata?: boolean;
    minify?: boolean;
    prettify?: boolean;
    filename?: string;
  };
}

/**
 * Input for importing status line configuration
 */
export interface IStatusLineImportInput extends IStatusLineBaseInput {
  action: 'import';
  
  /**
   * Configuration data to import
   */
  data: string;
  
  /**
   * Import format
   */
  format: 'json' | 'yaml';
  
  /**
   * Import options
   */
  options?: {
    validate?: boolean;
    mergeWithExisting?: boolean;
    preserveIds?: boolean;
  };
}

/**
 * Input for resetting status line to defaults
 */
export interface IStatusLineResetInput extends IStatusLineBaseInput {
  action: 'reset';
  
  /**
   * Reset options
   */
  options?: {
    preserveCustomThemes?: boolean;
    preserveCustomComponents?: boolean;
    resetToTheme?: string;
  };
}

/**
 * Input for validating status line configuration
 */
export interface IStatusLineValidateInput extends IStatusLineBaseInput {
  action: 'validate';
  
  /**
   * Configuration to validate
   */
  config: any;
  
  /**
   * Validation options
   */
  options?: {
    strict?: boolean;
    includeWarnings?: boolean;
    validateTheme?: boolean;
    validateLayout?: boolean;
    validateComponents?: boolean;
  };
}

/**
 * Union type for all status line input types
 */
export type IStatusLineInput = 
  | IStatusLineConfigureInput
  | IStatusLineSetThemeInput
  | IStatusLineUpdateLayoutInput
  | IStatusLineAddComponentInput
  | IStatusLineRemoveComponentInput
  | IStatusLineUpdateComponentInput
  | IStatusLinePreviewInput
  | IStatusLineApplyTemplateInput
  | IStatusLineExportInput
  | IStatusLineImportInput
  | IStatusLineResetInput
  | IStatusLineValidateInput;
