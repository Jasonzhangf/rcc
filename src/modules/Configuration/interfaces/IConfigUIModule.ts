import { BaseModule } from '../../../core/BaseModule';
import { ConfigurationData } from './IConfigurationSystem';
import { ValidationResult } from '../../../interfaces/Validation';

/**
 * Interface for Configuration UI Module
 */
export interface IConfigUIModule extends BaseModule {
  // Web server management
  startWebServer(port?: number): Promise<void>;
  stopWebServer(): Promise<void>;
  getServerInfo(): WebServerInfo;
  
  // Browser integration
  openBrowser(url?: string): Promise<void>;
  
  // Configuration API
  handleConfigurationRequest(request: UIConfigurationRequest): Promise<UIConfigurationResponse>;
  broadcastConfigurationUpdate(update: ConfigurationData): Promise<void>;
  
  // UI customization
  setUITheme(theme: UITheme): void;
  registerUIExtension(extension: UIExtension): void;
}

/**
 * Web server information
 */
export interface WebServerInfo {
  port: number;
  host: string;
  protocol: 'http' | 'https';
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  uptime: number;
  connections: number;
}

/**
 * UI configuration request
 */
export interface UIConfigurationRequest {
  action: UIAction;
  section?: string;
  data?: any;
  sessionId: string;
  timestamp: number;
  options?: UIRequestOptions;
}

/**
 * UI actions
 */
export enum UIAction {
  GET = 'get',
  UPDATE = 'update',
  VALIDATE = 'validate',
  SAVE = 'save',
  SAVE_AND_RESTART = 'save-and-restart',
  RESET = 'reset',
  BACKUP = 'backup',
  RESTORE = 'restore',
  // Multi-key management actions
  ADD_KEY = 'add-key',
  REMOVE_KEY = 'remove-key',
  UPDATE_KEY = 'update-key',
  TEST_KEY = 'test-key',
  ROTATE_KEYS = 'rotate-keys'
}

/**
 * UI request options
 */
export interface UIRequestOptions {
  validateBeforeSave?: boolean;
  createBackup?: boolean;
  restartRequired?: boolean;
  dryRun?: boolean;
}

/**
 * UI configuration response
 */
export interface UIConfigurationResponse {
  success: boolean;
  data?: any;
  errors?: string[];
  warnings?: string[];
  timestamp: number;
  validationResult?: ValidationResult;
  metadata?: ResponseMetadata;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  processingTime: number;
  affectedSections: string[];
  backupCreated?: string;
  requiresRestart: boolean;
}

/**
 * UI Theme configuration
 */
export interface UITheme {
  name: string;
  colors: UIColorScheme;
  typography: UITypography;
  spacing: UISpacing;
  components: UIComponentTheme;
}

/**
 * UI color scheme
 */
export interface UIColorScheme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  error: string;
  warning: string;
  info: string;
  success: string;
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
}

/**
 * UI typography
 */
export interface UITypography {
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    bold: number;
  };
}

/**
 * UI spacing
 */
export interface UISpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

/**
 * UI component theme
 */
export interface UIComponentTheme {
  button: ComponentStyle;
  input: ComponentStyle;
  panel: ComponentStyle;
  modal: ComponentStyle;
}

/**
 * Component style
 */
export interface ComponentStyle {
  background: string;
  border: string;
  borderRadius: string;
  padding: string;
  margin: string;
  fontSize: string;
  color: string;
}

/**
 * UI Extension
 */
export interface UIExtension {
  id: string;
  name: string;
  version: string;
  description: string;
  type: UIExtensionType;
  component: React.ComponentType<any>;
  placement: UIPlacement;
  permissions: string[];
}

/**
 * UI extension types
 */
export enum UIExtensionType {
  PANEL = 'panel',
  WIDGET = 'widget',
  TOOLBAR = 'toolbar',
  MENU = 'menu',
  MODAL = 'modal'
}

/**
 * UI placement options
 */
export enum UIPlacement {
  HEADER = 'header',
  SIDEBAR = 'sidebar',
  MAIN = 'main',
  FOOTER = 'footer',
  FLOATING = 'floating'
}

/**
 * WebSocket message types
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: any;
  timestamp: number;
  sessionId?: string;
}

/**
 * WebSocket message types
 */
export enum WebSocketMessageType {
  CONFIG_UPDATED = 'config-updated',
  VALIDATION_RESULT = 'validation-result',
  SERVER_STATUS = 'server-status',
  ERROR = 'error',
  HEARTBEAT = 'heartbeat'
}

/**
 * UI session information
 */
export interface UISession {
  id: string;
  userId?: string;
  startTime: number;
  lastActivity: number;
  permissions: string[];
  metadata: Record<string, any>;
}