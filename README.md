# WHYLOG

WHYLOG 是一个本地优先的 React + TypeScript ADR/MADR 工作台。它帮助独立创造者记录关键选择背后的 Why，并让结果复盘产生的未来规则回到下一次决策入口。

## 核心闭环

1. 用 Job to Be Done 判断决定是否值得进入工程。
2. 分开记录事实与假设，再比较候选方案、约束、收益、代价和风险。
3. 写明选择理由、执行确认方法、固定重审日期与条件触发器。
4. 到期后回填现实结果、证据、核心教训和未来规则。
5. 在规则库与相关规则提示中复用历史经验，并导出 MADR Markdown 或完整 JSON 备份。

## 本地运行

要求 Node.js `^20.19.0` 或 `>=22.12.0`。

```bash
npm ci
npm run dev
```

交付前验证：

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## 代码结构

- `src/App.tsx`：工作区状态、搜索、导入导出、保存、导航与撤销。
- `src/components/`：决策台账、规则库、编辑器、质量栏和 Markdown 预览。
- `src/lib/decision.ts`：默认值、到期判断与 v1 数据归一化。
- `src/lib/learning.ts`：只读派生规则、相关规则排序与深层 Why 搜索。
- `src/lib/storage.ts`：浏览器 `localStorage` 读取与保存。
- `tests/browser.spec.ts`：浏览器用户路径、移动端与 WCAG A/AA 回归。

## 数据边界

- 数据默认保存在当前浏览器的 `whylog.workspace.v1`。
- 用户可导出 JSON 备份或 MADR Markdown；应用不会自动改写仓库历史台账。
- 当前不包含账号、云同步、遥测、外部数据库或多人审批流。
- `Workspace.schemaVersion` 保持为 `1`，直到显式迁移器和回滚测试就位。

## 文档状态

- 当前产品规范：[docs/product-spec.md](docs/product-spec.md)
- 当前架构决策：[docs/decisions/0001-build-whylog-as-local-first-workbench.md](docs/decisions/0001-build-whylog-as-local-first-workbench.md)
- `docs/2026-05-25-decision-tracker-design.md` 与 `docs/2026-05-25-decision-tracker-plan.md` 是已被替代的 prompt-only 原型历史快照，不作为当前实现指令。
