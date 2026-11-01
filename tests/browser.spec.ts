import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createBlankDecision, createExampleDecision } from '../src/lib/decision'

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map((violation) => (
    `${violation.id} @ ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`
  ))).toEqual([])
}

function completeOutcomeReview(decision: ReturnType<typeof createExampleDecision>) {
  decision.outcomeReview = {
    verdict: 'partial',
    reviewedAt: '2026-08-20',
    actualOutcome: '核心目标达成，但恢复入口不够明显。',
    evidence: ['完成 12 次真实恢复演练'],
    lessons: '恢复路径必须和记录路径同样明显。',
    futureRule: '每次迁移前先验证恢复路径。',
  }
  return decision
}

test('creates a complete example, persists it, and exports MADR', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /别让代码记住 What/ })).toBeVisible()

  await page.getByRole('button', { name: '先看完整示例' }).click()
  await expect(page.getByLabel('决策标题')).toHaveValue('使用本地优先方式构建 ADR 工作台')
  await expect(page.getByText('可以采纳')).toBeVisible()
  await expect(page.getByText('100', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /Markdown/ }).click()
  await expect(page.getByText('MADR 4.0 compatible')).toBeVisible()
  await expect(page.locator('pre')).toContainText('## Context and Problem Statement')
  await expect(page.locator('pre')).toContainText('Chosen option: "本地优先的 Web 工作台"')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载 .md' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('0001-使用本地优先方式构建-adr-工作台.md')

  await page.reload()
  await expect(page.getByText('使用本地优先方式构建 ADR 工作台', { exact: true }).first()).toBeVisible()
})

test('edits a new decision and restores it after reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '写第一条 ADR' }).click()
  const title = page.getByLabel('决策标题')
  await title.fill('选择本地搜索索引')
  await page.getByLabel('决策状态').selectOption('accepted')
  await page.reload()
  await expect(page.getByLabel('决策标题')).toHaveValue('选择本地搜索索引')
  await expect(page.getByLabel('决策状态')).toHaveValue('accepted')
})

test('opens a newly selected decision at the document top', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '先看完整示例' }).click()
  await page.getByLabel('未来规则').scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: '新建决策' }).click()
  await expect(page.getByLabel('决策标题')).toBeInViewport()
  const titleBox = await page.getByLabel('决策标题').boundingBox()
  expect(titleBox?.y).toBeLessThan(220)
})

test('keeps the mobile ledger visible on initial restore', async ({ page }) => {
  const restored = createExampleDecision()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript((workspace) => localStorage.setItem('whylog.workspace.v1', JSON.stringify(workspace)), {
    schemaVersion: 1,
    decisions: [restored],
    activeId: restored.id,
  })
  await page.goto('/')
  await expect(page.getByLabel('搜索决策')).toBeInViewport()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

test('persists record navigation across reload', async ({ page }) => {
  const first = createBlankDecision(1)
  const second = createBlankDecision(2)
  second.title = '刷新后仍然选中我'
  await page.addInitScript((workspace) => {
    if (sessionStorage.getItem('whylog.navigation-seeded')) return
    localStorage.setItem('whylog.workspace.v1', JSON.stringify(workspace))
    sessionStorage.setItem('whylog.navigation-seeded', 'yes')
  }, { schemaVersion: 1, decisions: [first, second], activeId: first.id })
  await page.goto('/')
  await page.getByText(second.title, { exact: true }).click()
  await expect.poll(() => page.evaluate(() => (
    JSON.parse(localStorage.getItem('whylog.workspace.v1') ?? '{}').activeId
  ))).toBe(second.id)
  await page.reload()
  await expect(page.getByLabel('决策标题')).toHaveValue(second.title)
})

test('backs up and preserves old v1 data until the user edits', async ({ page }) => {
  const oldDecision = createExampleDecision()
  const oldShape = structuredClone(oldDecision) as Partial<typeof oldDecision>
  delete oldShape.outcomeReview
  const raw = JSON.stringify({ schemaVersion: 1, decisions: [oldShape], activeId: oldDecision.id })
  await page.addInitScript((seed) => {
    if (sessionStorage.getItem('whylog.seeded')) return
    localStorage.setItem('whylog.workspace.v1', seed)
    sessionStorage.setItem('whylog.seeded', 'yes')
  }, raw)

  await page.goto('/')
  await expect(page.getByLabel('决策标题')).toHaveValue(oldDecision.title)
  await page.waitForTimeout(350)
  expect(await page.evaluate(() => localStorage.getItem('whylog.workspace.v1'))).toBe(raw)
  expect(await page.evaluate(() => localStorage.getItem('whylog.workspace.v1.pre-normalize'))).toBe(raw)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(await page.evaluate(() => localStorage.getItem('whylog.workspace.v1'))).toBe(raw)

  await page.getByLabel('决策标题').fill('用户确认迁移后的标题')
  await expect.poll(() => page.evaluate(() => (
    JSON.parse(localStorage.getItem('whylog.workspace.v1') ?? '{}').decisions?.[0]?.outcomeReview?.verdict
  ))).toBe('pending')
})

test('mobile layout keeps critical actions and avoids horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: '先看完整示例' }).click()
  await expect(page.getByLabel('决策标题')).toBeVisible()
  await expect(page.getByRole('button', { name: /导出 MADR/ })).toBeVisible()
  const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1)
})

test('surfaces due reviews and exports the recorded outcome', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '先看完整示例' }).click()
  await page.getByLabel('固定重审日期').fill('2020-01-01')
  await page.reload()
  await page.getByRole('button', { name: '待复盘' }).click()
  await expect(page.getByText('复盘到期')).toBeVisible()
  await page.getByLabel('复盘结论').selectOption('partial')
  await page.getByLabel('实际发生了什么？').fill('核心目标达成，但备份路径仍需优化。')
  await page.getByRole('textbox', { name: '结果证据第 1 项' }).fill('完成 12 次真实检索')
  await page.getByLabel('核心教训').fill('恢复路径必须和记录路径同样明显。')
  await page.getByLabel('未来规则').fill('每次迁移前先验证恢复路径。')
  await expect(page.getByText('没有匹配的决策')).toBeVisible()
  await page.getByRole('button', { name: /Markdown/ }).click()
  await expect(page.locator('pre')).toContainText('## Outcome Review')
  await expect(page.locator('pre')).toContainText('完成 12 次真实检索')
})

test('returns completed review rules to later decisions and deep search', async ({ page }) => {
  const source = completeOutcomeReview(createExampleDecision())
  const next = createBlankDecision(2)
  next.title = '选择下一代本地存储方案'
  next.project = source.project
  next.tags = ['local-first']
  await page.addInitScript((workspace) => localStorage.setItem('whylog.workspace.v1', JSON.stringify(workspace)), {
    schemaVersion: 1,
    decisions: [next, source],
    activeId: next.id,
  })

  await page.goto('/')
  await expect(page.getByText('相关过往规则')).toBeVisible()
  const relatedRule = page.getByRole('button', { name: /每次迁移前先验证恢复路径/ })
  await expect(relatedRule).toContainText(source.id)
  await relatedRule.click()
  await expect(page.getByLabel('决策标题')).toHaveValue(source.title)

  await page.getByLabel('搜索决策').fill('恢复路径必须')
  await expect(page.getByText(source.title, { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: '规则 1' }).click()
  await expect(page.getByRole('button', { name: `打开规则来源 ${source.id}` })).toContainText('每次迁移前先验证恢复路径。')
  await page.getByLabel('搜索规则').fill('12 次真实恢复演练')
  await expect(page.getByRole('button', { name: `打开规则来源 ${source.id}` })).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await expectNoA11yViolations(page)
  const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1)
})

test('derives the rule-library empty state after deletion and restores it with undo', async ({ page }) => {
  const source = completeOutcomeReview(createExampleDecision())
  await page.addInitScript((workspace) => localStorage.setItem('whylog.workspace.v1', JSON.stringify(workspace)), {
    schemaVersion: 1,
    decisions: [source],
    activeId: source.id,
  })

  await page.goto('/')
  await page.getByRole('button', { name: '规则 1' }).click()
  await expect(page.getByRole('button', { name: `打开规则来源 ${source.id}` })).toContainText(source.outcomeReview.futureRule)
  await page.getByRole('button', { name: '删除', exact: true }).click()
  await page.getByRole('button', { name: '再次点击确认' }).click()
  await expect(page.getByRole('button', { name: '规则 0' })).toBeVisible()
  await expect(page.getByText('规则库等待第一次复盘')).toBeVisible()
  await page.getByRole('button', { name: '撤销', exact: true }).click()
  await expect(page.getByRole('button', { name: '规则 1' })).toBeVisible()
  await expect(page.getByRole('button', { name: `打开规则来源 ${source.id}` })).toContainText(source.outcomeReview.futureRule)
})

test('keeps delete undo available while navigating through a learned rule', async ({ page }) => {
  const source = completeOutcomeReview(createExampleDecision())
  source.id = 'ADR-0002'
  const deleted = createBlankDecision(1)
  deleted.title = '待删除记录'
  const other = createBlankDecision(3)
  other.title = '保留记录'
  other.project = source.project
  await page.addInitScript((workspace) => localStorage.setItem('whylog.workspace.v1', JSON.stringify(workspace)), {
    schemaVersion: 1,
    decisions: [deleted, source, other],
    activeId: deleted.id,
  })

  await page.goto('/')
  await page.getByRole('button', { name: '删除', exact: true }).click()
  await page.getByRole('button', { name: '再次点击确认' }).click()
  await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeVisible()
  await page.getByText('保留记录', { exact: true }).click()
  await page.getByRole('button', { name: /每次迁移前先验证恢复路径/ }).click()
  await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '撤销', exact: true }).click()
  await expect(page.getByLabel('决策标题')).toHaveValue('待删除记录')
})

test('restores an accidentally deleted decision', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '先看完整示例' }).click()
  await page.getByRole('button', { name: '删除', exact: true }).click()
  await page.getByRole('button', { name: '再次点击确认' }).click()
  await expect(page.getByText('ADR-0001 已从本地台账删除')).toBeVisible()
  const undo = page.getByRole('button', { name: '撤销' })
  await expect(undo).toBeFocused()
  await undo.click()
  await expect(page.getByLabel('决策标题')).toHaveValue('使用本地优先方式构建 ADR 工作台')
})

test('undoes a full-workspace import', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '先看完整示例' }).click()
  await page.waitForFunction(() => localStorage.getItem('whylog.workspace.v1') !== null)
  const imported = await page.evaluate(() => {
    const workspace = JSON.parse(localStorage.getItem('whylog.workspace.v1') ?? '{}')
    workspace.decisions[0].title = '来自旧备份的标题'
    return JSON.stringify(workspace)
  })
  await page.getByLabel('导入 WHYLOG JSON 工作区').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(imported),
  })
  await expect(page.getByLabel('决策标题')).toHaveValue('来自旧备份的标题')
  await page.getByRole('button', { name: '撤销导入' }).click()
  await expect(page.getByLabel('决策标题')).toHaveValue('使用本地优先方式构建 ADR 工作台')

  await page.getByLabel('导入 WHYLOG JSON 工作区').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(imported),
  })
  await page.getByLabel('决策标题').fill('导入后继续产生的新工作')
  await expect(page.getByRole('button', { name: '撤销导入' })).toHaveCount(0)
})

test('restores the protected error state and downloads raw data before reset', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('whylog.workspace.v1', '{broken-json'))
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('本地数据无法读取')
  await expectNoA11yViolations(page)

  const recovery = JSON.stringify({ schemaVersion: 1, decisions: [createExampleDecision()], activeId: 'ADR-0001' })
  await page.getByLabel('导入 WHYLOG JSON 工作区').setInputFiles({
    name: 'recovery.json',
    mimeType: 'application/json',
    buffer: Buffer.from(recovery),
  })
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('whylog.workspace.v1') ?? '{}').decisions?.[0]?.title
    } catch {
      return null
    }
  })).toBe('使用本地优先方式构建 ADR 工作台')
  await page.getByRole('button', { name: '撤销导入' }).click()
  await expect(page.getByRole('alert')).toContainText('本地数据无法读取')
  expect(await page.evaluate(() => localStorage.getItem('whylog.workspace.v1'))).toBe('{broken-json')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '用空工作区重新开始' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^whylog-recovery-\d{4}-\d{2}-\d{2}\.json$/)
})

test('has no detectable WCAG A/AA accessibility violations', async ({ page }) => {
  await page.goto('/')
  await expectNoA11yViolations(page)

  await page.getByRole('button', { name: '先看完整示例' }).click()
  await expectNoA11yViolations(page)
  await page.getByLabel('更多工具').click()
  await expectNoA11yViolations(page)
  await page.getByLabel('更多工具').click()
  await page.getByRole('button', { name: '删除', exact: true }).click()
  await page.getByRole('button', { name: '再次点击确认' }).click()
  await expectNoA11yViolations(page)
  await page.getByRole('button', { name: '撤销', exact: true }).click()
  await page.getByRole('button', { name: /Markdown/ }).click()
  await expectNoA11yViolations(page)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: /推演/ }).click()
  await page.getByText('高级信息：参与者与产物追溯').click()
  await expectNoA11yViolations(page)
  const undersized = await page.locator('button:visible, select:visible, input[type="date"]:visible, summary:visible, a:visible').evaluateAll((controls) => controls
    .map((control) => {
      const rect = control.getBoundingClientRect()
      return { name: control.getAttribute('aria-label') || control.textContent?.trim(), width: rect.width, height: rect.height }
    })
    .filter(({ width, height }) => width < 44 || height < 44))
  expect(undersized).toEqual([])
})
