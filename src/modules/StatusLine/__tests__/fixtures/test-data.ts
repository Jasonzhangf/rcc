/**
 * Test data fixtures for StatusLineModule tests
 * Provides sample data for comprehensive testing
 * 
 * @author RCC System
 * @version 1.0.0
 * @since 2025-01-09
 */

import {
  IStatusLineTheme,
  IStatusLineLayout,
  IStatusLineComponent,
  IStatusLineTemplate,
  StatusLineThemeType,
  StatusLinePosition,
  StatusLineComponentType,
} from '../../interfaces/IStatusLineModule';
import { STATUS_LINE_CONSTANTS } from '../../constants/StatusLine.constants';

/**
 * Test themes for various scenarios
 */
export const themes: Record<string, IStatusLineTheme> = {
  default: {
    id: 'test-default',
    name: 'Test Default Theme',
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
      weight: 'normal',
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
      style: 'solid',
      width: 1,
      color: '#333333',
    },
    animations: {
      enabled: true,
      duration: 200,
      easing: 'ease-in-out',
    },
  },

  powerline: {
    id: 'test-powerline',
    name: 'Test Powerline Theme',
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
      family: '"Fira Code", "Cascadia Code", monospace',
      size: 12,
      weight: 'normal',
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
      style: 'solid',
      width: 1,
      color: '#333333',
    },
    animations: {
      enabled: true,
      duration: 300,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
    },
  },

  minimal: {
    id: 'test-minimal',
    name: 'Test Minimal Theme',
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
      family: '"SF Pro Display", "Segoe UI", sans-serif',
      size: 11,
      weight: 'normal',
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
      style: 'solid',
      width: 0,
      color: 'transparent',
    },
    animations: {
      enabled: false,
      duration: 0,
      easing: 'none',
    },
  },

  invalidTheme: {
    id: '', // Invalid: empty ID
    name: 'Invalid Theme',
    type: 'custom' as StatusLineThemeType,
    colors: {
      background: 'invalid-color', // Invalid color format
      foreground: '#ffffff',
      accent: '#007acc',
      warning: '#ff9900',
      error: '#ff4444',
      success: '#00cc66',
      inactive: '#666666',
    },
    fonts: {
      family: 'Test Font',
      size: 5, // Too small
      weight: 'normal',
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
      style: 'solid',
      width: 1,
      color: '#333333',
    },
    animations: {
      enabled: true,
      duration: 5000, // Too long
      easing: 'ease-in-out',
    },
  },
};

/**
 * Test layouts for various scenarios
 */
export const layouts: Record<string, IStatusLineLayout> = {
  default: {
    position: 'bottom' as StatusLinePosition,
    height: 24,
    width: '100%',
    zIndex: 1000,
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
  },

  top: {
    position: 'top' as StatusLinePosition,
    height: 28,
    width: '100%',
    zIndex: 1001,
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
      hideComponents: ['encoding', 'filetype'],
    },
  },

  fixedWidth: {
    position: 'bottom' as StatusLinePosition,
    height: 26,
    width: 1200,
    zIndex: 999,
    sticky: false,
    components: {
      left: [],
      center: [],
      right: [],
    },
    responsive: {
      enabled: false,
      breakpoints: {},
      hideComponents: [],
    },
  },

  invalid: {
    position: 'invalid' as any, // Invalid position
    height: 5, // Too small
    width: '100%',
    zIndex: -1, // Invalid z-index
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
  },
};

/**
 * Test components for various scenarios
 */
export const components: Record<string, IStatusLineComponent> = {
  mode: {
    id: 'test-mode',
    type: 'mode' as StatusLineComponentType,
    label: 'Mode',
    enabled: true,
    position: 'left',
    priority: 1,
    color: '#ffffff',
    backgroundColor: '#007acc',
    icon: '⚡',
    tooltip: 'Current editor mode',
  },

  fileInfo: {
    id: 'test-file-info',
    type: 'file' as StatusLineComponentType,
    label: 'File Info',
    enabled: true,
    position: 'left',
    priority: 2,
    color: '#ffffff',
    icon: '📄',
    tooltip: 'Current file information',
  },

  position: {
    id: 'test-position',
    type: 'position' as StatusLineComponentType,
    label: 'Position',
    enabled: true,
    position: 'right',
    priority: 3,
    color: '#ffffff',
    icon: '📍',
    tooltip: 'Cursor position',
  },

  encoding: {
    id: 'test-encoding',
    type: 'encoding' as StatusLineComponentType,
    label: 'Encoding',
    enabled: true,
    position: 'right',
    priority: 4,
    color: '#ffffff',
    icon: '🔤',
    tooltip: 'File encoding',
  },

  filetype: {
    id: 'test-filetype',
    type: 'filetype' as StatusLineComponentType,
    label: 'File Type',
    enabled: true,
    position: 'right',
    priority: 5,
    color: '#ffffff',
    icon: '📋',
    tooltip: 'File type',
  },

  branch: {
    id: 'test-branch',
    type: 'branch' as StatusLineComponentType,
    label: 'Branch',
    enabled: true,
    position: 'left',
    priority: 6,
    color: '#ffffff',
    icon: '🌳',
    tooltip: 'Git branch',
  },

  custom: {
    id: 'test-custom',
    type: 'custom' as StatusLineComponentType,
    label: 'Custom Component',
    enabled: true,
    position: 'center',
    priority: 10,
    color: '#333333',
    backgroundColor: '#f0f0f0',
    tooltip: 'Custom test component',
  },

  disabled: {
    id: 'test-disabled',
    type: 'custom' as StatusLineComponentType,
    label: 'Disabled Component',
    enabled: false,
    position: 'left',
    priority: 99,
    color: '#666666',
    tooltip: 'Disabled test component',
  },

  invalid: {
    id: 'ab', // Too short
    type: 'invalid' as any, // Invalid type
    label: '', // Empty label
    enabled: true,
    position: 'invalid' as any, // Invalid position
    priority: -1, // Invalid priority
    color: 'invalid-color', // Invalid color
    tooltip: 'x'.repeat(300), // Too long tooltip
  },
};

/**
 * Test templates for various scenarios
 */
export const templates: Record<string, IStatusLineTemplate> = {
  developer: {
    id: 'test-developer-template',
    name: 'Test Developer Template',
    description: 'Template optimized for software development',
    theme: themes.powerline,
    layout: layouts.default,
    components: [
      components.mode,
      components.branch,
      components.fileInfo,
      components.position,
      components.encoding,
      components.filetype,
    ],
    presets: {
      showGitStatus: true,
      showFileStats: true,
      enableAnimations: true,
    },
  },

  writer: {
    id: 'test-writer-template',
    name: 'Test Writer Template',
    description: 'Minimal template for writing and documentation',
    theme: themes.minimal,
    layout: layouts.default,
    components: [
      components.fileInfo,
      components.position,
    ],
    presets: {
      showWordCount: true,
      enableSpellCheck: true,
      hideAdvancedFeatures: true,
    },
  },

  presentation: {
    id: 'test-presentation-template',
    name: 'Test Presentation Template',
    description: 'Clean template for presentations and demos',
    theme: themes.default,
    layout: {
      ...layouts.top,
      height: 20,
    },
    components: [
      {
        ...components.fileInfo,
        priority: 1,
      },
    ],
    presets: {
      hideAllExceptFile: true,
      enableMinimalMode: true,
    },
  },

  invalid: {
    id: '', // Invalid: empty ID
    name: '',
    description: 'Invalid template for testing validation',
    theme: themes.invalidTheme,
    layout: layouts.invalid,
    components: [components.invalid],
    presets: {},
  },
};

/**
 * Sample data for preview generation
 */
export const sampleData = {
  MODE: 'NORMAL',
  FILE_NAME: 'StatusLineModule.test.ts',
  FILE_PATH: '/src/modules/StatusLine/__tests__/StatusLineModule.test.ts',
  POSITION: '125:45',
  ENCODING: 'UTF-8',
  FILE_TYPE: 'TypeScript',
  BRANCH: 'feature/status-line-module',
  LINE_COUNT: 489,
  SELECTION: '12 selected',
  INDENTATION: 'Spaces: 2',
  EOL: 'LF',
  MODIFIED: true,
  READONLY: false,
  WORD_COUNT: 1250,
  CHAR_COUNT: 8500,
  TABS_COUNT: 3,
  SPACES_COUNT: 2450,
};

/**
 * Alternative sample data sets for testing different scenarios
 */
export const sampleDataSets = {
  empty: {},
  
  minimal: {
    MODE: 'INSERT',
    FILE_NAME: 'untitled',
    POSITION: '1:1',
  },
  
  complete: {
    ...sampleData,
    CUSTOM_FIELD_1: 'Custom Value 1',
    CUSTOM_FIELD_2: 'Custom Value 2',
  },
  
  specialCharacters: {
    MODE: 'VISUAL',
    FILE_NAME: 'file-with-special-chars-äöü.ts',
    FILE_PATH: '/path/with spaces/and-special-chars-äöü.ts',
    POSITION: '999:123',
    ENCODING: 'UTF-8',
    FILE_TYPE: 'TypeScript',
    BRANCH: 'feature/special-chars-äöü-branch',
  },
  
  longValues: {
    MODE: 'COMMAND-LINE',
    FILE_NAME: 'very-long-filename-that-might-cause-overflow-issues-in-the-status-line-component.ts',
    FILE_PATH: '/very/long/path/that/might/cause/overflow/issues/in/the/status/line/component/display.ts',
    POSITION: '123456:789',
    ENCODING: 'UTF-8-with-BOM',
    FILE_TYPE: 'TypeScript React Component',
    BRANCH: 'feature/very-long-branch-name-that-might-cause-display-issues',
  },
};

/**
 * Configuration presets for testing
 */
export const configurationPresets = {
  default: {
    theme: themes.default,
    layout: layouts.default,
    components: [
      components.mode,
      components.fileInfo,
      components.position,
      components.encoding,
    ],
  },
  
  minimal: {
    theme: themes.minimal,
    layout: layouts.default,
    components: [
      components.fileInfo,
      components.position,
    ],
  },
  
  poweruser: {
    theme: themes.powerline,
    layout: layouts.top,
    components: Object.values(components).filter(c => c.id !== 'invalid' && c.id !== 'disabled'),
  },
  
  invalid: {
    theme: themes.invalidTheme,
    layout: layouts.invalid,
    components: [components.invalid],
  },
};

/**
 * Export all test data
 */
export const testData = {
  themes,
  layouts,
  components,
  templates,
  sampleData,
  sampleDataSets,
  configurationPresets,
  
  // Constants for testing limits
  constants: {
    MAX_COMPONENTS: STATUS_LINE_CONSTANTS.DEFAULTS.MAX_COMPONENTS,
    MIN_ID_LENGTH: STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.ID_MIN_LENGTH,
    MAX_ID_LENGTH: STATUS_LINE_CONSTANTS.VALIDATION.COMPONENT.ID_MAX_LENGTH,
    MIN_HEIGHT: STATUS_LINE_CONSTANTS.VALIDATION.LAYOUT.HEIGHT_MIN,
    MAX_HEIGHT: STATUS_LINE_CONSTANTS.VALIDATION.LAYOUT.HEIGHT_MAX,
    MIN_FONT_SIZE: STATUS_LINE_CONSTANTS.VALIDATION.THEME.FONT_SIZE_MIN,
    MAX_FONT_SIZE: STATUS_LINE_CONSTANTS.VALIDATION.THEME.FONT_SIZE_MAX,
  },
  
  // Helper functions
  helpers: {
    /**
     * Create a valid component with specified overrides
     */
    createValidComponent: (overrides: Partial<IStatusLineComponent> = {}): IStatusLineComponent => ({
      id: `test-component-${Date.now()}`,
      type: 'custom',
      label: 'Test Component',
      enabled: true,
      position: 'left',
      priority: 50,
      color: '#ffffff',
      tooltip: 'Test component tooltip',
      ...overrides,
    }),
    
    /**
     * Create a valid theme with specified overrides
     */
    createValidTheme: (overrides: Partial<IStatusLineTheme> = {}): IStatusLineTheme => ({
      ...themes.default,
      id: `test-theme-${Date.now()}`,
      name: 'Test Theme',
      ...overrides,
    }),
    
    /**
     * Create a valid layout with specified overrides
     */
    createValidLayout: (overrides: Partial<IStatusLineLayout> = {}): IStatusLineLayout => ({
      ...layouts.default,
      ...overrides,
    }),
    
    /**
     * Create a valid template with specified overrides
     */
    createValidTemplate: (overrides: Partial<IStatusLineTemplate> = {}): IStatusLineTemplate => ({
      id: `test-template-${Date.now()}`,
      name: 'Test Template',
      description: 'Test template description',
      theme: themes.default,
      layout: layouts.default,
      components: [components.mode, components.fileInfo],
      presets: {},
      ...overrides,
    }),
  },
};

export default testData;
