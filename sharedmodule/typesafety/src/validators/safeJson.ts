import { z, ZodError } from 'zod';

/**
 * JSON 解析错误类型
 */
export class JSONParseError extends Error {
  constructor(
    message: string,
    public readonly input: string,
    public readonly position?: number,
    public readonly line?: number,
    public readonly column?: number
  ) {
    super(message);
    this.name = 'JSONParseError';
  }
}

/**
 * JSON 验证错误类型
 */
export class JSONValidationError extends Error {
  constructor(
    message: string,
    public readonly input: any,
    public readonly errors: ZodError['errors'],
    public readonly schema?: z.ZodType
  ) {
    super(message);
    this.name = 'JSONValidationError';
  }
}

/**
 * JSON 解析选项
 */
export interface JSONParseOptions {
  /**
   * 是否允许注释
   */
  allowComments?: boolean;

  /**
   * 是否允许尾随逗号
   */
  allowTrailingCommas?: boolean;

  /**
   * 是否允许未引用的属性名
   */
  allowUnquotedKeys?: boolean;

  /**
   * 递归深度限制
   */
  maxDepth?: number;

  /**
   * 字符串长度限制
   */
  maxStringLength?: number;

  /**
   * 数字精度限制
   */
  maxNumberPrecision?: number;

  /**
   * 数组长度限制
   */
  maxArrayLength?: number;

  /**
   * 对象属性数量限制
   */
  maxObjectProperties?: number;
}

/**
 * 安全的 JSON 解析器
 */
export class SafeJSON {
  private static readonly DEFAULT_OPTIONS: Required<JSONParseOptions> = {
    allowComments: false,
    allowTrailingCommas: false,
    allowUnquotedKeys: false,
    maxDepth: 100,
    maxStringLength: 10 * 1024 * 1024, // 10MB
    maxNumberPrecision: 15,
    maxArrayLength: 10000,
    maxObjectProperties: 1000
  };

  /**
   * 安全的 JSON 解析
   */
  static parse<T = any>(
    text: string,
    options: JSONParseOptions = {}
  ): T {
    const fullOptions = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      // 预处理 JSON 字符串
      let processedText = text;

      if (fullOptions.allowComments) {
        processedText = this.removeComments(processedText);
      }

      if (fullOptions.allowTrailingCommas) {
        processedText = this.removeTrailingCommas(processedText);
      }

      if (fullOptions.allowUnquotedKeys) {
        processedText = this.quoteKeys(processedText);
      }

      // 基础安全检查
      this.performSecurityChecks(processedText, fullOptions);

      // 解析 JSON
      const result = JSON.parse(processedText);

      // 深度安全检查
      this.validateStructure(result, fullOptions);

      return result as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        // 提取错误位置信息
        const position = this.extractErrorPosition(error);
        throw new JSONParseError(
          `Invalid JSON: ${error.message}`,
          text,
          position?.position,
          position?.line,
          position?.column
        );
      } else if (error instanceof JSONParseError) {
        throw error;
      } else {
        throw new JSONParseError(
          `JSON parse failed: ${error instanceof Error ? error.message : String(error)}`,
          text
        );
      }
    }
  }

  /**
   * 安全的 JSON 解析并验证
   */
  static parseAndValidate<T>(
    text: string,
    schema: z.ZodType<T>,
    options: JSONParseOptions = {}
  ): T {
    // 第一步：解析 JSON
    const parsed = this.parse(text, options);

    // 第二步：验证 Schema
    try {
      return schema.parse(parsed);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new JSONValidationError(
          `JSON validation failed: ${error.errors.map(e => e.message).join(', ')}`,
          parsed,
          error.errors,
          schema
        );
      }
      throw error;
    }
  }

  /**
   * 从文件安全解析 JSON
   */
  static async parseFromFile<T = any>(
    filePath: string,
    options: JSONParseOptions = {}
  ): Promise<T> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    return this.parse<T>(content, options);
  }

  /**
   * 从文件安全解析并验证 JSON
   */
  static async parseAndValidateFromFile<T>(
    filePath: string,
    schema: z.ZodType<T>,
    options: JSONParseOptions = {}
  ): Promise<T> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    return this.parseAndValidate(content, schema, options);
  }

  /**
   * 安全的 JSON 字符串化
   */
  static stringify<T = any>(
    value: T,
    replacer?: (this: any, key: string, value: any) => any,
    space?: string | number
  ): string {
    try {
      // 预先检查循环引用
      this.detectCircularReferences(value);

      return JSON.stringify(value, replacer, space);
    } catch (error) {
      throw new JSONParseError(
        `JSON stringify failed: ${error instanceof Error ? error.message : String(error)}`,
        value
      );
    }
  }

  // ===== 私有工具方法 =====

  private static removeComments(text: string): string {
    // 移除单行注释
    text = text.replace(/\/\/.*$/gm, '');

    // 移除多行注释
    text = text.replace(/\/\*[\s\S]*?\*\//g, '');

    return text;
  }

  private static removeTrailingCommas(text: string): string {
    // 移除对象中的尾随逗号
    text = text.replace(/,(\s*[}\]])/g, '$1');

    return text;
  }

  private static quoteKeys(text: string): string {
    // 为未引用的对象键添加引号
    text = text.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

    return text;
  }

  private static performSecurityChecks(text: string, options: Required<JSONParseOptions>): void {
    // 检查字符串长度
    if (text.length > options.maxStringLength) {
      throw new JSONParseError(
        `JSON string too long: ${text.length} > ${options.maxStringLength}`,
        text
      );
    }

    // 检查潜在的危险模式
    const dangerousPatterns = [
      /__proto__\s*:/,
      /constructor\s*:/,
      /prototype\s*:/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(text)) {
        throw new JSONParseError(
          `Dangerous property name detected: ${pattern.source}`,
          text
        );
      }
    }
  }

  private static validateStructure(data: any, options: Required<JSONParseOptions>, depth: number = 0): void {
    // 检查深度限制
    if (depth > options.maxDepth) {
      throw new JSONParseError(
        `JSON depth exceeds limit: ${depth} > ${options.maxDepth}`,
        data
      );
    }

    if (Array.isArray(data)) {
      // 检查数组长度
      if (data.length > options.maxArrayLength) {
        throw new JSONParseError(
          `Array length exceeds limit: ${data.length} > ${options.maxArrayLength}`,
          data
        );
      }

      // 递归检查数组元素
      for (const item of data) {
        this.validateStructure(item, options, depth + 1);
      }
    } else if (data !== null && typeof data === 'object') {
      // 检查对象属性数量
      const propertyCount = Object.keys(data).length;
      if (propertyCount > options.maxObjectProperties) {
        throw new JSONParseError(
          `Object property count exceeds limit: ${propertyCount} > ${options.maxObjectProperties}`,
          data
        );
      }

      // 检查属性名长度
      for (const key of Object.keys(data)) {
        if (typeof key === 'string' && key.length > 100) {
          throw new JSONParseError(
            `Property name too long: ${key.length} > 100`,
            data
          );
        }
      }

      // 递归检查对象属性
      for (const value of Object.values(data)) {
        this.validateStructure(value, options, depth + 1);
      }
    } else if (typeof data === 'string') {
      // 检查字符串长度
      if (data.length > options.maxStringLength) {
        throw new JSONParseError(
          `String length exceeds limit: ${data.length} > ${options.maxStringLength}`,
          data
        );
      }
    } else if (typeof data === 'number') {
      // 检查数字精度
      if (Math.abs(data) > Math.pow(10, options.maxNumberPrecision)) {
        throw new JSONParseError(
          `Number precision exceeds limit: ${data}`,
          data
        );
      }
    }
  }

  private static extractErrorPosition(error: SyntaxError): { position?: number; line?: number; column?: number } | null {
    const message = error.message;

    // 尝试从错误消息中提取位置信息
    const lineMatch = message.match(/position (\d+)/);
    if (lineMatch) {
      const position = parseInt(lineMatch[1]);
      return { position };
    }

    return null;
  }

  private static detectCircularReferences(obj: any, seen = new WeakSet()): void {
    if (obj === null || typeof obj !== 'object') {
      return;
    }

    if (seen.has(obj)) {
      throw new JSONParseError('Circular reference detected', obj);
    }

    seen.add(obj);

    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.detectCircularReferences(item, seen);
      }
    } else {
      for (const value of Object.values(obj)) {
        this.detectCircularReferences(value, seen);
      }
    }

    seen.delete(obj);
  }
}

/**
 * JSON Schema 验证器
 */
export class JSONSchemaValidator {
  private static instance: JSONSchemaValidator;
  private ajv: any;

  private constructor() {}

  static async getInstance(): Promise<JSONSchemaValidator> {
    if (!this.instance) {
      this.instance = new JSONSchemaValidator();
      await this.instance.initialize();
    }
    return this.instance;
  }

  private async initialize(): Promise<void> {
    try {
      const Ajv = (await import('ajv')).default;
      this.ajv = new Ajv({
        allErrors: true,
        verbose: true,
        strict: false
      });
    } catch (error) {
      throw new Error(`Failed to initialize JSON Schema validator: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validate(data: any, schema: any): { valid: boolean; errors: any[] } {
    if (!this.ajv) {
      throw new Error('JSON Schema validator not initialized');
    }

    const validate = this.ajv.compile(schema);
    const valid = validate(data);

    return {
      valid,
      errors: validate.errors || []
    };
  }
}

/**
 * 配置验证器
 */
export class ConfigValidator {
  /**
   * 验证配置文件
   */
  static async validateConfigFile<T>(
    filePath: string,
    schema: z.ZodType<T>,
    options: JSONParseOptions = {}
  ): Promise<{
    valid: boolean;
    data?: T;
    errors: Array<{
      path: string;
      message: string;
      code?: string;
    }>;
    warnings: Array<{
      path: string;
      message: string;
      suggestion?: string;
    }>;
  }> {
    try {
      // 读取并解析配置文件
      const data = await SafeJSON.parseAndValidateFromFile(filePath, schema, options);

      return {
        valid: true,
        data,
        errors: [],
        warnings: []
      };
    } catch (error) {
      const errors = [];
      const warnings = [];

      if (error instanceof JSONValidationError) {
        // 处理 Zod 验证错误
        errors.push(...error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        })));
      } else if (error instanceof JSONParseError) {
        // 处理 JSON 解析错误
        errors.push({
          path: '',
          message: error.message,
          code: 'PARSE_ERROR'
        });
      } else {
        // 处理其他错误
        errors.push({
          path: '',
          message: error instanceof Error ? error.message : String(error),
          code: 'UNKNOWN_ERROR'
        });
      }

      return {
        valid: false,
        errors,
        warnings
      };
    }
  }
}