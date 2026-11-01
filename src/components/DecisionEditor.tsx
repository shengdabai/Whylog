import { Check, ChevronDown, CirclePlus, Minus, Plus, Trash2 } from 'lucide-react'
import { createEvidence, createOption, localDate } from '../lib/decision'
import type { Confidence, DecisionOption, DecisionRecord, DecisionStatus, EvidenceItem, ReviewVerdict, Traceability } from '../types'

interface Props {
  decision: DecisionRecord
  onChange: (next: DecisionRecord) => void
}

interface FieldProps {
  type?: 'text' | 'date'
  label: string
  value: string
  placeholder?: string
  hint?: string
  onChange: (value: string) => void
}

function Field({ label, value, placeholder, hint, onChange, type = 'text' }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      {hint && <small>{hint}</small>}
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function TextArea({ label, value, placeholder, hint, onChange }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      {hint && <small>{hint}</small>}
      <textarea rows={4} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

interface ListProps {
  label: string
  values: string[]
  placeholder: string
  onChange: (values: string[]) => void
}

function ListEditor({ label, values, placeholder, onChange }: ListProps) {
  const safeValues = values.length ? values : ['']
  return (
    <div className="field list-field">
      <span>{label}</span>
      <div className="list-inputs">
        {safeValues.map((value, index) => (
          <div className="inline-input" key={`${label}-${index}`}>
            <span className="list-index">{String(index + 1).padStart(2, '0')}</span>
            <input
              value={value}
              aria-label={`${label}第 ${index + 1} 项`}
              placeholder={placeholder}
              onChange={(event) => onChange(safeValues.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
            />
            <button
              type="button"
              aria-label={`删除${label}第 ${index + 1} 项`}
              onClick={() => onChange(safeValues.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Minus size={14} />
            </button>
          </div>
        ))}
      </div>
      <button className="add-line" type="button" onClick={() => onChange([...safeValues, ''])}>
        <Plus size={14} /> 添加一项
      </button>
    </div>
  )
}

interface EvidenceProps {
  title: string
  note: string
  items: EvidenceItem[]
  kind: EvidenceItem['kind']
  onChange: (items: EvidenceItem[]) => void
}

function EvidenceEditor({ title, note, items, kind, onChange }: EvidenceProps) {
  const update = (id: string, patch: Partial<EvidenceItem>) => onChange(items.map((item) => item.id === id ? { ...item, ...patch } : item))
  return (
    <div className={`evidence-zone ${kind}`}>
      <div className="zone-heading">
        <div><strong>{title}</strong><span>{note}</span></div>
        <button type="button" onClick={() => onChange([...items, createEvidence(kind)])}><CirclePlus size={16} /> 添加</button>
      </div>
      {items.map((item, index) => (
        <div className="evidence-row" key={item.id}>
          <span className="evidence-number">{index + 1}</span>
          <input
            className="evidence-text"
            value={item.text}
            aria-label={`${title}内容 ${index + 1}`}
            placeholder={kind === 'fact' ? '已发生、可核查的事实' : '尚未证实但影响选择的判断'}
            onChange={(event) => update(item.id, { text: event.target.value })}
          />
          <input
            value={item.source}
            aria-label={`${title}来源 ${index + 1}`}
            placeholder="来源"
            onChange={(event) => update(item.id, { source: event.target.value })}
          />
          <select
            value={item.confidence}
            aria-label={`${title}置信度 ${index + 1}`}
            onChange={(event) => update(item.id, { confidence: event.target.value as Confidence })}
          >
            <option value="high">高置信</option>
            <option value="medium">中置信</option>
            <option value="low">低置信</option>
          </select>
          <button type="button" aria-label={`删除${title} ${index + 1}`} onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}

interface OptionsProps {
  options: DecisionOption[]
  onChange: (options: DecisionOption[]) => void
}

function OptionsEditor({ options, onChange }: OptionsProps) {
  const update = (id: string, patch: Partial<DecisionOption>) => onChange(options.map((item) => item.id === id ? { ...item, ...patch } : item))
  const choose = (id: string) => onChange(options.map((item) => ({ ...item, chosen: item.id === id })))
  return (
    <div className="options-editor">
      {options.map((option, index) => (
        <article className={`option-sheet ${option.chosen ? 'chosen' : ''}`} key={option.id}>
          <header>
            <span className="option-letter">{String.fromCharCode(65 + index)}</span>
            <input
              value={option.title}
              aria-label={`方案 ${index + 1} 名称`}
              placeholder={`方案 ${String.fromCharCode(65 + index)}`}
              onChange={(event) => update(option.id, { title: event.target.value })}
            />
            <button className="choose-option" type="button" onClick={() => choose(option.id)}>
              {option.chosen ? <><Check size={15} /> 已选择</> : '选择此方案'}
            </button>
            <button className="remove-option" type="button" aria-label={`删除方案 ${index + 1}`} onClick={() => onChange(options.filter((item) => item.id !== option.id))}>
              <Trash2 size={15} />
            </button>
          </header>
          <textarea
            rows={2}
            value={option.description}
            aria-label={`方案 ${index + 1} 说明`}
            placeholder="它具体怎么做？"
            onChange={(event) => update(option.id, { description: event.target.value })}
          />
          <div className="option-columns">
            <ListEditor label="收益" values={option.pros} placeholder="这个方案带来什么？" onChange={(pros) => update(option.id, { pros })} />
            <ListEditor label="代价" values={option.cons} placeholder="你要接受什么？" onChange={(cons) => update(option.id, { cons })} />
            <ListEditor label="风险" values={option.risks} placeholder="什么可能出错？" onChange={(risks) => update(option.id, { risks })} />
          </div>
        </article>
      ))}
      <button className="add-option" type="button" onClick={() => onChange([...options, createOption(`方案 ${String.fromCharCode(65 + options.length)}`)])}>
        <Plus size={16} /> 增加候选方案
      </button>
    </div>
  )
}

const traceLabels: Record<keyof Traceability, string> = {
  prd: 'PRD · 做什么',
  requirements: 'Requirements · 必须为真',
  architecture: 'Architecture · 系统结构',
  spec: 'Spec · 精确行为',
  code: 'Code · 实现位置',
  tests: 'Tests · 验收证据',
}

export function DecisionEditor({ decision, onChange }: Props) {
  const patch = (value: Partial<DecisionRecord>) => onChange({ ...decision, ...value })
  const updateTrace = (key: keyof Traceability, value: string) => patch({ traceability: { ...decision.traceability, [key]: value } })

  return (
    <div className="decision-editor">
      <div className="document-masthead">
        <div className="document-id">
          <span>{decision.id}</span>
          <select value={decision.status} onChange={(event) => patch({ status: event.target.value as DecisionStatus })} aria-label="决策状态">
            <option value="proposed">提议中</option>
            <option value="accepted">已采纳</option>
            <option value="rejected">已拒绝</option>
            <option value="deprecated">已废弃</option>
            <option value="superseded">已替代</option>
          </select>
        </div>
        <textarea
          className="title-input"
          rows={2}
          value={decision.title}
          aria-label="决策标题"
          onChange={(event) => patch({ title: event.target.value })}
          onFocus={(event) => event.currentTarget.select()}
        />
        <div className="metadata-line">
          <label>项目 <input value={decision.project} placeholder="项目名称" onChange={(event) => patch({ project: event.target.value })} /></label>
          <label>日期 <input type="date" value={decision.date} onChange={(event) => patch({ date: event.target.value })} /></label>
          <label>标签 <input value={decision.tags.join(', ')} placeholder="逗号分隔" onChange={(event) => patch({ tags: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
        </div>
      </div>

      <section className="editor-section job-section">
        <div className="section-index"><span>01</span><small>先判断值不值得做</small></div>
        <div className="section-content">
          <h2>这个决定要完成什么 Job？</h2>
          <TextArea
            label="Job to Be Done"
            hint="描述进步，不要描述功能"
            value={decision.jobToBeDone}
            placeholder="当……时，我想要……，从而……"
            onChange={(jobToBeDone) => patch({ jobToBeDone })}
          />
          <Field
            label="目标结果"
            hint="什么变化能证明它值得？"
            value={decision.desiredOutcome}
            placeholder="例如：30 秒内找到旧决策理由"
            onChange={(desiredOutcome) => patch({ desiredOutcome })}
          />
        </div>
      </section>

      <section className="editor-section">
        <div className="section-index"><span>02</span><small>把已知与猜测分开</small></div>
        <div className="section-content">
          <h2>当时的问题是什么？</h2>
          <TextArea
            label="Context and Problem Statement"
            value={decision.context}
            placeholder="为什么现在必须做这个决定？范围是什么？不决定会怎样？"
            onChange={(context) => patch({ context })}
          />
          <div className="confidence-board">
            <EvidenceEditor title="已知事实" note="可观察、可核查" kind="fact" items={decision.facts} onChange={(facts) => patch({ facts })} />
            <EvidenceEditor title="待验证假设" note="可能正确，也可能推翻选择" kind="assumption" items={decision.assumptions} onChange={(assumptions) => patch({ assumptions })} />
          </div>
        </div>
      </section>

      <section className="editor-section">
        <div className="section-index"><span>03</span><small>先画边界再比方案</small></div>
        <div className="section-content">
          <h2>我们知道哪些约束？</h2>
          <div className="two-column-fields">
            <ListEditor label="决策驱动" values={decision.drivers} placeholder="最重要的质量或目标" onChange={(drivers) => patch({ drivers })} />
            <ListEditor label="硬约束" values={decision.constraints} placeholder="绝不能违反的条件" onChange={(constraints) => patch({ constraints })} />
          </div>
        </div>
      </section>

      <section className="editor-section option-section">
        <div className="section-index"><span>04</span><small>把排除理由留下来</small></div>
        <div className="section-content">
          <h2>有哪些候选方案？</h2>
          <OptionsEditor options={decision.options} onChange={(options) => patch({ options })} />
          <TextArea
            label="为什么选择它？"
            hint="明确它满足了哪些约束，以及为何排除其他方案"
            value={decision.choiceReason}
            placeholder="选择 B，因为……；不选 A，因为……"
            onChange={(choiceReason) => patch({ choiceReason })}
          />
        </div>
      </section>

      <section className="editor-section consequence-section">
        <div className="section-index"><span>05</span><small>承认代价，约定重审</small></div>
        <div className="section-content">
          <h2>我们接受了什么后果？</h2>
          <div className="three-column-fields">
            <ListEditor label="正向结果" values={decision.consequences.positive} placeholder="获得什么" onChange={(positive) => patch({ consequences: { ...decision.consequences, positive } })} />
            <ListEditor label="负向代价" values={decision.consequences.negative} placeholder="主动接受什么" onChange={(negative) => patch({ consequences: { ...decision.consequences, negative } })} />
            <ListEditor label="中性变化" values={decision.consequences.neutral} placeholder="需要知道但不评判" onChange={(neutral) => patch({ consequences: { ...decision.consequences, neutral } })} />
          </div>
          <TextArea label="如何确认执行正确？" value={decision.confirmation} placeholder="测试、评审或可观察的 fitness function" onChange={(confirmation) => patch({ confirmation })} />
          <div className="revisit-grid">
            <Field type="date" label="固定重审日期" value={decision.reviewDate} onChange={(reviewDate) => patch({ reviewDate })} />
            <ListEditor label="条件变化后重审" values={decision.reviewTriggers} placeholder="什么变化会推翻今天的选择？" onChange={(reviewTriggers) => patch({ reviewTriggers })} />
          </div>
        </div>
      </section>

      <section className="editor-section outcome-section">
        <div className="section-index"><span>06</span><small>让现实校验当时的判断</small></div>
        <div className="section-content">
          <h2>结果是否符合预期？</h2>
          <p className="section-intro">ADR 不是写完就结束。到期后回填现实结果，才能把一次选择变成下一次决策的纵向数据。</p>
          <div className="review-status-grid">
            <label className="field">
              <span>复盘结论</span>
              <select
                value={decision.outcomeReview.verdict}
                onChange={(event) => {
                  const verdict = event.target.value as ReviewVerdict
                  patch({
                    outcomeReview: {
                      ...decision.outcomeReview,
                      verdict,
                      reviewedAt: decision.outcomeReview.reviewedAt || (verdict === 'pending' ? '' : localDate()),
                    },
                  })
                }}
              >
                <option value="pending">等待复盘</option>
                <option value="validated">假设成立</option>
                <option value="partial">部分成立</option>
                <option value="invalidated">假设被推翻</option>
              </select>
            </label>
            <label className="field">
              <span>复盘日期</span>
              <input
                type="date"
                value={decision.outcomeReview.reviewedAt}
                onChange={(event) => patch({ outcomeReview: { ...decision.outcomeReview, reviewedAt: event.target.value } })}
              />
            </label>
          </div>
          <TextArea
            label="实际发生了什么？"
            hint="只写现实结果，不替当时的自己辩护"
            value={decision.outcomeReview.actualOutcome}
            placeholder="目标是否达成？时间、成本和副作用与预期差了多少？"
            onChange={(actualOutcome) => patch({ outcomeReview: { ...decision.outcomeReview, actualOutcome } })}
          />
          <ListEditor
            label="结果证据"
            values={decision.outcomeReview.evidence}
            placeholder="指标、测试、用户反馈或实际事件"
            onChange={(evidence) => patch({ outcomeReview: { ...decision.outcomeReview, evidence } })}
          />
          <div className="two-column-fields">
            <TextArea
              label="核心教训"
              value={decision.outcomeReview.lessons}
              placeholder="当时忽略了什么？哪条假设最关键？"
              onChange={(lessons) => patch({ outcomeReview: { ...decision.outcomeReview, lessons } })}
            />
            <TextArea
              label="未来规则"
              value={decision.outcomeReview.futureRule}
              placeholder="下次遇到什么条件，应该怎么做？"
              onChange={(futureRule) => patch({ outcomeReview: { ...decision.outcomeReview, futureRule } })}
            />
          </div>
        </div>
      </section>

      <details className="advanced-section">
        <summary><span>高级信息：参与者与产物追溯</span><ChevronDown size={17} /></summary>
        <div className="advanced-body">
          <div className="three-column-fields">
            <Field label="决策人" value={decision.decisionMakers.join(', ')} onChange={(value) => patch({ decisionMakers: value.split(',').map((item) => item.trim()).filter(Boolean) })} />
            <Field label="征询对象" value={decision.consulted.join(', ')} onChange={(value) => patch({ consulted: value.split(',').map((item) => item.trim()).filter(Boolean) })} />
            <Field label="知会对象" value={decision.informed.join(', ')} onChange={(value) => patch({ informed: value.split(',').map((item) => item.trim()).filter(Boolean) })} />
          </div>
          <div className="trace-grid">
            {(Object.keys(traceLabels) as (keyof Traceability)[]).map((key) => (
              <Field key={key} label={traceLabels[key]} value={decision.traceability[key]} placeholder="相对路径或链接" onChange={(value) => updateTrace(key, value)} />
            ))}
          </div>
          <Field label="替代了哪条 ADR" value={decision.supersedes} placeholder="例如 ADR-0008" onChange={(supersedes) => patch({ supersedes })} />
        </div>
      </details>
    </div>
  )
}
