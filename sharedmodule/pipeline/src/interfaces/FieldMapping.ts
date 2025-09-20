/**
 * Field Mapping Interfaces - 配置表字段转换系统
 * 定义协议间字段映射的接口和类型
 */

/**
 * 字段映射类型
 */
export type FieldTransformType = 'direct' | 'rename' | 'enum' | 'array' | 'object' | 'nested' | 'conditional' | 'function';

/**
 * 字段映射配置
 */
export interface FieldMapping {
  /** 源字段路径 */
  source: string;
  /** 目标字段路径 */
  target: string;
  /** 转换类型 */
  transform: FieldTransformType;
  /** 转换参数 */
  params?: Record<string, any>;
  /** 是否必需 */
  required?: boolean;
  /** 默认值 */
  defaultValue?: any;
  /** 描述 */
  description?: string;
}

/**
 * 枚举映射配置
 */
export interface EnumMapping {
  [enumName: string]: {
    [sourceValue: string]: string | number | boolean;
  };
}

/**
 * 协议映射配置
 */
export interface ProtocolMapping {
  /** 请求字段映射 */
  requestFields: FieldMapping[];
  /** 响应字段映射 */
  responseFields: FieldMapping[];
  /** 请求验证规则 */
  requestValidation?: ValidationRule[];
  /** 响应验证规则 */
  responseValidation?: ValidationRule[];
}

/**
 * 映射表配置
 */
export interface MappingTable {
  /** 版本 */
  version: string;
  /** 描述 */
  description: string;
  /** 字段映射列表 */
  fieldMappings: FieldMapping[];
  /** 协议映射 */
  protocolMappings: Record<string, ProtocolMapping>;
  /** 枚举映射 */
  enumMappings: EnumMapping;
  /** 全局验证规则 */
  globalValidation?: ValidationRule[];
  /** 自定义转换函数 */
  customTransformers?: Record<string, (value: any, params?: any) => any>;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 验证规则
 */
export interface ValidationRule {
  /** 规则名称 */
  name: string;
  /** 规则类型 */
  type: 'required' | 'type' | 'enum' | 'range' | 'regex' | 'custom';
  /** 字段路径 */
  field: string;
  /** 验证参数 */
  params?: Record<string, any>;
  /** 错误消息 */
  message?: string;
}

/**
 * 协议验证器接口
 */
export interface ProtocolValidator {
  /** 验证协议 */
  validate(data: any, protocol: string): { isValid: boolean; errors: string[] };
  /** 获取协议定义 */
  getProtocolDefinition(protocol: string): ProtocolDefinition | null;
}

/**
 * 协议定义
 */
export interface ProtocolDefinition {
  /** 协议名称 */
  name: string;
  /** 版本 */
  version: string;
  /** 请求结构 */
  requestStructure: ProtocolStructure;
  /** 响应结构 */
  responseStructure: ProtocolStructure;
  /** 支持的操作 */
  supportedOperations: string[];
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 协议结构
 */
export interface ProtocolStructure {
  /** 字段定义 */
  fields: FieldDefinition[];
  /** 必需字段 */
  required: string[];
  /** 允许的字段 */
  allowed?: string[];
  /** 验证规则 */
  validation?: ValidationRule[];
}

/**
 * 字段定义
 */
export interface FieldDefinition {
  /** 字段名称 */
  name: string;
  /** 字段类型 */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';
  /** 描述 */
  description?: string;
  /** 是否必需 */
  required?: boolean;
  /** 默认值 */
  defaultValue?: any;
  /** 验证规则 */
  validation?: ValidationRule[];
  /** 子字段（对于对象类型） */
  subFields?: FieldDefinition[];
}

/**
 * 字段转换器接口
 */
export interface FieldTransformer {
  /** 转换名称 */
  readonly name: string;
  /** 转换类型 */
  readonly type: FieldTransformType;

  /**
   * 执行转换
   */
  transform(value: any, params?: Record<string, any>): any;

  /**
   * 验证转换参数
   */
  validateParams(params?: Record<string, any>): { isValid: boolean; errors: string[] };
}

/**
 * 转换上下文
 */
export interface TransformContext {
  /** 追踪ID */
  traceId?: string;
  /** 源协议 */
  sourceProtocol: string;
  /** 目标协议 */
  targetProtocol: string;
  /** 转换方向 */
  direction: 'request' | 'response';
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 转换结果
 */
export interface TransformResult {
  /** 转换是否成功 */
  success: boolean;
  /** 转换后的数据 */
  data?: any;
  /** 错误信息 */
  errors?: string[];
  /** 警告信息 */
  warnings?: string[];
  /** 转换元数据 */
  metadata?: Record<string, any>;
}

/**
 * 字段转换器注册表
 */
export class FieldTransformerRegistry {
  private transformers: Map<string, FieldTransformer> = new Map();

  /**
   * 注册转换器
   */
  register(transformer: FieldTransformer): void {
    this.transformers.set(transformer.name, transformer);
  }

  /**
   * 获取转换器
   */
  get(name: string): FieldTransformer | null {
    return this.transformers.get(name) || null;
  }

  /**
   * 获取所有转换器
   */
  getAll(): FieldTransformer[] {
    return Array.from(this.transformers.values());
  }

  /**
   * 执行转换
   */
  transform(
    value: any,
    transformType: FieldTransformType,
    params?: Record<string, any>,
    context?: TransformContext
  ): TransformResult {
    const transformer = this.getTransformerByType(transformType);
    if (!transformer) {
      return {
        success: false,
        errors: [`Unknown transformer type: ${transformType}`]
      };
    }

    try {
      // 验证参数
      const paramValidation = transformer.validateParams(params);
      if (!paramValidation.isValid) {
        return {
          success: false,
          errors: paramValidation.errors
        };
      }

      // 执行转换
      const transformed = transformer.transform(value, params);

      return {
        success: true,
        data: transformed,
        metadata: {
          transformer: transformer.name,
          transformType,
          context
        }
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        metadata: {
          transformer: transformer.name,
          transformType,
          context
        }
      };
    }
  }

  /**
   * 根据类型获取转换器
   */
  private getTransformerByType(type: FieldTransformType): FieldTransformer | null {
    for (const transformer of this.transformers.values()) {
      if (transformer.type === type) {
        return transformer;
      }
    }
    return null;
  }
}

/**
 * 内置字段转换器
 */
export class BuiltinFieldTransformers {
  /**
   * 直接转换器
   */
  static DirectTransformer: FieldTransformer = {
    name: 'direct',
    type: 'direct',
    transform: (value: any) => value,
    validateParams: () => ({ isValid: true, errors: [] })
  };

  /**
   * 重命名转换器
   */
  static RenameTransformer: FieldTransformer = {
    name: 'rename',
    type: 'rename',
    transform: (value: any) => value,
    validateParams: () => ({ isValid: true, errors: [] })
  };

  /**
   * 枚举转换器
   */
  static EnumTransformer: FieldTransformer = {
    name: 'enum',
    type: 'enum',
    transform: (value: any, params?: { mapping: Record<string, any> }) => {
      if (!params?.mapping) {
        return value;
      }
      return params.mapping[value] ?? value;
    },
    validateParams: (params) => {
      const errors: string[] = [];
      if (!params?.mapping) {
        errors.push('Enum mapping is required');
      }
      return { isValid: errors.length === 0, errors };
    }
  };

  /**
   * 数组转换器
   */
  static ArrayTransformer: FieldTransformer = {
    name: 'array',
    type: 'array',
    transform: (value: any, params?: { itemTransform?: string; itemParams?: any }) => {
      if (!Array.isArray(value)) {
        return value;
      }

      if (!params?.itemTransform) {
        return value;
      }

      // 这里应该支持嵌套转换，简化实现
      return value;
    },
    validateParams: () => ({ isValid: true, errors: [] })
  };

  /**
   * 对象转换器
   */
  static ObjectTransformer: FieldTransformer = {
    name: 'object',
    type: 'object',
    transform: (value: any, params?: { fieldMappings?: FieldMapping[] }) => {
      if (typeof value !== 'object' || value === null) {
        return value;
      }

      if (!params?.fieldMappings) {
        return value;
      }

      // 这里应该支持嵌套字段映射，简化实现
      return value;
    },
    validateParams: () => ({ isValid: true, errors: [] })
  };

  /**
   * 条件转换器
   */
  static ConditionalTransformer: FieldTransformer = {
    name: 'conditional',
    type: 'conditional',
    transform: (value: any, params?: { condition: string; trueValue?: any; falseValue?: any }) => {
      if (!params?.condition) {
        return value;
      }

      try {
        // 简化的条件评估
        const condition = new Function('value', `return ${params.condition}`);
        const result = condition(value);
        return result ? params.trueValue : params.falseValue;
      } catch (error) {
        return value;
      }
    },
    validateParams: (params) => {
      const errors: string[] = [];
      if (!params?.condition) {
        errors.push('Condition is required');
      }
      return { isValid: errors.length === 0, errors };
    }
  };

  /**
   * 注册所有内置转换器
   */
  static registerAll(registry: FieldTransformerRegistry): void {
    registry.register(this.DirectTransformer);
    registry.register(this.RenameTransformer);
    registry.register(this.EnumTransformer);
    registry.register(this.ArrayTransformer);
    registry.register(this.ObjectTransformer);
    registry.register(this.ConditionalTransformer);
  }
}

/**
 * 默认转换器注册表
 */
export const defaultTransformerRegistry = new FieldTransformerRegistry();
BuiltinFieldTransformers.registerAll(defaultTransformerRegistry);