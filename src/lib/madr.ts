import type { DecisionOption, DecisionRecord, EvidenceItem } from '../types'

const clean = (value: string) => value.trim()
const present = (values: string[]) => values.map(clean).filter(Boolean)
const yamlString = (value: string) => JSON.stringify(value)
const yamlList = (values: string[]) => `[${present(values).map(yamlString).join(', ')}]`

function bullets(values: string[], prefix = ''): string {
  const items = present(values)
  return items.length ? items.map((value) => `* ${prefix}${value}`).join('\n') : '* _待补充_'
}

function evidenceTable(items: EvidenceItem[]): string {
  const rows = items.filter((item) => clean(item.text))
  if (!rows.length) return '_待补充_'
  return [
    '| 内容 | 来源 | 置信度 |',
    '| --- | --- | --- |',
    ...rows.map((item) => `| ${escapeCell(item.text)} | ${escapeCell(item.source || '未标注')} | ${item.confidence} |`),
  ].join('\n')
}

function optionBlock(option: DecisionOption): string {
  const marker = option.chosen ? ' · **已选择**' : ''
  return [
    `### ${clean(option.title) || '未命名方案'}${marker}`,
    '',
    clean(option.description) || '_无补充说明_',
    '',
    bullets(option.pros, 'Good, because '),
    bullets(option.cons, 'Bad, because '),
    bullets(option.risks, 'Risk: '),
  ].join('\n')
}

function escapeCell(value: string): string {
  return clean(value).replaceAll('|', '\\|').replaceAll('\n', '<br>')
}

export function decisionFilename(decision: DecisionRecord): string {
  const number = decision.id.replace(/\D/g, '').padStart(4, '0')
  const slug = decision.title
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\\/:*?"<>|#]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64) || 'untitled-decision'
  return `${number}-${slug}.md`
}

export function toMadr(decision: DecisionRecord): string {
  const chosen = decision.options.find((option) => option.chosen)
  const trace = Object.entries(decision.traceability).filter(([, value]) => clean(value))
  const review = decision.outcomeReview
  const reviewLabels = { pending: 'Pending', validated: 'Validated', partial: 'Partially validated', invalidated: 'Invalidated' }
  const hasOutcome = review.verdict !== 'pending'
    || [review.actualOutcome, review.lessons, review.futureRule].some((value) => clean(value) !== '')
    || review.evidence.some((value) => clean(value) !== '')
  const metadata = [
    '---',
    `status: ${yamlString(decision.status)}`,
    `date: ${decision.date}`,
    `decision-makers: ${yamlList(decision.decisionMakers)}`,
    `consulted: ${yamlList(decision.consulted)}`,
    `informed: ${yamlList(decision.informed)}`,
    `project: ${yamlString(decision.project)}`,
    `tags: ${yamlList(decision.tags)}`,
    ...(decision.supersedes ? [`supersedes: ${yamlString(decision.supersedes)}`] : []),
    '---',
  ]

  return [
    ...metadata,
    '',
    `# ${decision.id}: ${clean(decision.title) || '未命名决策'}`,
    '',
    '## Job to Be Done',
    '',
    clean(decision.jobToBeDone) || '_待补充_',
    '',
    '**Desired outcome:** ' + (clean(decision.desiredOutcome) || '_待补充_'),
    '',
    '## Context and Problem Statement',
    '',
    clean(decision.context) || '_待补充_',
    '',
    '### Known Facts',
    '',
    evidenceTable(decision.facts),
    '',
    '### Assumptions to Validate',
    '',
    evidenceTable(decision.assumptions),
    '',
    '## Decision Drivers',
    '',
    bullets(decision.drivers),
    '',
    '## Constraints',
    '',
    bullets(decision.constraints),
    '',
    '## Considered Options',
    '',
    bullets(decision.options.map((option) => option.title)),
    '',
    '## Decision Outcome',
    '',
    chosen
      ? `Chosen option: "${clean(chosen.title)}", because ${clean(decision.choiceReason) || '_待补充选择理由_'}.`
      : 'Chosen option: _尚未选择_.',
    '',
    '### Consequences',
    '',
    bullets(decision.consequences.positive, 'Good, because '),
    bullets(decision.consequences.negative, 'Bad, because '),
    bullets(decision.consequences.neutral, 'Neutral, because '),
    '',
    '### Confirmation',
    '',
    clean(decision.confirmation) || '_待补充_',
    '',
    '## Pros and Cons of the Options',
    '',
    ...decision.options.flatMap((option) => [optionBlock(option), '']),
    '## Revisit When',
    '',
    `* Review date: ${decision.reviewDate || '_未设置_'}`,
    bullets(decision.reviewTriggers),
    '',
    ...(hasOutcome ? [
      '## Outcome Review',
      '',
      `* Verdict: ${reviewLabels[review.verdict]}`,
      `* Reviewed at: ${review.reviewedAt || '_未设置_'}`,
      '',
      '### Actual Outcome',
      '',
      clean(review.actualOutcome) || '_待补充_',
      '',
      '### Evidence',
      '',
      bullets(review.evidence),
      '',
      '### Lessons and Future Rule',
      '',
      `* Lesson: ${clean(review.lessons) || '_待补充_'}`,
      `* Future rule: ${clean(review.futureRule) || '_待补充_'}`,
      '',
    ] : []),
    '## Traceability',
    '',
    ...(trace.length ? trace.map(([key, value]) => `* ${key}: ${value}`) : ['_暂无关联产物_']),
    '',
    `<!-- Generated by WHYLOG; MADR 4.0-compatible extended template. Updated ${decision.updatedAt}. -->`,
    '',
  ].join('\n')
}
