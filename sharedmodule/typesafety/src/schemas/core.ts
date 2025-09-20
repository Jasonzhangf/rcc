import { z } from 'zod';

// ===== 基础类型验证模式 =====

/**
 * 字符串枚举验证器
 */
export function createEnumValidator<T extends string>(...values: T[]) {
  return z.enum(values as [T, ...T[]]);
}

/**
 * 宽松的对象键模式 - 允许字符串、数字和符号
 */
export const looseKeySchema = z.union([
  z.string(),
  z.number(),
  z.symbol()
]);

/**
 * 环境变量名称模式
 */
export const envVarNameSchema = z.string().regex(
  /^[A-Z_][A-Z0-9_]*$/,
  'Environment variable name must be uppercase with underscores only'
);

// ===== 核心配置模式 =====

/**
 * Package.json 模式
 */
export const packageJsonSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Version must follow semver format'),
  description: z.string().optional(),
  main: z.string().optional(),
  module: z.string().optional(),
  types: z.string().optional(),
  bin: z.union([z.string(), z.record(z.string())]).optional(),
  scripts: z.record(z.string()).optional(),
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
  optionalDependencies: z.record(z.string()).optional(),
  files: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  author: z.union([z.string(), z.object({
    name: z.string(),
    email: z.string().email().optional(),
    url: z.string().url().optional()
  })]).optional(),
  license: z.string().optional(),
  repository: z.object({
    type: z.enum(['git', 'svn']),
    url: z.string().url()
  }).optional(),
  bugs: z.union([z.string().url(), z.object({
    url: z.string().url().optional(),
    email: z.string().email().optional()
  })]).optional(),
  homepage: z.string().url().optional(),
  private: z.boolean().optional(),
  publishConfig: z.object({
    access: z.enum(['public', 'restricted']).optional(),
    registry: z.string().url().optional()
  }).optional(),
  engines: z.object({
    node: z.string().optional(),
    npm: z.string().optional()
  }).optional(),

  // RCC 特定配置
  rcc: z.object({
    modules: z.array(z.string()).optional(),
    providers: z.array(z.string()).optional(),
    features: z.array(z.string()).optional(),
    config: z.object({}).passthrough().optional()
  }).optional()
}).passthrough();

/**
 * TypeScript 配置模式
 */
export const tsconfigSchema = z.object({
  compilerOptions: z.object({
    target: z.enum(['es5', 'es6', 'es2015', 'es2016', 'es2017', 'es2018', 'es2019', 'es2020', 'es2021', 'es2022', 'esnext']).optional(),
    module: z.enum(['none', 'commonjs', 'amd', 'system', 'umd', 'es6', 'es2015', 'es2020', 'es2022', 'esnext']).optional(),
    lib: z.array(z.string()).optional(),
    allowJs: z.boolean().optional(),
    checkJs: z.boolean().optional(),
    jsx: z.enum(['preserve', 'react', 'react-jsx', 'react-jsxdev', 'react-native']).optional(),
    declaration: z.boolean().optional(),
    declarationMap: z.boolean().optional(),
    sourceMap: z.boolean().optional(),
    outFile: z.string().optional(),
    outDir: z.string().optional(),
    rootDir: z.string().optional(),
    composite: z.boolean().optional(),
    tsBuildInfoFile: z.string().optional(),
    removeComments: z.boolean().optional(),
    noEmit: z.boolean().optional(),
    importHelpers: z.boolean().optional(),
    downlevelIteration: z.boolean().optional(),
    isolatedModules: z.boolean().optional(),
    strict: z.boolean().optional(),
    noImplicitAny: z.boolean().optional(),
    strictNullChecks: z.boolean().optional(),
    strictFunctionTypes: z.boolean().optional(),
    strictBindCallApply: z.boolean().optional(),
    strictPropertyInitialization: z.boolean().optional(),
    noImplicitThis: z.boolean().optional(),
    alwaysStrict: z.boolean().optional(),
    noUnusedLocals: z.boolean().optional(),
    noUnusedParameters: z.boolean().optional(),
    noImplicitReturns: z.boolean().optional(),
    noFallthroughCasesInSwitch: z.boolean().optional(),
    moduleResolution: z.enum(['classic', 'node']).optional(),
    baseUrl: z.string().optional(),
    paths: z.record(z.array(z.string())).optional(),
    rootDirs: z.array(z.string()).optional(),
    typeRoots: z.array(z.string()).optional(),
    types: z.array(z.string()).optional(),
    allowSyntheticDefaultImports: z.boolean().optional(),
    esModuleInterop: z.boolean().optional(),
    preserveSymlinks: z.boolean().optional(),
    forceConsistentCasingInFileNames: z.boolean().optional(),
    skipLibCheck: z.boolean().optional(),
    experimentalDecorators: z.boolean().optional(),
    emitDecoratorMetadata: z.boolean().optional()
  }).passthrough().optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  files: z.array(z.string()).optional(),
  extends: z.string().optional()
}).passthrough();

/**
 * 文件路径模式
 */
export const filePathSchema = z.string().refine(
  (path) => {
    // 基本路径验证
    if (!path || path.length === 0) return false;

    // 检查路径字符有效性
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(path)) return false;

    // 不允许路径遍历
    if (path.includes('..')) return false;

    return true;
  },
  {
    message: 'Invalid file path format'
  }
);

/**
 * URL 模式
 */
export const urlSchema = z.string().url().refine(
  (url) => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  },
  {
    message: 'URL must use http, https, ws, or wss protocol'
  }
);

/**
 * 环境变量访问模式
 */
export const envAccessSchema = z.object({
  name: envVarNameSchema,
  required: z.boolean().optional(),
  default: z.string().optional(),
  description: z.string().optional()
});

/**
 * JSON 字符串模式 - 带验证
 */
export const jsonStringSchema = z.string().refine(
  (str) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  },
  {
    message: 'String must be valid JSON'
  }
);

/**
 * 安全配置模式
 */
export const securityConfigSchema = z.object({
  enabled: z.boolean(),
  apiKeyRequired: z.boolean().optional(),
  rateLimiting: z.object({
    enabled: z.boolean().optional(),
    windowMs: z.number().positive().optional(),
    maxRequests: z.number().positive().optional()
  }).optional(),
  cors: z.object({
    enabled: z.boolean().optional(),
    origins: z.array(z.string()).optional(),
    credentials: z.boolean().optional()
  }).optional()
}).passthrough();

// ===== 类型导出 =====
export type PackageJson = z.infer<typeof packageJsonSchema>;
export type TSConfig = z.infer<typeof tsconfigSchema>;
export type FilePath = z.infer<typeof filePathSchema>;
export type URL = z.infer<typeof urlSchema>;
export type EnvAccess = z.infer<typeof envAccessSchema>;
export type JSONString = z.infer<typeof jsonStringSchema>;
export type SecurityConfig = z.infer<typeof securityConfigSchema>;