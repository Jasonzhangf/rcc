/**
 * StatusLineModule - Module for managing status line configuration, themes, and real-time preview
 * 
 * This module extends BaseModule and implements comprehensive status line management functionality
 * including theme configuration, layout management, component handling, and real-time preview generation.
 * 
 * @author RCC System
 * @version 1.0.0
 * @since 2025-01-09
 */

import { BaseModule } from '../../../core/BaseModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../../../interfaces/Connection';
import { ValidationRule, ValidationResult } from '../../../interfaces/Validation';

import {
  IStatusLineModule,
  IStatusLineTheme,
  IStatusLineLayout,
  IStatusLineComponent,
  IStatusLineTemplate,
  IStatusLinePreview,
  StatusLineThemeType,
  StatusLinePosition,
  StatusLineComponentType,
} from '../interfaces/IStatusLineModule';

import { IStatusLineInput } from '../interfaces/IStatusLineInput';
import { IStatusLineOutput, IStatusLineErrorOutput } from '../interfaces/IStatusLineOutput';

import {
  STATUS_LINE_CONSTANTS,
  getBuiltInTheme,
  getBuiltInComponent,
  isValidColor,
  getErrorMessage,
} from '../constants/StatusLine.constants';

/**
 * StatusLineModule class implementing comprehensive status line management
 * 
 * Features:
 * - Theme management with built-in and custom themes
 * - Layout configuration with responsive design
 * - Component management with drag-and-drop support
 * - Real-time preview generation
 * - Configuration templates and presets
 * - Import/export functionality
 * - Comprehensive validation
 * - Performance optimization
 * 
 * @extends BaseModule
 * @implements IStatusLineModule
 */
export class StatusLineModule extends BaseModule implements IStatusLineModule {
  /**
   * Current status line theme
   */
  private currentTheme: IStatusLineTheme;

  /**
   * Current status line layout
   */
  private currentLayout: IStatusLineLayout;

  /**
   * Current status line components
   */
  private components: Map<string, IStatusLineComponent>;

  /**
   * Available themes (built-in + custom)
   */
  private availableThemes: Map<string, IStatusLineTheme>;

  /**
   * Available templates
   */
  private templates: Map<string, IStatusLineTemplate>;

  /**
   * Preview configuration
   */
  private previewConfig: IStatusLinePreview;

  /**
   * Performance monitoring
   */
  private performanceMetrics: {
    lastOperationTime: number;
    operationCount: number;
    averageExecutionTime: number;
  };

  /**
   * Cache for rendered previews
   */
  private previewCache: Map<string, { html: string; css: string; timestamp: number }>;

  /**
   * Auto-save timer
   */
  private autoSaveTimer: NodeJS.Timeout | null = null;

  /**
   * Creates an instance of StatusLineModule
   * @param info - Module information
   */
  constructor(info: ModuleInfo) {
    super(info);

    // Initialize theme with default
    this.currentTheme = { ...STATUS_LINE_CONSTANTS.THEMES.DEFAULT };

    // Initialize layout with defaults
    this.currentLayout = this.createDefaultLayout();

    // Initialize components
    this.components = new Map();
    this.initializeDefaultComponents();

    // Initialize available themes
    this.availableThemes = new Map();
    this.initializeBuiltInThemes();

    // Initialize templates
    this.templates = new Map();
    this.initializeBuiltInTemplates();

    // Initialize preview configuration
    this.previewConfig = {
      enabled: true,
      realTime: true,
      duration: STATUS_LINE_CONSTANTS.DEFAULTS.PREVIEW_DURATION,
      showTooltips: true,
      highlightChanges: true,
      sampleData: { ...STATUS_LINE_CONSTANTS.SAMPLE_DATA },
    };

    // Initialize performance metrics
    this.performanceMetrics = {
      lastOperationTime: 0,
      operationCount: 0,
      averageExecutionTime: 0,
    };

    // Initialize preview cache
    this.previewCache = new Map();

    // Setup validation rules
    this.setupValidationRules();
  }

  /**
   * Static factory method to create an instance of StatusLineModule
   * @param info - Module information
   * @returns Instance of StatusLineModule
   */
  

  /**
   * Configure the status line module
   * @param config - Configuration data
   */
  public configure(config: Record<string, any>): void {
    super.configure(config);

    // Apply configuration-specific settings
    if (config.theme) {
      this.currentTheme = { ...this.currentTheme, ...config.theme };
    }

    if (config.layout) {
      this.currentLayout = { ...this.currentLayout, ...config.layout };
    }

    if (config.components && Array.isArray(config.components)) {
      config.components.forEach((component: IStatusLineComponent) => {
        this.components.set(component.id, component);
      });
    }

    if (config.preview) {
      this.previewConfig = { ...this.previewConfig, ...config.preview };
    }

    // Setup auto-save if enabled
    if (config.autoSave && config.autoSaveInterval) {
      this.setupAutoSave(config.autoSaveInterval);
    }
  }

  /**
   * Initialize the status line module
   */
  public async initialize(): Promise<void> {
    const startTime = Date.now();

    try {
      await super.initialize();

      // Validate initial configuration
      const validation = this.validateConfiguration({
        theme: this.currentTheme,
        layout: this.currentLayout,
        components: Array.from(this.components.values()),
      });

      if (!validation.isValid) {
        throw new Error(`Invalid initial configuration: ${validation.errors.join(', ')}`);
      }

      // Generate initial preview if enabled
      if (this.previewConfig.enabled) {
        await this.generatePreview(this.previewConfig);
      }

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime);

      console.log(`StatusLineModule initialized successfully in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('Failed to initialize StatusLineModule:', error);
      throw error;
    }
  }

  /**
   * Set the status line theme
   * @param theme - Theme configuration
   * @returns Success status and updated theme
   */
  public async setTheme(theme: IStatusLineTheme): Promise<IStatusLineOutput> {
    const startTime = Date.now();
    const operationId = `setTheme-${Date.now()}`;

    try {
      // Validate theme
      const validation = this.validateTheme(theme);
      if (!validation.isValid) {
        return this.createErrorOutput(
          operationId,
          STATUS_LINE_CONSTANTS.ERRORS.INVALID_THEME,
          `Invalid theme configuration: ${validation.errors.join(', ')}`,
          { theme, validation }
        );
      }

      // Apply theme
      this.currentTheme = { ...theme };
      this.availableThemes.set(theme.id, theme);

      // Clear preview cache
      this.clearPreviewCache();

      // Generate new preview if enabled
      let preview;
      if (this.previewConfig.enabled) {
        const previewResult = await this.generatePreview(this.previewConfig);
        if (previewResult.success) {
          preview = (previewResult as any).preview;
        }
      }

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime);

      // Transfer data to connected modules
      await this.transferData({
        event: STATUS_LINE_CONSTANTS.EVENTS.THEME_CHANGED,
        theme: this.currentTheme,
        timestamp: Date.now(),
      });

      return {
        success: true,
        operationId,
        timestamp: Date.now(),
        theme: this.currentTheme,
        availableThemes: Array.from(this.availableThemes.values()),
        preview,
        performance: {
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.createErrorOutput(
        operationId,
        STATUS_LINE_CONSTANTS.ERRORS.INVALID_THEME,
        `Failed to set theme: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { theme, error }
      );
    }
  }

  /**
   * Get the current status line theme
   * @returns Current theme configuration
   */
  public getCurrentTheme(): IStatusLineTheme {
    return { ...this.currentTheme };
  }

  /**
   * Get available built-in themes
   * @returns Array of available themes
   */
  public getAvailableThemes(): IStatusLineTheme[] {
    return Array.from(this.availableThemes.values());
  }

  /**
   * Update the status line layout
   * @param layout - Layout configuration
   * @returns Success status and updated layout
   */
  public async updateLayout(layout: IStatusLineLayout): Promise<IStatusLineOutput> {
    const startTime = Date.now();
    const operationId = `updateLayout-${Date.now()}`;

    try {
      // Validate layout
      const validation = this.validateLayout(layout);
      if (!validation.isValid) {
        return this.createErrorOutput(
          operationId,
          STATUS_LINE_CONSTANTS.ERRORS.INVALID_LAYOUT,
          `Invalid layout configuration: ${validation.errors.join(', ')}`,
          { layout, validation }
        );
      }

      // Apply layout
      this.currentLayout = { ...layout };

      // Clear preview cache
      this.clearPreviewCache();

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime);

      // Transfer data to connected modules
      await this.transferData({
        event: STATUS_LINE_CONSTANTS.EVENTS.LAYOUT_UPDATED,
        layout: this.currentLayout,
        timestamp: Date.now(),
      });

      return {
        success: true,
        operationId,
        timestamp: Date.now(),
        layout: this.currentLayout,
        performance: {
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.createErrorOutput(
        operationId,
        STATUS_LINE_CONSTANTS.ERRORS.INVALID_LAYOUT,
        `Failed to update layout: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { layout, error }
      );
    }
  }

  /**
   * Get the current status line layout
   * @returns Current layout configuration
   */
  public getCurrentLayout(): IStatusLineLayout {
    return { ...this.currentLayout };
  }

  /**
   * Add a component to the status line
   * @param component - Component configuration
   * @returns Success status and updated components
   */
  public async addComponent(component: IStatusLineComponent): Promise<IStatusLineOutput> {
    const startTime = Date.now();
    const operationId = `addComponent-${Date.now()}`;

    try {
      // Validate component
      const validation = this.validateComponent(component);
      if (!validation.isValid) {
        return this.createErrorOutput(
          operationId,
          STATUS_LINE_CONSTANTS.ERRORS.INVALID_COMPONENT,
          `Invalid component configuration: ${validation.errors.join(', ')}`,
          { component, validation }
        );
      }

      // Check if component already exists
      if (this.components.has(component.id)) {
        return this.createErrorOutput(
          operationId,
          STATUS_LINE_CONSTANTS.ERRORS.INVALID_COMPONENT,
          `Component with ID '${component.id}' already exists`,
          { component }
        );
      }

      // Check component limit
      if (this.components.size >= STATUS_LINE_CONSTANTS.DEFAULTS.MAX_COMPONENTS) {
        return this.createErrorOutput(
          operationId,
          STATUS_LINE_CONSTANTS.ERRORS.INVALID_COMPONENT,
          `Maximum number of components (${STATUS_LINE_CONSTANTS.DEFAULTS.MAX_COMPONENTS}) reached`,
          { component }
        );
      }

      // Add component
      this.components.set(component.id, component);

      // Update layout to include the new component
      this.updateLayoutWithComponent(component);

      // Clear preview cache
      this.clearPreviewCache();

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime);

      // Transfer data to connected modules
      await this.transferData({
        event: STATUS_LINE_CONSTANTS.EVENTS.COMPONENT_ADDED,
        component,
        components: Array.from(this.components.values()),
        timestamp: Date.now(),
      });

      return {
        success: true,
        operationId,
        timestamp: Date.now(),
        components: Array.from(this.components.values()),
        component,
        performance: {
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.createErrorOutput(
        operationId,
        STATUS_LINE_CONSTANTS.ERRORS.INVALID_COMPONENT,
        `Failed to add component: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { component, error }
      );
    }
  }

  /**
   * Remove a component from the status line
   * @param componentId - Component ID to remove
   * @returns Success status and updated components
   */
  public async removeComponent(componentId: string): Promise<IStatusLineOutput> {
    const startTime = Date.now();
    const operationId = `removeComponent-${Date.now()}`;

    try {
      // Check if component exists
      const component = this.components.get(componentId);
      if (!component) {
        return this.createErrorOutput(
          operationId,
          STATUS_LINE_CONSTANTS.ERRORS.COMPONENT_NOT_FOUND,
          `Component with ID '${componentId}' not found`,
          { componentId }
        );
      }

      // Remove component
      this.components.delete(componentId);

      // Update layout to remove the component
      this.removeComponentFromLayout(componentId);

      // Clear preview cache
      this.clearPreviewCache();

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime);

      // Transfer data to connected modules
      await this.transferData({
        event: STATUS_LINE_CONSTANTS.EVENTS.COMPONENT_REMOVED,
        componentId,
        components: Array.from(this.components.values()),
        timestamp: Date.now(),
      });

      return {
        success: true,
        operationId,
        timestamp: Date.now(),
        components: Array.from(this.components.values()),
        performance: {
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.createErrorOutput(
        operationId,
        STATUS_LINE_CONSTANTS.ERRORS.COMPONENT_NOT_FOUND,
        `Failed to remove component: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { componentId, error }
      );
    }
  }

  /**
   * Update a component in the status line
   * @param componentId - Component ID to update
   * @param updates - Component updates
   * @returns Success status and updated component
   */
  public async updateComponent(
    componentId: string,
    updates: Partial<IStatusLineComponent>
  ): Promise<IStatusLineOutput> {
    const startTime = Date.now();
    const operationId = `updateComponent-${Date.now()}`;

    try {
      // Check if component exists
      const existingComponent = this.components.get(componentId);
      if (!existingComponent) {
        return this.createErrorOutput(
          operationId,
          STATUS_LINE_CONSTANTS.ERRORS.COMPONENT_NOT_FOUND,
          `Component with ID '${componentId}' not found`,
          { componentId, updates }
        );
      }

      // Create updated component
      const updatedComponent: IStatusLineComponent = {
        ...existingComponent,
        ...updates,
        id: componentId, // Ensure ID doesn't change
      };

      // Validate updated component
      const validation = this.validateComponent(updatedComponent);
      if (!validation.isValid) {
        return this.createErrorOutput(
          operationId,
          STATUS_LINE_CONSTANTS.ERRORS.INVALID_COMPONENT,
          `Invalid component updates: ${validation.errors.join(', ')}`,
          { componentId, updates, validation }
        );
      }

      // Apply updates
      this.components.set(componentId, updatedComponent);

      // Update layout if position changed
      if (updates.position) {
        this.updateLayoutWithComponent(updatedComponent);
      }

      // Clear preview cache
      this.clearPreviewCache();

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime);

      // Transfer data to connected modules
      await this.transferData({
        event: STATUS_LINE_CONSTANTS.EVENTS.COMPONENT_UPDATED,
        component: updatedComponent,
        components: Array.from(this.components.values()),
        timestamp: Date.now(),
      });

      return {
        success: true,
        operationId,
        timestamp: Date.now(),
        components: Array.from(this.components.values()),
        component: updatedComponent,
        performance: {
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.createErrorOutput(
        operationId,
        STATUS_LINE_CONSTANTS.ERRORS.INVALID_COMPONENT,
        `Failed to update component: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { componentId, updates, error }
      );
    }
  }

  /**
   * Get all status line components
   * @returns Array of all components
   */
  public getComponents(): IStatusLineComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Generate status line preview
   * @param previewConfig - Preview configuration
   * @returns Preview HTML, CSS, and data
   */
  public async generatePreview(previewConfig: IStatusLinePreview): Promise<IStatusLineOutput> {
    const startTime = Date.now();
    const operationId = `generatePreview-${Date.now()}`;

    try {
      // Create cache key
      const cacheKey = this.createPreviewCacheKey(previewConfig);

      // Check cache
      const cached = this.previewCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < STATUS_LINE_CONSTANTS.PERFORMANCE.CACHE_EXPIRY) {
        return {
          success: true,
          operationId,
          timestamp: Date.now(),
          preview: {
            html: cached.html,
            css: cached.css,
            data: previewConfig.sampleData || STATUS_LINE_CONSTANTS.SAMPLE_DATA,
            dimensions: {
              width: this.currentLayout.width === '100%' ? 1200 : this.currentLayout.width,
              height: this.currentLayout.height,
            },
            mode: previewConfig.realTime ? 'realtime' : 'static',
          },
          performance: {
            executionTime: Date.now() - startTime,
          },
        };
      }

      // Generate HTML
      const html = this.generateStatusLineHTML(previewConfig.sampleData || STATUS_LINE_CONSTANTS.SAMPLE_DATA);

      // Generate CSS
      const css = this.generateStatusLineCSS();

      // Cache the result
      this.previewCache.set(cacheKey, {
        html,
        css,
        timestamp: Date.now(),
      });

      // Clean up old cache entries
      this.cleanupPreviewCache();

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime);

      // Transfer data to connected modules
      await this.transferData({
        event: STATUS_LINE_CONSTANTS.EVENTS.PREVIEW_GENERATED,
        preview: { html, css },
        timestamp: Date.now(),
      });

      return {
        success: true,
        operationId,
        timestamp: Date.now(),
        preview: {
          html,
          css,
          data: previewConfig.sampleData || STATUS_LINE_CONSTANTS.SAMPLE_DATA,
          dimensions: {
            width: this.currentLayout.width === '100%' ? 1200 : this.currentLayout.width,
            height: this.currentLayout.height,
          },
          mode: previewConfig.realTime ? 'realtime' : 'static',
        },
        performance: {
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.createErrorOutput(
        operationId,
        STATUS_LINE_CONSTANTS.ERRORS.PREVIEW_GENERATION_FAILED,
        `Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { previewConfig, error }
      );
    }
  }

  /**
   * Apply configuration template
   * @param template - Template configuration
   * @returns Success status and applied configuration
   */
  public async applyTemplate(template: IStatusLineTemplate): Promise<IStatusLineOutput> {
    const startTime = Date.now();
    const operationId = `applyTemplate-${Date.now()}`;

    try {
      // Validate template
      const validation = this.validateTemplate(template);
      if (!validation.isValid) {
        return this.createErrorOutput(
          operationId,
          STATUS_LINE_CONSTANTS.ERRORS.INVALID_CONFIGURATION,
          `Invalid template configuration: ${validation.errors.join(', ')}`,
          { template, validation }
        );
      }

      // Apply template configuration
      if (template.theme) {
        this.currentTheme = { ...template.theme };
        this.availableThemes.set(template.theme.id, template.theme);
      }

      if (template.layout) {
        this.currentLayout = { ...template.layout };
      }

      if (template.components) {
        this.components.clear();
        template.components.forEach(component => {
          this.components.set(component.id, component);
        });
      }

      // Store template
      this.templates.set(template.id, template);

      // Clear preview cache
      this.clearPreviewCache();

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime);

      // Transfer data to connected modules
      await this.transferData({
        event: STATUS_LINE_CONSTANTS.EVENTS.TEMPLATE_APPLIED,
        template,
        configuration: {
          theme: this.currentTheme,
          layout: this.currentLayout,
          components: Array.from(this.components.values()),
        },
        timestamp: Date.now(),
      });

      return {
        success: true,
        operationId,
        timestamp: Date.now(),
        templates: Array.from(this.templates.values()),
        appliedTemplate: template,
        performance: {
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.createErrorOutput(
        operationId,
        STATUS_LINE_CONSTANTS.ERRORS.TEMPLATE_NOT_FOUND,
        `Failed to apply template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { template, error }
      );
    }
  }

  /**
   * Get available configuration templates
   * @returns Array of available templates
   */
  public getTemplates(): IStatusLineTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Export status line configuration
   * @param format - Export format
   * @returns Exported configuration data
   */
  public async exportConfiguration(format: 'json' | 'yaml' | 'css' | 'html'): Promise<IStatusLineOutput> {
    const startTime = Date.now();
    const operationId = `exportConfiguration-${Date.now()}`;

    try {
      const configuration = {
        theme: this.currentTheme,
        layout: this.currentLayout,
        components: Array.from(this.components.values()),
        metadata: {
          exportedAt: new Date().toISOString(),
          version: STATUS_LINE_CONSTANTS.MODULE.VERSION,
          moduleId: STATUS_LINE_CONSTANTS.MODULE.ID,
        },
      };

      let content: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'json':
          content = JSON.stringify(configuration, null, 2);
          filename = `status-line-config-${Date.now()}.json`;
          mimeType = STATUS_LINE_CONSTANTS.FILE_FORMATS.JSON.MIME_TYPE;
          break;

        case 'yaml':
          content = this.convertToYAML(configuration);
          filename = `status-line-config-${Date.now()}.yaml`;
          mimeType = STATUS_LINE_CONSTANTS.FILE_FORMATS.YAML.MIME_TYPE;
          break;

        case 'css':
          content = this.generateStatusLineCSS();
          filename = `status-line-styles-${Date.now()}.css`;
          mimeType = STATUS_LINE_CONSTANTS.FILE_FORMATS.CSS.MIME_TYPE;
          break;

        case 'html':
          content = this.generateCompleteHTML();
          filename = `status-line-preview-${Date.now()}.html`;
          mimeType = STATUS_LINE_CONSTANTS.FILE_FORMATS.HTML.MIME_TYPE;
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime);

      // Transfer data to connected modules
      await this.transferData({
        event: STATUS_LINE_CONSTANTS.EVENTS.CONFIGURATION_EXPORTED,
        format,
        filename,
        size: content.length,
        timestamp: Date.now(),
      });

      return {
        success: true,
        operationId,
        timestamp: Date.now(),
        exportData: {
          format,
          content,
          filename,
          size: content.length,
          mimeType,
        },
        performance: {
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.createErrorOutput(
        operationId,
        STATUS_LINE_CONSTANTS.ERRORS.EXPORT_FAILED,
        `Failed to export configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { format, error }
      );
    }
  }

  /**
   * Import status line configuration
   * @param data - Configuration data to import
   * @param format - Import format
   * @returns Success status and imported configuration
   */
  public async importConfiguration(data: string, format: 'json' | 'yaml'): Promise<IStatusLineOutput> {
    const startTime = Date.now();
    const operationId = `importConfiguration-${Date.now()}`;

    try {
      let configuration: any;

      // Parse data based on format
      switch (format) {
        case 'json':
          configuration = JSON.parse(data);
          break;

        case 'yaml':
          configuration = this.parseYAML(data);
          break;

        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      // Validate imported configuration
      const validation = this.validateConfiguration(configuration);
      if (!validation.isValid) {
        return this.createErrorOutput(
          operationId,
          STATUS_LINE_CONSTANTS.ERRORS.IMPORT_FAILED,
          `Invalid imported configuration: ${validation.errors.join(', ')}`,
          { data, format, validation }
        );
      }

      // Apply imported configuration
      let stats = {
        themesImported: 0,
        layoutsImported: 0,
        componentsImported: 0,
        templatesImported: 0,
      };

      if (configuration.theme) {
        this.currentTheme = { ...configuration.theme };
        this.availableThemes.set(configuration.theme.id, configuration.theme);
        stats.themesImported = 1;
      }

      if (configuration.layout) {
        this.currentLayout = { ...configuration.layout };
        stats.layoutsImported = 1;
      }

      if (configuration.components && Array.isArray(configuration.components)) {
        this.components.clear();
        configuration.components.forEach((component: IStatusLineComponent) => {
          this.components.set(component.id, component);
        });
        stats.componentsImported = configuration.components.length;
      }

      // Clear preview cache
      this.clearPreviewCache();

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime);

      // Transfer data to connected modules
      await this.transferData({
        event: STATUS_LINE_CONSTANTS.EVENTS.CONFIGURATION_IMPORTED,
        format,
        stats,
        timestamp: Date.now(),
      });

      return {
        success: true,
        operationId,
        timestamp: Date.now(),
        importedData: {
          theme: configuration.theme,
          layout: configuration.layout,
          components: configuration.components,
        },
        stats,
        performance: {
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.createErrorOutput(
        operationId,
        STATUS_LINE_CONSTANTS.ERRORS.IMPORT_FAILED,
        `Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { data, format, error }
      );
    }
  }

  /**
   * Reset status line to default configuration
   * @returns Success status and default configuration
   */
  public async resetToDefaults(): Promise<IStatusLineOutput> {
    const startTime = Date.now();
    const operationId = `resetToDefaults-${Date.now()}`;

    try {
      // Reset to defaults
      this.currentTheme = { ...STATUS_LINE_CONSTANTS.THEMES.DEFAULT };
      this.currentLayout = this.createDefaultLayout();
      this.components.clear();
      this.initializeDefaultComponents();

      // Clear preview cache
      this.clearPreviewCache();

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime);

      return {
        success: true,
        operationId,
        timestamp: Date.now(),
        configuration: {
          theme: this.currentTheme,
          layout: this.currentLayout,
          components: Array.from(this.components.values()),
        },
        configMetadata: {
          version: STATUS_LINE_CONSTANTS.MODULE.VERSION,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          checksum: this.calculateConfigChecksum(),
        },
        performance: {
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.createErrorOutput(
        operationId,
        STATUS_LINE_CONSTANTS.ERRORS.INVALID_CONFIGURATION,
        `Failed to reset to defaults: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  /**
   * Validate status line configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfiguration(config: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate theme
      if (config.theme) {
        const themeValidation = this.validateTheme(config.theme);
        if (!themeValidation.isValid) {
          errors.push(...themeValidation.errors);
        }
        // warnings.push(...(themeValidation.warnings || []));
      }

      // Validate layout
      if (config.layout) {
        const layoutValidation = this.validateLayout(config.layout);
        if (!layoutValidation.isValid) {
          errors.push(...layoutValidation.errors);
        }
        // warnings.push(...(layoutValidation.warnings || []));
      }

      // Validate components
      if (config.components && Array.isArray(config.components)) {
        config.components.forEach((component: any, index: number) => {
          const componentValidation = this.validateComponent(component);
          if (!componentValidation.isValid) {
            errors.push(...componentValidation.errors.map(error => `Component ${index}: ${error}`));
          }
          // warnings.push(...(componentValidation.warnings || []).map((warning: any) => `Component ${index}: ${warning}`));
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
      };
    }
  }

  /**
   * Receive data from connected modules
   * @param dataTransfer - Data transfer information
   */
  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    try {
      const { data } = dataTransfer;

      // Validate input data
      const validation = this.validateInput(data);
      if (!validation.isValid) {
        console.error('Invalid input data received:', validation.errors);
        return;
      }

      const input = data as IStatusLineInput;
      let result: IStatusLineOutput;

      // Process input based on action
      switch (input.action) {
        case 'configure':
          if (input.theme) {
            await this.setTheme(input.theme);
          }
          if (input.layout) {
            await this.updateLayout(input.layout);
          }
          break;

        case 'setTheme':
          if (input.theme) {
            result = await this.setTheme(input.theme);
            await this.transferData(result);
          }
          break;

        case 'updateLayout':
          if (input.layout) {
            result = await this.updateLayout(input.layout);
            await this.transferData(result);
          }
          break;

        case 'addComponent':
          if (input.component) {
            result = await this.addComponent(input.component);
            await this.transferData(result);
          }
          break;

        case 'removeComponent':
          if (input.componentId) {
            result = await this.removeComponent(input.componentId);
            await this.transferData(result);
          }
          break;

        case 'preview':
          if (input.preview) {
            result = await this.generatePreview(input.preview);
            await this.transferData(result);
          }
          break;

        case 'export':
          if (input.format) {
            result = await this.exportConfiguration(input.format);
            await this.transferData(result);
          }
          break;

        case 'import':
          if (input.data && input.format) {
            result = await this.importConfiguration(input.data, input.format);
            await this.transferData(result);
          }
          break;

        default:
          console.warn(`Unknown action received: ${input.action}`);
      }
    } catch (error) {
      console.error('Error processing received data:', error);
    }
  }

  /**
   * Perform handshake with another module
   * @param targetModule - Target module to handshake with
   * @returns Whether handshake was successful
   */
  public async handshake(targetModule: BaseModule): Promise<boolean> {
    try {
      // Perform basic handshake
      const baseHandshake = await super.handshake(targetModule);
      if (!baseHandshake) {
        return false;
      }

      // StatusLine-specific handshake
      const handshakeData = {
        moduleType: 'status-line',
        version: STATUS_LINE_CONSTANTS.MODULE.VERSION,
        capabilities: [
          'theme-management',
          'layout-configuration',
          'component-management',
          'preview-generation',
          'template-system',
          'import-export',
        ],
        supportedFormats: ['json', 'yaml', 'css', 'html'],
        currentConfiguration: {
          theme: this.currentTheme.id,
          componentCount: this.components.size,
          layoutPosition: this.currentLayout.position,
        },
      };

      // Send handshake data
      await this.transferData(handshakeData);

      return true;
    } catch (error) {
      console.error('StatusLine handshake failed:', error);
      return false;
    }
  }

  /**
   * Clean up resources and connections
   */
  public async destroy(): Promise<void> {
    try {
      // Clear auto-save timer
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer);
        this.autoSaveTimer = null;
      }

      // Clear caches
      this.previewCache.clear();

      // Clear collections
      this.components.clear();
      this.availableThemes.clear();
      this.templates.clear();

      // Call base cleanup
      await super.destroy();
    } catch (error) {
      console.error('Error during StatusLineModule destruction:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Setup validation rules for input data
   */
  private setupValidationRules(): void {
    this.validationRules = [
      {
        field: 'action',
        type: 'required',
        message: 'Action is required',
      },
      {
        field: 'action',
        type: 'string',
        message: 'Action must be a string',
      },
      {
        field: 'action',
        type: 'custom',
        validator: (value: string) => {
          const validActions = [
            'configure', 'setTheme', 'updateLayout', 'addComponent', 
            'removeComponent', 'updateComponent', 'preview', 'applyTemplate',
            'export', 'import', 'reset', 'validate'
          ];
          return validActions.includes(value);
        },
        message: 'Action must be a valid status line action',
      },
    ];
  }

  /**
   * Initialize built-in themes
   */
  private initializeBuiltInThemes(): void {
    Object.values(STATUS_LINE_CONSTANTS.THEMES).forEach(theme => {
      this.availableThemes.set(theme.id, theme);
    });
  }

  /**
   * Initialize default components
   */
  private initializeDefaultComponents(): void {
    Object.values(STATUS_LINE_CONSTANTS.COMPONENTS).forEach(component => {
      this.components.set(component.id, component);
    });
  }

  /**
   * Initialize built-in templates
   */
  private initializeBuiltInTemplates(): void {
    // Default template
    const defaultTemplate: IStatusLineTemplate = {
      id: STATUS_LINE_CONSTANTS.TEMPLATES.DEFAULT.id,
      name: STATUS_LINE_CONSTANTS.TEMPLATES.DEFAULT.name,
      description: STATUS_LINE_CONSTANTS.TEMPLATES.DEFAULT.description,
      theme: STATUS_LINE_CONSTANTS.THEMES.DEFAULT,
      layout: this.createDefaultLayout(),
      components: [
        STATUS_LINE_CONSTANTS.COMPONENTS.MODE,
        STATUS_LINE_CONSTANTS.COMPONENTS.FILE_INFO,
        STATUS_LINE_CONSTANTS.COMPONENTS.POSITION,
        STATUS_LINE_CONSTANTS.COMPONENTS.ENCODING,
      ],
      presets: {},
    };

    // Developer template
    const developerTemplate: IStatusLineTemplate = {
      id: STATUS_LINE_CONSTANTS.TEMPLATES.DEVELOPER.id,
      name: STATUS_LINE_CONSTANTS.TEMPLATES.DEVELOPER.name,
      description: STATUS_LINE_CONSTANTS.TEMPLATES.DEVELOPER.description,
      theme: STATUS_LINE_CONSTANTS.THEMES.POWERLINE,
      layout: this.createDefaultLayout(),
      components: Object.values(STATUS_LINE_CONSTANTS.COMPONENTS),
      presets: {},
    };

    // Minimal template
    const writerTemplate: IStatusLineTemplate = {
      id: STATUS_LINE_CONSTANTS.TEMPLATES.WRITER.id,
      name: STATUS_LINE_CONSTANTS.TEMPLATES.WRITER.name,
      description: STATUS_LINE_CONSTANTS.TEMPLATES.WRITER.description,
      theme: STATUS_LINE_CONSTANTS.THEMES.MINIMAL,
      layout: this.createDefaultLayout(),
      components: [
        STATUS_LINE_CONSTANTS.COMPONENTS.FILE_INFO,
        STATUS_LINE_CONSTANTS.COMPONENTS.POSITION,
      ],
      presets: {},
    };

    this.templates.set(defaultTemplate.id, defaultTemplate);
    this.templates.set(developerTemplate.id, developerTemplate);
    this.templates.set(writerTemplate.id, writerTemplate);
  }

  /**
   * Create default layout configuration
   */
  private createDefaultLayout(): IStatusLineLayout {
    return {
      position: STATUS_LINE_CONSTANTS.DEFAULTS.POSITION,
      height: STATUS_LINE_CONSTANTS.DEFAULTS.HEIGHT,
      width: '100%',
      zIndex: STATUS_LINE_CONSTANTS.DEFAULTS.Z_INDEX,
      sticky: true,
      components: {
        left: [],
        center: [],
        right: [],
      },
      responsive: {
        enabled: true,
        breakpoints: {
          mobile: 480,
          tablet: 768,
          desktop: 1024,
        },
        hideComponents: [],
      },
    };
  }

  /**
   * Validate theme configuration
   */
  private validateTheme(theme: IStatusLineTheme): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate ID
    if (!theme.id || theme.id.length < STATUS_LINE_CONSTANTS.VALIDATION.THEME.ID_MIN_LENGTH) {
      errors.push(`Theme ID must be at least ${STATUS_LINE_CONSTANTS.VALIDATION.THEME.ID_MIN_LENGTH} characters`);
    }
    if (theme.id && theme.id.length > STATUS_LINE_CONSTANTS.VALIDATION.THEME.ID_MAX_LENGTH) {
      errors.push(`Theme ID must not exceed ${STATUS_LINE_CONSTANTS.VALIDATION.THEME.ID_MAX_LENGTH} characters`);
    }

    // Validate name
    if (!theme.name || theme.name.length < STATUS_LINE_CONSTANTS.VALIDATION.THEME.NAME_MIN_LENGTH) {
      errors.push(`Theme name must be at least ${STATUS_LINE_CONSTANTS.VALIDATION.THEME.NAME_MIN_LENGTH} character`);
    }
    if (theme.name && theme.name.length > STATUS_LINE_CONSTANTS.VALIDATION.THEME.NAME_MAX_LENGTH) {
      errors.push(`Theme name must not exceed ${STATUS_LINE_CONSTANTS.VALIDATION.THEME.NAME_MAX_LENGTH} characters`);
    }

    // Validate colors
    if (theme.colors) {
      Object.entries(theme.colors).forEach(([key, color]) => {
        if (!isValidColor(color)) {
          errors.push(`Invalid color format for ${key}: ${color}`);
        }
      });
    }

    // Validate fonts
    if (theme.fonts) {
      if (theme.fonts.size < STATUS_LINE_CONSTANTS.VALIDATION.THEME.FONT_SIZE_MIN) {
        errors.push(`Font size must be at least ${STATUS_LINE_CONSTANTS.VALIDATION.THEME.FONT_SIZE_MIN}px`);
      }
      if (theme.fonts.size > STATUS_LINE_CONSTANTS.VALIDATION.THEME.FONT_SIZE_MAX) {
        errors.push(`Font size must not exceed ${STATUS_LINE_CONSTANTS.VALIDATION.THEME.FONT_SIZE_MAX}px`);
      }
    }

    // Validate animations
    if (theme.animations) {
      if (theme.animations.duration < STATUS_LINE_CONSTANTS.VALIDATION.THEME.ANIMATION_DURATION_MIN) {
        errors.push(`Animation duration must be at least ${STATUS_LINE_CONSTANTS.VALIDATION.THEME.ANIMATION_DURATION_MIN}ms`);
      }
      if (theme.animations.duration > STATUS_LINE_CONSTANTS.VALIDATION.THEME.ANIMATION_DURATION_MAX) {
        errors.push(`Animation duration must not exceed ${STATUS_LINE_CONSTANTS.VALIDATION.THEME.ANIMATION_DURATION_MAX}ms`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      // warnings,
      data: theme,
    };
  }

  /**
   * Validate layout configuration
   */
  private validateLayout(layout: IStatusLineLayout): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate height
    if (layout.height < STATUS_LINE_CONSTANTS.VALIDATION.LAYOUT.HEIGHT_MIN) {
      errors.push(`Layout height must be at least ${STATUS_LINE_CONSTANTS.VALIDATION.LAYOUT.HEIGHT_MIN}px`);
    }
    if (layout.height > STATUS_LINE_CONSTANTS.VALIDATION.LAYOUT.HEIGHT_MAX) {
      errors.push(`Layout height must not exceed ${STATUS_LINE_CONSTANTS.VALIDATION.LAYOUT.HEIGHT_MAX}px`);
    }

    // Validate z-index
    if (layout.zIndex < STATUS_LINE_CONSTANTS.VALIDATION.LAYOUT.Z_INDEX_MIN) {
      errors.push(`Layout z-index must be at least ${STATUS_LINE_CONSTANTS.VALIDATION.LAYOUT.Z_INDEX_MIN}`);
    }
    if (layout.zIndex > STATUS_LINE_CONSTANTS.VALIDATION.LAYOUT.Z_INDEX_MAX) {
      errors.push(`Layout z-index must not exceed ${STATUS_LINE_CONSTANTS.VALIDATION.LAYOUT.Z_INDEX_MAX}`);
    }

    // Validate width
    if (typeof layout.width === 'number') {
      if (layout.width < STATUS_LINE_CONSTANTS.VALIDATION.LAYOUT.WIDTH_MIN) {
        errors.push(`Layout width must be at least ${STATUS_LINE_CONSTANTS.VALIDATION.LAYOUT.WIDTH_MIN}px`);
      }
      if (layout.width > STATUS_LINE_CONSTANTS.VALIDATION.LAYOUT.WIDTH_MAX) {
        errors.push(`Layout width must not exceed ${STATUS_LINE_CONSTANTS.VALIDATION.LAYOUT.WIDTH_MAX}px`);
      }
    }

    // Validate position
    const validPositions: StatusLinePosition[] = ['top', 'bottom'];
    if (!validPositions.includes(layout.position)) {
      errors.push(`Invalid layout position: ${layout.position}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      // warnings,
      data: layout,
    };
  }

  /**
   * Validate component configuration
   */
  private validateComponent(component: IStatusLineComponent): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate ID
    if (!component.id || component.id.length < STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.ID_MIN_LENGTH) {
      errors.push(`Component ID must be at least ${STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.ID_MIN_LENGTH} characters`);
    }
    if (component.id && component.id.length > STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.ID_MAX_LENGTH) {
      errors.push(`Component ID must not exceed ${STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.ID_MAX_LENGTH} characters`);
    }

    // Validate label
    if (!component.label || component.label.length < STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.LABEL_MIN_LENGTH) {
      errors.push(`Component label must be at least ${STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.LABEL_MIN_LENGTH} character`);
    }
    if (component.label && component.label.length > STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.LABEL_MAX_LENGTH) {
      errors.push(`Component label must not exceed ${STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.LABEL_MAX_LENGTH} characters`);
    }

    // Validate priority
    if (component.priority < STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.PRIORITY_MIN) {
      errors.push(`Component priority must be at least ${STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.PRIORITY_MIN}`);
    }
    if (component.priority > STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.PRIORITY_MAX) {
      errors.push(`Component priority must not exceed ${STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.PRIORITY_MAX}`);
    }

    // Validate type
    const validTypes: StatusLineComponentType[] = ['mode', 'file', 'position', 'encoding', 'filetype', 'branch', 'custom'];
    if (!validTypes.includes(component.type)) {
      errors.push(`Invalid component type: ${component.type}`);
    }

    // Validate position
    const validPositions = ['left', 'center', 'right'];
    if (!validPositions.includes(component.position)) {
      errors.push(`Invalid component position: ${component.position}`);
    }

    // Validate colors if provided
    if (component.color && !isValidColor(component.color)) {
      errors.push(`Invalid component color format: ${component.color}`);
    }
    if (component.backgroundColor && !isValidColor(component.backgroundColor)) {
      errors.push(`Invalid component background color format: ${component.backgroundColor}`);
    }

    // Validate tooltip length
    if (component.tooltip && component.tooltip.length > STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.TOOLTIP_MAX_LENGTH) {
      errors.push(`Component tooltip must not exceed ${STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.TOOLTIP_MAX_LENGTH} characters`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: component,
    };
  }

  /**
   * Validate template configuration
   */
  private validateTemplate(template: IStatusLineTemplate): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic properties
    if (!template.id) {
      errors.push('Template ID is required');
    }
    if (!template.name) {
      errors.push('Template name is required');
    }

    // Validate theme if provided
    if (template.theme) {
      const themeValidation = this.validateTheme(template.theme);
      if (!themeValidation.isValid) {
        errors.push(...themeValidation.errors.map(error => `Template theme: ${error}`));
      }
    }

    // Validate layout if provided
    if (template.layout) {
      const layoutValidation = this.validateLayout(template.layout);
      if (!layoutValidation.isValid) {
        errors.push(...layoutValidation.errors.map(error => `Template layout: ${error}`));
      }
    }

    // Validate components if provided
    if (template.components && Array.isArray(template.components)) {
      template.components.forEach((component, index) => {
        const componentValidation = this.validateComponent(component);
        if (!componentValidation.isValid) {
          errors.push(...componentValidation.errors.map(error => `Template component ${index}: ${error}`));
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: template,
    };
  }

  /**
   * Update layout with new component
   */
  private updateLayoutWithComponent(component: IStatusLineComponent): void {
    // Remove component from all sections first
    this.removeComponentFromLayout(component.id);

    // Add component to appropriate section
    const section = this.currentLayout.components[component.position];
    section.push(component);

    // Sort by priority
    section.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove component from layout
   */
  private removeComponentFromLayout(componentId: string): void {
    ['left', 'center', 'right'].forEach(position => {
      const section = this.currentLayout.components[position as keyof typeof this.currentLayout.components];
      const index = section.findIndex(comp => comp.id === componentId);
      if (index !== -1) {
        section.splice(index, 1);
      }
    });
  }

  /**
   * Generate status line HTML
   */
  private generateStatusLineHTML(sampleData: Record<string, any>): string {
    const components = Array.from(this.components.values());
    
    const renderSection = (position: 'left' | 'center' | 'right') => {
      const sectionComponents = components
        .filter(comp => comp.position === position && comp.enabled)
        .sort((a, b) => a.priority - b.priority);

      return sectionComponents
        .map(comp => this.renderComponent(comp, sampleData))
        .join('');
    };

    return `
      <div class="${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE}" data-theme="${this.currentTheme.id}">
        <div class="${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_SECTION} ${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_LEFT}">
          ${renderSection('left')}
        </div>
        <div class="${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_SECTION} ${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_CENTER}">
          ${renderSection('center')}
        </div>
        <div class="${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_SECTION} ${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_RIGHT}">
          ${renderSection('right')}
        </div>
      </div>
    `.trim();
  }

  /**
   * Render individual component
   */
  private renderComponent(component: IStatusLineComponent, sampleData: Record<string, any>): string {
    let content = component.label;

    // Apply formatter if available
    if (component.formatter && typeof component.formatter === 'function') {
      try {
        content = component.formatter(sampleData);
      } catch (error) {
        console.warn(`Error applying formatter for component ${component.id}:`, error);
        content = component.label;
      }
    } else {
      // Use built-in formatters
      switch (component.type) {
        case 'mode':
          content = sampleData.MODE || 'NORMAL';
          break;
        case 'file':
          content = `${component.icon || ''} ${sampleData.FILE_NAME || 'untitled'}`;
          break;
        case 'position':
          content = `${component.icon || ''} ${sampleData.POSITION || '1:1'}`;
          break;
        case 'encoding':
          content = sampleData.ENCODING || 'UTF-8';
          break;
        case 'filetype':
          content = sampleData.FILE_TYPE || 'Text';
          break;
        case 'branch':
          content = `${component.icon || ''} ${sampleData.BRANCH || 'main'}`;
          break;
        default:
          content = component.label;
      }
    }

    const style = this.generateComponentStyle(component);
    const tooltip = component.tooltip ? `title="${component.tooltip}"` : '';

    return `
      <span class="${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_COMPONENT}" 
            data-component-id="${component.id}" 
            data-component-type="${component.type}"
            style="${style}" 
            ${tooltip}>
        ${content}
      </span>
    `;
  }

  /**
   * Generate component inline styles
   */
  private generateComponentStyle(component: IStatusLineComponent): string {
    const styles: string[] = [];

    if (component.color) {
      styles.push(`color: ${component.color}`);
    }
    if (component.backgroundColor) {
      styles.push(`background-color: ${component.backgroundColor}`);
    }

    return styles.join('; ');
  }

  /**
   * Generate status line CSS
   */
  private generateStatusLineCSS(): string {
    const theme = this.currentTheme;
    const layout = this.currentLayout;

    return `
/* StatusLine Module Styles */
.${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE} {
  position: ${layout.sticky ? 'fixed' : 'relative'};
  ${layout.position}: 0;
  left: 0;
  width: ${typeof layout.width === 'number' ? `${layout.width}px` : layout.width};
  height: ${layout.height}px;
  background-color: ${theme.colors.background};
  color: ${theme.colors.foreground};
  font-family: ${theme.fonts.family};
  font-size: ${theme.fonts.size}px;
  font-weight: ${theme.fonts.weight};
  z-index: ${layout.zIndex};
  display: flex;
  align-items: center;
  padding: ${theme.padding.vertical}px ${theme.padding.horizontal}px;
  box-sizing: border-box;
  ${theme.borders.enabled ? `border: ${theme.borders.width}px ${theme.borders.style} ${theme.borders.color};` : ''}
  ${theme.animations.enabled ? `transition: all ${theme.animations.duration}ms ${theme.animations.easing};` : ''}
}

.${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_SECTION} {
  display: flex;
  align-items: center;
  flex: 1;
}

.${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_LEFT} {
  justify-content: flex-start;
}

.${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_CENTER} {
  justify-content: center;
}

.${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_RIGHT} {
  justify-content: flex-end;
}

.${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_COMPONENT} {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  margin: 0 2px;
  border-radius: 3px;
  white-space: nowrap;
  ${theme.animations.enabled ? `transition: all ${theme.animations.duration}ms ${theme.animations.easing};` : ''}
}

.${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_COMPONENT}:hover {
  background-color: ${theme.colors.accent}40;
}

.${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_SEPARATOR} {
  margin: 0 4px;
  color: ${theme.colors.inactive};
}

/* Theme-specific styles */
.${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE}[data-theme="powerline"] .${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_COMPONENT} {
  position: relative;
  padding-left: 12px;
  padding-right: 12px;
}

.${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE}[data-theme="powerline"] .${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_COMPONENT}:not(:last-child)::after {
  content: "${theme.separators.right}";
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  color: inherit;
}

.${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE}[data-theme="minimal"] .${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_COMPONENT} {
  padding: 1px 4px;
  font-size: ${Math.max(theme.fonts.size - 1, 10)}px;
}

/* Responsive styles */
@media (max-width: ${layout.responsive.breakpoints.tablet}px) {
  .${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE} {
    font-size: ${Math.max(theme.fonts.size - 1, 10)}px;
    padding: ${Math.max(theme.padding.vertical - 1, 2)}px ${Math.max(theme.padding.horizontal - 2, 4)}px;
  }
  
  .${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_COMPONENT} {
    padding: 1px 4px;
    margin: 0 1px;
  }
}

@media (max-width: ${layout.responsive.breakpoints.mobile}px) {
  .${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_CENTER} {
    display: none;
  }
  
  ${layout.responsive.hideComponents.map(componentId => 
    `.${STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE_COMPONENT}[data-component-id="${componentId}"] { display: none; }`
  ).join('\n  ')}
}
    `.trim();
  }

  /**
   * Generate complete HTML with CSS
   */
  private generateCompleteHTML(): string {
    const html = this.generateStatusLineHTML(STATUS_LINE_CONSTANTS.SAMPLE_DATA);
    const css = this.generateStatusLineCSS();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StatusLine Preview - ${this.currentTheme.name}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
      background-color: #f5f5f5;
    }
    
    .preview-container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .preview-header {
      padding: 20px;
      background-color: #2d3748;
      color: white;
    }
    
    .preview-content {
      position: relative;
      min-height: 200px;
    }
    
    ${css}
  </style>
</head>
<body>
  <div class="preview-container">
    <div class="preview-header">
      <h1>StatusLine Preview</h1>
      <p>Theme: ${this.currentTheme.name} | Layout: ${this.currentLayout.position} | Components: ${this.components.size}</p>
    </div>
    <div class="preview-content">
      ${html}
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Create preview cache key
   */
  private createPreviewCacheKey(previewConfig: IStatusLinePreview): string {
    const configData = {
      theme: this.currentTheme.id,
      layout: this.currentLayout,
      components: Array.from(this.components.keys()).sort(),
      sampleData: previewConfig.sampleData,
    };
    
    return Buffer.from(JSON.stringify(configData)).toString('base64').slice(0, 32);
  }

  /**
   * Clear preview cache
   */
  private clearPreviewCache(): void {
    this.previewCache.clear();
  }

  /**
   * Cleanup old preview cache entries
   */
  private cleanupPreviewCache(): void {
    const now = Date.now();
    const expiry = STATUS_LINE_CONSTANTS.PERFORMANCE.CACHE_EXPIRY;
    
    for (const [key, entry] of this.previewCache.entries()) {
      if (now - entry.timestamp > expiry) {
        this.previewCache.delete(key);
      }
    }

    // Limit cache size
    if (this.previewCache.size > STATUS_LINE_CONSTANTS.PERFORMANCE.MAX_CACHE_SIZE) {
      const entries = Array.from(this.previewCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, entries.length - STATUS_LINE_CONSTANTS.PERFORMANCE.MAX_CACHE_SIZE);
      toDelete.forEach(([key]) => this.previewCache.delete(key));
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(executionTime: number): void {
    this.performanceMetrics.operationCount++;
    this.performanceMetrics.lastOperationTime = executionTime;
    
    // Calculate rolling average
    const alpha = 0.1; // Exponential moving average factor
    this.performanceMetrics.averageExecutionTime = 
      this.performanceMetrics.averageExecutionTime * (1 - alpha) + executionTime * alpha;
  }

  /**
   * Setup auto-save functionality
   */
  private setupAutoSave(interval: number): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(async () => {
      try {
        const config = {
          theme: this.currentTheme,
          layout: this.currentLayout,
          components: Array.from(this.components.values()),
          timestamp: Date.now(),
        };

        // Transfer auto-save data to connected modules
        await this.transferData({
          event: 'status-line:auto-save',
          config,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, interval);
  }

  /**
   * Calculate configuration checksum
   */
  private calculateConfigChecksum(): string {
    const config = {
      theme: this.currentTheme,
      layout: this.currentLayout,
      components: Array.from(this.components.values()),
    };
    
    // Simple checksum calculation (in real implementation, use a proper hash function)
    const str = JSON.stringify(config);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Convert configuration to YAML format
   */
  private convertToYAML(config: any): string {
    // Simple YAML conversion (in real implementation, use a proper YAML library)
    const yamlify = (obj: any, indent = 0): string => {
      const spaces = '  '.repeat(indent);
      let result = '';

      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          result += `${spaces}${key}:\n${yamlify(value, indent + 1)}`;
        } else if (Array.isArray(value)) {
          result += `${spaces}${key}:\n`;
          value.forEach((item: any) => {
            if (typeof item === 'object') {
              result += `${spaces}  -\n${yamlify(item, indent + 2)}`;
            } else {
              result += `${spaces}  - ${item}\n`;
            }
          });
        } else {
          result += `${spaces}${key}: ${typeof value === 'string' ? `"${value}"` : value}\n`;
        }
      }

      return result;
    };

    return yamlify(config);
  }

  /**
   * Parse YAML data
   */
  private parseYAML(data: string): any {
    // Simple YAML parsing (in real implementation, use a proper YAML library)
    // For now, just try to parse as JSON if it fails
    try {
      return JSON.parse(data);
    } catch {
      throw new Error('YAML parsing not implemented in this demo - please use JSON format');
    }
  }

  /**
   * Create error output
   */
  private createErrorOutput(
    operationId: string,
    errorCode: string,
    message: string,
    details?: any
  ): IStatusLineErrorOutput {
    return {
      success: false,
      operationId,
      timestamp: Date.now(),
      error: {
        code: errorCode,
        message,
        details,
        resolution: [
          'Check the input parameters for validity',
          'Ensure the module is properly initialized',
          'Review the error details for specific issues',
          'Consult the module documentation',
        ],
      },
      performance: {
        executionTime: 0,
      },
    };
  }
}
