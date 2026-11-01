import { describe, expect, it } from 'vitest'
import { createExampleDecision, emptyWorkspace } from './decision'
import { loadWorkspace, parseWorkspace, saveWorkspace, STORAGE_KEY } from './storage'

describe('workspace persistence', () => {
  it('round-trips a valid workspace', () => {
    const workspace = { ...emptyWorkspace(), decisions: [createExampleDecision()], activeId: 'ADR-0001' }
    expect(parseWorkspace(JSON.stringify(workspace))).toEqual(workspace)
  })

  it('rejects unsupported or malformed imports', () => {
    expect(() => parseWorkspace('{"schemaVersion": 2, "decisions": []}')).toThrow('版本不受支持')
    expect(() => parseWorkspace('{"schemaVersion": 1, "decisions": [{}], "activeId": null}')).toThrow('数据不完整')
  })

  it('returns a clear error when storage quota fails', () => {
    const error = saveWorkspace(emptyWorkspace(), {
      setItem: () => { throw new Error('quota exceeded') },
    })
    expect(error).toContain('quota exceeded')
  })

  it('uses a versioned storage key', () => {
    expect(STORAGE_KEY).toBe('whylog.workspace.v1')
  })
})


it('reports blocked localStorage getter errors without crashing', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('blocked') } })
  try {
    expect(loadWorkspace().error).toContain('blocked')
    expect(saveWorkspace(emptyWorkspace())).toContain('blocked')
    expect(loadWorkspace(null).error).toBeNull()
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
