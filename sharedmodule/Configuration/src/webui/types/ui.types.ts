/**
 * Web UI类型定义
 * 
 * 定义Web界面组件和服务的TypeScript类型
 */

// import { ConfigData } from '../../interfaces/IConfigurationSystem'; // Unused import

/**
 * UI配置选项
 */
export interface UIConfig {
  /** 容器元素ID */
  containerId: string;
  /** UI主题 */
  theme?: 'light' | 'dark' | 'auto';
  /** 默认视图 */
  defaultView?: 'generator' | 'parser';
  /** 版本号 */
  version?: string;
  /** 启用的功能 */
  features?: {
    configGenerator?: boolean;
    configParser?: boolean;
    fileImport?: boolean;
    fileExport?: boolean;
    localStorage?: boolean;
  };
}

/**
 * 导航状态
 */
export interface NavigationState {
  /** 当前视图 */
  currentView: 'generator' | 'parser';
  /** 菜单是否展开 */
  isMenuExpanded: boolean;
  /** 导航历史 */
  history: string[];
}

/**
 * 配置生成器选项
 */
export interface ConfigGeneratorOptions {
  /** 容器ID */
  containerId: string;
  /** 配置服务 */
  configService: any;
  /** 存储服务 */
  storageService: any;
  /** 默认配置模板 */
  defaultTemplate?: 'single-provider' | 'multi-provider' | 'enterprise';
  /** 启用的功能 */
  features?: {
    providerManagement?: boolean;
    routeManagement?: boolean;
    keyManagement?: boolean;
    templateSelection?: boolean;
  };
}

/**
 * 配置解析器选项
 */
export interface ConfigParserOptions {
  /** 容器ID */
  containerId: string;
  /** 解析服务 */
  parserService: any;
  /** 存储服务 */
  storageService: any;
  /** 支持的文件格式 */
  supportedFormats?: string[];
  /** 解析选项 */
  parseOptions?: {
    validateStructure?: boolean;
    generateStatistics?: boolean;
    showPreview?: boolean;
  };
}

/**
 * 供应商配置
 */
export interface ProviderConfig {
  /** 供应商ID */
  id: string;
  /** 供应商名称 */
  name: string;
  /** 供应商类型 */
  type: 'openai' | 'anthropic' | 'google' | 'local' | 'custom';
  /** API端点 */
  endpoint?: string;
  /** 可用模型列表 */
  models: ModelConfig[];
  /** 认证配置 */
  auth: {
    type: 'api-key' | 'oauth' | 'custom';
    keys: string[];
  };
  /** 限制配置 */
  limits?: {
    rateLimit?: number;
    maxTokens?: number;
    timeout?: number;
  };
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 模型配置
 */
export interface ModelConfig {
  /** 模型ID */
  id: string;
  /** 模型名称 */
  name: string;
  /** 模型版本 */
  version?: string;
  /** 最大上下文长度 */
  contextLength?: number;
  /** 是否支持函数调用 */
  supportsFunctions?: boolean;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 虚拟模型配置
 */
export interface VirtualModelConfig {
  /** 虚拟模型名称 */
  name: string;
  /** 映射的实际模型 */
  targetModel: string;
  /** 映射的供应商 */
  targetProvider: string;
  /** 权重配置(用于负载均衡) */
  weight?: number;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 路由配置
 */
export interface RouteConfig {
  /** 路由ID */
  id: string;
  /** 路由路径 */
  path: string;
  /** 目标供应商 */
  provider: string;
  /** 目标模型 */
  model: string;
  /** 路由权重 */
  weight?: number;
  /** 健康检查 */
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 流水线配置
 */
export interface PipelineConfig {
  /** 流水线ID */
  id: string;
  /** 虚拟模型列表 */
  virtualModels: string[];
  /** LLM切换配置 */
  llmswitch: {
    provider: string;
    model: string;
    keyIndex: number;
  };
  /** 工作流配置 */
  workflow: {
    enabled: boolean;
    steps: any[];
  };
  /** 兼容性配置 */
  compatibility: {
    openai: boolean;
    anthropic: boolean;
  };
  /** 供应商配置 */
  provider: ProviderConfig;
}

/**
 * 用户配置(解析输入)
 */
export interface UserConfig {
  /** 供应商配置 */
  providers: Record<string, {
    models: Record<string, {
      keys: string[];
    }>;
  }>;
  /** 虚拟模型映射 */
  virtualModels?: Record<string, {
    targetProvider: string;
    targetModel: string;
  }>;
  /** 其他配置 */
  [key: string]: any;
}

/**
 * 解析结果
 */
export interface ParseResult {
  /** 解析是否成功 */
  success: boolean;
  /** 生成的流水线 */
  pipelines: PipelineConfig[];
  /** 统计信息 */
  statistics: {
    totalPipelines: number;
    totalProviders: number;
    totalModels: number;
    totalKeys: number;
  };
  /** 错误信息 */
  errors?: string[];
  /** 警告信息 */
  warnings?: string[];
}

/**
 * 表单字段配置
 */
export interface FormFieldConfig {
  /** 字段名称 */
  name: string;
  /** 字段标签 */
  label: string;
  /** 字段类型 */
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'file';
  /** 是否必填 */
  required?: boolean;
  /** 默认值 */
  defaultValue?: any;
  /** 选项列表(用于select/radio) */
  options?: Array<{
    label: string;
    value: any;
  }>;
  /** 验证规则 */
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    custom?: (value: any) => boolean | string;
  };
  /** 帮助文本 */
  helpText?: string;
  /** 占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 表格配置
 */
export interface TableConfig {
  /** 列配置 */
  columns: Array<{
    key: string;
    title: string;
    width?: string;
    sortable?: boolean;
    filterable?: boolean;
    render?: (value: any, row: any) => string | HTMLElement;
  }>;
  /** 数据源 */
  data: any[];
  /** 是否可选择 */
  selectable?: boolean;
  /** 是否可排序 */
  sortable?: boolean;
  /** 是否可过滤 */
  filterable?: boolean;
  /** 分页配置 */
  pagination?: {
    enabled: boolean;
    pageSize: number;
    showTotal?: boolean;
  };
}

/**
 * 通知配置
 */
export interface NotificationConfig {
  /** 通知类型 */
  type: 'info' | 'success' | 'warning' | 'error';
  /** 通知标题 */
  title: string;
  /** 通知内容 */
  message: string;
  /** 自动关闭时间(毫秒) */
  duration?: number;
  /** 是否可关闭 */
  closable?: boolean;
  /** 自定义动作 */
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

/**
 * 模态框配置
 */
export interface ModalConfig {
  /** 模态框标题 */
  title: string;
  /** 模态框内容 */
  content: string | HTMLElement;
  /** 是否显示 */
  visible: boolean;
  /** 是否可关闭 */
  closable?: boolean;
  /** 宽度 */
  width?: string;
  /** 高度 */
  height?: string;
  /** 按钮配置 */
  buttons?: Array<{
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    action: () => void | Promise<void>;
  }>;
}

/**
 * 文件上传配置
 */
export interface FileUploadConfig {
  /** 接受的文件类型 */
  accept: string[];
  /** 最大文件大小(字节) */
  maxSize?: number;
  /** 是否允许多选 */
  multiple?: boolean;
  /** 上传前回调 */
  beforeUpload?: (file: File) => boolean | Promise<boolean>;
  /** 上传成功回调 */
  onSuccess?: (file: File, content: string) => void;
  /** 上传失败回调 */
  onError?: (file: File, error: Error) => void;
}

/**
 * 工具提示配置
 */
export interface TooltipConfig {
  /** 提示内容 */
  content: string;
  /** 显示位置 */
  placement: 'top' | 'bottom' | 'left' | 'right';
  /** 触发方式 */
  trigger: 'hover' | 'click' | 'focus';
  /** 延迟显示时间 */
  delay?: number;
}

/**
 * 事件处理器类型
 */
export type EventHandler<T = any> = (event: T) => void | Promise<void>;

/**
 * UI组件基础接口
 */
export interface UIComponent {
  /** 渲染组件 */
  render(): Promise<void>;
  /** 销毁组件 */
  destroy(): Promise<void>;
  /** 获取组件数据 */
  getData?(): any;
  /** 设置组件数据 */
  setData?(data: any): void;
  /** 验证组件数据 */
  validate?(): boolean | string[];
}

/**
 * 服务基础接口
 */
export interface UIService {
  /** 初始化服务 */
  initialize(): Promise<void>;
  /** 配置服务 */
  configure?(options: any): void;
  /** 获取服务状态 */
  getStatus?(): any;
}

/**
 * 存储键名常量
 */
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'rcc-ui-preferences',
  RECENT_FILES: 'rcc-recent-files',
  RECENT_CONFIGS: 'rcc-recent-configs',
  PARSE_HISTORY: 'rcc-parse-history',
  FORM_DRAFTS: 'rcc-form-drafts'
} as const;

/**
 * 错误类型
 */
export class UIError extends Error {
  constructor(
    message: string,
    public code: string,
    public component?: string
  ) {
    super(message);
    this.name = 'UIError';
  }
}

/**
 * 验证错误
 */
export class ValidationError extends UIError {
  constructor(
    message: string,
    public field: string,
    public value?: any
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}