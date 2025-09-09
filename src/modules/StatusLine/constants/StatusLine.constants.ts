/**
 * StatusLine Module Constants
 * All hardcoded values for the StatusLine module following anti-hardcoding policy
 */

import { IStatusLineTheme, IStatusLineComponent, IStatusLineTemplate, StatusLineThemeType, StatusLinePosition, StatusLineComponentType } from '../interfaces/IStatusLineModule';

/**
 * Module configuration constants
 */
export const STATUS_LINE_CONSTANTS = {
  /**
   * Module information
   */
  MODULE: {
    ID: 'status-line-module',
    NAME: 'StatusLine Module',
    VERSION: '1.0.0',
    DESCRIPTION: 'Module for managing status line configuration, themes, and real-time preview',
    TYPE: 'ui-configuration',
  },

  /**
   * Default configuration values
   */
  DEFAULTS: {
    THEME_TYPE: 'default' as StatusLineThemeType,
    POSITION: 'bottom' as StatusLinePosition,
    HEIGHT: 24,
    ANIMATION_DURATION: 200,
    PREVIEW_DURATION: 3000,
    AUTO_SAVE_INTERVAL: 5000,
    MAX_COMPONENTS: 20,
    MIN_COMPONENT_WIDTH: 50,
    MAX_COMPONENT_WIDTH: 300,
    FONT_SIZE: 12,
    Z_INDEX: 1000,
  },

  /**
   * Built-in theme configurations
   */
  THEMES: {
    DEFAULT: {
      id: 'default',
      name: 'Default Theme',
      type: 'default' as StatusLineThemeType,
      colors: {
        background: '#007acc',
        foreground: '#ffffff',
        accent: '#0099ff',
        warning: '#ff9900',
        error: '#ff4444',
        success: '#00cc66',
        inactive: '#666666',
      },
      fonts: {
        family: 'Consolas, Monaco, "Courier New", monospace',
        size: 12,
        weight: 'normal' as const,
      },
      separators: {
        left: '',
        right: '',
        thin: '|',
      },
      padding: {
        horizontal: 8,
        vertical: 4,
      },
      borders: {
        enabled: false,
        style: 'solid' as const,
        width: 1,
        color: '#333333',
      },
      animations: {
        enabled: true,
        duration: 200,
        easing: 'ease-in-out',
      },
    } as IStatusLineTheme,

    POWERLINE: {
      id: 'powerline',
      name: 'Powerline Theme',
      type: 'powerline' as StatusLineThemeType,
      colors: {
        background: '#1e1e1e',
        foreground: '#ffffff',
        accent: '#007acc',
        warning: '#ffcc00',
        error: '#ff6b6b',
        success: '#51cf66',
        inactive: '#888888',
      },
      fonts: {
        family: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
        size: 12,
        weight: 'normal' as const,
      },
      separators: {
        left: '',
        right: '',
        thin: '⋮',
      },
      padding: {
        horizontal: 12,
        vertical: 6,
      },
      borders: {
        enabled: true,
        style: 'solid' as const,
        width: 1,
        color: '#333333',
      },
      animations: {
        enabled: true,
        duration: 300,
        easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      },
    } as IStatusLineTheme,

    MINIMAL: {
      id: 'minimal',
      name: 'Minimal Theme',
      type: 'minimal' as StatusLineThemeType,
      colors: {
        background: '#f8f9fa',
        foreground: '#212529',
        accent: '#6c757d',
        warning: '#fd7e14',
        error: '#dc3545',
        success: '#198754',
        inactive: '#adb5bd',
      },
      fonts: {
        family: '"SF Pro Display", "Segoe UI", "Roboto", sans-serif',
        size: 11,
        weight: 'normal' as const,
      },
      separators: {
        left: '',
        right: '',
        thin: '•',
      },
      padding: {
        horizontal: 6,
        vertical: 2,
      },
      borders: {
        enabled: false,
        style: 'solid' as const,
        width: 0,
        color: 'transparent',
      },
      animations: {
        enabled: false,
        duration: 0,
        easing: 'none',
      },
    } as IStatusLineTheme,
  },

  /**
   * Built-in component configurations
   */
  COMPONENTS: {
    MODE: {
      id: 'mode',
      type: 'mode' as StatusLineComponentType,
      label: 'Mode',
      enabled: true,
      position: 'left' as const,
      priority: 1,
      color: '#ffffff',
      backgroundColor: '#007acc',
      icon: '⚡',
      tooltip: 'Current editor mode',
    } as IStatusLineComponent,

    FILE_INFO: {
      id: 'file-info',
      type: 'file' as StatusLineComponentType,
      label: 'File Info',
      enabled: true,
      position: 'left' as const,
      priority: 2,
      color: '#ffffff',
      icon: '📄',
      tooltip: 'Current file information',
    } as IStatusLineComponent,

    POSITION: {
      id: 'position',
      type: 'position' as StatusLineComponentType,
      label: 'Position',
      enabled: true,
      position: 'right' as const,
      priority: 3,
      color: '#ffffff',
      icon: '📍',
      tooltip: 'Cursor position',
    } as IStatusLineComponent,

    ENCODING: {
      id: 'encoding',
      type: 'encoding' as StatusLineComponentType,
      label: 'Encoding',
      enabled: true,
      position: 'right' as const,
      priority: 4,
      color: '#ffffff',
      icon: '🔤',
      tooltip: 'File encoding',
    } as IStatusLineComponent,

    FILETYPE: {
      id: 'filetype',
      type: 'filetype' as StatusLineComponentType,
      label: 'File Type',
      enabled: true,
      position: 'right' as const,
      priority: 5,
      color: '#ffffff',
      icon: '📋',
      tooltip: 'File type',
    } as IStatusLineComponent,

    BRANCH: {
      id: 'branch',
      type: 'branch' as StatusLineComponentType,
      label: 'Branch',
      enabled: true,
      position: 'left' as const,
      priority: 6,
      color: '#ffffff',
      icon: '🌳',
      tooltip: 'Git branch',
    } as IStatusLineComponent,
  },

  /**
   * Built-in template configurations
   */
  TEMPLATES: {
    DEFAULT: {
      id: 'default-template',
      name: 'Default Configuration',
      description: 'Standard status line configuration with essential components',
    },
    DEVELOPER: {
      id: 'developer-template',
      name: 'Developer Configuration',
      description: 'Optimized for software development with git integration',
    },
    WRITER: {
      id: 'writer-template',
      name: 'Writer Configuration',
      description: 'Minimal configuration for writing and documentation',
    },
    POWERUSER: {
      id: 'poweruser-template',
      name: 'Power User Configuration',
      description: 'Advanced configuration with all features enabled',
    },
  },

  /**
   * Validation rules and limits
   */
  VALIDATION: {
    THEME: {
      ID_MIN_LENGTH: 3,
      ID_MAX_LENGTH: 50,
      NAME_MIN_LENGTH: 1,
      NAME_MAX_LENGTH: 100,
      COLOR_REGEX: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      FONT_SIZE_MIN: 8,
      FONT_SIZE_MAX: 24,
      ANIMATION_DURATION_MIN: 0,
      ANIMATION_DURATION_MAX: 2000,
    },
    LAYOUT: {
      HEIGHT_MIN: 16,
      HEIGHT_MAX: 80,
      Z_INDEX_MIN: 0,
      Z_INDEX_MAX: 10000,
      WIDTH_MIN: 100,
      WIDTH_MAX: 9999,
    },
    COMPONENT: {
      ID_MIN_LENGTH: 3,
      ID_MAX_LENGTH: 50,
      LABEL_MIN_LENGTH: 1,
      LABEL_MAX_LENGTH: 50,
      PRIORITY_MIN: 0,
      PRIORITY_MAX: 100,
      TOOLTIP_MAX_LENGTH: 200,
    },
  },

  /**
   * Error codes and messages
   */
  ERRORS: {
    INVALID_THEME: 'STATUS_LINE_INVALID_THEME',
    INVALID_LAYOUT: 'STATUS_LINE_INVALID_LAYOUT',
    INVALID_COMPONENT: 'STATUS_LINE_INVALID_COMPONENT',
    COMPONENT_NOT_FOUND: 'STATUS_LINE_COMPONENT_NOT_FOUND',
    THEME_NOT_FOUND: 'STATUS_LINE_THEME_NOT_FOUND',
    TEMPLATE_NOT_FOUND: 'STATUS_LINE_TEMPLATE_NOT_FOUND',
    INVALID_CONFIGURATION: 'STATUS_LINE_INVALID_CONFIGURATION',
    EXPORT_FAILED: 'STATUS_LINE_EXPORT_FAILED',
    IMPORT_FAILED: 'STATUS_LINE_IMPORT_FAILED',
    PREVIEW_GENERATION_FAILED: 'STATUS_LINE_PREVIEW_GENERATION_FAILED',
    VALIDATION_FAILED: 'STATUS_LINE_VALIDATION_FAILED',
    MODULE_NOT_INITIALIZED: 'STATUS_LINE_MODULE_NOT_INITIALIZED',
    MODULE_NOT_CONFIGURED: 'STATUS_LINE_MODULE_NOT_CONFIGURED',
  },

  /**
   * Event types for module communication
   */
  EVENTS: {
    THEME_CHANGED: 'status-line:theme-changed',
    LAYOUT_UPDATED: 'status-line:layout-updated',
    COMPONENT_ADDED: 'status-line:component-added',
    COMPONENT_REMOVED: 'status-line:component-removed',
    COMPONENT_UPDATED: 'status-line:component-updated',
    PREVIEW_GENERATED: 'status-line:preview-generated',
    CONFIGURATION_EXPORTED: 'status-line:configuration-exported',
    CONFIGURATION_IMPORTED: 'status-line:configuration-imported',
    TEMPLATE_APPLIED: 'status-line:template-applied',
    VALIDATION_COMPLETED: 'status-line:validation-completed',
    MODULE_INITIALIZED: 'status-line:module-initialized',
    MODULE_CONFIGURED: 'status-line:module-configured',
  },

  /**
   * File extensions and MIME types
   */
  FILE_FORMATS: {
    JSON: {
      EXTENSION: '.json',
      MIME_TYPE: 'application/json',
    },
    YAML: {
      EXTENSION: '.yaml',
      MIME_TYPE: 'application/x-yaml',
    },
    CSS: {
      EXTENSION: '.css',
      MIME_TYPE: 'text/css',
    },
    HTML: {
      EXTENSION: '.html',
      MIME_TYPE: 'text/html',
    },
  },

  /**
   * Performance and optimization settings
   */
  PERFORMANCE: {
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100,
    MAX_RENDER_TIME: 16,
    CACHE_EXPIRY: 300000, // 5 minutes
    MAX_CACHE_SIZE: 50,
    BATCH_SIZE: 10,
  },

  /**
   * CSS class names and selectors
   */
  CSS_CLASSES: {
    STATUS_LINE: 'rcc-status-line',
    STATUS_LINE_SECTION: 'rcc-status-line-section',
    STATUS_LINE_COMPONENT: 'rcc-status-line-component',
    STATUS_LINE_SEPARATOR: 'rcc-status-line-separator',
    STATUS_LINE_LEFT: 'rcc-status-line-left',
    STATUS_LINE_CENTER: 'rcc-status-line-center',
    STATUS_LINE_RIGHT: 'rcc-status-line-right',
    STATUS_LINE_THEME: 'rcc-status-line-theme',
    STATUS_LINE_PREVIEW: 'rcc-status-line-preview',
  },

  /**
   * Sample data for preview generation
   */
  SAMPLE_DATA: {
    MODE: 'NORMAL',
    FILE_NAME: 'example.ts',
    FILE_PATH: '/project/src/components/StatusLine.ts',
    POSITION: '15:42',
    ENCODING: 'UTF-8',
    FILE_TYPE: 'TypeScript',
    BRANCH: 'feature/status-line',
    LINE_COUNT: 150,
    SELECTION: '5 selected',
    INDENTATION: 'Spaces: 2',
    EOL: 'LF',
  },
} as const;

/**
 * Type-safe access to constants
 */
export type StatusLineConstants = typeof STATUS_LINE_CONSTANTS;

/**
 * Helper function to get theme by ID
 * @param themeId - Theme ID to retrieve
 * @returns Theme configuration or null if not found
 */
export function getBuiltInTheme(themeId: string): IStatusLineTheme | null {
  const themes = Object.values(STATUS_LINE_CONSTANTS.THEMES);
  return themes.find(theme => theme.id === themeId) || null;
}

/**
 * Helper function to get component by ID
 * @param componentId - Component ID to retrieve
 * @returns Component configuration or null if not found
 */
export function getBuiltInComponent(componentId: string): IStatusLineComponent | null {
  const components = Object.values(STATUS_LINE_CONSTANTS.COMPONENTS);
  return components.find(component => component.id === componentId) || null;
}

/**
 * Helper function to validate color format
 * @param color - Color string to validate
 * @returns Whether the color format is valid
 */
export function isValidColor(color: string): boolean {
  return STATUS_LINE_CONSTANTS.VALIDATION.THEME.COLOR_REGEX.test(color);
}

/**
 * Helper function to get error message
 * @param errorCode - Error code
 * @returns Error message
 */
export function getErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    [STATUS_LINE_CONSTANTS.ERRORS.INVALID_THEME]: 'Invalid theme configuration provided',
    [STATUS_LINE_CONSTANTS.ERRORS.INVALID_LAYOUT]: 'Invalid layout configuration provided',
    [STATUS_LINE_CONSTANTS.ERRORS.INVALID_COMPONENT]: 'Invalid component configuration provided',
    [STATUS_LINE_CONSTANTS.ERRORS.COMPONENT_NOT_FOUND]: 'Component not found',
    [STATUS_LINE_CONSTANTS.ERRORS.THEME_NOT_FOUND]: 'Theme not found',
    [STATUS_LINE_CONSTANTS.ERRORS.TEMPLATE_NOT_FOUND]: 'Template not found',
    [STATUS_LINE_CONSTANTS.ERRORS.INVALID_CONFIGURATION]: 'Invalid configuration provided',
    [STATUS_LINE_CONSTANTS.ERRORS.EXPORT_FAILED]: 'Failed to export configuration',
    [STATUS_LINE_CONSTANTS.ERRORS.IMPORT_FAILED]: 'Failed to import configuration',
    [STATUS_LINE_CONSTANTS.ERRORS.PREVIEW_GENERATION_FAILED]: 'Failed to generate preview',
    [STATUS_LINE_CONSTANTS.ERRORS.VALIDATION_FAILED]: 'Configuration validation failed',
    [STATUS_LINE_CONSTANTS.ERRORS.MODULE_NOT_INITIALIZED]: 'Module is not initialized',
    [STATUS_LINE_CONSTANTS.ERRORS.MODULE_NOT_CONFIGURED]: 'Module is not configured',
  };

  return errorMessages[errorCode] || 'Unknown error occurred';
}
