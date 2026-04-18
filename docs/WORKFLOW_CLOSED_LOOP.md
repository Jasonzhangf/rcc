# Workflow Closed Loop

## 索引概要
- L1-L8 `purpose`：本文件是第一阶段总流程真源。
- L10-L21 `flow`：统一闭环顺序。
- L23-L39 `states`：任务状态与阶段门禁。
- L41-L55 `deliverables`：每一步必须产出的内容。
- L57-L68 `acceptance`：闭环完成判据。

## 目标
为 `rcc-core` 定义统一工作闭环，确保每一个阶段都按“先文档、再 skill、再实现、再测试”的顺序推进。

## 统一闭环顺序
1. **Define Docs**
   - 明确目标、范围、边界、完成标准。
2. **Define Skills**
   - 提炼可复用动作、触发信号、反模式、边界条件。
3. **Implement Minimum Slice**
   - 仅实现当前阶段所需的最小骨架或最小变更。
4. **Verify & Test**
   - 用脚本、测试、CI 或其他自动化方式验证闭环是否成立。
5. **Close With Evidence**
   - 用证据关闭当前阶段，再进入下一阶段。

## 状态流转
- `draft`
  - 任务已出现，但 docs 真源尚未锁定。
- `doc-defined`
  - docs 真源已明确，边界已写清。
- `skill-defined`
  - skill 已沉淀到本地，可复用动作已明确。
- `dev-ready`
  - 允许进入最小实现。
- `test-ready`
  - 已定义验证脚本/测试与验收标准。
- `closed-loop-done`
  - docs、skills、实现、验证都已完成并有证据。

### 阶段门禁
1. 未达到 `doc-defined`，不得进入实现。
2. 未达到 `skill-defined`，不得宣称流程已固化。
3. 未达到 `test-ready`，不得关闭当前阶段。
4. 只有 `closed-loop-done`，才允许开启下一阶段。

## 每一步必须产出的内容
### Docs
- 权威文档
- 边界定义
- 完成标准

### Skills
- 触发信号
- 标准动作
- 反模式
- 边界条件

### Development
- 当前阶段的最小实现或最小骨架
- 不扩 scope 的实现说明

### Test
- 自动化验证命令
- 验收标准
- 失败时的显式错误输出

## 闭环完成判据
1. docs 已落盘并成为真源。
2. skills 已落盘并与 docs 分工清晰。
3. 当前阶段的最小实现已完成。
4. 验证脚本/测试已通过。
5. 有明确证据说明下一阶段可以直接接续。
6. 若任一步缺失，则当前阶段仍处于进行中。
