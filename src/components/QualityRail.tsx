import { AlertTriangle, BookOpen, Check, CircleDashed } from 'lucide-react'
import type { DecisionRecord, QualityResult } from '../types'
import type { DecisionLearning } from '../lib/learning'
import { decisionFilename } from '../lib/madr'

interface Props {
  decision: DecisionRecord
  quality: QualityResult
  learnings: DecisionLearning[]
  onSelectLearning: (id: string) => void
}

const levelLabel = {
  draft: '仍是草稿',
  reviewable: '可以评审',
  ready: '可以采纳',
}

export function QualityRail({ decision, quality, learnings, onSelectLearning }: Props) {
  const chosen = decision.options.find((option) => option.chosen)
  return (
    <aside className="quality-rail" aria-label="决策质量检查">
      <div className={`quality-score ${quality.level}`}>
        <div className="score-ring" style={{ '--score': `${quality.score * 3.6}deg` } as React.CSSProperties}>
          <span>{quality.score}</span>
        </div>
        <div>
          <p>决策完整度</p>
          <strong>{levelLabel[quality.level]}</strong>
        </div>
      </div>

      <div className="rail-block">
        <p className="rail-label">当前结论</p>
        <h3>{chosen?.title || '尚未选择方案'}</h3>
        <p>{decision.choiceReason || '选择不是打勾。请写出为何接受这个方案的代价。'}</p>
      </div>

      <div className="rail-block">
        <p className="rail-label">下一步补齐</p>
        {quality.missing.length ? (
          <ul className="missing-list">
            {quality.missing.slice(0, 5).map((item) => (
              <li key={item}><CircleDashed size={14} /> {item}</li>
            ))}
          </ul>
        ) : (
          <p className="all-clear"><Check size={15} /> 核心决策链已闭合</p>
        )}
      </div>

      <div className="rail-block revisit-note">
        <p className="rail-label"><AlertTriangle size={14} /> 重审条件</p>
        <p>{decision.reviewTriggers.filter(Boolean)[0] || '不要等决策失效才发现。写下什么变化会推翻今天的判断。'}</p>
        <time>{decision.reviewDate || '未设置日期'}</time>
      </div>

      {learnings.length > 0 && (
        <div className="rail-block learning-rail">
          <p className="rail-label"><BookOpen size={14} /> 相关过往规则</p>
          <div className="learning-links">
            {learnings.map((learning) => (
              <button key={learning.sourceId} type="button" onClick={() => onSelectLearning(learning.sourceId)}>
                <strong>{learning.rule}</strong>
                <span>{learning.sourceId} · {learning.sourceTitle}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="file-slip">
        <span>EXPORT</span>
        <code>{decisionFilename(decision)}</code>
      </div>
    </aside>
  )
}
