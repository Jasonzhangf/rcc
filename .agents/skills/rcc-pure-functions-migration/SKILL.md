---
name: rcc-pure-functions-migration
description: rcc-core 的纯函数迁移 skill。用于把旧仓无 I/O 的 parser/codec/schema/validator 迁入 rcc-core-domain，并用 Rust 单测收口。
---

# RCC Pure Functions Migration

> 默认继承全局 `coding-principals` 的通用开发方法；本 skill 只补充 rcc-core 的 pure-functions 迁移约束。

## Trigger Signals
- 进入 Phase 03 pure-functions 迁移。
- 需要把旧 TS 纯函数逻辑迁入 `rcc-core-domain`。
- 需要判断某段旧逻辑是否满足“无 I/O、可纯迁”的条件。

## Standard Actions
1. 先确认旧逻辑无网络、无文件、无进程副作用。
2. 确认目标 crate 为 `rcc-core-domain`。
3. 若旧逻辑依赖 native helper，先抽最小共享纯 helper 到 domain，再迁主函数；不要把 native wrapper 一起搬进来。
4. 只迁纯函数本体，不连带迁移外围业务壳。
5. 若某个 helper 已被多个 block/filter 复用，优先迁共享 helper 本体，而不是在目标模块复制一份局部实现。
6. 若目标是 parser/coercion 切片，只迁最小 guard / parse helper / alias normalize，不连带迁移执行器本体。
7. 若目标来自 filter/block 的协议归一逻辑，先下沉 pure invariant helper，再保留外层薄壳编排。
8. 若旧文件是 registry/dispatcher 混合体，只抽共享 guard/helper 真源；总 switch、validator 调度与 payload normalize 壳继续留在外层。
9. 若 filter 文件混有日志/env 读取/工具注入壳，只下沉其中的 protocol shape extractor / detector；日志与注入策略保持外层。
10. 若旧模块是大型 normalizer/validator 流程，优先先拆 recognizer / candidate guard 这类前置纯切片，不一次迁完整 normalize 管线。
11. 若 servertool 文件同时包含 metadata attach/read 与 signal detector，只迁 detector 本体；metadata bridge 保留在 block/servertool 壳。
12. 若目标是 followup/message trim 逻辑，必须保持 tool-call/tool-response 邻接与 user anchor，不可只按条数硬裁剪。
13. 若旧文件混有纯解析与外部系统动作（bd/fs/spawn），只下沉 parser/normalizer，本地系统动作壳保持外层。
14. 若目标是 marker lifecycle/marker strip，优先只迁 text/content/messages 三层纯清洗，不把 request/record bridge 一起带入 domain。
15. 若 router 与 servertool 重复同一 stop-message state normalize/max-repeats/snapshot 语义，优先把 shared codec 真源下沉 domain；state create/clear/patch 壳继续留在外层。
16. 若 router feature-support helper 同时承担 latest message / message text / keyword / media signal 判定，可整体下沉为一个纯 helper 模块；request feature 聚合壳继续留在 router 外层。
17. 若 parser 模块里夹带被 sibling 复用的 content-text/unknown-text 提取 helper，优先先拆共享 helper 真源；parser 自身只保留解析职责。
18. 若 router feature-support helper 同时承担 tool 声明检测、assistant tool_call 分类与 shell-like command 读写搜索判定，可整体下沉为一个纯 helper 模块；feature 聚合壳继续留在 router 外层。
19. 若旧 TS helper 依赖 regex lookahead/lookbehind，Rust `regex` 不支持时不要硬翻；改成等价纯 helper，并用单测锁住行为。
20. 若目标涉及 shell wrapper（如 `bash -lc` / `sh -c` / `zsh -c`），剥壳后要继续去掉外层配对引号，否则命令分类会失真。
21. 若目标是 router 的 weighted/scoring/config-resolve 纯数学 helper，可整体下沉 domain；profile resolve、pool 选择与重试策略壳继续留在 router/block 外层。
22. 若目标包含 advisor/classifier 且旧实现依赖外部 profile lookup callback，应把 callback 结果改写成显式输入数据；同时保留“lookup 失败/缺失时回退默认值”的旧语义，不把 callback 壳搬进 domain。
23. 若目标包含 decay / half-life / penalty 计算，先锁定默认值、非法值回退、时间衰减公式与 clamp 边界，再写实现；不要在 domain 里夹带 quota/pool/router 语义。
24. 若目标是 router/servertool 的薄 state codec，只下沉字段级 trim / finite guard / merge 语义；parser、action、store patch 与 default resolve 壳继续留在外层。
25. 若目标是 routing/message clean helper，只允许改写 string user content；非 user 或非 string content 必须原样透传，清洗后为空的 user message 才可删除。
26. 若目标是 native-backed codec 的外层 fallback/merge，只下沉 native 之外仍可纯表达的字段 normalize / patch apply / state ensure 语义；native capability/binding 壳继续留在外层。
27. 若 parser 文件同时依赖 env/default resolver 与 body token 读取，只下沉 quoted-token reader / closing-quote scan / comma split 本体；resolver 与指令装配壳继续留外层。
28. 若 parser 外层仍依赖 resolver/env，但内部存在 directive classify / keyword dispatch / token-to-kind 纯语义，优先继续拆这层纯分类 helper，下游装配壳保持外层。
29. 若 native/parser 外层已经产出 instruction array，而后续只做 clear 切片、keyword flag detect 这类数组级纯处理，应继续下沉为 instruction-array preprocess helper，native parse 壳留外层。
30. 若 normalizer 文件同时混有 native payload normalize 壳与前置纯 helper，优先只迁递归 markup detect / transport-noise strip 这类前置纯语义；native payload patch 壳继续留在 conversion/router 外层。
31. 若 servertool handler 同时被 engine / auto-followup / ai-followup 多处复用，且本体只做文本清洗，应优先把 marker/time-tag/image-placeholder strip 与 blank-line 折叠下沉 domain；编排壳继续留在 servertool。
32. 若 request-builder 文件同时包含 responses rebuild / injection 编排壳与 request-seed helper，优先只迁 model fallback resolve、top-level parameter extract、parameter normalize、tool filter 这类纯 helper；bridge/injection 壳继续留在 servertool。
33. 若 request-builder 剩余逻辑只做 tool output 文本压缩，需保持 stringification 规则、maxChars clamp、head/tail 比例与“仅 tool role 改写”的边界；不要把 followup payload build 一并带入 domain。
34. 用最小 Rust module 表达同一语义。
35. 先补 Rust 单测，再跑 phase3 验证脚本。
36. 若行为有分支，优先用测试覆盖分支而不是口头说明。

## Acceptance Gate
- 迁移逻辑确属纯函数。
- 不依赖 provider/host/servertool。
- Rust 单测覆盖主要分支。
- phase3 验证脚本通过。

## Anti-Patterns
- 把旧 TS 包装层一起搬进来。
- 在 domain crate 里引入 I/O。
- 只迁 happy path，不补分支测试。
- 迁移一个函数却顺手扩 scope 到整个模块。

## Boundaries
- 本 skill 只负责 pure-functions 迁移，不负责 block/orchestrator 迁移。
- 若逻辑不再是纯函数，应回到 block 迁移阶段，不放入 domain。

## Sources Of Truth
- `docs/agent-routing/60-pure-functions-routing.md`
- `docs/CRATE_BOUNDARIES.md`
- `docs/RUST_WORKSPACE_ARCHITECTURE.md`
