/**
 * Config UI Module Interface
 *
 * Defines the contract for providing user interface capabilities
 * for configuration management including editors, viewers, and wizards.
 */
import { ConfigData, ConfigSchema, ConfigValidationResult } from './IConfigurationSystem';
/**
 * UI component types
 */
export type UIComponentType = 'editor' | 'viewer' | 'wizard' | 'validator' | 'diff';
/**
 * UI theme options
 */
export type UITheme = 'light' | 'dark' | 'auto';
/**
 * Supported editor languages
 */
export type EditorLanguage = 'json' | 'yaml' | 'toml';
/**
 * UI component configuration
 */
export interface UIComponentConfig {
    /**
     * Component type
     */
    type: UIComponentType;
    /**
     * Component container element ID
     */
    containerId: string;
    /**
     * Component theme
     */
    theme?: UITheme;
    /**
     * Component dimensions
     */
    dimensions?: {
        width?: number;
        height?: number;
    };
    /**
     * Component-specific options
     */
    options?: Record<string, any>;
}
/**
 * Configuration editor options
 */
export interface ConfigEditorOptions {
    /**
     * Editor language/format
     */
    language: EditorLanguage;
    /**
     * Editor theme
     */
    theme?: UITheme;
    /**
     * Whether editor is read-only
     */
    readOnly?: boolean;
    /**
     * Auto-save configuration
     */
    autoSave?: {
        enabled: boolean;
        delay?: number;
    };
    /**
     * Validation configuration
     */
    validation?: {
        enabled: boolean;
        realTime?: boolean;
        schema?: ConfigSchema;
    };
    /**
     * Editor features
     */
    features?: {
        lineNumbers?: boolean;
        wordWrap?: boolean;
        autoCompletion?: boolean;
        syntaxHighlighting?: boolean;
        folding?: boolean;
    };
    /**
     * Custom key bindings
     */
    keyBindings?: Record<string, string>;
}
/**
 * Configuration viewer options
 */
export interface ConfigViewerOptions {
    /**
     * Display format
     */
    format: 'tree' | 'table' | 'json' | 'yaml';
    /**
     * Viewer theme
     */
    theme?: UITheme;
    /**
     * Whether to show metadata
     */
    showMetadata?: boolean;
    /**
     * Whether to show validation results
     */
    showValidation?: boolean;
    /**
     * Expandable sections
     */
    expandable?: boolean;
    /**
     * Search functionality
     */
    search?: {
        enabled: boolean;
        placeholder?: string;
    };
    /**
     * Filter functionality
     */
    filter?: {
        enabled: boolean;
        types?: string[];
    };
}
/**
 * Configuration wizard options
 */
export interface ConfigWizardOptions {
    /**
     * Wizard steps
     */
    steps: WizardStep[];
    /**
     * Wizard theme
     */
    theme?: UITheme;
    /**
     * Whether to show progress indicator
     */
    showProgress?: boolean;
    /**
     * Whether to allow skipping steps
     */
    allowSkip?: boolean;
    /**
     * Validation before step transition
     */
    validateOnStep?: boolean;
    /**
     * Auto-advance on completion
     */
    autoAdvance?: boolean;
}
/**
 * Wizard step definition
 */
export interface WizardStep {
    /**
     * Step identifier
     */
    id: string;
    /**
     * Step title
     */
    title: string;
    /**
     * Step description
     */
    description?: string;
    /**
     * Configuration fields for this step
     */
    fields: WizardField[];
    /**
     * Step validation rules
     */
    validation?: WizardStepValidation;
    /**
     * Whether this step is optional
     */
    optional?: boolean;
    /**
     * Condition for showing this step
     */
    condition?: (config: Partial<ConfigData>) => boolean;
}
/**
 * Wizard field definition
 */
export interface WizardField {
    /**
     * Field name/key
     */
    name: string;
    /**
     * Field type
     */
    type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'file';
    /**
     * Field label
     */
    label: string;
    /**
     * Field description/help text
     */
    description?: string;
    /**
     * Default value
     */
    defaultValue?: any;
    /**
     * Whether field is required
     */
    required?: boolean;
    /**
     * Field validation rules
     */
    validation?: WizardFieldValidation;
    /**
     * Options for select fields
     */
    options?: Array<{
        label: string;
        value: any;
    }>;
    /**
     * Field attributes
     */
    attributes?: Record<string, any>;
}
/**
 * Wizard step validation
 */
export interface WizardStepValidation {
    /**
     * Custom validation function
     */
    validator?: (values: Record<string, any>) => boolean | string;
    /**
     * Error message
     */
    errorMessage?: string;
}
/**
 * Wizard field validation
 */
export interface WizardFieldValidation {
    /**
     * Minimum value (for numbers)
     */
    min?: number;
    /**
     * Maximum value (for numbers)
     */
    max?: number;
    /**
     * Minimum length (for strings)
     */
    minLength?: number;
    /**
     * Maximum length (for strings)
     */
    maxLength?: number;
    /**
     * Regular expression pattern
     */
    pattern?: RegExp;
    /**
     * Custom validation function
     */
    validator?: (value: any) => boolean | string;
    /**
     * Error message
     */
    errorMessage?: string;
}
/**
 * Configuration diff options
 */
export interface ConfigDiffOptions {
    /**
     * Diff display format
     */
    format: 'side-by-side' | 'inline' | 'unified';
    /**
     * Diff theme
     */
    theme?: UITheme;
    /**
     * Whether to show line numbers
     */
    showLineNumbers?: boolean;
    /**
     * Whether to highlight changes
     */
    highlightChanges?: boolean;
    /**
     * Context lines around changes
     */
    contextLines?: number;
    /**
     * Whether to ignore whitespace changes
     */
    ignoreWhitespace?: boolean;
}
/**
 * UI event types
 */
export type UIEventType = 'config-changed' | 'validation-changed' | 'save-requested' | 'load-requested' | 'reset-requested' | 'export-requested' | 'import-requested';
/**
 * UI event data
 */
export interface UIEvent {
    /**
     * Event type
     */
    type: UIEventType;
    /**
     * Component that triggered the event
     */
    source: UIComponentType;
    /**
     * Event payload
     */
    data?: any;
    /**
     * Event timestamp
     */
    timestamp: string;
}
/**
 * UI validation display options
 */
export interface UIValidationDisplay {
    /**
     * Whether to show validation results
     */
    enabled: boolean;
    /**
     * Display position
     */
    position: 'inline' | 'sidebar' | 'bottom' | 'popup';
    /**
     * Whether to show error details
     */
    showDetails?: boolean;
    /**
     * Whether to show warnings
     */
    showWarnings?: boolean;
    /**
     * Whether to group by type
     */
    groupByType?: boolean;
    /**
     * Auto-hide delay for success messages
     */
    autoHideDelay?: number;
}
/**
 * Export/Import options
 */
export interface ExportImportOptions {
    /**
     * Supported formats
     */
    formats: ('json' | 'yaml' | 'toml' | 'env')[];
    /**
     * Default format
     */
    defaultFormat: 'json' | 'yaml' | 'toml' | 'env';
    /**
     * Whether to include metadata
     */
    includeMetadata?: boolean;
    /**
     * Whether to include schema
     */
    includeSchema?: boolean;
    /**
     * Pretty print options
     */
    prettyPrint?: boolean;
    /**
     * File name template
     */
    fileNameTemplate?: string;
}
/**
 * Config UI Module Interface
 */
export interface IConfigUIModule {
    /**
     * Create a configuration editor component
     * @param config Component configuration
     * @param options Editor options
     * @returns Component instance identifier
     */
    createEditor(config: UIComponentConfig, options: ConfigEditorOptions): Promise<string>;
    /**
     * Create a configuration viewer component
     * @param config Component configuration
     * @param options Viewer options
     * @returns Component instance identifier
     */
    createViewer(config: UIComponentConfig, options: ConfigViewerOptions): Promise<string>;
    /**
     * Create a configuration wizard component
     * @param config Component configuration
     * @param options Wizard options
     * @returns Component instance identifier
     */
    createWizard(config: UIComponentConfig, options: ConfigWizardOptions): Promise<string>;
    /**
     * Create a configuration diff component
     * @param config Component configuration
     * @param options Diff options
     * @returns Component instance identifier
     */
    createDiff(config: UIComponentConfig, options: ConfigDiffOptions): Promise<string>;
    /**
     * Load configuration data into a component
     * @param componentId Component instance identifier
     * @param configData Configuration data to load
     */
    loadConfiguration(componentId: string, configData: ConfigData): Promise<void>;
    /**
     * Get configuration data from a component
     * @param componentId Component instance identifier
     * @returns Current configuration data
     */
    getConfiguration(componentId: string): Promise<ConfigData>;
    /**
     * Validate configuration in a component
     * @param componentId Component instance identifier
     * @param schema Optional schema to validate against
     * @returns Validation result
     */
    validateConfiguration(componentId: string, schema?: ConfigSchema): Promise<ConfigValidationResult>;
    /**
     * Show validation results in the UI
     * @param componentId Component instance identifier
     * @param validationResult Validation result to display
     * @param options Display options
     */
    showValidationResults(componentId: string, validationResult: ConfigValidationResult, options?: UIValidationDisplay): Promise<void>;
    /**
     * Export configuration from a component
     * @param componentId Component instance identifier
     * @param format Export format
     * @param options Export options
     * @returns Exported configuration string
     */
    exportConfiguration(componentId: string, format: 'json' | 'yaml' | 'toml' | 'env', options?: ExportImportOptions): Promise<string>;
    /**
     * Import configuration into a component
     * @param componentId Component instance identifier
     * @param data Configuration data string
     * @param format Data format
     * @param options Import options
     */
    importConfiguration(componentId: string, data: string, format: 'json' | 'yaml' | 'toml' | 'env', options?: ExportImportOptions): Promise<void>;
    /**
     * Compare two configurations and show diff
     * @param componentId Diff component identifier
     * @param oldConfig Original configuration
     * @param newConfig New configuration
     * @param options Diff options
     */
    showConfigurationDiff(componentId: string, oldConfig: ConfigData, newConfig: ConfigData, options?: ConfigDiffOptions): Promise<void>;
    /**
     * Set component theme
     * @param componentId Component instance identifier
     * @param theme Theme to apply
     */
    setTheme(componentId: string, theme: UITheme): Promise<void>;
    /**
     * Update component options
     * @param componentId Component instance identifier
     * @param options New options
     */
    updateOptions(componentId: string, options: Partial<ConfigEditorOptions | ConfigViewerOptions | ConfigWizardOptions | ConfigDiffOptions>): Promise<void>;
    /**
     * Register event listener for UI events
     * @param componentId Component instance identifier
     * @param eventType Event type to listen for
     * @param callback Event callback function
     */
    addEventListener(componentId: string, eventType: UIEventType, callback: (event: UIEvent) => void): void;
    /**
     * Remove event listener
     * @param componentId Component instance identifier
     * @param eventType Event type
     * @param callback Event callback function
     */
    removeEventListener(componentId: string, eventType: UIEventType, callback: (event: UIEvent) => void): void;
    /**
     * Destroy a UI component
     * @param componentId Component instance identifier
     */
    destroyComponent(componentId: string): Promise<void>;
    /**
     * Get all active component instances
     * @returns Array of component instance identifiers
     */
    getActiveComponents(): string[];
    /**
     * Get component information
     * @param componentId Component instance identifier
     * @returns Component information
     */
    getComponentInfo(componentId: string): UIComponentConfig | null;
    /**
     * Check if component exists
     * @param componentId Component instance identifier
     * @returns Whether component exists
     */
    hasComponent(componentId: string): boolean;
    /**
     * Resize a component
     * @param componentId Component instance identifier
     * @param dimensions New dimensions
     */
    resizeComponent(componentId: string, dimensions: {
        width?: number;
        height?: number;
    }): Promise<void>;
    /**
     * Focus a component
     * @param componentId Component instance identifier
     */
    focusComponent(componentId: string): Promise<void>;
    /**
     * Show loading state for a component
     * @param componentId Component instance identifier
     * @param message Optional loading message
     */
    showLoading(componentId: string, message?: string): Promise<void>;
    /**
     * Hide loading state for a component
     * @param componentId Component instance identifier
     */
    hideLoading(componentId: string): Promise<void>;
}
