/**
 * Status line module output data interface
 * Defines all possible output data structures for the StatusLineModule
 */

import { IStatusLineTheme, IStatusLineLayout, IStatusLineComponent, IStatusLineTemplate } from './IStatusLineModule';

/**
 * Base output interface for all status line operations
 */
export interface IStatusLineBaseOutput {
  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * Unique identifier for the operation
   */
  operationId?: string;

  /**
   * Timestamp when the operation completed
   */
  timestamp: number;

  /**
   * Performance metrics for the operation
   */
  performance?: {
    executionTime: number;
    memoryUsage?: number;
  };

  /**
   * Additional metadata for the operation
   */
  metadata?: Record<string, any>;
}

/**
 * Output for successful operations
 */
export interface IStatusLineSuccessOutput extends IStatusLineBaseOutput {
  success: true;
  
  /**
   * Result message
   */
  message?: string;
  
  /**
   * Any warnings that occurred during the operation
   */
  warnings?: string[];
}

/**
 * Output for failed operations
 */
export interface IStatusLineErrorOutput extends IStatusLineBaseOutput {
  success: false;
  
  /**
   * Error information
   */
  error: {
    /**
     * Error code
     */
    code: string;
    
    /**
     * Error message
     */
    message: string;
    
    /**
     * Additional error details
     */
    details?: any;
    
    /**
     * Stack trace (if available)
     */
    stack?: string;
    
    /**
     * Suggested resolution steps
     */
    resolution?: string[];
  };
}

/**
 * Output for theme operations
 */
export interface IStatusLineThemeOutput extends IStatusLineSuccessOutput {
  /**
   * Current theme configuration
   */
  theme: IStatusLineTheme;
  
  /**
   * Available themes
   */
  availableThemes?: IStatusLineTheme[];
  
  /**
   * Theme validation results
   */
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Output for layout operations
 */
export interface IStatusLineLayoutOutput extends IStatusLineSuccessOutput {
  /**
   * Current layout configuration
   */
  layout: IStatusLineLayout;
  
  /**
   * Layout validation results
   */
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Output for component operations
 */
export interface IStatusLineComponentOutput extends IStatusLineSuccessOutput {
  /**
   * Updated or affected components
   */
  components: IStatusLineComponent[];
  
  /**
   * Component that was added/updated/removed
   */
  component?: IStatusLineComponent;
  
  /**
   * Component validation results
   */
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Output for preview operations
 */
export interface IStatusLinePreviewOutput extends IStatusLineSuccessOutput {
  /**
   * Preview data
   */
  preview: {
    /**
     * Generated HTML for the status line
     */
    html: string;
    
    /**
     * Generated CSS for the status line
     */
    css: string;
    
    /**
     * JavaScript code for interactive features
     */
    javascript?: string;
    
    /**
     * Sample data used for preview
     */
    data: Record<string, any>;
    
    /**
     * Preview dimensions
     */
    dimensions: {
      width: number;
      height: number;
    };
    
    /**
     * Preview mode
     */
    mode: 'static' | 'interactive' | 'realtime';
  };
}

/**
 * Output for template operations
 */
export interface IStatusLineTemplateOutput extends IStatusLineSuccessOutput {
  /**
   * Applied or available templates
   */
  templates: IStatusLineTemplate[];
  
  /**
   * Template that was applied
   */
  appliedTemplate?: IStatusLineTemplate;
  
  /**
   * Template validation results
   */
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Output for export operations
 */
export interface IStatusLineExportOutput extends IStatusLineSuccessOutput {
  /**
   * Export data
   */
  exportData: {
    /**
     * Export format
     */
    format: 'json' | 'yaml' | 'css' | 'html';
    
    /**
     * Exported content
     */
    content: string;
    
    /**
     * Suggested filename
     */
    filename: string;
    
    /**
     * Content size in bytes
     */
    size: number;
    
    /**
     * MIME type
     */
    mimeType: string;
    
    /**
     * Export options used
     */
    options?: Record<string, any>;
  };
}

/**
 * Output for import operations
 */
export interface IStatusLineImportOutput extends IStatusLineSuccessOutput {
  /**
   * Imported configuration data
   */
  importedData: {
    /**
     * Imported theme (if any)
     */
    theme?: IStatusLineTheme;
    
    /**
     * Imported layout (if any)
     */
    layout?: IStatusLineLayout;
    
    /**
     * Imported components (if any)
     */
    components?: IStatusLineComponent[];
    
    /**
     * Imported templates (if any)
     */
    templates?: IStatusLineTemplate[];
  };
  
  /**
   * Import validation results
   */
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  
  /**
   * Import statistics
   */
  stats?: {
    themesImported: number;
    layoutsImported: number;
    componentsImported: number;
    templatesImported: number;
  };
}

/**
 * Output for validation operations
 */
export interface IStatusLineValidationOutput extends IStatusLineBaseOutput {
  /**
   * Validation results
   */
  validation: {
    /**
     * Whether the configuration is valid
     */
    isValid: boolean;
    
    /**
     * Validation errors
     */
    errors: string[];
    
    /**
     * Validation warnings
     */
    warnings: string[];
    
    /**
     * Detailed validation results by category
     */
    details: {
      theme?: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
      };
      layout?: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
      };
      components?: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
      };
    };
    
    /**
     * Validation score (0-100)
     */
    score: number;
    
    /**
     * Suggestions for improvement
     */
    suggestions?: string[];
  };
}

/**
 * Output for configuration operations
 */
export interface IStatusLineConfigurationOutput extends IStatusLineSuccessOutput {
  /**
   * Current configuration
   */
  configuration: {
    theme: IStatusLineTheme;
    layout: IStatusLineLayout;
    components: IStatusLineComponent[];
  };
  
  /**
   * Configuration metadata
   */
  configMetadata: {
    version: string;
    createdAt: number;
    updatedAt: number;
    checksum: string;
  };
}

/**
 * Union type for all status line output types
 */
export type IStatusLineOutput = 
  | IStatusLineThemeOutput
  | IStatusLineLayoutOutput
  | IStatusLineComponentOutput
  | IStatusLinePreviewOutput
  | IStatusLineTemplateOutput
  | IStatusLineExportOutput
  | IStatusLineImportOutput
  | IStatusLineValidationOutput
  | IStatusLineConfigurationOutput
  | IStatusLineErrorOutput;
