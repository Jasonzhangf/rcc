# RCC配置文件命名规范

## 1. 基本命名原则

### 1.1 通用原则
- 使用小写字母
- 使用连字符(-)分隔单词
- 使用描述性名称
- 避免使用特殊字符
- 文件名长度不超过50个字符

### 1.2 命名结构
```
{scope}-{module}-{type}-{purpose}.{extension}
```

## 2. 命名格式规范

### 2.1 静态配置文件命名
```
{module}-config.{extension}
{module}-{purpose}-config.{extension}
{module}-{version}-config.{extension}
```

示例：
- `pipeline-config.json`
- `server-default-config.json`
- `config-module-v2-config.json`

### 2.2 动态配置文件命名
```
{module}-runtime-{timestamp}.{extension}
{module}-generated-{purpose}.{extension}
{service}-state-{date}.{extension}
```

示例：
- `pipeline-runtime-20250914103045.json`
- `config-generated-routing.json`
- `server-state-2025-09-14.json`

### 2.3 用户配置文件命名
```
{module}-user-config.{extension}
{feature}-preferences.{extension}
{application}-settings.{extension}
```

示例：
- `pipeline-user-config.json`
- `routing-preferences.json`
- `rcc-settings.json`

## 3. 各类配置文件命名示例

### 3.1 模块配置文件
| 模块 | 静态配置 | 动态配置 | 用户配置 |
|------|----------|----------|----------|
| Pipeline | `pipeline-config.json` | `pipeline-runtime.json` | `pipeline-user-config.json` |
| Configuration | `config-defaults.json` | `config-generated-state.json` | `config-user-overrides.json` |
| Server | `server-base-config.json` | `server-runtime-status.json` | `server-user-settings.json` |

### 3.2 系统配置文件
| 类型 | 文件名 | 说明 |
|------|--------|------|
| 系统配置 | `system-config.json` | 系统级配置 |
| 环境配置 | `environment-config.json` | 环境特定配置 |
| 安全配置 | `security-config.json` | 安全相关配置 |
| 日志配置 | `logging-config.json` | 日志系统配置 |

### 3.3 服务配置文件
| 服务 | 静态配置 | 运行时配置 | 状态配置 |
|------|----------|------------|----------|
| HTTP Server | `http-server-config.json` | `http-server-runtime.json` | `http-server-status.json` |
| Database | `db-config.json` | `db-connection-pool.json` | `db-health-status.json` |
| Cache | `cache-config.json` | `cache-runtime-stats.json` | `cache-performance.json` |

## 4. 版本化配置文件命名

### 4.1 版本控制
```
{module}-config-v{major}.{minor}.{patch}.{extension}
{module}-{purpose}-config-{version}.{extension}
```

示例：
- `pipeline-config-v1.2.0.json`
- `server-routing-config-2025.9.json`

### 4.2 时间戳配置文件
```
{module}-{purpose}-{YYYYMMDD}.{extension}
{module}-{purpose}-{YYYY-MM-DD-HHMMSS}.{extension}
```

示例：
- `config-backup-20250914.json`
- `pipeline-state-2025-09-14-103045.json`

## 5. 特殊配置文件命名

### 5.1 模板文件
- `config-template.json`
- `{module}-template.json`
- `{feature}-template.json`

### 5.2 示例文件
- `config-example.json`
- `{module}-example.json`
- `{feature}-sample.json`

### 5.3 测试配置文件
- `config-test.json`
- `{module}-test-config.json`
- `{feature}-test-data.json`

## 6. 配置文件扩展名规范

### 6.1 主要扩展名
- `.json` - JSON格式配置文件（推荐）
- `.yaml` 或 `.yml` - YAML格式配置文件
- `.xml` - XML格式配置文件
- `.conf` - 传统配置文件格式

### 6.2 特殊扩展名
- `.template` - 模板文件
- `.example` - 示例文件
- `.backup` - 备份文件
- `.old` - 旧版本文件