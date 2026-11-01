import type { DecisionRecord, Workspace } from '../types'
import { emptyWorkspace } from './decision'

export const STORAGE_KEY = 'whylog.workspace.v1'

export interface LoadResult {
  workspace: Workspace
  error: string | null
}

function looksLikeDecision(value: unknown): value is DecisionRecord {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<DecisionRecord>
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.context === 'string' &&
    Array.isArray(item.options) &&
    Array.isArray(item.facts) &&
    Array.isArray(item.assumptions)
  )
}

export function parseWorkspace(raw: string): Workspace {
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object') throw new Error('文件不是有效的工作区对象')
  const candidate = value as Partial<Workspace>
  if (candidate.schemaVersion !== 1) throw new Error('工作区版本不受支持')
  if (!Array.isArray(candidate.decisions) || !candidate.decisions.every(looksLikeDecision)) {
    throw new Error('工作区中的决策数据不完整')
  }
  if (candidate.activeId !== null && typeof candidate.activeId !== 'string') {
    throw new Error('工作区活动项无效')
  }
  return candidate as Workspace
}

export function loadWorkspace(storage?: Pick<Storage, 'getItem'> | null): LoadResult {
  try {
    if (storage === undefined) storage = globalThis.localStorage ?? null
    if (!storage) return { workspace: emptyWorkspace(), error: null }
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return { workspace: emptyWorkspace(), error: null }
    return { workspace: parseWorkspace(raw), error: null }
  } catch (error) {
    return {
      workspace: emptyWorkspace(),
      error: error instanceof Error ? `本地数据无法读取：${error.message}` : '本地数据无法读取',
    }
  }
}

export function saveWorkspace(workspace: Workspace, storage?: Pick<Storage, 'setItem'> | null): string | null {
  try {
    if (storage === undefined) storage = globalThis.localStorage ?? null
    if (!storage) return '当前环境不支持本地保存'
    storage.setItem(STORAGE_KEY, JSON.stringify(workspace))
    return null
  } catch (error) {
    return error instanceof Error ? `保存失败：${error.message}` : '保存失败'
  }
}
