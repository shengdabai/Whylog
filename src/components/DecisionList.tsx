import { useState } from 'react'
import { BookOpen, FilePlus2, Search, Sparkles } from 'lucide-react'
import type { DecisionRecord, DecisionStatus } from '../types'
import type { DecisionLearning } from '../lib/learning'
import { isReviewDue } from '../lib/decision'

const statusLabel: Record<DecisionStatus, string> = {
  proposed: '提议中',
  accepted: '已采纳',
  rejected: '已拒绝',
  deprecated: '已废弃',
  superseded: '已替代',
}

interface Props {
  decisions: DecisionRecord[]
  learnings: DecisionLearning[]
  learningCount: number
  activeId: string | null
  search: string
  status: 'all' | 'due' | DecisionStatus
  onSearch: (value: string) => void
  onStatus: (value: 'all' | 'due' | DecisionStatus) => void
  onSelect: (id: string) => void
  onNew: () => void
  onExample: () => void
}

export function DecisionList({ decisions, learnings, learningCount, activeId, search, status, onSearch, onStatus, onSelect, onNew, onExample }: Props) {
  const [mode, setMode] = useState<'decisions' | 'learnings'>('decisions')
  return (
    <aside className="ledger-panel" aria-label="决策台账">
      <div className="ledger-heading">
        <div>
          <p className="eyebrow">Decision ledger</p>
          <h2>决策台账</h2>
        </div>
        <button className="icon-action ink" type="button" onClick={onNew} aria-label="新建决策" title="新建决策">
          <FilePlus2 size={18} />
        </button>
      </div>

      <div className="ledger-mode-switch" role="group" aria-label="台账内容">
        <button type="button" className={mode === 'decisions' ? 'active' : ''} aria-pressed={mode === 'decisions'} onClick={() => setMode('decisions')}>决策</button>
        <button type="button" className={mode === 'learnings' ? 'active' : ''} aria-pressed={mode === 'learnings'} onClick={() => setMode('learnings')}>
          <BookOpen size={14} /> 规则 {learningCount}
        </button>
      </div>

      <label className="search-box">
        <Search size={15} aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={mode === 'decisions' ? '搜索 Why、项目或标签' : '搜索规则、教训或来源'}
          aria-label={mode === 'decisions' ? '搜索决策' : '搜索规则'}
        />
      </label>

      {mode === 'decisions' ? (
        <div className="status-tabs" role="group" aria-label="按状态筛选">
          {(['all', 'proposed', 'accepted', 'due'] as const).map((value) => (
            <button
              key={value}
              className={status === value ? 'active' : ''}
              type="button"
              onClick={() => onStatus(value)}
              aria-pressed={status === value}
            >
              {value === 'all' ? '全部' : value === 'due' ? '待复盘' : statusLabel[value]}
            </button>
          ))}
        </div>
      ) : (
        <p className="learning-summary">复盘完成后，未来规则会回到下一次决策。</p>
      )}

      <div className="decision-stack">
        {mode === 'learnings' ? (
          learnings.length ? learnings.map((learning) => (
            <button
              key={learning.sourceId}
              className={`learning-row ${learning.sourceId === activeId ? 'active' : ''}`}
              type="button"
              onClick={() => onSelect(learning.sourceId)}
              aria-label={`打开规则来源 ${learning.sourceId}：${learning.rule}`}
            >
              <span className="learning-kicker"><BookOpen size={13} /> 未来规则</span>
              <strong>{learning.rule}</strong>
              <span className="learning-source">
                <span>{learning.sourceId} · {learning.sourceTitle}</span>
                <time>{learning.reviewedAt}</time>
              </span>
            </button>
          )) : (
            <div className="ledger-empty learning-empty">
              <span className="empty-index">LEARN</span>
              <h3>{search ? '没有匹配的规则' : '规则库等待第一次复盘'}</h3>
              <p>{search ? '换个关键词，或清空搜索。' : '完成结论、实际结果、证据、教训和未来规则后，这里会自动沉淀可复用经验。'}</p>
            </div>
          )
        ) : decisions.length ? (
          decisions.map((decision) => (
            <button
              key={decision.id}
              className={`decision-row ${decision.id === activeId ? 'active' : ''}`}
              type="button"
              onClick={() => onSelect(decision.id)}
            >
              <span className="decision-row-top">
                <span className={`status-dot ${decision.status}`} aria-hidden="true" />
                <span>{decision.id}</span>
                <time>{decision.date}</time>
              </span>
              <strong>{decision.title}</strong>
              <span className="decision-row-bottom">
                <span>{decision.project || '未归属项目'}</span>
                <span className={isReviewDue(decision) ? 'due-label' : ''}>
                  {isReviewDue(decision) ? '复盘到期' : statusLabel[decision.status]}
                </span>
              </span>
            </button>
          ))
        ) : (
          <div className="ledger-empty">
            <span className="empty-index">WHY?</span>
            <h3>{search || status !== 'all' ? '没有匹配的决策' : '从第一个 Why 开始'}</h3>
            <p>{search || status !== 'all' ? '换个关键词或筛选条件。' : '先用示例走一遍，再换成你的真实项目。'}</p>
            {!search && status === 'all' && (
              <button className="text-action" type="button" onClick={onExample}>
                <Sparkles size={15} /> 加载示例决策
              </button>
            )}
          </div>
        )}
      </div>

      <button className="new-decision" type="button" onClick={onNew}>
        <FilePlus2 size={17} /> 新建 ADR
      </button>
    </aside>
  )
}
