# 测试与 CI 路由

## 索引概要
- L1-L7 `scope`：本路由适用的任务。
- L9-L18 `stack`：第一阶段验证栈。
- L20-L27 `acceptance`：验收与证据要求。
- L29-L32 `ci`：CI 自动化入口。

## 覆盖范围
适用于：第一阶段文档/skills/路由闭环的验证，以及后续阶段沿用的测试与 CI 主路径定义。

## 第一阶段验证栈
1. 文件存在性检查：AGENTS、routing docs、权威 docs、skills、脚本。
2. 结构检查：routing 文档都含“索引概要”；skills 含触发信号/动作/反模式/边界。
3. 引用链检查：AGENTS → routing → docs/skills → 下一阶段示例。
4. 自动化验证入口：`python3 scripts/verify_phase1_foundation.py`。

## 验收要求
1. 验证脚本必须零错误退出。
2. 验收结果必须能指出缺失文件或结构问题。
3. 报告完成时必须附带运行命令与输出摘要。
4. 无自动化验证证据，不得关闭第一阶段任务。

## CI 自动化
- GitHub Actions 入口：`.github/workflows/phase1-foundation.yml`
- CI 与本地共用同一验证脚本，避免双真源。
