# WHYLOG · ADR 决策工作台

WHYLOG 面向 AI 时代的高密度项目决策。它不替你拍板，而是让每条决策留下可复盘的 Why：问题、事实与假设、候选方案、排除理由、接受代价、验证方式、重审条件和真实结果。

## 立即运行

```bash
npm install
npm run dev
```

数据保存在当前浏览器；右上角「更多工具」可备份或导入完整 JSON 工作区，每条决策可单独导出 MADR Markdown。

## 验证

```bash
npm run test
npm run typecheck
npm run build
npm run test:e2e
```

## 决策工作流

1. Job 校验：先问这个决定要完成什么进步，是否值得做。
2. 置信度隔离：分别记录已知事实和待验证假设。
3. 方案比较：写出驱动、约束、候选方案和排除理由。
4. 接受代价：正向、负向和中性后果不能只写好处。
5. 重审条件：约定日期或会推翻选择的可观察变化。
6. 结果回填：到期后记录现实结果、证据、教训与下一次决策规则。
7. 产物追溯：连接 PRD → Requirements → Architecture → Spec → Code → Tests。
8. MADR 导出：下载到项目的 `docs/decisions/`，与代码一起进入 Git。

## 与原系统的关系

仓库原有的 `decisions/`、`index.json`、`LEDGER.md` 和 `patterns.md` 仍是个人纵向决策与回填数据，不被 Web 工作台自动覆盖。WHYLOG 是面向项目开发的高频决策入口。

## 技术边界

- React + TypeScript + Vite，静态运行，无后端依赖。
- localStorage 本地持久化，JSON 全量备份。
- MADR 4.0 兼容核心段落，附加 JTBD、置信度、重审、结果复盘和产物追溯段落。
- MVP 不含云同步、实时协作、账号与审批流。

产品约束见 [`docs/product-spec.md`](docs/product-spec.md)，本次架构选择见 [`docs/decisions/0001-build-whylog-as-local-first-workbench.md`](docs/decisions/0001-build-whylog-as-local-first-workbench.md)。
