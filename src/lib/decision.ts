import type { DecisionOption, DecisionRecord, EvidenceItem, OutcomeReview, Workspace } from '../types'

const uid = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`

export function localDate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return localDate(value)
}

export function createEvidence(kind: EvidenceItem['kind'], text = ''): EvidenceItem {
  return { id: uid(), text, source: '', confidence: kind === 'fact' ? 'high' : 'medium', kind }
}

export function createOption(title = ''): DecisionOption {
  return { id: uid(), title, description: '', pros: [''], cons: [''], risks: [''], chosen: false }
}

export function createOutcomeReview(): OutcomeReview {
  return {
    verdict: 'pending',
    reviewedAt: '',
    actualOutcome: '',
    evidence: [''],
    lessons: '',
    futureRule: '',
  }
}

export function nextDecisionNumber(decisions: DecisionRecord[]): number {
  const used = new Set(decisions
    .map((decision) => Number.parseInt(decision.id.replace(/\D/g, ''), 10))
    .filter((number) => Number.isSafeInteger(number) && number >= 0))
  let next = 1
  for (const number of used) next = Math.max(next, number + 1)
  // Imported IDs may exhaust integer precision; reuse a free low number instead.
  if (!Number.isSafeInteger(next)) next = 1
  while (used.has(next)) next++
  return next
}

export function createBlankDecision(number: number, now = new Date()): DecisionRecord {
  const date = localDate(now)
  return {
    id: `ADR-${String(number).padStart(4, '0')}`,
    title: '未命名决策',
    project: '',
    status: 'proposed',
    date,
    updatedAt: now.toISOString(),
    decisionMakers: ['Tony'],
    consulted: [],
    informed: [],
    jobToBeDone: '',
    desiredOutcome: '',
    context: '',
    facts: [createEvidence('fact')],
    assumptions: [createEvidence('assumption')],
    drivers: [''],
    constraints: [''],
    options: [createOption('方案 A'), createOption('方案 B')],
    choiceReason: '',
    consequences: { positive: [''], negative: [''], neutral: [] },
    confirmation: '',
    reviewDate: addDays(date, 30),
    reviewTriggers: [''],
    outcomeReview: createOutcomeReview(),
    traceability: { prd: '', requirements: '', architecture: '', spec: '', code: '', tests: '' },
    tags: [],
    supersedes: '',
  }
}

export function createExampleDecision(now = new Date()): DecisionRecord {
  const record = createBlankDecision(1, now)
  const first = record.options[0]
  const second = record.options[1]
  first.title = '本地优先的 Web 工作台'
  first.description = '浏览器内编辑并持久化，按需导出 MADR Markdown。'
  first.pros = ['无账号即可开始', '数据可迁移，Markdown 长期可读']
  first.cons = ['暂不支持多人实时协作']
  first.risks = ['浏览器数据被清理时可能丢失未导出的记录']
  first.chosen = true
  second.title = '直接购买云端 ADR SaaS'
  second.description = '使用成熟的在线协作产品。'
  second.pros = ['团队协作能力现成']
  second.cons = ['个人数据与项目上下文分散', '持续订阅成本']
  second.risks = ['供应商锁定']
  return {
    ...record,
    title: '使用本地优先方式构建 ADR 工作台',
    project: '决策跟踪系统',
    status: 'accepted',
    jobToBeDone: '当我把执行交给 AI 时，保留每个关键选择背后的 Why，避免项目越快越失控。',
    desiredOutcome: '30 秒内找到旧决策理由，新决策在落地前暴露约束、代价和重审条件。',
    context: 'AI 提高了代码生成速度，也同步提高了决策密度。现有系统能记录个人重大决策，但缺少面向项目的候选方案比较、MADR 输出和产物追溯。',
    facts: [
      { ...createEvidence('fact', '现有仓库使用 Markdown 与 JSON，且已由 Git 管理'), source: '仓库审计', confidence: 'high' },
      { ...createEvidence('fact', 'MADR 4.0 推荐将文件放在 docs/decisions'), source: 'adr/madr 官方模板', confidence: 'high' },
    ],
    assumptions: [
      { ...createEvidence('assumption', '当前阶段个人使用频率高于多人协作需求'), source: '产品判断', confidence: 'medium' },
    ],
    drivers: ['离线可用与低维护', '与 Git / Markdown 工作流兼容', '能解释 Why 而非只存 What'],
    constraints: ['不依赖云端账号', '不能覆盖现有 decisions/ 历史数据'],
    options: [first, second],
    choiceReason: '本地优先方案同时满足数据所有权、零配置和 Git 兼容三个硬约束；团队协作当前不是阻断条件。',
    consequences: {
      positive: ['决策数据不被供应商锁定', '可直接进入项目版本控制'],
      negative: ['需要主动导出或备份浏览器数据', '暂时没有多人审批流'],
      neutral: ['若团队协作成为核心需求，需要重新评估同步层'],
    },
    confirmation: '用真实项目创建、刷新恢复并导出一份 MADR；检查 Markdown 可读且包含选择理由与重审条件。',
    reviewTriggers: ['连续 3 次需要多人共同编辑', '决策记录超过 200 条后检索明显变慢'],
    traceability: { ...record.traceability, prd: 'docs/product-spec.md', code: 'src/', tests: 'src/**/*.test.ts' },
    tags: ['local-first', 'MADR', 'AI-workflow'],
  }
}

export function emptyWorkspace(): Workspace {
  return { schemaVersion: 1, decisions: [], activeId: null }
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function isReviewDue(decision: DecisionRecord, today = localDate()): boolean {
  if (!isValidDate(decision.reviewDate) || !isValidDate(today)) return false
  return ['accepted', 'deprecated', 'superseded'].includes(decision.status)
    && decision.reviewDate <= today
    && !isOutcomeReviewComplete(decision)
}

export function isOutcomeReviewComplete(decision: DecisionRecord): boolean {
  const review = decision.outcomeReview
  return review.verdict !== 'pending'
    && review.actualOutcome.trim().length > 0
    && review.evidence.some((item) => item.trim().length > 0)
    && review.lessons.trim().length > 0
    && review.futureRule.trim().length > 0
}

export function normalizeDecisionRecord(value: Partial<DecisionRecord>, index = 0): DecisionRecord {
  const rawId = typeof value?.id === 'string' ? value.id : ''
  const number = Number.parseInt(rawId.replace(/\D/g, ''), 10) || index + 1
  const fallback = createBlankDecision(number)
  const text = (candidate: unknown, fallbackText = '') => typeof candidate === 'string' ? candidate : fallbackText
  const normalizeStrings = (items: unknown, fallbackItems: string[]) => Array.isArray(items)
    ? items.filter((item): item is string => typeof item === 'string')
    : fallbackItems
  const normalizeItemIds = <T extends { id: string }>(items: T[]): T[] => {
    const usedIds = new Set<string>()
    return items.map((item) => {
      let id = item.id
      while (!id || usedIds.has(id)) id = uid()
      usedIds.add(id)
      return id === item.id ? item : { ...item, id }
    })
  }
  const normalizeEvidence = (items: unknown, kind: EvidenceItem['kind'], fallbackItems: EvidenceItem[]) => Array.isArray(items)
    ? normalizeItemIds(items.map((item) => {
      const candidate = item && typeof item === 'object' ? item as Partial<EvidenceItem> : {}
      return {
        ...createEvidence(kind),
        ...candidate,
        id: text(candidate.id, uid()),
        kind,
        text: text(candidate.text),
        source: text(candidate.source),
        confidence: ['high', 'medium', 'low'].includes(candidate.confidence ?? '')
          ? candidate.confidence as EvidenceItem['confidence']
          : kind === 'fact' ? 'high' : 'medium',
      }
    }))
    : fallbackItems
  const normalizeOptions = (items: unknown) => Array.isArray(items)
    ? normalizeItemIds(items.map((item) => {
      const candidate = item && typeof item === 'object' ? item as Partial<DecisionOption> : {}
      return {
        ...createOption(),
        ...candidate,
        id: text(candidate.id, uid()),
        title: text(candidate.title),
        description: text(candidate.description),
        pros: normalizeStrings(candidate.pros, ['']),
        cons: normalizeStrings(candidate.cons, ['']),
        risks: normalizeStrings(candidate.risks, ['']),
        chosen: candidate.chosen === true,
      }
    }))
    : fallback.options
  return {
    ...fallback,
    ...value,
    id: text(value.id, fallback.id),
    title: text(value.title, fallback.title),
    project: text(value.project),
    status: ['proposed', 'accepted', 'rejected', 'deprecated', 'superseded'].includes(value.status ?? '')
      ? value.status as DecisionRecord['status']
      : fallback.status,
    date: text(value.date, fallback.date),
    updatedAt: text(value.updatedAt, fallback.updatedAt),
    jobToBeDone: text(value.jobToBeDone),
    desiredOutcome: text(value.desiredOutcome),
    context: text(value.context),
    facts: normalizeEvidence(value.facts, 'fact', fallback.facts),
    assumptions: normalizeEvidence(value.assumptions, 'assumption', fallback.assumptions),
    decisionMakers: normalizeStrings(value.decisionMakers, fallback.decisionMakers),
    consulted: normalizeStrings(value.consulted, fallback.consulted),
    informed: normalizeStrings(value.informed, fallback.informed),
    drivers: normalizeStrings(value.drivers, fallback.drivers),
    constraints: normalizeStrings(value.constraints, fallback.constraints),
    options: normalizeOptions(value.options),
    choiceReason: text(value.choiceReason),
    consequences: {
      positive: normalizeStrings(value.consequences?.positive, fallback.consequences.positive),
      negative: normalizeStrings(value.consequences?.negative, fallback.consequences.negative),
      neutral: normalizeStrings(value.consequences?.neutral, fallback.consequences.neutral),
    },
    confirmation: text(value.confirmation),
    reviewDate: isValidDate(text(value.reviewDate)) ? text(value.reviewDate) : '',
    reviewTriggers: normalizeStrings(value.reviewTriggers, fallback.reviewTriggers),
    outcomeReview: {
      ...fallback.outcomeReview,
      ...(value.outcomeReview ?? {}),
      verdict: ['pending', 'validated', 'partial', 'invalidated'].includes(value.outcomeReview?.verdict ?? '')
        ? value.outcomeReview?.verdict as DecisionRecord['outcomeReview']['verdict']
        : fallback.outcomeReview.verdict,
      reviewedAt: /^\d{4}-\d{2}-\d{2}$/.test(text(value.outcomeReview?.reviewedAt)) ? text(value.outcomeReview?.reviewedAt) : '',
      actualOutcome: text(value.outcomeReview?.actualOutcome),
      evidence: normalizeStrings(value.outcomeReview?.evidence, fallback.outcomeReview.evidence),
      lessons: text(value.outcomeReview?.lessons),
      futureRule: text(value.outcomeReview?.futureRule),
    },
    traceability: {
      prd: text(value.traceability?.prd),
      requirements: text(value.traceability?.requirements),
      architecture: text(value.traceability?.architecture),
      spec: text(value.traceability?.spec),
      code: text(value.traceability?.code),
      tests: text(value.traceability?.tests),
    },
    tags: normalizeStrings(value.tags, fallback.tags),
    supersedes: text(value.supersedes),
  }
}

export function normalizeWorkspace(workspace: Workspace): Workspace {
  const source = Array.isArray(workspace?.decisions) ? workspace.decisions : []
  const normalized = source.map((decision, index) => normalizeDecisionRecord(decision, index))
  const usedIds = new Set<string>()
  let nextNumber = nextDecisionNumber(normalized)
  const takeNextId = () => {
    const id = `ADR-${String(nextNumber).padStart(4, '0')}`
    nextNumber = nextNumber === Number.MAX_SAFE_INTEGER ? 1 : nextNumber + 1
    return id
  }
  const decisions = normalized.map((decision) => {
    if (!usedIds.has(decision.id)) {
      usedIds.add(decision.id)
      return decision
    }
    let id = takeNextId()
    while (usedIds.has(id)) id = takeNextId()
    usedIds.add(id)
    return { ...decision, id }
  })
  const activeId = workspace.activeId && decisions.some((decision) => decision.id === workspace.activeId)
    ? workspace.activeId
    : decisions[0]?.id ?? null
  return { schemaVersion: 1, decisions, activeId }
}
