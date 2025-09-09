# 文件创建白名单系统规则范围说明

## 🎯 系统规则范围

这是一个**局部规则系统**，专门针对当前项目目录。规则的有效范围和应用方式如下：

## 📁 规则作用域

### 项目级局部规则
- **作用范围**: 仅在当前项目根目录下生效 (`/Users/fanzhang/Documents/github/rcc/`)
- **配置文件**: `.claude/file-allowlist.json` (相对于项目根目录)
- **相对路径**: 所有验证都基于项目根目录的相对路径

### 路径处理机制
```bash
# 示例：验证 /Users/fanzhang/Documents/github/rcc/src/test.ts
项目根目录: /Users/fanzhang/Documents/github/rcc/
文件绝对路径: /Users/fanzhang/Documents/github/rcc/src/test.ts
转换为相对路径: src/test.ts
在白名单中匹配: ✅ 匹配 directories 中的 "src/"

# 示例：验证 /tmp/test.ts (项目外文件)
项目根目录: /Users/fanzhang/Documents/github/rcc/
文件绝对路径: /tmp/test.ts
转换为相对路径: 无法转换 (不在项目目录内)
结果: ❌ 阻止创建 (因为不在项目目录内)
```

## 🏗️ 系统架构

### 本地化配置
```
项目根目录/
├── .claude/
│   ├── file-allowlist.json    # 项目特定规则 ✅ (局部)
│   ├── file-allowlist.txt     # 旧版规则 ✅ (局部)
│   └── scripts/
│       ├── file-allowlist-validator.sh  # 验证脚本
│       └── file-creation-hook.sh        # 钩子脚本
└── 其他项目文件...
```

### 全局钩子配置
```
用户主目录/
└── .claude/
    └── hooks.json             # 全局钩子配置 ⚠️ (全局引用)
```

钩子配置虽然在全局位置，但它**引用的是项目本地的脚本路径**：
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit|MultiEdit|Bash",
      "hooks": [{
        "type": "command",
        "command": "/Users/fanzhang/Documents/github/rcc/.claude/scripts/file-creation-hook.sh pre-tool-use \"$TOOL_NAME\" \"$TOOL_ARGS\" 2>&1 || exit 1"
      }]
    }]
  }
}
```

## 🔍 实际验证范围

### 1. 项目内文件操作 ✅ 受白名单控制
```bash
# 这些操作会被白名单验证控制
./file-allowlist-validator.sh validate src/test.ts      # ✅ 允许
./file-allowlist-validator.sh validate unauthorized.txt # ❌ 阻止
./file-allowlist-validator.sh validate tmp/temp.txt     # ✅ 允许 (临时目录)
```

### 2. 项目外文件操作 ⚠️ 部分受控
```bash
# 这些操作会在路径转换时被处理
./file-allowlist-validator.sh validate /tmp/test.ts     # ❌ 阻止 (因为不在项目内)
./file-allowlist-validator.sh validate ../../outside.txt # 取决于最终相对路径
```

### 3. 跨项目操作 ❌ 不受影响
```bash
# 在其他项目中使用时不受此白名单影响
cd /other/project && validate src/test.ts  # 使用该目录下的白名单
```

## 🎛️ 系统设计考量

### 为什么是局部规则？

1. **项目特定性**: 每个项目有不同的目录结构和文件需求
2. **版本控制**: 白名单可以与项目代码一起进行版本控制
3. **团队协作**: 团队成员共享相同的文件创建规则
4. **安全性**: 防止意外在项目目录外创建文件

### 钩子的全局引用原因

1. **工具架构**: Claude Code 钩子系统要求在用户主目录配置
2. **路径明确**: 明确引用具体项目脚本路径确保准确性
3. **多项目支持**: 可以为不同项目配置不同的钩子

## 🔄 多项目场景

### 单个项目使用
```
项目A/
├── .claude/file-allowlist.json  # 控制项目A的文件创建
└── src/
```

### 多个项目使用
```
项目A/
├── .claude/file-allowlist.json  # 项目A的规则
└── src/

项目B/
├── .claude/file-allowlist.json  # 项目B的规则 (可以不同)
└── src/

用户主目录/.claude/hooks.json     # 引用项目脚本 (需要为每个项目配置)
```

## ⚙️ 配置更新机制

### 当前项目配置
- 白名单文件: `/Users/fanzhang/Documents/github/rcc/.claude/file-allowlist.json`
- 验证脚本: `/Users/fanzhang/Documents/github/rcc/.claude/scripts/file-allowlist-validator.sh`
- 钩子脚本: `/Users/fanzhang/Documents/github/rcc/.claude/scripts/file-creation-hook.sh`

### 切换项目时的考虑
如果要在其他项目中使用相同规则：
1. 复制 `.claude/file-allowlist.json` 到新项目
2. 更新 `~/.claude/hooks.json` 中的脚本路径引用

## 🛡️ 安全边界

### 项目目录内防护 ✅ 完全控制
- 所有文件创建必须符合白名单规则
- 临时文件必须在指定目录 (`tmp/`)
- 路径遍历攻击被有效防护

### 项目目录外操作 ⚠️ 部分防护
- 超出项目目录的文件操作被阻止 (通过相对路径转换)
- 但仍需注意其他安全措施

### 跨目录操作 ❌ 不会越界
```bash
# 即使尝试访问上级目录也会被转换和控制
./file-allowlist-validator.sh validate ../../../etc/passwd
# 转换为相对路径后仍然被白名单规则阻止
```

## 📊 总结

| 方面 | 范围 | 说明 |
|------|------|------|
| **规则应用** | 局部 | 仅在项目目录内应用 |
| **配置文件** | 局部 | 白名单在项目内 .claude/ 目录 |
| **钩子配置** | 全局 | 钩子指向项目的具体脚本路径 |
| **验证范围** | 项目内 | 所有文件操作基于项目相对路径 |
| **跨项目影响** | 无 | 不影响其他项目的文件操作 |

这个设计提供了最佳的平衡：局部规则确保项目特定性，全局钩子引用确保工具集成，路径转换确保安全边界。