WHYLOG 是一个本地优先的 React + TypeScript ADR 工作台，目标是记录决策理由、代价、重审条件与真实结果。

## Prerequisites

- 使用 Node.js `^20.19.0` 或 `>=22.12.0`。
- 首次运行执行 `npm ci`。
- 首次执行浏览器测试前运行 `npx playwright install chromium`。

## Build and run

- 开发服务器：`npm run dev`
- 生产构建：`npm run build`
- 本地预览：`npm run preview`

## Test

- 类型检查：`npm run typecheck`
- 单元测试：`npm test`
- 浏览器回归：`npm run test:e2e`
- 交付前按顺序执行：`npm run typecheck && npm test && npm run build && npm run test:e2e`

测试失败时先读取首个失败断言和 Playwright trace；修复根因后重跑完整命令。保持全部断言启用，并让原超时阈值下的测试通过。

## Architecture

- `src/App.tsx`：工作区状态、筛选、导入导出、保存与撤销交互。
- `src/components/`：决策台账、编辑器、质量栏和 Markdown 预览。
- `src/lib/decision.ts`：默认值、编号、到期判断与旧数据归一化。
- `src/lib/learning.ts`：从已完成复盘派生规则库、相关规则和深层 Why 搜索；保持只读且不扩展 schema。
- `src/lib/storage.ts`：`localStorage` 读取、解析和保存；存储键为 `whylog.workspace.v1`。
- `src/lib/madr.ts`：MADR Markdown 与安全文件名生成。
- `src/lib/quality.ts`：记录完整度检查，不判断决策本身是否正确。
- `tests/browser.spec.ts`：真实浏览器中的核心用户路径与 WCAG A/AA 扫描。

## Repository expectations

- 保持 `Workspace.schemaVersion` 为 `1`，直到实现显式迁移器和回滚测试。
- 新增 `DecisionRecord` 字段时，同时更新默认值、`normalizeDecisionRecord`、导入兼容测试和 MADR 输出判断。
- 保存以当前浏览器为边界；账号、云同步、遥测和外部数据库属于 MVP 范围外。
- 仓库中的历史台账文件只接受用户明确发起的写入；Web 工作区通过用户操作导出 JSON 或 Markdown。
- 删除操作必须保留可见撤销路径；导入文件上限保持为 5 MB，除非同时增加性能与内存回归证据。
- 交互控件必须有可访问名称；移动端关键操作目标不小于 44 × 44 CSS 像素。
- Git 提交只包含源码、测试与文档；排除 `dist/`、`test-results/`、`playwright-report/` 和浏览器本地数据。

## Product workflow

每条完整决策应覆盖：Job 校验 → 事实与假设 → 方案比较 → 选择理由 → 接受代价 → 重审条件 → 结果回填 → 未来规则回流。最终选择属于用户；质量分数只暴露记录缺口。
