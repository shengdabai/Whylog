import { describe, expect, it } from 'vitest'
import { createBlankDecision, createExampleDecision } from './decision'
import { assessDecision } from './quality'

describe('assessDecision', () => {
  it('explains why a blank ADR is not ready', () => {
    const result = assessDecision(createBlankDecision(1, new Date('2026-08-21T08:00:00Z')))
    expect(result.level).toBe('draft')
    expect(result.score).toBeLessThan(40)
    expect(result.missing).toContain('明确且只选择一个方案')
    expect(result.missing).toContain('写清为什么选它、排除其他方案')
  })

  it('marks a complete example as ready', () => {
    const result = assessDecision(createExampleDecision(new Date('2026-08-21T08:00:00Z')), '2026-08-21')
    expect(result.level).toBe('ready')
    expect(result.score).toBe(100)
    expect(result.missing).toEqual([])
  })

  it('lowers readiness when an accepted decision has an incomplete due review', () => {
    const decision = createExampleDecision(new Date('2026-08-21T08:00:00Z'))
    decision.reviewDate = '2020-01-01'
    const due = assessDecision(decision, '2026-08-21')
    expect(due.score).toBe(90)
    expect(due.missing).toContain('完成到期复盘：结论、实际结果、证据、核心教训与未来规则')

    decision.outcomeReview = {
      verdict: 'validated',
      reviewedAt: '2026-08-21',
      actualOutcome: '目标达成',
      evidence: ['12 次真实检索'],
      lessons: '恢复路径必须可见',
      futureRule: '下次继续使用这套判断规则',
    }
    expect(assessDecision(decision, '2026-08-21').score).toBe(100)
  })

  it('caps the score at 90 when the review is overdue and not reviewed', () => {
    const decision = createExampleDecision(new Date('2026-08-21T08:00:00Z'))
    expect(assessDecision(decision, '2026-09-19').score).toBe(100)
    const overdue = assessDecision(decision, '2026-09-21')
    expect(overdue.score).toBe(90)
    expect(overdue.level).toBe('ready')
    expect(overdue.missing).toContain('完成到期复盘：结论、实际结果、证据、核心教训与未来规则')
  })
})


it('does not count invalid review dates or evidence without sources as complete', () => {
  const decision = createExampleDecision()
  decision.reviewTriggers = []
  for (const date of ['tomorrow', '2026-02-30', '2026-13-01']) {
    decision.reviewDate = date
    expect(assessDecision(decision).missing).toContain('设置有效重审日期或触发条件')
  }
  decision.facts.forEach((item) => { item.source = '' })
  decision.assumptions.forEach((item) => { item.source = '' })
  const result = assessDecision(decision)
  expect(result.missing).toContain('至少记录一条有来源的已知事实')
  expect(result.missing).toContain('显式记录一条有来源的待验证假设')
})
