import { z } from 'zod';

// JSON 解析选项
export interface JSONParseOptions {
  allowComments?: boolean;
  allowTrailingCommas?: boolean;
  allowUnquotedKeys?: boolean;
  maxDepth?: number;
  maxStringLength?: number;
  maxNumberPrecision?: number;
  maxArrayLength?: number;
  maxObjectProperties?: number;
}

// 环境变量访问选项
export interface EnvAccessOptions {
  default?: string;
  required?: boolean;
  pattern?: RegExp;
  enum?: string[];
  minLength?: number;
  maxLength?: number;
  validator?: (value: string) => boolean | string;
  description?: string;
  allowEmpty?: boolean;
}

// 类型转换选项
export interface TypeTransformOptions {
  default?: any;
  required?: boolean;
  description?: string;
}

// 动态导入选项
export interface DynamicImportOptions {
  pathValidation?: 'strict' | 'loose' | 'none';
  allowedExtensions?: string[];
  requiredExports?: string[];
  optionalExports?: string[];
  typeValidation?: 'strict' | 'loose' | 'none';
  securityLevel?: 'high' | 'medium' | 'low';
  cacheStrategy?: 'memory' | 'filesystem' | 'none';
  timeout?: number;
  maxRetries?: number;
  sandboxed?: boolean;
  allowedDependencies?: string[];
  blockedDependencies?: string[];
}

// 转换规则
export interface TransformRule {
  name: string;
  pattern: RegExp | string;
  replacement: string | ((match: string, ...groups: string[]) => string);
  description?: string;
  priority?: number;
  fileTypes?: string[];
  once?: boolean;
  validator?: (match: string, groups: string[]) => boolean;
}

// 转换选项
export interface TransformOptions {
  encoding?: BufferEncoding;
  recursive?: boolean;
  fileTypes?: string[];
  excludePatterns?: RegExp[];
  createBackup?: boolean;
  preserveOriginal?: boolean;
  concurrency?: number;
  outputDir?: string | null;
  verbose?: boolean;
}

// 转换结果
export interface TransformResult {
  originalPath: string;
  outputPath?: string;
  success: boolean;
  error?: Error;
  appliedRules: string[];
  changes: {
    additions: number;
    deletions: number;
    modifications: number;
  };
  duration: number;
  linesProcessed: number;
}

// Zod 类型导出
export type PackageJson = z.infer<typeof import('../schemas/core.js').packageJsonSchema>;
export type TSConfig = z.infer<typeof import('../schemas/core.js').tsconfigSchema>;
export type RCCConfig = z.infer<typeof import('../schemas/config.js').rccConfigSchema>;
export type ProviderConfig = z.infer<typeof import('../schemas/config.js').providerConfigSchema>;
export type DynamicRoutingConfig = z.infer<typeof import('../schemas/config.js').dynamicRoutingConfigSchema>;
export type BaseModuleConfig = z.infer<typeof import('../schemas/module.js').baseModuleConfigSchema>;

// 错误类型
export type {
  JSONParseError,
  JSONValidationError
} from '../validators/safeJson.js';

export type {
  EnvAccessError,
  EnvValidationError
} from '../validators/envValidator.js';

export type {
  DynamicImportError,
  ImportValidationError,
  ModuleSecurityError
} from '../validators/dynamicImport.js';

export type {
  CodeTransformError
} from '../migration/codeTransformer.js';