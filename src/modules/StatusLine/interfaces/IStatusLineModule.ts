import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../../../interfaces/Connection';

/**
 * Status line theme type definition
 */
export type StatusLineThemeType = 'default' | 'powerline' | 'minimal' | 'custom';

/**
 * Status line position enumeration
 */
export type StatusLinePosition = 'top' | 'bottom';

/**
 * Status line component types
 */
export type StatusLineComponentType = 'mode' | 'file' | 'position' | 'encoding' | 'filetype' | 'branch' | 'custom';

/**
 * Status line component configuration
 */
export interface IStatusLineComponent {
  id: string;
  type: StatusLineComponentType;
  label: string;
  enabled: boolean;
  position: 'left' | 'center' | 'right';
  priority: number;
  formatter?: (data: any) => string;
  color?: string;
  backgroundColor?: string;
  icon?: string;
  tooltip?: string;
  metadata?: Record<string, any>;
}

/**
 * Status line theme configuration
 */
export interface IStatusLineTheme {
  id: string;
  name: string;
  type: StatusLineThemeType;
  colors: {
    background: string;
    foreground: string;
    accent: string;
    warning: string;
    error: string;
    success: string;
    inactive: string;
  };
  fonts: {
    family: string;
    size: number;
    weight: 'normal' | 'bold';
  };
  separators: {
    left: string;
    right: string;
    thin: string;
  };
  padding: {
    horizontal: number;
    vertical: number;
  };
  borders: {
    enabled: boolean;
    style: 'solid' | 'dashed' | 'dotted';
    width: number;
    color: string;
  };
  animations: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Status line layout configuration
 */
export interface IStatusLineLayout {
  position: StatusLinePosition;
  height: number;
  width: '100%' | number;
  zIndex: number;
  sticky: boolean;
  components: {
    left: IStatusLineComponent[];
    center: IStatusLineComponent[];
    right: IStatusLineComponent[];
  };
  responsive: {
    enabled: boolean;
    breakpoints: Record<string, number>;
    hideComponents: string[];
  };
  metadata?: Record<string, any>;
}

/**
 * Status line configuration template
 */
export interface IStatusLineTemplate {
  id: string;
  name: string;
  description: string;
  theme: IStatusLineTheme;
  layout: IStatusLineLayout;
  components: IStatusLineComponent[];
  presets: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Status line preview configuration
 */
export interface IStatusLinePreview {
  enabled: boolean;
  realTime: boolean;
  duration: number;
  showTooltips: boolean;
  highlightChanges: boolean;
  sampleData: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Status line input data interface
 */
export interface IStatusLineInput {
  action: 'configure' | 'setTheme' | 'updateLayout' | 'addComponent' | 'removeComponent' | 'preview' | 'export' | 'import';
  theme?: IStatusLineTheme;
  layout?: IStatusLineLayout;
  component?: IStatusLineComponent;
  template?: IStatusLineTemplate;
  preview?: IStatusLinePreview;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Status line output data interface
 */
export interface IStatusLineOutput {
  success: boolean;
  theme?: IStatusLineTheme;
  layout?: IStatusLineLayout;
  components?: IStatusLineComponent[];
  template?: IStatusLineTemplate;
  preview?: {
    html: string;
    css: string;
    data: Record<string, any>;
  };
  exportData?: {
    format: 'json' | 'yaml' | 'css' | 'html';
    content: string;
    filename: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: Record<string, any>;
}

/**
 * Status line module interface
 */
export interface IStatusLineModule {
  /**
   * Configure the status line module
   * @param config - Configuration data
   */
  configure(config: Record<string, any>): void;

  /**
   * Initialize the status line module
   */
  initialize(): Promise<void>;

  /**
   * Set the status line theme
   * @param theme - Theme configuration
   * @returns Success status and updated theme
   */
  setTheme(theme: IStatusLineTheme): Promise<IStatusLineOutput>;

  /**
   * Get the current status line theme
   * @returns Current theme configuration
   */
  getCurrentTheme(): IStatusLineTheme;

  /**
   * Get available built-in themes
   * @returns Array of available themes
   */
  getAvailableThemes(): IStatusLineTheme[];

  /**
   * Update the status line layout
   * @param layout - Layout configuration
   * @returns Success status and updated layout
   */
  updateLayout(layout: IStatusLineLayout): Promise<IStatusLineOutput>;

  /**
   * Get the current status line layout
   * @returns Current layout configuration
   */
  getCurrentLayout(): IStatusLineLayout;

  /**
   * Add a component to the status line
   * @param component - Component configuration
   * @returns Success status and updated components
   */
  addComponent(component: IStatusLineComponent): Promise<IStatusLineOutput>;

  /**
   * Remove a component from the status line
   * @param componentId - Component ID to remove
   * @returns Success status and updated components
   */
  removeComponent(componentId: string): Promise<IStatusLineOutput>;

  /**
   * Update a component in the status line
   * @param componentId - Component ID to update
   * @param updates - Component updates
   * @returns Success status and updated component
   */
  updateComponent(componentId: string, updates: Partial<IStatusLineComponent>): Promise<IStatusLineOutput>;

  /**
   * Get all status line components
   * @returns Array of all components
   */
  getComponents(): IStatusLineComponent[];

  /**
   * Generate status line preview
   * @param previewConfig - Preview configuration
   * @returns Preview HTML, CSS, and data
   */
  generatePreview(previewConfig: IStatusLinePreview): Promise<IStatusLineOutput>;

  /**
   * Apply configuration template
   * @param template - Template configuration
   * @returns Success status and applied configuration
   */
  applyTemplate(template: IStatusLineTemplate): Promise<IStatusLineOutput>;

  /**
   * Get available configuration templates
   * @returns Array of available templates
   */
  getTemplates(): IStatusLineTemplate[];

  /**
   * Export status line configuration
   * @param format - Export format
   * @returns Exported configuration data
   */
  exportConfiguration(format: 'json' | 'yaml' | 'css' | 'html'): Promise<IStatusLineOutput>;

  /**
   * Import status line configuration
   * @param data - Configuration data to import
   * @param format - Import format
   * @returns Success status and imported configuration
   */
  importConfiguration(data: string, format: 'json' | 'yaml'): Promise<IStatusLineOutput>;

  /**
   * Reset status line to default configuration
   * @returns Success status and default configuration
   */
  resetToDefaults(): Promise<IStatusLineOutput>;

  /**
   * Validate status line configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  validateConfiguration(config: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };

  /**
   * Get module information
   * @returns Module information
   */
  getInfo(): ModuleInfo;

  /**
   * Add input connection
   * @param connection - Connection information
   */
  addInputConnection(connection: ConnectionInfo): void;

  /**
   * Add output connection
   * @param connection - Connection information
   */
  addOutputConnection(connection: ConnectionInfo): void;

  /**
   * Receive data from connected modules
   * @param dataTransfer - Data transfer information
   */
  receiveData(dataTransfer: DataTransfer): Promise<void>;

  /**
   * Perform handshake with another module
   * @param targetModule - Target module to handshake with
   * @returns Whether handshake was successful
   */
  handshake(targetModule: any): Promise<boolean>;

  /**
   * Clean up resources and connections
   */
  destroy(): Promise<void>;
}
