import { useEffect, useLayoutEffect, useMemo, useRef, useState, type SetStateAction } from 'react'
import {
  Archive,
  ArrowLeft,
  Braces,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  Import,
  MoreHorizontal,
  PenLine,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { DecisionEditor } from './components/DecisionEditor'
import { DecisionList } from './components/DecisionList'
import { MarkdownView } from './components/MarkdownView'
import { QualityRail } from './components/QualityRail'
import {
  createBlankDecision,
  createExampleDecision,
  createOutcomeReview,
  addDays,
  emptyWorkspace,
  isReviewDue,
  nextDecisionNumber,
  normalizeWorkspace,
} from './lib/decision'
import { assessDecision } from './lib/quality'
import {
  collectDecisionLearnings,
  decisionSearchText,
  learningSearchText,
  matchesSearchText,
  relatedDecisionLearnings,
} from './lib/learning'
import { decisionFilename, toMadr } from './lib/madr'
import { loadWorkspace, parseWorkspace, saveWorkspace, STORAGE_KEY } from './lib/storage'
import type { DecisionRecord, DecisionStatus, Workspace } from './types'

type ViewMode = 'form' | 'markdown'

interface ToastState {
  message: string
  duration?: number
}

interface UndoState {
  message: string
  actionLabel: string
  action: () => void
}

const RAW_BACKUP_KEY = `${STORAGE_KEY}.pre-normalize`
const PREVIOUS_RAW_BACKUP_KEY = `${RAW_BACKUP_KEY}.previous`

function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function App() {
  const [initial] = useState(() => {
    const loaded = loadWorkspace()
    let rawBackup: string | null = null
    try {
      rawBackup = globalThis.localStorage?.getItem(STORAGE_KEY) ?? null
    } catch {
      // loadWorkspace already carries the user-facing storage error.
    }
    try {
      const workspace = normalizeWorkspace(loaded.workspace)
      const changed = JSON.stringify(workspace) !== JSON.stringify(loaded.workspace)
      return { ...loaded, workspace, rawBackup: loaded.error || changed ? rawBackup : null }
    } catch {
      return {
        workspace: emptyWorkspace(),
        error: '本地数据结构异常，已停止自动保存以保护原数据',
        rawBackup,
      }
    }
  })
  const [workspace, setWorkspace] = useState<Workspace>(initial.workspace)
  const [allowSave, setAllowSave] = useState(!initial.error)
  const [saveError, setSaveError] = useState<string | null>(initial.error)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'due' | DecisionStatus>('all')
  const [view, setView] = useState<ViewMode>('form')
  const [copied, setCopied] = useState(false)
  const [deleteArmed, setDeleteArmed] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [undo, setUndo] = useState<UndoState | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const editorLayoutRef = useRef<HTMLDivElement>(null)
  const previousActiveIdRef = useRef(workspace.activeId)
  const decisionSearchCacheRef = useRef(new WeakMap<DecisionRecord, string>())
  const workspaceRef = useRef(workspace)
  const dirtyRef = useRef(false)

  const commitWorkspace = (updater: SetStateAction<Workspace>) => {
    dirtyRef.current = true
    setUndo(null)
    setWorkspace(updater)
  }

  useLayoutEffect(() => {
    workspaceRef.current = workspace
  }, [workspace])

  useEffect(() => {
    if (!initial.rawBackup) return
    try {
      const previous = globalThis.localStorage?.getItem(RAW_BACKUP_KEY)
      if (previous && previous !== initial.rawBackup) {
        globalThis.localStorage?.setItem(PREVIOUS_RAW_BACKUP_KEY, previous)
      }
      globalThis.localStorage?.setItem(RAW_BACKUP_KEY, initial.rawBackup)
    } catch {
      setSaveError((current) => current ?? '无法创建迁移前备份；请先导出工作区再继续编辑')
    }
  }, [initial.rawBackup])

  useEffect(() => {
    if (!allowSave || !dirtyRef.current) return
    const timer = window.setTimeout(() => {
      const error = saveWorkspace(workspace)
      setSaveError(error)
      if (!error) dirtyRef.current = false
    }, 250)
    return () => window.clearTimeout(timer)
  }, [workspace, allowSave])

  useEffect(() => {
    if (!allowSave) return
    const flush = () => {
      if (!dirtyRef.current) return
      const error = saveWorkspace(workspaceRef.current)
      if (error) setSaveError(error)
      else dirtyRef.current = false
    }
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flushWhenHidden)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', flushWhenHidden)
    }
  }, [allowSave])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), toast.duration ?? 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!deleteArmed) return
    const timer = window.setTimeout(() => setDeleteArmed(false), 3000)
    return () => window.clearTimeout(timer)
  }, [deleteArmed])

  const active = workspace.decisions.find((decision) => decision.id === workspace.activeId) ?? null

  useLayoutEffect(() => {
    const previousActiveId = previousActiveIdRef.current
    previousActiveIdRef.current = active?.id ?? null
    if (previousActiveId === active?.id) return
    if (!active) return
    const layout = editorLayoutRef.current
    layout?.scrollTo({ top: 0, left: 0 })
    if (window.matchMedia('(max-width: 650px)').matches) layout?.scrollIntoView({ block: 'start' })
  }, [active?.id])

  const learnings = useMemo(() => collectDecisionLearnings(workspace.decisions), [workspace.decisions])
  const indexedDecisions = useMemo(
    () => workspace.decisions.map((decision) => {
      let searchText = decisionSearchCacheRef.current.get(decision)
      if (!searchText) {
        searchText = decisionSearchText(decision)
        decisionSearchCacheRef.current.set(decision, searchText)
      }
      return { decision, searchText }
    }),
    [workspace.decisions],
  )
  const indexedLearnings = useMemo(
    () => learnings.map((learning) => ({ learning, searchText: learningSearchText(learning) })),
    [learnings],
  )
  const filtered = useMemo(() => {
    return indexedDecisions.filter(({ decision }) => {
      const matchesStatus = status === 'all'
        || (status === 'due' ? isReviewDue(decision) : decision.status === status)
      return matchesStatus
    }).filter(({ searchText }) => matchesSearchText(searchText, search)).map(({ decision }) => decision)
  }, [indexedDecisions, search, status])
  const filteredLearnings = useMemo(
    () => indexedLearnings.filter(({ searchText }) => matchesSearchText(searchText, search)).map(({ learning }) => learning),
    [indexedLearnings, search],
  )
  const relatedLearnings = useMemo(
    () => active ? relatedDecisionLearnings(active, learnings) : [],
    [active, learnings],
  )

  const quality = useMemo(() => active ? assessDecision(active) : null, [active])
  const markdown = useMemo(() => active ? toMadr(active) : '', [active])

  const announce = (message: string) => setToast({ message })

  const restartEmptyWorkspace = () => {
    if (initial.rawBackup) {
      downloadText(initial.rawBackup, `whylog-recovery-${new Date().toLocaleDateString('sv-SE')}.json`, 'application/json')
    }
    setAllowSave(true)
    setSaveError(null)
    commitWorkspace(emptyWorkspace())
    announce(initial.rawBackup ? '原始数据已下载，空工作区已启动' : '空工作区已启动')
  }

  const setActive = (id: string) => {
    if (workspaceRef.current.activeId !== id) dirtyRef.current = true
    setWorkspace((current) => current.activeId === id ? current : { ...current, activeId: id })
    setDeleteArmed(false)
    setView('form')
  }

  const addDecision = () => {
    const decision = createBlankDecision(nextDecisionNumber(workspace.decisions))
    commitWorkspace((current) => ({ ...current, decisions: [decision, ...current.decisions], activeId: decision.id }))
    setView('form')
    setDeleteArmed(false)
  }

  const addExample = () => {
    const decision = createExampleDecision()
    decision.id = `ADR-${String(nextDecisionNumber(workspace.decisions)).padStart(4, '0')}`
    commitWorkspace((current) => ({ ...current, decisions: [decision, ...current.decisions], activeId: decision.id }))
    setView('form')
    announce('示例已载入，可以直接改成你的决策')
  }

  const updateActive = (next: DecisionRecord) => {
    const updated = { ...next, updatedAt: new Date().toISOString() }
    commitWorkspace((current) => ({
      ...current,
      decisions: current.decisions.map((decision) => decision.id === updated.id ? updated : decision),
    }))
  }

  const duplicateActive = () => {
    if (!active) return
    const copy = structuredClone(active)
    copy.id = `ADR-${String(nextDecisionNumber(workspace.decisions)).padStart(4, '0')}`
    copy.title = `${active.title} · 副本`
    copy.status = 'proposed'
    copy.date = new Date().toLocaleDateString('sv-SE')
    copy.reviewDate = addDays(copy.date, 30)
    copy.updatedAt = new Date().toISOString()
    copy.outcomeReview = createOutcomeReview()
    commitWorkspace((current) => ({ ...current, decisions: [copy, ...current.decisions], activeId: copy.id }))
    announce('已创建可独立编辑的副本')
  }

  const deleteActive = () => {
    if (!active) return
    if (!deleteArmed) {
      setDeleteArmed(true)
      return
    }
    const deleted = active
    const deletedIndex = workspace.decisions.findIndex((decision) => decision.id === deleted.id)
    commitWorkspace((current) => {
      const remaining = current.decisions.filter((_, index) => index !== deletedIndex)
      return { ...current, decisions: remaining, activeId: remaining[0]?.id ?? null }
    })
    setDeleteArmed(false)
    setUndo({
      message: `${deleted.id} 已从本地台账删除`,
      actionLabel: '撤销',
      action: () => {
        commitWorkspace((current) => {
          const restored = structuredClone(deleted)
          if (current.decisions.some((decision) => decision.id === restored.id)) {
            restored.id = `ADR-${String(nextDecisionNumber(current.decisions)).padStart(4, '0')}`
          }
          const decisions = [...current.decisions]
          decisions.splice(Math.min(Math.max(0, deletedIndex), decisions.length), 0, restored)
          return { ...current, decisions, activeId: restored.id }
        })
        setUndo(null)
        announce('误删记录已恢复')
      },
    })
  }

  const copyMarkdown = async () => {
    if (!active) return
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      announce('浏览器未允许剪贴板权限，请使用下载')
    }
  }

  const downloadMarkdown = () => {
    if (!active) return
    downloadText(markdown, decisionFilename(active), 'text/markdown;charset=utf-8')
    announce('MADR 已下载')
  }

  const exportWorkspace = () => {
    downloadText(JSON.stringify(workspace, null, 2), `whylog-backup-${new Date().toLocaleDateString('sv-SE')}.json`, 'application/json')
    setToolsOpen(false)
    announce('工作区备份已下载')
  }

  const importWorkspace = async (file: File | undefined) => {
    if (!file) return
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('工作区文件超过 5 MB，请拆分后再导入')
      const next = normalizeWorkspace(parseWorkspace(await file.text()))
      const previousWorkspace = workspaceRef.current
      const previousAllowSave = allowSave
      const previousSaveError = saveError
      setAllowSave(true)
      commitWorkspace(next)
      setSaveError(null)
      setUndo({
        message: `已导入 ${next.decisions.length} 条决策并替换当前工作区`,
        actionLabel: '撤销导入',
        action: () => {
          commitWorkspace({ ...previousWorkspace, decisions: [...previousWorkspace.decisions] })
          let restoredError = previousSaveError
          if (!previousAllowSave && initial.rawBackup) {
            try {
              globalThis.localStorage?.setItem(STORAGE_KEY, initial.rawBackup)
            } catch {
              restoredError = '原始数据无法恢复到浏览器存储，请保留已下载的恢复文件'
            }
          }
          setAllowSave(previousAllowSave)
          setSaveError(restoredError)
          announce('导入已撤销')
        },
      })
    } catch (error) {
      announce(error instanceof Error ? error.message : '导入失败')
    } finally {
      if (importRef.current) importRef.current.value = ''
      setToolsOpen(false)
    }
  }

  return (
    <div className="app-shell">
      <aside className="brand-rail">
        <div className="brand-mark" aria-label="WHYLOG">
          <span>W</span>
          <div><strong>WHYLOG</strong><small>ADR WORKBENCH</small></div>
        </div>
        <blockquote>
          <span>“</span>
          ADR 的核心不是 What，<br />是 Why 的记录。
        </blockquote>
        <nav aria-label="工作台原则">
          <div className="rail-nav active"><PenLine size={17} /><span>记录 Why</span></div>
          <div className="rail-nav"><ShieldCheck size={17} /><span>隔离置信度</span></div>
          <div className="rail-nav"><Archive size={17} /><span>回填结果</span></div>
        </nav>
        <div className="local-note"><span className="pulse" /><div><strong>本地优先</strong><small>数据留在当前浏览器</small></div></div>
      </aside>

      <DecisionList
        decisions={filtered}
        learnings={filteredLearnings}
        learningCount={learnings.length}
        activeId={workspace.activeId}
        search={search}
        status={status}
        onSearch={setSearch}
        onStatus={setStatus}
        onSelect={setActive}
        onNew={addDecision}
        onExample={addExample}
      />

      <main className="work-area">
        <header className="work-toolbar">
          <button className="mobile-back" type="button" aria-label="返回台账"><ArrowLeft size={18} /></button>
          <div className="view-switch" role="group" aria-label="编辑或预览">
            <button className={view === 'form' ? 'active' : ''} type="button" aria-pressed={view === 'form'} onClick={() => setView('form')}><PenLine size={15} /> 推演</button>
            <button className={view === 'markdown' ? 'active' : ''} type="button" aria-pressed={view === 'markdown'} onClick={() => setView('markdown')} disabled={!active}><Braces size={15} /> Markdown</button>
          </div>
          <div className="toolbar-actions">
            {active && (
              <>
                <button className={`delete-action ${deleteArmed ? 'armed' : ''}`} type="button" onClick={deleteActive}>
                  <Trash2 size={16} /> {deleteArmed ? '再次点击确认' : '删除'}
                </button>
                <button className="secondary-action compact" type="button" onClick={duplicateActive}><FileText size={16} /> 复制</button>
                <button className="primary-action compact" type="button" onClick={downloadMarkdown}><Download size={16} /> 导出 MADR</button>
              </>
            )}
            <div className="tools-menu">
              <button className="icon-action" type="button" onClick={() => setToolsOpen((value) => !value)} aria-label="更多工具" aria-expanded={toolsOpen}><MoreHorizontal size={19} /></button>
              {toolsOpen && (
                <div className="tools-popover">
                  <button type="button" onClick={exportWorkspace}><FileJson size={16} /> 备份全部数据</button>
                  <button type="button" onClick={() => importRef.current?.click()}><Import size={16} /> 导入工作区</button>
                </div>
              )}
              <input ref={importRef} className="visually-hidden" type="file" aria-label="导入 WHYLOG JSON 工作区" accept="application/json,.json" onChange={(event) => void importWorkspace(event.target.files?.[0])} />
            </div>
          </div>
        </header>

        {saveError && (
          <div className="error-banner" role="alert">
            <span>{saveError}</span>
            {!allowSave && <button type="button" onClick={restartEmptyWorkspace}>用空工作区重新开始</button>}
          </div>
        )}

        {!active ? (
          <section className="empty-work-area">
            <div className="empty-stamp">WHY</div>
            <p className="eyebrow">Architecture Decision Record</p>
            <h1>别让代码记住 What，<br />却让你忘了 Why。</h1>
            <p>在 AI 动手之前，把问题、约束、排除理由、接受的代价和重审条件留在这里。</p>
            <div className="empty-actions">
              <button className="primary-action" type="button" onClick={addDecision}><PenLine size={17} /> 写第一条 ADR</button>
              <button className="secondary-action" type="button" onClick={addExample}><FileText size={17} /> 先看完整示例</button>
            </div>
            <div className="workflow-line" aria-label="工作流程">
              {['Job 校验', '事实 / 假设', '候选方案', '代价', '重审', '结果回填'].map((step, index) => (
                <div key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong></div>
              ))}
            </div>
          </section>
        ) : view === 'markdown' ? (
          <MarkdownView markdown={markdown} filename={decisionFilename(active)} copied={copied} onCopy={() => void copyMarkdown()} onDownload={downloadMarkdown} />
        ) : (
          <div className="editor-layout" ref={editorLayoutRef}>
            <DecisionEditor decision={active} onChange={updateActive} />
            {quality && (
              <QualityRail
                decision={active}
                quality={quality}
                learnings={relatedLearnings}
                onSelectLearning={setActive}
              />
            )}
          </div>
        )}
      </main>

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={16} />
          <span>{toast.message}</span>
        </div>
      )}
      {undo && (
        <div className="undo-toast">
          <span role="status">{undo.message}</span>
          <button type="button" autoFocus onClick={undo.action}>{undo.actionLabel}</button>
          <button type="button" onClick={() => setUndo(null)}>关闭</button>
        </div>
      )}
    </div>
  )
}

export default App
