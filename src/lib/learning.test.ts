import { describe, expect, it } from 'vitest'
import { createBlankDecision, createExampleDecision, normalizeWorkspace } from './decision'
import { collectDecisionLearnings, matchesDecisionQuery, matchesLearningQuery, relatedDecisionLearnings } from './learning'
import type { Workspace } from '../types'

function reviewedDecision(id: string, reviewedAt: string, rule: string, project = 'Alpha', tags = ['local-first']) {
  const decision = createExampleDecision(new Date(`${reviewedAt}T08:00:00Z`))
  decision.id = id
  decision.project = project
  decision.tags = tags
  decision.outcomeReview = {
    verdict: 'partial',
    reviewedAt,
    actualOutcome: '恢复流程减少了误操作',
    evidence: ['12 次真实恢复演练'],
    lessons: '恢复路径需要和写入路径同样明显',
    futureRule: rule,
  }
  return decision
}

describe('decision learning loop', () => {
  it('collects only complete reviews with a non-empty future rule', () => {
    const complete = reviewedDecision('ADR-0001', '2026-08-20', '迁移前先验证恢复路径')
    const pending = reviewedDecision('ADR-0002', '2026-08-21', '不会出现')
    pending.outcomeReview.verdict = 'pending'
    const whitespace = reviewedDecision('ADR-0003', '2026-08-22', '   ')

    expect(collectDecisionLearnings([pending, whitespace, complete])).toEqual([
      expect.objectContaining({ sourceId: 'ADR-0001', rule: '迁移前先验证恢复路径' }),
    ])
  })

  it('sorts learnings newest first with a stable id tie-breaker', () => {
    const learnings = collectDecisionLearnings([
      reviewedDecision('ADR-0001', '2026-08-20', '第一条'),
      reviewedDecision('ADR-0002', '2026-08-22', '第二条'),
      reviewedDecision('ADR-0003', '2026-08-22', '第三条'),
    ])
    expect(learnings.map((learning) => learning.sourceId)).toEqual(['ADR-0003', 'ADR-0002', 'ADR-0001'])
  })

  it('ranks only same-project and shared-tag learnings', () => {
    const active = createBlankDecision(9)
    active.project = 'Alpha'
    active.tags = ['local-first']
    const sameProjectAndTag = reviewedDecision('ADR-0001', '2026-08-18', '高度相关', 'Alpha', ['local-first'])
    const sameTag = reviewedDecision('ADR-0002', '2026-08-21', '标签相关', 'Beta', ['local-first'])
    const fallback = reviewedDecision('ADR-0003', '2026-08-22', '最新回退', 'Gamma', ['other'])

    const learnings = collectDecisionLearnings([fallback, sameTag, sameProjectAndTag])
    expect(relatedDecisionLearnings(active, learnings, 3).map((item) => item.rule)).toEqual([
      '高度相关',
      '标签相关',
    ])
  })

  it('excludes the active decision and respects zero and positive limits', () => {
    const active = reviewedDecision('ADR-0001', '2026-08-22', '不要回显自己')
    const other = reviewedDecision('ADR-0002', '2026-08-21', '可以回显')
    const learnings = collectDecisionLearnings([active, other])
    expect(relatedDecisionLearnings(active, learnings, 1).map((item) => item.sourceId)).toEqual(['ADR-0002'])
    expect(relatedDecisionLearnings(active, learnings, 0)).toEqual([])
  })

  it('searches deep decision rationale and completed outcome fields', () => {
    const decision = reviewedDecision('ADR-0001', '2026-08-22', '每次迁移先做恢复演练')
    decision.context = '需要保住用户的原始数据'
    decision.choiceReason = '可回滚性优先于短期速度'
    expect(matchesDecisionQuery(decision, '原始数据')).toBe(true)
    expect(matchesDecisionQuery(decision, '可回滚性')).toBe(true)
    expect(matchesDecisionQuery(decision, '恢复演练')).toBe(true)
    expect(matchesDecisionQuery(decision, '完全不存在')).toBe(false)
  })

  it('searches the rule library by source metadata and learning content', () => {
    const [learning] = collectDecisionLearnings([
      reviewedDecision('ADR-0042', '2026-08-22', '每次迁移先做恢复演练', '迁移项目', ['recovery']),
    ])
    expect(matchesLearningQuery(learning, 'ADR-0042')).toBe(true)
    expect(matchesLearningQuery(learning, '恢复路径')).toBe(true)
    expect(matchesLearningQuery(learning, '12 次真实恢复演练')).toBe(true)
    expect(matchesLearningQuery(learning, 'recovery')).toBe(true)
    expect(matchesLearningQuery(learning, '无关内容')).toBe(false)
  })

  it('searches normalized legacy and malformed v1 records without throwing', () => {
    const malformed = {
      ...createExampleDecision(),
      facts: null,
      consequences: null,
      outcomeReview: null,
    }
    const [decision] = normalizeWorkspace({
      schemaVersion: 1,
      decisions: [malformed],
      activeId: malformed.id,
    } as unknown as Workspace).decisions
    expect(() => matchesDecisionQuery(decision, '本地优先')).not.toThrow()
    expect(matchesDecisionQuery(decision, '本地优先')).toBe(true)
  })
})
