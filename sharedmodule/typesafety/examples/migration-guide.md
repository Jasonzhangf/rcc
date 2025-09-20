# RCC TypeSafety 模块 - JavaScript 到 TypeScript 迁移指南

## 🎯 概述

本指南帮助你将现有的 JavaScript 项目迁移到安全的 TypeScript，使用 RCC TypeSafety 框架提供的工具。

## 📋 迁移前的准备

### 1. 安装 TypeSafety 模块

```bash
npm install rcc-typesafety
```

### 2. 分析现有代码

使用代码分析工具检查你的 JavaScript 代码中的 JSON.parse() 使用情况：

```bash
# 查找所有 JSON.parse 调用
grep -r "JSON.parse" src/

# 查找环境变量使用
grep -r "process.env" src/

# 查找动态导入
find src/ -name "*.js" -exec grep -l "require\|import" {} \;
```

## 🔧 迁移步骤

### 步骤 1: JSON 解析安全化

**问题代码:**
```javascript
// ❌ 不安全的 JSON 解析
const config = JSON.parse(fs.readFileSync('./config.json'));
const data = JSON.parse(response.body);
const pkg = JSON.parse(node.fetchPackageJson());
```

**迁移方案:**
```typescript
// ✅ 安全的 JSON 解析
import { SafeJSON } from 'rcc-typesafety';
import { packageJsonSchema, rccConfigSchema } from 'rcc-typesafety/schemas';

// 基础安全解析
const config = SafeJSON.parse<ConfigType>(fs.readFileSync('./config.json', 'utf-8'));

// 带 Schema 验证的解析
const pkg = SafeJSON.parseAndValidate(
  node.fetchPackageJson(),
  packageJsonSchema
);

// 从文件直接解析并验证
const rccConfig = await SafeJSON.parseAndValidateFromFile(
  './rcc-config.json',
  rccConfigSchema
);
```

### 步骤 2: 环境变量安全化

**问题代码:**
```javascript
// ❌ 不安全的环境变量访问
const port = process.env.PORT || 3000;
const apiKey = process.env.API_KEY; // 可能为 undefined
const debug = process.env.DEBUG === 'true';
const timeout = parseInt(process.env.TIMEOUT);
```

**迁移方案:**
```typescript
// ✅ 安全的环境变量访问
import { SafeEnv } from 'rcc-typesafety';

const env = new SafeEnv('RCC_');

// 带默认值和验证
const port = env.getNumber('PORT', {
  default: 3000,
  min: 1024,
  max: 65535
});

// 必需的环境变量
const apiKey = env.getString('API_KEY', { required: true });

// 自动类型转换
const debug = env.getBoolean('DEBUG');

// JSON 环境变量
const config = env.getJSON<ConfigType>('APP_CONFIG');

// 枚举验证
const environment = env.getEnum('ENV', ['development', 'staging', 'production']);

// 批量验证
const { missing, invalid, valid } = env.validateRequired([
  'API_KEY', 'DATABASE_URL', 'SECRET_KEY'
]);
```

### 步骤 3: 动态导入安全化

**问题代码:**
```javascript
// ❌ 不安全的动态导入
const modulePath = `./providers/${providerName}.js`;
const Provider = require(modulePath);

// 或者
const Module = await import(config.modulePath);
```

**迁移方案:**
```typescript
// ✅ 安全的动态导入
import { SafeDynamicImport } from 'rcc-typesafety';

const safeImport = SafeDynamicImport.getInstance();

// 安全导入并验证导出
const provider = await safeImport.import<ProviderType>(
  `./providers/${providerName}.js`,
  {
    requiredExports: ['initialize', 'processRequest'],
    securityLevel: 'medium',
    pathValidation: 'strict'
  }
);

// 批量导入
const modules = await safeImport.importBatch({
  core: './core/module.js',
  utils: './utils/helpers.js',
  config: './config/loader.js'
});

// 验证模块安全性
const validation = await safeImport.validateModule('./suspicious/module.js', {
  securityLevel: 'high',
  allowedExtensions: ['.js', '.mjs'],
  timeout: 5000
});

if (!validation.valid) {
  console.error('Module validation failed:', validation.errors);
}
```

### 步骤 4: 配置文件验证

**问题代码:**
```javascript
// ❌ 无验证的配置加载
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
```

**迁移方案:**
```typescript
// ✅ 带验证的配置管理
import { ConfigValidator } from 'rcc-typesafety';
import { rccConfigSchema, packageJsonSchema } from 'rcc-typesafety/schemas';

// 验证 RCC 配置
const configValidation = await ConfigValidator.validateConfigFile(
  './rcc-config.json',
  rccConfigSchema
);

if (!configValidation.valid) {
  console.error('Configuration errors:', configValidation.errors);
  console.warn('Configuration warnings:', configValidation.warnings);
}

// 验证 package.json
const packageValidation = await ConfigValidator.validateConfigFile(
  './package.json',
  packageJsonSchema
);
```

### 步骤 5: 代码转换自动化

**自动转换 JavaScript 到 TypeScript:**

```typescript
import { JS2TSTransformer, JSONParseMigrator } from 'rcc-typesafety';

const transformer = new JS2TSTransformer();

// 添加自定义转换规则
transformer.addRule({
  name: 'custom-api-types',
  pattern: /api\.request\(([^)]+)\)/g,
  replacement: 'api.request<$1>($1)',
  description: 'Add type parameters to API calls',
  priority: 5,
  fileTypes: ['.js', '.mjs']
});

// 转换单个文件
const result = await transformer.transformFile('./src/server.js', {
  createBackup: true,
  verbose: true
});

if (result.success) {
  console.log(`✅ Transformed: ${result.originalPath} -> ${result.outputPath}`);
  console.log(`📊 Changes: +${result.changes.additions} -${result.changes.deletions} ~${result.changes.modifications}`);
  console.log(`🔧 Applied rules: ${result.appliedRules.join(', ')}`);
}

// 批量转换目录
const results = await transformer.transformDirectory('./src', {
  recursive: true,
  fileTypes: ['.js', '.mjs'],
  excludePatterns: [/node_modules/, /test/, /\.min\.js$/],
  concurrency: 5
});

// 自动迁移 JSON.parse 调用
const { content, migrations } = JSONParseMigrator.migrateJSONParseCalls(sourceCode, {
  addTypeAssertions: true,
  defaultType: 'any'
});

migrations.forEach(migration => {
  console.log(`Line ${migration.line}: ${migration.original} -> ${migration.migrated}`);
});
```

### 步骤 6: 类型声明生成

```typescript
// 生成类型声明文件
await transformer.generateTypeDefinitions('./src/index.ts', {
  outputPath: './src/index.d.ts',
  useAny: true,
  strict: false
});

// 为配置对象生成类型
import { TypeDeclarationGenerator } from 'rcc-typesafety';

const configTypes = TypeDeclarationGenerator.generateConfigTypes(sampleConfig, {
  interfaceName: 'RCCConfig',
  useEnums: true,
  strict: true
});

await fs.writeFile('./types/config.d.ts', configTypes);
```

## 📊 配置模式示例

### package.json Schema

```typescript
import { packageJsonSchema } from 'rcc-typesafety/schemas';

const packageJson = {
  name: 'rcc-typesafety',
  version: '0.1.0',
  description: 'RCC TypeScript Type Safety and JSON Validation Framework',
  main: 'dist/index.js',
  module: 'dist/index.js',
  types: 'dist/index.d.ts',
  scripts: {
    build: 'rollup -c',
    test: 'jest'
  },
  dependencies: {
    'zod': '^3.22.4',
    'uuid': '^9.0.1'
  },
  rcc: {
    modules: ['typesafety'],
    providers: ['core'],
    features: ['json-validation', 'env-access', 'dynamic-import']
  }
};

// 验证 package.json
const validPackage = SafeJSON.parseAndValidate(
  JSON.stringify(packageJson),
  packageJsonSchema
);
```

### RCC 配置 Schema

```typescript
import { rccConfigSchema } from 'rcc-typesafety/schemas';

const rccConfig = {
  version: '1.0.0',
  name: 'RCCApplication',
  environment: 'development',

  server: {
    port: 5506,
    host: '0.0.0.0',
    cors: {
      enabled: true,
      origins: ['http://localhost:3000'],
      credentials: true
    }
  },

  providers: {
    openai: {
      id: 'openai',
      name: 'OpenAI',
      type: 'openai',
      enabled: true,
      endpoint: 'https://api.openai.com/v1',
      auth: {
        type: 'apikey',
        keys: ['sk-...']
      }
    }
  },

  virtualModels: {
    'gpt-proxy': {
      id: 'gpt-proxy',
      name: 'GPT Proxy',
      enabled: true,
      model: 'gpt-3.5-turbo',
      targets: [
        {
          providerId: 'openai',
          modelId: 'gpt-3.5-turbo',
          priority: 1
        }
      ]
    }
  },

  debug: {
    enabled: true,
    level: 'info',
    output: 'console',
    performance: {
      enabled: true,
      trackMemory: true
    }
  }
};

const validConfig = SafeJSON.parseAndValidate(
  JSON.stringify(rccConfig),
  rccConfigSchema
);
```

## 🔧 高级用法

### 自定义 Schema 验证

```typescript
import { z } from 'zod';

// 创建自定义 Schema
const customSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  enabled: z.boolean(),
  config: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional()
});

// 使用 SafeJSON 验证
try {
  const result = SafeJSON.parseAndValidate(jsonString, customSchema);
  console.log('✅ Validation passed:', result);
} catch (error) {
  if (error instanceof JSONValidationError) {
    console.error('❌ Validation errors:', error.errors);
  }
}
```

### 自定义环境变量处理器

```typescript
const safeEnv = new SafeEnv('MYAPP_');

// 自定义验证器
const emailValidator = (value: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) || 'Invalid email format';
};

// 使用自定义验证
const email = safeEnv.get(' ADMIN_EMAIL', {
  validator: emailValidator,
  required: true,
  description: 'Administrator email address'
});

// 复杂类型转换
interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

const dbConfig = safeEnv.getJSON<DatabaseConfig>('DATABASE_CONFIG', {
  required: true,
  validator: (value) => {
    const required = ['host', 'port', 'username', 'database'];
    const obj = JSON.parse(value);
    const missing = required.filter(key => !obj[key]);
    return missing.length === 0 || `Missing required fields: ${missing.join(', ')}`;
  }
});
```

### 模块化安全检查配置

```typescript
// 创建专用的安全检查配置
const importConfig = {
  securityLevel: 'high',
  allowedExtensions: ['.js', '.ts', '.mjs'],
  sandboxed: true,
  timeout: 10000,
  maxRetries: 3,
  allowedDependencies: [
    'lodash',
    'axios',
    'debug',
    'rcc-basemodule',
    'rcc-errorhandling'
  ],
  blockedDependencies: [
    'eval',
    'vm2',
    'dangerous-package'
  ],
  requiredExports: ['initialize', 'cleanup']
};

// 验证模块
const validation = await safeImport.validateModule('./modules/provider.js', importConfig);

if (validation.valid) {
  console.log('✅ Module passed all security checks');
  const module = await safeImport.import('./modules/provider.js', importConfig);
} else {
  console.error('❌ Module validation failed:', validation.errors);
  if (validation.warnings.length > 0) {
    console.warn('⚠️  Warnings:', validation.warnings);
  }
}
```

## 📈 性能优化

### 1. 缓存配置

```typescript
const importConfig = {
  cacheStrategy: 'memory',        // 内存缓存导入结果
  maxCacheSize: 100,              // 最大缓存条目数
  cacheTTL: 300000               // 缓存时间 5分钟
};

// 导入结果将被缓存
const module = await safeImport.import('./heavy/module.js', importConfig);

// 后续导入将使用缓存
const cachedModule = await safeImport.import('./heavy/module.js', importConfig);
```

### 2. 并行处理

```typescript
// 批量并行转换
const results = await transformer.transformBatch(files, {
  concurrency: 10,                // 并行处理 10 个文件
  outputDir: './converted',
  createBackup: false             // 提高性能，禁用备份
});

// 批量并行验证
const validationPromises = files.map(file =>
  ConfigValidator.validateConfigFile(file, schema)
);

const validationResults = await Promise.allSettled(validationPromises);
```

### 3. 延迟加载

```typescript
// 创建延迟加载的模块池
const modulePool = {
  core: () => safeImport.import('./core/module.js', importConfig),
  utils: () => safeImport.import('./utils/module.js', importConfig),
  providers: () => safeImport.import('./providers/module.js', importConfig)
};

// 按需加载
const coreModule = await modulePool.core();
```

## 🚨 常见错误和解决方案

### 1. JSON 解析错误

```typescript
// ❌ 错误：普通 JSON.parse 没有验证
try {
  const data = JSON.parse(untrustedInput);
} catch (error) {
  // 只能捕获语法错误，无法验证结构
}
```

```typescript
// ✅ 正确：使用 SafeJSON
import { SafeJSON, JSONValidationError } from 'rcc-typesafety';
import { mySchema } from './schemas';

try {
  const data = SafeJSON.parseAndValidate(untrustedInput, mySchema);
} catch (error) {
  if (error instanceof JSONValidationError) {
    console.error('Validation details:', error.errors);
  } else if (error instanceof JSONParseError) {
    console.error('Parse error position:', error.position);
  }
}
```

### 2. 环境变量访问错误

```typescript
// ❌ 错误：直接访问可能为 undefined
const apiKey = process.env.API_KEY;
connectToService(apiKey); // 可能传入 undefined
```

```typescript
// ✅ 正确：使用 SafeEnv
const apiKey = env.getString('API_KEY', { required: true });
// 或者提供优雅降级
const apiKey = env.getString('API_KEY', {
  default: 'default-key',
  required: false
});
```

### 3. 动态导入安全问题

```typescript
// ❌ 危险：用户输入直接进入导入路径
const modulePath = `./providers/${userInput}.js`;
const module = await import(modulePath);
```

```typescript
// ✅ 安全：使用 SafeDynamicImport
const safeImport = SafeDynamicImport.getInstance();

// 白名单验证
const ALLOWED_PROVIDERS = ['openai', 'anthropic', 'google'];
if (!ALLOWED_PROVIDERS.includes(userInput)) {
  throw new Error('Invalid provider');
}

const module = await safeImport.import(
  `./providers/${userInput}.js`,
  {
    pathValidation: 'strict',
    securityLevel: 'high',
    requiredExports: ['initialize']
  }
);
```

## 🔍 调试和监控

### 访问日志

```typescript
// 环境变量访问分析
const stats = env.getAccessStats();
console.log('Environment access statistics:', {
  totalAccesses: stats.totalAccesses,
  missingVariables: stats.missingVariables,
  sensitiveAccesses: stats.sensitiveAccesses
});

// 敏感变量检测
const sensitiveAccesses = env.getAccessLog()
  .filter(entry => entry.sensitive)
  .map(entry => entry.varName);

console.log('Accessed sensitive variables:', sensitiveAccesses);
```

### 导入统计

```typescript
const importStats = safeImport.getImportStats();

Object.entries(importStats).forEach(([modulePath, stats]) => {
  console.log(`Module ${modulePath}:`, {
    successRate: stats.success / (stats.success + stats.failed),
    lastError: stats.lastError
  });
});
```

### 配置验证报告

```typescript
const validationReport = {
  timestamp: new Date().toISOString(),
  configurations: []
};

const configFiles = ['package.json', 'tsconfig.json', 'rcc-config.json'];

for (const configFile of configFiles) {
  try {
    const result = await ConfigValidator.validateConfigFile(
      configFile,
      getSchemaForFile(configFile)
    );

    validationReport.configurations.push({
      file: configFile,
      valid: result.valid,
      errors: result.errors.length,
      warnings: result.warnings.length
    });
  } catch (error) {
    validationReport.configurations.push({
      file: configFile,
      valid: false,
      errors: 1,
      warnings: 0,
      errorDetails: error.message
    });
  }
}

console.log('Configuration validation report:', validationReport);
```

## 🎉 完成迁移

迁移完成后，你的代码将具备以下特性：

1. **类型安全**: 所有配置和外部输入都有正确的 TypeScript 类型
2. **运行时验证**: 使用 Zod Schema 验证所有数据结构
3. **安全环境访问**: 环境变量访问提供默认值和验证
4. **安全动态导入**: 模块导入经过路径验证和安全检查
5. **错误可追踪**: 详细的错误信息帮助快速定位问题
6. **性能优化**: 缓存和并行处理提升迁移效率

### 验证迁移结果

```typescript
// 运行完整的类型安全检查
import { TypeSafetyManager } from 'rcc-typesafety';

const manager = TypeSafetyManager.getInstance();

// 验证配置
await manager.validateConfigFile('./rcc-config.json', rccConfigSchema);

// 验证环境变量
const envCheck = manager.getEnvironmentVariable('RCC_ENV', {
  required: true,
  enum: ['development', 'staging', 'production']
});

// 验证关键模块
const coreModules = [
  './src/core/index.ts',
  './src/providers/index.ts',
  './src/server/index.ts'
];

const moduleValidations = await Promise.all(
  coreModules.map(module => manager.importModule(module))
);

console.log('Migration validation completed successfully!');
```

## 📚 更多资源

- [Zod 文档](https://zod.dev/)
- [TypeScript 配置](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
- [Node.js 安全最佳实践](https://nodejs.org/en/docs/guides/security/)
- [RCC 项目文档](./README.md)

---

**恭喜！** 🎉 你已成功将 JavaScript 项目迁移到了类型安全的 TypeScript，并获得了一整套验证、安全和错误处理功能。这个框架将帮助你维护更高质量的代码，减少运行时错误，并提升开发体验。