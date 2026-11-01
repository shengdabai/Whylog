import { describe, expect, it } from 'vitest'
import { createExampleDecision, isReviewDue, normalizeWorkspace } from './decision'
import type { Workspace } from '../types'

describe('decision lifecycle compatibility', () => {
  it('normalizes an old v1 decision without an outcome review', () => {
    const oldDecision = createExampleDecision(new Date('2026-08-01T08:00:00Z'))
    const raw = structuredClone(oldDecision) as Partial<typeof oldDecision>
    delete raw.outcomeReview
    const workspace = normalizeWorkspace({
      schemaVersion: 1,
      decisions: [raw],
      activeId: 'missing-id',
    } as unknown as Workspace)

    expect(workspace.decisions[0].outcomeReview.verdict).toBe('pending')
    expect(workspace.activeId).toBe(oldDecision.id)
  })

  it('marks only accepted, overdue, unreviewed decisions as due', () => {
    const decision = createExampleDecision()
    decision.reviewDate = '2026-08-20'
    expect(isReviewDue(decision, '2026-08-21')).toBe(true)
    decision.outcomeReview.verdict = 'validated'
    expect(isReviewDue(decision, '2026-08-21')).toBe(true)
    decision.outcomeReview.actualOutcome = '目标达成'
    decision.outcomeReview.evidence = ['实际指标']
    decision.outcomeReview.lessons = '假设得到了验证'
    expect(isReviewDue(decision, '2026-08-21')).toBe(true)
    decision.outcomeReview.futureRule = '下次沿用这条规则'
    expect(isReviewDue(decision, '2026-08-21')).toBe(false)
  })

  it('sanitizes malformed optional fields before UI code reads them', () => {
    const malformed = {
      ...createExampleDecision(),
      jobToBeDone: 42,
      tags: ['valid', 7],
      options: [{ title: null, pros: 'not-a-list', chosen: 'yes' }],
      outcomeReview: { verdict: 'unknown', evidence: [1, 'real signal'] },
    }
    const [decision] = normalizeWorkspace({
      schemaVersion: 1,
      decisions: [malformed],
      activeId: malformed.id,
    } as unknown as Workspace).decisions

    expect(decision.jobToBeDone).toBe('')
    expect(decision.tags).toEqual(['valid'])
    expect(decision.options[0]).toMatchObject({ title: '', pros: [''], chosen: false })
    expect(decision.outcomeReview).toMatchObject({ verdict: 'pending', evidence: ['real signal'] })
  })

  it('contains malformed identifiers and workspace collections without throwing', () => {
    const malformed = { ...createExampleDecision(), id: 99, reviewDate: '09/01/2026' }
    const workspace = normalizeWorkspace({
      schemaVersion: 1,
      decisions: [malformed],
      activeId: null,
    } as unknown as Workspace)
    expect(workspace.decisions[0].id).toBe('ADR-0001')
    expect(workspace.decisions[0].reviewDate).toBe('')
    expect(isReviewDue(workspace.decisions[0], '2026-09-01')).toBe(false)

    expect(normalizeWorkspace({ schemaVersion: 1, decisions: 'broken', activeId: null } as unknown as Workspace).decisions).toEqual([])
  })

  it('assigns stable unique ids when imported records collide', () => {
    const first = createExampleDecision()
    const second = { ...createExampleDecision(), title: '第二条记录', id: first.id }
    const workspace = normalizeWorkspace({ schemaVersion: 1, decisions: [first, second], activeId: first.id })
    expect(new Set(workspace.decisions.map((decision) => decision.id)).size).toBe(2)
    expect(workspace.decisions[0].id).toBe(first.id)
    expect(workspace.decisions[1].id).not.toBe(first.id)
  })
})


it('rejects impossible calendar dates during normalization and due checks', () => {
  for (const date of ['2026-02-30', '2026-13-01', '2026-00-01', '0000-01-01']) {
    const decision = createExampleDecision()
    decision.reviewDate = date
    expect(isReviewDue(decision, '2027-01-01')).toBe(false)
    expect(normalizeWorkspace({ schemaVersion: 1, decisions: [decision], activeId: decision.id }).decisions[0].reviewDate).toBe('')
  }
})
