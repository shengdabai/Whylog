# Decision Tracker Implementation Plan

> **状态：已替代（superseded）。** 本计划只记录 2026-05-25 prompt-only 原型的实施过程；绝对路径、skill 命令、文件结构和状态术语均为历史快照，不得用于修改当前 WHYLOG Web 工作台。当前执行约束见 [`../AGENTS.md`](../AGENTS.md)，产品规范见 [`product-spec.md`](product-spec.md)，替代决策见 [`decisions/0001-build-whylog-as-local-first-workbench.md`](decisions/0001-build-whylog-as-local-first-workbench.md)。
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 Claude Code skill `decision-tracker`,把一句话决策描述自动拆解成四层信息(原始信息/决策事实/假设推断/结果验证),生成 2 个 .md 文件 + 维护索引与行为模式库,并在记新决策时用历史教训主动拦截。

**Architecture:** 纯 prompt-based skill —— 逻辑全在 `~/.claude/skills/decision-tracker/SKILL.md` 的自然语言指令里,无代码运行时。数据是 `<data-dir>/` 下的 .md + .json 文件。验证方式不是单元测试,而是用真实样例喂给 skill 走端到端,检查产出的文件结构是否符合 spec。

**Tech Stack:** Claude Code Skill (SKILL.md frontmatter + Markdown 指令),Markdown 数据文件,JSON 索引。无编译、无 pytest。

---

## File Structure

**Skill 逻辑(`~/.claude/skills/decision-tracker/`):**
- `SKILL.md` —— 唯一逻辑文件。frontmatter(name/description/触发词)+ 三个动作的完整流程指令 + 文件模板。

**数据(`<data-dir>/`):**
- `README.md` —— 系统说明 + 哲学(给人看,也给 skill 读)
- `LEDGER.md` —— 人类可读索引,一行一决策
- `index.json` —— 机器可读索引
- `patterns.md` —— 行为模式库
- `decisions/YYYY-MM-DD-<标题>/01-原始信息.md` + `02-决策档案.md`

决策点:逻辑与数据分离 —— skill 全局可调,数据可在 Obsidian 浏览。所有文件路径在 SKILL.md 里写死绝对路径前缀 `<data-dir>/`,避免 skill 在其他工作目录下跑错位置。

---

### Task 1: 初始化数据目录骨架

**Files:**
- Create: `<data-dir>/README.md`
- Create: `<data-dir>/LEDGER.md`
- Create: `<data-dir>/index.json`
- Create: `<data-dir>/patterns.md`
- Create: `<data-dir>/decisions/.gitkeep`

- [ ] **Step 1: 创建 README.md**

写入系统说明,内容必须包含四层哲学和三个动作概述(供 skill 运行时读取理解上下文)。最小内容:

```markdown
# 决策跟踪系统

个人重大决策跟踪。AI 不缺智商,缺关于你的纵向数据。

## 四层信息(置信度隔离)
- 原始信息:决策人原话,**可能掺假**
- 决策事实:已发生动作,**确凿无疑**
- 假设推断:决策人 + AI 假设,**待验证**
- 结果验证:现实结果,**事后回填**

## 三个动作
- 记决策:一句话 → 2 文件 + 索引,记录时用历史模式拦截
- 回填:补结果验证层,累积行为模式
- 查询:检索历史做对比反问

数据自包含,可用 Obsidian 浏览。逻辑在 ~/.claude/skills/decision-tracker/。
```

- [ ] **Step 2: 创建空 LEDGER.md**

```markdown
# 决策台账(一行一决策,最新在上)

| 日期 | 标题 | 类型 | 状态 | 到期 | 核心教训 |
|------|------|------|------|------|----------|
```

- [ ] **Step 3: 创建空 index.json**

```json
{
  "decisions": []
}
```

- [ ] **Step 4: 创建 patterns.md 骨架**

```markdown
# 个人行为模式库(回填累积,记决策时用来拦你)

> 每条模式记录:首次发现、复现次数、典型触发、历史结果、拦截话术。

## 模式

_(暂无,首次回填后生成)_

## 规则库(回填沉淀的"未来怎么办")

_(暂无)_
```

- [ ] **Step 5: 验证目录结构**

Run: `ls -la <data-dir>/ && cat <data-dir>/index.json`
Expected: 4 个文件 + decisions/ 目录;index.json 输出 `{"decisions": []}`

- [ ] **Step 6: Commit(若用户已 git init)**

```bash
cd <data-dir> && git add -A && git commit -m "chore: scaffold decision tracker data directory"
```
若目录非 git 仓库,跳过此步(用户选择不入版本管理时)。

---

### Task 2: 写 SKILL.md frontmatter + 路径常量

**Files:**
- Create: `~/.claude/skills/decision-tracker/SKILL.md`

- [ ] **Step 1: 写 frontmatter + 系统常量段**

```markdown
---
name: decision-tracker
description: 记录和跟踪个人重大决策。当用户说"记决策"、"记个决策"、"决策跟踪"、"回填"、"decision",或描述一个刚做的/正在考虑的重大决策(创业/事业/财务/人生)并希望系统化记录与复盘时使用。自动四层拆解(原始信息/决策事实/假设推断/结果验证),生成 2 个文件,维护索引与行为模式库,并在记新决策时用历史教训主动拦截。
---

# Decision Tracker

## 系统常量(所有路径写死,不受当前工作目录影响)

- DATA_ROOT = `<data-dir>`
- 决策目录:`{DATA_ROOT}/decisions/{YYYY-MM-DD}-{标题}/`
- 两文件:`01-原始信息.md`、`02-决策档案.md`
- 索引:`{DATA_ROOT}/index.json`、`{DATA_ROOT}/LEDGER.md`
- 模式库:`{DATA_ROOT}/patterns.md`

进入本 skill 任何动作前,先 Read `{DATA_ROOT}/README.md` 与 `{DATA_ROOT}/patterns.md` 建立上下文。
```

- [ ] **Step 2: 验证 frontmatter 合法**

Run: `head -5 ~/.claude/skills/decision-tracker/SKILL.md`
Expected: 看到 `name: decision-tracker` 与 description。

- [ ] **Step 3: Commit**

```bash
cd ~/.claude/skills/decision-tracker && git add SKILL.md 2>/dev/null; echo "skill frontmatter done"
```

---

### Task 3: 写"动作 1 — 记决策"流程指令

**Files:**
- Modify: `~/.claude/skills/decision-tracker/SKILL.md`(追加章节)

- [ ] **Step 1: 追加记决策流程**

```markdown
## 动作 1:记决策

触发:用户描述一个决策,或说"记决策/记个决策"。

### 流程(默认全自动,零打断)

1. **读到期提醒**(见动作 2 的到期扫描),如有到期未回填的决策,先一行提醒,再继续记新决策。
2. **生成 decision_id** = `{今天 YYYY-MM-DD}-{6-12字标题}`。标题取决策核心动作。
3. **四层拆解**(只拆,不问):
   - 原始信息:逐字保留用户原话,**不改写**。逐条标性质(外部观察/二手转述/决策人假设)和置信度(高/中/低)。二手转述、对他人的主观判定 → 默认低置信度。
   - 决策事实:抽取已确定的动作和参数(日期/动作/数量/价格/成本/验证周期)。
   - 假设推断 - 决策人:用户话里隐含的假设。
   - 假设推断 - AI:判定决策类型(如 跟风型/规避损失型/沉没成本型/FOMO型/理性验证型 等),列风险点。
4. **主动拦截**(核心):读 `{DATA_ROOT}/index.json` + `patterns.md`,匹配:
   - 相同/相近 `type` 的历史决策
   - 命中的已知行为模式(patterns.md 里的模式名)
   如命中,**先停下来把历史教训甩给用户反问**(用 patterns.md 里的"拦截话术"或历史决策的核心教训),格式如:
   > ⚠️ 你 {历史日期} 也做过{type}决策({历史标题}),结果是{历史教训}。你能证明今天这个不是重蹈覆辙吗?
   等用户回应后再落盘。用户回应记入 02 文件的"决策人假设"或新增"拦截后补充"。
5. **仅在置信度真有歧义时反问**(否则不问):例如无法判断某条是事实还是用户推测,且影响置信度标注,才问 1 句。
6. **落盘**:按 Task 4 的模板写 `01-原始信息.md` 和 `02-决策档案.md`。
7. **更新索引**:按 Task 5 追加 index.json 条目、LEDGER.md 行。
8. **回报**:一句话告诉用户「已记录 {标题},到期 {review_due} 回填」。若有拦截,附上拦截结论。

### review_due 计算
- 用户说了周期(如"测7天")→ created + 周期。
- 没说 → 默认 created + 14 天,并在回报里标注"默认14天后回填,可改"。
```

- [ ] **Step 2: 验证章节完整**

Run: `grep -c "动作 1:记决策" ~/.claude/skills/decision-tracker/SKILL.md`
Expected: 1

- [ ] **Step 3: Commit**

```bash
echo "action 1 written"
```

---

### Task 4: 写文件模板(01 + 02)到 SKILL.md

**Files:**
- Modify: `~/.claude/skills/decision-tracker/SKILL.md`(追加模板章节)

- [ ] **Step 1: 追加两个文件模板**

```markdown
## 文件模板

### 01-原始信息.md

\`\`\`markdown
---
decision_id: {id}
created: {YYYY-MM-DD}
type: 原始信息
---

# 原始信息(可能掺假,谨慎采信)

## 决策人原话(逐字记录,不改写)
> {用户原话,逐字}

## 置信度标注
| 信息点 | 性质 | 置信度 | 备注 |
|--------|------|--------|------|
| {信息点} | 外部观察/二手转述/决策人假设 | 高/中/低 | {风险点} |
\`\`\`

### 02-决策档案.md

\`\`\`markdown
---
decision_id: {id}
created: {YYYY-MM-DD}
review_due: {YYYY-MM-DD}
status: 待验证
tags: [{标签}]
---

# 决策档案

## 一、决策事实(确凿无疑)
- 日期:{date}
- 决策:{动作}
- 参数:{数量/价格/成本}
- 验证周期:{周期}(到期 {review_due})

## 二、假设推断(待验证,非对错)
### 决策人的假设
- {假设}
### AI 的假设(可能与决策人分歧)
- 决策类型:{type}
- 风险:{风险}
- {若命中历史模式,引用 patterns.md 对应条目}

## 三、结果验证(到期回填,初始留空)
> _等待 {review_due} 回填_
\`\`\`
```

- [ ] **Step 2: 验证两个模板都在**

Run: `grep -c "01-原始信息.md\|02-决策档案.md" ~/.claude/skills/decision-tracker/SKILL.md`
Expected: ≥ 2

- [ ] **Step 3: Commit**

```bash
echo "templates written"
```

---

### Task 5: 写索引维护指令(index.json + LEDGER.md)

**Files:**
- Modify: `~/.claude/skills/decision-tracker/SKILL.md`(追加章节)

- [ ] **Step 1: 追加索引维护指令**

```markdown
## 索引维护(每次记决策/回填后执行)

### index.json
Read 现有 index.json,向 `decisions` 数组**追加/更新**该决策对象,然后 Write 回去(保持合法 JSON):

\`\`\`json
{
  "id": "{id}",
  "title": "{标题}",
  "created": "{YYYY-MM-DD}",
  "review_due": "{YYYY-MM-DD}",
  "status": "待验证",
  "type": "{决策类型}",
  "tags": ["..."],
  "summary_one_line": "{一句话摘要}",
  "lesson": null,
  "patterns_hit": ["{命中的模式名}"]
}
\`\`\`
回填时:更新同 id 对象的 `status` → "已回填"、填 `lesson`。

### LEDGER.md
在表格**第一行数据行(表头下)插入**一行(最新在上):
`| {日期} | {标题} | {类型} | {状态} | {到期} | {核心教训或"待回填"} |`
回填后更新对应行的状态和核心教训。

注意:用 Read + Edit/Write 维护这两个文件,不要用 Bash 的 sed/echo。
```

- [ ] **Step 2: 验证**

Run: `grep -c "索引维护" ~/.claude/skills/decision-tracker/SKILL.md`
Expected: 1

- [ ] **Step 3: Commit**

```bash
echo "index maintenance written"
```

---

### Task 6: 写"动作 2 — 回填"流程指令

**Files:**
- Modify: `~/.claude/skills/decision-tracker/SKILL.md`(追加章节)

- [ ] **Step 1: 追加回填流程 + 到期扫描**

```markdown
## 动作 2:回填(结果验证)

触发:用户说"回填 {决策} : {真实结果}",或进入 skill 时到期扫描命中。

### 到期扫描(进入任何动作前先做)
Read index.json,筛 `status == "待验证" && review_due <= 今天` 的决策。
如有,列一句提醒:
> 📋 有 {N} 个决策到期该回填了:{标题}(到期 {date})…

### 回填流程
1. 定位决策:按用户给的标题/id 匹配 index.json,找到 `decisions/{id}/02-决策档案.md`。
2. 改写"三、结果验证"层,补四块:
   - **主要偏差**:实际 vs 决策时假设的差距。
   - **核心教训**:一句话可复用的教训。
   - **暴露的个人模式**:这次暴露/印证了什么行为模式。
   - **未来规则**:下次遇到同类该遵守的规则。
3. 改 02 文件 frontmatter `status` → `已回填`。
4. **累积 patterns.md**(护城河):
   - 若"暴露的个人模式"是新模式 → 在 patterns.md 新增模式条目(首次发现/复现次数1/典型触发/历史结果/拦截话术)。
   - 若是已有模式 → 复现次数 +1,补历史结果。
   - "未来规则"追加到 patterns.md 规则库。
5. 更新 index.json(status、lesson)和 LEDGER.md 对应行。
6. 回报:一句话总结教训 + patterns.md 是否新增/强化了模式。

用 Read + Edit/Write 操作,不用 Bash 文本工具。
```

- [ ] **Step 2: 验证**

Run: `grep -c "动作 2:回填" ~/.claude/skills/decision-tracker/SKILL.md`
Expected: 1

- [ ] **Step 3: Commit**

```bash
echo "action 2 written"
```

---

### Task 7: 写"动作 3 — 查询/复盘"流程指令

**Files:**
- Modify: `~/.claude/skills/decision-tracker/SKILL.md`(追加章节)

- [ ] **Step 1: 追加查询流程**

```markdown
## 动作 3:查询/复盘(被动)

### 3a. 决策前对比反问
触发:"我想做 X,查查以前类似的"。
流程:读 index.json,按 type/tags/关键词匹配历史决策;读命中决策的 02 文件结果验证层;给出对比反问(历史结果 + 当前决策的风险提示)。不强行落盘,除非用户接着说"记下来"。

### 3b. 模式复盘
触发:"我有哪些反复犯的错"、"我的行为模式"。
流程:读 patterns.md,按复现次数排序汇总;关联 index.json 里命中各模式的决策列表。
```

- [ ] **Step 2: 验证整份 SKILL.md 章节齐全**

Run: `grep -c "动作 1\|动作 2\|动作 3\|文件模板\|索引维护" ~/.claude/skills/decision-tracker/SKILL.md`
Expected: ≥ 5

- [ ] **Step 3: Commit**

```bash
echo "action 3 written, SKILL.md complete"
```

---

### Task 8: 端到端验证(用真实样例,这是本计划的"测试")

**Files:**
- 临时:在一个**临时副本目录**跑,不污染真实数据(避免演示数据落盘)。

- [ ] **Step 1: 建临时数据副本**

```bash
cp -R <data-dir> /tmp/dt-test && ls /tmp/dt-test
```
Expected: README.md / LEDGER.md / index.json / patterns.md / decisions/

- [ ] **Step 2: 手动 dry-run 记决策(人工模拟 skill,验证模板可用)**

按 SKILL.md 的动作 1 流程,用脏脏包样例手写出 `/tmp/dt-test/decisions/2026-05-25-脏脏包测试/01-原始信息.md` 和 `02-决策档案.md`,以及更新 `/tmp/dt-test/index.json`。
检查:01 有逐字原话+置信度表;02 三层齐全且第三层留空;index.json 仍是合法 JSON。

Run: `cat /tmp/dt-test/index.json | python3 -m json.tool`
Expected: 合法 JSON 输出,含 1 个决策对象,status="待验证"。

- [ ] **Step 3: 验证两文件结构**

Run: `ls /tmp/dt-test/decisions/2026-05-25-脏脏包测试/ && grep -l "可能掺假" /tmp/dt-test/decisions/2026-05-25-脏脏包测试/01-原始信息.md && grep "待验证" /tmp/dt-test/decisions/2026-05-25-脏脏包测试/02-决策档案.md`
Expected: 两文件存在;01 含"可能掺假";02 含"待验证"。

- [ ] **Step 4: dry-run 回填,验证 patterns 累积**

按动作 2 流程,在临时副本里给脏脏包回填(实际只卖8个/天),补第三层四块,更新 patterns.md 新增"看见爆款想快速翻身"模式。

Run: `grep "看见爆款" /tmp/dt-test/patterns.md && python3 -c "import json; d=json.load(open('/tmp/dt-test/index.json')); print(d['decisions'][0]['status'])"`
Expected: patterns.md 含新模式;index.json 该决策 status="已回填"。

- [ ] **Step 5: 清理临时副本(演示数据不留)**

```bash
rm -rf /tmp/dt-test && echo "cleaned"
```
Expected: cleaned。真实 DATA_ROOT 保持空(只有骨架,无脏脏包)。

- [ ] **Step 6: Commit 验证完成**

```bash
echo "e2e dry-run passed, system ready for first real decision"
```

---

## Self-Review

**Spec coverage 检查:**
- 四层信息隔离 → Task 4 模板 ✓
- 2 文件 + 索引(B) → Task 1/4/5 ✓
- 默认全自动 + 真歧义才反问 → Task 3 step1.5 ✓
- 主动拦截(B) → Task 3 step4 ✓
- 回填 + 到期扫描(B,预留 C 的 review_due)→ Task 6 ✓
- patterns.md 累积闭环 → Task 6 step4 ✓
- 三个动作 → Task 3/6/7 ✓
- 演示数据不落盘 → Task 8 用 /tmp 副本 ✓
- 触发词 → Task 2 frontmatter ✓

无遗漏。

**Placeholder 扫描:** 模板里的 `{占位}` 是运行时变量,非计划占位符,合法。无 TBD/TODO。

**类型一致性:** index.json 字段(id/title/created/review_due/status/type/tags/summary_one_line/lesson/patterns_hit)在 Task 5 定义,Task 6/7/8 引用一致。status 值统一为 待验证/已回填/已放弃。文件名统一 01-原始信息.md / 02-决策档案.md。一致。
