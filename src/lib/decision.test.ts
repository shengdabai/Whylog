import { describe, expect, it } from 'vitest'
import { createExampleDecision, isReviewDue, nextDecisionNumber, normalizeWorkspace } from './decision'
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

  it('allocates safe numbers after imported IDs exceed integer precision', () => {
    const record = createExampleDecision()
    const decisions = ['ADR-0001', 'ADR-9007199254740991', 'ADR-9007199254740992', `ADR-${'9'.repeat(400)}`]
      .map((id) => ({ ...record, id }))
    expect(nextDecisionNumber(decisions)).toBe(2)
    expect(nextDecisionNumber([{ ...record, id: 'ADR-0042' }])).toBe(43)
    expect(nextDecisionNumber([])).toBe(1)
  })

  it('repairs duplicate and empty nested IDs without losing imported content', () => {
    const record = createExampleDecision()
    record.options = [
      { ...record.options[0], id: 'same-option' },
      { ...record.options[1], id: 'same-option' },
      { ...record.options[1], id: '' },
    ]
    for (const kind of ['facts', 'assumptions'] as const) {
      record[kind] = [record[kind][0], { ...record[kind][0], text: '第二项' }, { ...record[kind][0], id: '' }]
    }
    const workspace = normalizeWorkspace({ schemaVersion: 1, decisions: [record], activeId: record.id })
    const normalized = workspace.decisions[0]
    for (const key of ['options', 'facts', 'assumptions'] as const) {
      const items = normalized[key]
      expect(items).toHaveLength(record[key].length)
      expect(new Set(items.map((item) => item.id)).size).toBe(items.length)
      expect(items.every((item) => item.id.length > 0)).toBe(true)
      expect(items[0].id).toBe(record[key][0].id)
      expect(items.map(({ id: _id, ...content }) => content))
        .toEqual(record[key].map(({ id: _id, ...content }) => content))
    }
    expect(normalizeWorkspace(workspace)).toEqual(workspace)
  })

  it.each(['9007199254740990', '9007199254740991', '9007199254740992', '9'.repeat(400)])(
    'normalizes duplicate imported IDs at the numeric boundary: %s',
    (number) => {
      const record = { ...createExampleDecision(), id: `ADR-${number}` }
      const workspace = normalizeWorkspace({
        schemaVersion: 1,
        decisions: [record, record, record, record],
        activeId: record.id,
      })
      expect(new Set(workspace.decisions.map((decision) => decision.id)).size).toBe(4)
      expect(workspace.activeId).toBe(record.id)
      expect(workspace.decisions[0].id).toBe(record.id)
      for (const decision of workspace.decisions.slice(1)) {
        expect(Number.isSafeInteger(Number(decision.id.slice(4)))).toBe(true)
      }
      expect(normalizeWorkspace(workspace)).toEqual(workspace)
      expect(Number.isSafeInteger(nextDecisionNumber(workspace.decisions))).toBe(true)
    },
  )
})


it('rejects impossible calendar dates during normalization and due checks', () => {
  for (const date of ['2026-02-30', '2026-13-01', '2026-00-01', '0000-01-01']) {
    const decision = createExampleDecision()
    decision.reviewDate = date
    expect(isReviewDue(decision, '2027-01-01')).toBe(false)
    expect(normalizeWorkspace({ schemaVersion: 1, decisions: [decision], activeId: decision.id }).decisions[0].reviewDate).toBe('')
  }
})
