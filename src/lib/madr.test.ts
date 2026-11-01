import { describe, expect, it } from 'vitest'
import { createExampleDecision } from './decision'
import { decisionFilename, toMadr } from './madr'

describe('MADR export', () => {
  const decision = createExampleDecision(new Date('2026-08-21T08:00:00Z'))

  it('keeps the official core sections and WHYLOG extensions', () => {
    const markdown = toMadr(decision)
    expect(markdown).toContain('status: "accepted"')
    expect(markdown).toContain('## Context and Problem Statement')
    expect(markdown).toContain('## Considered Options')
    expect(markdown).toContain('## Decision Outcome')
    expect(markdown).toContain('### Consequences')
    expect(markdown).toContain('### Confirmation')
    expect(markdown).toContain('## Job to Be Done')
    expect(markdown).toContain('## Revisit When')
  })

  it('records the chosen option and accepted trade-offs', () => {
    const markdown = toMadr(decision)
    expect(markdown).toContain('Chosen option: "本地优先的 Web 工作台"')
    expect(markdown).toContain('Bad, because 需要主动导出或备份浏览器数据')
  })

  it('adds the outcome review only after reality has been recorded', () => {
    expect(toMadr(decision)).not.toContain('## Outcome Review')
    decision.outcomeReview = {
      verdict: 'partial',
      reviewedAt: '2026-09-20',
      actualOutcome: '检索变快，但备份仍依赖主动操作。',
      evidence: ['完成 12 次真实决策检索'],
      lessons: '恢复路径必须和记录路径同样明显。',
      futureRule: '每次重要决策同时设置复盘日期。',
    }
    const markdown = toMadr(decision)
    expect(markdown).toContain('## Outcome Review')
    expect(markdown).toContain('* Verdict: Partially validated')
    expect(markdown).toContain('恢复路径必须和记录路径同样明显。')
  })

  it('does not omit lessons written before a verdict is selected', () => {
    const draftReview = createExampleDecision()
    draftReview.outcomeReview.lessons = '先保留恢复路径，再迁移数据。'
    expect(toMadr(draftReview)).toContain('先保留恢复路径，再迁移数据。')
  })

  it('generates a safe and sortable filename', () => {
    expect(decisionFilename(decision)).toBe('0001-使用本地优先方式构建-adr-工作台.md')
  })
})
